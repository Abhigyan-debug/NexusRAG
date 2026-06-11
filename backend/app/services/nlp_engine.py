import re
from typing import Dict, List
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer


ENTITY_PATTERNS = {
    "PERSON": re.compile(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b"),
    "ORGANIZATION": re.compile(r"\b([A-Z][a-z]+(?:\s(?:Inc|Corp|LLC|Ltd|Company|University|Institute|Foundation|Group|Systems|Technologies))?\.?)\b"),
    "DATE": re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b", re.IGNORECASE),
    "MONEY": re.compile(r"\$[\d,]+(?:\.\d{2})?|\b\d+(?:\.\d+)?\s*(?:million|billion|trillion)\b", re.IGNORECASE),
    "LOCATION": re.compile(r"\b(?:New York|London|Paris|Tokyo|Berlin|San Francisco|Los Angeles|Chicago|Boston|Seattle|Austin|Singapore|Dubai|Sydney|Toronto|California|Texas|United States|USA|UK|Europe|Asia)\b", re.IGNORECASE),
}

TOPIC_KEYWORDS = {
    "Technology": ["software", "ai", "machine learning", "data", "cloud", "digital", "algorithm", "computer", "technology", "api"],
    "Business": ["revenue", "market", "strategy", "growth", "profit", "customer", "sales", "business", "investment"],
    "Science": ["research", "study", "experiment", "hypothesis", "analysis", "scientific", "methodology", "results"],
    "Legal": ["contract", "agreement", "law", "regulation", "compliance", "liability", "legal", "court"],
    "Healthcare": ["patient", "medical", "health", "clinical", "treatment", "diagnosis", "hospital", "drug"],
    "Finance": ["financial", "bank", "investment", "stock", "portfolio", "fund", "capital", "budget"],
    "Education": ["student", "learning", "education", "course", "university", "curriculum", "teaching"],
}


def extract_entities(text: str) -> List[Dict]:
    entities = []
    seen = set()
    for entity_type, pattern in ENTITY_PATTERNS.items():
        for match in pattern.finditer(text):
            value = match.group(1) if match.lastindex else match.group(0)
            key = (entity_type, value.lower())
            if key not in seen and len(value) > 2:
                seen.add(key)
                entities.append({"text": value, "type": entity_type, "start": match.start()})
    return entities[:100]


def extract_keywords(text: str, top_n: int = 20) -> List[Dict]:
    try:
        from keybert import KeyBERT
        kw_model = KeyBERT()
        keywords = kw_model.extract_keywords(text[:10000], keyphrase_ngram_range=(1, 2), stop_words="english", top_n=top_n)
        return [{"keyword": kw[0], "score": round(float(kw[1]), 4)} for kw in keywords]
    except Exception:
        return _fallback_keywords(text, top_n)


def _fallback_keywords(text: str, top_n: int) -> List[Dict]:
    vectorizer = TfidfVectorizer(max_features=top_n, stop_words="english", ngram_range=(1, 2))
    try:
        tfidf = vectorizer.fit_transform([text[:10000]])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf.toarray()[0]
        ranked = sorted(zip(feature_names, scores), key=lambda x: x[1], reverse=True)
        return [{"keyword": kw, "score": round(float(score), 4)} for kw, score in ranked[:top_n]]
    except Exception:
        words = re.findall(r"\b[a-z]{4,}\b", text.lower())
        common = Counter(words).most_common(top_n)
        return [{"keyword": w, "score": round(c / len(words), 4)} for w, c in common]


def detect_topics(text: str) -> List[Dict]:
    text_lower = text.lower()
    topic_scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(text_lower.count(kw) for kw in keywords)
        if score > 0:
            topic_scores[topic] = score
    total = sum(topic_scores.values()) or 1
    return [{"topic": t, "score": round(s / total, 4)} for t, s in sorted(topic_scores.items(), key=lambda x: -x[1])[:5]]


def classify_document(text: str, topics: List[Dict]) -> str:
    if topics:
        return topics[0]["topic"]
    return "General"


def analyze_sentiment(text: str) -> float:
    """Analyze sentiment using transformers model for better accuracy"""
    try:
        from transformers import pipeline
        sentiment_model = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        result = sentiment_model(text[:512])[0]  # Limit text to 512 tokens
        
        # Convert to -1 to 1 scale
        if result['label'] == 'POSITIVE':
            return round(result['score'], 4)
        else:
            return round(-result['score'], 4)
    except Exception:
        # Fallback to keyword-based sentiment if transformers fails
        positive = ["good", "great", "excellent", "success", "improve", "benefit", "positive", "growth", "innovative", "effective"]
        negative = ["bad", "fail", "problem", "issue", "risk", "negative", "decline", "loss", "error", "concern"]
        text_lower = text.lower()
        pos = sum(text_lower.count(w) for w in positive)
        neg = sum(text_lower.count(w) for w in negative)
        total = pos + neg
        if total == 0:
            return 0.0
        return round((pos - neg) / total, 4)


def run_nlp_pipeline(text: str) -> Dict:
    entities = extract_entities(text)
    keywords = extract_keywords(text)
    topics = detect_topics(text)
    classification = classify_document(text, topics)
    sentiment = analyze_sentiment(text)
    return {
        "entities": entities,
        "keywords": keywords,
        "topics": topics,
        "classification": classification,
        "sentiment": sentiment,
    }
