from extensions import db
from datetime import datetime
from models.event_albums import event_albums

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=True)

    # NEW
    share_id = db.Column(db.String(48), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    albums = db.relationship(
        "Album",
        secondary=event_albums,
        lazy="subquery",
        backref=db.backref("events", lazy=True),
        cascade="save-update",
    )