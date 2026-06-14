import hashlib
import os
import traceback
from typing import List, Dict, Generator, Optional

from app.extensions import db
from app.models import Document, DocumentMetadata, Chunk, Embedding, KnowledgeGraphNode, KnowledgeGraphEdge
from app.services.document_processor import extract_text, clean_text, detect_language, extract_metadata, identify_sections
from app.services.nlp_engine import run_nlp_pipeline
from app.services.chunking_engine import create_chunks
from app.services.embedding_service import generate_embeddings
from app.services.vector_store import VectorStore
from app.services.retriever import Retriever
from app.services.llm_service import LLMService
from app.services.prompt_builder import build_rag_prompt
from app.services.citation_engine import build_citations
from app.services.processing_log import log_stage
from app.config import Config

_pipeline = None


def get_rag_pipeline() -> "RAGPipeline":
    """Lazy singleton — avoids loading faiss/LLM at import time (critical on Render)."""
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline


class RAGPipeline:
    def __init__(self):
        self.vector_store = VectorStore(Config.FAISS_INDEX_PATH)
        self.retriever = Retriever(self.vector_store, Config.EMBEDDING_MODEL, Config.TOP_K)
        self.llm = LLMService()

    def process_document(
        self,
        document: Document,
        filepath: str,
        api_key: str = None,
        model: str = None,
    ) -> Dict:
        doc_id = document.id
        try:
            log_stage(doc_id, "start")
            document.status = "processing"
            db.session.commit()

            log_stage(doc_id, "extract_text")
            text, page_count, pages = extract_text(filepath, document.file_type)
            text = clean_text(text)

            log_stage(doc_id, "nlp_pipeline", f"chars={len(text)}")
            language = detect_language(text)
            meta = extract_metadata(text, document.original_filename)
            sections = identify_sections(text)
            nlp_results = run_nlp_pipeline(text)

            log_stage(doc_id, "metadata")
            document.page_count = page_count
            document.word_count = meta["word_count"]
            document.status = "chunking"
            db.session.commit()

            metadata = DocumentMetadata(
                document_id=document.id,
                language=language,
                title=meta["title"],
                topics=[t["topic"] for t in nlp_results["topics"]],
                keywords=nlp_results["keywords"],
                entities=nlp_results["entities"],
                classification=nlp_results["classification"],
                sentiment=nlp_results["sentiment"],
                sections=sections,
            )
            db.session.add(metadata)
            db.session.commit()

            log_stage(doc_id, "chunking")
            chunks_data = create_chunks(
                text, document.id, pages, Config.CHUNK_SIZE, Config.CHUNK_OVERLAP
            )
            document.status = "embedding"
            db.session.commit()

            log_stage(doc_id, "embeddings", f"chunks={len(chunks_data)}")
            chunk_texts = [c["content"] for c in chunks_data]
            embeddings = generate_embeddings(chunk_texts, Config.EMBEDDING_MODEL)

            log_stage(doc_id, "save_chunks")
            chunk_ids = []
            for chunk_data in chunks_data:
                chunk = Chunk(
                    document_id=document.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    page_number=chunk_data["page_number"],
                    metadata_json=chunk_data["metadata"],
                )
                db.session.add(chunk)
                db.session.flush()
                chunk_ids.append(chunk.id)
                db.session.add(
                    Embedding(
                        chunk_id=chunk.id,
                        model_name=Config.EMBEDDING_MODEL,
                        dimension=int(embeddings.shape[1]),
                    )
                )

            log_stage(doc_id, "faiss_index")
            faiss_ids = self.vector_store.add_vectors(document.user_id, embeddings, chunk_ids)
            for chunk_id, faiss_id in zip(chunk_ids, faiss_ids):
                chunk = db.session.get(Chunk, chunk_id)
                if chunk:
                    chunk.faiss_id = faiss_id

            if os.getenv("SKIP_LLM_SUMMARY", "false").lower() not in ("1", "true", "yes"):
                log_stage(doc_id, "llm_summary")
                try:
                    metadata.summary = self.llm.summarize(
                        text[:8000], "executive", override_api_key=api_key, override_model=model
                    )
                except Exception as summary_err:
                    log_stage(doc_id, "llm_summary_skipped", str(summary_err))

            log_stage(doc_id, "knowledge_graph")
            self._build_knowledge_graph(document.user_id, document, nlp_results)

            document.status = "ready"
            if hasattr(document, "error_message"):
                document.error_message = None
            db.session.commit()
            log_stage(doc_id, "complete", f"chunks={len(chunks_data)} pages={page_count}")

            return {"status": "success", "chunks": len(chunks_data), "pages": page_count}

        except Exception as e:
            log_stage(doc_id, "failed", str(e))
            traceback.print_exc()
            document.status = "error"
            if hasattr(document, "error_message"):
                document.error_message = str(e)[:2000]
            db.session.commit()
            raise

    def _build_knowledge_graph(self, user_id: int, document: Document, nlp_results: Dict):
        doc_node_id = f"doc_{document.id}"
        db.session.add(
            KnowledgeGraphNode(
                user_id=user_id,
                node_id=doc_node_id,
                label=document.original_filename,
                node_type="Document",
                document_id=document.id,
            )
        )

        for entity in nlp_results.get("entities", [])[:30]:
            entity_hash = hashlib.md5(entity["text"].encode()).hexdigest()[:8]
            entity_id = f"entity_{document.id}_{entity_hash}"
            db.session.add(
                KnowledgeGraphNode(
                    user_id=user_id,
                    node_id=entity_id,
                    label=entity["text"],
                    node_type=entity["type"],
                    document_id=document.id,
                    properties={"entity_type": entity["type"]},
                )
            )
            db.session.add(
                KnowledgeGraphEdge(
                    user_id=user_id,
                    source_id=entity_id,
                    target_id=doc_node_id,
                    relationship="MENTIONED_IN",
                )
            )

        for topic_data in nlp_results.get("topics", [])[:5]:
            topic_id = f"topic_{document.id}_{topic_data['topic']}"
            db.session.add(
                KnowledgeGraphNode(
                    user_id=user_id,
                    node_id=topic_id,
                    label=topic_data["topic"],
                    node_type="Topic",
                    document_id=document.id,
                )
            )
            db.session.add(
                KnowledgeGraphEdge(
                    user_id=user_id,
                    source_id=doc_node_id,
                    target_id=topic_id,
                    relationship="COVERS",
                )
            )

    def chat(
        self,
        user_id: int,
        query: str,
        conversation_history: List[Dict] = None,
        document_ids: List[int] = None,
        stream: bool = True,
    ) -> Generator:
        retrieved = self.retriever.retrieve(user_id, query, document_ids)
        citations = build_citations(retrieved)
        confidence = self.retriever.compute_confidence(retrieved)

        prompt = build_rag_prompt(query, retrieved, conversation_history)
        response_text = ""
        for chunk in self.llm.generate(prompt, stream=stream):
            response_text += chunk
            if stream:
                yield {"type": "token", "content": chunk}

        if not stream:
            yield {"type": "token", "content": response_text}

        yield {
            "type": "complete",
            "content": response_text,
            "citations": citations,
            "confidence": confidence,
            "retrieved_chunks": len(retrieved),
        }

    def semantic_search(self, user_id: int, query: str, top_k: int = 10) -> List[Dict]:
        self.retriever.top_k = top_k
        return self.retriever.retrieve(user_id, query)

    def delete_document_vectors(self, user_id: int, document: Document):
        chunk_ids = {c.id for c in document.chunks}
        self.vector_store.remove_user_vectors(user_id, chunk_ids)
        KnowledgeGraphNode.query.filter_by(user_id=user_id, document_id=document.id).delete()
        KnowledgeGraphEdge.query.filter(
            KnowledgeGraphEdge.user_id == user_id,
            KnowledgeGraphEdge.source_id.like(f"%_{document.id}_%"),
        ).delete(synchronize_session=False)
