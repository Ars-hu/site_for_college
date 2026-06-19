import logging
import warnings
from flask import Flask
from flask_cors import CORS
from app.config import Config, _DEFAULT_SECRET
from app.models import db, Admin, AllowedMonth, SystemClock, DailyLimit
from app.extensions import limiter
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
from apscheduler.schedulers.background import BackgroundScheduler

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

        # Archive any already-expired applications on startup
        try:
            from app.services.archive import archive_expired
            archive_expired()
        except Exception:
            pass

        try:
            if not AllowedMonth.query.first():
                year = datetime.now(timezone.utc).year
                for m in (6, 7, 8):
                    db.session.add(AllowedMonth(year=year, month=m))
                db.session.commit()
        except IntegrityError:
            db.session.rollback()

        try:
            admin_username = app.config["ADMIN_USERNAME"]
            admin_password = app.config["ADMIN_PASSWORD"]
            existing_admin = Admin.query.filter_by(username=admin_username).first()
            if existing_admin:
                existing_admin.password_hash = generate_password_hash(admin_password)
                db.session.commit()
            else:
                hashed_pw = generate_password_hash(admin_password)
                new_admin = Admin(username=admin_username, password_hash=hashed_pw)
                db.session.add(new_admin)
                db.session.commit()
        except IntegrityError:
            db.session.rollback()

    # Запускаем фоновый планировщик — архивирует просроченные записи каждые 5 минут
    def scheduled_archive():
        with app.app_context():
            try:
                from app.services.archive import archive_expired
                count = archive_expired()
                if count:
                    logger.info("Scheduler: archived %d application(s)", count)
            except Exception as e:
                logger.error("Scheduler archive error: %s", e)

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(scheduled_archive, "interval", minutes=5)
    scheduler.start()

    return app