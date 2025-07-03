from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt  # ✅ from extensions
from routes.auth import auth_bp

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Initialize extensions
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")

if __name__ == "__main__":
    app.run(debug=True)
