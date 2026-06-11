import json
from flask import Blueprint, request, jsonify, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db, limiter
from app.models import Chat, Message, Document
from app.utils import sanitize_input
from app.services.rag_pipeline import RAGPipeline

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")
pipeline = RAGPipeline()


@chat_bp.route("", methods=["POST"])
@jwt_required()
@limiter.limit("30 per minute")
def chat():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    query = sanitize_input(data["message"])
    chat_id = data.get("chat_id")
    document_ids = data.get("document_ids")
    stream = data.get("stream", True)

    if chat_id:
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat:
            return jsonify({"error": "Chat not found"}), 404
    else:
        chat = Chat(user_id=user_id, title=query[:80])
        db.session.add(chat)
        db.session.commit()

    user_msg = Message(chat_id=chat.id, role="user", content=query)
    db.session.add(user_msg)
    db.session.commit()

    history = [
        {"role": m.role, "content": m.content}
        for m in chat.messages.filter(Message.id != user_msg.id).order_by(Message.created_at).all()
    ]

    if stream:
        def generate():
            full_response = ""
            citations = []
            confidence = 0.0
            for event in pipeline.chat(user_id, query, history, document_ids, stream=True):
                if event["type"] == "token":
                    full_response += event["content"]
                    yield f"data: {json.dumps(event)}\n\n"
                elif event["type"] == "complete":
                    citations = event.get("citations", [])
                    confidence = event.get("confidence", 0.0)
                    assistant_msg = Message(
                        chat_id=chat.id,
                        role="assistant",
                        content=event["content"],
                        citations=citations,
                        confidence=confidence,
                    )
                    db.session.add(assistant_msg)
                    db.session.commit()
                    yield f"data: {json.dumps({'type': 'complete', 'chat_id': chat.id, 'message_id': assistant_msg.id, 'citations': citations, 'confidence': confidence})}\n\n"

        return Response(stream_with_context(generate()), mimetype="text/event-stream")

    full_response = ""
    citations = []
    confidence = 0.0
    for event in pipeline.chat(user_id, query, history, document_ids, stream=False):
        if event["type"] == "token":
            full_response += event["content"]
        elif event["type"] == "complete":
            citations = event.get("citations", [])
            confidence = event.get("confidence", 0.0)

    assistant_msg = Message(
        chat_id=chat.id, role="assistant", content=full_response,
        citations=citations, confidence=confidence,
    )
    db.session.add(assistant_msg)
    db.session.commit()

    return jsonify({
        "chat_id": chat.id,
        "message": assistant_msg.to_dict(),
        "user_message": user_msg.to_dict(),
    })


@chat_bp.route("/history", methods=["GET"])
@jwt_required()
def chat_history():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    paginated = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "chats": [c.to_dict() for c in paginated.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated.total,
            "pages": paginated.pages,
        }
    })


@chat_bp.route("/<int:chat_id>", methods=["GET"])
@jwt_required()
def get_chat(chat_id):
    user_id = int(get_jwt_identity())
    chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat:
        return jsonify({"error": "Chat not found"}), 404
    return jsonify(chat.to_dict(include_messages=True))


@chat_bp.route("/search", methods=["POST"])
@jwt_required()
def semantic_search():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    query = sanitize_input(data.get("query", ""))
    top_k = data.get("top_k", 10)
    if not query:
        return jsonify({"error": "Query is required"}), 400
    results = pipeline.semantic_search(user_id, query, top_k)
    return jsonify({"results": results, "query": query})


@chat_bp.route("/research", methods=["POST"])
@jwt_required()
@limiter.limit("10 per minute")
def research():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    analysis_type = data.get("type", "insights")
    document_ids = data.get("document_ids", [])

    docs = Document.query.filter(Document.user_id == user_id, Document.id.in_(document_ids)).all()
    if not docs:
        docs = Document.query.filter_by(user_id=user_id, status="ready").all()

    context_parts = []
    for doc in docs:
        for chunk in doc.chunks.limit(5):
            context_parts.append(f"[{doc.original_filename}] {chunk.content[:1000]}")

    context = "\n\n".join(context_parts)
    from app.services.prompt_builder import build_research_prompt
    prompt = build_research_prompt(analysis_type, context)
    result = ""
    for chunk in pipeline.llm.generate(prompt):
        result += chunk

    return jsonify({"analysis": result, "type": analysis_type, "documents_analyzed": len(docs)})
