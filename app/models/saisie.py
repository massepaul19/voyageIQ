from app.extensions import db
from datetime import datetime, timezone

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
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

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
