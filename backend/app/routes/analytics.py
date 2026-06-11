from collections import Counter
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import Document, DocumentMetadata, Chat, Message, Chunk

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("", methods=["GET"])
@jwt_required()
def get_analytics():
    user_id = int(get_jwt_identity())

    documents = Document.query.filter_by(user_id=user_id).all()
    doc_ids = [d.id for d in documents]

    all_keywords = []
    all_entities = []
    all_topics = []
    sentiments = []

    for doc in documents:
        if doc.metadata_record:
            meta = doc.metadata_record
            all_keywords.extend(meta.keywords or [])
            all_entities.extend(meta.entities or [])
            for t in meta.topics or []:
                if isinstance(t, str):
                    all_topics.append(t)
                elif isinstance(t, dict):
                    all_topics.append(t.get("topic", ""))
            if meta.sentiment is not None:
                sentiments.append(meta.sentiment)

    keyword_counts = Counter()
    for kw in all_keywords:
        if isinstance(kw, dict):
            keyword_counts[kw.get("keyword", "")] += kw.get("score", 1)
        else:
            keyword_counts[str(kw)] += 1

    entity_counts = Counter()
    entity_types = Counter()
    for ent in all_entities:
        if isinstance(ent, dict):
            entity_counts[ent.get("text", "")] += 1
            entity_types[ent.get("type", "UNKNOWN")] += 1

    topic_counts = Counter(all_topics)

    total_chunks = Chunk.query.filter(Chunk.document_id.in_(doc_ids)).count() if doc_ids else 0
    total_chats = Chat.query.filter_by(user_id=user_id).count()
    total_messages = Message.query.join(Chat).filter(Chat.user_id == user_id).count()

    avg_sentiment = round(sum(sentiments) / len(sentiments), 4) if sentiments else 0.0

    status_breakdown = Counter(d.status for d in documents)

    # Build document type distribution
    doc_type_counts = Counter(d.file_type.upper() for d in documents)
    doc_types = [{"name": k, "value": v} for k, v in doc_type_counts.most_common(10)]
    if not doc_types:
        doc_types = [{"name": "PDF", "value": 0}, {"name": "DOCX", "value": 0}, {"name": "TXT", "value": 0}]

    # Build activity timeline (last 7 days)
    from datetime import datetime, timedelta
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    today = datetime.utcnow()
    activity_timeline = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_name = day_names[day.weekday()]
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_docs = sum(1 for d in documents if d.created_at and day_start <= d.created_at < day_end)
        day_msgs = Message.query.join(Chat).filter(
            Chat.user_id == user_id,
            Message.created_at >= day_start,
            Message.created_at < day_end,
            Message.role == 'user'
        ).count()
        
        activity_timeline.append({"name": day_name, "queries": day_msgs, "docs": day_docs})

    return jsonify({
        "overview": {
            "total_documents": len(documents),
            "total_chunks": total_chunks,
            "total_chats": total_chats,
            "total_messages": total_messages,
            "avg_sentiment": avg_sentiment,
            "total_pages": sum(d.page_count or 0 for d in documents),
            "total_words": sum(d.word_count or 0 for d in documents),
        },
        "top_keywords": [{"keyword": k, "count": v} for k, v in keyword_counts.most_common(20)],
        "top_entities": [{"entity": k, "count": v} for k, v in entity_counts.most_common(20)],
        "entity_types": [{"type": k, "count": v} for k, v in entity_types.most_common(10)],
        "topic_distribution": [{"topic": k, "count": v} for k, v in topic_counts.most_common(10)],
        "document_status": dict(status_breakdown),
        "activity_timeline": activity_timeline,
        "doc_types": doc_types,
        "documents": [
            {
                "id": d.id,
                "name": d.original_filename,
                "status": d.status,
                "pages": d.page_count,
                "words": d.word_count,
                "classification": d.metadata_record.classification if d.metadata_record else None,
                "sentiment": d.metadata_record.sentiment if d.metadata_record else None,
            }
            for d in documents
        ],
    })
