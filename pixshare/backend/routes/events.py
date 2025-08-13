# backend/routes/events.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, delete, insert
from extensions import db
from models.event import Event
from models.album import Album
from models.event_albums import event_albums as EventAlbum
from routes.shares import can_contribute_event
import secrets

events_bp = Blueprint("events", __name__)

def _new_share_id():
    return secrets.token_urlsafe(12)

def _uid():
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid

def _ea_cols():
    if hasattr(EventAlbum, "c"):
        return EventAlbum.c.event_id, EventAlbum.c.album_id
    return EventAlbum.event_id, EventAlbum.album_id

def _ea_insert_many(values):
    if hasattr(EventAlbum, "c"):
        db.session.execute(insert(EventAlbum), values)
    else:
        objs = [EventAlbum(**v) for v in values]
        db.session.bulk_save_objects(objs)

def _ea_delete_pairs(event_id, album_id=None):
    ev_col, al_col = _ea_cols()
    if hasattr(EventAlbum, "c"):
        cond = (ev_col == event_id)
        if album_id is not None:
            cond = cond & (al_col == album_id)
        db.session.execute(delete(EventAlbum).where(cond))
    else:
        q = db.session.query(EventAlbum).filter(ev_col == event_id)
        if album_id is not None:
            q = q.filter(al_col == album_id)
        q.delete(synchronize_session=False)

@events_bp.route("/events", methods=["GET"])
@jwt_required(locations=["headers"])
def list_events():
    user_id = _uid()
    events = Event.query.filter_by(user_id=user_id).order_by(Event.created_at.desc()).all()
    return jsonify({
        "events": [{"id": e.id, "name": e.title, "shareId": e.share_id} for e in events]
    }), 200

@events_bp.route("/events", methods=["POST"])
@jwt_required(locations=["headers"])
def create_event():
    user_id = _uid()
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

@events_bp.route("/events/<int:event_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def delete_event(event_id):
    user_id = _uid()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    _ea_delete_pairs(ev.id, None)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({"msg": "Event deleted"}), 200

@events_bp.route("/events/<int:event_id>", methods=["GET"])
@jwt_required(locations=["headers"])
def get_event(event_id):
    user_id = _uid()
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

@events_bp.route("/events/<int:event_id>/albums", methods=["POST"])
@jwt_required(locations=["headers"])
def add_albums_to_event(event_id):
    user_id = _uid()
    # owner OR collaborator via share token
    token = request.args.get("t", "").strip()  # <- accept token in query

    ev = Event.query.filter_by(id=event_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    is_owner = str(ev.user_id) == str(user_id)
    is_collab = can_contribute_event(token, ev.id)

    if not (is_owner or is_collab):
        return jsonify({"msg": "Not authorized for this event"}), 403

    data = request.get_json() or {}
    album_ids = data.get("album_ids") or []
    if not isinstance(album_ids, list) or not album_ids:
        return jsonify({"msg": "album_ids must be a non-empty list"}), 400

    # ✅ Only allow adding albums owned by the caller (never someone else's)
    owned_ids = {
        a.id for a in Album.query
            .filter(Album.id.in_(album_ids), Album.user_id == user_id)
            .all()
    }
    if not owned_ids:
        return jsonify({"msg": "No valid albums to add"}), 400

    ev_col, al_col = _ea_cols()

    existing = {
        row[0]
        for row in db.session.execute(
            select(al_col).where(ev_col == ev.id, al_col.in_(owned_ids))
        ).all()
    }

    to_add = [{"event_id": ev.id, "album_id": aid}
              for aid in owned_ids if aid not in existing]

    if to_add:
        _ea_insert_many(to_add)
        db.session.commit()

    # Return the updated event payload
    return get_event(event_id)

@events_bp.route("/events/<int:event_id>/albums/<int:album_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def remove_album_from_event(event_id, album_id):
    user_id = _uid()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    if not Album.query.filter_by(id=album_id, user_id=user_id).first():
        return jsonify({"msg": "Album not found"}), 404

    _ea_delete_pairs(event_id, album_id)
    db.session.commit()
    return jsonify({"msg": "Removed"}), 200
