import os
import pickle
import threading
import numpy as np
import faiss
from typing import List, Dict, Optional, Tuple

_index_lock = threading.Lock()
_user_indices: Dict[int, faiss.IndexFlatIP] = {}
_id_maps: Dict[int, Dict[int, int]] = {}


class VectorStore:
    def __init__(self, index_path: str, dimension: int = 384):
        self.index_path = index_path
        self.dimension = dimension
        os.makedirs(index_path, exist_ok=True)

    def _index_file(self, user_id: int) -> str:
        return os.path.join(self.index_path, f"user_{user_id}.faiss")

    def _map_file(self, user_id: int) -> str:
        return os.path.join(self.index_path, f"user_{user_id}_map.pkl")

    def get_or_create_index(self, user_id: int) -> faiss.IndexFlatIP:
        with _index_lock:
            if user_id not in _user_indices:
                index_file = self._index_file(user_id)
                map_file = self._map_file(user_id)
                if os.path.exists(index_file) and os.path.exists(map_file):
                    _user_indices[user_id] = faiss.read_index(index_file)
                    with open(map_file, "rb") as f:
                        _id_maps[user_id] = pickle.load(f)
                else:
                    _user_indices[user_id] = faiss.IndexFlatIP(self.dimension)
                    _id_maps[user_id] = {}
            return _user_indices[user_id]

    def add_vectors(self, user_id: int, vectors: np.ndarray, chunk_ids: List[int]) -> List[int]:
        index = self.get_or_create_index(user_id)
        faiss_ids = []
        with _index_lock:
            start_id = index.ntotal
            index.add(vectors)
            for i, chunk_id in enumerate(chunk_ids):
                faiss_id = start_id + i
                _id_maps[user_id][faiss_id] = chunk_id
                faiss_ids.append(faiss_id)
            self._persist(user_id)
        return faiss_ids

    def search(self, user_id: int, query_vector: np.ndarray, top_k: int = 5) -> List[Tuple[int, float]]:
        index = self.get_or_create_index(user_id)
        if index.ntotal == 0:
            return []
        query = query_vector.reshape(1, -1).astype(np.float32)
        scores, indices = index.search(query, min(top_k, index.ntotal))
        results = []
        id_map = _id_maps.get(user_id, {})
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx in id_map:
                results.append((id_map[idx], float(score)))
        return results

    def remove_user_vectors(self, user_id: int, chunk_ids: set):
        with _index_lock:
            if user_id in _user_indices:
                del _user_indices[user_id]
            if user_id in _id_maps:
                del _id_maps[user_id]
            index_file = self._index_file(user_id)
            map_file = self._map_file(user_id)
            for f in [index_file, map_file]:
                if os.path.exists(f):
                    os.remove(f)

    def _persist(self, user_id: int):
        index_file = self._index_file(user_id)
        map_file = self._map_file(user_id)
        faiss.write_index(_user_indices[user_id], index_file)
        with open(map_file, "wb") as f:
            pickle.dump(_id_maps[user_id], f)

    def get_stats(self, user_id: int) -> Dict:
        index = self.get_or_create_index(user_id)
        return {"total_vectors": index.ntotal, "dimension": self.dimension}
