# backend/models/share.py
from extensions import db
from datetime import datetime

class Share(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    target_email = db.Column(db.String(120), nullable=True)
    token = db.Column(db.String(64), unique=True, nullable=True)
    can_comment = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    album_id = db.Column(db.Integer, db.ForeignKey("album.id"), nullable=True)
    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=True) 

    __table_args__ = (
        db.Index("ix_share_album", "album_id"),
        db.Index("ix_share_photo", "photo_id"),
        db.Index("ix_share_event", "event_id"),  
    )
