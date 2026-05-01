from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.extensions import db
from app.models.ligne import Ligne
from app.utils.decorators import role_required
from datetime import time

bp_lignes = Blueprint('lignes', __name__)


@bp_lignes.route('/')
@login_required
def index():
    page = request.args.get('page', 1, type=int)
    lignes = Ligne.query.order_by(Ligne.code).paginate(page=page, per_page=15)
    return render_template('admin/admin_lignes.html', lignes=lignes)


@bp_lignes.route('/ajouter', methods=['POST'])
@login_required
@role_required('admin', 'chef', 'dg')
def ajouter():
    code = request.form.get('code', '').upper().strip()
    
    # Vérification d'unicité du code
    if Ligne.query.filter_by(code=code).first():
        flash(f"Le code ligne '{code}' est déjà utilisé.", "danger")
        return redirect(url_for('lignes.index'))

    try:
        # Récupération et conversion de l'heure
        h_dep = request.form.get('heure_depart')
        try:
            heure_depart = time.fromisoformat(h_dep) if h_dep else None
        except (ValueError, TypeError):
            flash("Format d'heure invalide. Utilisation de l'heure par défaut (00:00).", "warning")
            heure_depart = time(0, 0)

        l = Ligne(
            code      = code,
            nom       = request.form['nom'].strip(),
            depart    = request.form['depart'].strip(),
            arrivee   = request.form['arrivee'].strip(),
            km        = float(request.form.get('km', 0) or 0),
            tarif     = float(request.form.get('tarif', 0) or 0),
            frequence = int(request.form.get('frequence', 1) or 1),
            heure_depart = heure_depart,
            couleur   = request.form.get('couleur', '#C9A84C'),
        )
        db.session.add(l)
        db.session.commit()
        flash(f'Ligne {l.code} créée.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur : {e}', 'danger')
    return redirect(url_for('lignes.index'))


@bp_lignes.route('/modifier/<int:lid>', methods=['POST'])
@login_required
@role_required('admin', 'chef', 'dg')
def modifier(lid):
    l = Ligne.query.get_or_404(lid)
    
    # Mise à jour de l'heure
    h_dep = request.form.get('heure_depart')
    if h_dep:
        try:
            l.heure_depart = time.fromisoformat(h_dep)
        except (ValueError, TypeError):
            l.heure_depart = time(0, 0)

    l.nom       = request.form.get('nom', l.nom).strip()
    l.depart    = request.form.get('depart', l.depart).strip()
    l.arrivee   = request.form.get('arrivee', l.arrivee).strip()
    l.km        = float(request.form.get('km', l.km) or 0)
    l.tarif     = float(request.form.get('tarif', l.tarif) or 0)
    l.frequence = int(request.form.get('frequence', l.frequence) or 1)
    l.actif     = request.form.get('actif') == 'on'
    db.session.commit()
    flash(f'Ligne {l.code} mise à jour.', 'success')
    return redirect(url_for('lignes.index'))

@bp_lignes.route('/supprimer/<int:lid>', methods=['POST'])
@login_required
@role_required('admin')
def supprimer(lid):
    l = Ligne.query.get_or_404(lid)
    code_supprime = l.code
    db.session.delete(l)
    db.session.commit()
    flash(f'Ligne {code_supprime} supprimée définitivement.', 'warning')
    return redirect(url_for('lignes.index'))