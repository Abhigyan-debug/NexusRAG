import gc
import os
import threading
from typing import List

import numpy as np

_model = None
_model_name_loaded = None
_model_lock = threading.Lock()


def _use_lightweight() -> bool:
    return os.getenv("USE_LIGHTWEIGHT_EMBEDDINGS", "false").lower() in ("1", "true", "yes")


def _lightweight_embeddings(texts: List[str]) -> np.ndarray:
    """TF-IDF fallback when SentenceTransformer would OOM on small instances."""
    from sklearn.feature_extraction.text import TfidfVectorizer

    vectorizer = TfidfVectorizer(max_features=384, stop_words="english")
    matrix = vectorizer.fit_transform(texts).toarray().astype(np.float32)
    if matrix.shape[1] < 384:
        pad = np.zeros((matrix.shape[0], 384 - matrix.shape[1]), dtype=np.float32)
        matrix = np.hstack([matrix, pad])
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return matrix / norms


def get_embedding_model(model_name: str = "all-MiniLM-L6-v2"):
    global _model, _model_name_loaded
    if _use_lightweight():
        return None
    with _model_lock:
        if _model is None or _model_name_loaded != model_name:
            from sentence_transformers import SentenceTransformer
            log = __import__("app.services.processing_log", fromlist=["log_stage"]).log_stage
            log(0, "embedding_model_load", f"model={model_name}")
            _model = SentenceTransformer(model_name, device="cpu")
            _model_name_loaded = model_name
        return _model


def generate_embeddings(
    texts: List[str],
    model_name: str = "all-MiniLM-L6-v2",
    batch_size: int | None = None,
) -> np.ndarray:
    if not texts:
        return np.zeros((0, 384), dtype=np.float32)

    if _use_lightweight():
        return _lightweight_embeddings(texts)

    batch_size = batch_size or int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
    model = get_embedding_model(model_name)
    batches = []
    for start in range(0, len(texts), batch_size):
        chunk = texts[start : start + batch_size]
        vectors = model.encode(
            chunk,
            show_progress_bar=False,
            normalize_embeddings=True,
            batch_size=min(batch_size, len(chunk)),
        )
        batches.append(np.asarray(vectors, dtype=np.float32))
        gc.collect()
    return np.vstack(batches)


def generate_query_embedding(
    query: str,
    model_name: str = "all-MiniLM-L6-v2",
) -> np.ndarray:
    return generate_embeddings([query], model_name)[0]
