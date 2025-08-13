# backend/decorators.py
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models.share import Share
from models.event import Event
from models.album import Album
from models.photo import Photo
from extensions import db

def event_share_or_owner_required(fn):
    """
    Allows access if:
    - user is the event owner, OR
    - request has a valid share token for that event
    This will be useful for collaborative editing via share links.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        event_id = kwargs.get("event_id")
        token = request.args.get("share_token")

        # First, check if JWT auth present and owner
        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            pass

        user_id = None
        try:
            user_id = get_jwt_identity()
        except Exception:
            pass

        if user_id:
            ev = Event.query.get(event_id)
            if ev and ev.user_id == user_id:
                return fn(*args, **kwargs)

        # If not owner, check if share token is valid
        if token:
            s = Share.query.filter_by(token=token, event_id=event_id).first()
            if s:
                # In future: check can_edit/can_comment here
                return fn(*args, **kwargs)

        return jsonify({"msg": "Not authorized"}), 403

    return wrapper
