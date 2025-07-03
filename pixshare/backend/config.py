import os
from dotenv import load_dotenv

load_dotenv()  # Load from .env

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///database/pixshare.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False