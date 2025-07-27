from extensions import db
from datetime import datetime

class Share(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    target_email = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    album_id = db.Column(db.Integer, db.ForeignKey("album.id"), nullable=True)
    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=True)
