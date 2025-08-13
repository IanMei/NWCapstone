# backend/models/photo_reaction.py
from extensions import db
from datetime import datetime
from sqlalchemy import UniqueConstraint

class PhotoReaction(db.Model):
    __tablename__ = "photo_reaction"

    id = db.Column(db.Integer, primary_key=True)

    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=False)
    emoji = db.Column(db.String(16), nullable=False)  # e.g., "❤️", "👍", "⭐"

    # Either a user OR a guest (one must be non-null at the application layer)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    guest_id = db.Column(db.Integer, db.ForeignKey("guest.id"), nullable=True)

    # Optional: reaction came via a specific share link
    share_id = db.Column(db.Integer, db.ForeignKey("share.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ---- Relationships (use back_populates so both sides match cleanly) ----
    photo = db.relationship("Photo", back_populates="reactions", lazy=True)
    user  = db.relationship("User", back_populates="photo_reactions", lazy=True)
    guest = db.relationship("Guest", back_populates="reactions", lazy=True)
    # Keep this simple; only link to Share without creating a backref unless you add it on Share
    share = db.relationship("Share", lazy=True)

    __table_args__ = (
        # Prevent duplicate same-emoji by same principal on same photo
        UniqueConstraint("photo_id", "user_id", "emoji", name="uq_react_user"),
        UniqueConstraint("photo_id", "guest_id", "emoji", name="uq_react_guest"),
        db.Index("ix_react_photo", "photo_id"),
    )
