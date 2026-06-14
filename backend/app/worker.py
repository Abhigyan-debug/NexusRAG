"""
Standalone document processor — run as a subprocess so Gunicorn request lifecycle
does not kill daemon threads and worker OOM does not take down the web server.

Usage: python -m app.worker <document_id> [filepath]
"""
import sys
import traceback


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.worker <document_id>", file=sys.stderr)
        sys.exit(1)

    doc_id = int(sys.argv[1])
    from app import create_app
    from app.extensions import db
    from app.models import Document
    from app.services.rag_pipeline import RAGPipeline
    from app.services.processing_log import log_stage, configure_processing_logger

    configure_processing_logger()
    log_stage(doc_id, "worker_start", f"pid={__import__('os').getpid()}")

    app = create_app()
    with app.app_context():
        doc = db.session.get(Document, doc_id)
        if not doc:
            log_stage(doc_id, "worker_abort", "document not found")
            sys.exit(1)

        upload_folder = app.config["UPLOAD_FOLDER"]
        filepath = sys.argv[2] if len(sys.argv) > 2 else __import__("os").path.join(
            upload_folder, doc.filename
        )

        api_key = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
        model = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "-" else None

        pipeline = RAGPipeline()
        try:
            pipeline.process_document(doc, filepath, api_key=api_key, model=model)
            log_stage(doc_id, "worker_done", "status=ready")
        except Exception as exc:
            log_stage(doc_id, "worker_failed", str(exc))
            print(traceback.format_exc(), file=sys.stderr)
            doc = db.session.get(Document, doc_id)
            if doc:
                doc.status = "error"
                if hasattr(doc, "error_message"):
                    doc.error_message = str(exc)[:2000]
                db.session.commit()
            sys.exit(1)


if __name__ == "__main__":
    main()
