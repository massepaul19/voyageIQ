from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.flotte import flotte_bp
from app.extensions import db
from app.models.vehicule import Vehicule
from app.models.ligne    import Ligne
from app.utils.decorators import role_required

@flotte_bp.route('/')
@login_required
def index():
    vehicules = Vehicule.query.all()
    lignes    = Ligne.query.filter_by(actif=True).all()
    return render_template('flotte/index.html', vehicules=vehicules, lignes=lignes)

@flotte_bp.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin','chef','dg')
def ajouter():
    from datetime import date
    v = Vehicule(
        plaque      = request.form['plaque'].upper(),
        modele      = request.form['modele'],
        capacite    = int(request.form.get('capacite', 16)),
        ligne_id    = int(request.form['ligne_id']) if request.form.get('ligne_id') else None,
        km_actuel   = float(request.form.get('km_actuel', 0)),
        km_maintenance = float(request.form.get('km_maintenance', 50000)),
        exp_vt      = date.fromisoformat(request.form['exp_vt']) if request.form.get('exp_vt') else None,
        exp_assurance = date.fromisoformat(request.form['exp_assurance']) if request.form.get('exp_assurance') else None,
    )
    db.session.add(v); db.session.commit()
    flash(f'Véhicule {v.plaque} ajouté.', 'success')
    return redirect(url_for('flotte.index'))
