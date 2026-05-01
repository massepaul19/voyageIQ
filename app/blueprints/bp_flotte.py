from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.extensions import db
from app.models.vehicule import Vehicule
from app.models.ligne import Ligne
from datetime import date, datetime
from app.utils.decorators import role_required

bp_flotte = Blueprint('flotte', __name__)


@bp_flotte.route('/')
@login_required
def index():
    page          = request.args.get('page', 1, type=int)
    vehicules     = Vehicule.query.order_by(Vehicule.plaque).paginate(page=page, per_page=15)
    lignes        = Ligne.query.filter_by(actif=True).all()
    return render_template('admin/admin_flotte.html',
                           vehicules=vehicules, lignes=lignes,
                           now=datetime.now())


@bp_flotte.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin', 'chef', 'dg')
def ajouter():
    plaque = request.form.get('plaque', '').upper().strip()
    
    # Vérification d'unicité de la plaque
    if Vehicule.query.filter_by(plaque=plaque).first():
        flash(f"Le véhicule immatriculé {plaque} existe déjà dans le système.", "danger")
        return redirect(url_for('flotte.index'))

    try:
        v = Vehicule(
            plaque         = plaque,
            modele         = request.form.get('modele', 'Inconnu').strip(),
            capacite       = int(request.form.get('capacite', 16) or 16),
            ligne_id       = int(request.form['ligne_id']) if request.form.get('ligne_id') else None,
            km_actuel      = float(str(request.form.get('km_actuel', 0)).replace(',', '.') or 0),
            km_maintenance = float(str(request.form.get('km_maintenance', 50000)).replace(',', '.') or 50000),
            exp_vt         = date.fromisoformat(request.form.get('exp_vt'))
                             if request.form.get('exp_vt') else None,
            exp_assurance  = date.fromisoformat(request.form.get('exp_assurance'))
                             if request.form.get('exp_assurance') else None,
        )
        db.session.add(v)
        db.session.commit()
        flash(f'Véhicule {v.plaque} ajouté.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur : {e}', 'danger')
    return redirect(url_for('flotte.index'))


@bp_flotte.route('/modifier/<int:vid>', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'chef', 'dg')
def modifier(vid):
    v = Vehicule.query.get_or_404(vid)
    lignes = Ligne.query.filter_by(actif=True).all()
    if request.method == 'POST':
        try:
            v.modele         = request.form.get('modele', v.modele).strip()
            v.capacite       = int(request.form.get('capacite', v.capacite) or v.capacite)
            v.ligne_id       = int(request.form['ligne_id']) if request.form.get('ligne_id') else None
            v.km_actuel      = float(str(request.form.get('km_actuel', v.km_actuel)).replace(',', '.') or 0)
            v.km_maintenance = float(str(request.form.get('km_maintenance', v.km_maintenance)).replace(',', '.') or 50000)
            v.statut         = request.form.get('statut', v.statut)
            
            if request.form.get('exp_vt'):
                v.exp_vt = date.fromisoformat(request.form['exp_vt'])
            if request.form.get('exp_assurance'):
                v.exp_assurance = date.fromisoformat(request.form['exp_assurance'])
                
            db.session.commit()
            flash(f'Véhicule {v.plaque} mis à jour.', 'success')
            return redirect(url_for('flotte.index'))
        except Exception as e:
            db.session.rollback()
            flash(f"Erreur lors de la modification : {e}", "danger")
            
    return render_template('admin/modifier_vehicule.html', vehicule=v, lignes=lignes)


@bp_flotte.route('/supprimer/<int:vid>', methods=['POST'])
@login_required
@role_required('admin')
def supprimer(vid):
    v = Vehicule.query.get_or_404(vid)
    db.session.delete(v)
    db.session.commit()
    flash(f'Véhicule {v.plaque} supprimé.', 'warning')
    return redirect(url_for('flotte.index'))