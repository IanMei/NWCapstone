from extensions import db
from datetime import datetime

class Album(db.Model):
    __tablename__ = "albums"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 👇 Late binding using a string reference and `lazy='dynamic'` if needed
    # photos = db.relationship("photos", backref="albums", lazy=True)
