from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.album import Album
from models.photo import Photo
import os
import shutil

albums_bp = Blueprint("albums", __name__)

# 📁 Uploads folder is outside the backend directory
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
PHOTO_UPLOAD_ROOT = os.path.join(BASE_UPLOAD_DIR, "photos")

# GET /api/albums — Fetch all albums for current user
@albums_bp.route("/albums", methods=["GET"])
@jwt_required()
def get_albums():
    user_id = get_jwt_identity()
    albums = Album.query.filter_by(user_id=user_id).all()
    return jsonify({
        "albums": [
            {
                "id": album.id,
                "name": album.title,
                "created_at": album.created_at.isoformat()
            }
            for album in albums
        ]
    }), 200

# GET /api/albums/<album_id> — Get a single album's metadata
@albums_bp.route("/albums/<int:album_id>", methods=["GET"])
@jwt_required()
def get_album(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    return jsonify({
        "id": album.id,
        "name": album.title,
        "created_at": album.created_at.isoformat()
    }), 200

# POST /api/albums — Create a new album
@albums_bp.route("/albums", methods=["POST"])
@jwt_required()
def create_album():
    user_id = get_jwt_identity()
    data = request.get_json()
    name = data.get("name")

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

# DELETE /api/albums/<album_id> — Delete an album and all its photos
@albums_bp.route("/albums/<int:album_id>", methods=["DELETE"])
@jwt_required()
def delete_album(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()

    if not album:
        return jsonify({"msg": "Album not found"}), 404

    # 🧹 Delete all photos in this album (both DB + files)
    photos = Photo.query.filter_by(album_id=album.id, user_id=user_id).all()
    for photo in photos:
        full_path = os.path.join(BASE_UPLOAD_DIR, photo.filepath)
        if os.path.exists(full_path):
            os.remove(full_path)
        db.session.delete(photo)

    # 🗑 Delete the album folder (if it exists)
    album_folder = os.path.join(PHOTO_UPLOAD_ROOT, str(user_id), str(album.id))
    if os.path.exists(album_folder):
        shutil.rmtree(album_folder)

    # ✅ Remove album from DB
    db.session.delete(album)
    db.session.commit()

    return jsonify({"msg": "Album and all associated photos deleted"}), 200
