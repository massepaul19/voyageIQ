from flask import render_template
from flask_login import login_required
from app.blueprints.finance import finance_bp
from app.models.saisie import Saisie
from app.models.ligne  import Ligne
from app.utils.decorators import role_required

@finance_bp.route('/')
@login_required
@role_required('admin','dg','auditeur')
def index():
    saisies = Saisie.query.order_by(Saisie.date.desc()).all()
    lignes  = Ligne.query.filter_by(actif=True).all()
    return render_template('finance/index.html', saisies=saisies, lignes=lignes)
