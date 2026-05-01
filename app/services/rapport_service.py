"""
services/rapport_service.py
Génération des données de rapport et export PDF.
pip install xhtml2pdf Pillow
"""
from __future__ import annotations

import io
import os
from datetime import datetime, timedelta, date
from typing import Any

from flask import current_app, render_template_string

from app.models.saisie import Saisie
from app.models.ligne  import Ligne


# ── Helpers date ───────────────────────────────────────────────────────────────

def _plage_periode(type_periode: str) -> tuple[date, date]:
    """Calcule (date_debut, date_fin) selon le type."""
    today = date.today()
    if type_periode == 'jour':
        return today, today
    elif type_periode == 'semaine':
        lun = today - timedelta(days=today.weekday())
        return lun, lun + timedelta(days=6)
    elif type_periode == 'mois':
        debut = today.replace(day=1)
        if today.month == 12:
            fin = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            fin = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return debut, fin
    elif type_periode == 'trimestre':
        mois_debut = ((today.month - 1) // 3) * 3 + 1
        debut = today.replace(month=mois_debut, day=1)
        fin_mois = mois_debut + 2
        if fin_mois > 12:
            fin = today.replace(year=today.year + 1, month=fin_mois - 12, day=1) - timedelta(days=1)
        else:
            fin = today.replace(month=fin_mois + 1, day=1) - timedelta(days=1) if fin_mois < 12 \
                  else today.replace(month=12, day=31)
        return debut, fin
    elif type_periode == 'annee':
        return today.replace(month=1, day=1), today.replace(month=12, day=31)
    # fallback : 30 jours
    return today - timedelta(days=29), today


def _plage_custom(d_debut: str, d_fin: str) -> tuple[date, date]:
    """Convertit deux chaînes ISO en dates."""
    return (
        datetime.strptime(d_debut, '%Y-%m-%d').date(),
        datetime.strptime(d_fin,   '%Y-%m-%d').date(),
    )


# ── Collecte des données ────────────────────────────────────────────────────────

def collecter_donnees(
    type_rapport: str = 'exploitation',
    type_periode: str | None = None,
    date_debut: str | None = None,
    date_fin: str | None = None,
    ligne_id: int | None = None,
) -> dict[str, Any]:
    """
    Retourne un dict structuré avec les données du rapport.
    """
    # Plage de dates
    if date_debut and date_fin:
        debut, fin = _plage_custom(date_debut, date_fin)
    else:
        debut, fin = _plage_periode(type_periode or 'mois')

    # Requête saisies
    q = Saisie.query.filter(Saisie.date >= debut, Saisie.date <= fin)
    if ligne_id:
        q = q.filter(Saisie.ligne_id == ligne_id)
    saisies = q.order_by(Saisie.date.asc()).all()

    # Calculs globaux
    recettes  = sum((s.rec_guichet or 0) + (s.rec_reservation or 0) + (s.rec_digital or 0) for s in saisies)
    depenses  = sum((s.dep_carburant or 0) + (s.dep_autres or 0) for s in saisies)
    marge     = recettes - depenses
    voyages   = sum(s.voyages   or 0 for s in saisies)
    passagers = sum(s.passagers or 0 for s in saisies)
    capacite  = sum(s.capacite  or 0 for s in saisies)
    km_total  = sum(s.km        or 0 for s in saisies)
    litres    = sum(s.litres    or 0 for s in saisies)
    nps_list  = [s.nps for s in saisies if s.nps]

    kpis = {
        'recettes':          recettes,
        'depenses':          depenses,
        'marge':             marge,
        'taux_marge':        round(marge / recettes * 100, 1) if recettes else 0,
        'voyages':           voyages,
        'passagers':         passagers,
        'taux_remplissage':  round(passagers / capacite * 100, 1) if capacite else 0,
        'km_total':          km_total,
        'conso_100km':       round(litres / km_total * 100, 1) if km_total else 0,
        'nps_moyen':         round(sum(nps_list) / len(nps_list), 1) if nps_list else 0,
        'nb_saisies':        len(saisies),
    }

    # Lignes détail
    lignes_map: dict[int, dict] = {}
    for s in saisies:
        lid = s.ligne_id or 0
        if lid not in lignes_map:
            lignes_map[lid] = {
                'code':      s.ligne.code if s.ligne else '—',
                'nom':       s.ligne.nom  if s.ligne else 'Sans ligne',
                'voyages':   0, 'passagers': 0,
                'recettes':  0, 'depenses':  0,
            }
        rec = (s.rec_guichet or 0) + (s.rec_reservation or 0) + (s.rec_digital or 0)
        dep = (s.dep_carburant or 0) + (s.dep_autres or 0)
        lignes_map[lid]['voyages']   += s.voyages   or 0
        lignes_map[lid]['passagers'] += s.passagers or 0
        lignes_map[lid]['recettes']  += rec
        lignes_map[lid]['depenses']  += dep

    for l in lignes_map.values():
        l['marge'] = l['recettes'] - l['depenses']

    # Tableau journalier
    rows = []
    for s in saisies:
        rec = (s.rec_guichet or 0) + (s.rec_reservation or 0) + (s.rec_digital or 0)
        dep = (s.dep_carburant or 0) + (s.dep_autres or 0)
        rows.append({
            'date':       s.date.strftime('%d/%m/%Y'),
            'ligne_code': s.ligne.code if s.ligne else '—',
            'voyages':    s.voyages   or 0,
            'passagers':  s.passagers or 0,
            'recettes':   rec,
            'depenses':   dep,
            'marge':      rec - dep,
            'satisfaction': round(s.satisfaction or 0),
        })

    return {
        'meta': {
            'type_rapport': type_rapport,
            'debut':        debut.strftime('%d/%m/%Y'),
            'fin':          fin.strftime('%d/%m/%Y'),
            'genere_le':    datetime.now().strftime('%d/%m/%Y à %H:%M'),
            'nb_saisies':   len(saisies),
        },
        'kpis':   kpis,
        'lignes': list(lignes_map.values()),
        'rows':   rows,
    }


# ── Génération PDF ──────────────────────────────────────────────────────────────

_PDF_TEMPLATE = r"""
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #1A1A1A;
    background: #fff;
  }

  /* ── Header ─── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2.5pt solid #C9A84C;
    padding-bottom: 10pt;
    margin-bottom: 16pt;
  }

  .logo-zone { display: flex; align-items: center; gap: 10pt; }

  .logo-box {
    width: 42pt; height: 42pt;
    border-radius: 8pt;
    background: #F0E8D0;
    display: flex; align-items: center; justify-content: center;
    border: 1.5pt solid #C9A84C;
    overflow: hidden;
  }

  .logo-box img { width: 100%; height: 100%; object-fit: cover; }

  .logo-fallback {
    font-size: 16pt;
    font-weight: 800;
    color: #C9A84C;
    font-family: Georgia, serif;
  }

  .brand-name {
    font-size: 18pt;
    font-weight: 800;
    color: #0A0A0A;
    letter-spacing: -0.5pt;
  }

  .brand-tag {
    font-size: 7pt;
    font-weight: 700;
    color: #C9A84C;
    letter-spacing: 2pt;
    text-transform: uppercase;
  }

  .header-right { text-align: right; }
  .rapport-type {
    font-size: 7pt;
    font-weight: 700;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 1.5pt;
    margin-bottom: 3pt;
  }
  .rapport-titre {
    font-size: 13pt;
    font-weight: 800;
    color: #0A0A0A;
    margin-bottom: 2pt;
  }
  .rapport-periode {
    font-size: 8pt;
    color: #5A5048;
  }

  /* ── Section titre ─── */
  .section-title {
    font-size: 9pt;
    font-weight: 700;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 1pt;
    border-left: 3pt solid #C9A84C;
    padding-left: 7pt;
    margin: 14pt 0 8pt;
  }

  /* ── KPI grid ─── */
  .kpi-grid {
    display: flex;
    gap: 8pt;
    margin-bottom: 14pt;
  }

  .kpi-card {
    flex: 1;
    border: 1pt solid #E0D4B0;
    border-radius: 6pt;
    padding: 10pt 12pt;
    text-align: center;
    background: #FAFAF8;
  }

  .kpi-value {
    font-size: 16pt;
    font-weight: 800;
    color: #C9A84C;
    display: block;
    margin-bottom: 3pt;
  }

  .kpi-value.ok   { color: #16A34A; }
  .kpi-value.err  { color: #DC2626; }
  .kpi-value.blue { color: #2563EB; }

  .kpi-label {
    font-size: 7pt;
    color: #5A5048;
    text-transform: uppercase;
    letter-spacing: .5pt;
    font-weight: 600;
  }

  /* ── Tables ─── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14pt;
    font-size: 8pt;
  }

  thead th {
    background: #1A1A1A;
    color: #F5F0E8;
    padding: 6pt 8pt;
    text-align: left;
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: .5pt;
    font-weight: 700;
  }

  thead th.right { text-align: right; }

  tbody tr:nth-child(even) { background: #F7F5F0; }
  tbody tr:nth-child(odd)  { background: #FFFFFF; }

  tbody td {
    padding: 5pt 8pt;
    border-bottom: .5pt solid #E8E0D0;
    color: #1A1A1A;
  }

  tbody td.right { text-align: right; font-family: 'Courier New', monospace; }
  tbody td.gold  { color: #A07830; font-weight: 700; }
  tbody td.ok    { color: #16A34A; }
  tbody td.err   { color: #DC2626; }

  tfoot td {
    padding: 6pt 8pt;
    background: #1A1A1A;
    color: #F5F0E8;
    font-weight: 700;
    font-size: 8pt;
    border: none;
  }

  tfoot td.right { text-align: right; font-family: 'Courier New', monospace; }

  /* ── Info ligne ─── */
  .meta-line {
    font-size: 8pt;
    color: #5A5048;
    margin-bottom: 4pt;
  }

  .meta-line span {
    color: #0A0A0A;
    font-weight: 600;
  }

  /* ── Footer ─── */
  .doc-footer {
    margin-top: 20pt;
    padding-top: 10pt;
    border-top: 1pt solid #E0D4B0;
    text-align: center;
    font-size: 7pt;
    color: #9A9080;
  }
</style>
</head>
<body>

<!-- ══ EN-TÊTE ══ -->
<div class="header">
  <div class="logo-zone">
    <div class="logo-box">
      {% if logo_path %}
      <img src="{{ logo_path }}" alt="Logo">
      {% else %}
      <span class="logo-fallback">VIQ</span>
      {% endif %}
    </div>
    <div>
      <div class="brand-name">VoyageIQ</div>
      <div class="brand-tag">Pro Transport</div>
    </div>
  </div>
  <div class="header-right">
    <div class="rapport-type">{{ meta.type_rapport | upper }} — Rapport officiel</div>
    <div class="rapport-titre">Rapport d'exploitation</div>
    <div class="rapport-periode">Période : {{ meta.debut }} → {{ meta.fin }}</div>
    <div class="rapport-periode" style="margin-top:2pt;color:#9A9080">Généré le {{ meta.genere_le }}</div>
  </div>
</div>

<!-- ══ KPIs ══ -->
<div class="section-title">Vue d'ensemble</div>

<div class="kpi-grid">
  <div class="kpi-card">
    <span class="kpi-value">{{ "{:,.0f}".format(kpis.recettes) }}</span>
    <span class="kpi-label">Recettes (FCFA)</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value err">{{ "{:,.0f}".format(kpis.depenses) }}</span>
    <span class="kpi-label">Dépenses (FCFA)</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value {% if kpis.marge >= 0 %}ok{% else %}err{% endif %}">
      {{ "{:+,.0f}".format(kpis.marge) }}
    </span>
    <span class="kpi-label">Marge (FCFA)</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value blue">{{ kpis.voyages }}</span>
    <span class="kpi-label">Voyages</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value blue">{{ kpis.passagers }}</span>
    <span class="kpi-label">Passagers</span>
  </div>
  <div class="kpi-card">
    <span class="kpi-value">{{ kpis.taux_remplissage }}%</span>
    <span class="kpi-label">Taux remplissage</span>
  </div>
</div>

<!-- ══ RÉSUMÉ PAR LIGNE ══ -->
{% if lignes %}
<div class="section-title">Résultats par ligne</div>
<table>
  <thead>
    <tr>
      <th>Ligne</th>
      <th class="right">Voyages</th>
      <th class="right">Passagers</th>
      <th class="right">Recettes (FCFA)</th>
      <th class="right">Dépenses (FCFA)</th>
      <th class="right">Marge (FCFA)</th>
    </tr>
  </thead>
  <tbody>
    {% for l in lignes %}
    <tr>
      <td><strong>{{ l.code }}</strong> — {{ l.nom }}</td>
      <td class="right">{{ l.voyages }}</td>
      <td class="right">{{ l.passagers }}</td>
      <td class="right ok">{{ "{:,.0f}".format(l.recettes) }}</td>
      <td class="right err">{{ "{:,.0f}".format(l.depenses) }}</td>
      <td class="right {% if l.marge >= 0 %}gold{% else %}err{% endif %}">
        {{ "{:+,.0f}".format(l.marge) }}
      </td>
    </tr>
    {% endfor %}
  </tbody>
  <tfoot>
    <tr>
      <td><strong>TOTAL</strong></td>
      <td class="right">{{ kpis.voyages }}</td>
      <td class="right">{{ kpis.passagers }}</td>
      <td class="right">{{ "{:,.0f}".format(kpis.recettes) }}</td>
      <td class="right">{{ "{:,.0f}".format(kpis.depenses) }}</td>
      <td class="right">{{ "{:+,.0f}".format(kpis.marge) }}</td>
    </tr>
  </tfoot>
</table>
{% endif %}

<!-- ══ DÉTAIL JOURNALIER ══ -->
{% if rows %}
<div class="section-title">Détail journalier ({{ rows | length }} entrée(s))</div>
<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Ligne</th>
      <th class="right">Voyages</th>
      <th class="right">Passagers</th>
      <th class="right">Recettes</th>
      <th class="right">Dépenses</th>
      <th class="right">Marge</th>
      <th class="right">Satisf.</th>
    </tr>
  </thead>
  <tbody>
    {% for r in rows %}
    <tr>
      <td style="font-family:'Courier New',monospace;font-size:7.5pt">{{ r.date }}</td>
      <td>{{ r.ligne_code }}</td>
      <td class="right">{{ r.voyages }}</td>
      <td class="right">{{ r.passagers }}</td>
      <td class="right ok">{{ "{:,.0f}".format(r.recettes) }}</td>
      <td class="right err">{{ "{:,.0f}".format(r.depenses) }}</td>
      <td class="right {% if r.marge >= 0 %}gold{% else %}err{% endif %}">
        {{ "{:+,.0f}".format(r.marge) }}
      </td>
      <td class="right">{{ r.satisfaction }}%</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% endif %}

<!-- ══ FOOTER ══ -->
<div class="doc-footer">
  Page <pdf:pagenumber> / <pdf:pagecount> — 
  VoyageIQ Pro — Document confidentiel — Usage interne uniquement —
  Généré automatiquement le {{ meta.genere_le }}
</div>

</body>
</html>
"""


def generer_pdf(donnees: dict) -> bytes:
    """
    Convertit le rapport en PDF via xhtml2pdf.
    Retourne les bytes du PDF.
    pip install xhtml2pdf
    """
    try:
        from xhtml2pdf import pisa
    except ImportError:
        raise RuntimeError(
            "xhtml2pdf non installé. Lancez : pip install xhtml2pdf"
        )

    # Chemin du logo
    logo_path = None
    static_dir = current_app.static_folder
    for ext in ('jpeg', 'jpg', 'png', 'webp'):
        candidate = os.path.join(static_dir, 'images', f'logo.{ext}')
        if os.path.isfile(candidate):
            logo_path = f'file://{candidate}'
            break

    # Rendu Jinja2 du template PDF
    from jinja2 import Environment
    env = Environment(autoescape=True)
    template = env.from_string(_PDF_TEMPLATE)
    html = template.render(
        logo_path=logo_path,
        **donnees,
    )

    buf = io.BytesIO()
    pisa_status = pisa.CreatePDF(html, dest=buf, encoding='utf-8')
    if pisa_status.err:
        raise RuntimeError(f'Erreur génération PDF (code {pisa_status.err})')

    return buf.getvalue()
