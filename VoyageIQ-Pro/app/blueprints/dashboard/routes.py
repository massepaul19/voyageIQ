from flask import render_template
from flask_login import login_required, current_user
from app.blueprints.dashboard import dashboard_bp
from app.services.kpi_service import kpis_globaux, alertes_actives

@dashboard_bp.route('/')
@login_required
def index():
    kpis    = kpis_globaux(30)
    alertes = alertes_actives()
    return render_template('dashboard/index.html', kpis=kpis, alertes=alertes)
