from flask import render_template
from flask_login import login_required
from app.blueprints.analytique import analytique_bp
from app.services.kpi_service  import kpis_globaux
from app.models.saisie import Saisie
from app.utils.decorators import role_required

@analytique_bp.route('/')
@login_required
@role_required('admin','dg','auditeur')
def index():
    kpis    = kpis_globaux(90)
    saisies = Saisie.query.order_by(Saisie.date.asc()).all()
    return render_template('analytique/index.html', kpis=kpis, saisies=saisies)
