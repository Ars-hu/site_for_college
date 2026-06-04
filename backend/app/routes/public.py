from flask import Blueprint, request, jsonify
from app.models import db, Application

public_bp = Blueprint('public', __name__)

@public_bp.route('/slots-status/<date>', methods=['GET'])
def get_slots_status(date):
    # Возвращает количество занятых мест для каждого времени на конкретную дату
    apps = Application.query.filter_by(registration_date=date).all()
    status = {}
    for a in apps:
        status[a.registration_time] = status.get(a.registration_time, 0) + 1
    return jsonify(status)

@public_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    fio = data.get('fio')
    phone = data.get('phone')
    email = data.get('email')
    date = data.get('registration_date')
    time = data.get('registration_time')

    try:
        # 1. Проверка на дубликат (тот же телефон/email на ту же дату)
        existing_user = Application.query.filter(
            (Application.registration_date == date) & 
            ((Application.phone == phone) | (Application.email == email))
        ).first()
        
        if existing_user:
            return jsonify({"error": "Вы уже записаны на эту дату"}), 400

        # 2. Проверка доступности слота (макс 3 записи на один слот)
        slots_count = Application.query.filter_by(
            registration_date=date, 
            registration_time=time
        ).count()

        if slots_count >= 3:
            return jsonify({"error": "Извините, на это время мест больше нет"}), 400

        new_app = Application(
            fio=fio,
            phone=phone,
            email=email,
            registration_date=date,
            registration_time=time
        )
        db.session.add(new_app)
        db.session.commit()
        return jsonify({"message": "Success", "id": new_app.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Ошибка при сохранении данных"}), 500
