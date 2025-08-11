import os
from flask import Flask, request, abort, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.share import Share
from models.photo import Photo

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.albums import albums_bp
from routes.photos import photos_bp
from routes.events import events_bp
from routes.shares import shares_bp

app = Flask(__name__)
# If using Vite proxy (same-origin), CORS is optional. Safe to leave on:
CORS(app)

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

# ✅ Securely serve files from /uploads
@app.route("/uploads/<path:filename>")
@jwt_required(optional=True, locations=["headers", "cookies"])
def serve_uploads(filename):
    """
    Access rules:
      - Public share token: /uploads/<path>?t=<token>
         * album share: allow any file under photos/*/<album_id>/*
         * photo share: allow ONLY the exact file that matches the shared photo
         * event share: no file access (events don't map to files)
      - Owner with JWT: user may access photos/<user_id>/** only
    """
    token = request.args.get("t")

    if token:
        s = Share.query.filter_by(token=token).first()
        if not s:
            abort(404)

        parts = filename.split("/")  # expected: photos/<user_id>/<album_id>/filename.ext
        if len(parts) < 3 or parts[0] != "photos":
            abort(403)

        # Album-token
        if s.album_id:
            try:
                req_album_id = int(parts[2])  # photos/<user>/<album>/...
            except ValueError:
                abort(403)
            if req_album_id == s.album_id:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # Photo-token
        if s.photo_id:
            p = Photo.query.get(s.photo_id)
            if not p:
                abort(404)
            if p.filepath == filename:
                return send_from_directory(UPLOAD_ROOT, filename, conditional=True)
            abort(403)

        # Event-token: no file access
        if s.event_id:
            abort(403)

        abort(403)

    # Otherwise require an owner JWT
    uid = get_jwt_identity()
    if not uid:
        abort(401)

    parts = filename.split("/")
    if len(parts) >= 2 and parts[0] == "photos" and str(parts[1]) == str(uid):
        return send_from_directory(UPLOAD_ROOT, filename, conditional=True)

    abort(403)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5172, debug=True)
