from extensions import db
from datetime import datetime

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    album_id = db.Column(db.Integer, db.ForeignKey("album.id"), nullable=True)
    photo_id = db.Column(db.Integer, db.ForeignKey("photo.id"), nullable=True)

    user = db.relationship("User", backref="user_comments", lazy=True)     # renamed
    album = db.relationship("Album", backref="album_comments", lazy=True) # renamed
    photo = db.relationship("Photo", backref="photo_comments", lazy=True) # renamed
