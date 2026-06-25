from flask import Flask, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Import Blueprints
from app.routes.chat import chat_bp
from app.routes.image import image_bp

def create_app():
    # Load environment variables from .env
    load_dotenv()
    
    # Initialize Flask app
    app = Flask(__name__, template_folder='templates')
    
    # Configure CORS
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(chat_bp)
    app.register_blueprint(image_bp)
    
    # Route for serving the basic UI
    @app.route('/')
    def home():
        return render_template('index.html')
        
    return app
