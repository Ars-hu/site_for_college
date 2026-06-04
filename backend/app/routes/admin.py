from flask import Blueprint, request, jsonify
from app.models import db, Application, Admin
from werkzeug.security import check_password_hash
import jwt
from datetime import datetime, timedelta
from flask import current_app

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    admin = Admin.query.filter_by(username=data.get('username')).first()
    if admin and check_password_hash(admin.password_hash, data.get('password')):
        token = jwt.encode({
            'user': admin.username,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({"token": token})
    return jsonify({"message": "Invalid credentials"}), 401

@admin_bp.route('/applications', methods=['GET'])
def get_applications():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Missing token"}), 401
    
    try:
        # Упрощенная проверка для примера
        apps = Application.query.order_by(Application.created_at.desc()).all()
        result = []
        for a in apps:
            result.append({
                "id": a.id,
                "fio": a.fio,
                "phone": a.phone,
                "email": a.email,
                "registration_date": a.registration_date,
                "registration_time": a.registration_time,
                "created_at": a.created_at.isoformat()
            })
        return jsonify(result)
    except:
        return jsonify({"message": "Invalid token"}), 401
