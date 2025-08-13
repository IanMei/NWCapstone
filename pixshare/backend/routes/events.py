# backend/routes/events.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, delete, insert
from extensions import db
from models.event import Event
from models.album import Album
from models.event_albums import event_albums as EventAlbum  # can be a db.Table OR a mapped class
import secrets

events_bp = Blueprint("events", __name__)

def _new_share_id():
    return secrets.token_urlsafe(12)

# ---- Helpers to abstract over Table vs ORM class -----------------------------

def _ea_cols():
    """
    Return (event_id_col, album_id_col) that can be used in SQL expressions
    whether EventAlbum is a Table (has .c) or a mapped class (has attributes).
    """
    if hasattr(EventAlbum, "c"):  # Table
        return EventAlbum.c.event_id, EventAlbum.c.album_id
    # ORM class
    return EventAlbum.event_id, EventAlbum.album_id

def _ea_insert_many(values):
    """
    Insert many link rows regardless of Table vs ORM class.
    values is a list of dicts: {"event_id": ..., "album_id": ...}
    """
    if hasattr(EventAlbum, "c"):  # Table
        db.session.execute(insert(EventAlbum), values)
    else:
        objs = [EventAlbum(**v) for v in values]
        db.session.bulk_save_objects(objs)

def _ea_delete_pairs(event_id, album_id=None):
    """Delete links. If album_id is None, delete all for the event."""
    ev_col, al_col = _ea_cols()
    if hasattr(EventAlbum, "c"):  # Table
        cond = (ev_col == event_id)
        if album_id is not None:
            cond = cond & (al_col == album_id)
        db.session.execute(delete(EventAlbum).where(cond))
    else:
        q = db.session.query(EventAlbum).filter(ev_col == event_id)
        if album_id is not None:
            q = q.filter(al_col == album_id)
        q.delete(synchronize_session=False)

# -----------------------------------------------------------------------------

# GET /api/events  — list user’s events
@events_bp.route("/events", methods=["GET"])
@jwt_required()
def list_events():
    user_id = get_jwt_identity()
    events = Event.query.filter_by(user_id=user_id).order_by(Event.created_at.desc()).all()
    return jsonify({
        "events": [
            {"id": e.id, "name": e.title, "shareId": e.share_id}
            for e in events
        ]
    }), 200

# POST /api/events — create event
@events_bp.route("/events", methods=["POST"])
@jwt_required()
def create_event():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"msg": "Event name is required"}), 400

    share_id = _new_share_id()
    while Event.query.filter_by(share_id=share_id).first():
        share_id = _new_share_id()

    ev = Event(title=name, description=None, date=None, share_id=share_id, user_id=user_id)
    db.session.add(ev)
    db.session.commit()
    return jsonify({"event": {"id": ev.id, "name": ev.title, "shareId": ev.share_id}}), 201

# DELETE /api/events/:id — delete an event (and its album links)
@events_bp.route("/events/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    _ea_delete_pairs(ev.id, None)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({"msg": "Event deleted"}), 200

# GET /api/events/:id — one event with its albums
@events_bp.route("/events/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    ev_col, al_col = _ea_cols()

    rows = (
        db.session.execute(
            select(Album.id, Album.title)
            .select_from(Album)
            .join(EventAlbum, al_col == Album.id)
            .where(ev_col == ev.id)
        ).all()
    )
    albums = [{"id": a_id, "name": a_title} for (a_id, a_title) in rows]

    return jsonify({
        "event": {
            "id": ev.id,
            "name": ev.title,
            "description": ev.description,
            "date": ev.date.isoformat() if getattr(ev, "date", None) else None,
            "shareId": ev.share_id,
            "albums": albums,
        }
    }), 200

# POST /api/events/:id/albums — add multiple albums to event
@events_bp.route("/events/<int:event_id>/albums", methods=["POST"])
@jwt_required()
def add_albums_to_event(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    data = request.get_json() or {}
    album_ids = data.get("album_ids") or []
    if not isinstance(album_ids, list) or not album_ids:
        return jsonify({"msg": "album_ids must be a non-empty list"}), 400

    # keep only albums owned by user
    owned_ids = {a.id for a in Album.query.filter(Album.id.in_(album_ids), Album.user_id == user_id).all()}
    if not owned_ids:
        return jsonify({"msg": "No valid albums to add"}), 400

    # find existing links to avoid duplicates
    ev_col, al_col = _ea_cols()
    existing = {
        row[0]
        for row in db.session.execute(
            select(al_col).where(ev_col == ev.id, al_col.in_(owned_ids))
        ).all()
    }
    to_add = [{"event_id": ev.id, "album_id": aid} for aid in owned_ids if aid not in existing]
    if to_add:
        _ea_insert_many(to_add)
        db.session.commit()

    return get_event(event_id)

# DELETE /api/events/:id/albums/:album_id — unlink album from event
@events_bp.route("/events/<int:event_id>/albums/<int:album_id>", methods=["DELETE"])
@jwt_required()
def remove_album_from_event(event_id, album_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    # optional: verify ownership of the album
    if not Album.query.filter_by(id=album_id, user_id=user_id).first():
        return jsonify({"msg": "Album not found"}), 404

    _ea_delete_pairs(event_id, album_id)
    db.session.commit()
    return jsonify({"msg": "Removed"}), 200
