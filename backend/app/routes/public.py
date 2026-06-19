from flask import Blueprint, request, jsonify
from sqlalchemy import func
from app.models import db, Application, BlockedDate, SlotConfig, OpenedDate, AllowedMonth, DailyLimit
from app.config import TIME_SLOTS, DEFAULT_MAX_CAPACITY
from app.extensions import limiter
from app.clock import get_now

public_bp = Blueprint("public", __name__)


@public_bp.route("/allowed-months", methods=["GET"])
def get_allowed_months():
    months = AllowedMonth.query.order_by(AllowedMonth.year, AllowedMonth.month).all()
    return jsonify([{"year": m.year, "month": m.month} for m in months])


@public_bp.route("/slots-status/<date>", methods=["GET"])
def get_slots_status(date):
    date_blocked = BlockedDate.query.filter_by(date=date).first() is not None

    apps = Application.query.filter_by(registration_date=date).all()
    occupied = {}
    for a in apps:
        occupied[a.registration_time] = occupied.get(a.registration_time, 0) + 1

    slot_configs = SlotConfig.query.filter_by(date=date).all()
    config_map = {sc.time: sc for sc in slot_configs}

    slots = {}
    for t in TIME_SLOTS:
        cfg = config_map.get(t)
        slots[t] = {
            "occupied": occupied.get(t, 0),
            "max_capacity": cfg.max_capacity if cfg else DEFAULT_MAX_CAPACITY,
            "is_blocked": cfg.is_blocked if cfg else False,
        }

    # Daily limit info
    daily = DailyLimit.query.filter_by(date=date).first()
    daily_limit = daily.max_registrations if daily else 0
    daily_count = Application.query.filter_by(registration_date=date).count()

    return jsonify({
        "date_blocked": date_blocked,
        "slots": slots,
        "daily_limit": daily_limit,
        "daily_count": daily_count,
    })


@public_bp.route("/dates-status", methods=["GET"])
def get_dates_status():
    blocked = BlockedDate.query.all()
    blocked_dates = [b.date for b in blocked]

    opened_weekends = [o.date for o in OpenedDate.query.all()]

    # Count registrations per (date, time)
    slot_counts = (
        db.session.query(
            Application.registration_date,
            Application.registration_time,
            func.count(Application.id).label("cnt"),
        )
        .group_by(Application.registration_date, Application.registration_time)
        .all()
    )

    # Build per-date slot occupancy map
    by_date: dict[str, dict[str, int]] = {}
    for row in slot_counts:
        by_date.setdefault(row.registration_date, {})[row.registration_time] = row.cnt

    # Load all SlotConfig rows for dates that have any registrations
    all_configs = SlotConfig.query.filter(
        SlotConfig.date.in_(list(by_date.keys()))
    ).all()
    config_map: dict[tuple, SlotConfig] = {(sc.date, sc.time): sc for sc in all_configs}

    full_dates = []
    for date, time_counts in by_date.items():
        all_full = True
        for t in TIME_SLOTS:
            cfg = config_map.get((date, t))
            if cfg and cfg.is_blocked:
                continue  # slot closed, skip
            max_cap = cfg.max_capacity if cfg else DEFAULT_MAX_CAPACITY
            if time_counts.get(t, 0) < max_cap:
                all_full = False
                break
        if all_full:
            full_dates.append(date)

    # Dates blocked by daily limit
    daily_limits = DailyLimit.query.filter(DailyLimit.max_registrations > 0).all()
    daily_full_dates = []
    for dl in daily_limits:
        count = Application.query.filter_by(registration_date=dl.date).count()
        if count >= dl.max_registrations:
            daily_full_dates.append(dl.date)

    # Merge both full lists
    all_full_dates = list(set(full_dates + daily_full_dates))

    from app.clock import get_now
    from datetime import timedelta
    now = get_now()
    cutoff = now + timedelta(hours=24)
    # Dates within next 24 hours are fully blocked for new registrations
    blocked_within_24h = []
    # Check today and tomorrow
    for delta in range(2):
        from datetime import datetime as _dt
        check_date = (now + timedelta(days=delta)).strftime("%Y-%m-%d")
        # If ALL slots on that day are within 24h window, mark as blocked
        last_slot_str = f"{check_date} {TIME_SLOTS[-1]}"
        last_slot_dt = _dt.strptime(last_slot_str, "%Y-%m-%d %H:%M").replace(tzinfo=now.tzinfo)
        if last_slot_dt <= cutoff:
            blocked_within_24h.append(check_date)

    return jsonify({
        "blocked_dates": blocked_dates,
        "full_dates": all_full_dates,
        "opened_weekends": opened_weekends,
        "blocked_within_24h": blocked_within_24h,
        "server_date": now.strftime("%Y-%m-%d"),
        "server_now": now.strftime("%Y-%m-%dT%H:%M:%S"),
    })


@public_bp.route("/register", methods=["POST"])
@limiter.limit("10 per minute")
def register():
    data = request.json or {}
    fio = data.get("fio", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    date = data.get("registration_date", "").strip()
    time = data.get("registration_time", "").strip()

    if not all([fio, phone, email, date, time]):
        return jsonify({"error": "Все поля обязательны для заполнения"}), 400

    if time not in TIME_SLOTS:
        return jsonify({"error": "Недопустимое время записи"}), 400

    try:
        from datetime import datetime
        from zoneinfo import ZoneInfo

        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Некорректный формат даты"}), 400

        # Use centralized clock (respects manual override)
        now = get_now()
        slot_dt_str = f"{date} {time}"
        try:
            slot_dt = datetime.strptime(slot_dt_str, "%Y-%m-%d %H:%M").replace(
                tzinfo=ZoneInfo("Europe/Moscow")
            )
        except ValueError:
            return jsonify({"error": "Некорректный формат даты или времени"}), 400
        from datetime import timedelta
        if slot_dt <= now + timedelta(hours=24):
            return jsonify({"error": "Запись доступна минимум за 24 часа до приёма"}), 400

        if not AllowedMonth.query.filter_by(year=date_obj.year, month=date_obj.month).first():
            return jsonify({"error": "Запись на этот месяц недоступна"}), 400

        if date_obj.weekday() >= 5:
            if not OpenedDate.query.filter_by(date=date).first():
                return jsonify({"error": "Запись в выходные дни недоступна"}), 400

        if BlockedDate.query.filter_by(date=date).first():
            return jsonify({"error": "Запись на эту дату недоступна"}), 400

        slot_cfg = SlotConfig.query.filter_by(date=date, time=time).first()
        if slot_cfg and slot_cfg.is_blocked:
            return jsonify({"error": "Запись на это время недоступна"}), 400

        max_capacity = slot_cfg.max_capacity if slot_cfg else DEFAULT_MAX_CAPACITY

        existing_user = Application.query.filter(
            (Application.registration_date == date)
            & ((Application.phone == phone) | (Application.email == email))
        ).first()

        if existing_user:
            return jsonify({"error": "Вы уже записаны на эту дату"}), 400

        # Check daily limit
        daily_limit_row = DailyLimit.query.filter_by(date=date).first()
        if daily_limit_row and daily_limit_row.max_registrations > 0:
            daily_count = Application.query.filter_by(registration_date=date).count()
            if daily_count >= daily_limit_row.max_registrations:
                return jsonify({"error": "На этот день достигнут лимит записей"}), 400

        slots_count = Application.query.filter_by(
            registration_date=date,
            registration_time=time,
        ).count()

        if slots_count >= max_capacity:
            return jsonify({"error": "Извините, на это время мест больше нет"}), 400

        new_app = Application(
            fio=fio, phone=phone, email=email,
            registration_date=date, registration_time=time,
        )
        db.session.add(new_app)
        db.session.commit()
        return jsonify({"message": "Success", "id": new_app.id}), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Ошибка при сохранении данных"}), 500
