from typing import List, Dict, Tuple
from app.models import Chunk, Document
from app.services.embedding_service import generate_query_embedding
from app.services.vector_store import VectorStore
from bleach import clean


class Retriever:
    def __init__(self, vector_store: VectorStore, model_name: str = "all-MiniLM-L6-v2", top_k: int = 5):
        self.vector_store = vector_store
        self.model_name = model_name
        self.top_k = top_k

    def retrieve(self, user_id: int, query: str, document_ids: List[int] = None) -> List[Dict]:
        query_embedding = generate_query_embedding(query, self.model_name)
        raw_results = self.vector_store.search(user_id, query_embedding, self.top_k * 2)

        results = []
        for chunk_id, score in raw_results:
            chunk = Chunk.query.get(chunk_id)
            if not chunk:
                continue
            doc = Document.query.get(chunk.document_id)
            if not doc or doc.user_id != user_id:
                continue
            if document_ids and doc.id not in document_ids:
                continue
            
            # Sanitize content to prevent XSS
            safe_content = clean(chunk.content, tags=[], strip=True)
            
            results.append({
                "chunk_id": chunk.id,
                "content": safe_content,
                "page_number": chunk.page_number,
                "document_id": doc.id,
                "document_name": clean(doc.original_filename, tags=[], strip=True),
                "similarity_score": round(score, 4),
                "metadata": chunk.metadata_json or {},
            })

        results = self._rerank(results, query)
        return results[: self.top_k]

    def _rerank(self, results: List[Dict], query: str) -> List[Dict]:
        query_terms = set(query.lower().split())
        for r in results:
            content_terms = set(r["content"].lower().split())
            overlap = len(query_terms & content_terms) / max(len(query_terms), 1)
            r["rerank_score"] = round(r["similarity_score"] * 0.7 + overlap * 0.3, 4)
        return sorted(results, key=lambda x: x["rerank_score"], reverse=True)

    def compute_confidence(self, results: List[Dict]) -> float:
        if not results:
            return 0.0
        avg_score = sum(r.get("rerank_score", r["similarity_score"]) for r in results) / len(results)
        return round(min(avg_score * 100, 99.9), 1)
