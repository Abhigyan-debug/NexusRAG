import os
import pickle
import threading
import numpy as np
from typing import List, Dict, Optional, Tuple

_model = None
_model_lock = threading.Lock()


def get_embedding_model(model_name: str = "all-MiniLM-L6-v2"):
    global _model
    with _model_lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(model_name)
        return _model


def generate_embeddings(texts: List[str], model_name: str = "all-MiniLM-L6-v2") -> np.ndarray:
    model = get_embedding_model(model_name)
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings, dtype=np.float32)


def generate_query_embedding(query: str, model_name: str = "all-MiniLM-L6-v2") -> np.ndarray:
    model = get_embedding_model(model_name)
    embedding = model.encode([query], show_progress_bar=False, normalize_embeddings=True)
    return np.array(embedding[0], dtype=np.float32)
