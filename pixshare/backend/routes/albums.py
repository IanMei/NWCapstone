from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.album import Album

albums_bp = Blueprint("albums", __name__)

# GET /api/albums — Fetch all albums for current user
@albums_bp.route("/albums", methods=["GET"])
@jwt_required()
def get_albums():
    user_id = get_jwt_identity()
    albums = Album.query.filter_by(user_id=user_id).all()
    return jsonify({
        "albums": [
            {"id": album.id, "name": album.title, "created_at": album.created_at.isoformat()}
            for album in albums
        ]
    })

# POST /api/albums — Create new album
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

# DELETE /api/albums/<id> — Delete album by ID
@albums_bp.route("/albums/<int:album_id>", methods=["DELETE"])
@jwt_required()
def delete_album(album_id):
    user_id = get_jwt_identity()
    album = Album.query.filter_by(id=album_id, user_id=user_id).first()

    if not album:
        return jsonify({"msg": "Album not found"}), 404

    db.session.delete(album)
    db.session.commit()
    return jsonify({"msg": "Album deleted"}), 200
