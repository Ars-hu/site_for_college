import logging
import warnings
from flask import Flask
from flask_cors import CORS
from app.config import Config, _DEFAULT_SECRET
from app.models import db, Admin, AllowedMonth
from app.extensions import limiter
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    if app.config["SECRET_KEY"] == _DEFAULT_SECRET:
        warnings.warn(
            "SECRET_KEY is set to the insecure default value. "
            "Set the SECRET_KEY environment variable before deploying to production.",
            RuntimeWarning,
            stacklevel=2,
        )

    CORS(app, origins=app.config["CORS_ORIGINS"])
    db.init_app(app)
    limiter.init_app(app)

    from app.routes.public import public_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    with app.app_context():
        try:
            db.create_all()
        except IntegrityError:
            db.session.rollback()

        try:
            if not AllowedMonth.query.first():
                year = datetime.now(timezone.utc).year
                for m in (6, 7, 8):
                    db.session.add(AllowedMonth(year=year, month=m))
                db.session.commit()
        except IntegrityError:
            db.session.rollback()

        try:
            if not Admin.query.filter_by(username="admin").first():
                hashed_pw = generate_password_hash("admin123")
                new_admin = Admin(username="admin", password_hash=hashed_pw)
                db.session.add(new_admin)
                db.session.commit()
        except IntegrityError:
            db.session.rollback()

    return app