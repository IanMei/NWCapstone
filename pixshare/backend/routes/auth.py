# backend/routes/auth.py
from flask import Blueprint, request, jsonify, make_response
from extensions import db, bcrypt
from models.user import User
from flask_cors import cross_origin
from flask_jwt_extended import create_access_token, unset_jwt_cookies, set_access_cookies

auth_bp = Blueprint("auth", __name__)

# -------------------------
# POST /api/auth/register
# -------------------------
@auth_bp.route("/register", methods=["POST"])
@cross_origin(supports_credentials=True)
def register():
    data = request.get_json() or {}
    full_name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")

    if not full_name or not email or not password:
        return jsonify({"msg": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"msg": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(full_name=full_name, email=email, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()

    # Auto-login new user: return token AND set HttpOnly cookie for /uploads
    access_token = create_access_token(identity=str(user.id))
    resp = make_response(jsonify({
        "msg": "User registered",
        "token": access_token,
        "user": {"id": user.id, "name": user.full_name, "email": user.email},
    }), 201)
    set_access_cookies(resp, access_token)  # cookie path is /uploads via your config
    return resp


# --------------------
# POST /api/auth/login
# --------------------
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
    set_access_cookies(resp, access_token)   # important for /uploads route
    return resp


# ---------------------
# POST /api/auth/logout
# ---------------------
@auth_bp.route("/logout", methods=["POST"])
@cross_origin(supports_credentials=True)
def logout():
    resp = make_response(jsonify({"msg": "Logged out"}), 200)
    unset_jwt_cookies(resp)
    return resp
