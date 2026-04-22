from app.extensions import db
from datetime import datetime, timezone

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
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    saisies   = db.relationship('Saisie',   backref='ligne', lazy='dynamic')
    vehicules = db.relationship('Vehicule', backref='ligne', lazy='dynamic')

    def __repr__(self):
        return f'<Ligne {self.code}: {self.depart}→{self.arrivee}>'
