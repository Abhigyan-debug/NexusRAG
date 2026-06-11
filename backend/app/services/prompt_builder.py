from typing import List, Dict


SYSTEM_INSTRUCTION = """You are NexusRAG, an enterprise AI Knowledge Assistant. Your role is to provide accurate, 
well-reasoned answers based ONLY on the retrieved document context provided below.

RULES:
1. ONLY use information from the provided context chunks. Do not use external knowledge.
2. If the context doesn't contain enough information to answer, say so clearly.
3. Always reference sources using [1], [2], etc. matching the citation numbers.
4. Be precise, professional, and thorough.
5. When comparing documents, clearly attribute information to each source.
6. Avoid speculation or hallucination.
7. Structure complex answers with clear headings and bullet points when appropriate.
"""


def build_rag_prompt(
    query: str,
    retrieved_chunks: List[Dict],
    conversation_history: List[Dict] = None,
    metadata_context: str = "",
) -> str:
    context_parts = []
    for i, chunk in enumerate(retrieved_chunks, 1):
        context_parts.append(
            f"[{i}] Document: {chunk['document_name']} | Page: {chunk['page_number']} | "
            f"Relevance: {chunk.get('rerank_score', chunk['similarity_score']):.2f}\n"
            f"{chunk['content']}\n"
        )
    context_block = "\n---\n".join(context_parts)

    history_block = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-6:]:
            role = msg.get("role", "user").capitalize()
            history_lines.append(f"{role}: {msg.get('content', '')[:500]}")
        history_block = "\n\nConversation History:\n" + "\n".join(history_lines)

    prompt = f"""{SYSTEM_INSTRUCTION}

{metadata_context}

RETRIEVED CONTEXT:
{context_block}
{history_block}

USER QUESTION: {query}

Provide a comprehensive answer based on the retrieved context. Include citation references [1], [2], etc."""
    return prompt


def build_research_prompt(analysis_type: str, context: str) -> str:
    instructions = {
        "contradictions": "Identify and explain any contradictions between the documents.",
        "trends": "Identify key trends and patterns across the documents.",
        "insights": "Extract the most valuable insights and findings.",
        "compare": "Compare and contrast the documents systematically.",
        "findings": "Highlight the most important findings with supporting evidence.",
    }
    instruction = instructions.get(analysis_type, instructions["insights"])
    return f"""{SYSTEM_INSTRUCTION}

ANALYSIS TYPE: {analysis_type.upper()}
TASK: {instruction}

DOCUMENT CONTEXT:
{context}

Provide a detailed analysis with citations."""
