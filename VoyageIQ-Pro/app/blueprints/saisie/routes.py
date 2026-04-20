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
        s = Saisie(
            date        = date.fromisoformat(request.form['date']),
            ligne_id    = int(request.form['ligne_id']),
            saisi_par   = current_user.id,
            voyages     = int(request.form.get('voyages', 0)),
            passagers   = int(request.form.get('passagers', 0)),
            capacite    = int(request.form.get('capacite', 0)),
            km          = float(request.form.get('km', 0)),
            retard_total= int(request.form.get('retard_total', 0)),
            annulations = int(request.form.get('annulations', 0)),
            cause_annul = request.form.get('cause_annul',''),
            creneau     = request.form.get('creneau',''),
            rec_guichet     = float(request.form.get('rec_guichet', 0)),
            rec_reservation = float(request.form.get('rec_reservation', 0)),
            rec_digital     = float(request.form.get('rec_digital', 0)),
            dep_carburant   = float(request.form.get('dep_carburant', 0)),
            litres      = float(request.form.get('litres', 0)),
            dep_autres  = float(request.form.get('dep_autres', 0)),
            reservations= int(request.form.get('reservations', 0)),
            anticipees  = int(request.form.get('anticipees', 0)),
            reclamations= int(request.form.get('reclamations', 0)),
            type_rec    = request.form.get('type_rec',''),
            satisfaction= float(request.form.get('satisfaction', 0)),
            nps         = float(request.form.get('nps', 0)),
            incidents   = int(request.form.get('incidents', 0)),
            panne_class = request.form.get('panne_class',''),
            duree_panne = float(request.form.get('duree_panne', 0)),
            observations= request.form.get('observations',''),
        )
        db.session.add(s)
        db.session.commit()
        flash('Saisie enregistrée avec succès.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Erreur lors de la saisie : {e}', 'danger')
    return redirect(url_for('saisie.index'))
