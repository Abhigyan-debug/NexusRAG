from collections import Counter
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from app.extensions import db, limiter
from app.models import Document, Chat, Message, Chunk, ActivityLog

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

RANGES = {"7d": 7, "30d": 30, "12m": 365}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _tz_offset():
    """Client offset as returned by JS Date.getTimezoneOffset() (minutes, UTC - local)."""
    try:
        offset = int(request.args.get("tz", 0))
    except ValueError:
        return timedelta(0)
    return timedelta(minutes=max(-840, min(840, offset)))


def _change(current, previous):
    if previous == 0:
        return None if current == 0 else "new"
    return round((current - previous) / previous * 100, 1)


def _timeline(range_key, now_local, offset, doc_times, query_times):
    """Bucket UTC timestamps into local-time days (7d/30d) or months (12m)."""
    to_local = lambda t: t - offset
    buckets, index = [], {}

    if range_key == "12m":
        year, month = now_local.year, now_local.month
        keys = []
        for _ in range(12):
            keys.append((year, month))
            month -= 1
            if month == 0:
                year, month = year - 1, 12
        for key in reversed(keys):
            index[key] = len(buckets)
            buckets.append({"name": MONTHS[key[1] - 1], "queries": 0, "docs": 0})
        key_of = lambda t: (to_local(t).year, to_local(t).month)
    else:
        days = RANGES[range_key]
        today = now_local.date()
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            index[day] = len(buckets)
            label = DAYS[day.weekday()] if days <= 7 else f"{MONTHS[day.month - 1]} {day.day}"
            buckets.append({"name": label, "queries": 0, "docs": 0})
        key_of = lambda t: to_local(t).date()

    for t in doc_times:
        i = index.get(key_of(t))
        if i is not None:
            buckets[i]["docs"] += 1
    for t in query_times:
        i = index.get(key_of(t))
        if i is not None:
            buckets[i]["queries"] += 1
    return buckets


@analytics_bp.route("", methods=["GET"])
@jwt_required()
@limiter.exempt
def get_analytics():
    user_id = int(get_jwt_identity())
    range_key = request.args.get("range", "7d")
    if range_key not in RANGES:
        range_key = "7d"
    offset = _tz_offset()

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

    doc_type_counts = Counter(d.file_type.upper() for d in documents)
    doc_types = [{"name": k, "value": v} for k, v in doc_type_counts.most_common(10)]

    # --- Period comparison (current range vs the range before it) -------------
    now = datetime.utcnow()
    span = timedelta(days=RANGES[range_key])
    period_start = now - span
    previous_start = period_start - span

    def in_period(t, start, end):
        return t is not None and start <= t < end

    def doc_stats(start, end):
        docs = [d for d in documents if in_period(d.created_at, start, end)]
        return len(docs), sum(d.page_count or 0 for d in docs)

    def chat_count(start, end):
        return Chat.query.filter(Chat.user_id == user_id, Chat.created_at >= start, Chat.created_at < end).count()

    def chunk_count(start, end):
        if not doc_ids:
            return 0
        return Chunk.query.filter(
            Chunk.document_id.in_(doc_ids), Chunk.created_at >= start, Chunk.created_at < end
        ).count()

    cur_docs, cur_pages = doc_stats(period_start, now)
    prev_docs, prev_pages = doc_stats(previous_start, period_start)
    cur_chats, prev_chats = chat_count(period_start, now), chat_count(previous_start, period_start)
    cur_chunks, prev_chunks = chunk_count(period_start, now), chunk_count(previous_start, period_start)

    growth = {
        "documents": {"current": cur_docs, "previous": prev_docs, "change_pct": _change(cur_docs, prev_docs)},
        "chats": {"current": cur_chats, "previous": prev_chats, "change_pct": _change(cur_chats, prev_chats)},
        "chunks": {"current": cur_chunks, "previous": prev_chunks, "change_pct": _change(cur_chunks, prev_chunks)},
        "pages": {"current": cur_pages, "previous": prev_pages, "change_pct": _change(cur_pages, prev_pages)},
    }

    # --- Activity timeline ------------------------------------------------------
    # For 12m, start from the first day of the oldest month shown so it is complete
    timeline_start = now - span - timedelta(days=31)
    query_times = [
        row[0] for row in db.session.query(Message.created_at)
        .join(Chat)
        .filter(Chat.user_id == user_id, Message.role == "user", Message.created_at >= timeline_start)
        .all()
    ]
    doc_times = [d.created_at for d in documents if d.created_at and d.created_at >= timeline_start]
    activity_timeline = _timeline(range_key, now - offset, offset, doc_times, query_times)

    return jsonify({
        "range": range_key,
        "overview": {
            "total_documents": len(documents),
            "total_chunks": total_chunks,
            "total_chats": total_chats,
            "total_messages": total_messages,
            "avg_sentiment": avg_sentiment,
            "total_pages": sum(d.page_count or 0 for d in documents),
            "total_words": sum(d.word_count or 0 for d in documents),
        },
        "growth": growth,
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


@analytics_bp.route("/activity", methods=["GET"])
@jwt_required()
@limiter.exempt
def get_activity():
    """Recent activity: uploads, processing results and chats come from their own
    tables; everything else (sign-ins, security changes, deletions...) from ActivityLog."""
    user_id = int(get_jwt_identity())
    limit = max(1, min(request.args.get("limit", 10, type=int), 100))
    offset = max(0, request.args.get("offset", 0, type=int))
    window = offset + limit + 1  # one extra row tells us whether there is more

    events = []

    for d in (Document.query.filter_by(user_id=user_id)
              .order_by(Document.created_at.desc()).limit(window).all()):
        events.append({"id": f"doc-{d.id}", "type": "document_uploaded", "target": d.original_filename,
                       "timestamp": d.created_at})

    finished = (Document.query.filter(Document.user_id == user_id, Document.status.in_(["ready", "error"]))
                .order_by(Document.updated_at.desc()).limit(window).all())
    for d in finished:
        events.append({
            "id": f"doc-{d.id}-{d.status}",
            "type": "document_processed" if d.status == "ready" else "document_failed",
            "target": d.original_filename,
            "timestamp": d.updated_at or d.created_at,
        })

    for c in (Chat.query.filter_by(user_id=user_id)
              .order_by(Chat.created_at.desc()).limit(window).all()):
        events.append({"id": f"chat-{c.id}", "type": "chat_started", "target": c.title,
                       "timestamp": c.created_at})

    for a in (ActivityLog.query.filter_by(user_id=user_id)
              .order_by(ActivityLog.created_at.desc()).limit(window).all()):
        events.append({"id": f"log-{a.id}", "type": a.action, "target": a.target, "timestamp": a.created_at})

    events = [e for e in events if e["timestamp"] is not None]
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    page = events[offset:offset + limit]
    for e in page:
        e["timestamp"] = e["timestamp"].isoformat() + "Z"

    return jsonify({"items": page, "has_more": len(events) > offset + limit})
