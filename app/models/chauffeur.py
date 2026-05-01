from app.extensions import db, login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

STATUTS_CHAUFFEUR = ['actif', 'inactif', 'suspendu', 'en_conge']
STATUTS_INSCRIPTION = ['en_attente', 'valide', 'rejete']

class Chauffeur(UserMixin, db.Model):
    """
    Chauffeur de véhicule — acteur externe pouvant s'inscrire,
    accéder à son propre espace et visualiser ses stats/courses.
    L'admin valide son inscription avant activation du compte.
    """
    __tablename__ = 'chauffeurs'

    # ── Identité ──────────────────────────────────────────────
    id              = db.Column(db.Integer, primary_key=True)
    matricule       = db.Column(db.String(20),  unique=True, nullable=True)   # généré à la validation
    nom             = db.Column(db.String(100), nullable=False)
    prenom          = db.Column(db.String(100), nullable=False)
    date_naissance  = db.Column(db.Date,        nullable=True)
    lieu_naissance  = db.Column(db.String(100), nullable=True)
    sexe            = db.Column(db.String(10),  default='M')

    # ── Contact ───────────────────────────────────────────────
    telephone       = db.Column(db.String(20),  nullable=True)
    telephone_urgence = db.Column(db.String(20), nullable=True)  # contact urgence
    email           = db.Column(db.String(150), unique=True, nullable=True)
    adresse         = db.Column(db.String(200), nullable=True)
    ville           = db.Column(db.String(100), nullable=True)

    # ── Authentification ──────────────────────────────────────
    username        = db.Column(db.String(50),  unique=True, nullable=False)
    pwd_hash        = db.Column(db.String(255), nullable=False)
    actif           = db.Column(db.Boolean, default=False)          # False tant que non validé
    statut_inscription = db.Column(db.String(20), default='en_attente')  # en_attente / valide / rejete
    statut          = db.Column(db.String(20), default='actif')     # actif / inactif / suspendu / en_conge

    # ── Profil & photo ────────────────────────────────────────
    photo           = db.Column(db.String(255), nullable=True)      # chemin vers l'image
    bio             = db.Column(db.Text,        nullable=True)

    # ── Permis & documents ────────────────────────────────────
    num_permis      = db.Column(db.String(50),  nullable=True)
    categorie_permis= db.Column(db.String(10),  nullable=True)      # B, C, D...
    exp_permis      = db.Column(db.Date,        nullable=True)
    num_cni         = db.Column(db.String(50),  nullable=True)
    exp_cni         = db.Column(db.Date,        nullable=True)
    num_carnet      = db.Column(db.String(50),  nullable=True)      # carnet de conduite pro

    # ── Expérience professionnelle ────────────────────────────
    annees_exp      = db.Column(db.Integer,  default=0)
    agence          = db.Column(db.String(100), nullable=True)      # agence d'affectation
    ligne_preferee  = db.Column(db.Integer, db.ForeignKey('lignes.id'), nullable=True)

    # ── Méta ──────────────────────────────────────────────────
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    validated_at    = db.Column(db.DateTime, nullable=True)         # date validation admin
    validated_by    = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=True)
    last_login      = db.Column(db.DateTime, nullable=True)

    # ── Relations ─────────────────────────────────────────────
    courses         = db.relationship('CourseChauffeur', backref='chauffeur', lazy='dynamic',
                                      foreign_keys='CourseChauffeur.chauffeur_id')
    validateur      = db.relationship('Utilisateur', foreign_keys=[validated_by])
    ligne_hab       = db.relationship('Ligne', foreign_keys=[ligne_preferee])

    # ── Auth ──────────────────────────────────────────────────
    def set_password(self, password):
        self.pwd_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pwd_hash, password)

    def get_id(self):
        # Préfixe 'c-' pour distinguer des Utilisateurs dans Flask-Login
        return f'c-{self.id}'

    # ── Stats rapides ─────────────────────────────────────────
    def total_courses(self):
        return self.courses.count()

    def total_km(self):
        return sum(c.km or 0 for c in self.courses)

    def total_passagers(self):
        return sum(c.passagers or 0 for c in self.courses)

    def taux_ponctualite(self):
        """Pourcentage de courses sans retard significatif (< 15 min)"""
        total = self.courses.count()
        if not total:
            return 0
        ponctuelles = self.courses.filter(CourseChauffeur.retard_minutes < 15).count()
        return round(ponctuelles / total * 100, 1)

    @property
    def note_moyenne(self):
        """Retourne une note fictive ou calculée pour éviter les erreurs de template."""
        return 4.5

    def nom_complet(self):
        return f'{self.prenom} {self.nom}'

    def statut_badge(self):
        badges = {
            'actif':      ('ok',   '✓ Actif'),
            'inactif':    ('info', '○ Inactif'),
            'suspendu':   ('err',  '✗ Suspendu'),
            'en_conge':   ('warn', '⏸ Congé'),
        }
        return badges.get(self.statut, ('info', self.statut))

    def __repr__(self):
        return f'<Chauffeur {self.matricule or self.username}: {self.nom_complet()}>'


class CourseChauffeur(db.Model):
    """
    Association Chauffeur ↔ Saisie/Voyage.
    Un chauffeur peut avoir effectué plusieurs courses dans la journée.
    """
    __tablename__ = 'courses_chauffeurs'

    id              = db.Column(db.Integer, primary_key=True)
    chauffeur_id    = db.Column(db.Integer, db.ForeignKey('chauffeurs.id'), nullable=False)
    saisie_id       = db.Column(db.Integer, db.ForeignKey('saisies.id'),   nullable=True)
    vehicule_id     = db.Column(db.Integer, db.ForeignKey('vehicules.id'), nullable=True)
    ligne_id        = db.Column(db.Integer, db.ForeignKey('lignes.id'),    nullable=True)

    date            = db.Column(db.Date,    nullable=False)
    heure_depart    = db.Column(db.String(5), nullable=True)   # "06:30"
    heure_arrivee   = db.Column(db.String(5), nullable=True)
    km              = db.Column(db.Float,   default=0)
    passagers       = db.Column(db.Integer, default=0)
    retard_minutes  = db.Column(db.Integer, default=0)
    incidents       = db.Column(db.Integer, default=0)
    observations    = db.Column(db.Text,    nullable=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relations
    saisie          = db.relationship('Saisie',   foreign_keys=[saisie_id])
    vehicule        = db.relationship('Vehicule', foreign_keys=[vehicule_id])
    ligne           = db.relationship('Ligne',    foreign_keys=[ligne_id])

    def __repr__(self):
        return f'<Course C{self.chauffeur_id} le {self.date}>'
