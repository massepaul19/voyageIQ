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
