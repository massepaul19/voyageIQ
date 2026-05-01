# ═══════════════════════════════════════════════════════════════
# bp_dashboard.py — VoyageIQ
# ═══════════════════════════════════════════════════════════════
from flask import Blueprint, render_template
from flask_login import login_required, current_user
from datetime import date, timedelta
from collections import defaultdict

from app.models.alerte import Alerte
from app.models.utilisateur import Utilisateur
from app.models.vehicule import Vehicule
from app.models.ligne import Ligne
from app.models.saisie import Saisie
from app.extensions import db

bp_dashboard = Blueprint('dashboard', __name__)


def _series_7j():
    """
    Agrège voyages, recettes et répartition des recettes sur les 7 derniers jours.
    Retourne le dict window.DASH attendu par dashboard.js.
    """
    today  = date.today()
    jours  = [today - timedelta(days=i) for i in range(6, -1, -1)]

    voyages_by_day  = defaultdict(int)
    recettes_by_day = defaultdict(float)
    guichet_total   = 0.0
    resa_total      = 0.0
    digital_total   = 0.0

    saisies = (
        Saisie.query
        .filter(Saisie.date >= jours[0], Saisie.date <= today)
        .all()
    )

    for s in saisies:
        d = s.date if isinstance(s.date, date) else s.date.date()
        voyages_by_day[d]  += getattr(s, 'voyages', 0) or 0
        rec = (
            (getattr(s, 'rec_guichet',     0) or 0) +
            (getattr(s, 'rec_reservation', 0) or 0) +
            (getattr(s, 'rec_digital',     0) or 0)
        )
        recettes_by_day[d] += rec
        guichet_total  += getattr(s, 'rec_guichet',     0) or 0
        resa_total     += getattr(s, 'rec_reservation', 0) or 0
        digital_total  += getattr(s, 'rec_digital',     0) or 0

    JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    labels      = [f"{JOURS_FR[d.weekday() + 1 if d.weekday() < 6 else 0]} {d.day:02d}/{d.month:02d}"
                   for d in jours]
    # Correction : weekday() → 0=Lun … 6=Dim, adapter l'index
    labels = []
    JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
    for d in jours:
        labels.append(f"{JOURS[d.weekday()]} {d.day:02d}/{d.month:02d}")

    voyages_7j  = [voyages_by_day[d]  for d in jours]
    recettes_7j = [round(recettes_by_day[d]) for d in jours]

    return {
        'labels_7j'  : labels,
        'voyages_7j' : voyages_7j,
        'recettes_7j': recettes_7j,
        'repartition': {
            'guichet'    : round(guichet_total),
            'reservation': round(resa_total),
            'digital'    : round(digital_total),
        },
    }


@bp_dashboard.route('/')
@login_required
def index():
    # Si c'est un chauffeur → renvoyer chez lui
    if hasattr(current_user, 'statut_inscription'):
        from flask import redirect, url_for
        return redirect(url_for('chauffeur.index'))

    today = date.today()

    # ── Stats globales ───────────────────────────────────────
    recettes_total = db.session.query(
        db.func.coalesce(
            db.func.sum(Saisie.rec_guichet + Saisie.rec_reservation + Saisie.rec_digital), 0
        )
    ).scalar() or 0

    stats = {
        'total_vehicules': Vehicule.query.count(),
        'vehicules_ok'   : Vehicule.query.filter_by(statut='operationnel').count(),
        'total_lignes'   : Ligne.query.filter_by(actif=True).count(),
        'total_users'    : Utilisateur.query.filter_by(actif=True).count(),
        'saisies_today'  : Saisie.query.filter_by(date=today).count(),
        'recettes_total' : recettes_total,
    }

    kpi = {
        'utilisateurs_actifs': stats['total_users'],
        'vehicules_en_route' : stats['vehicules_ok'],
    }

    alertes_recentes = (
        Alerte.query
        .filter_by(lue=False)
        .order_by(Alerte.created_at.desc())
        .limit(5).all()
    )

    saisies_recentes = (
        Saisie.query
        .order_by(Saisie.date.desc())
        .limit(10).all()
    )

    # ── Séries graphiques — calculées ici, injectées dans window.DASH
    dash = _series_7j()

    return render_template(
        'admin/admin_dashboard.html',
        stats=stats,
        kpi=kpi,
        dash=dash,
        alertes_recentes=alertes_recentes,
        saisies_recentes=saisies_recentes,
    )
