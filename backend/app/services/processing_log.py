import logging
import sys

logger = logging.getLogger("nexusrag.processing")


def configure_processing_logger():
    if logger.handlers:
        return logger
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] nexusrag.processing: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def log_stage(doc_id: int, stage: str, detail: str = ""):
    configure_processing_logger()
    msg = f"doc_id={doc_id} stage={stage}"
    if detail:
        msg = f"{msg} {detail}"
    logger.info(msg)
    for handler in logger.handlers:
        handler.flush()
