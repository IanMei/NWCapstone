# backend/models/event_participant.py
from extensions import db

class EventParticipant(db.Model):
    __tablename__ = "event_participant"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    # store the share token this user used to join (lets us authorize /uploads)
    share_token = db.Column(db.String(255), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("event_id", "user_id", name="uq_event_user"),
        db.Index("ix_event_participant_event", "event_id"),
        db.Index("ix_event_participant_user", "user_id"),
    )

    event = db.relationship("Event", backref="participants")
