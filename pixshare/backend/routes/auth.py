from flask import Blueprint, request, jsonify
from extensions import db, bcrypt  # ✅ from extensions
from models.user import User
from flask_jwt_extended import create_access_token
from flask_jwt_extended import jwt_required


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    full_name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(full_name=full_name, email=email, password_hash=password_hash)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"token": access_token}), 200