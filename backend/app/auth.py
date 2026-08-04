from __future__ import annotations

from pathlib import Path

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)
_firebase_ready = False


def init_firebase(settings: Settings | None = None) -> None:
    """Initialize Firebase Admin once. Prefers JSON file, else env credentials."""
    global _firebase_ready
    if _firebase_ready or firebase_admin._apps:
        _firebase_ready = True
        return

    settings = settings or get_settings()
    json_path = Path(__file__).resolve().parent.parent / "firebase-service-account.json"

    if json_path.exists():
        cred = credentials.Certificate(str(json_path))
        firebase_admin.initialize_app(cred)
        _firebase_ready = True
        return

    if settings.firebase_project_id and settings.firebase_private_key and settings.firebase_client_email:
        private_key = settings.firebase_private_key.replace("\\n", "\n")
        cred = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "private_key_id": settings.firebase_private_key_id,
                "private_key": private_key,
                "client_email": settings.firebase_client_email,
                "client_id": settings.firebase_client_id,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": settings.firebase_client_cert_url,
            }
        )
        firebase_admin.initialize_app(cred)
        _firebase_ready = True
        return

    if settings.dev_skip_auth:
        # Allow local UI work without Firebase project credentials.
        _firebase_ready = False
        return

    raise RuntimeError(
        "Firebase Admin is not configured. Add backend/firebase-service-account.json "
        "or set FIREBASE_* env vars, or set DEV_SKIP_AUTH=true for local-only mode."
    )


def _verify_token(token: str, settings: Settings) -> dict:
    if settings.dev_skip_auth and token.startswith("dev:"):
        uid = token.removeprefix("dev:")
        return {"uid": uid or "dev-user", "email": f"{uid or 'dev-user'}@example.com"}

    if not _firebase_ready and not firebase_admin._apps:
        init_firebase(settings)

    if not firebase_admin._apps:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Auth is not configured on the server.",
        )

    try:
        return firebase_auth.verify_id_token(token)
    except Exception as exc:  # noqa: BLE001 — map all verify failures to 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase token: {exc}",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    """
    Verify Firebase ID token from Authorization: Bearer <token>,
    then ensure a local User profile row exists for that UID.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    decoded = _verify_token(credentials.credentials, settings)
    uid = decoded.get("uid")
    email = decoded.get("email") or f"{uid}@users.pulse-track.local"
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing uid")

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user is None:
        user = User(
            firebase_uid=uid,
            email=email,
            display_name=(decoded.get("name") or email.split("@")[0]),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.email != email and email:
        user.email = email
        db.commit()
        db.refresh(user)

    return user
