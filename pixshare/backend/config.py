import os
from dotenv import load_dotenv

load_dotenv()
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Flask / SQLAlchemy
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'instance', 'pixshare.db')}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")

    # ✅ Accept JWTs from both headers AND cookies
    # - APIs will be decorated to read headers-only
    # - /uploads will accept headers or cookies
    # Allow both header + cookie, but we’ll scope the cookie to /uploads only
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_SAMESITE = "Lax"          # same-site so it’s sent to your proxied /uploads
    JWT_COOKIE_SECURE = False            # dev over http
    JWT_COOKIE_CSRF_PROTECT = False      # safe here since we’re scoping the cookie path
    JWT_ACCESS_COOKIE_PATH = "/uploads"  # <-- cookie only goes to /uploads, not /api
