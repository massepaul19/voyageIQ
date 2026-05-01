"""
config/settings.py — Configuration centralisée VoyageIQ Pro
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'voyageiq-pro-secret-key-change-in-prod-2026')

    # ── Base de données ───────────────────────────────────────
    DB_PATH = BASE_DIR / 'database' / 'voyageiq.db'
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH.absolute()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Sécurité ──────────────────────────────────────────────
    WTF_CSRF_ENABLED       = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # ── Uploads ───────────────────────────────────────────────
    UPLOAD_FOLDER     = BASE_DIR / 'app' / 'static' / 'images'
    UPLOAD_AVATARS    = UPLOAD_FOLDER / 'avatars'
    UPLOAD_CHAUFFEURS = UPLOAD_FOLDER / 'chauffeurs'
    UPLOAD_VEHICULES  = UPLOAD_FOLDER / 'vehicules'
    MAX_CONTENT_LENGTH      = 16 * 1024 * 1024   # 16 MB
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

    # ── Mail (Gmail SMTP) ─────────────────────────────────────
    # En production utiliser : export MAIL_PASSWORD=<app_password_google>
    MAIL_SERVER         = os.environ.get('MAIL_SERVER',   'smtp.gmail.com')
    MAIL_PORT           = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS        = True
    MAIL_USE_SSL        = False
    MAIL_USERNAME       = os.environ.get('MAIL_USERNAME', 'paolocisse6@gmail.com')
    MAIL_PASSWORD       = os.environ.get('MAIL_PASSWORD', 'rzue kcob norj ezwp')   
    MAIL_DEFAULT_SENDER = ('VoyageIQ Pro', os.environ.get('MAIL_USERNAME', 'paolocisse6@gmail.com'))
    MAIL_MAX_EMAILS     = None
    MAIL_ASCII_ATTACHMENTS = False

    # ── Rapports ──────────────────────────────────────────────
    RAPPORT_DEST_EMAIL  = os.environ.get('RAPPORT_DEST_EMAIL', 'paolocisse6@gmail.com')
    RAPPORT_OUTPUT_DIR  = BASE_DIR / 'database' / 'rapports'

    # ── WhatsApp (Twilio ou lien wa.me direct) ────────────────
    # Numéro WhatsApp pour l'envoi de notifications rapports
    WHATSAPP_NUMBER     = os.environ.get('WHATSAPP_NUMBER', '+237673485193')

    # Si vous utilisez Twilio pour WhatsApp API :
    TWILIO_ACCOUNT_SID  = os.environ.get('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN   = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')  # Sandbox Twilio

    # Lien wa.me pour envoi manuel (fallback sans Twilio)
    @staticmethod
    def whatsapp_link(message: str) -> str:
        """Génère un lien wa.me pour envoyer un message WhatsApp."""
        import urllib.parse
        numero = Config.WHATSAPP_NUMBER.replace('+', '').replace(' ', '')
        return f"https://wa.me/{numero}?text={urllib.parse.quote(message)}"

    # ── Authentification ──────────────────────────────────────
    PHONE_REGEX = r'^(\+237)?[6-9]\d{8}$'

    # ── Application ───────────────────────────────────────────
    APP_NAME    = 'VoyageIQ Pro'
    APP_VERSION = '2.0'
    APP_COMPANY = 'VoyageIQ Transport'
    APP_COUNTRY = 'Cameroun'

    @staticmethod
    def init_app(app):
        """Créer les dossiers nécessaires au démarrage."""
        for folder in [
            Config.UPLOAD_AVATARS,
            Config.UPLOAD_CHAUFFEURS,
            Config.UPLOAD_VEHICULES,
            Config.RAPPORT_OUTPUT_DIR,
        ]:
            folder.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False   # Passer à True pour voir les requêtes SQL


class ProductionConfig(Config):
    DEBUG = False
    WTF_CSRF_ENABLED     = True
    SESSION_COOKIE_SECURE = True   # HTTPS uniquement en prod


config = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}
