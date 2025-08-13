# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-key")

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'instance', 'pixshare.db')}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File uploads
    UPLOAD_FOLDER = "uploads/photos/"

    # JWT
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "d4b275aa3b4b8c5f6f1c60f9a7d9ce93d97ad6e26e9b9a87c9a27d4ec366aa32",
    )

    # We authenticate via Authorization header only
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # Cookie flags (kept off; harmless to leave defined)
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_CSRF_PROTECT = False

    # Helpful in dev to surface underlying JWT errors
    PROPAGATE_EXCEPTIONS = True