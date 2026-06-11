from typing import List, Dict


def build_citations(retrieved_chunks: List[Dict]) -> List[Dict]:
    citations = []
    seen = set()
    for chunk in retrieved_chunks:
        key = (chunk["document_id"], chunk["page_number"])
        if key in seen:
            continue
        seen.add(key)
        confidence = round(chunk.get("rerank_score", chunk["similarity_score"]) * 100, 1)
        citations.append({
            "document_name": chunk["document_name"],
            "document_id": chunk["document_id"],
            "page_number": chunk["page_number"],
            "similarity_score": chunk["similarity_score"],
            "confidence": min(confidence, 99.9),
            "chunk_id": chunk["chunk_id"],
            "excerpt": chunk["content"][:300],
        })
    return citations


def format_citations_for_prompt(citations: List[Dict]) -> str:
    if not citations:
        return "No citations available."
    lines = []
    for i, c in enumerate(citations, 1):
        lines.append(
            f"[{i}] {c['document_name']}, Page {c['page_number']} (Confidence: {c['confidence']}%)"
        )
    return "\n".join(lines)


def format_citations_for_response(citations: List[Dict]) -> str:
    if not citations:
        return ""
    lines = ["\n\n**Sources:**"]
    for c in citations:
        lines.append(
            f"- {c['document_name']} | Page {c['page_number']} | Confidence {c['confidence']}%"
        )
    return "\n".join(lines)
