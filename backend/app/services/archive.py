from datetime import datetime
from zoneinfo import ZoneInfo

from app.models import db, Application, ArchivedApplication


def archive_expired() -> int:
    """Move past applications to ArchivedApplication. Returns count moved."""
    now = datetime.now(ZoneInfo("Europe/Moscow"))
    today_str = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")

    expired = Application.query.filter(
        db.or_(
            Application.registration_date < today_str,
            db.and_(
                Application.registration_date == today_str,
                Application.registration_time < current_time,
            ),
        )
    ).all()

    count = 0
    for app in expired:
        db.session.add(ArchivedApplication(
            original_id=app.id,
            fio=app.fio,
            phone=app.phone,
            email=app.email,
            registration_date=app.registration_date,
            registration_time=app.registration_time,
            status=app.status,
            created_at=app.created_at,
        ))
        db.session.delete(app)
        count += 1

    if count:
        db.session.commit()
    return count
