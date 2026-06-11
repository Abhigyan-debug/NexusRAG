import os
import re
from typing import Tuple, List, Dict
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from langdetect import detect, LangDetectException


def extract_text_from_pdf(filepath: str) -> Tuple[str, int, List[Dict]]:
    reader = PdfReader(filepath)
    pages = []
    full_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({"page": i + 1, "text": text})
        full_text.append(text)
    return "\n\n".join(full_text), len(reader.pages), pages


def extract_text_from_docx(filepath: str) -> Tuple[str, int, List[Dict]]:
    doc = DocxDocument(filepath)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(paragraphs)
    estimated_pages = max(1, len(text) // 3000)
    pages = [{"page": 1, "text": text}]
    return text, estimated_pages, pages


def extract_text_from_txt(filepath: str) -> Tuple[str, int, List[Dict]]:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    estimated_pages = max(1, len(text) // 3000)
    return text, estimated_pages, [{"page": 1, "text": text}]


def extract_text(filepath: str, file_type: str) -> Tuple[str, int, List[Dict]]:
    if file_type == "pdf":
        return extract_text_from_pdf(filepath)
    elif file_type == "docx":
        return extract_text_from_docx(filepath)
    elif file_type == "txt":
        return extract_text_from_txt(filepath)
    raise ValueError(f"Unsupported file type: {file_type}")


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s.,;:!?\-'\"()\[\]{}@#$%&*/+=<>]", "", text)
    return text.strip()


def detect_language(text: str) -> str:
    try:
        sample = text[:2000] if len(text) > 2000 else text
        return detect(sample)
    except LangDetectException:
        return "en"


def extract_metadata(text: str, filename: str) -> Dict:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    title = lines[0][:200] if lines else filename
    word_count = len(text.split())
    return {
        "title": title,
        "word_count": word_count,
        "char_count": len(text),
    }


def identify_sections(text: str) -> List[Dict]:
    sections = []
    section_pattern = re.compile(r"^(?:\d+\.?\s+)?([A-Z][A-Z\s]{2,50})$", re.MULTILINE)
    matches = list(section_pattern.finditer(text))
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections.append({
            "title": match.group(1).strip(),
            "start": start,
            "end": end,
        })
    if not sections and text:
        sections.append({"title": "Main Content", "start": 0, "end": len(text)})
    return sections[:20]
