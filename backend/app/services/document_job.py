import os
import subprocess
import sys
import traceback
from typing import Optional

from app.extensions import db
from app.models import Document
from app.services.processing_log import log_stage


def process_document_in_app(doc_id: int, filepath: str, app, api_key: str = None, model: str = None):
    """Run full pipeline inside the current process."""
    with app.app_context():
        from app.services.rag_pipeline import RAGPipeline
        pipeline = RAGPipeline()
        try:
            doc = db.session.get(Document, doc_id)
            if doc:
                pipeline.process_document(doc, filepath, api_key=api_key, model=model)
        except Exception as e:
            log_stage(doc_id, "in_process_error", str(e))
            traceback.print_exc()
            doc = db.session.get(Document, doc_id)
            if doc:
                doc.status = "error"
                if hasattr(doc, "error_message"):
                    doc.error_message = str(e)[:2000]
                db.session.commit()


def _processing_mode() -> str:
    return os.getenv("DOC_PROCESSING_MODE", "thread").lower()


def enqueue_document_processing(
    doc_id: int,
    filepath: str,
    app,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> None:
    mode = _processing_mode()
    log_stage(doc_id, "enqueue", f"mode={mode}")

    if mode == "sync":
        process_document_in_app(doc_id, filepath, app, api_key, model)
        return

    if mode == "subprocess":
        _spawn_subprocess(doc_id, filepath, api_key, model)
        return

    from threading import Thread
    thread = Thread(
        target=process_document_in_app,
        args=(doc_id, filepath, app, api_key, model),
        daemon=False,
        name=f"doc-processor-{doc_id}",
    )
    thread.start()


def _spawn_subprocess(doc_id, filepath, api_key, model):
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cmd = [
        sys.executable,
        "-m",
        "app.worker",
        str(doc_id),
        filepath,
        api_key or "-",
        model or "-",
    ]
    log_stage(doc_id, "subprocess_spawn", f"cmd={' '.join(cmd[:4])}")

    kwargs = {"cwd": backend_dir, "close_fds": True}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        kwargs["start_new_session"] = True

    subprocess.Popen(cmd, **kwargs)
