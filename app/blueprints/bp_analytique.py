"""
Blueprint analytique — VoyageIQ
Construit les données de graphiques à partir des saisies réelles.
"""

from datetime import date, timedelta
from collections import defaultdict

from flask import Blueprint, render_template
from flask_login import login_required

from app.models.saisie import Saisie
from app.models.ligne import Ligne
from app.utils.decorators import role_required

bp_analytique = Blueprint('analytique', __name__)


# ── helpers ────────────────────────────────────────────────────────────────

def _fmt_day(d: date) -> str:
    """Format court pour les labels d'axe."""
    return d.strftime('%d/%m')


def _build_charts(saisies: list, days: int = 90) -> dict:
    """
    Construit les 4 séries de graphiques à partir de la liste de Saisie.
    Retourne un dict compatible window.ANALYTICS côté JS.
    """
    today    = date.today()
    start    = today - timedelta(days=days - 1)
    day_list = [start + timedelta(i) for i in range(days)]

    # Agrégats journaliers
    courses_by_day  = defaultdict(int)
    revenus_by_day  = defaultdict(float)
    distance_by_day = defaultdict(float)
    flux_by_hour    = defaultdict(int)          # flux sur toute la période

    for s in saisies:
        d = s.date if isinstance(s.date, date) else s.date.date()
        if d < start or d > today:
            continue

        courses_by_day[d]  += getattr(s, 'voyages',    0) or 0
        distance_by_day[d] += getattr(s, 'km_parcourus', 0) or 0

        rec = (
            (getattr(s, 'rec_guichet',      0) or 0) +
            (getattr(s, 'rec_reservation',  0) or 0) +
            (getattr(s, 'rec_digital',      0) or 0)
        )
        revenus_by_day[d] += rec

        # Heure de départ (si disponible) pour le flux horaire
        heure = getattr(s, 'heure_depart', None)
        if heure is not None:
            h = heure if isinstance(heure, int) else int(str(heure).split(':')[0])
            flux_by_hour[h] += getattr(s, 'voyages', 0) or 0

    day_labels      = [_fmt_day(d) for d in day_list]
    courses_values  = [courses_by_day[d]  for d in day_list]
    revenus_values  = [revenus_by_day[d]  for d in day_list]
    distance_values = [distance_by_day[d] for d in day_list]

    flux_labels = [f'{h}h' for h in range(24)]
    flux_values = [flux_by_hour[h] for h in range(24)]

    return {
        'performance' : {'labels': day_labels,  'courses': courses_values},
        'revenus'     : {'labels': day_labels,  'data':    revenus_values},
        'distance'    : {'labels': day_labels,  'data':    distance_values},
        'flux_horaires': {'labels': flux_labels, 'data':   flux_values},
    }


# ── route ───────────────────────────────────────────────────────────────────

@bp_analytique.route('/')
@login_required
@role_required('admin', 'dg', 'auditeur')
def index():
    from app.services.kpi_service import kpis_globaux

    PERIOD = 90
    kpis   = kpis_globaux(PERIOD)

    # Saisies de la période
    cutoff  = date.today() - timedelta(days=PERIOD - 1)
    saisies = (
        Saisie.query
        .filter(Saisie.date >= cutoff)
        .order_by(Saisie.date.asc())
        .all()
    )
    lignes  = Ligne.query.filter_by(actif=True).all()

    # Graphiques construits côté Python → injectés dans window.ANALYTICS
    charts = _build_charts(saisies, PERIOD)

    # Heure pic et jour chargé (depuis le flux calculé)
    flux_data = charts['flux_horaires']['data']
    heure_pic = flux_data.index(max(flux_data)) if any(flux_data) else 17

    # Jour de la semaine le plus chargé
    JOURS_FR = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
    courses_by_weekday = defaultdict(int)
    for s in saisies:
        d = s.date if isinstance(s.date, date) else s.date.date()
        courses_by_weekday[d.weekday()] += getattr(s, 'voyages', 0) or 0
    if courses_by_weekday:
        jour_idx   = max(courses_by_weekday, key=courses_by_weekday.get)
        jour_charge = JOURS_FR[jour_idx]
    else:
        jour_charge = 'Vendredi'

    analytics = {
        # KPIs
        'passagers_total'      : kpis.get('passagers_total',    0),
        'taux_ponctualite'     : kpis.get('taux_ponctualite',   0),
        'taux_occupation'      : kpis.get('taux_occupation',    0),
        'km_parcourus'         : kpis.get('km_total',           0),
        'consommation_moyenne' : kpis.get('conso_100km',        0),
        'evolution_passagers'  : kpis.get('evolution_passagers',0.0),
        'evolution_km'         : kpis.get('evolution_km',       0.0),
        'heure_pic'            : heure_pic,
        'jour_charge'          : jour_charge,
        # Graphiques — utilisés par window.ANALYTICS dans le template
        'performance_chart'    : charts['performance'],
        'revenus_chart'        : charts['revenus'],
        'distance_chart'       : charts['distance'],
        'flux_horaires'        : charts['flux_horaires'],
    }

    return render_template(
        'admin/admin_analytique.html',
        analytics=analytics,
        kpis=kpis,
        saisies=saisies,
        lignes=lignes,
    )
