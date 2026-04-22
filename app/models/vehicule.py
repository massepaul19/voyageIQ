from app.extensions import db
from datetime import datetime, timezone

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
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

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
