from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os

from models.photo import Photo
from models.comment import Comment
from models.user import User
from models.album import Album
from extensions import db

photos_bp = Blueprint("photos", __name__)

# ✅ Uploads folder outside of backend and frontend
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
UPLOAD_FOLDER = os.path.join(BASE_UPLOAD_DIR, "photos")

@photos_bp.route("/albums/<int:album_id>/photos", methods=["GET"])
@jwt_required()
def get_photos(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    photos = Photo.query.filter_by(album_id=album.id).all()
    return jsonify({
        "photos": [
            {
                "id": photo.id,
                "filename": photo.filename,
                "filepath": photo.filepath,
                "uploaded_at": photo.uploaded_at.isoformat()
            }
            for photo in photos
        ]
    }), 200

@photos_bp.route("/albums/<int:album_id>/photos", methods=["POST"])
@jwt_required()
def upload_photos(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    if "photo" not in request.files and "photos" not in request.files:
        return jsonify({"msg": "No file(s) provided"}), 400

    files = request.files.getlist("photos") or [request.files["photo"]]
    saved_photos = []

    for file in files:
        if file.filename == "":
            continue

        filename = secure_filename(file.filename)
        folder_path = os.path.join(UPLOAD_FOLDER, str(user_id), str(album_id))
        os.makedirs(folder_path, exist_ok=True)

        filepath = os.path.join(folder_path, filename)
        file.save(filepath)

        # ✅ Relative path from the /uploads folder
        rel_path = os.path.relpath(filepath, BASE_UPLOAD_DIR)

        photo = Photo(
            filename=filename,
            filepath=rel_path,
            album_id=album.id,
            user_id=user_id
        )
        db.session.add(photo)
        saved_photos.append(photo)

    db.session.commit()

    return jsonify({
        "photos": [
            {
                "id": photo.id,
                "filename": photo.filename,
                "filepath": photo.filepath,
                "uploaded_at": photo.uploaded_at.isoformat()
            } for photo in saved_photos
        ]
    }), 201

@photos_bp.route("/photos/<int:photo_id>", methods=["DELETE"])
@jwt_required()
def delete_photo(photo_id):
    user_id = get_jwt_identity()
    photo = Photo.query.filter_by(id=photo_id, user_id=user_id).first()
    if not photo:
        return jsonify({"msg": "Photo not found"}), 404

    full_path = os.path.join(BASE_UPLOAD_DIR, photo.filepath)
    if os.path.exists(full_path):
        os.remove(full_path)

    db.session.delete(photo)
    db.session.commit()
    return jsonify({"msg": "Photo deleted"}), 200

# GET /api/photos/<photo_id>/comments — List comments for a photo
@photos_bp.route("/photos/<int:photo_id>/comments", methods=["GET"])
@jwt_required()
def get_photo_comments(photo_id):
    photo = Photo.query.get_or_404(photo_id)

    comments = Comment.query.filter_by(photo_id=photo.id).order_by(Comment.created_at.asc()).all()

    result = [
        {
            "id": c.id,
            "content": c.content,
            "author": c.user.name if c.user else "Unknown",
            "created_at": c.created_at.isoformat()
        }
        for c in comments
    ]

    return jsonify({"comments": result}), 200


@photos_bp.route("/photos/<int:photo_id>/comments", methods=["POST"])
@jwt_required()
def post_comment(photo_id):
    user_id = get_jwt_identity()
    data = request.get_json()

    content = data.get("content")
    if not content:
        return jsonify({"msg": "Content is required"}), 400

    photo = Photo.query.get(photo_id)
    if not photo:
        return jsonify({"msg": "Photo not found"}), 404

    comment = Comment(
        content=content,
        user_id=user_id,
        photo_id=photo.id
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "comment": {
            "id": comment.id,
            "content": comment.content,
            "author": photo.user.username  # or however you're storing author
        }
    }), 201