from flask import render_template
from flask_login import login_required
from app.blueprints.operations import operations_bp
from app.models.saisie import Saisie

@operations_bp.route('/')
@login_required
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    return render_template('operations/index.html', saisies=saisies)
