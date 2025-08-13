# backend/utils/decorators.py
from __future__ import annotations

from functools import wraps
from typing import Callable, Optional, Literal

from flask import g, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from extensions import db  # not used directly, but handy if you extend
from models.share import Share
from models.album import Album
from models.photo import Photo
from models.event import Event


ShareKind = Literal["album", "photo", "event"]


def _find_share_from_request() -> Optional[Share]:
    """
    Pull a share token from either query param (?t=TOKEN) or header (X-Share-Token).
    Return the Share row if found, else None.
    """
    token = request.args.get("t") or request.headers.get("X-Share-Token")
    if not token:
        return None
    return Share.query.filter_by(token=token).first()


def _detect_share_kind(s: Share) -> Optional[ShareKind]:
    if s.album_id:
        return "album"
    if s.photo_id:
        return "photo"
    if s.event_id:
        return "event"
    return None


def allow_jwt_or_share(
    *,
    expected_kind: Optional[ShareKind] = None,
    require_permission: Optional[Literal["can_comment", "can_upload"]] = None,
) -> Callable:
    """
    Decorator that allows access with either:
      - a valid JWT (owner), OR
      - a valid share token (guest)

    Side effects:
      - If JWT path: sets g.user_id, g.actor={"type":"user","user_id":...}, g.share=None
      - If share path: sets g.user_id=None, g.actor={"type":"guest","share_token":...}, g.share=<Share>

    Args:
      expected_kind: optionally enforce that the share points to an "album" | "photo" | "event".
      require_permission: if set, and caller is guest, ensure the share has that boolean True
                          (e.g. "can_comment" or "can_upload")
    """
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Try share first
            share = _find_share_from_request()
            if share:
                # Validate kind, if requested
                kind = _detect_share_kind(share)
                if expected_kind and kind != expected_kind:
                    return jsonify({"msg": "This link is not valid for this resource."}), 403

                # Enforce permission for guest if asked
                if require_permission is not None:
                    allowed = getattr(share, require_permission, False)
                    if not allowed:
                        return jsonify({"msg": f"Sharing does not allow {require_permission.replace('_', ' ')}."}), 403

                # Stash into g
                g.user_id = None
                g.share = share
                g.actor = {"type": "guest", "share_token": share.token, "kind": kind}
                return fn(*args, **kwargs)

            # Otherwise require JWT (owner)
            try:
                verify_jwt_in_request(optional=False)
            except Exception:
                return jsonify({"msg": 'Missing JWT or share token (provide header "Authorization: Bearer <token>" OR "?t=<shareToken>")'}), 401

            uid = get_jwt_identity()
            g.user_id = uid
            g.share = None
            g.actor = {"type": "user", "user_id": uid}
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_share_permission(permission: Literal["can_comment", "can_upload"]) -> Callable:
    """
    If the caller is a guest (share token), enforce that the Share row has the given boolean permission.
    If the caller is a JWT user (owner), skip checks.
    Use this in addition to allow_jwt_or_share when only certain actions should be allowed for guests.
    """
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # If we have g.share, caller is guest
            s: Optional[Share] = getattr(g, "share", None)
            if s is not None:
                if not getattr(s, permission, False):
                    return jsonify({"msg": f"Share does not allow {permission.replace('_', ' ')}."}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_share_kind(kind: ShareKind) -> Callable:
    """
    Ensure that the current guest share (if any) is for the specified kind.
    No-op for JWT users.
    """
    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            s: Optional[Share] = getattr(g, "share", None)
            if s is not None:
                actual = _detect_share_kind(s)
                if actual != kind:
                    return jsonify({"msg": "This link is not valid for this resource."}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
