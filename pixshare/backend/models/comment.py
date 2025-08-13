# backend/models/comment.py
from extensions import db
from datetime import datetime

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Auth user (optional if guest comments are allowed)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    # Photo being commented on (required here; adjust if you later support album/event comments in this table)
    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=False)

    # Guest comments via shared links (optional)
    guest_id = db.Column(db.Integer, db.ForeignKey("guest.id"), nullable=True)
    share_id = db.Column(db.Integer, db.ForeignKey("share.id"), nullable=True)

    # Pair with User.comments using back_populates (prevents duplicate backref)
    user = db.relationship("User", back_populates="comments", lazy=True)

    # These create Share.comments and (if defined) Guest.comments – OK as long as
    # Share/Guest don't also declare a relationship named "comments".
    # share = db.relationship("Share", back_populates="comments", lazy=True)
