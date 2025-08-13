import os
from flask import Flask, request, abort, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.share import Share
from models.photo import Photo
from models.album import Album          
from models.event import Event

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.albums import albums_bp
from routes.photos import photos_bp
from routes.events import events_bp
from routes.shares import shares_bp
from routes.comments import comments_bp

app = Flask(__name__)
# If using Vite proxy (same-origin), CORS is optional. Safe to leave on:
CORS(
    app,
    supports_credentials=True,
    resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
)

app.config.from_object(Config)

UPLOAD_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))

# Initialize extensions
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)

try:
    from models.event_albums import event_albums  # db.Table(...)
except Exception:
    event_albums = None

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(albums_bp, url_prefix="/api")
app.register_blueprint(photos_bp, url_prefix="/api")
app.register_blueprint(events_bp, url_prefix="/api")
app.register_blueprint(shares_bp, url_prefix="/api")
app.register_blueprint(comments_bp, url_prefix="/api")

@app.route("/uploads/<path:filename>")
@jwt_required(optional=True, locations=["headers", "cookies"])
def serve_uploads(filename):
    """
    Access rules:
      - Public share token via query ?t=<token>:
         * album token: allow any file under photos/<user_id>/<album_id>/*
         * photo token: allow only the exact shared photo file
         * event token: allow any file whose album_id is attached to the event
      - Owner with JWT (no token): may access photos/<user_id>/** only
    """
    token = request.args.get("t")

    # Expected path structure: photos/<user_id>/<album_id>/rest/of/file
    parts = filename.split("/")
    # Minimal sanity check
    if len(parts) < 3 or parts[0] != "photos":
        abort(403)

    try:
        req_user_id = int(parts[1])
        req_album_id = int(parts[2])
    except ValueError:
        abort(403)

    if token:
        s = Share.query.filter_by(token=token).first()
        if not s:
            abort(404)

        # --- Album share: allow any file under the shared album folder
        if s.album_id:
            if req_album_id == s.album_id:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # --- Photo share: allow only the exact file that matches the shared photo
        if s.photo_id:
            p = Photo.query.get(s.photo_id)
            if not p:
                abort(404)
            if p.filepath == filename:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # --- Event share: allow files if their album_id belongs to this event
        if s.event_id:
            # Get album ids attached to the event
            if event_albums is not None:
                # Using association table
                rows = (
                    db.session.query(Album.id)
                    .join(event_albums, event_albums.c.album_id == Album.id)
                    .filter(event_albums.c.event_id == s.event_id)
                    .all()
                )
                event_album_ids = {row[0] for row in rows}
            else:
                # Fallback to Event.albums relationship
                ev = Event.query.get(s.event_id)
                if not ev:
                    abort(404)
                try:
                    event_album_ids = {a.id for a in getattr(ev, "albums", [])}
                except Exception:
                    event_album_ids = set()

            if req_album_id in event_album_ids:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)

            abort(403)

        # Unknown share type
        abort(403)

    # No public token -> require owner JWT; owners can fetch only their own files
    uid = get_jwt_identity()
    if not uid:
        abort(401)
    if str(req_user_id) == str(uid):
        return send_from_directory(UPLOAD_ROOT, filename, conditional=True)

    abort(403)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5172, debug=True)
