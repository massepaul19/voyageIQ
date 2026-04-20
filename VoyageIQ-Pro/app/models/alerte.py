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
