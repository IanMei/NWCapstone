# backend/routes/comments.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.photo import Photo
from models.comment import Comment
from models.user import User

comments_bp = Blueprint("comments", __name__)

def _uid():
    """Coerce JWT identity to int when possible (you set identity as str)."""
    uid = get_jwt_identity()
    try:
        return int(uid)
    except (TypeError, ValueError):
        return uid


# -----------------------------
# Photo comments
# -----------------------------

# GET /api/photos/<photo_id>/comments
@comments_bp.route("/photos/<int:photo_id>/comments", methods=["GET"])
@jwt_required()
def get_photo_comments(photo_id):
    # 404 if photo does not exist
    _ = Photo.query.get_or_404(photo_id)

    comments = (
        Comment.query
        .filter_by(photo_id=photo_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    result = [
        {
            "id": c.id,
            "content": c.content,
            "author": c.user.full_name if c.user else "Unknown",
            "created_at": c.created_at.isoformat(),
        }
        for c in comments
    ]
    return jsonify({"comments": result}), 200


# POST /api/photos/<photo_id>/comments
@comments_bp.route("/photos/<int:photo_id>/comments", methods=["POST"])
@jwt_required()
def post_photo_comment(photo_id):
    user_id = _uid()

    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"msg": "Content is required"}), 400

    photo = Photo.query.get(photo_id)
    if not photo:
        return jsonify({"msg": "Photo not found"}), 404

    user = User.query.get(user_id)

    comment = Comment(
        content=content,
        user_id=user_id,
        photo_id=photo.id,
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "comment": {
            "id": comment.id,
            "content": comment.content,
            "author": user.full_name if user else "Unknown",
            "created_at": comment.created_at.isoformat(),
        }
    }), 201


# DELETE /api/photos/<photo_id>/comments/<comment_id>
@comments_bp.route("/photos/<int:photo_id>/comments/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete_photo_comment(photo_id, comment_id):
    """Delete a specific comment on a photo. Only the author can delete."""
    user_id = _uid()

    # Ensure the comment exists and belongs to this photo
    comment = Comment.query.filter_by(id=comment_id, photo_id=photo_id).first()
    if not comment:
        return jsonify({"msg": "Comment not found"}), 404

    # Authorization: only the author can delete their comment
    if str(comment.user_id) != str(user_id):
        return jsonify({"msg": "Not authorized to delete this comment"}), 403

    db.session.delete(comment)
    db.session.commit()
    return jsonify({"msg": "Comment deleted", "id": comment_id}), 200


# -------------------------------------------------------------------------
# NOTE:
# If/when you add album/event comments, you can mirror the three endpoints:
#   /api/albums/<album_id>/comments           [GET, POST]
#   /api/albums/<album_id>/comments/<id>      [DELETE]
#   /api/events/<event_id>/comments           [GET, POST]
#   /api/events/<event_id>/comments/<id>      [DELETE]
# and point them to the corresponding fields on Comment (album_id/event_id).
# -------------------------------------------------------------------------
