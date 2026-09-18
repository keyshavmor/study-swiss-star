"""Public service-layer exports for model inference and document ingestion."""

from .documents import (
    MAX_MATERIAL_BYTES,
    DocumentIngestor,
    UnsupportedDocumentError,
    stable_text_document_id,
)
from .llm import LocalOpenAICompatibleClient, ModelUnavailableError
from .model_runtime import ModelRuntimeManager, ModelStartupError

__all__ = [
    "MAX_MATERIAL_BYTES",
    "DocumentIngestor",
    "LocalOpenAICompatibleClient",
    "ModelRuntimeManager",
    "ModelStartupError",
    "ModelUnavailableError",
    "UnsupportedDocumentError",
    "stable_text_document_id",
]
