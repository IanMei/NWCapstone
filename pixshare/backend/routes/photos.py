# backend/routes/photos.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os

from models.photo import Photo
from models.album import Album
from extensions import db

photos_bp = Blueprint("photos", __name__)

BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
UPLOAD_FOLDER = os.path.join(BASE_UPLOAD_DIR, "photos")

def _uid():
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid

@photos_bp.route("/albums/<int:album_id>/photos", methods=["GET"])
@jwt_required(locations=["headers"])
def get_photos(album_id):
    user_id = _uid()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
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

@photos_bp.route("/albums/<int:album_id>/photos", methods=["POST"])
@jwt_required(locations=["headers"])
def upload_photos(album_id):
    user_id = _uid()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    if "photo" not in request.files and "photos" not in request.files:
        return jsonify({"msg": "No file(s) provided"}), 400

    files = request.files.getlist("photos") or [request.files.get("photo")]
    files = [f for f in files if f]

    saved_photos = []
    for file in files:
        if not file or file.filename == "":
            continue

        filename = secure_filename(file.filename)
        folder_path = os.path.join(UPLOAD_FOLDER, str(user_id), str(album_id))
        os.makedirs(folder_path, exist_ok=True)

        filepath = os.path.join(folder_path, filename)
        file.save(filepath)

        rel_path = os.path.relpath(filepath, BASE_UPLOAD_DIR)

        try:
            size_bytes = os.path.getsize(filepath)
        except OSError:
            size_bytes = 0

        photo = Photo(
            filename=filename,
            filepath=rel_path,
            album_id=album.id,
            user_id=user_id,
            size=size_bytes,
        )
        db.session.add(photo)
        saved_photos.append(photo)

    db.session.commit()

    return jsonify({
        "photos": [
            {
                "id": p.id,
                "filename": p.filename,
                "filepath": p.filepath,
                "uploaded_at": p.uploaded_at.isoformat(),
                "size": getattr(p, "size", 0),
            } for p in saved_photos
        ]
    }), 201

@photos_bp.route("/photos/<int:photo_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def delete_photo(photo_id):
    user_id = _uid()
    photo = Photo.query.filter_by(id=photo_id, user_id=user_id).first()
    if not photo:
        return jsonify({"msg": "Photo not found"}), 404

    full_path = os.path.join(BASE_UPLOAD_DIR, photo.filepath)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass

    db.session.delete(photo)
    db.session.commit()
    return jsonify({"msg": "Photo deleted"}), 200
