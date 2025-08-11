# backend/routes/shares.py
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.album import Album
from models.photo import Photo
from models.event import Event
from models.share import Share
import secrets

shares_bp = Blueprint("shares", __name__)

def _uid():
    """JWT identity may be a string; coerce to int if possible."""
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid

def _new_token():
    # short, URL-safe
    return secrets.token_urlsafe(24)

def _owner_required_album(user_id, album_id):
    return Album.query.filter_by(id=album_id, user_id=user_id).first() is not None

def _owner_required_photo(user_id, photo_id):
    return Photo.query.filter_by(id=photo_id, user_id=user_id).first() is not None

def _owner_required_event(user_id, event_id):
    return Event.query.filter_by(id=event_id, user_id=user_id).first() is not None

# -------------------------
# Create public links
# -------------------------

# POST /api/share/album/:album_id
@shares_bp.route("/share/album/<int:album_id>", methods=["POST"])
@jwt_required()
def create_album_share(album_id):
    user_id = _uid()
    if not _owner_required_album(user_id, album_id):
        return jsonify({"msg": "Album not found"}), 404

    body = request.get_json() or {}
    can_comment = bool(body.get("can_comment", False))

    token = _new_token()
    s = Share(album_id=album_id, token=token, can_comment=can_comment)
    db.session.add(s)
    db.session.commit()

    return jsonify({
        "share": {
            "id": s.id,
            "token": token,
            "url": f"/api/s/{token}/album",
            "can_comment": s.can_comment
        }
    }), 201

# POST /api/share/photo/:photo_id
@shares_bp.route("/share/photo/<int:photo_id>", methods=["POST"])
@jwt_required()
def create_photo_share(photo_id):
    user_id = _uid()
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

# POST /api/share/event/:event_id
@shares_bp.route("/share/event/<int:event_id>", methods=["POST"])
@jwt_required()
def create_event_share(event_id):
    user_id = _uid()
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

# -------------------------
# Revoke a share
# -------------------------

# DELETE /api/share/:share_id
@shares_bp.route("/share/<int:share_id>", methods=["DELETE"])
@jwt_required()
def revoke_share(share_id):
    user_id = _uid()
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

# -------------------------
# Public: open share links
# -------------------------

# GET /api/s/:token/album
@shares_bp.route("/s/<token>/album", methods=["GET"])
def open_album_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.album_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    album = Album.query.get_or_404(s.album_id)
    photos = Photo.query.filter_by(album_id=album.id).all()

    # Optional: hand back tokenized image URLs to simplify public clients
    host = request.host_url.rstrip("/")
    def pub_url(p): return f"{host}/uploads/{p.filepath}?t={token}"

    return jsonify({
        "album": {"id": album.id, "name": album.title},
        "photos": [
            {
                "id": p.id,
                "filename": p.filename,
                "filepath": p.filepath,       # raw path if you prefer
                "url": pub_url(p),            # tokenized URL for direct <img> usage
                "uploaded_at": p.uploaded_at.isoformat()
            }
            for p in photos
        ],
        "can_comment": s.can_comment,
    }), 200

# GET /api/s/:token/photo
@shares_bp.route("/s/<token>/photo", methods=["GET"])
def open_photo_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.photo_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    p = Photo.query.get_or_404(s.photo_id)
    host = request.host_url.rstrip("/")
    url = f"{host}/uploads/{p.filepath}?t={token}"

    return jsonify({
        "photo": {
            "id": p.id,
            "filename": p.filename,
            "filepath": p.filepath,
            "url": url,  # tokenized
            "uploaded_at": p.uploaded_at.isoformat()
        },
        "can_comment": s.can_comment,
    }), 200

# GET /api/s/:token/event
@shares_bp.route("/s/<token>/event", methods=["GET"])
def open_event_share(token):
    s = Share.query.filter_by(token=token).first()
    if not s or not s.event_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    e = Event.query.get_or_404(s.event_id)
    return jsonify({
        "event": {
            "id": e.id,
            "name": e.title,
            "description": e.description,
            "date": e.date.isoformat() if e.date else None,
            "shareId": token,
        },
        "can_comment": s.can_comment,
    }), 200
