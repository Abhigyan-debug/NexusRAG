import os
import uuid
from flask import Blueprint, request, jsonify, current_app
# pyrefly: ignore [missing-import]
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from threading import Thread

from app.extensions import db, limiter
from app.models import Document
from app.utils import allowed_file
from app.services.rag_pipeline import RAGPipeline

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")
pipeline = RAGPipeline()
print("RAG Pipeline Loaded")


def process_document_async(doc_id: int, filepath: str, app, api_key: str = None, model: str = None):
    """Process document in background thread"""
    with app.app_context():
        try:
            doc = Document.query.get(doc_id)
            if doc:
                pipeline.process_document(doc, filepath, api_key=api_key, model=model)
        except Exception as e:
            import traceback
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            print(f"Error processing document {doc_id}: {error_msg}")
            doc = Document.query.get(doc_id)
            if doc:
                doc.status = "error"
                # Removed doc.error_message assignment since it doesn't exist on Document model
                db.session.commit()


@documents_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    print("UPLOAD API HIT")
    user_id = int(get_jwt_identity())
    if "files" not in request.files and "file" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files") or [request.files["file"]]
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    results = []
    for file in files:
        if not file or not file.filename:
            continue
        if not allowed_file(file.filename, current_app.config["ALLOWED_EXTENSIONS"]):
            results.append({"filename": file.filename, "status": "error", "message": "Invalid file type"})
            continue

        original = secure_filename(file.filename)
        ext = original.rsplit(".", 1)[1].lower()
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(upload_folder, stored_name)
        file.save(filepath)

        doc = Document(
            user_id=user_id,
            filename=stored_name,
            original_filename=file.filename,
            file_type=ext,
            file_size=os.path.getsize(filepath),
            status="pending",
        )
        db.session.add(doc)
        db.session.commit()

        # Capture request headers before spawning thread
        api_key = request.headers.get("X-API-Key")
        model = request.headers.get("X-AI-Model")

        # Start background processing (non-blocking)
        thread = Thread(target=process_document_async, args=(doc.id, filepath, current_app._get_current_object(), api_key, model), daemon=True)
        thread.start()

        results.append({"id": doc.id, "filename": file.filename, "status": "pending"})

    return jsonify({"uploads": results}), 201


@documents_bp.route("", methods=["GET"])
@jwt_required()
def list_documents():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    paginated = Document.query.filter_by(user_id=user_id).order_by(Document.created_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "documents": [d.to_dict() for d in paginated.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated.total,
            "pages": paginated.pages,
        }
    })


@documents_bp.route("/<int:doc_id>", methods=["GET"])
@jwt_required()
def get_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify(doc.to_dict())


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    filepath = os.path.join(upload_folder, doc.filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    pipeline.delete_document_vectors(user_id, doc)
    db.session.delete(doc)
    db.session.commit()
    return jsonify({"message": "Document deleted"})


@documents_bp.route("/<int:doc_id>/summarize", methods=["POST"])
@jwt_required()
def summarize_document(doc_id):
    user_id = int(get_jwt_identity())
    doc = Document.query.filter_by(id=doc_id, user_id=user_id).first()
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    data = request.get_json() or {}
    summary_type = data.get("type", "executive")

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    filepath = os.path.join(upload_folder, doc.filename)
    from app.services.document_processor import extract_text, clean_text
    text, _, _ = extract_text(filepath, doc.file_type)
    text = clean_text(text)

    summary = pipeline.llm.summarize(text, summary_type)
    if doc.metadata_record:
        doc.metadata_record.summary = summary
        db.session.commit()

    return jsonify({"summary": summary, "type": summary_type})
