"""Priority- and section-aware enforcement of the model context window."""

from __future__ import annotations

from dataclasses import dataclass

from .config import ContextBudgetConfig
from .models import ContextItem, ContextPriority, ContextType, ModelConfig


class ContextBudgetError(ValueError):
    """Raised when even mandatory prompt content cannot fit the input allowance."""


@dataclass(slots=True)
class BudgetResult:
    """Items kept/removed plus auditable token accounting."""

    kept: list[ContextItem]
    removed: list[ContextItem]
    input_limit: int
    used_tokens: int
    section_tokens: dict[str, int]


class ContextBudgeter:
    """Apply per-section caps first and the global input ceiling second."""

    def __init__(self, config: ContextBudgetConfig) -> None:
        """Store section and global token ceilings."""

        self.config = config

    def apply(
        self,
        items: list[ContextItem],
        *,
        fixed_tokens: int,
        model_config: ModelConfig,
    ) -> BudgetResult:
        """Keep the highest-value context without exceeding model input capacity."""

        maximum = model_config.max_context_tokens or self.config.max_context_tokens
        reserve = model_config.reserve_output_tokens or self.config.reserve_output_tokens
        input_limit = maximum - reserve
        if input_limit <= 0:
            raise ContextBudgetError("Reserved output tokens must be smaller than model context")
        if fixed_tokens > input_limit:
            raise ContextBudgetError(
                f"Critical instructions and request require {fixed_tokens} tokens; input limit is {input_limit}"
            )

        buckets: dict[str, list[ContextItem]] = {}
        for item in items:
            buckets.setdefault(self._section(item), []).append(item)

        kept: list[ContextItem] = []
        removed: list[ContextItem] = []
        section_tokens: dict[str, int] = {}
        for section, candidates in buckets.items():
            allowance = self._allowance(section)
            used = 0
            ordered = sorted(
                candidates,
                key=lambda item: (
                    int(item.priority),
                    -item.importance_score,
                    -item.relevance_score,
                    item.id,
                ),
            )
            for item in ordered:
                if item.priority == ContextPriority.P0 or used + item.token_count <= allowance:
                    kept.append(item)
                    used += item.token_count
                else:
                    removed.append(item)
            section_tokens[section] = used

        total = fixed_tokens + sum(item.token_count for item in kept)
        if total > input_limit:
            removable = sorted(
                (item for item in kept if item.priority != ContextPriority.P0),
                key=lambda item: (
                    -int(item.priority),
                    item.importance_score,
                    item.relevance_score,
                    -item.token_count,
                    item.id,
                ),
            )
            for item in removable:
                if total <= input_limit:
                    break
                kept.remove(item)
                removed.append(item)
                total -= item.token_count
                section_tokens[self._section(item)] -= item.token_count
        if total > input_limit:
            raise ContextBudgetError("P0 working context does not fit the configured input budget")
        return BudgetResult(
            kept=kept,
            removed=removed,
            input_limit=input_limit,
            used_tokens=total,
            section_tokens=section_tokens,
        )

    @staticmethod
    def _section(item: ContextItem) -> str:
        """Map an item to the configuration section that constrains it."""

        if item.type == ContextType.CONVERSATION and item.metadata.get("kind") == "summary":
            return "summary"
        return item.type.value

    def _allowance(self, section: str) -> int:
        """Return the maximum tokens allocated to one context section."""

        return {
            "knowledge": self.config.knowledge_tokens,
            "syllabus": self.config.syllabus_tokens,
            "student_memory": self.config.memory_tokens,
            "episode": self.config.episode_tokens,
            "conversation": self.config.recent_chat_tokens,
            "summary": self.config.summary_tokens,
            "artifact": self.config.artifact_tokens,
            "working_memory": self.config.working_memory_tokens,
            "web": self.config.web_tokens,
        }.get(section, self.config.memory_tokens)
