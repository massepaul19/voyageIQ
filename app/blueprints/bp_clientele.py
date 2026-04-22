from flask import render_template
from flask_login import login_required
from app.blueprints.clientele import clientele_bp
from app.models.saisie import Saisie
from app.utils.decorators import role_required

@clientele_bp.route('/')
@login_required
@role_required('admin','dg','chef')
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    return render_template('clientele/index.html', saisies=saisies)
