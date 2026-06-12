import numpy as np
from typing import List


def generate_embeddings(
    texts: List[str],
    model_name: str = "all-MiniLM-L6-v2"
) -> np.ndarray:
    return np.random.rand(len(texts), 384).astype(np.float32)


def generate_query_embedding(
    query: str,
    model_name: str = "all-MiniLM-L6-v2"
) -> np.ndarray:
    return np.random.rand(384).astype(np.float32)