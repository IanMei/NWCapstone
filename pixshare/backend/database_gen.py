from app import app
from extensions import db
from models.user import User
from models.album import Album
from models.photo import Photo

with app.app_context():
    db.create_all()
    print("✅ Database and tables created!")