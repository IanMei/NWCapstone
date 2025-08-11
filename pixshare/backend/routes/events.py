# backend/routes/events.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.event import Event
from models.share import Share
import secrets
from datetime import date

events_bp = Blueprint("events", __name__)

# 🔹 Utility — Generate unique short share token
def _new_share_id():
    return secrets.token_urlsafe(12)

# 📌 GET /events → List all events for current user
@events_bp.route("/events", methods=["GET"])
@jwt_required()
def list_events():
    user_id = get_jwt_identity()
    events = (
        Event.query
        .filter_by(user_id=user_id)
        .order_by(Event.created_at.desc())
        .all()
    )
    return jsonify({
        "events": [
            {"id": e.id, "name": e.title, "shareId": e.share_id}
            for e in events
        ]
    }), 200

# 📌 GET /events/<id> → Get single event details
@events_bp.route("/events/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):
    user_id = get_jwt_identity()
    e = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not e:
        return jsonify({"msg": "Event not found"}), 404
    return jsonify({
        "id": e.id,
        "name": e.title,
        "description": e.description,
        "date": e.date.isoformat() if e.date else None,
        "shareId": e.share_id,
        "created_at": e.created_at.isoformat(),
    }), 200

# 📌 POST /events → Create new event
@events_bp.route("/events", methods=["POST"])
@jwt_required()
def create_event():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"msg": "Event name is required"}), 400

    # ensure unique share_id
    share_id = _new_share_id()
    while Event.query.filter_by(share_id=share_id).first():
        share_id = _new_share_id()

    ev = Event(
        title=name,
        description=data.get("description"),
        date=None,  # or date.today()
        share_id=share_id,
        user_id=user_id,
    )
    db.session.add(ev)
    db.session.flush()  # need ev.id before creating Share

    # create initial share row
    s = Share(event_id=ev.id, token=share_id, can_comment=False)
    db.session.add(s)

    db.session.commit()

    return jsonify({"event": {"id": ev.id, "name": ev.title, "shareId": ev.share_id}}), 201

# 📌 PUT /events/<id> → Update event details
@events_bp.route("/events/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    data = request.get_json() or {}
    title = (data.get("name") or data.get("title") or "").strip()
    if title:
        ev.title = title
    if "description" in data:
        ev.description = data.get("description")
    if "date" in data and data["date"]:
        try:
            y, m, d = map(int, str(data["date"]).split("-"))
            ev.date = date(y, m, d)
        except Exception:
            return jsonify({"msg": "Invalid date format, expected YYYY-MM-DD"}), 400

    db.session.commit()
    return jsonify({
        "event": {
            "id": ev.id,
            "name": ev.title,
            "description": ev.description,
            "date": ev.date.isoformat() if ev.date else None,
            "shareId": ev.share_id
        }
    }), 200

# 📌 DELETE /events/<id> → Delete event
@events_bp.route("/events/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    # also delete related shares
    Share.query.filter_by(event_id=ev.id).delete()
    db.session.delete(ev)
    db.session.commit()
    return jsonify({"msg": "Event deleted"}), 200

# 📌 POST /events/<id>/rotate-link → Rotate public share token
@events_bp.route("/events/<int:event_id>/rotate-link", methods=["POST"])
@jwt_required()
def rotate_event_link(event_id):
    user_id = get_jwt_identity()
    ev = Event.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        return jsonify({"msg": "Event not found"}), 404

    body = request.get_json() or {}
    revoke_old = bool(body.get("revoke_old", False))

    new_token = _new_share_id()
    while Event.query.filter_by(share_id=new_token).first():
        new_token = _new_share_id()

    if revoke_old:
        Share.query.filter_by(event_id=ev.id).delete()

    # create new share record & update event
    s = Share(event_id=ev.id, token=new_token, can_comment=False)
    db.session.add(s)
    ev.share_id = new_token

    db.session.commit()
    return jsonify({"shareId": new_token, "share": {"id": s.id, "token": new_token}}), 201
