from app import app
from extensions import db

with app.app_context():
    print(db.engine.url) 