# backend/models/photo.py
from extensions import db
from datetime import datetime

class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    filepath = db.Column(db.String(300), nullable=False)   # relative to /uploads
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    size = db.Column(db.BigInteger, default=0)

    album_id = db.Column(db.Integer, db.ForeignKey("album.id"), nullable=False)
    user_id  = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # NEW: if uploaded through a shared link
    uploaded_via_share_id = db.Column(db.Integer, db.ForeignKey("share.id"), nullable=True)
    uploaded_by_guest_id  = db.Column(db.Integer, db.ForeignKey("guest.id"), nullable=True)

    # When a photo is created via a share link, we keep that reference
    share = db.relationship(
        "Share",
        backref="shared_uploads",
        lazy=True,
        foreign_keys=[uploaded_via_share_id]
    )

    # Guest who uploaded (defined as backref on Guest.uploads already)
    # guest_uploader backref is created from Guest.uploads

    # ---- ADD: reactions on Photo (matches PhotoReaction.photo back_populates) ----
    reactions = db.relationship(
        "PhotoReaction",
        back_populates="photo",
        lazy=True,
        cascade="all, delete-orphan"
    )
