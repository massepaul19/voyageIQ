#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  VoyageIQ Pro — Script d'initialisation du projet
#  Structure calquée sur Football-UY1 (Flask + Blueprints + SQLite)
#  Auteur  : Généré automatiquement
#  Usage   : bash init_voyageiq.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e
PROJECT="VoyageIQ-Pro"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        VoyageIQ Pro — Initialisation du projet       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Dossier racine ──────────────────────────────────────────────────────
mkdir -p "$PROJECT" && cd "$PROJECT"

# ═══════════════════════════════════════════════════════════════════════════
#  ARBORESCENCE COMPLÈTE
# ═══════════════════════════════════════════════════════════════════════════
mkdir -p app/blueprints/auth
mkdir -p app/blueprints/dashboard
mkdir -p app/blueprints/saisie
mkdir -p app/blueprints/lignes
mkdir -p app/blueprints/flotte
mkdir -p app/blueprints/finance
mkdir -p app/blueprints/operations
mkdir -p app/blueprints/clientele
mkdir -p app/blueprints/analytique
mkdir -p app/blueprints/alertes
mkdir -p app/blueprints/admin
mkdir -p app/blueprints/api

mkdir -p app/models
mkdir -p app/services
mkdir -p app/utils
mkdir -p app/extensions

mkdir -p app/static/css/base
mkdir -p app/static/css/pages
mkdir -p app/static/css/components
mkdir -p app/static/js/modules
mkdir -p app/static/images/logos
mkdir -p app/static/images/vehicules

mkdir -p app/templates/base
mkdir -p app/templates/auth
mkdir -p app/templates/dashboard
mkdir -p app/templates/saisie
mkdir -p app/templates/lignes
mkdir -p app/templates/flotte
mkdir -p app/templates/finance
mkdir -p app/templates/operations
mkdir -p app/templates/clientele
mkdir -p app/templates/analytique
mkdir -p app/templates/alertes
mkdir -p app/templates/admin
mkdir -p app/templates/errors
mkdir -p app/templates/public

mkdir -p config
mkdir -p database/migrations
mkdir -p database/seeds
mkdir -p logs
mkdir -p backups
mkdir -p docs

echo "  ✓ Arborescence créée"

# ═══════════════════════════════════════════════════════════════════════════
#  CONFIG/SETTINGS.PY
# ═══════════════════════════════════════════════════════════════════════════
cat > config/__init__.py << 'PYEOF'
PYEOF

cat > config/settings.py << 'PYEOF'
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    SECRET_KEY       = os.environ.get('SECRET_KEY', 'voyageiq-secret-key-change-in-prod')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f'sqlite:///{BASE_DIR}/database/voyageiq.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = True
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024   # 16 Mo upload max

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}
PYEOF

echo "  ✓ config/settings.py"

# ═══════════════════════════════════════════════════════════════════════════
#  APP EXTENSIONS
# ═══════════════════════════════════════════════════════════════════════════
cat > app/extensions/__init__.py << 'PYEOF'
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect

db       = SQLAlchemy()
login_manager = LoginManager()
csrf     = CSRFProtect()
PYEOF

echo "  ✓ app/extensions/__init__.py"

# ═══════════════════════════════════════════════════════════════════════════
#  APP/__INIT__.PY
# ═══════════════════════════════════════════════════════════════════════════
cat > app/__init__.py << 'PYEOF'
from flask import Flask
from config.settings import config
from app.extensions import db, login_manager, csrf


def create_app(env='default'):
    app = Flask(__name__)
    app.config.from_object(config[env])

    # Extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Veuillez vous connecter pour accéder à cette page.'
    login_manager.login_message_category = 'warning'

    # Context processor — variables globales Jinja2
    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        return dict(current_user=current_user)

    # Blueprints
    from app.blueprints.auth       import auth_bp
    from app.blueprints.dashboard  import dashboard_bp
    from app.blueprints.saisie     import saisie_bp
    from app.blueprints.lignes     import lignes_bp
    from app.blueprints.flotte     import flotte_bp
    from app.blueprints.finance    import finance_bp
    from app.blueprints.operations import operations_bp
    from app.blueprints.clientele  import clientele_bp
    from app.blueprints.analytique import analytique_bp
    from app.blueprints.alertes    import alertes_bp
    from app.blueprints.admin      import admin_bp
    from app.blueprints.api        import api_bp

    app.register_blueprint(auth_bp,       url_prefix='/auth')
    app.register_blueprint(dashboard_bp,  url_prefix='/dashboard')
    app.register_blueprint(saisie_bp,     url_prefix='/saisie')
    app.register_blueprint(lignes_bp,     url_prefix='/lignes')
    app.register_blueprint(flotte_bp,     url_prefix='/flotte')
    app.register_blueprint(finance_bp,    url_prefix='/finance')
    app.register_blueprint(operations_bp, url_prefix='/operations')
    app.register_blueprint(clientele_bp,  url_prefix='/clientele')
    app.register_blueprint(analytique_bp, url_prefix='/analytique')
    app.register_blueprint(alertes_bp,    url_prefix='/alertes')
    app.register_blueprint(admin_bp,      url_prefix='/admin')
    app.register_blueprint(api_bp,        url_prefix='/api')

    # Page d'accueil
    from flask import redirect, url_for
    @app.route('/')
    def index():
        return redirect(url_for('auth.login'))

    # Erreurs
    @app.errorhandler(404)
    def not_found(e):
        from flask import render_template
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        from flask import render_template
        return render_template('errors/500.html'), 500

    return app
PYEOF

echo "  ✓ app/__init__.py"

# ═══════════════════════════════════════════════════════════════════════════
#  MODELS
# ═══════════════════════════════════════════════════════════════════════════
cat > app/models/__init__.py << 'PYEOF'
from app.models.utilisateur import Utilisateur
from app.models.ligne       import Ligne
from app.models.vehicule    import Vehicule
from app.models.saisie      import Saisie
from app.models.alerte      import Alerte
PYEOF

cat > app/models/utilisateur.py << 'PYEOF'
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
PYEOF

cat > app/models/ligne.py << 'PYEOF'
from app.extensions import db
from datetime import datetime

class Ligne(db.Model):
    __tablename__ = 'lignes'

    id         = db.Column(db.Integer, primary_key=True)
    code       = db.Column(db.String(10),  unique=True, nullable=False)
    nom        = db.Column(db.String(150), nullable=False)
    depart     = db.Column(db.String(100), nullable=False)
    arrivee    = db.Column(db.String(100), nullable=False)
    km         = db.Column(db.Float, default=0)
    tarif      = db.Column(db.Float, default=0)
    frequence  = db.Column(db.Integer, default=1)   # voyages/jour
    couleur    = db.Column(db.String(10), default='#C9A84C')
    actif      = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    saisies   = db.relationship('Saisie',   backref='ligne', lazy='dynamic')
    vehicules = db.relationship('Vehicule', backref='ligne', lazy='dynamic')

    def __repr__(self):
        return f'<Ligne {self.code}: {self.depart}→{self.arrivee}>'
PYEOF

cat > app/models/vehicule.py << 'PYEOF'
from app.extensions import db
from datetime import datetime

STATUTS = ['operationnel', 'maintenance', 'panne', 'retire']

class Vehicule(db.Model):
    __tablename__ = 'vehicules'

    id          = db.Column(db.Integer, primary_key=True)
    plaque      = db.Column(db.String(20),  unique=True, nullable=False)
    modele      = db.Column(db.String(100), nullable=False)
    capacite    = db.Column(db.Integer, default=16)
    ligne_id    = db.Column(db.Integer, db.ForeignKey('lignes.id'), nullable=True)
    km_actuel   = db.Column(db.Float, default=0)
    km_maintenance = db.Column(db.Float, default=50000)
    exp_vt      = db.Column(db.Date, nullable=True)   # visite technique
    exp_assurance = db.Column(db.Date, nullable=True)
    statut      = db.Column(db.String(20), default='operationnel')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def km_restants(self):
        return self.km_maintenance - self.km_actuel

    def statut_badge(self):
        badges = {
            'operationnel': ('ok',   '✓ OK'),
            'maintenance':  ('warn', '🔧 Maint.'),
            'panne':        ('err',  '🔴 Panne'),
            'retire':       ('info', '⊘ Retiré'),
        }
        return badges.get(self.statut, ('info', self.statut))

    def __repr__(self):
        return f'<Vehicule {self.plaque}>'
PYEOF

cat > app/models/saisie.py << 'PYEOF'
from app.extensions import db
from datetime import datetime

class Saisie(db.Model):
    """Saisie journalière d'exploitation — une ligne = un jour + une ligne"""
    __tablename__ = 'saisies'

    id              = db.Column(db.Integer, primary_key=True)
    date            = db.Column(db.Date,    nullable=False)
    ligne_id        = db.Column(db.Integer, db.ForeignKey('lignes.id'), nullable=False)
    saisi_par       = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'))

    # Exploitation
    voyages         = db.Column(db.Integer, default=0)
    passagers       = db.Column(db.Integer, default=0)
    capacite        = db.Column(db.Integer, default=0)
    km              = db.Column(db.Float,   default=0)
    dep_heure       = db.Column(db.Integer, default=0)    # minutes de retard total départ
    retard_total    = db.Column(db.Integer, default=0)    # minutes
    annulations     = db.Column(db.Integer, default=0)
    cause_annul     = db.Column(db.String(200), nullable=True)
    creneau         = db.Column(db.String(20), nullable=True)

    # Finances
    rec_guichet     = db.Column(db.Float, default=0)
    rec_reservation = db.Column(db.Float, default=0)
    rec_digital     = db.Column(db.Float, default=0)
    dep_carburant   = db.Column(db.Float, default=0)
    litres          = db.Column(db.Float, default=0)
    dep_autres      = db.Column(db.Float, default=0)

    # Réservations
    reservations    = db.Column(db.Integer, default=0)
    anticipees      = db.Column(db.Integer, default=0)

    # Qualité
    reclamations    = db.Column(db.Integer, default=0)
    type_rec        = db.Column(db.String(100), nullable=True)
    satisfaction    = db.Column(db.Float, default=0)   # /100
    nps             = db.Column(db.Float, default=0)   # -100 à +100

    # Incidents
    incidents       = db.Column(db.Integer, default=0)
    panne_class     = db.Column(db.String(50), nullable=True)
    duree_panne     = db.Column(db.Float, default=0)   # heures

    observations    = db.Column(db.Text, nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    # Relations
    auteur = db.relationship('Utilisateur', foreign_keys=[saisi_par])

    def recettes_total(self):
        return (self.rec_guichet or 0) + (self.rec_reservation or 0) + (self.rec_digital or 0)

    def depenses_total(self):
        return (self.dep_carburant or 0) + (self.dep_autres or 0)

    def marge(self):
        return self.recettes_total() - self.depenses_total()

    def taux_remplissage(self):
        if self.capacite:
            return round(self.passagers / self.capacite * 100, 1)
        return 0

    def conso_100km(self):
        if self.km:
            return round((self.litres or 0) / self.km * 100, 1)
        return 0

    def __repr__(self):
        return f'<Saisie {self.date} L{self.ligne_id}>'
PYEOF

cat > app/models/alerte.py << 'PYEOF'
from app.extensions import db
from datetime import datetime

TYPES = ['maintenance', 'document', 'finance', 'exploitation', 'info']
NIVEAUX = ['critical', 'warning', 'info', 'success']

class Alerte(db.Model):
    __tablename__ = 'alertes'

    id         = db.Column(db.Integer, primary_key=True)
    type_alerte= db.Column(db.String(30), default='info')
    niveau     = db.Column(db.String(20), default='info')
    titre      = db.Column(db.String(200), nullable=False)
    message    = db.Column(db.Text, nullable=True)
    lue        = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Alerte {self.niveau}: {self.titre[:40]}>'
PYEOF

echo "  ✓ Models (Utilisateur, Ligne, Vehicule, Saisie, Alerte)"

# ═══════════════════════════════════════════════════════════════════════════
#  UTILS
# ═══════════════════════════════════════════════════════════════════════════
cat > app/utils/__init__.py << 'PYEOF'
PYEOF

cat > app/utils/decorators.py << 'PYEOF'
from functools import wraps
from flask import abort, flash, redirect, url_for
from flask_login import current_user

def role_required(*roles):
    """Décorateur : accès restreint aux rôles listés."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.role not in roles:
                flash("Accès refusé — droits insuffisants.", "danger")
                return redirect(url_for('dashboard.index'))
            return f(*args, **kwargs)
        return decorated
    return decorator

def niveau_min(niveau):
    """Décorateur : niveau hiérarchique minimum requis."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.niveau() < niveau:
                flash("Accès refusé — niveau hiérarchique insuffisant.", "danger")
                return redirect(url_for('dashboard.index'))
            return f(*args, **kwargs)
        return decorated
    return decorator

def can_saisir(f):
    """Décorateur : peut effectuer des saisies (chef, superviseur, admin)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.role not in ('admin', 'chef', 'superviseur'):
            flash("Vous n'avez pas l'autorisation de saisir des données.", "danger")
            return redirect(url_for('dashboard.index'))
        return f(*args, **kwargs)
    return decorated
PYEOF

cat > app/utils/helpers.py << 'PYEOF'
def format_fcfa(valeur):
    """Formater un montant en FCFA lisible."""
    if valeur is None:
        return '—'
    if abs(valeur) >= 1_000_000:
        return f"{valeur/1_000_000:.1f}M"
    if abs(valeur) >= 1_000:
        return f"{valeur/1_000:.0f}k"
    return f"{int(valeur):,}".replace(',', ' ')

def format_pct(val, decimals=1):
    return f"{val:.{decimals}f}%"

def badge_class(valeur, seuil_ok, seuil_warn, inverse=False):
    """Renvoie la classe CSS du badge selon les seuils."""
    if inverse:
        if valeur <= seuil_ok:   return 'bok'
        if valeur <= seuil_warn: return 'bwn'
        return 'bal'
    else:
        if valeur >= seuil_ok:   return 'bok'
        if valeur >= seuil_warn: return 'bwn'
        return 'bal'
PYEOF

echo "  ✓ Utils (decorators, helpers)"

# ═══════════════════════════════════════════════════════════════════════════
#  SERVICES
# ═══════════════════════════════════════════════════════════════════════════
cat > app/services/__init__.py << 'PYEOF'
PYEOF

cat > app/services/kpi_service.py << 'PYEOF'
"""Calcul des KPIs principaux à partir des saisies."""
from app.models.saisie  import Saisie
from app.models.vehicule import Vehicule
from app.models.alerte  import Alerte
from datetime import datetime, timedelta

def kpis_globaux(periode_jours=30):
    """Retourne un dict de KPIs pour le dashboard principal."""
    depuis = datetime.utcnow().date() - timedelta(days=periode_jours)
    saisies = Saisie.query.filter(Saisie.date >= depuis).all()

    if not saisies:
        return {}

    rec   = sum(s.recettes_total() for s in saisies)
    dep   = sum(s.depenses_total() for s in saisies)
    marge = rec - dep
    voy   = sum(s.voyages     for s in saisies)
    pass_ = sum(s.passagers   for s in saisies)
    capa  = sum(s.capacite    for s in saisies)
    km    = sum(s.km          for s in saisies)
    litres= sum((s.litres or 0) for s in saisies)
    nps_  = [s.nps for s in saisies if s.nps]

    return {
        'recettes':         rec,
        'depenses':         dep,
        'marge':            marge,
        'taux_marge':       round(marge / rec * 100, 1) if rec else 0,
        'voyages':          voy,
        'passagers':        pass_,
        'taux_remplissage': round(pass_ / capa * 100, 1) if capa else 0,
        'km_total':         km,
        'conso_100km':      round(litres / km * 100, 1) if km else 0,
        'nps_moyen':        round(sum(nps_) / len(nps_), 1) if nps_ else 0,
        'nb_saisies':       len(saisies),
    }

def alertes_actives():
    return Alerte.query.filter_by(lue=False).order_by(Alerte.created_at.desc()).all()

def vehicules_alertes():
    """Véhicules nécessitant attention (maintenance, documents)."""
    from datetime import date
    veh = Vehicule.query.all()
    alertes = []
    today = date.today()
    for v in veh:
        if v.km_restants() <= 0:
            alertes.append(('critical', f'{v.plaque} — Maintenance dépassée'))
        elif v.km_restants() <= 2000:
            alertes.append(('warning', f'{v.plaque} — Maintenance dans {int(v.km_restants())} km'))
        if v.exp_vt:
            jours = (v.exp_vt - today).days
            if jours <= 0:
                alertes.append(('critical', f'{v.plaque} — Visite technique expirée'))
            elif jours <= 30:
                alertes.append(('warning', f'{v.plaque} — VT dans {jours} jours'))
    return alertes
PYEOF

cat > app/services/alerte_service.py << 'PYEOF'
"""Génération automatique des alertes."""
from app.extensions import db
from app.models.alerte import Alerte
from app.services.kpi_service import vehicules_alertes

def generer_alertes_auto():
    """Analyse la flotte et insère des alertes si nécessaire."""
    for niveau, message in vehicules_alertes():
        existe = Alerte.query.filter_by(titre=message, lue=False).first()
        if not existe:
            a = Alerte(
                type_alerte='maintenance',
                niveau=niveau,
                titre=message,
                message='Vérification requise.'
            )
            db.session.add(a)
    db.session.commit()
PYEOF

echo "  ✓ Services (kpi_service, alerte_service)"

# ═══════════════════════════════════════════════════════════════════════════
#  BLUEPRINTS — __init__.py pour chacun
# ═══════════════════════════════════════════════════════════════════════════
for bp in auth dashboard saisie lignes flotte finance operations clientele analytique alertes admin api; do
  cat > app/blueprints/${bp}/__init__.py << PYEOF
from flask import Blueprint
${bp}_bp = Blueprint('${bp}', __name__, template_folder='../../templates/${bp}')
from app.blueprints.${bp} import routes  # noqa
PYEOF
done

echo "  ✓ Blueprints __init__.py (x12)"

# ═══════════════════════════════════════════════════════════════════════════
#  BLUEPRINTS — routes.py
# ═══════════════════════════════════════════════════════════════════════════

# ── AUTH ──
cat > app/blueprints/auth/routes.py << 'PYEOF'
from flask import render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from app.blueprints.auth import auth_bp
from app.models.utilisateur import Utilisateur
from datetime import datetime

@auth_bp.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    if request.method == 'POST':
        identifiant = request.form.get('identifiant','').strip()
        password    = request.form.get('password','')
        user = Utilisateur.query.filter_by(identifiant=identifiant, actif=True).first()
        if user and user.check_password(password):
            user.last_login = datetime.utcnow()
            from app.extensions import db
            db.session.commit()
            login_user(user, remember=False)
            flash(f'Bienvenue, {user.nom} !', 'success')
            return redirect(url_for('dashboard.index'))
        flash('Identifiant ou mot de passe incorrect.', 'danger')
    return render_template('auth/login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('auth.login'))
PYEOF

# ── DASHBOARD ──
cat > app/blueprints/dashboard/routes.py << 'PYEOF'
from flask import render_template
from flask_login import login_required, current_user
from app.blueprints.dashboard import dashboard_bp
from app.services.kpi_service import kpis_globaux, alertes_actives

@dashboard_bp.route('/')
@login_required
def index():
    kpis    = kpis_globaux(30)
    alertes = alertes_actives()
    return render_template('dashboard/index.html', kpis=kpis, alertes=alertes)
PYEOF

# ── SAISIE ──
cat > app/blueprints/saisie/routes.py << 'PYEOF'
from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.blueprints.saisie import saisie_bp
from app.extensions import db
from app.models.saisie  import Saisie
from app.models.ligne   import Ligne
from app.utils.decorators import can_saisir
from datetime import date

@saisie_bp.route('/', methods=['GET'])
@login_required
@can_saisir
def index():
    lignes = Ligne.query.filter_by(actif=True).all()
    saisies_recentes = Saisie.query.order_by(Saisie.date.desc()).limit(15).all()
    return render_template('saisie/index.html', lignes=lignes, saisies=saisies_recentes)

@saisie_bp.route('/enregistrer', methods=['POST'])
@login_required
@can_saisir
def enregistrer():
    try:
        s = Saisie(
            date        = date.fromisoformat(request.form['date']),
            ligne_id    = int(request.form['ligne_id']),
            saisi_par   = current_user.id,
            voyages     = int(request.form.get('voyages', 0)),
            passagers   = int(request.form.get('passagers', 0)),
            capacite    = int(request.form.get('capacite', 0)),
            km          = float(request.form.get('km', 0)),
            retard_total= int(request.form.get('retard_total', 0)),
            annulations = int(request.form.get('annulations', 0)),
            cause_annul = request.form.get('cause_annul',''),
            creneau     = request.form.get('creneau',''),
            rec_guichet     = float(request.form.get('rec_guichet', 0)),
            rec_reservation = float(request.form.get('rec_reservation', 0)),
            rec_digital     = float(request.form.get('rec_digital', 0)),
            dep_carburant   = float(request.form.get('dep_carburant', 0)),
            litres      = float(request.form.get('litres', 0)),
            dep_autres  = float(request.form.get('dep_autres', 0)),
            reservations= int(request.form.get('reservations', 0)),
            anticipees  = int(request.form.get('anticipees', 0)),
            reclamations= int(request.form.get('reclamations', 0)),
            type_rec    = request.form.get('type_rec',''),
            satisfaction= float(request.form.get('satisfaction', 0)),
            nps         = float(request.form.get('nps', 0)),
            incidents   = int(request.form.get('incidents', 0)),
            panne_class = request.form.get('panne_class',''),
            duree_panne = float(request.form.get('duree_panne', 0)),
            observations= request.form.get('observations',''),
        )
        db.session.add(s)
        db.session.commit()
        flash('Saisie enregistrée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la saisie : {e}', 'danger')
    return redirect(url_for('saisie.index'))
PYEOF

# ── LIGNES ──
cat > app/blueprints/lignes/routes.py << 'PYEOF'
from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.lignes import lignes_bp
from app.extensions import db
from app.models.ligne import Ligne
from app.utils.decorators import role_required

@lignes_bp.route('/')
@login_required
def index():
    lignes = Ligne.query.filter_by(actif=True).all()
    return render_template('lignes/index.html', lignes=lignes)

@lignes_bp.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin','chef','dg')
def ajouter():
    l = Ligne(
        code      = request.form['code'].upper(),
        nom       = request.form['nom'],
        depart    = request.form['depart'],
        arrivee   = request.form['arrivee'],
        km        = float(request.form.get('km',0)),
        tarif     = float(request.form.get('tarif',0)),
        frequence = int(request.form.get('frequence',1)),
    )
    db.session.add(l); db.session.commit()
    flash(f'Ligne {l.code} créée.', 'success')
    return redirect(url_for('lignes.index'))
PYEOF

# ── FLOTTE ──
cat > app/blueprints/flotte/routes.py << 'PYEOF'
from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.flotte import flotte_bp
from app.extensions import db
from app.models.vehicule import Vehicule
from app.models.ligne    import Ligne
from app.utils.decorators import role_required

@flotte_bp.route('/')
@login_required
def index():
    vehicules = Vehicule.query.all()
    lignes    = Ligne.query.filter_by(actif=True).all()
    return render_template('flotte/index.html', vehicules=vehicules, lignes=lignes)

@flotte_bp.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin','chef','dg')
def ajouter():
    from datetime import date
    v = Vehicule(
        plaque      = request.form['plaque'].upper(),
        modele      = request.form['modele'],
        capacite    = int(request.form.get('capacite', 16)),
        ligne_id    = int(request.form['ligne_id']) if request.form.get('ligne_id') else None,
        km_actuel   = float(request.form.get('km_actuel', 0)),
        km_maintenance = float(request.form.get('km_maintenance', 50000)),
        exp_vt      = date.fromisoformat(request.form['exp_vt']) if request.form.get('exp_vt') else None,
        exp_assurance = date.fromisoformat(request.form['exp_assurance']) if request.form.get('exp_assurance') else None,
    )
    db.session.add(v); db.session.commit()
    flash(f'Véhicule {v.plaque} ajouté.', 'success')
    return redirect(url_for('flotte.index'))
PYEOF

# ── FINANCE ──
cat > app/blueprints/finance/routes.py << 'PYEOF'
from flask import render_template
from flask_login import login_required
from app.blueprints.finance import finance_bp
from app.models.saisie import Saisie
from app.models.ligne  import Ligne
from app.utils.decorators import role_required

@finance_bp.route('/')
@login_required
@role_required('admin','dg','auditeur')
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    lignes  = Ligne.query.filter_by(actif=True).all()
    return render_template('finance/index.html', saisies=saisies, lignes=lignes)
PYEOF

# ── OPERATIONS ──
cat > app/blueprints/operations/routes.py << 'PYEOF'
from flask import render_template
from flask_login import login_required
from app.blueprints.operations import operations_bp
from app.models.saisie import Saisie

@operations_bp.route('/')
@login_required
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    return render_template('operations/index.html', saisies=saisies)
PYEOF

# ── CLIENTELE ──
cat > app/blueprints/clientele/routes.py << 'PYEOF'
from flask import render_template
from flask_login import login_required
from app.blueprints.clientele import clientele_bp
from app.models.saisie import Saisie
from app.utils.decorators import role_required

@clientele_bp.route('/')
@login_required
@role_required('admin','dg','chef')
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    return render_template('clientele/index.html', saisies=saisies)
PYEOF

# ── ANALYTIQUE ──
cat > app/blueprints/analytique/routes.py << 'PYEOF'
from flask import render_template
from flask_login import login_required
from app.blueprints.analytique import analytique_bp
from app.services.kpi_service  import kpis_globaux
from app.models.saisie import Saisie
from app.utils.decorators import role_required

@analytique_bp.route('/')
@login_required
@role_required('admin','dg','auditeur')
def index():
    kpis    = kpis_globaux(90)
    saisies = Saisie.query.order_by(Saisie.date.asc()).all()
    return render_template('analytique/index.html', kpis=kpis, saisies=saisies)
PYEOF

# ── ALERTES ──
cat > app/blueprints/alertes/routes.py << 'PYEOF'
from flask import render_template, redirect, url_for
from flask_login import login_required
from app.blueprints.alertes import alertes_bp
from app.extensions import db
from app.models.alerte import Alerte
from app.services.alerte_service import generer_alertes_auto

@alertes_bp.route('/')
@login_required
def index():
    generer_alertes_auto()
    alertes = Alerte.query.order_by(Alerte.created_at.desc()).all()
    return render_template('alertes/index.html', alertes=alertes)

@alertes_bp.route('/marquer-lue/<int:alerte_id>')
@login_required
def marquer_lue(alerte_id):
    a = Alerte.query.get_or_404(alerte_id)
    a.lue = True
    db.session.commit()
    return redirect(url_for('alertes.index'))
PYEOF

# ── ADMIN ──
cat > app/blueprints/admin/routes.py << 'PYEOF'
from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.admin import admin_bp
from app.extensions import db
from app.models.utilisateur import Utilisateur, ROLES
from app.utils.decorators import role_required

@admin_bp.route('/')
@login_required
@role_required('admin')
def index():
    users = Utilisateur.query.all()
    return render_template('admin/index.html', users=users, roles=ROLES)

@admin_bp.route('/ajouter-utilisateur', methods=['POST'])
@login_required
@role_required('admin')
def ajouter_utilisateur():
    u = Utilisateur(
        identifiant = request.form['identifiant'].strip(),
        nom         = request.form['nom'].strip(),
        role        = request.form['role'],
        agence      = request.form.get('agence',''),
    )
    u.set_password(request.form['password'])
    db.session.add(u); db.session.commit()
    flash(f'Utilisateur {u.identifiant} créé.', 'success')
    return redirect(url_for('admin.index'))

@admin_bp.route('/supprimer-utilisateur/<int:uid>', methods=['POST'])
@login_required
@role_required('admin')
def supprimer_utilisateur(uid):
    u = Utilisateur.query.get_or_404(uid)
    db.session.delete(u); db.session.commit()
    flash(f'Utilisateur supprimé.', 'warning')
    return redirect(url_for('admin.index'))
PYEOF

# ── API ──
cat > app/blueprints/api/routes.py << 'PYEOF'
from flask import jsonify
from flask_login import login_required
from app.blueprints.api import api_bp
from app.models.saisie  import Saisie
from app.models.vehicule import Vehicule
from app.models.ligne   import Ligne
from app.services.kpi_service import kpis_globaux

@api_bp.route('/kpis')
@login_required
def kpis():
    return jsonify(kpis_globaux(30))

@api_bp.route('/saisies')
@login_required
def saisies():
    s = Saisie.query.order_by(Saisie.date.desc()).limit(50).all()
    return jsonify([{
        'date': str(r.date), 'recettes': r.recettes_total(),
        'depenses': r.depenses_total(), 'marge': r.marge(),
        'voyages': r.voyages, 'passagers': r.passagers,
    } for r in s])
PYEOF

echo "  ✓ Blueprints routes.py (x12)"

# ═══════════════════════════════════════════════════════════════════════════
#  TEMPLATES — BASE
# ═══════════════════════════════════════════════════════════════════════════
cat > app/templates/base/base.html << 'HTMLEOF'
{#
  app/templates/base/base.html
  VoyageIQ Pro — Template de base
  Navbar avec menu selon le rôle utilisateur
  context_processor inject_globals() requis dans app/__init__.py
#}
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}VoyageIQ Pro{% endblock %} — Gestion Transport</title>

  <link rel="icon" type="image/png"
        href="{{ url_for('static', filename='images/logos/logo.png') }}"
        onerror="">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet">
  <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

  <link rel="stylesheet" href="{{ url_for('static', filename='css/base/reset.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/base/variables.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/base/main.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/components/navbar.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/components/footer.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/components/alerts.css') }}">

  {% block page_css %}{% endblock %}
</head>
<body>

<!-- ══ NAVBAR ══ -->
<nav class="navbar" id="navbar">

  <!-- Brand -->
  <a href="{{ url_for('dashboard.index') }}" class="brand">
    <div class="brand-icon">🚌</div>
    <div class="brand-text">
      <span class="brand-name">VoyageIQ</span>
      <span class="brand-sub">Pro v1.0</span>
    </div>
  </a>

  <!-- Toggler mobile -->
  <button class="nav-toggler" id="navToggler"
          aria-label="Ouvrir le menu" aria-expanded="false">
    <span></span><span></span><span></span>
  </button>

  <!-- Menu principal -->
  <ul class="nav-menu" id="navMenu">

    {% if current_user.is_authenticated %}

      <li>
        <a href="{{ url_for('dashboard.index') }}"
           class="nav-link {% if request.endpoint == 'dashboard.index' %}active{% endif %}">
          <i class="fas fa-th-large"></i> Tableau de bord
        </a>
      </li>

      {% if current_user.can_access('saisie') %}
      <li>
        <a href="{{ url_for('saisie.index') }}"
           class="nav-link {% if 'saisie' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-edit"></i> Saisie du Jour
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('lignes') %}
      <li>
        <a href="{{ url_for('lignes.index') }}"
           class="nav-link {% if 'lignes' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-route"></i> Lignes
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('flotte') %}
      <li>
        <a href="{{ url_for('flotte.index') }}"
           class="nav-link {% if 'flotte' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-bus"></i> Flotte
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('finance') %}
      <li>
        <a href="{{ url_for('finance.index') }}"
           class="nav-link {% if 'finance' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-coins"></i> Finance
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('operations') %}
      <li>
        <a href="{{ url_for('operations.index') }}"
           class="nav-link {% if 'operations' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-bolt"></i> Opérations
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('clientele') %}
      <li>
        <a href="{{ url_for('clientele.index') }}"
           class="nav-link {% if 'clientele' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-star"></i> Clientèle
        </a>
      </li>
      {% endif %}

      {% if current_user.can_access('analytique') %}
      <li>
        <a href="{{ url_for('analytique.index') }}"
           class="nav-link {% if 'analytique' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-chart-bar"></i> Analytique
        </a>
      </li>
      {% endif %}

      <li>
        <a href="{{ url_for('alertes.index') }}"
           class="nav-link {% if 'alertes' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-bell"></i> Alertes
        </a>
      </li>

      <li class="nav-sep"></li>

      {% if current_user.can_access('admin') %}
      <li>
        <a href="{{ url_for('admin.index') }}"
           class="nav-link nav-link-admin {% if 'admin' in (request.endpoint or '') %}active{% endif %}">
          <i class="fas fa-cog"></i> Administration
        </a>
      </li>
      {% endif %}

      <!-- Profil & Déconnexion -->
      <li class="nav-profile">
        <span class="nav-user-badge">{{ current_user.role[:2].upper() }}</span>
        <span class="nav-user-name">{{ current_user.nom }}</span>
      </li>
      <li>
        <a href="{{ url_for('auth.logout') }}" class="nav-link nav-link-logout">
          <i class="fas fa-sign-out-alt"></i> Déconnexion
        </a>
      </li>

    {% else %}
      <li>
        <a href="{{ url_for('auth.login') }}" class="nav-link">
          <i class="fas fa-sign-in-alt"></i> Connexion
        </a>
      </li>
    {% endif %}

  </ul><!-- /#navMenu -->

</nav>

<div class="nav-overlay" id="navOverlay"></div>

<!-- ══ FLASH MESSAGES ══ -->
{% with messages = get_flashed_messages(with_categories=true) %}
  {% if messages %}
    <div class="flash-zone">
      {% for category, message in messages %}
      <div class="alert alert-{{ category }}">
        {% if category == 'success' %}<i class="fas fa-check-circle"></i>
        {% elif category in ['error','danger'] %}<i class="fas fa-times-circle"></i>
        {% elif category == 'warning' %}<i class="fas fa-exclamation-triangle"></i>
        {% else %}<i class="fas fa-info-circle"></i>{% endif %}
        {{ message }}
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
      </div>
      {% endfor %}
    </div>
  {% endif %}
{% endwith %}

<!-- ══ CONTENU PRINCIPAL ══ -->
<main class="main-content">
  {% block content %}{% endblock %}
</main>

<!-- ══ FOOTER ══ -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">

      <!-- Brand -->
      <div class="footer-brand-col">
        <div class="footer-logo-wrap">
          <div class="footer-logo-icon">🚌</div>
          <div>
            <div class="footer-logo-title">VoyageIQ Pro</div>
            <div class="footer-logo-sub">Gestion Transport — Afrique Centrale</div>
          </div>
        </div>
        <p class="footer-desc">
          Plateforme de gestion de transport interurbain développée pour
          les agences de voyage au Cameroun. Suivi en temps réel des
          lignes, de la flotte et des finances.
        </p>
        <div class="footer-badges">
          <span class="badge-footer">🇨🇲 Cameroun</span>
          <span class="badge-footer">v1.0</span>
          <span class="badge-footer badge-footer-ok">● Opérationnel</span>
        </div>
      </div>

      <!-- Navigation -->
      <div class="footer-col">
        <h4><i class="fas fa-compass"></i> Navigation</h4>
        <ul>
          <li><a href="{{ url_for('dashboard.index') }}"><i class="fas fa-chevron-right"></i> Tableau de bord</a></li>
          <li><a href="{{ url_for('lignes.index') }}"><i class="fas fa-chevron-right"></i> Lignes & Créneaux</a></li>
          <li><a href="{{ url_for('flotte.index') }}"><i class="fas fa-chevron-right"></i> Flotte & Maintenance</a></li>
          <li><a href="{{ url_for('operations.index') }}"><i class="fas fa-chevron-right"></i> Opérations</a></li>
          <li><a href="{{ url_for('analytique.index') }}"><i class="fas fa-chevron-right"></i> Analytique</a></li>
          <li><a href="{{ url_for('alertes.index') }}"><i class="fas fa-chevron-right"></i> Alertes</a></li>
        </ul>
      </div>

      <!-- Modules -->
      <div class="footer-col">
        <h4><i class="fas fa-cubes"></i> Modules</h4>
        <ul>
          <li><a href="{{ url_for('saisie.index') }}"><i class="fas fa-chevron-right"></i> Saisie du Jour</a></li>
          <li><a href="{{ url_for('finance.index') }}"><i class="fas fa-chevron-right"></i> Finance & Coûts</a></li>
          <li><a href="{{ url_for('clientele.index') }}"><i class="fas fa-chevron-right"></i> Clientèle & NPS</a></li>
          <li><a href="{{ url_for('admin.index') }}"><i class="fas fa-chevron-right"></i> Administration</a></li>
        </ul>
        <div style="margin-top:1.2rem">
          <h4><i class="fas fa-shield-alt"></i> Rôles</h4>
          <ul>
            <li><span class="footer-role dg">Direction Générale</span></li>
            <li><span class="footer-role chef">Chef d'Agence</span></li>
            <li><span class="footer-role sup">Superviseur</span></li>
            <li><span class="footer-role aud">Auditeur</span></li>
          </ul>
        </div>
      </div>

      <!-- Contact -->
      <div class="footer-col">
        <h4><i class="fas fa-info-circle"></i> Informations</h4>
        <ul>
          <li><span><i class="fas fa-map-marker-alt"></i> Yaoundé, Cameroun</span></li>
          <li><span><i class="fas fa-envelope"></i> contact@voyageiq.cm</span></li>
          <li><span><i class="fas fa-phone"></i> +237 6XX XXX XXX</span></li>
          <li><span><i class="fas fa-clock"></i> Lun–Ven, 8h–17h</span></li>
        </ul>
        <div style="margin-top:1rem">
          <a href="{{ url_for('auth.login') }}"
             style="font-size:.75rem;color:var(--t3);text-decoration:none;
                    display:inline-flex;align-items:center;gap:.4rem">
            <i class="fas fa-lock"></i> Espace Administration
          </a>
        </div>
      </div>

    </div><!-- /.footer-grid -->

    <div class="footer-bottom">
      <span>© 2024–2026 VoyageIQ Pro — Plateforme de Gestion Transport, Afrique Centrale</span>
      <span>Développé avec <i class="fas fa-heart" style="color:#C9A84C"></i> pour le transport camerounais</span>
    </div>
  </div>
</footer>

<!-- ══ SCRIPTS ══ -->
<script src="{{ url_for('static', filename='js/main.js') }}"></script>
{% block page_js %}{% endblock %}

</body>
</html>
HTMLEOF

echo "  ✓ base.html"

# ═══════════════════════════════════════════════════════════════════════════
#  TEMPLATE AUTH — LOGIN
# ═══════════════════════════════════════════════════════════════════════════
cat > app/templates/auth/login.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoyageIQ Pro — Connexion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/base/reset.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/base/variables.css') }}">
  <link rel="stylesheet" href="{{ url_for('static', filename='css/pages/login.css') }}">
</head>
<body class="login-body">

<div class="login-wrapper">

  <!-- Panel gauche décoratif -->
  <div class="login-panel">
    <div class="login-panel-content">
      <div class="lp-icon">🚌</div>
      <h1 class="lp-title">VoyageIQ Pro</h1>
      <p class="lp-sub">Plateforme de Gestion Transport</p>
      <p class="lp-desc">
        Supervision complète de vos lignes, véhicules, finances
        et opérations depuis un seul tableau de bord.
      </p>
      <div class="lp-features">
        <div class="lp-feat"><i class="fas fa-route"></i> Gestion des lignes</div>
        <div class="lp-feat"><i class="fas fa-bus"></i> Suivi de la flotte</div>
        <div class="lp-feat"><i class="fas fa-coins"></i> Analyse financière</div>
        <div class="lp-feat"><i class="fas fa-chart-bar"></i> Analytique avancée</div>
      </div>
      <div class="lp-location"><i class="fas fa-map-marker-alt"></i> Yaoundé, Cameroun</div>
    </div>
  </div>

  <!-- Formulaire de connexion -->
  <div class="login-form-side">
    <div class="login-box">

      <div class="lb-header">
        <div class="lb-logo">🚌</div>
        <h2 class="lb-title">Connexion</h2>
        <p class="lb-subtitle">Accédez à votre espace selon votre rôle</p>
      </div>

      {% with messages = get_flashed_messages(with_categories=true) %}
        {% if messages %}
          {% for cat, msg in messages %}
          <div class="alert-login alert-{{ cat }}">
            <i class="fas fa-{% if cat == 'success' %}check{% elif cat == 'danger' %}times{% else %}info{% endif %}-circle"></i>
            {{ msg }}
          </div>
          {% endfor %}
        {% endif %}
      {% endwith %}

      <form method="POST" action="{{ url_for('auth.login') }}" autocomplete="off">
        <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">

        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-id-badge"></i> Identifiant
          </label>
          <input type="text" name="identifiant" class="form-input"
                 placeholder="ex: chef.01 / admin"
                 required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-lock"></i> Mot de passe
          </label>
          <div class="input-pwd-wrap">
            <input type="password" name="password" id="pwd" class="form-input"
                   placeholder="••••••••" required>
            <button type="button" class="pwd-toggle" onclick="togglePwd()">
              <i class="fas fa-eye" id="eye-icon"></i>
            </button>
          </div>
        </div>

        <button type="submit" class="btn-login">
          <i class="fas fa-sign-in-alt"></i> Se connecter
        </button>
      </form>

      <!-- Comptes démo visibles -->
      <div class="demo-accounts">
        <div class="demo-title"><i class="fas fa-key"></i> Comptes de démonstration</div>
        <div class="demo-grid">
          <div class="demo-item" onclick="fillLogin('admin','Admin@VIQ2026')">
            <span class="demo-role adm">Admin</span>
            <span class="demo-id">admin</span>
          </div>
          <div class="demo-item" onclick="fillLogin('dg.01','DG@2026')">
            <span class="demo-role dg">DG</span>
            <span class="demo-id">dg.01</span>
          </div>
          <div class="demo-item" onclick="fillLogin('chef.01','Chef1@2026')">
            <span class="demo-role chef">Chef</span>
            <span class="demo-id">chef.01</span>
          </div>
          <div class="demo-item" onclick="fillLogin('sup.01','Sup1@2026')">
            <span class="demo-role sup">Sup.</span>
            <span class="demo-id">sup.01</span>
          </div>
        </div>
      </div>

    </div><!-- /.login-box -->

    <div class="login-footer-note">
      © 2026 VoyageIQ Pro · Plateforme Transport Cameroun
    </div>
  </div>

</div><!-- /.login-wrapper -->

<script>
function togglePwd() {
  const p = document.getElementById('pwd');
  const i = document.getElementById('eye-icon');
  p.type = p.type === 'password' ? 'text' : 'password';
  i.className = p.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}
function fillLogin(id, pwd) {
  document.querySelector('[name=identifiant]').value = id;
  document.getElementById('pwd').value = pwd;
}
</script>
</body>
</html>
HTMLEOF

echo "  ✓ login.html"

# ═══════════════════════════════════════════════════════════════════════════
#  TEMPLATES PAGES (stubs étendant base.html)
# ═══════════════════════════════════════════════════════════════════════════

# Dashboard
cat > app/templates/dashboard/index.html << 'HTMLEOF'
{% extends "base/base.html" %}
{% block title %}Tableau de bord{% endblock %}
{% block page_css %}
<link rel="stylesheet" href="{{ url_for('static', filename='css/pages/dashboard.css') }}">
{% endblock %}
{% block content %}
<div class="page-container">
  <div class="page-header">
    <div>
      <h1 class="page-title"><i class="fas fa-th-large"></i> Tableau de bord</h1>
      <p class="page-sub">Vue d'ensemble — KPIs des 30 derniers jours</p>
    </div>
    <div class="page-header-right">
      <span class="role-badge {{ current_user.role }}">{{ current_user.role_label() }}</span>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card" style="--cc:#C9A84C">
      <div class="kpi-label">Recettes totales</div>
      <div class="kpi-value">{{ '{:,.0f}'.format(kpis.get('recettes',0)) }} F</div>
      <div class="kpi-sub">FCFA — 30 jours</div>
      <div class="kpi-icon">◈</div>
    </div>
    <div class="kpi-card" style="--cc:#22C55E">
      <div class="kpi-label">Marge brute</div>
      <div class="kpi-value">{{ '{:,.0f}'.format(kpis.get('marge',0)) }} F</div>
      <div class="kpi-sub">{{ kpis.get('taux_marge',0) }}% de marge</div>
      <div class="kpi-icon">◉</div>
    </div>
    <div class="kpi-card" style="--cc:#60A5FA">
      <div class="kpi-label">Voyages effectués</div>
      <div class="kpi-value">{{ kpis.get('voyages',0) }}</div>
      <div class="kpi-sub">{{ kpis.get('passagers',0) }} passagers</div>
      <div class="kpi-icon">🚌</div>
    </div>
    <div class="kpi-card" style="--cc:#F59E0B">
      <div class="kpi-label">Taux de remplissage</div>
      <div class="kpi-value">{{ kpis.get('taux_remplissage',0) }}%</div>
      <div class="kpi-sub">Objectif : 80%</div>
      <div class="kpi-icon">📊</div>
    </div>
    <div class="kpi-card" style="--cc:#A855F7">
      <div class="kpi-label">NPS moyen</div>
      <div class="kpi-value">{{ kpis.get('nps_moyen',0) }}</div>
      <div class="kpi-sub">Score satisfaction</div>
      <div class="kpi-icon">⭐</div>
    </div>
  </div>

  <!-- Alertes récentes -->
  {% if alertes %}
  <div class="section-card">
    <div class="section-header">
      <h3><i class="fas fa-bell"></i> Alertes actives</h3>
      <a href="{{ url_for('alertes.index') }}" class="btn btn-sm">Voir tout</a>
    </div>
    {% for a in alertes[:5] %}
    <div class="alert-item alert-{{ a.niveau }}">
      <i class="fas fa-{% if a.niveau == 'critical' %}exclamation-circle{% elif a.niveau == 'warning' %}exclamation-triangle{% else %}info-circle{% endif %}"></i>
      <span>{{ a.titre }}</span>
      <span class="alert-date">{{ a.created_at.strftime('%d/%m %H:%M') }}</span>
    </div>
    {% endfor %}
  </div>
  {% endif %}

  <!-- Pas encore de données -->
  {% if kpis.get('nb_saisies', 0) == 0 %}
  <div class="empty-state">
    <div class="empty-icon">📋</div>
    <h3>Aucune donnée pour le moment</h3>
    <p>Commencez par effectuer une saisie journalière pour voir vos KPIs.</p>
    {% if current_user.can_access('saisie') %}
    <a href="{{ url_for('saisie.index') }}" class="btn btn-gold">
      <i class="fas fa-edit"></i> Faire une saisie
    </a>
    {% endif %}
  </div>
  {% endif %}

</div>
{% endblock %}
{% block page_js %}
<script src="{{ url_for('static', filename='js/modules/dashboard.js') }}"></script>
{% endblock %}
HTMLEOF

# Stubs pour les autres pages
for page in saisie lignes flotte finance operations clientele analytique alertes; do
LABEL=$(echo $page | sed 's/saisie/Saisie du Jour/;s/lignes/Lignes \& Créneaux/;s/flotte/Flotte \& Maintenance/;s/finance/Finance \& Coûts/;s/operations/Opérations/;s/clientele/Clientèle \& NPS/;s/analytique/Analytique/;s/alertes/Alertes/')
cat > app/templates/${page}/index.html << HTMLEOF
{% extends "base/base.html" %}
{% block title %}${LABEL}{% endblock %}
{% block page_css %}
<link rel="stylesheet" href="{{ url_for('static', filename='css/pages/${page}.css') }}">
{% endblock %}
{% block content %}
<div class="page-container">
  <div class="page-header">
    <h1 class="page-title">${LABEL}</h1>
    <p class="page-sub">Module en cours de développement</p>
  </div>
  <div class="section-card">
    <p style="color:var(--t2);padding:2rem;text-align:center">
      <i class="fas fa-tools" style="font-size:2rem;margin-bottom:1rem;display:block;color:var(--gold)"></i>
      Ce module sera complété prochainement.<br>
      La structure de base est en place.
    </p>
  </div>
</div>
{% endblock %}
HTMLEOF
done

# Admin
cat > app/templates/admin/index.html << 'HTMLEOF'
{% extends "base/base.html" %}
{% block title %}Administration{% endblock %}
{% block content %}
<div class="page-container">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-cog"></i> Administration</h1>
    <p class="page-sub">Gestion des utilisateurs et du système</p>
  </div>
  <div class="section-card">
    <div class="section-header">
      <h3><i class="fas fa-users"></i> Utilisateurs ({{ users|length }})</h3>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>ID</th><th>Nom</th><th>Rôle</th><th>Agence</th><th>Statut</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {% for u in users %}
        <tr>
          <td><code>{{ u.identifiant }}</code></td>
          <td>{{ u.nom }}</td>
          <td><span class="role-badge {{ u.role }}">{{ u.role_label() }}</span></td>
          <td>{{ u.agence or '—' }}</td>
          <td><span class="badge-status {% if u.actif %}ok{% else %}err{% endif %}">
            {{ 'Actif' if u.actif else 'Inactif' }}</span></td>
          <td>
            <form method="POST" action="{{ url_for('admin.supprimer_utilisateur', uid=u.id) }}"
                  onsubmit="return confirm('Supprimer {{ u.nom }} ?')">
              <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
              <button class="btn btn-sm btn-err" type="submit">Supprimer</button>
            </form>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>
</div>
{% endblock %}
HTMLEOF

# Erreurs
cat > app/templates/errors/404.html << 'HTMLEOF'
{% extends "base/base.html" %}
{% block title %}Page introuvable{% endblock %}
{% block content %}
<div class="error-page">
  <div class="error-code">404</div>
  <h2>Page introuvable</h2>
  <p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
  <a href="{{ url_for('dashboard.index') }}" class="btn btn-gold">
    <i class="fas fa-home"></i> Retour au tableau de bord
  </a>
</div>
{% endblock %}
HTMLEOF

cat > app/templates/errors/500.html << 'HTMLEOF'
{% extends "base/base.html" %}
{% block title %}Erreur serveur{% endblock %}
{% block content %}
<div class="error-page">
  <div class="error-code">500</div>
  <h2>Erreur interne du serveur</h2>
  <p>Une erreur inattendue s'est produite. Contactez l'administrateur.</p>
  <a href="{{ url_for('dashboard.index') }}" class="btn btn-gold">
    <i class="fas fa-home"></i> Retour au tableau de bord
  </a>
</div>
{% endblock %}
HTMLEOF

echo "  ✓ Templates HTML"

# ═══════════════════════════════════════════════════════════════════════════
#  CSS — VARIABLES & RESET
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/css/base/reset.css << 'CSSEOF'
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
img { display: block; max-width: 100%; }
button, input, select, textarea { font-family: inherit; font-size: inherit; }
a { text-decoration: none; color: inherit; }
ul, ol { list-style: none; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
CSSEOF

cat > app/static/css/base/variables.css << 'CSSEOF'
:root {
  /* Backgrounds */
  --bg:      #0A0A0A;
  --bg2:     #111111;
  --bg3:     #181818;
  --card:    #141414;
  --card2:   #1C1C1C;

  /* Borders */
  --border:  #2A2A2A;
  --border2: #3A3A2A;

  /* Brand */
  --gold:    #C9A84C;
  --gold2:   #E8C96A;
  --gold3:   #A07830;

  /* Status */
  --ok:      #22C55E;
  --warn:    #F59E0B;
  --err:     #EF4444;
  --info:    #60A5FA;
  --purple:  #A855F7;

  /* Text */
  --t:       #F5F0E8;
  --t2:      #9A9080;
  --t3:      #5A5048;
  --t4:      #2A2520;

  /* Fonts */
  --font-main:  'DM Sans', sans-serif;
  --font-head:  'Syne', sans-serif;
  --font-mono:  'Space Mono', monospace;

  /* Spacing */
  --radius:   10px;
  --radius-sm: 6px;
  --radius-lg: 16px;

  /* Navbar */
  --navbar-h: 56px;
}
CSSEOF

cat > app/static/css/base/main.css << 'CSSEOF'
body {
  background: var(--bg);
  color: var(--t);
  font-family: var(--font-main);
  font-size: 13px;
  line-height: 1.5;
}

/* ── PAGE LAYOUT ── */
.main-content {
  min-height: calc(100vh - var(--navbar-h));
  padding-top: var(--navbar-h);
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.page-title {
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 800;
  color: var(--t);
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title i { color: var(--gold); }
.page-sub { font-size: 12px; color: var(--t3); margin-top: 3px; font-family: var(--font-mono); }

/* ── SECTION CARD ── */
.section-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.section-header h3 {
  font-family: var(--font-head);
  font-size: 13px;
  font-weight: 700;
  color: var(--t);
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-header h3 i { color: var(--gold); }

/* ── KPI GRID ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  position: relative;
  overflow: hidden;
  transition: transform .12s, border-color .12s;
}
.kpi-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--cc, var(--gold)), transparent);
}
.kpi-card:hover { transform: translateY(-2px); border-color: var(--border2); }
.kpi-label {
  font-size: 9px; letter-spacing: .8px; color: var(--t3);
  text-transform: uppercase; font-family: var(--font-mono); margin-bottom: 6px;
}
.kpi-value {
  font-family: var(--font-head); font-size: 20px; font-weight: 800;
  color: var(--cc, var(--gold)); line-height: 1; margin-bottom: 4px;
}
.kpi-sub { font-size: 10px; color: var(--t3); }
.kpi-icon {
  position: absolute; right: 10px; top: 10px;
  font-size: 22px; opacity: .06;
}

/* ── BUTTONS ── */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 12px; font-weight: 500; cursor: pointer;
  border: 1px solid var(--border); font-family: var(--font-main);
  transition: all .12s; white-space: nowrap;
  background: var(--card); color: var(--t2);
}
.btn:hover { border-color: var(--gold); color: var(--gold); }
.btn-gold { background: linear-gradient(135deg,var(--gold3),var(--gold)); color:#0A0A0A; border-color:transparent; font-weight:700; }
.btn-gold:hover { box-shadow: 0 4px 14px rgba(201,168,76,.3); color:#0A0A0A; }
.btn-err  { background:rgba(239,68,68,.07); color:var(--err); border-color:rgba(239,68,68,.2); }
.btn-sm   { padding: 3px 9px; font-size: 11px; }

/* ── ROLE BADGES ── */
.role-badge {
  display: inline-flex; padding: 2px 10px; border-radius: 6px;
  font-size: 10px; font-family: var(--font-mono); font-weight: 700;
}
.role-badge.admin  { background:rgba(239,68,68,.1);   color:var(--err);    border:1px solid rgba(239,68,68,.2); }
.role-badge.dg     { background:rgba(201,168,76,.15);  color:var(--gold);   border:1px solid rgba(201,168,76,.25); }
.role-badge.chef   { background:rgba(96,165,250,.12);  color:var(--info);   border:1px solid rgba(96,165,250,.22); }
.role-badge.superviseur { background:rgba(34,197,94,.1); color:var(--ok);  border:1px solid rgba(34,197,94,.2); }
.role-badge.auditeur    { background:rgba(168,85,247,.1);color:var(--purple);border:1px solid rgba(168,85,247,.2); }

/* ── TABLE ── */
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead th {
  background: var(--card2); padding: 7px 10px; font-size: 9px;
  font-family: var(--font-mono); letter-spacing: .8px; text-transform: uppercase;
  color: var(--t3); text-align: left; border-bottom: 1px solid var(--border);
}
.data-table tbody td {
  padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.03);
  font-size: 12px; color: var(--t2);
}
.data-table tbody tr:hover { background: rgba(201,168,76,.03); }
.data-table tbody tr:last-child td { border-bottom: none; }

/* ── ALERT ITEMS ── */
.alert-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 7px; margin-bottom: 5px;
  border: 1px solid; font-size: 12px;
}
.alert-item.critical { background:rgba(239,68,68,.06); border-color:rgba(239,68,68,.2); color:#EF4444; }
.alert-item.warning  { background:rgba(245,158,11,.06); border-color:rgba(245,158,11,.2); color:#F59E0B; }
.alert-item.info     { background:rgba(201,168,76,.05); border-color:rgba(201,168,76,.15);color:var(--gold); }
.alert-item.success  { background:rgba(34,197,94,.05); border-color:rgba(34,197,94,.15);  color:var(--ok); }
.alert-date { margin-left:auto; font-size:10px; opacity:.6; font-family:var(--font-mono); }

/* ── FLASH ZONE ── */
.flash-zone {
  position: fixed; top: calc(var(--navbar-h) + 8px); right: 16px;
  z-index: 9997; display: flex; flex-direction: column; gap: 6px; max-width: 380px;
}
.alert {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; border-radius: 9px; font-size: 12px; font-weight: 500;
  box-shadow: 0 6px 20px rgba(0,0,0,.4); animation: slideIn .18s ease;
  border: 1px solid;
}
.alert-close { margin-left:auto; background:none; border:none; cursor:pointer; color:inherit; opacity:.6; font-size:14px; }
.alert-success { background:rgba(34,197,94,.1); border-color:rgba(34,197,94,.25); color:var(--ok); }
.alert-danger, .alert-error { background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.25); color:var(--err); }
.alert-warning { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.25); color:var(--warn); }
.alert-info    { background:rgba(96,165,250,.1);  border-color:rgba(96,165,250,.25); color:var(--info); }

/* ── EMPTY STATE ── */
.empty-state {
  text-align: center; padding: 3rem 2rem;
  color: var(--t3);
}
.empty-icon { font-size: 3rem; margin-bottom: 1rem; }
.empty-state h3 { font-family:var(--font-head); font-size:16px; color:var(--t2); margin-bottom:.5rem; }
.empty-state p { margin-bottom:1.2rem; font-size:12px; }

/* ── ERROR PAGE ── */
.error-page {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 60vh; text-align: center; gap: 12px;
}
.error-code {
  font-family: var(--font-head); font-size: 80px; font-weight: 800;
  color: var(--gold); line-height: 1;
}

/* ── BADGE ── */
.badge-status { display:inline-flex; padding:2px 8px; border-radius:6px; font-size:10px; font-family:var(--font-mono); font-weight:600; }
.badge-status.ok  { background:rgba(34,197,94,.1); color:var(--ok); }
.badge-status.err { background:rgba(239,68,68,.1); color:var(--err); }

@keyframes slideIn {
  from { opacity:0; transform:translateX(10px); }
  to   { opacity:1; transform:translateX(0); }
}
CSSEOF

echo "  ✓ CSS base (reset, variables, main)"

# ═══════════════════════════════════════════════════════════════════════════
#  CSS — NAVBAR
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/css/components/navbar.css << 'CSSEOF'
/* ══ NAVBAR ══ */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9000;
  height: var(--navbar-h);
  background: rgba(10,10,10,.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 20px; gap: 12px;
}

/* Brand */
.brand {
  display: flex; align-items: center; gap: 9px;
  text-decoration: none; flex-shrink: 0;
}
.brand-icon {
  font-size: 22px; width: 34px; height: 34px;
  background: linear-gradient(135deg, var(--gold3), var(--gold));
  border-radius: 8px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
}
.brand-name { font-family: var(--font-head); font-size: 15px; font-weight: 800; color: var(--gold); display: block; line-height: 1.1; }
.brand-sub  { font-size: 9px; color: var(--t3); font-family: var(--font-mono); letter-spacing: 1px; }

/* Menu */
.nav-menu {
  display: flex; align-items: center; gap: 2px;
  flex: 1; list-style: none; overflow-x: auto;
  padding: 0; margin: 0;
  scrollbar-width: none;
}
.nav-menu::-webkit-scrollbar { display: none; }

.nav-link {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: var(--radius-sm);
  font-size: 12px; color: var(--t3); white-space: nowrap;
  transition: all .12s; border-left: 2px solid transparent;
  font-weight: 500;
}
.nav-link:hover { color: var(--t2); background: rgba(201,168,76,.05); }
.nav-link.active { color: var(--gold); background: rgba(201,168,76,.08); }
.nav-link i { font-size: 11px; }

.nav-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }

.nav-link-admin { color: var(--err) !important; }
.nav-link-admin:hover { background: rgba(239,68,68,.07) !important; }
.nav-link-logout { color: var(--t3); }
.nav-link-logout:hover { color: var(--err); }

/* Profil inline */
.nav-profile {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 9px; margin-left: 4px;
}
.nav-user-badge {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--gold); color: #0A0A0A;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; font-family: var(--font-mono);
}
.nav-user-name { font-size: 11px; color: var(--t2); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Toggler mobile */
.nav-toggler {
  display: none; flex-direction: column; justify-content: center;
  gap: 5px; background: none; border: none; cursor: pointer;
  padding: 4px; margin-left: auto;
}
.nav-toggler span {
  display: block; width: 20px; height: 2px;
  background: var(--t2); border-radius: 2px;
  transition: all .2s;
}

.nav-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.5); z-index: 8998;
}
.nav-overlay.show { display: block; }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .nav-toggler { display: flex; }
  .nav-menu {
    position: fixed; top: var(--navbar-h); left: 0; right: 0;
    bottom: 0; background: var(--bg2); z-index: 8999;
    flex-direction: column; align-items: stretch; gap: 0;
    padding: 10px 0; overflow-y: auto;
    transform: translateX(-100%); transition: transform .25s ease;
  }
  .nav-menu.open { transform: translateX(0); }
  .nav-link {
    padding: 11px 20px; border-radius: 0; font-size: 13px;
    border-left: 3px solid transparent;
  }
  .nav-link.active { border-left-color: var(--gold); }
  .nav-sep { width: 100%; height: 1px; margin: 4px 0; }
  .nav-profile { padding: 10px 20px; }
}
CSSEOF

# ═══════════════════════════════════════════════════════════════════════════
#  CSS — FOOTER
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/css/components/footer.css << 'CSSEOF'
/* ══ FOOTER ══ */
.footer {
  background: var(--bg2);
  border-top: 1px solid var(--border);
  margin-top: 3rem;
}
.footer-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2.5rem 20px 1.2rem;
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}
@media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 500px) { .footer-grid { grid-template-columns: 1fr; } }

/* Brand col */
.footer-brand-col { }
.footer-logo-wrap {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.footer-logo-icon {
  font-size: 26px; width: 42px; height: 42px;
  background: linear-gradient(135deg, var(--gold3), var(--gold));
  border-radius: 10px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
}
.footer-logo-title {
  font-family: var(--font-head); font-size: 16px;
  font-weight: 800; color: var(--gold);
}
.footer-logo-sub { font-size: 9px; color: var(--t3); font-family: var(--font-mono); }
.footer-desc { font-size: 12px; color: var(--t3); line-height: 1.7; margin-bottom: 14px; }
.footer-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge-footer {
  font-size: 9px; padding: 2px 8px; border-radius: 5px;
  background: var(--bg3); border: 1px solid var(--border);
  color: var(--t3); font-family: var(--font-mono);
}
.badge-footer-ok { color: var(--ok); border-color: rgba(34,197,94,.2); background: rgba(34,197,94,.07); }

/* Nav cols */
.footer-col h4 {
  font-family: var(--font-head); font-size: 12px; font-weight: 700;
  color: var(--t2); margin-bottom: 12px;
  display: flex; align-items: center; gap: 6px;
}
.footer-col h4 i { color: var(--gold); font-size: 11px; }
.footer-col ul { display: flex; flex-direction: column; gap: 6px; }
.footer-col ul li a, .footer-col ul li span {
  font-size: 12px; color: var(--t3); display: flex;
  align-items: center; gap: 6px; transition: color .12s;
}
.footer-col ul li a:hover { color: var(--gold); }
.footer-col ul li a i { font-size: 9px; color: var(--gold3); }

/* Rôles */
.footer-role {
  font-size: 10px; padding: 1px 7px; border-radius: 5px;
  font-family: var(--font-mono); font-weight: 600; display: inline-block;
}
.footer-role.dg   { background:rgba(201,168,76,.1); color:var(--gold); }
.footer-role.chef { background:rgba(96,165,250,.1); color:var(--info); }
.footer-role.sup  { background:rgba(34,197,94,.1);  color:var(--ok); }
.footer-role.aud  { background:rgba(168,85,247,.1); color:var(--purple); }

/* Bottom */
.footer-bottom {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px;
  font-size: 11px; color: var(--t4);
}
CSSEOF

# ═══════════════════════════════════════════════════════════════════════════
#  CSS — ALERTS COMPONENT
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/css/components/alerts.css << 'CSSEOF'
/* Réutilisé via base.html — voir main.css pour les classes .alert */
CSSEOF

# ═══════════════════════════════════════════════════════════════════════════
#  CSS — LOGIN PAGE
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/css/pages/login.css << 'CSSEOF'
/* Réimporte les variables */
:root {
  --bg:#0A0A0A; --bg2:#111111; --bg3:#181818; --card:#141414;
  --border:#2A2A2A; --border2:#3A3A2A;
  --gold:#C9A84C; --gold2:#E8C96A; --gold3:#A07830;
  --ok:#22C55E; --warn:#F59E0B; --err:#EF4444; --info:#60A5FA; --purple:#A855F7;
  --t:#F5F0E8; --t2:#9A9080; --t3:#5A5048;
  --font-main:'DM Sans',sans-serif; --font-head:'Syne',sans-serif; --font-mono:'Space Mono',monospace;
}
* { margin:0; padding:0; box-sizing:border-box; }

.login-body {
  background: var(--bg);
  color: var(--t);
  font-family: var(--font-main);
  min-height: 100vh;
  display: flex;
}

/* ── LAYOUT ── */
.login-wrapper {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

/* ── PANNEAU GAUCHE ── */
.login-panel {
  flex: 1;
  background: linear-gradient(135deg, #0D0B08 0%, #1A1408 50%, #0A0A0A 100%);
  border-right: 1px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  padding: 3rem;
  position: relative;
  overflow: hidden;
}
.login-panel::before {
  content: "🚌";
  position: absolute; bottom: -30px; right: -30px;
  font-size: 200px; opacity: .03;
}
.login-panel-content { max-width: 400px; }
.lp-icon { font-size: 48px; margin-bottom: 16px; }
.lp-title {
  font-family: var(--font-head); font-size: 36px; font-weight: 800;
  color: var(--gold); line-height: 1; margin-bottom: 8px;
}
.lp-sub {
  font-size: 11px; letter-spacing: 2px; color: var(--t3);
  font-family: var(--font-mono); text-transform: uppercase; margin-bottom: 20px;
}
.lp-desc { font-size: 13px; color: var(--t3); line-height: 1.7; margin-bottom: 28px; }
.lp-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
.lp-feat {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--t2);
}
.lp-feat i { color: var(--gold); width: 16px; }
.lp-location { font-size: 11px; color: var(--t4); font-family: var(--font-mono); }
.lp-location i { color: var(--gold3); margin-right: 4px; }

/* ── PANNEAU DROITE (FORM) ── */
.login-form-side {
  width: 440px; flex-shrink: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 2rem; background: var(--bg);
}

.login-box {
  width: 100%; max-width: 380px;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0,0,0,.7);
}
.lb-header { text-align: center; margin-bottom: 22px; }
.lb-logo { font-size: 36px; margin-bottom: 10px; }
.lb-title {
  font-family: var(--font-head); font-size: 22px; font-weight: 800;
  color: var(--gold); margin-bottom: 4px;
}
.lb-subtitle { font-size: 11px; color: var(--t3); font-family: var(--font-mono); }

/* Form */
.form-group { margin-bottom: 14px; }
.form-label {
  display: block; font-size: 9px; letter-spacing: 1px;
  color: var(--t3); text-transform: uppercase;
  font-family: var(--font-mono); margin-bottom: 5px;
}
.form-label i { color: var(--gold3); margin-right: 4px; }
.form-input {
  width: 100%; background: var(--bg3);
  border: 1px solid var(--border); border-radius: 8px;
  padding: 10px 12px; color: var(--t);
  font-family: var(--font-main); font-size: 13px; outline: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,.1); }
.input-pwd-wrap { position: relative; }
.input-pwd-wrap .form-input { padding-right: 38px; }
.pwd-toggle {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%); background: none;
  border: none; cursor: pointer; color: var(--t3);
  transition: color .12s;
}
.pwd-toggle:hover { color: var(--gold); }

.btn-login {
  width: 100%;
  background: linear-gradient(135deg, var(--gold3), var(--gold));
  color: #0A0A0A; border: none; border-radius: 8px;
  padding: 12px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: var(--font-head);
  letter-spacing: .5px; transition: all .15s; margin-top: 6px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-login:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(201,168,76,.3); }

/* Alert login */
.alert-login {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 11px; border-radius: 7px; font-size: 12px;
  margin-bottom: 12px; border: 1px solid;
}
.alert-login.alert-success { background:rgba(34,197,94,.07); border-color:rgba(34,197,94,.2); color:var(--ok); }
.alert-login.alert-danger, .alert-login.alert-error { background:rgba(239,68,68,.07); border-color:rgba(239,68,68,.2); color:var(--err); }
.alert-login.alert-warning { background:rgba(245,158,11,.07); border-color:rgba(245,158,11,.2); color:var(--warn); }
.alert-login.alert-info    { background:rgba(96,165,250,.07); border-color:rgba(96,165,250,.2); color:var(--info); }

/* Comptes démo */
.demo-accounts {
  margin-top: 18px; padding-top: 16px;
  border-top: 1px solid var(--border);
}
.demo-title {
  font-size: 9px; letter-spacing: 1px; color: var(--t3);
  text-transform: uppercase; font-family: var(--font-mono);
  margin-bottom: 8px; display: flex; align-items: center; gap: 5px;
}
.demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.demo-item {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 7px; padding: 6px 9px; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: all .12s;
}
.demo-item:hover { border-color: var(--gold); }
.demo-role {
  font-size: 9px; padding: 1px 5px; border-radius: 4px;
  font-family: var(--font-mono); font-weight: 700;
}
.demo-role.adm  { background:rgba(239,68,68,.12); color:var(--err); }
.demo-role.dg   { background:rgba(201,168,76,.12); color:var(--gold); }
.demo-role.chef { background:rgba(96,165,250,.12); color:var(--info); }
.demo-role.sup  { background:rgba(34,197,94,.12); color:var(--ok); }
.demo-id { font-size: 11px; color: var(--t2); font-family: var(--font-mono); }

.login-footer-note {
  margin-top: 16px; font-size: 10px;
  color: var(--t4); font-family: var(--font-mono); text-align: center;
}

/* Responsive */
@media (max-width: 800px) {
  .login-panel { display: none; }
  .login-form-side { width: 100%; padding: 2rem 1.5rem; }
}
CSSEOF

# CSS pages stubs
for page in dashboard saisie lignes flotte finance operations clientele analytique alertes; do
  cat > app/static/css/pages/${page}.css << CSSEOF
/* Styles spécifiques au module : ${page} */
/* Complétez selon les besoins du module */
CSSEOF
done

echo "  ✓ CSS pages"

# ═══════════════════════════════════════════════════════════════════════════
#  JS — MAIN
# ═══════════════════════════════════════════════════════════════════════════
cat > app/static/js/main.js << 'JSEOF'
/**
 * VoyageIQ Pro — main.js
 * Comportements globaux : navbar mobile, flash auto-close
 */
(function () {
  'use strict';

  /* ── Navbar mobile ── */
  const toggler = document.getElementById('navToggler');
  const menu    = document.getElementById('navMenu');
  const overlay = document.getElementById('navOverlay');

  function openMenu() {
    menu.classList.add('open');
    overlay.classList.add('show');
    toggler.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.remove('open');
    overlay.classList.remove('show');
    toggler.setAttribute('aria-expanded', 'false');
  }

  if (toggler) {
    toggler.addEventListener('click', () =>
      menu.classList.contains('open') ? closeMenu() : openMenu()
    );
  }
  if (overlay) overlay.addEventListener('click', closeMenu);

  /* ── Auto-close flash messages ── */
  document.querySelectorAll('.flash-zone .alert').forEach(a => {
    setTimeout(() => a.remove(), 5000);
  });

})();
JSEOF

# JS modules stubs
cat > app/static/js/modules/dashboard.js << 'JSEOF'
/**
 * dashboard.js — Logique spécifique au tableau de bord
 * Graphiques Chart.js, rafraîchissement KPI, etc.
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Dashboard chargé.');
  // TODO: initialiser les graphiques Chart.js ici
});
JSEOF

for mod in saisie lignes flotte finance operations clientele analytique alertes admin; do
  cat > app/static/js/modules/${mod}.js << JSEOF
/**
 * ${mod}.js — Module ${mod}
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[VoyageIQ] Module ${mod} chargé.');
});
JSEOF
done

echo "  ✓ JS (main.js + modules)"

# ═══════════════════════════════════════════════════════════════════════════
#  DATABASE SEED
# ═══════════════════════════════════════════════════════════════════════════
cat > database/seeds/init_db.py << 'PYEOF'
"""
Initialise la base de données avec :
  - les tables (SQLAlchemy)
  - les comptes utilisateurs de démo
  - quelques lignes et véhicules de démonstration
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import create_app
from app.extensions import db
from app.models.utilisateur import Utilisateur
from app.models.ligne import Ligne
from app.models.vehicule import Vehicule
from datetime import date

app = create_app()

with app.app_context():
    db.create_all()
    print("✓ Tables créées")

    # ── Utilisateurs démo ──
    demo_users = [
        {'id': 'admin',   'pwd': 'Admin@VIQ2026', 'role': 'admin',       'nom': 'Administrateur',        'agence': 'Système'},
        {'id': 'dg.01',   'pwd': 'DG@2026',       'role': 'dg',          'nom': 'Directeur Général 1',   'agence': '—'},
        {'id': 'dg.02',   'pwd': 'DG2@2026',      'role': 'dg',          'nom': 'Directeur Général 2',   'agence': '—'},
        {'id': 'chef.01', 'pwd': 'Chef1@2026',     'role': 'chef',        'nom': "Chef d'Agence 1",       'agence': 'Yaoundé'},
        {'id': 'chef.02', 'pwd': 'Chef2@2026',     'role': 'chef',        'nom': "Chef d'Agence 2",       'agence': 'Douala'},
        {'id': 'sup.01',  'pwd': 'Sup1@2026',      'role': 'superviseur', 'nom': 'Superviseur 1',         'agence': 'Yaoundé'},
        {'id': 'sup.02',  'pwd': 'Sup2@2026',      'role': 'superviseur', 'nom': 'Superviseur 2',         'agence': 'Douala'},
        {'id': 'audit.01','pwd': 'Audit1@2026',    'role': 'auditeur',    'nom': 'Auditeur 1',            'agence': '—'},
    ]
    for u in demo_users:
        if not Utilisateur.query.filter_by(identifiant=u['id']).first():
            user = Utilisateur(identifiant=u['id'], nom=u['nom'], role=u['role'], agence=u['agence'])
            user.set_password(u['pwd'])
            db.session.add(user)
    db.session.commit()
    print("✓ Utilisateurs démo créés")

    # ── Lignes de démonstration ──
    lignes_demo = [
        {'code':'L01','nom':'Yaoundé — Douala',    'dep':'Yaoundé',   'arr':'Douala',    'km':250,'tarif':3500,'freq':8,'color':'#C9A84C'},
        {'code':'L02','nom':'Yaoundé — Bafoussam', 'dep':'Yaoundé',   'arr':'Bafoussam', 'km':310,'tarif':4000,'freq':6,'color':'#A07830'},
        {'code':'L03','nom':'Douala — Kribi',      'dep':'Douala',    'arr':'Kribi',     'km':195,'tarif':2500,'freq':5,'color':'#E8C96A'},
        {'code':'L04','nom':'Yaoundé — Bertoua',   'dep':'Yaoundé',   'arr':'Bertoua',   'km':350,'tarif':4500,'freq':4,'color':'#6B5520'},
        {'code':'L05','nom':'Douala — Bafoussam',  'dep':'Douala',    'arr':'Bafoussam', 'km':375,'tarif':4500,'freq':4,'color':'#8A7040'},
    ]
    for l in lignes_demo:
        if not Ligne.query.filter_by(code=l['code']).first():
            ligne = Ligne(**l)
            db.session.add(ligne)
    db.session.commit()
    print("✓ Lignes démo créées")

    # ── Véhicules de démonstration ──
    l01 = Ligne.query.filter_by(code='L01').first()
    l02 = Ligne.query.filter_by(code='L02').first()
    veh_demo = [
        {'plaque':'LT-2341-A','modele':'Toyota Hiace 2019',      'cap':16,'ligne':l01,'km':48500,'km_m':50000,'vt':'2026-08-15','ass':'2026-06-30'},
        {'plaque':'LT-3892-B','modele':'Toyota Hiace 2020',      'cap':16,'ligne':l01,'km':32100,'km_m':40000,'vt':'2026-11-20','ass':'2026-09-15'},
        {'plaque':'LT-5514-C','modele':'Mercedes Sprinter 2018', 'cap':19,'ligne':l02,'km':72300,'km_m':75000,'vt':'2026-04-30','ass':'2026-05-20','st':'maintenance'},
        {'plaque':'LT-7832-D','modele':'Toyota Hiace 2021',      'cap':16,'ligne':l02,'km':18700,'km_m':30000,'vt':'2026-12-10','ass':'2026-10-25'},
        {'plaque':'LT-9103-E','modele':'Ford Transit 2020',      'cap':14,'ligne':None,'km':55200,'km_m':60000,'vt':'2026-07-08','ass':'2026-07-15'},
    ]
    for v in veh_demo:
        if not Vehicule.query.filter_by(plaque=v['plaque']).first():
            veh = Vehicule(
                plaque=v['plaque'], modele=v['modele'], capacite=v['cap'],
                ligne_id=v['ligne'].id if v.get('ligne') else None,
                km_actuel=v['km'], km_maintenance=v['km_m'],
                exp_vt=date.fromisoformat(v['vt']),
                exp_assurance=date.fromisoformat(v['ass']),
                statut=v.get('st','operationnel'),
            )
            db.session.add(veh)
    db.session.commit()
    print("✓ Véhicules démo créés")

    print("\n╔══════════════════════════════════════╗")
    print("║  Base de données initialisée !       ║")
    print("╠══════════════════════════════════════╣")
    print("║  admin        Admin@VIQ2026          ║")
    print("║  dg.01        DG@2026                ║")
    print("║  chef.01      Chef1@2026             ║")
    print("║  sup.01       Sup1@2026              ║")
    print("║  audit.01     Audit1@2026            ║")
    print("╚══════════════════════════════════════╝")
PYEOF

echo "  ✓ database/seeds/init_db.py"

# ═══════════════════════════════════════════════════════════════════════════
#  RUN.PY + REQUIREMENTS + CONFIG
# ═══════════════════════════════════════════════════════════════════════════
cat > run.py << 'PYEOF'
import os
from app import create_app

env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)

if __name__ == '__main__':
    app.run(debug=(env == 'development'), host='0.0.0.0', port=5000)
PYEOF

cat > requirements.txt << 'TXTEOF'
Flask>=3.0.0
Flask-SQLAlchemy>=3.1.0
Flask-Login>=0.6.3
Flask-WTF>=1.2.1
Werkzeug>=3.0.0
WTForms>=3.1.1
python-dotenv>=1.0.0
TXTEOF

cat > .env.example << 'ENVEOF'
FLASK_ENV=development
SECRET_KEY=change-this-secret-key-in-production
DATABASE_URL=sqlite:///database/voyageiq.db
ENVEOF

cat > .gitignore << 'GITEOF'
__pycache__/
*.pyc
*.pyo
.env
*.db
logs/
backups/
.DS_Store
venv/
.venv/
*.egg-info/
GITEOF

echo "  ✓ run.py, requirements.txt, .env.example, .gitignore"

# ═══════════════════════════════════════════════════════════════════════════
#  README
# ═══════════════════════════════════════════════════════════════════════════
cat > README.md << 'MDEOF'
# VoyageIQ Pro — Plateforme de Gestion Transport

Tableau de bord de gestion de transport interurbain pour agences de voyage au Cameroun.  
Stack : **Python 3.10+ / Flask / SQLite / Jinja2**

---

## 📁 Structure du projet

```
VoyageIQ-Pro/
├── app/
│   ├── blueprints/          # Modules (auth, dashboard, saisie, lignes, flotte, finance…)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── saisie/
│   │   ├── lignes/
│   │   ├── flotte/
│   │   ├── finance/
│   │   ├── operations/
│   │   ├── clientele/
│   │   ├── analytique/
│   │   ├── alertes/
│   │   ├── admin/
│   │   └── api/
│   ├── models/              # Modèles SQLAlchemy
│   │   ├── utilisateur.py   # Authentification + rôles
│   │   ├── ligne.py
│   │   ├── vehicule.py
│   │   ├── saisie.py
│   │   └── alerte.py
│   ├── services/            # Logique métier
│   │   ├── kpi_service.py
│   │   └── alerte_service.py
│   ├── utils/
│   │   ├── decorators.py    # @role_required, @can_saisir, @niveau_min
│   │   └── helpers.py
│   ├── static/
│   │   ├── css/
│   │   │   ├── base/        # reset.css, variables.css, main.css
│   │   │   ├── components/  # navbar.css, footer.css, alerts.css
│   │   │   └── pages/       # dashboard.css, login.css, etc.
│   │   └── js/
│   │       ├── main.js
│   │       └── modules/     # dashboard.js, saisie.js, etc.
│   └── templates/
│       ├── base/base.html   # Template parent (navbar + footer)
│       ├── auth/login.html
│       ├── dashboard/
│       ├── saisie/
│       ├── lignes/
│       ├── flotte/
│       ├── finance/
│       ├── operations/
│       ├── clientele/
│       ├── analytique/
│       ├── alertes/
│       ├── admin/
│       └── errors/          # 404.html, 500.html
├── config/settings.py
├── database/seeds/init_db.py
├── run.py
└── requirements.txt
```

---

## 🚀 Installation rapide

```bash
# 1. Cloner / décompresser le projet
cd VoyageIQ-Pro

# 2. Environnement virtuel
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 3. Dépendances
pip install -r requirements.txt

# 4. Variables d'environnement
cp .env.example .env
# Modifiez .env selon vos besoins

# 5. Initialiser la base de données + données démo
python database/seeds/init_db.py

# 6. Lancer le serveur
python run.py
# → http://localhost:5000
```

---

## 👤 Comptes de démonstration

| Identifiant | Mot de passe    | Rôle               | Accès                                      |
|-------------|-----------------|--------------------|--------------------------------------------|
| `admin`     | `Admin@VIQ2026` | Administrateur     | Tout + gestion utilisateurs                |
| `dg.01`     | `DG@2026`       | Direction Générale | Dashboard, Finance, Analytique, Flotte…    |
| `chef.01`   | `Chef1@2026`    | Chef d'Agence      | Saisie, Lignes, Flotte, Opérations…        |
| `sup.01`    | `Sup1@2026`     | Superviseur Terrain| Saisie, Opérations, Alertes                |
| `audit.01`  | `Audit1@2026`   | Auditeur           | Dashboard, Analytique, Alertes             |

---

## 🔐 Système de rôles

```
Niveau 5 → admin       : accès total + administration
Niveau 4 → dg          : vision globale, pas de saisie
Niveau 3 → chef        : saisie + gestion opérationnelle
Niveau 2 → superviseur : saisie terrain uniquement
Niveau 1 → auditeur    : lecture seule, analytique
```

Décorateurs disponibles dans `app/utils/decorators.py` :
- `@role_required('admin', 'dg')` — par rôle
- `@niveau_min(3)` — par niveau hiérarchique
- `@can_saisir` — peut faire des saisies

---

## 📊 Modules disponibles

| Module       | URL              | Description                                  |
|-------------|-----------------|----------------------------------------------|
| Dashboard    | `/dashboard/`   | KPIs globaux — 30 derniers jours             |
| Saisie       | `/saisie/`      | Saisie journalière d'exploitation            |
| Lignes       | `/lignes/`      | Gestion des trajets et créneaux              |
| Flotte       | `/flotte/`      | Suivi véhicules, maintenance, documents      |
| Finance      | `/finance/`     | Recettes, dépenses, marges, ratios           |
| Opérations   | `/operations/`  | Voyages, retards, annulations                |
| Clientèle    | `/clientele/`   | NPS, réclamations, satisfaction              |
| Analytique   | `/analytique/`  | Graphiques et analyse de tendances           |
| Alertes      | `/alertes/`     | Alertes auto (maintenance, documents)        |
| Admin        | `/admin/`       | Gestion des utilisateurs                     |
| API JSON     | `/api/kpis`     | Données KPI au format JSON                   |

---

## 🌍 Contexte

- **Pays** : Cameroun (Yaoundé)  
- **Base de données** : SQLite (dev) — migratable vers PostgreSQL  
- **Framework** : Flask 3.x avec Blueprints  
- **Authentification** : Flask-Login + hachage Werkzeug  
- **Frontend** : Jinja2, CSS custom (thème sombre gold), Font Awesome  

---

© 2024–2026 VoyageIQ Pro · Afrique Centrale
MDEOF

echo "  ✓ README.md"

# ═══════════════════════════════════════════════════════════════════════════
#  FICHIERS __init__.py manquants
# ═══════════════════════════════════════════════════════════════════════════
touch app/blueprints/__init__.py
touch app/models/__init__.py    # déjà créé mais au cas où
touch app/services/__init__.py
touch app/utils/__init__.py
touch app/extensions/__init__.py
touch database/seeds/__init__.py

# ═══════════════════════════════════════════════════════════════════════════
#  RÉCAPITULATIF FINAL
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           ✅  Projet initialisé avec succès !        ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Dossier : $(pwd)   "
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Prochaines étapes :                                 ║"
echo "║                                                      ║"
echo "║  cd $PROJECT                                         ║"
echo "║  python3 -m venv venv                                ║"
echo "║  source venv/bin/activate                            ║"
echo "║  pip install -r requirements.txt                     ║"
echo "║  python database/seeds/init_db.py                    ║"
echo "║  python run.py                                       ║"
echo "║                                                      ║"
echo "║  → http://localhost:5000                             ║"
echo "║  → Login : admin / Admin@VIQ2026                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
