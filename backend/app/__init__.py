from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.models import db, Admin
from werkzeug.security import generate_password_hash

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    from app.routes.public import public_bp
    from app.routes.admin import admin_bp
    
    app.register_blueprint(public_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    with app.app_context():
        db.create_all()
        # Создаем админа по умолчанию
        if not Admin.query.filter_by(username='admin').first():
            hashed_pw = generate_password_hash('admin123')
            new_admin = Admin(username='admin', password_hash=hashed_pw)
            db.session.add(new_admin)
            db.session.commit()
            
    return app
