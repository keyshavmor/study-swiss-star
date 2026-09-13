"""Public context-management API."""

from .config import ContextConfig
from .manager import ContextManager
from .models import CompiledContext, ContextArtifact, ContextItem, QueryContext

__all__ = [
    "CompiledContext",
    "ContextArtifact",
    "ContextConfig",
    "ContextItem",
    "ContextManager",
    "QueryContext",
]
"""Public configuration and orchestration exports for bounded context compilation."""
