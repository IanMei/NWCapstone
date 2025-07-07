from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.album import Album
from models.user import User

albums_bp = Blueprint("albums", __name__)

@albums_bp.route("/albums", methods=["GET"])
@jwt_required()
def get_albums():
    user_id = get_jwt_identity()
    print("🧠 user_id from token:", user_id)
    if not user_id:
        return jsonify({"msg": "Invalid or missing token identity"}), 422
    
    albums = Album.query.filter_by(user_id=user_id).all()
    
    print('albums:', albums)  # Debugging line to check fetched albums
    
    if not albums:
        return jsonify({"albums": []}), 200  # ✅ Return empty list

    return jsonify([
        {
            "id": album.id,
            "title": album.title,
            "description": album.description,
            "created_at": album.created_at.isoformat()
        } for album in albums
    ]), 200

@albums_bp.route("/albums", methods=["POST"])
@jwt_required()
def create_album():
    data = request.get_json()
    title = data.get("title")
    description = data.get("description", "")
    user_id = get_jwt_identity()
    
    print("Incoming data:", data)
    print("Token user ID:", user_id)

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    new_album = Album(title=title, description=description, user_id=user_id)
    db.session.add(new_album)
    db.session.commit()

    return jsonify({
        "msg": "Album created",
        "album": {
            "id": new_album.id,
            "title": new_album.title,
            "description": new_album.description,
            "created_at": new_album.created_at.isoformat()
        }
    }), 201
