import os
import logging

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = "your-super-secret-key"

TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
]

DEFAULT_MAX_CAPACITY = 3


class Config:
    db_url = os.environ.get("DATABASE_URL", "sqlite:///registrations.db")

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.environ.get("SECRET_KEY", _DEFAULT_SECRET)

    # Comma-separated allowed origins; "*" allows all (default for local dev)
    CORS_ORIGINS = [
        o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")
    ]

    # Admin credentials (used on first run to create the admin account)
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")