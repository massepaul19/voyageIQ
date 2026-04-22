from flask import render_template, redirect, url_for
from flask_login import login_required
from app.blueprints.alertes import alertes_bp
from app.extensions import db
from app.models.alerte import Alerte
from app.services.alerte_service import generer_alertes_auto

@alertes_bp.route('/')
@login_required
def index():
    generer_alertes_auto()
    alertes = Alerte.query.order_by(Alerte.created_at.desc()).all()
    return render_template('alertes/index.html', alertes=alertes)

@alertes_bp.route('/marquer-lue/<int:alerte_id>')
@login_required
def marquer_lue(alerte_id):
    a = Alerte.query.get_or_404(alerte_id)
    a.lue = True
    db.session.commit()
    return redirect(url_for('alertes.index'))
