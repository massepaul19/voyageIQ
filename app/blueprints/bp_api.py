from flask import Blueprint, jsonify, request
from flask_login import login_required
from app.models.saisie import Saisie
from app.models.vehicule import Vehicule
from app.models.ligne import Ligne
# from app.models.position import Position # Supposons que tu aies un modèle Position
from app.models.alerte import Alerte
from app.extensions import db

bp_api = Blueprint('api', __name__)


@bp_api.route('/kpis')
@login_required
def kpis():
    try:
        from app.services.kpi_service import kpis_globaux
        return jsonify(kpis_globaux(30))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp_api.route('/saisies')
@login_required
def saisies():
    s = Saisie.query.order_by(Saisie.date.desc()).limit(50).all()
    return jsonify([{
        'date'     : str(r.date),
        'recettes' : r.recettes_total(),
        'depenses' : r.depenses_total(),
        'marge'    : r.marge(),
        'voyages'  : r.voyages,
        'passagers': r.passagers,
        'taux_rem' : r.taux_remplissage(),
    } for r in s])


@bp_api.route('/alertes')
@login_required
def alertes():
    a = Alerte.query.filter_by(lue=False)\
               .order_by(Alerte.created_at.desc()).limit(10).all()
    return jsonify([{
        'id'     : al.id,
        'titre'  : al.titre,
        'niveau' : al.niveau,
        'type'   : al.type_alerte,
    } for al in a])

@bp_api.route('/alertes/count')
@login_required
def alertes_count_api():
    """Retourne le nombre d'alertes non lues pour les pastilles de l'UI."""
    return jsonify({'count': _alertes_count()})


@bp_api.route('/flotte')
@login_required
def flotte():
    vehicules = Vehicule.query.all()
    return jsonify([{
        'id'    : v.id,
        'plaque': v.plaque,
        'statut': v.statut,
        'km'    : v.km_actuel,
        'ligne' : v.ligne.nom if v.ligne else None,
    } for v in vehicules])


@bp_api.route('/position', methods=['POST'])
@login_required
def position():
    """Reçoit la position GPS d'un chauffeur (pour la carte)."""
    data = request.get_json(silent=True) or {}
    lat  = data.get('lat')
    lng  = data.get('lng')
    if lat and lng:
        # TODO : stocker dans un modèle Position ou en cache Redis
        return jsonify({'status': 'ok', 'lat': lat, 'lng': lng})
    return jsonify({'status': 'error', 'message': 'lat/lng requis'}), 400


@bp_api.route('/positions_actuelles')
@login_required
def positions_actuelles():
    """Retourne les dernières positions GPS des véhicules (simulation)."""
    # Récupération de la flotte réelle
    vehicules = Vehicule.query.all()
    data = []
    
    # Mapping des statuts pour correspondre au CSS de la carte
    statut_map = {
        'operationnel': 'actif',
        'maintenance':  'arrete',
        'hors_service': 'hors_ligne'
    }

    for v in vehicules:
        data.append({
            'id': v.id,
            'immatriculation': v.plaque,
            'chauffeur_nom': "Chauffeur " + str(v.id),
            'ligne_nom': v.ligne.nom if v.ligne else "Non assigné",
            'statut': statut_map.get(v.statut, 'hors_ligne'),
            'statut_label': v.statut.capitalize() if v.statut else 'Inconnu',
            'latitude': 3.8667 + (v.id * 0.005),  # Yaoundé + décalage
            'longitude': 11.5167 + (v.id * 0.005),
            'vitesse': 45 if v.statut == 'operationnel' else 0,
            'derniere_maj': 'Il y a 2 min',
            'derniere_position': 'Yaoundé, Cameroun',
            'icon': 'fa-bus'
        })

    return jsonify({
        'vehicules': data,
        'stats': {
            'vitesse_moyenne': 42,
            'courses_en_cours': len([v for v in data if v['statut'] == 'actif']),
            'temps_arret_moyen': '5m',
            'zones_couvertes': 3
        }
    })


@bp_api.route('/vehicules/<int:vid>/details')
@login_required
def vehicule_details(vid):
    """Retourne les détails complets d'un véhicule pour la modale."""
    v = Vehicule.query.get_or_404(vid)
    return jsonify({
        'id': v.id,
        'immatriculation': v.plaque,
        'modele': v.modele,
        'chauffeur_nom': "Chauffeur " + str(v.id),
        'ligne_nom': v.ligne.nom if v.ligne else "Non assigné",
        'latitude': 3.8667,
        'longitude': 11.5167,
        'vitesse': 45 if v.statut == 'operationnel' else 0,
        'derniere_maj': 'Il y a 2 min',
        'distance_jour': 120.5,
        'temps_conduite': '5h 30m',
        'courses_jour': 4,
        'revenus_jour': 75000
    })


@bp_api.route('/historique/<int:vid>')
@login_required
def vehicule_historique(vid):
    """Retourne l'historique des positions pour un véhicule donné."""
    # Simulation d'historique vide pour éviter les erreurs 404
    return jsonify([])


# ═══════════════════════════════════════════════════════════════
# Helper partagé — compte des alertes non lues
# (utilisé dans tous les blueprints pour la topbar)
# ═══════════════════════════════════════════════════════════════
def _alertes_count():
    try:
        from app.models.alerte import Alerte
        return Alerte.query.filter_by(lue=False).count()
    except Exception:
        return 0