from app.extensions import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Rôles disponibles (même logique que VoyageIQ HTML)
ROLES = {
    'admin':       {'label': 'Administrateur',       'niveau': 5},
    'dg':          {'label': 'Direction Générale',   'niveau': 4},
    'chef':        {'label': "Chef d'Agence",        'niveau': 3},
    'superviseur': {'label': 'Superviseur Terrain',  'niveau': 2},
    'auditeur':    {'label': 'Auditeur',              'niveau': 1},
}

# Pages accessibles par rôle
ROLE_PAGES = {
    'admin':       ['dashboard','saisie','lignes','flotte','finance','operations',
                    'clientele','analytique','alertes','admin'],
    'dg':          ['dashboard','lignes','flotte','finance','operations',
                    'clientele','analytique','alertes'],
    'chef':        ['dashboard','saisie','lignes','flotte','operations',
                    'clientele','alertes'],
    'superviseur': ['dashboard','saisie','operations','alertes'],
    'auditeur':    ['dashboard','analytique','alertes'],
}

class Utilisateur(UserMixin, db.Model):
    __tablename__ = 'utilisateurs'

    id         = db.Column(db.Integer, primary_key=True)
    identifiant= db.Column(db.String(50),  unique=True, nullable=False)
    nom        = db.Column(db.String(100), nullable=False)
    role       = db.Column(db.String(20),  nullable=False, default='superviseur')
    agence     = db.Column(db.String(100), nullable=True)
    pwd_hash   = db.Column(db.String(255), nullable=False)
    actif      = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.pwd_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pwd_hash, password)

    def can_access(self, page):
        return page in ROLE_PAGES.get(self.role, [])

    def role_label(self):
        return ROLES.get(self.role, {}).get('label', self.role)

    def niveau(self):
        return ROLES.get(self.role, {}).get('niveau', 0)

    def __repr__(self):
        return f'<Utilisateur {self.identifiant} [{self.role}]>'

@login_manager.user_loader
def load_user(user_id):
    return Utilisateur.query.get(int(user_id))
