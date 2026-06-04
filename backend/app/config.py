import os

class Config:
    # Настройка БД
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///registrations.db')
    # Корректировка для нового драйвера psycopg3, если указан postgresql://
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-super-secret-key')
