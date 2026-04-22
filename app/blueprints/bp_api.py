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
