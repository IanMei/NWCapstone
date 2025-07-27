from flask import Flask
from flask_cors import CORS
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

# Initialize extensions
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(dashboard_bp, url_prefix="/api")
app.register_blueprint(albums_bp, url_prefix="/api")
app.register_blueprint(photos_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(debug=True)
