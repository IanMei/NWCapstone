# backend/routes/shares.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
import secrets

from models.album import Album
from models.photo import Photo
from models.share import Share
from models.event import Event

# If you created a separate association *table* for event<->album:
#   models/event_albums.py should expose `event_albums = db.Table(...)`
# If you created a small model class EventAlbum instead, import that and adapt the queries below.
try:
    # Prefer the plain association table name `event_albums`
    from models.event_albums import event_albums  # type: ignore
except Exception:
    event_albums = None  # will fall back to relationship on Event if available

shares_bp = Blueprint("shares", __name__)

def _new_token():
    # short, URL-safe
    return secrets.token_urlsafe(24)

def _owner_required_album(user_id, album_id):
    return Album.query.filter_by(id=album_id, user_id=user_id).first() is not None

def _owner_required_photo(user_id, photo_id):
    return Photo.query.filter_by(id=photo_id, user_id=user_id).first() is not None

def _owner_required_event(user_id, event_id):
    return Event.query.filter_by(id=event_id, user_id=user_id).first() is not None

# -----------------------------
# Album share
# -----------------------------
@shares_bp.route("/share/album/<int:album_id>", methods=["POST"])
@jwt_required()
def create_album_share(album_id):
    user_id = get_jwt_identity()
    if not _owner_required_album(user_id, album_id):
        return jsonify({"msg": "Album not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(album_id=album_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    # client can open /api/s/<token>/album
    return jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/album",
            "can_comment": s.can_comment
        }
    }), 201

# -----------------------------
# Photo share
# -----------------------------
@shares_bp.route("/share/photo/<int:photo_id>", methods=["POST"])
@jwt_required()
def create_photo_share(photo_id):
    user_id = get_jwt_identity()
    if not _owner_required_photo(user_id, photo_id):
        return jsonify({"msg": "Photo not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(photo_id=photo_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    return jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/photo",
            "can_comment": s.can_comment
        }
    }), 201

# -----------------------------
# Event share (NEW)
# -----------------------------
@shares_bp.route("/share/event/<int:event_id>", methods=["POST"])
@jwt_required()
def create_event_share(event_id):
    """Create a public share token for an event."""
    user_id = get_jwt_identity()
    if not _owner_required_event(user_id, event_id):
        return jsonify({"msg": "Event not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(event_id=event_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    return jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/event",
            "can_comment": s.can_comment
        }
    }), 201

# -----------------------------
# Revoke a share by id
# -----------------------------
@shares_bp.route("/share/<int:share_id>", methods=["DELETE"])
@jwt_required()
def revoke_share(share_id):
    user_id = get_jwt_identity()
    s = Share.query.get_or_404(share_id)
    # must be owner of the underlying resource
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

# -----------------------------
# Public endpoints
# -----------------------------
@shares_bp.route("/s/<token>/album", methods=["GET"])
def open_album_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.album_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    album = Album.query.get_or_404(s.album_id)
    photos = Photo.query.filter_by(album_id=album.id).all()
    return jsonify({
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
    }), 200

@shares_bp.route("/s/<token>/photo", methods=["GET"])
def open_photo_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.photo_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    p = Photo.query.get_or_404(s.photo_id)
    return jsonify({
        "photo": {
            "id": p.id,
            "filename": p.filename,
            "filepath": p.filepath,
            "uploaded_at": p.uploaded_at.isoformat(),
            "album_id": p.album_id,
        },
        "can_comment": s.can_comment,
    }), 200

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

    # Get albums linked to this event
    if event_albums is not None:
        # using association table
        albums = (
            db.session.query(Album)
            .join(event_albums, event_albums.c.album_id == Album.id)
            .filter(event_albums.c.event_id == ev.id)
            .order_by(Album.created_at.asc())
            .all()
        )
    else:
        # fallback: Event has a relationship `albums`
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

    return jsonify({
        "event": {
            "id": ev.id,
            "name": getattr(ev, "title", None) or getattr(ev, "name", ""),
            "description": getattr(ev, "description", None),
            "date": getattr(ev, "date", None).isoformat() if getattr(ev, "date", None) else None,
        },
        "albums": [
            {"id": a.id, "name": a.title} for a in albums  # frontend expects "name"
        ],
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
    }), 200
