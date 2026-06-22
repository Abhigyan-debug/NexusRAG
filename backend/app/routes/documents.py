import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from app.extensions import db, limiter
from app.models import Document
from app.utils import allowed_file
from app.services.document_job import enqueue_document_processing
from app.services.processing_log import log_stage, configure_processing_logger

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")
configure_processing_logger()


@documents_bp.route("/upload", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")
def upload():
    user_id = int(get_jwt_identity())
    if "files" not in request.files and "file" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files") or [request.files["file"]]
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    api_key = request.headers.get("X-API-Key")
    model = request.headers.get("X-AI-Model")
    app = current_app._get_current_object()

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

        log_stage(doc.id, "upload_saved", f"file={file.filename} size={doc.file_size}")

        enqueue_document_processing(doc.id, filepath, app, api_key, model)

        results.append({"id": doc.id, "filename": file.filename, "status": "pending"})

    return jsonify({"uploads": results}), 201


@documents_bp.route("", methods=["GET"])
@jwt_required()
@limiter.exempt
def list_documents():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated = Document.query.filter_by(user_id=user_id).order_by(Document.created_at.desc()).paginate(
        page=page, per_page=per_page
    )
    return jsonify({
        "documents": [d.to_dict() for d in paginated.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated.total,
            "pages": paginated.pages,
        },
    })


@documents_bp.route("/<int:doc_id>", methods=["GET"])
@jwt_required()
@limiter.exempt
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

    from app.services.rag_pipeline import get_rag_pipeline
    get_rag_pipeline().delete_document_vectors(user_id, doc)
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

    from app.services.rag_pipeline import get_rag_pipeline
    pipeline = get_rag_pipeline()

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
