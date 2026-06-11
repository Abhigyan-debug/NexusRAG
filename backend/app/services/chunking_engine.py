from typing import List, Dict, Tuple
from langchain_text_splitters import RecursiveCharacterTextSplitter


def recursive_chunk(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def semantic_chunk(text: str, chunk_size: int = 1000) -> List[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}".strip() if current else para
        else:
            if current:
                chunks.append(current)
            if len(para) > chunk_size:
                chunks.extend(recursive_chunk(para, chunk_size))
                current = ""
            else:
                current = para
    if current:
        chunks.append(current)
    return chunks


def create_chunks(
    text: str,
    document_id: int,
    pages: List[Dict],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[Dict]:
    raw_chunks = semantic_chunk(text, chunk_size)
    if len(raw_chunks) <= 1:
        raw_chunks = recursive_chunk(text, chunk_size, chunk_overlap)

    result = []
    char_pos = 0
    for idx, chunk_text in enumerate(raw_chunks):
        page_num = _find_page_number(char_pos, pages)
        result.append({
            "chunk_index": idx,
            "content": chunk_text,
            "page_number": page_num,
            "metadata": {
                "source_document_id": document_id,
                "chunk_length": len(chunk_text),
                "char_start": char_pos,
            },
        })
        char_pos += len(chunk_text) - chunk_overlap
    return result


def _find_page_number(char_pos: int, pages: List[Dict]) -> int:
    cumulative = 0
    for page in pages:
        page_len = len(page.get("text", ""))
        if char_pos < cumulative + page_len:
            return page.get("page", 1)
        cumulative += page_len + 2
    return pages[-1].get("page", 1) if pages else 1
