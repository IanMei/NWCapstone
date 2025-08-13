# backend/models/guest.py
from extensions import db
from datetime import datetime

class Guest(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Which share link this guest belongs to
    share_id = db.Column(db.Integer, db.ForeignKey("share.id"), nullable=False)

    # Opaque identifier kept in the browser (e.g., UUID or short token)
    guest_key = db.Column(db.String(64), unique=True, nullable=False)

    display_name = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    comments = db.relationship("Comment", backref="guest", lazy=True)

    # Match PhotoReaction.guest back_populates
    reactions = db.relationship(
        "PhotoReaction",
        back_populates="guest",
        lazy=True,
        cascade="all, delete-orphan"
    )

    uploads = db.relationship(
        "Photo",
        backref="guest_uploader",
        lazy=True,
        foreign_keys="Photo.uploaded_by_guest_id"
    )

    __table_args__ = (
        db.Index("ix_guest_share", "share_id"),
        db.Index("ix_guest_key", "guest_key"),
    )
