import os
from dotenv import load_dotenv

load_dotenv()  # Load from .env
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-key")
    SQLALCHEMY_DATABASE_URI = (
        f"sqlite:///{os.path.join(basedir, 'instance', 'pixshare.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "d4b275aa3b4b8c5f6f1c60f9a7d9ce93d97ad6e26e9b9a87c9a27d4ec366aa32"
    UPLOAD_FOLDER = "uploads/photos/"
    # JWT can be read from headers and cookies
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_SECURE = False        # True in production with HTTPS
    JWT_COOKIE_SAMESITE = "Lax"      # or "Strict" if same-site only
    JWT_COOKIE_CSRF_PROTECT = False  # keep simple for now; enable later if you want