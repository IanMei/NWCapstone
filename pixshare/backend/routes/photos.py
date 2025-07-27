from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from extensions import db
from models.photo import Photo
from models.album import Album

photos_bp = Blueprint("photos", __name__)

# GET /api/albums/<album_id>/photos — fetch photos in an album
@photos_bp.route("/albums/<int:album_id>/photos", methods=["GET"])
@jwt_required()
def get_photos(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()

    if not album:
        return jsonify({"msg": "Album not found"}), 404

    photos = Photo.query.filter_by(album_id=album_id, user_id=user_id).all()
    return jsonify({
        "photos": [
            {
                "id": p.id,
                "url": f"/uploads/{p.filename}",
                "uploaded_at": p.uploaded_at.isoformat()
            } for p in photos
        ]
    })

# POST /api/albums/<album_id>/photos — upload a photo
@photos_bp.route("/albums/<int:album_id>/photos", methods=["POST"])
@jwt_required()
def upload_photo(album_id):
    user_id = get_jwt_identity()

    if "photo" not in request.files:
        return jsonify({"msg": "No photo uploaded"}), 400

    photo_file = request.files["photo"]
    if photo_file.filename == "":
        return jsonify({"msg": "Empty filename"}), 400

    album = Album.query.filter_by(id=album_id, user_id=user_id).first()
    if not album:
        return jsonify({"msg": "Album not found"}), 404

    filename = secure_filename(photo_file.filename)
    upload_folder = os.path.join(current_app.root_path, "static/uploads")
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    photo_file.save(filepath)

    photo = Photo(
        filename=filename,
        filepath=filepath,
        album_id=album_id,
        user_id=user_id
    )
    db.session.add(photo)
    db.session.commit()

    return jsonify({
        "photo": {
            "id": photo.id,
            "url": f"/uploads/{filename}",
            "uploaded_at": photo.uploaded_at.isoformat()
        }
    }), 201

# DELETE /api/photos/<photo_id> — delete photo
@photos_bp.route("/photos/<int:photo_id>", methods=["DELETE"])
@jwt_required()
def delete_photo(photo_id):
    user_id = get_jwt_identity()
    photo = Photo.query.filter_by(id=photo_id, user_id=user_id).first()

    if not photo:
        return jsonify({"msg": "Photo not found"}), 404

    try:
        os.remove(photo.filepath)
    except FileNotFoundError:
        pass  # File may already be gone

    db.session.delete(photo)
    db.session.commit()
    return jsonify({"msg": "Photo deleted"}), 200
