# backend/routes/auth.py
from flask import Blueprint, request, jsonify, make_response
from extensions import db, bcrypt
from models.user import User
from flask_jwt_extended import create_access_token, jwt_required, unset_jwt_cookies

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    # identity is an int (you already fixed this)
    access_token = create_access_token(identity=str(user.id))
    # Return JSON only; do NOT set cookie
    return jsonify({"token": access_token}), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Header-only auth: no server-side session to destroy.
    We still clear JWT cookies if the browser sends any (from older versions).
    Always returns 200 so the client can clear local state.
    """
    resp = make_response(jsonify({"msg": "Logged out"}), 200)
    unset_jwt_cookies(resp)  # harmless if no cookies present
    return resp
