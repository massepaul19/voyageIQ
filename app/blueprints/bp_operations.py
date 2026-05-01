from flask import Blueprint, render_template, request
from flask_login import login_required
from app.models.saisie import Saisie
from app.models.ligne import Ligne
from app.models.vehicule import Vehicule
from app.extensions import db
from app.services.kpi_service import kpis_globaux

bp_operations = Blueprint('operations', __name__)


@bp_operations.route('/')
@login_required
def index():
    page          = request.args.get('page', 1, type=int)
    saisies       = Saisie.query.order_by(Saisie.date.desc()).paginate(page=page, per_page=20)
    lignes        = Ligne.query.filter_by(actif=True).all()
    vehicules     = Vehicule.query.filter_by(statut='operationnel').all()
    
    # Récupération des KPIs globaux pour enrichir l'objet rapports
    kpis = kpis_globaux(30) # Période par défaut de 30 jours

    rapports = {
        'courses_realisees': Saisie.query.count(),
        'revenus_total': db.session.query(
            db.func.sum(Saisie.rec_guichet + Saisie.rec_reservation + Saisie.rec_digital)
        ).scalar() or 0,
        'taux_ponctualite': kpis.get('taux_ponctualite', 0),
    }

    operations = {
        'vehicules_actifs': Vehicule.query.filter_by(statut='operationnel').count(),
        'saisies_total': Saisie.query.count()
    }

    return render_template('admin/admin_operations.html',
                           saisies=saisies, lignes=lignes,
                           vehicules=vehicules, operations=operations, rapports=rapports)