from flask import Blueprint, render_template, request, flash, redirect, url_for
from app.models.saisie import Saisie
from app.models.ligne import Ligne
from app.models.vehicule import Vehicule
from app.extensions import db

bp_public = Blueprint('public', __name__)


@bp_public.route('/')
def index():
    stats = {
        'total_voyages'  : db.session.query(db.func.sum(Saisie.voyages)).scalar() or 0,
        'total_lignes'   : Ligne.query.filter_by(actif=True).count(),
        'total_vehicules': Vehicule.query.count(),
        'satisfaction'   : 94,
    }
    lignes = Ligne.query.filter_by(actif=True).order_by(Ligne.code).all()
    return render_template('public/index.html', stats=stats, lignes=lignes)


@bp_public.route('/about')
def about():
    return render_template('public/about.html')


@bp_public.route('/localisation')
def localisation():
    return render_template('public/localisation.html')


@bp_public.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        nom      = request.form.get('nom', '').strip()
        email    = request.form.get('email', '').strip()
        message  = request.form.get('message', '').strip()
        if not nom or not message:
            flash('Nom et message sont requis.', 'danger')
        else:
            # TODO : intégrer Flask-Mail pour envoyer le message
            flash('Votre message a été envoyé. Nous vous répondrons rapidement.', 'success')
            return redirect(url_for('public.contact'))
    return render_template('public/contact.html')