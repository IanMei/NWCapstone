# backend/routes/shares.py
from flask import Blueprint, jsonify, request, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select
from extensions import db
import secrets

from models.album import Album
from models.photo import Photo
from models.share import Share
from models.event import Event

# If you created a separate association *table* for event<->album:
#   models/event_albums.py should expose `event_albums = db.Table(...)`
# If you created a small model class EventAlbum instead, import that and adapt as needed.
try:
    from models.event_albums import event_albums  # type: ignore
except Exception:
    event_albums = None  # fallback to Event.albums relationship if available

shares_bp = Blueprint("shares", __name__)

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _new_token() -> str:
    """Short, URL-safe share token."""
    return secrets.token_urlsafe(24)

def _owner_required_album(user_id, album_id) -> bool:
    return Album.query.filter_by(id=album_id, user_id=user_id).first() is not None

def _owner_required_photo(user_id, photo_id) -> bool:
    return Photo.query.filter_by(id=photo_id, user_id=user_id).first() is not None

def _owner_required_event(user_id, event_id) -> bool:
    return Event.query.filter_by(id=event_id, user_id=user_id).first() is not None

def _nocache(resp):
    """Prevent caches / browsers from reusing old responses (helps avoid 304 confusion)."""
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

def is_valid_event_share(token: str, event_id: int) -> bool:
    """
    Small helper used by other routes (e.g., events.py) to accept collaboration via share link.
    """
    if not token:
        return False
    s = Share.query.filter_by(token=token, event_id=event_id).first()
    return s is not None

# --------------------------------------------------------------------------
# CREATE SHARES (owner-only)
# --------------------------------------------------------------------------

# POST /api/share/album/:album_id
@shares_bp.route("/share/album/<int:album_id>", methods=["POST"])
@jwt_required()
def create_album_share(album_id):
    """Create a public link for an album."""
    user_id = get_jwt_identity()
    if not _owner_required_album(user_id, album_id):
        return jsonify({"msg": "Album not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(album_id=album_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    resp = jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/album",
            "can_comment": s.can_comment
        }
    })
    return _nocache(resp), 201

# POST /api/share/photo/:photo_id
@shares_bp.route("/share/photo/<int:photo_id>", methods=["POST"])
@jwt_required()
def create_photo_share(photo_id):
    """Create a public link for a single photo."""
    user_id = get_jwt_identity()
    if not _owner_required_photo(user_id, photo_id):
        return jsonify({"msg": "Photo not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(photo_id=photo_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    resp = jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/photo",
            "can_comment": s.can_comment
        }
    })
    return _nocache(resp), 201

# POST /api/share/event/:event_id
@shares_bp.route("/share/event/<int:event_id>", methods=["POST"])
@jwt_required()
def create_event_share(event_id):
    """
    Create a public link for an event. This token can later be used by
    the event routes (via decorators) to allow collaboration actions.
    """
    user_id = get_jwt_identity()
    if not _owner_required_event(user_id, event_id):
        return jsonify({"msg": "Event not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(event_id=event_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    resp = jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/event",
            "can_comment": s.can_comment
        }
    })
    return _nocache(resp), 201

# --------------------------------------------------------------------------
# REVOKE (owner-only)
# --------------------------------------------------------------------------

# DELETE /api/share/:share_id
@shares_bp.route("/share/<int:share_id>", methods=["DELETE"])
@jwt_required()
def revoke_share(share_id):
    user_id = get_jwt_identity()
    s = Share.query.get_or_404(share_id)

    ok = False
    if s.album_id:
        ok = _owner_required_album(user_id, s.album_id)
    elif s.photo_id:
        ok = _owner_required_photo(user_id, s.photo_id)
    elif s.event_id:
        ok = _owner_required_event(user_id, s.event_id)

    if not ok:
        return jsonify({"msg": "Not authorized"}), 403

    db.session.delete(s)
    db.session.commit()
    return jsonify({"msg": "Share revoked"}), 200

# --------------------------------------------------------------------------
# PUBLIC: OPEN LINKS
# --------------------------------------------------------------------------

# GET /api/s/:token/album
@shares_bp.route("/s/<token>/album", methods=["GET"])
def open_album_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.album_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    album = Album.query.get_or_404(s.album_id)
    photos = Photo.query.filter_by(album_id=album.id).all()
    resp = jsonify({
        "album": {"id": album.id, "name": album.title},
        "photos": [
            {
                "id": p.id,
                "filename": p.filename,
                "filepath": p.filepath,
                "uploaded_at": p.uploaded_at.isoformat(),
                "album_id": album.id,
            }
            for p in photos
        ],
        "can_comment": s.can_comment,
    })
    return _nocache(resp), 200

# GET /api/s/:token/photo
@shares_bp.route("/s/<token>/photo", methods=["GET"])
def open_photo_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.photo_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    p = Photo.query.get_or_404(s.photo_id)
    resp = jsonify({
        "photo": {
            "id": p.id,
            "filename": p.filename,
            "filepath": p.filepath,
            "uploaded_at": p.uploaded_at.isoformat(),
            "album_id": p.album_id,
        },
        "can_comment": s.can_comment,
    })
    return _nocache(resp), 200

# GET /api/s/:token/event
@shares_bp.route("/s/<token>/event", methods=["GET"])
def open_event_share(token):
    """
    Public: open an event share.
    Returns:
      - event info (id, name, description, date)
      - albums attached to the event
      - all photos across those albums (each photo includes album_id)
    """
    s = Share.query.filter_by(token=token).first()
    if not s or not s.event_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    ev = Event.query.get_or_404(s.event_id)

    # Resolve albums linked to the event
    if event_albums is not None:
        albums = (
            db.session.query(Album)
            .join(event_albums, event_albums.c.album_id == Album.id)
            .filter(event_albums.c.event_id == ev.id)
            .order_by(Album.created_at.asc())
            .all()
        )
    else:
        # fallback: rely on relationship if defined on Event
        try:
            albums = list(getattr(ev, "albums", []))
        except Exception:
            albums = []

    album_ids = [a.id for a in albums]
    photos = []
    if album_ids:
        photos = (
            Photo.query.filter(Photo.album_id.in_(album_ids))
            .order_by(Photo.uploaded_at.asc())
            .all()
        )

    resp = jsonify({
        "event": {
            "id": ev.id,
            "name": getattr(ev, "title", None) or getattr(ev, "name", ""),
            "description": getattr(ev, "description", None),
            "date": getattr(ev, "date", None).isoformat() if getattr(ev, "date", None) else None,
        },
        "albums": [{"id": a.id, "name": a.title} for a in albums],
        "photos": [
            {
                "id": p.id,
                "filename": p.filename,
                "filepath": p.filepath,
                "uploaded_at": p.uploaded_at.isoformat(),
                "album_id": p.album_id,
            }
            for p in photos
        ],
        "can_comment": s.can_comment,
    })
    return _nocache(resp), 200

# --------------------------------------------------------------------------
# Utility: resolve a token (helps frontend decide which page to open)
# --------------------------------------------------------------------------

# GET /api/share/resolve/:token
@shares_bp.route("/share/resolve/<token>", methods=["GET"])
def resolve_share(token):
    """
    Returns: { type: "album"|"photo"|"event", id: number }
    or 404 if token invalid.
    """
    s = Share.query.filter_by(token=token).first()
    if not s:
        return jsonify({"msg": "Invalid or expired link"}), 404

    if s.album_id:
        payload = {"type": "album", "id": s.album_id}
    elif s.photo_id:
        payload = {"type": "photo", "id": s.photo_id}
    elif s.event_id:
        payload = {"type": "event", "id": s.event_id}
    else:
        return jsonify({"msg": "Invalid or expired link"}), 404

    return _nocache(jsonify(payload)), 200
