# backend/models/event_albums.py
from extensions import db

# Many-to-many link between Event and Album
event_albums = db.Table(
    "event_albums",
    db.Column("event_id", db.Integer, db.ForeignKey("event.id", ondelete="CASCADE"), primary_key=True),
    db.Column("album_id", db.Integer, db.ForeignKey("album.id", ondelete="CASCADE"), primary_key=True),

    # (Optional) helpful indexes — PK already indexes both, but explicit idx can aid some backends
    db.Index("ix_event_albums_event", "event_id"),
    db.Index("ix_event_albums_album", "album_id"),
)
