# backend/routes/accounts.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_
from extensions import db, bcrypt
from models.user import User

accounts_bp = Blueprint("accounts", __name__)


def _uid():
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid


# ------------------------- PROFILE -------------------------

@accounts_bp.route("/account/profile", methods=["GET"])
@jwt_required(locations=["headers"])
def get_profile():
    user_id = _uid()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Keep API shape stable for the frontend: return "name"
    return jsonify({
        "name": user.full_name or "",
        "email": user.email or "",
        "subscription": "Free",  # no column; expose a stable value
    }), 200


@accounts_bp.route("/account/profile", methods=["PUT"])
@jwt_required(locations=["headers"])
def update_profile():
    user_id = _uid()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json(silent=True) or {}

    # Accept both "name" and "full_name" for flexibility
    new_name = (data.get("name") or data.get("full_name") or "").strip()
    new_email = (data.get("email") or "").strip().lower()

    if not new_name:
        return jsonify({"msg": "Name is required"}), 400
    if "@" not in new_email or "." not in new_email:
        return jsonify({"msg": "Invalid email"}), 400

    # Uniqueness check excluding self
    exists = User.query.filter(and_(User.email == new_email, User.id != user.id)).first()
    if exists:
        return jsonify({"msg": "Email already in use"}), 409

    user.full_name = new_name
    user.email = new_email
    db.session.commit()

    return jsonify({
        "msg": "Profile updated",
        "profile": {
            "name": user.full_name,
            "email": user.email,
            "subscription": "Free",
        }
    }), 200


# ------------------------- PASSWORD -------------------------

@accounts_bp.route("/account/password", methods=["PUT"])
@jwt_required(locations=["headers"])
def change_password():
    user_id = _uid()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    current = (data.get("current") or "").strip()
    new = (data.get("new") or "").strip()

    if not current or not new:
        return jsonify({"msg": "Current and new password are required"}), 400
    if len(new) < 6:
        return jsonify({"msg": "New password must be at least 6 characters"}), 400

    # Verify current password
    try:
        if not bcrypt.check_password_hash(user.password_hash, current):
            return jsonify({"msg": "Current password is incorrect"}), 400
    except Exception:
        return jsonify({"msg": "Password verification error"}), 500

    # Hash and store new password (ensure string)
    hashed = bcrypt.generate_password_hash(new)
    user.password_hash = hashed.decode("utf-8") if isinstance(hashed, (bytes, bytearray)) else str(hashed)
    db.session.commit()

    return jsonify({"msg": "Password updated"}), 200
