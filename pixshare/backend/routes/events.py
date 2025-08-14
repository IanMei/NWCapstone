# backend/routes/events.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, delete, insert, update
from sqlalchemy.exc import IntegrityError
from extensions import db
from models.event import Event
from models.album import Album
from models.event_albums import event_albums as EventAlbum
from models.event_participant import EventParticipant
from models.share import Share
from routes.shares import can_contribute_event
import secrets

events_bp = Blueprint("events", __name__)

# ---------- Helpers ----------

def _new_share_id():
    return secrets.token_urlsafe(12)

def _uid():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return get_jwt_identity()

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

def _is_participant(user_id: int, event_id: int) -> bool:
    return (
        db.session.query(EventParticipant.id)
        .filter_by(user_id=user_id, event_id=event_id)
        .first()
        is not None
    )

def _serialize_event(ev, participant_row: EventParticipant | None = None):
    """Return event payload with attached albums; include shareTokenForUploads only for participants."""
    ev_col, al_col = _ea_cols()
    rows = db.session.execute(
        select(Album.id, Album.title)
        .select_from(Album)
        .join(EventAlbum, al_col == Album.id)
        .where(ev_col == ev.id)
    ).all()
    albums = [{"id": a_id, "name": a_title} for (a_id, a_title) in rows]
    out = {
        "id": ev.id,
        "name": ev.title,
        "description": ev.description,
        "date": ev.date.isoformat() if getattr(ev, "date", None) else None,
        "shareId": ev.share_id,
        "albums": albums,
    }
    if participant_row is not None:
        # frontends can append ?t=<shareTokenForUploads> to /uploads URLs if not the owner
        out["shareTokenForUploads"] = participant_row.share_token
        out["role"] = "participant"
    else:
        out["role"] = "owner"
    return out

# ---------- Routes ----------

@events_bp.route("/events", methods=["GET"])
@jwt_required(locations=["headers"])
def list_events():
    """
    Return union of:
      - events owned by the user
      - events where the user is a participant (collaborator)
    """
    user_id = _uid()

    owned = Event.query.filter_by(user_id=user_id).all()

    member_events = (
        db.session.query(Event, EventParticipant.share_token)
        .join(EventParticipant, EventParticipant.event_id == Event.id)
        .filter(EventParticipant.user_id == user_id)
        .all()
    )

    # merge by id with role info
    by_id: dict[int, dict] = {}
    for e in owned:
        by_id[e.id] = {"id": e.id, "name": e.title, "shareId": e.share_id, "role": "owner"}

    for e, share_token in member_events:
        if e.id not in by_id:  # if you also own it, prefer 'owner'
            by_id[e.id] = {
                "id": e.id,
                "name": e.title,
                "shareId": e.share_id,
                "role": "participant",
                "shareTokenForUploads": share_token,
            }

    # You may have a created_at column; sort desc if present
    events = list(by_id.values())
    return jsonify({"events": events}), 200

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
    return jsonify({"event": _serialize_event(ev)}), 201

@events_bp.route("/events/<int:event_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def delete_event(event_id):
    """
    Owners: delete the event (and all links/memberships)
    Participants: leave the event (delete their participant row)
    """
    user_id = _uid()
    ev = Event.query.filter_by(id=event_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    if str(ev.user_id) == str(user_id):
        _ea_delete_pairs(ev.id)
        db.session.query(EventParticipant).filter_by(event_id=ev.id).delete()
        db.session.delete(ev)
        db.session.commit()
        return jsonify({"msg": "Event deleted"}), 200

    # participant: leave
    res = db.session.query(EventParticipant).filter_by(event_id=ev.id, user_id=user_id).delete()
    db.session.commit()
    if res:
        return jsonify({"msg": "Left event"}), 200
    return jsonify({"msg": "Not a member"}), 404

@events_bp.route("/events/<int:event_id>", methods=["GET"])
@jwt_required(locations=["headers"])
def get_event(event_id):
    user_id = _uid()
    ev = Event.query.filter_by(id=event_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    if str(ev.user_id) == str(user_id):
        return jsonify({"event": _serialize_event(ev)}), 200

    pr = EventParticipant.query.filter_by(event_id=ev.id, user_id=user_id).first()
    if pr:
        return jsonify({"event": _serialize_event(ev, participant_row=pr)}), 200

    return jsonify({"msg": "Not authorized to view this event"}), 403

@events_bp.route("/events/<int:event_id>/albums", methods=["POST"])
@jwt_required(locations=["headers"])
def add_albums_to_event(event_id):
    user_id = _uid()
    token = (request.args.get("t") or "").strip()

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

    # Normalize incoming IDs to integers
    try:
        album_ids = [int(a) for a in album_ids]
    except (TypeError, ValueError):
        return jsonify({"msg": "album_ids must be integers"}), 400

    # ✅ Only allow adding albums owned by the caller
    owned_ids = set(
        db.session.execute(
            select(Album.id).where(Album.id.in_(album_ids), Album.user_id == user_id)
        ).scalars().all()
    )
    if not owned_ids:
        return jsonify({"msg": "No valid albums to add"}), 400

    ev_col, al_col = _ea_cols()

    # Find which of those are already attached
    existing = set(
        db.session.execute(
            select(al_col).where(ev_col == ev.id, al_col.in_(owned_ids))
        ).scalars().all()
    )

    to_add = [{"event_id": ev.id, "album_id": aid} for aid in owned_ids if aid not in existing]
    if to_add:
        _ea_insert_many(to_add)
        db.session.commit()

    return jsonify({"event": _serialize_event(ev)}), 200

@events_bp.route("/events/<int:event_id>/albums/<int:album_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def remove_album_from_event(event_id, album_id):
    """
    Only the event owner can remove albums.
    """
    user_id = _uid()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found or not owned by you"}), 404

    if not Album.query.filter_by(id=album_id).first():
        return jsonify({"msg": "Album not found"}), 404

    _ea_delete_pairs(event_id, album_id)
    db.session.commit()
    return jsonify({"msg": "Removed"}), 200

# ---------- Join via shared link (creates EventParticipant) ----------

@events_bp.route("/events/from-shared", methods=["POST"])
@jwt_required(locations=["headers"])
def add_event_from_shared_qs():
    """
    POST /api/events/from-shared?t=<share_token>
    -> creates (or updates) EventParticipant with share_token for the current user
    """
    user_id = _uid()
    token = (request.args.get("t") or "").strip()
    if not token:
        return jsonify({"msg": "Missing share token"}), 400

    s = Share.query.filter_by(token=token).first()
    if not s or not s.event_id:
        return jsonify({"msg": "Invalid or expired link"}), 404

    ev = Event.query.get(s.event_id)
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    if str(ev.user_id) == str(user_id):
        return jsonify({"msg": "You already own this event", "event": _serialize_event(ev)}), 200

    # upsert participant (store/refresh the share token)
    pr = EventParticipant.query.filter_by(event_id=ev.id, user_id=user_id).first()
    if pr:
        if pr.share_token != token:
            pr.share_token = token
            db.session.commit()
        created = False
    else:
        pr = EventParticipant(event_id=ev.id, user_id=user_id, share_token=token)
        db.session.add(pr)
        try:
            db.session.commit()
            created = True
        except IntegrityError:
            db.session.rollback()
            created = False

    return jsonify({
        "msg": "Joined event" if created else "Already a member",
        "event": _serialize_event(ev, participant_row=pr)
    }), 201 if created else 200

# Optional: legacy path that accepts a path segment as token or old share_id
@events_bp.route("/events/from-shared/<share_or_token>", methods=["POST"])
@jwt_required(locations=["headers"])
def add_event_from_shared_path(share_or_token):
    user_id = _uid()

    s = Share.query.filter_by(token=share_or_token).first()
    if s and s.event_id:
        ev = Event.query.get(s.event_id)
        token = s.token
    else:
        ev = Event.query.filter_by(share_id=share_or_token).first()
        token = share_or_token

    if not ev:
        return jsonify({"msg": "Shared event not found"}), 404

    if str(ev.user_id) == str(user_id):
        return jsonify({"msg": "You already own this event", "event": _serialize_event(ev)}), 200

    pr = EventParticipant.query.filter_by(event_id=ev.id, user_id=user_id).first()
    if pr:
        if pr.share_token != token:
            pr.share_token = token
            db.session.commit()
        created = False
    else:
        pr = EventParticipant(event_id=ev.id, user_id=user_id, share_token=token)
        db.session.add(pr)
        try:
            db.session.commit()
            created = True
        except IntegrityError:
            db.session.rollback()
            created = False

    return jsonify({
        "msg": "Joined event" if created else "Already a member",
        "event": _serialize_event(ev, participant_row=pr)
    }), 201 if created else 200
