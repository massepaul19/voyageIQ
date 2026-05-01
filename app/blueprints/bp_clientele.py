from flask import Blueprint, render_template, request
from flask_login import login_required
from app.models.saisie import Saisie
from app.utils.decorators import role_required
from app.extensions import db
from sqlalchemy import func

bp_clientele = Blueprint('clientele', __name__)


@bp_clientele.route('/')
@login_required
@role_required('admin', 'dg', 'chef')
def index():
    page          = request.args.get('page', 1, type=int)
    pagination    = Saisie.query.order_by(Saisie.date.desc()).paginate(page=page, per_page=15)
    
    # Correction : Le template attend des attributs nom/prenom pour l'avatar.
    # Comme Saisie représente un rapport de voyage, on simule un nom de client.
    for s in pagination.items:
        s.nom = "Passager"
        s.prenom = f"#{s.id}"
        s.total_depenses = s.depenses_total()
        s.total_recettes = s.recettes_total()
        s.note_moyenne = s.satisfaction or 0.0
        s.total_voyages = s.voyages

    # Calcul NPS moyen et satisfaction moyenne via SQL (plus performant)
    stats = db.session.query(
        func.avg(Saisie.nps),
        func.avg(Saisie.satisfaction),
        func.sum(Saisie.reclamations)
    ).first()
    
    nps_moy = round(stats[0] or 0, 1)
    sat_moy = round(stats[1] or 0, 1)
    total_rec = int(stats[2] or 0)

    return render_template('admin/admin_clientele.html',
                           clients=pagination, nps_moy=nps_moy,
                           sat_moy=sat_moy, total_reclamations=total_rec)