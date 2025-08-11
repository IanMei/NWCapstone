# backend/routes/auth.py
from flask import Blueprint, request, jsonify, make_response
from extensions import db, bcrypt
from models.user import User
from flask_jwt_extended import create_access_token, set_access_cookies, jwt_required, unset_jwt_cookies

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    full_name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not full_name or not email or not password:
        return jsonify({"msg": "Name, email, and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(full_name=full_name, email=email, password_hash=password_hash)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    resp = make_response(jsonify({"token": access_token}), 200)
    set_access_cookies(resp, access_token)  # sets httpOnly cookie for same-origin requests (via Vite proxy)
    return resp


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    resp = make_response(jsonify({"msg": "Logged out"}), 200)
    unset_jwt_cookies(resp)
    return resp
