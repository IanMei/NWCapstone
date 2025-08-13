# backend/routes/dashboard.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.album import Album
from models.photo import Photo
from extensions import db
from sqlalchemy.sql import func

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard/storage", methods=["GET"])
@jwt_required(locations=["headers"])
def get_storage_usage():
    user_id = get_jwt_identity()
    total_bytes = db.session.query(func.sum(Photo.size)).filter_by(user_id=user_id).scalar() or 0
    total_gb = round(total_bytes / (1024 ** 3), 2)
    return jsonify({"used_gb": total_gb, "limit_gb": 10}), 200

@dashboard_bp.route("/dashboard/recent-albums", methods=["GET"])
@jwt_required(locations=["headers"])
def get_recent_albums():
    user_id = get_jwt_identity()
    albums = (
        Album.query
        .filter_by(user_id=user_id)
        .order_by(Album.created_at.desc())
        .limit(3)
        .all()
    )
    return jsonify({
        "albums": [
            {"id": a.id, "name": a.title, "created_at": a.created_at.isoformat()}
            for a in albums
        ]
    }), 200
