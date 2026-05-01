from flask import Blueprint, render_template
from flask_login import login_required
from app.utils.decorators import role_required
from app.models.ligne import Ligne
from datetime import date

bp_carte = Blueprint('carte', __name__)


@bp_carte.route('/')
@login_required
@role_required('admin', 'dg', 'chef', 'superviseur') # Définis les rôles autorisés
def index():
    """Page d'administration affichant la carte des véhicules/chauffeurs."""
    # Aucune donnée spécifique à passer ici, le JS se chargera de l'API
    lignes = Ligne.query.filter_by(actif=True).all()
    # On passe des stats fictives pour éviter les erreurs de rendu Jinja2
    stats = {'itineraires': 0, 'arrets': 0, 'distance_totale': 0, 'temps_moyen': '0h'}
    return render_template('admin/admin_carte.html', lignes=lignes, cartes=stats, itineraires=[])


@bp_carte.route('/localisation')
@login_required
@role_required('admin', 'dg', 'chef', 'superviseur')
def localisation():
    """Page de suivi GPS en temps réel des véhicules."""
    lignes = Ligne.query.filter_by(actif=True).all()
    stats = {
        'actifs': 0, 'arretes': 0, 'hors_ligne': 0, 'alertes': 0,
        'vitesse_moyenne': 0, 'courses_en_cours': 0,
        'temps_arret_moyen': '0m', 'zones_couvertes': 0
    }
    return render_template('admin/admin_localisation.html', 
                           localisation=stats, lignes=lignes, 
                           vehicules_actifs=[], today=date.today())