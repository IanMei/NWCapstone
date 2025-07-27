from extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    albums = db.relationship("Album", backref="owner", lazy=True)
    photos = db.relationship("Photo", backref="uploader", lazy=True)
    events = db.relationship("Event", backref="creator", lazy=True)
