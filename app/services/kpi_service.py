"""Calcul des KPIs principaux à partir des saisies."""
from app.models.saisie  import Saisie
from app.models.vehicule import Vehicule
from app.models.alerte  import Alerte
from datetime import datetime, timedelta

def kpis_globaux(periode_jours=30):
    """Retourne un dict de KPIs pour le dashboard principal."""
    depuis = datetime.utcnow().date() - timedelta(days=periode_jours)
    saisies = Saisie.query.filter(Saisie.date >= depuis).all()

    if not saisies:
        return {}

    rec   = sum(s.recettes_total() for s in saisies)
    dep   = sum(s.depenses_total() for s in saisies)
    marge = rec - dep
    voy   = sum(s.voyages     for s in saisies)
    pass_ = sum(s.passagers   for s in saisies)
    capa  = sum(s.capacite    for s in saisies)
    km    = sum(s.km          for s in saisies)
    litres= sum((s.litres or 0) for s in saisies)
    nps_  = [s.nps for s in saisies if s.nps]

    return {
        'recettes':         rec,
        'depenses':         dep,
        'marge':            marge,
        'taux_marge':       round(marge / rec * 100, 1) if rec else 0,
        'voyages':          voy,
        'passagers':        pass_,
        'taux_remplissage': round(pass_ / capa * 100, 1) if capa else 0,
        'km_total':         km,
        'conso_100km':      round(litres / km * 100, 1) if km else 0,
        'nps_moyen':        round(sum(nps_) / len(nps_), 1) if nps_ else 0,
        'nb_saisies':       len(saisies),
    }

def alertes_actives():
    return Alerte.query.filter_by(lue=False).order_by(Alerte.created_at.desc()).all()

def vehicules_alertes():
    """Véhicules nécessitant attention (maintenance, documents)."""
    from datetime import date
    veh = Vehicule.query.all()
    alertes = []
    today = date.today()
    for v in veh:
        if v.km_restants() <= 0:
            alertes.append(('critical', f'{v.plaque} — Maintenance dépassée'))
        elif v.km_restants() <= 2000:
            alertes.append(('warning', f'{v.plaque} — Maintenance dans {int(v.km_restants())} km'))
        if v.exp_vt:
            jours = (v.exp_vt - today).days
            if jours <= 0:
                alertes.append(('critical', f'{v.plaque} — Visite technique expirée'))
            elif jours <= 30:
                alertes.append(('warning', f'{v.plaque} — VT dans {jours} jours'))
    return alertes
