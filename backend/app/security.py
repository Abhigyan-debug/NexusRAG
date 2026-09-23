"""Session tracking, TOTP two-factor auth and activity logging."""
import base64
import hashlib
import hmac
import re
import secrets
import struct
import time
import uuid
from datetime import datetime, timedelta

from flask import request, current_app
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import UserSession, ActivityLog

TOTP_STEP = 30
TOTP_DIGITS = 6
TOTP_ISSUER = "NexusRAG"
RECOVERY_CODE_COUNT = 8
LAST_SEEN_RESOLUTION = timedelta(minutes=1)


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

def log_activity(user_id, action, target=None, commit=True):
    db.session.add(ActivityLog(user_id=user_id, action=action, target=(target or "")[:512]))
    if commit:
        db.session.commit()


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return (request.remote_addr or "")[:64]


def issue_token(user, session_id=None):
    """Create an access token bound to a session, creating the session if needed."""
    if session_id is None:
        session_id = str(uuid.uuid4())
        db.session.add(UserSession(
            id=session_id,
            user_id=user.id,
            user_agent=(request.headers.get("User-Agent") or "")[:512],
            ip_address=client_ip(),
        ))
        db.session.commit()
    return create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "sid": session_id},
    )


def session_lifetime():
    expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 86400)
    return expires if isinstance(expires, timedelta) else timedelta(seconds=int(expires))


def active_session_filters():
    """A session is active until revoked or until its token expires (lifetime after sign-in)."""
    cutoff = datetime.utcnow() - session_lifetime()
    return [
        UserSession.revoked_at.is_(None),
        UserSession.created_at >= cutoff,
        UserSession.last_seen_at >= cutoff,
    ]


def active_sessions_query(user_id):
    return UserSession.query.filter(UserSession.user_id == user_id, *active_session_filters())


def session_status(s):
    if s.revoked_at is not None:
        return "revoked"
    cutoff = datetime.utcnow() - session_lifetime()
    if (s.created_at and s.created_at < cutoff) or (s.last_seen_at and s.last_seen_at < cutoff):
        return "expired"
    return "active"


def is_admin_email(email):
    admins = {e.strip().lower() for e in current_app.config.get("ADMIN_EMAILS", "").split(",") if e.strip()}
    return (email or "").lower() in admins


def revoke_sessions(user_id, keep_session_id=None):
    now = datetime.utcnow()
    query = UserSession.query.filter(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
    if keep_session_id:
        query = query.filter(UserSession.id != keep_session_id)
    count = 0
    for s in query.all():
        s.revoked_at = now
        count += 1
    return count


def describe_user_agent(ua):
    ua = ua or ""
    if "Edg/" in ua:
        browser = "Edge"
    elif "OPR/" in ua or "Opera" in ua:
        browser = "Opera"
    elif "Firefox/" in ua:
        browser = "Firefox"
    elif "Chrome/" in ua or "CriOS/" in ua:
        browser = "Chrome"
    elif "Safari/" in ua:
        browser = "Safari"
    else:
        browser = "Unknown browser"

    if "Windows" in ua:
        os_name = "Windows"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "Linux" in ua:
        os_name = "Linux"
    else:
        os_name = "Unknown OS"

    if "iPad" in ua or "Tablet" in ua:
        device = "tablet"
    elif "Mobi" in ua or "iPhone" in ua or "Android" in ua:
        device = "mobile"
    else:
        device = "desktop"
    return {"browser": browser, "os": os_name, "device_type": device}


def session_to_dict(s, current_sid=None):
    return {
        "id": s.id,
        **describe_user_agent(s.user_agent),
        "ip_address": s.ip_address,
        "created_at": s.created_at.isoformat() + "Z" if s.created_at else None,
        "last_seen_at": s.last_seen_at.isoformat() + "Z" if s.last_seen_at else None,
        "current": s.id == current_sid,
    }


def init_session_tracking(jwt):
    @jwt.token_in_blocklist_loader
    def _is_revoked(_jwt_header, jwt_payload):
        sid = jwt_payload.get("sid")
        if not sid:
            return False  # tokens issued before session tracking existed
        s = db.session.get(UserSession, sid)
        if s is None or s.revoked_at is not None:
            return True
        now = datetime.utcnow()
        if not s.last_seen_at or now - s.last_seen_at > LAST_SEEN_RESOLUTION:
            s.last_seen_at = now
            s.ip_address = client_ip()
            db.session.commit()
        return False


# ---------------------------------------------------------------------------
# TOTP (RFC 6238)
# ---------------------------------------------------------------------------

def generate_totp_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def totp_uri(secret, email):
    from urllib.parse import quote
    label = quote(f"{TOTP_ISSUER}:{email}")
    return (
        f"otpauth://totp/{label}?secret={secret}&issuer={quote(TOTP_ISSUER)}"
        f"&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_STEP}"
    )


def _hotp(secret, counter):
    padded = secret + "=" * (-len(secret) % 8)
    key = base64.b32decode(padded, casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)


def match_totp(secret, code, last_counter=None, window=1):
    """Return the matching time counter, or None. Allows ±window steps of clock drift."""
    code = re.sub(r"\s", "", code or "")
    if not secret or not re.fullmatch(r"\d{%d}" % TOTP_DIGITS, code):
        return None
    now = int(time.time()) // TOTP_STEP
    for counter in range(now - window, now + window + 1):
        if last_counter is not None and counter <= last_counter:
            continue  # already used: reject replays
        if hmac.compare_digest(_hotp(secret, counter), code):
            return counter
    return None


def _hash_code(code):
    normalized = re.sub(r"[\s-]", "", code or "").lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def generate_recovery_codes():
    codes = [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}-{secrets.token_hex(2)}" for _ in range(RECOVERY_CODE_COUNT)]
    return codes, [_hash_code(c) for c in codes]


def verify_second_factor(user, code):
    """Check a TOTP or recovery code for a 2FA-enabled user, consuming it on success.

    Returns "totp", "recovery" or None. Caller must commit.
    """
    counter = match_totp(user.totp_secret, code, user.totp_last_counter)
    if counter is not None:
        user.totp_last_counter = counter
        return "totp"
    hashed = _hash_code(code)
    remaining = list(user.totp_recovery_codes or [])
    for stored in remaining:
        if hmac.compare_digest(stored, hashed):
            remaining.remove(stored)
            user.totp_recovery_codes = remaining
            return "recovery"
    return None
