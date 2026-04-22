from app.extensions import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

# ── Rôles disponibles ─────────────────────────────────────────────────────────
ROLES = {
    'admin':       {'label': 'Administrateur',      'niveau': 5, 'icon': '⚙️'},
    'dg':          {'label': 'Direction Générale',  'niveau': 4, 'icon': '👔'},
    'chef':        {'label': "Chef d'Agence",       'niveau': 3, 'icon': '🏢'},
    'superviseur': {'label': 'Superviseur Terrain', 'niveau': 2, 'icon': '👁️'},
    'auditeur':    {'label': 'Auditeur',             'niveau': 1, 'icon': '📋'},
}

# ── Pages accessibles par rôle ────────────────────────────────────────────────
ROLE_PAGES = {
    'admin':       ['dashboard', 'saisie', 'lignes', 'flotte', 'finance',
                    'operations', 'clientele', 'analytique', 'alertes',
                    'admin', 'chauffeurs', 'rapports', 'utilisateurs', 'avis'],
    'dg':          ['dashboard', 'lignes', 'flotte', 'finance', 'operations',
                    'clientele', 'analytique', 'alertes', 'chauffeurs', 'rapports', 'avis'],
    'chef':        ['dashboard', 'saisie', 'lignes', 'flotte', 'operations',
                    'clientele', 'alertes', 'chauffeurs', 'avis'],
    'superviseur': ['dashboard', 'saisie', 'operations', 'alertes'],
    'auditeur':    ['dashboard', 'analytique', 'alertes'],
}

class Utilisateur(UserMixin, db.Model):
    __tablename__ = 'utilisateurs'

    # ── Identité ──────────────────────────────────────────────
    id              = db.Column(db.Integer, primary_key=True)
    identifiant     = db.Column(db.String(50),  unique=True, nullable=False)
    nom             = db.Column(db.String(100), nullable=False)
    prenom          = db.Column(db.String(100), nullable=True)
    matricule       = db.Column(db.String(20),  unique=True, nullable=True)  # ← NOUVEAU

    # ── Contact ───────────────────────────────────────────────
    telephone       = db.Column(db.String(20),  nullable=True)               # ← NOUVEAU
    telephone_whatsapp = db.Column(db.String(20), nullable=True)             # ← NOUVEAU (envoi rapports)
    email           = db.Column(db.String(150), unique=True, nullable=True)  # ← NOUVEAU
    adresse         = db.Column(db.String(200), nullable=True)               # ← NOUVEAU

    # ── Profil & photo ────────────────────────────────────────
    photo           = db.Column(db.String(255), nullable=True)               # ← NOUVEAU (chemin fichier)
    bio             = db.Column(db.Text,        nullable=True)               # ← NOUVEAU

    # ── Rôle & accès ──────────────────────────────────────────
    role            = db.Column(db.String(20),  nullable=False, default='superviseur')
    agence          = db.Column(db.String(100), nullable=True)

    # ── Auth ──────────────────────────────────────────────────
    pwd_hash        = db.Column(db.String(255), nullable=False)
    actif           = db.Column(db.Boolean, default=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login      = db.Column(db.DateTime, nullable=True)

    # ── Préférences notifications ──────────────────────────────
    notif_email     = db.Column(db.Boolean, default=True)                    # ← NOUVEAU
    notif_whatsapp  = db.Column(db.Boolean, default=False)                   # ← NOUVEAU

    # ── Auth methods ──────────────────────────────────────────
    def set_password(self, password):
        self.pwd_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pwd_hash, password)

    # ── Permissions ───────────────────────────────────────────
    def can_access(self, page):
        return page in ROLE_PAGES.get(self.role, [])

    def role_label(self):
        return ROLES.get(self.role, {}).get('label', self.role)

    def role_icon(self):
        return ROLES.get(self.role, {}).get('icon', '👤')

    def niveau(self):
        return ROLES.get(self.role, {}).get('niveau', 0)

    def is_admin(self):
        return self.role == 'admin'

    def is_at_least(self, role_key):
        """Ex: user.is_at_least('chef') → True si chef, dg ou admin"""
        return self.niveau() >= ROLES.get(role_key, {}).get('niveau', 0)

    # ── Affichage ─────────────────────────────────────────────
    def nom_complet(self):
        if self.prenom:
            return f'{self.prenom} {self.nom}'
        return self.nom

    def initiales(self):
        parts = self.nom_complet().split()
        return ''.join(p[0].upper() for p in parts[:2])

    def __repr__(self):
        return f'<Utilisateur {self.identifiant} [{self.role}]>'


@login_manager.user_loader
def load_user(user_id):
    # Gère les deux types : Utilisateur (id numérique) et Chauffeur (préfixe 'c-')
    if str(user_id).startswith('c-'):
        from app.models.chauffeur import Chauffeur
        return db.session.get(Chauffeur, int(user_id[2:]))
    return db.session.get(Utilisateur, int(user_id))
