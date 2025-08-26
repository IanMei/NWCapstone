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
from models.event_participant import EventParticipant

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.albums import albums_bp
from routes.photos import photos_bp
from routes.events import events_bp
from routes.shares import shares_bp
from routes.comments import comments_bp
from routes.accounts import accounts_bp

app = Flask(__name__)
# If using Vite proxy (same-origin), CORS is optional. Safe to leave on:

try:
    from models.event_albums import event_albums  # db.Table(...)
except Exception:
    event_albums = None

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

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(albums_bp, url_prefix="/api")
app.register_blueprint(photos_bp, url_prefix="/api")
app.register_blueprint(events_bp, url_prefix="/api")
app.register_blueprint(shares_bp, url_prefix="/api")
app.register_blueprint(comments_bp, url_prefix="/api")
app.register_blueprint(accounts_bp, url_prefix="/api")

@app.route("/uploads/<path:filename>")
@jwt_required(optional=True, locations=["headers", "query_string"])
def serve_uploads(filename):
    """
    Access rules:
      - Public share token via query ?t=<token> (or ?token=):
         * album token: allow any file under photos/<user_id>/<album_id>/*
         * photo token: allow only the exact shared photo file
         * event token: allow any file whose album_id is attached to the event
      - Owner/participant with JWT (via Authorization header OR ?a=<JWT>):
         * owner may access photos/<owner_id>/**
         * participant may access files of albums tied to events they joined
    """
    # Always require 'photos/<user>/<album>/...' path
    parts = filename.split("/")
    if len(parts) < 3 or parts[0] != "photos":
        abort(403)

    # Parse path
    try:
        req_user_id = int(parts[1])
        req_album_id = int(parts[2])
    except (TypeError, ValueError):
        abort(403)

    # 1) PUBLIC SHARE via ?t=
    token = (request.args.get("t") or request.args.get("token") or "").strip()
    if token:
        s = Share.query.filter_by(token=token).first()
        if not s:
            abort(404)

        # Album share: any file within that album
        if s.album_id:
            if req_album_id == s.album_id:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # Photo share: only the exact shared file
        if s.photo_id:
            p = Photo.query.get(s.photo_id)
            if not p:
                abort(404)
            if p.filepath == filename:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # Event share: any file from an album attached to the event
        if s.event_id:
            if event_albums is not None:
                rows = (
                    db.session.query(Album.id)
                    .join(event_albums, event_albums.c.album_id == Album.id)
                    .filter(event_albums.c.event_id == s.event_id)
                    .all()
                )
                event_album_ids = {row[0] for row in rows}
            else:
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

    # 2) OWNER / PARTICIPANT via JWT (Authorization header OR ?a=<JWT>)
    uid = get_jwt_identity()
    if not uid:
        # no valid JWT found in headers or query-string
        abort(401)

    # Owner may fetch anything under their own user folder
    if str(req_user_id) == str(uid):
        return send_from_directory(UPLOAD_ROOT, filename, conditional=True)

    # Participant may fetch files of albums linked to events they joined
    if event_albums is not None:
        exists = (
            db.session.query(event_albums.c.event_id)
            .join(EventParticipant, EventParticipant.event_id == event_albums.c.event_id)
            .filter(event_albums.c.album_id == req_album_id, EventParticipant.user_id == uid)
            .first()
        )
        if exists:
            return send_from_directory(UPLOAD_ROOT, filename, conditional=True)

    abort(403)
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5172, debug=True)
