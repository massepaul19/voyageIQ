from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.lignes import lignes_bp
from app.extensions import db
from app.models.ligne import Ligne
from app.utils.decorators import role_required

@lignes_bp.route('/')
@login_required
def index():
    lignes = Ligne.query.filter_by(actif=True).all()
    return render_template('lignes/index.html', lignes=lignes)

@lignes_bp.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin','chef','dg')
def ajouter():
    l = Ligne(
        code      = request.form['code'].upper(),
        nom       = request.form['nom'],
        depart    = request.form['depart'],
        arrivee   = request.form['arrivee'],
        km        = float(request.form.get('km',0)),
        tarif     = float(request.form.get('tarif',0)),
        frequence = int(request.form.get('frequence',1)),
    )
    db.session.add(l); db.session.commit()
    flash(f'Ligne {l.code} créée.', 'success')
    return redirect(url_for('lignes.index'))
