"""
bp_finance.py — Blueprint Finance
VoyageIQ Pro · ESTLC 2025-2026
"""

from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required
from sqlalchemy import func, extract
from datetime import date, datetime, timedelta
from calendar import month_abbr

from app.extensions import db
from app.models.saisie import Saisie
from app.models.ligne import Ligne
from app.models.vehicule import Vehicule
from app.utils.decorators import role_required

bp_finance = Blueprint('finance', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

class Tresorerie(float):
    """
    Objet hybride permettant d'être utilisé comme un nombre (le solde)
    OU comme un dictionnaire (via ses attributs) dans les templates Jinja.
    """
    def __new__(cls, value, **kwargs):
        obj = super(Tresorerie, cls).__new__(cls, value)
        for k, v in kwargs.items():
            setattr(obj, k, v)
        return obj

    def __format__(self, format_spec):
        return format(float(self), format_spec)

def _mois_labels(n=6):
    """Retourne les n derniers mois abrégés en français."""
    MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun',
            'Jul','Aoû','Sep','Oct','Nov','Déc']
    aujourd = date.today()
    return [MOIS[(aujourd.month - n + i - 1) % 12] for i in range(n)]


def _aggregats_periode(date_debut, date_fin):
    """Agrège revenus, dépenses et passagers sur une période donnée."""
    row = db.session.query(
        func.coalesce(func.sum(Saisie.rec_guichet + Saisie.rec_reservation + Saisie.rec_digital), 0).label('rev'),
        func.coalesce(func.sum(Saisie.dep_carburant), 0).label('carb'),
        func.coalesce(func.sum(Saisie.dep_autres),    0).label('autres'),
        func.coalesce(func.sum(Saisie.passagers),     0).label('passagers'),
    ).filter(Saisie.date >= date_debut, Saisie.date <= date_fin).first()
    return row


def _series_6_mois():
    """
    Renvoie les données mensuelles des 6 derniers mois pour les graphiques.
    Structure : { labels, revenus, depenses, benefices }
    """
    MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun',
            'Jul','Aoû','Sep','Oct','Nov','Déc']
    aujourd = date.today()
    labels, revenus, depenses, benefices = [], [], [], []

    for i in range(5, -1, -1):
        # Premier et dernier jour du mois i mois en arrière
        target = date(aujourd.year, aujourd.month, 1) - timedelta(days=1)
        for _ in range(i):
            target = date(target.year, target.month, 1) - timedelta(days=1)
        premier = date(target.year, target.month, 1)
        dernier = target

        row = _aggregats_periode(premier, dernier)
        rev  = float(row.rev   or 0)
        carb = float(row.carb  or 0)
        autr = float(row.autres or 0)
        dep  = carb + autr

        labels.append(MOIS[premier.month - 1])
        revenus.append(round(rev))
        depenses.append(round(dep))
        benefices.append(round(rev - dep))

    return {
        'labels':    labels,
        'revenus':   revenus,
        'depenses':  depenses,
        'benefices': benefices,
    }


def _evolution_pct(valeur_actuelle, valeur_precedente):
    """Calcule l'évolution en % entre deux périodes."""
    if not valeur_precedente:
        return 0.0
    return round((valeur_actuelle - valeur_precedente) / valeur_precedente * 100, 1)


def _build_finance_dict():
    """
    Construit le dictionnaire `finance` complet attendu par le template.
    Toutes les clés utilisées dans admin_finance.html sont présentes.
    """
    aujourd = date.today()

    # ── Mois courant ──────────────────────────────────────────────────────────
    debut_mois  = date(aujourd.year, aujourd.month, 1)
    fin_mois    = aujourd

    row_cur = _aggregats_periode(debut_mois, fin_mois)
    rev_cur  = float(row_cur.rev   or 0)
    carb_cur = float(row_cur.carb  or 0)
    autr_cur = float(row_cur.autres or 0)
    dep_cur  = carb_cur + autr_cur
    pass_cur = int(row_cur.passagers or 0)

    # ── Mois précédent (pour évolution) ───────────────────────────────────────
    fin_prec   = debut_mois - timedelta(days=1)
    debut_prec = date(fin_prec.year, fin_prec.month, 1)

    row_prec = _aggregats_periode(debut_prec, fin_prec)
    rev_prec = float(row_prec.rev  or 0)
    dep_prec = float((row_prec.carb or 0) + (row_prec.autres or 0))

    profit  = rev_cur - dep_cur
    marge   = (profit / rev_cur * 100) if rev_cur else 0.0

    # ── Séries 6 mois pour graphiques ─────────────────────────────────────────
    series = _series_6_mois()

    # ── Budget annuel simple (somme sur l'année en cours) ─────────────────────
    debut_an = date(aujourd.year, 1, 1)
    row_an   = _aggregats_periode(debut_an, aujourd)
    dep_an   = float((row_an.carb or 0) + (row_an.autres or 0))
    rev_an   = float(row_an.rev or 0)
    # Budget prévisionnel annuel = extrapolation du rythme mensuel
    mois_ecoules = max(aujourd.month, 1)
    budget_annuel_prev = (dep_an / mois_ecoules) * 12
    budget_utilise_pct = (dep_an / budget_annuel_prev * 100) if budget_annuel_prev else 0.0

    # ── Répartition budgétaire (doughnut) ─────────────────────────────────────
    # Carburant, Maintenance (dep_autres estimée à 40 % maintenance / 60 % autres)
    maintenance_est = autr_cur * 0.40
    autres_est      = autr_cur * 0.60
    salaires_est    = rev_cur  * 0.25   # estimation : 25 % des revenus en salaires

    budget_categories = [
        {'nom': 'Carburant',    'alloue': carb_cur * 1.1, 'utilise': carb_cur, 'pct_utilise': round(carb_cur / (carb_cur * 1.1 or 1) * 100) if carb_cur else 0},
        {'nom': 'Maintenance',  'alloue': maintenance_est * 1.2, 'utilise': maintenance_est, 'pct_utilise': round(maintenance_est / (maintenance_est * 1.2 or 1) * 100) if maintenance_est else 0},
        {'nom': 'Personnel',    'alloue': salaires_est, 'utilise': salaires_est, 'pct_utilise': 100},
        {'nom': 'Autres',       'alloue': autres_est * 1.5, 'utilise': autres_est, 'pct_utilise': round(autres_est / (autres_est * 1.5 or 1) * 100) if autres_est else 0},
    ]

    # ── Prévision mensuelle (moyenne des 3 derniers mois) ─────────────────────
    prev_rev_list = series['revenus'][-3:]
    prevision_mensuelle = sum(prev_rev_list) / len(prev_rev_list) if prev_rev_list else 0.0
    tendance = _evolution_pct(rev_cur, sum(series['revenus'][-2:-1] or [0]))

    return {
        # KPIs principaux
        'revenus_mensuels':     rev_cur,
        'depenses_mensuelles':  dep_cur,
        'profit_mensuel':       profit,
        # Correction: Objet hybride pour satisfaire le formatage float ET les accès d'attributs (encaissements, etc.)
        'tresorerie': Tresorerie(profit, encaissements=rev_cur, decaissements=dep_cur, solde=profit),
        # Correction: Ajout de l'objet 'resultat' pour les rapports
        'resultat': {
            'revenus': rev_cur,
            'charges': dep_cur,
            'net': profit
        },
        'marge_beneficiaire':   marge,
        'passagers_mensuels':   pass_cur,

        # Évolutions
        'evolution_revenus':    _evolution_pct(rev_cur, rev_prec),
        'evolution_depenses':   _evolution_pct(dep_cur, dep_prec),

        # Détail dépenses
        'depenses_carburant':   carb_cur,
        'depenses_maintenance': maintenance_est,
        'depenses_salaires':    salaires_est,
        'depenses_autres':      autres_est,

        # Budget
        'budget_annuel':        budget_annuel_prev,
        'budget_utilise_pct':   min(budget_utilise_pct, 100.0),
        'prevision_mensuelle':  prevision_mensuelle,
        'tendance':             tendance,
        'budget_categories':    budget_categories,

        # Données graphiques — chart revenus (line)
        'revenus_chart': {
            'labels': series['labels'],
            'data':   series['revenus'],
        },

        # Données graphiques — chart budget (doughnut)
        'budget_chart': {
            'labels': [c['nom'] for c in budget_categories],
            'data':   [c['pct_utilise'] for c in budget_categories],
        },

        # Données graphiques — chart rentabilité (bar)
        'profitability_chart': {
            'labels':   series['labels'],
            'revenus':  series['revenus'],
            'depenses': series['depenses'],
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@bp_finance.route('/')
@login_required
@role_required('admin', 'dg', 'auditeur')
def index():
    """Page principale Finance."""
    aujourd = date.today()
    debut_mois = date(aujourd.year, aujourd.month, 1)

    # Saisies du mois courant (pour la table revenus)
    saisies_mois = (Saisie.query
                    .filter(Saisie.date >= debut_mois, Saisie.date <= aujourd)
                    .order_by(Saisie.date.desc())
                    .limit(50)
                    .all())

    # Toutes les lignes actives
    lignes = Ligne.query.filter_by(actif=True).order_by(Ligne.code).all()

    # Tous les véhicules (pour le modal dépense)
    vehicules = Vehicule.query.order_by(Vehicule.plaque).all()

    # Construire les listes revenus / dépenses attendues par le template
    revenus = []
    depenses_list = []
    for s in saisies_mois:
        rec_total = s.recettes_total()
        if rec_total:
            revenus.append({
                'id':               s.id,
                'date':             s.date,
                'type':             'guichet',
                'montant':          rec_total,
                'ligne':            s.ligne,
                'methode_paiement': 'especes',
            })
        if s.dep_carburant:
            depenses_list.append({
                'id':          s.id,
                'date':        s.date,
                'categorie':   'carburant',
                'description': f'Carburant — {s.ligne.code if s.ligne else ""}',
                'montant':     s.dep_carburant,
                'vehicule':    None,
            })
        if s.dep_autres:
            depenses_list.append({
                'id':          s.id,
                'date':        s.date,
                'categorie':   'autres',
                'description': f'Autres charges — {s.ligne.code if s.ligne else ""}',
                'montant':     s.dep_autres,
                'vehicule':    None,
            })

    finance = _build_finance_dict()

    return render_template(
        'admin/admin_finance.html',
        saisies=saisies_mois,
        lignes=lignes,
        vehicules=vehicules,
        revenus=revenus,
        depenses=depenses_list,
        finance=finance,
    )


# ─────────────────────────────────────────────────────────────────────────────
# API JSON
# ─────────────────────────────────────────────────────────────────────────────

@bp_finance.route('/api/revenus')
@login_required
@role_required('admin', 'dg', 'auditeur')
def api_revenus():
    """
    GET /finance/api/revenus?periode=jour|semaine|mois|annee
    Retourne { revenus: [...], chartData: { labels, revenus, depenses } }
    """
    periode = request.args.get('periode', 'mois')
    aujourd = date.today()

    if periode == 'jour':
        debut = aujourd
    elif periode == 'semaine':
        debut = aujourd - timedelta(days=7)
    elif periode == 'annee':
        debut = date(aujourd.year, 1, 1)
    else:  # mois (défaut)
        debut = date(aujourd.year, aujourd.month, 1)

    saisies = (Saisie.query
               .filter(Saisie.date >= debut, Saisie.date <= aujourd)
               .order_by(Saisie.date.desc())
               .all())

    revenus = []
    for s in saisies:
        rec = s.recettes_total()
        if rec:
            revenus.append({
                'id':               s.id,
                'date':             s.date.strftime('%d/%m/%Y'),
                'source':           'Recettes exploitation',
                'montant':          rec,
                'ligne':            s.ligne.code if s.ligne else None,
                'methode_paiement': 'especes',
            })

    series = _series_6_mois()
    return jsonify({
        'revenus':   revenus,
        'chartData': {
            'labels':   series['labels'],
            'revenus':  series['revenus'],
            'depenses': series['depenses'],
        },
    })


@bp_finance.route('/api/kpis')
@login_required
@role_required('admin', 'dg', 'auditeur')
def api_kpis():
    """GET /finance/api/kpis — rafraîchissement AJAX des KPIs."""
    return jsonify(_build_finance_dict())


@bp_finance.route('/api/lignes-rentabilite')
@login_required
@role_required('admin', 'dg', 'auditeur')
def api_lignes_rentabilite():
    """
    GET /finance/api/lignes-rentabilite
    Retourne la rentabilité par ligne sur le mois courant.
    """
    aujourd  = date.today()
    debut    = date(aujourd.year, aujourd.month, 1)
    lignes   = Ligne.query.filter_by(actif=True).all()
    result   = []

    for ligne in lignes:
        row = db.session.query(
            func.coalesce(func.sum(Saisie.rec_guichet + Saisie.rec_reservation + Saisie.rec_digital), 0).label('rev'),
            func.coalesce(func.sum(Saisie.dep_carburant + Saisie.dep_autres), 0).label('dep'),
            func.coalesce(func.sum(Saisie.passagers), 0).label('passagers'),
        ).filter(
            Saisie.ligne_id == ligne.id,
            Saisie.date >= debut,
            Saisie.date <= aujourd,
        ).first()

        rev = float(row.rev or 0)
        dep = float(row.dep or 0)
        result.append({
            'ligne':     ligne.code,
            'nom':       ligne.nom,
            'revenus':   rev,
            'depenses':  dep,
            'profit':    round(rev - dep),
            'passagers': int(row.passagers or 0),
            'marge':     round((rev - dep) / rev * 100, 1) if rev else 0,
        })

    result.sort(key=lambda x: x['profit'], reverse=True)
    return jsonify(result)
