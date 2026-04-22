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
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # ── Uploads (photos de profil, documents) ─────────────────
    UPLOAD_FOLDER = BASE_DIR / 'app' / 'static' / 'images'
    UPLOAD_AVATARS  = UPLOAD_FOLDER / 'avatars'       # photos utilisateurs/admins
    UPLOAD_CHAUFFEURS = UPLOAD_FOLDER / 'chauffeurs'  # photos chauffeurs
    UPLOAD_VEHICULES  = UPLOAD_FOLDER / 'vehicules'   # photos véhicules
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024             # 16 MB max

    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

    # ── Authentification ──────────────────────────────────────
    # Format téléphone : accepte +237XXXXXXXXX ou XXXXXXXXX (9 chiffres)
    PHONE_REGEX = r'^(\+237)?[6-9]\d{8}$'

    # ── Application ───────────────────────────────────────────
    APP_NAME    = 'VoyageIQ Pro'
    APP_VERSION = '2.0'
    APP_COMPANY = 'VoyageIQ Transport'
    APP_COUNTRY = 'Cameroun'

    @staticmethod
    def init_app(app):
        """Créer les dossiers d'upload au démarrage."""
        for folder in [
            Config.UPLOAD_AVATARS,
            Config.UPLOAD_CHAUFFEURS,
            Config.UPLOAD_VEHICULES,
        ]:
            folder.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False   # Passer à True pour voir les requêtes SQL


class ProductionConfig(Config):
    DEBUG = False
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_SECURE = True   # HTTPS uniquement en prod


config = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}
