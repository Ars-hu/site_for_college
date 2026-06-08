from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fio = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    registration_date = db.Column(db.String(20), nullable=False, index=True)
    registration_time = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    # pending | confirmed | rejected
    status = db.Column(db.String(20), nullable=False, default="pending")


class ArchivedApplication(db.Model):
    """Applications moved to archive after their date/time has passed."""
    id = db.Column(db.Integer, primary_key=True)
    original_id = db.Column(db.Integer, nullable=False)
    fio = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    registration_date = db.Column(db.String(20), nullable=False, index=True)
    registration_time = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False)
    archived_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class BlockedDate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), unique=True, nullable=False)


class AllowedMonth(db.Model):
    """Months when registration is open, managed by admins."""
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1–12
    __table_args__ = (db.UniqueConstraint("year", "month", name="uq_allowed_month"),)


class OpenedDate(db.Model):
    """Weekend dates explicitly opened for registration by an admin."""
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), unique=True, nullable=False)


class SlotConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), nullable=False, index=True)
    time = db.Column(db.String(10), nullable=False)
    max_capacity = db.Column(db.Integer, default=3)
    is_blocked = db.Column(db.Boolean, default=False)
    __table_args__ = (db.UniqueConstraint("date", "time", name="uq_slot_date_time"),)
