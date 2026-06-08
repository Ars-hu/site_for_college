from flask import Blueprint, request, jsonify, current_app
from app.models import db, Application, Admin, BlockedDate, SlotConfig, OpenedDate, AllowedMonth
from app.config import TIME_SLOTS, DEFAULT_MAX_CAPACITY
from app.extensions import limiter
from werkzeug.security import check_password_hash
from datetime import datetime, timezone, timedelta
import jwt

admin_bp = Blueprint("admin", __name__)


def verify_token(req):
    token = req.headers.get("Authorization")
    if not token:
        return None
    try:
        jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        return token
    except Exception:
        return None


@admin_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.json or {}
    admin = Admin.query.filter_by(username=data.get("username")).first()
    if admin and check_password_hash(admin.password_hash, data.get("password", "")):
        token = jwt.encode(
            {
                "user": admin.username,
                "exp": datetime.now(timezone.utc) + timedelta(hours=24),
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256",
        )
        return jsonify({"token": token})
    return jsonify({"message": "Неверный логин или пароль"}), 401


@admin_bp.route("/applications", methods=["GET"])
def get_applications():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401

    # ── Query params ──────────────────────────────────────────────────────────
    search   = (request.args.get("search", "") or "").strip()
    sort     = request.args.get("sort", "registration_date")
    order    = request.args.get("order", "asc")
    try:
        page      = max(1, int(request.args.get("page", 1)))
        page_size = max(1, min(200, int(request.args.get("page_size", 25))))
    except (TypeError, ValueError):
        page, page_size = 1, 25

    # ── Base query ────────────────────────────────────────────────────────────
    q = Application.query

    # ── Search (fio, phone, email, registration_date, registration_time) ──────
    if search:
        like = f"%{search}%"
        q = q.filter(
            db.or_(
                Application.fio.ilike(like),
                Application.phone.ilike(like),
                Application.email.ilike(like),
                Application.registration_date.ilike(like),
                Application.registration_time.ilike(like),
            )
        )

    # ── Total count (before pagination, after search) ─────────────────────────
    total = q.count()

    # ── Sort ──────────────────────────────────────────────────────────────────
    SORT_COLUMNS = {
        "fio":               Application.fio,
        "registration_date": Application.registration_date,
        "registration_time": Application.registration_time,
        "created_at":        Application.created_at,
    }
    col = SORT_COLUMNS.get(sort, Application.registration_date)
    if order == "desc":
        q = q.order_by(col.desc())
    else:
        q = q.order_by(col.asc())

    # Secondary sort for stable ordering
    if sort == "registration_date":
        q = q.order_by(
            Application.registration_time.asc()
            if order == "asc"
            else Application.registration_time.desc()
        )
    elif sort == "registration_time":
        q = q.order_by(
            Application.registration_date.asc()
            if order == "asc"
            else Application.registration_date.desc()
        )

    # ── Pagination ────────────────────────────────────────────────────────────
    apps = q.offset((page - 1) * page_size).limit(page_size).all()

    result = [
        {
            "id": a.id,
            "fio": a.fio,
            "phone": a.phone,
            "email": a.email,
            "registration_date": a.registration_date,
            "registration_time": a.registration_time,
            "created_at": a.created_at.isoformat(),
            "status": a.status,
        }
        for a in apps
    ]

    return jsonify({
        "items":      result,
        "total":      total,
        "page":       page,
        "page_size":  page_size,
        "total_pages": max(1, -(-total // page_size)),  # ceil division
    })


@admin_bp.route("/applications/<int:app_id>", methods=["DELETE"])
def delete_application(app_id):
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Запись не найдена"}), 404
    db.session.delete(app)
    db.session.commit()
    return jsonify({"deleted": True, "id": app_id})


@admin_bp.route("/applications/<int:app_id>/status", methods=["PATCH"])
def update_application_status(app_id):
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    new_status = data.get("status")
    if new_status not in ("pending", "confirmed", "rejected"):
        return jsonify({"error": "Недопустимый статус"}), 400
    app = Application.query.get(app_id)
    if not app:
        return jsonify({"error": "Запись не найдена"}), 404
    app.status = new_status
    db.session.commit()
    return jsonify({"id": app_id, "status": app.status})


@admin_bp.route("/blocked-dates", methods=["GET"])
def get_blocked_dates():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    blocked = BlockedDate.query.all()
    opened = OpenedDate.query.all()
    return jsonify({
        "blocked_dates": [b.date for b in blocked],
        "opened_weekends": [o.date for o in opened],
    })


@admin_bp.route("/toggle-weekend", methods=["POST"])
def toggle_weekend():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    date = data.get("date")
    if not date:
        return jsonify({"error": "Дата не указана"}), 400

    from datetime import date as date_type
    try:
        parsed = date_type.fromisoformat(date)
    except ValueError:
        return jsonify({"error": "Некорректный формат даты"}), 400

    if parsed.weekday() < 5:
        return jsonify({"error": "Это не выходной день"}), 400

    existing = OpenedDate.query.filter_by(date=date).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"opened": False, "date": date})
    else:
        db.session.add(OpenedDate(date=date))
        db.session.commit()
        return jsonify({"opened": True, "date": date})


@admin_bp.route("/toggle-date", methods=["POST"])
def toggle_date():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    date = data.get("date")
    if not date:
        return jsonify({"error": "Дата не указана"}), 400

    existing = BlockedDate.query.filter_by(date=date).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"blocked": False, "date": date})
    else:
        new_block = BlockedDate(date=date)
        db.session.add(new_block)
        db.session.commit()
        return jsonify({"blocked": True, "date": date})


@admin_bp.route("/slot-configs/<date>", methods=["GET"])
def get_slot_configs(date):
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401

    apps = Application.query.filter_by(registration_date=date).all()
    occupied: dict[str, int] = {}
    for a in apps:
        occupied[a.registration_time] = occupied.get(a.registration_time, 0) + 1

    slot_configs = SlotConfig.query.filter_by(date=date).all()
    config_map = {sc.time: sc for sc in slot_configs}

    result = {}
    for t in TIME_SLOTS:
        cfg = config_map.get(t)
        result[t] = {
            "max_capacity": cfg.max_capacity if cfg else DEFAULT_MAX_CAPACITY,
            "is_blocked": cfg.is_blocked if cfg else False,
            "occupied": occupied.get(t, 0),
        }
    return jsonify(result)


@admin_bp.route("/update-slot", methods=["POST"])
def update_slot():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    date = data.get("date")
    time = data.get("time")
    max_capacity = data.get("max_capacity")
    is_blocked = data.get("is_blocked")

    if not date or not time:
        return jsonify({"error": "Не указана дата или время"}), 400

    cfg = SlotConfig.query.filter_by(date=date, time=time).first()
    if not cfg:
        cfg = SlotConfig(date=date, time=time)
        db.session.add(cfg)

    if max_capacity is not None:
        new_capacity = max(1, int(max_capacity))

        current_count = Application.query.filter_by(
            registration_date=date,
            registration_time=time
        ).count()

        if new_capacity < current_count:
            return jsonify({
                "error": (
                    f"На это время уже записано {current_count} человек. "
                    f"Нельзя установить лимит меньше этого значения."
                )
            }), 400

        cfg.max_capacity = new_capacity
    if is_blocked is not None:
        cfg.is_blocked = bool(is_blocked)

    db.session.commit()
    return jsonify(
        {
            "date": date,
            "time": time,
            "max_capacity": cfg.max_capacity,
            "is_blocked": cfg.is_blocked,
        }
    )


@admin_bp.route("/allowed-months", methods=["GET"])
def get_allowed_months():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    months = AllowedMonth.query.order_by(AllowedMonth.year, AllowedMonth.month).all()
    return jsonify([{"year": m.year, "month": m.month} for m in months])


@admin_bp.route("/add-month", methods=["POST"])
def add_month():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    year = data.get("year")
    month = data.get("month")
    if not year or not month:
        return jsonify({"error": "Не указан год или месяц"}), 400
    try:
        year, month = int(year), int(month)
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректные данные"}), 400
    if not (1 <= month <= 12) or year < 2000:
        return jsonify({"error": "Некорректный месяц или год"}), 400
    if AllowedMonth.query.filter_by(year=year, month=month).first():
        return jsonify({"error": "Этот месяц уже добавлен"}), 409
    db.session.add(AllowedMonth(year=year, month=month))
    db.session.commit()
    return jsonify({"year": year, "month": month}), 201


@admin_bp.route("/remove-month", methods=["POST"])
def remove_month():
    if not verify_token(request):
        return jsonify({"message": "Нет доступа"}), 401
    data = request.json or {}
    try:
        year, month = int(data.get("year")), int(data.get("month"))
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректные данные"}), 400
    row = AllowedMonth.query.filter_by(year=year, month=month).first()
    if not row:
        return jsonify({"error": "Месяц не найден"}), 404
    month_prefix = f"{year}-{month:02d}"
    existing_application = Application.query.filter(
        Application.registration_date.like(f"{month_prefix}-%")
    ).first()

    if existing_application:
        return jsonify({
            "error": "В этом месяце есть актуальные записи"
        }), 409
    db.session.delete(row)
    db.session.commit()
    return jsonify({"removed": True})
