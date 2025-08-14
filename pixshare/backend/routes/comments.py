# backend/routes/comments.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, exists
from extensions import db

# Models
from models.comment import Comment
from models.photo import Photo
from models.album import Album
from models.share import Share
from models.event import Event
from models.event_albums import event_albums as EventAlbum
from models.event_participant import EventParticipant
from models.user import User  # used for display name if available

comments_bp = Blueprint("comments", __name__)

# -------------------- Helpers --------------------

def _serialize_comment(c: Comment):
    # Try to provide a friendly author label without needing a DB column
    author_label = "Guest"
    try:
        # Prefer joined relationship if present
        u = getattr(c, "user", None)
        if u:
            author_label = getattr(u, "name", None) or getattr(u, "username", None) or getattr(u, "email", None) or f"User {u.id}"
        elif getattr(c, "user_id", None):
            # Fallback without eager relationship
            author_label = f"User {c.user_id}"
    except Exception:
        if getattr(c, "user_id", None):
            author_label = f"User {c.user_id}"

    return {
        "id": c.id,
        "content": c.content,
        "author": author_label,
        "created_at": c.created_at.isoformat() if getattr(c, "created_at", None) else None,
    }

def _photo_and_album(photo_id: int):
    p = Photo.query.get(photo_id)
    if not p:
        return None, None
    a = Album.query.get(getattr(p, "album_id", None))
    return p, a

def _album_ids_for_event(event_id: int):
    if hasattr(EventAlbum, "c"):
        rows = db.session.execute(
            select(EventAlbum.c.album_id).where(EventAlbum.c.event_id == event_id)
        ).all()
        return {r[0] for r in rows}
    else:
        ev = Event.query.get(event_id)
        if not ev:
            return set()
        try:
            return {a.id for a in getattr(ev, "albums", [])}
        except Exception:
            return set()

def _share_allows_photo(token: str, photo_id: int) -> tuple[bool, bool]:
    """
    Returns (allowed, can_comment) for a given share token and target photo.
    """
    if not token:
        return (False, False)

    s: Share | None = Share.query.filter_by(token=token).first()
    if not s:
        return (False, False)

    photo, album = _photo_and_album(photo_id)
    if not photo or not album:
        return (False, False)

    # Photo share: exact match
    if getattr(s, "photo_id", None):
        return (photo.id == s.photo_id, bool(getattr(s, "can_comment", False)))

    # Album share: photo must be in this album
    if getattr(s, "album_id", None):
        return (getattr(photo, "album_id", None) == s.album_id, bool(getattr(s, "can_comment", False)))

    # Event share: photo's album must be one of the event albums
    if getattr(s, "event_id", None):
        allowed_albums = _album_ids_for_event(s.event_id)
        return (getattr(photo, "album_id", None) in allowed_albums, bool(getattr(s, "can_comment", False)))

    return (False, False)

def _user_can_read_photo(uid, photo_id: int) -> bool:
    """
    Owner or event participant can read via JWT.
    """
    _, album = _photo_and_album(photo_id)
    if not album:
        return False
    if uid and str(album.user_id) == str(uid):
        return True
    if not uid:
        return False

    # participant on any event that includes this album
    if hasattr(EventAlbum, "c"):
        ev_ids_subq = (
            db.session.query(Event.id)
            .join(EventAlbum, EventAlbum.c.event_id == Event.id)
            .filter(EventAlbum.c.album_id == album.id)
            .subquery()
        )
    else:
        ev_ids_subq = (
            db.session.query(Event.id)
            .join(EventAlbum, EventAlbum.event_id == Event.id)
            .filter(EventAlbum.album_id == album.id)
            .subquery()
        )

    return db.session.query(
        exists().where((EventParticipant.event_id.in_(select(ev_ids_subq.c.id))) & (EventParticipant.user_id == uid))
    ).scalar()

def _user_can_write_photo(uid, photo_id: int) -> bool:
    # same rule as read for now
    return _user_can_read_photo(uid, photo_id)

# -------------------- Routes --------------------

@comments_bp.route("/photos/<int:photo_id>/comments", methods=["GET"])
@jwt_required(optional=True, locations=["headers"])
def list_comments(photo_id):
    """
    Read comments either:
      - via header JWT (owner/participant), or
      - via share token ?t=<token> (public).
    """
    token = (request.args.get("t") or "").strip()
    uid = get_jwt_identity()

    allowed = False
    if token:
        allowed, _ = _share_allows_photo(token, photo_id)
    else:
        allowed = _user_can_read_photo(uid, photo_id)

    if not allowed:
        return jsonify({"msg": "Not authorized to view comments"}), 401

    rows = (
        Comment.query.filter_by(photo_id=photo_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return jsonify({"comments": [_serialize_comment(c) for c in rows]}), 200


@comments_bp.route("/photos/<int:photo_id>/comments", methods=["POST"])
@jwt_required(optional=True, locations=["headers"])
def create_comment(photo_id):
    """
    Create a comment either:
      - via JWT (owner/participant), or
      - via share token ?t=<token> if that share has can_comment=True.
    """
    token = (request.args.get("t") or "").strip()
    uid = get_jwt_identity()  # may be None if optional and unauthenticated

    data = request.get_json() or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"msg": "Content required"}), 400

    # Check if user_id is nullable to decide whether anonymous shared comments are allowed at DB level
    user_nullable = True
    try:
        user_nullable = Comment.__table__.c.user_id.nullable  # type: ignore[attr-defined]
    except Exception:
        user_nullable = True  # assume nullable if we can't inspect

    if token:
        allowed, can_comment = _share_allows_photo(token, photo_id)
        if not allowed:
            return jsonify({"msg": "Invalid or unauthorized share token"}), 401
        if not can_comment:
            return jsonify({"msg": "Commenting disabled for this share link"}), 403
        if not uid and not user_nullable:
            return jsonify({"msg": "Login required to comment on this share"}), 401

        comment = Comment(
            photo_id=photo_id,
            content=content,
            user_id=uid if uid else None,
        )
        db.session.add(comment)
        db.session.commit()
        return jsonify({"comment": _serialize_comment(comment)}), 201

    # JWT path (no share token)
    if not uid:
        return jsonify({"msg": "Authentication required"}), 401
    if not _user_can_write_photo(uid, photo_id):
        return jsonify({"msg": "Not authorized"}), 403

    comment = Comment(
        photo_id=photo_id,
        content=content,
        user_id=uid,
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({"comment": _serialize_comment(comment)}), 201


@comments_bp.route("/photos/<int:photo_id>/comments/<int:comment_id>", methods=["DELETE"])
@jwt_required(locations=["headers"])
def delete_comment(photo_id, comment_id):
    uid = get_jwt_identity()
    c = Comment.query.filter_by(id=comment_id, photo_id=photo_id).first()
    if not c:
        return jsonify({"msg": "Comment not found"}), 404

    # Allow delete by photo owner only (tight policy)
    photo, album = _photo_and_album(photo_id)
    if not album or str(album.user_id) != str(uid):
        return jsonify({"msg": "Not authorized"}), 403

    db.session.delete(c)
    db.session.commit()
    return jsonify({"msg": "Deleted"}), 200
