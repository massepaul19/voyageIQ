from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import login_required
from app.extensions import db
from app.models.alerte import Alerte

bp_alertes = Blueprint('alertes', __name__)


@bp_alertes.route('/')
@login_required
def index():
    # Générer alertes auto si service disponible
    try:
        from app.services.alerte_service import generer_alertes_auto
        generer_alertes_auto()
    except Exception:
        pass

    page = request.args.get('page', 1, type=int)
    type_filtre = request.args.get('type', '')

    query = Alerte.query
    if type_filtre:
        query = query.filter_by(type_alerte=type_filtre)

    pagination    = query.order_by(Alerte.created_at.desc()).paginate(page=page, per_page=20)
    alertes_count = Alerte.query.filter_by(lue=False).count()

    stats = {
        'critical'  : Alerte.query.filter_by(niveau='critical').count(),
        'warning'   : Alerte.query.filter_by(niveau='warning').count(),
        'info'      : Alerte.query.filter_by(niveau='info').count(), # Correction: 'info' au lieu de 'information'

        'non_lues'  : alertes_count,
    }

    alertes_data = {
        'critiques': stats['critical'],
        'warning': stats['warning'],
        'info': stats['info'],
        'liste': pagination # Ajout de l'objet pagination sous la clé 'liste'
    }

    return render_template('admin/admin_alertes.html',
                           pagination=pagination,
                           stats=stats,
                           type_filtre=type_filtre,
                           alertes=alertes_data)


@bp_alertes.route('/marquer-lue/<int:alerte_id>', methods=['POST'])
@login_required
def marquer_lue(alerte_id):
    a = Alerte.query.get_or_404(alerte_id)
    a.lue = True
    db.session.commit()
    return redirect(url_for('alertes.index'))


@bp_alertes.route('/marquer-toutes-lues', methods=['POST'])
@login_required
def marquer_toutes_lues():
    Alerte.query.filter_by(lue=False).update({'lue': True})
    db.session.commit()
    return redirect(url_for('alertes.index'))


@bp_alertes.route('/supprimer/<int:alerte_id>', methods=['POST'])
@login_required
def supprimer(alerte_id):
    a = Alerte.query.get_or_404(alerte_id)
    db.session.delete(a)
    db.session.commit()
    return redirect(url_for('alertes.index'))