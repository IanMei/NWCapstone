import os
from flask import Flask
from flask_cors import CORS
from flask import send_from_directory
from config import Config
from extensions import db, bcrypt, jwt  # ✅ from extensions
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.albums import albums_bp
from routes.photos import photos_bp
from models import *

app = Flask(__name__)
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

# ✅ Route to serve files from the uploads folder
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_ROOT, filename)

if __name__ == "__main__":
    app.run(debug=True)

