# backend/routes/auth.py
from flask import Blueprint, request, jsonify, make_response
from extensions import db, bcrypt
from models.user import User
from flask_cors import cross_origin
from flask_jwt_extended import create_access_token, unset_jwt_cookies, set_access_cookies

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
@cross_origin(supports_credentials=True)
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))

    # Return JSON for header-based API calls, AND drop an HttpOnly cookie for <img> /uploads
    resp = make_response(jsonify({"token": access_token}), 200)
    set_access_cookies(resp, access_token)   # <-- important
    return resp

@auth_bp.route("/logout", methods=["POST"])
def logout():
    resp = make_response(jsonify({"msg": "Logged out"}), 200)
    unset_jwt_cookies(resp)
    return resp
