from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.extensions import db
from app.models.saisie import Saisie
from app.models.ligne import Ligne
from app.utils.decorators import can_saisir
from datetime import date

bp_saisie = Blueprint('saisie', __name__)


@bp_saisie.route('/')
@login_required
@can_saisir
def index():
    page             = request.args.get('page', 1, type=int)
    lignes           = Ligne.query.filter_by(actif=True).order_by(Ligne.code).all()
    pagination       = Saisie.query.order_by(Saisie.date.desc()).paginate(page=page, per_page=20)
    
    saisies_data = {'liste': pagination}

    return render_template('admin/admin_saisie.html',
                           lignes=lignes,
                           saisies=saisies_data)


@bp_saisie.route('/enregistrer', methods=['POST'])
@login_required
@can_saisir
def enregistrer():
    def _val(key, default=0, fn=int):
        try:
            v = request.form.get(key, '').strip()
            if not v:
                return default
            if fn is float:
                v = v.replace(',', '.').replace(' ', '')
            return fn(v)
        except (ValueError, TypeError):
            return default

    try:
        form_date = request.form.get('date')
        if not form_date:
            flash('La date est obligatoire.', 'danger')
            return redirect(url_for('saisie.index'))

        s = Saisie(
            date            = date.fromisoformat(form_date),
            ligne_id        = _val('ligne_id'),
            saisi_par       = current_user.id,
            voyages         = _val('voyages'),
            passagers       = _val('passagers'),
            capacite        = _val('capacite'),
            km              = _val('km', fn=float),
            dep_heure       = _val('dep_heure'),
            retard_total    = _val('retard_total'),
            annulations     = _val('annulations'),
            cause_annul     = request.form.get('cause_annul', ''),
            creneau         = request.form.get('creneau', ''),
            rec_guichet     = _val('rec_guichet',     fn=float),
            rec_reservation = _val('rec_reservation', fn=float),
            rec_digital     = _val('rec_digital',     fn=float),
            dep_carburant   = _val('dep_carburant',   fn=float),
            litres          = _val('litres',           fn=float),
            dep_autres      = _val('dep_autres',       fn=float),
            reservations    = _val('reservations'),
            anticipees      = _val('anticipees'),
            reclamations    = _val('reclamations'),
            type_rec        = request.form.get('type_rec', ''),
            satisfaction    = _val('satisfaction', fn=float),
            nps             = _val('nps',          fn=float),
            incidents       = _val('incidents'),
            panne_class     = request.form.get('panne_class', ''),
            duree_panne     = _val('duree_panne', fn=float),
            observations    = request.form.get('observations', ''),
        )
        db.session.add(s)
        db.session.commit()
        flash('Saisie enregistrée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la saisie : {e}', 'danger')

    return redirect(url_for('saisie.index'))