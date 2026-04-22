from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app.blueprints.saisie import saisie_bp
from app.extensions import db
from app.models.saisie  import Saisie
from app.models.ligne   import Ligne
from app.utils.decorators import can_saisir
from datetime import date

@saisie_bp.route('/', methods=['GET'])
@login_required
@can_saisir
def index():
    lignes = Ligne.query.filter_by(actif=True).all()
    saisies_recentes = Saisie.query.order_by(Saisie.date.desc()).limit(15).all()
    return render_template('saisie/index.html', lignes=lignes, saisies=saisies_recentes)

@saisie_bp.route('/enregistrer', methods=['POST'])
@login_required
@can_saisir
def enregistrer():
    try:
        form_date = request.form.get('date')
        if not form_date:
            flash("La date est obligatoire pour l'enregistrement.", "danger")
            return redirect(url_for('saisie.index'))

        # Utilitaire interne pour nettoyer les entrées numériques
        def get_val(key, default=0, type_func=int):
            try:
                val = request.form.get(key, '').strip()
                if not val:
                    return default
                
                # Nettoyage pour les nombres décimaux (Cameroun/France utilisent la virgule)
                if type_func is float:
                    val = val.replace(',', '.').replace(' ', '')
                return type_func(val)
            except (ValueError, TypeError):
                return default

        s = Saisie(
            date        = date.fromisoformat(form_date) if isinstance(form_date, str) else date.today(),
            ligne_id    = get_val('ligne_id'),
            saisi_par   = current_user.id,
            voyages     = get_val('voyages'),
            passagers   = get_val('passagers'),
            capacite    = get_val('capacite'),
            km          = get_val('km', type_func=float),
            dep_heure   = get_val('dep_heure'),
            retard_total= get_val('retard_total'),
            annulations = get_val('annulations'),
            cause_annul = request.form.get('cause_annul',''),
            creneau     = request.form.get('creneau',''),
            rec_guichet     = get_val('rec_guichet', type_func=float),
            rec_reservation = get_val('rec_reservation', type_func=float),
            rec_digital     = get_val('rec_digital', type_func=float),
            dep_carburant   = get_val('dep_carburant', type_func=float),
            litres      = get_val('litres', type_func=float),
            dep_autres  = get_val('dep_autres', type_func=float),
            reservations= get_val('reservations'),
            anticipees  = get_val('anticipees'),
            reclamations= get_val('reclamations'),
            type_rec    = request.form.get('type_rec',''),
            satisfaction= get_val('satisfaction', type_func=float),
            nps         = get_val('nps', type_func=float),
            incidents   = get_val('incidents'),
            panne_class = request.form.get('panne_class',''),
            duree_panne = get_val('duree_panne', type_func=float),
            observations= request.form.get('observations',''),
        )
        db.session.add(s)
        db.session.commit()
        flash('Saisie enregistrée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la saisie : {e}', 'danger')
    return redirect(url_for('saisie.index'))
