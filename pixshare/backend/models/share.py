# backend/models/share.py
from extensions import db
from datetime import datetime

class Share(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Existing fields
    target_email = db.Column(db.String(120), nullable=True)
    token = db.Column(db.String(64), unique=True, nullable=True)
    can_comment = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    album_id = db.Column(db.Integer, db.ForeignKey("album.id"), nullable=True)
    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=True)

    # NEW: fine-grained capabilities for collaboration
    can_react = db.Column(db.Boolean, default=False)
    can_upload = db.Column(db.Boolean, default=False)
    can_curate = db.Column(db.Boolean, default=False)

    # NEW: optional safety rails
    expires_at = db.Column(db.DateTime, nullable=True)
    max_upload_bytes = db.Column(db.BigInteger, nullable=True)
    max_files_per_guest = db.Column(db.Integer, nullable=True)

    # Optional backrefs (won’t break existing code)
    guests = db.relationship("Guest", backref="share", lazy=True)

    __table_args__ = (
        db.Index("ix_share_album", "album_id"),
        db.Index("ix_share_photo", "photo_id"),
        db.Index("ix_share_event", "event_id"),
    )