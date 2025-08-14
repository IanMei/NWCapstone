# backend/routes/albums.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.album import Album
from models.photo import Photo
from models.event_participant import EventParticipant
import os
import shutil

# optional: association table
try:
    from models.event_albums import event_albums
except Exception:
    event_albums = None

albums_bp = Blueprint("albums", __name__)

# 📁 Uploads folder is outside the backend directory
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
PHOTO_UPLOAD_ROOT = os.path.join(BASE_UPLOAD_DIR, "photos")

def _uid():
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid

def _user_can_view_album(user_id: int, album_id: int) -> bool:
    # Owner can view
    if Album.query.filter_by(id=album_id, user_id=user_id).first():
        return True

    # Participants can view albums linked to any event they joined
    if event_albums is not None:
        exists = (
            db.session.query(event_albums.c.event_id)
            .join(EventParticipant, EventParticipant.event_id == event_albums.c.event_id)
            .filter(event_albums.c.album_id == album_id, EventParticipant.user_id == user_id)
            .first()
        )
        if exists:
            return True

    return False

# GET /api/albums — Fetch all albums for current user (unchanged)
@albums_bp.route("/albums", methods=["GET"])
@jwt_required()
def get_albums():
    user_id = _uid()
    albums = Album.query.filter_by(user_id=user_id).all()
    return jsonify({
        "albums": [
            {
                "id": album.id,
                "name": album.title,
                "created_at": album.created_at.isoformat(),
                "photo_count": len(album.photos)
            }
            for album in albums
        ]
    }), 200

# GET /api/albums/<album_id> — allow owner OR participant (read-only)
@albums_bp.route("/albums/<int:album_id>", methods=["GET"])
@jwt_required()
def get_album(album_id):
    user_id = _uid()
    album = Album.query.get(album_id)
    if not album or not _user_can_view_album(user_id, album_id):
        # hide existence if not authorized
        return jsonify({"msg": "Album not found"}), 404

    return jsonify({
        "id": album.id,
        "name": album.title,
        "created_at": album.created_at.isoformat(),
        "photo_count": len(album.photos)
    }), 200

# GET /api/albums/<album_id>/photos — allow owner OR participant (read-only)
@albums_bp.route("/albums/<int:album_id>/photos", methods=["GET"])
@jwt_required()
def get_photos(album_id):
    user_id = _uid()
    album = Album.query.get(album_id)
    if not album or not _user_can_view_album(user_id, album_id):
        return jsonify({"msg": "Album not found"}), 404

    photos = Photo.query.filter_by(album_id=album.id).all()
    return jsonify({
        "photos": [
            {
                "id": p.id,
                "filename": p.filename,
                "filepath": p.filepath,
                "uploaded_at": p.uploaded_at.isoformat(),
                "size": getattr(p, "size", 0),
            }
            for p in photos
        ]
    }), 200

# POST /api/albums — Create a new album (owner-only)  (unchanged)
@albums_bp.route("/albums", methods=["POST"])
@jwt_required()
def create_album():
    user_id = _uid()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"msg": "Album name is required"}), 400

    album = Album(title=name, user_id=user_id)
    db.session.add(album)
    db.session.commit()

    return jsonify({
        "album": {
            "id": album.id,
            "name": album.title,
            "created_at": album.created_at.isoformat()
        }
    }), 201

# DELETE /api/albums/<album_id> — Delete an album and all its photos (owner-only) (unchanged)
@albums_bp.route("/albums/<int:album_id>", methods=["DELETE"])
@jwt_required()
def delete_album(album_id):
    user_id = _uid()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    from models.photo import Photo  # avoid circular import
    photos = Photo.query.filter_by(album_id=album.id, user_id=user_id).all()
    for photo in photos:
        full_path = os.path.join(BASE_UPLOAD_DIR, photo.filepath)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except OSError:
                pass
        db.session.delete(photo)

    album_folder = os.path.join(PHOTO_UPLOAD_ROOT, str(user_id), str(album.id))
    if os.path.exists(album_folder):
        try:
            shutil.rmtree(album_folder)
        except OSError:
            pass

    db.session.delete(album)
    db.session.commit()
    return jsonify({"msg": "Album and all associated photos deleted"}), 200
