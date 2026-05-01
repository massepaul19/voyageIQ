"""
app/blueprints/bp_rapports.py
Routes pour la page Rapports + API JSON pour le générateur.
"""
from __future__ import annotations

import io
import os
from datetime import datetime

from flask import (
    Blueprint, render_template, request,
    jsonify, send_file, current_app,
    flash, redirect, url_for,
)
from flask_login import login_required, current_user

from app.extensions import db
from app.models.saisie import Saisie
from app.models.ligne  import Ligne
from app.services.rapport_service import collecter_donnees, generer_pdf

bp_rapports = Blueprint('rapports', __name__)


# ── Page principale ─────────────────────────────────────────────────────────

@bp_rapports.route('/')
@login_required
def index():
    """Affiche l'historique paginé des saisies."""
    page     = request.args.get('page', 1, type=int)
    per_page = 20

    pagination = (
        Saisie.query
        .order_by(Saisie.date.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    lignes = Ligne.query.order_by(Ligne.code).all()

    return render_template(
        'admin/admin_rapports.html',
        rapports = pagination,
        lignes   = lignes,
    )


# ── API : génération rapport JSON ───────────────────────────────────────────

@bp_rapports.route('/generer', methods=['POST'])
@login_required
def generer():
    """
    Reçoit en JSON :
      { type_rapport, type_periode, date_debut, date_fin, ligne_id }
    Retourne le rapport structuré en JSON pour affichage côté client.
    """
    body = request.get_json(silent=True) or {}

    type_rapport = body.get('type_rapport', 'exploitation')
    type_periode = body.get('type_periode')          # peut être None si custom
    date_debut   = body.get('date_debut')            # 'YYYY-MM-DD' ou None
    date_fin     = body.get('date_fin')              # 'YYYY-MM-DD' ou None
    ligne_id     = body.get('ligne_id')              # int ou None

    try:
        ligne_id = int(ligne_id) if ligne_id else None
    except (ValueError, TypeError):
        ligne_id = None

    try:
        donnees = collecter_donnees(
            type_rapport = type_rapport,
            type_periode = type_periode,
            date_debut   = date_debut,
            date_fin     = date_fin,
            ligne_id     = ligne_id,
        )
        return jsonify(donnees), 200
    except Exception as e:
        current_app.logger.error(f'[rapports.generer] {e}')
        return jsonify({'message': str(e)}), 500


# ── API : export PDF ────────────────────────────────────────────────────────

@bp_rapports.route('/export-pdf', methods=['POST'])
@login_required
def export_pdf():
    """
    Génère et retourne un PDF téléchargeable.
    Même paramètres que /generer.
    """
    body = request.get_json(silent=True) or {}

    type_rapport = body.get('type_rapport', 'exploitation')
    type_periode = body.get('type_periode')
    date_debut   = body.get('date_debut')
    date_fin     = body.get('date_fin')
    ligne_id     = body.get('ligne_id')

    try:
        ligne_id = int(ligne_id) if ligne_id else None
    except (ValueError, TypeError):
        ligne_id = None

    try:
        donnees  = collecter_donnees(
            type_rapport = type_rapport,
            type_periode = type_periode,
            date_debut   = date_debut,
            date_fin     = date_fin,
            ligne_id     = ligne_id,
        )
        pdf_bytes = generer_pdf(donnees)

        # Sauvegarder une copie sur disque (optionnel)
        output_dir = current_app.config.get('RAPPORT_OUTPUT_DIR')
        if output_dir:
            os.makedirs(str(output_dir), exist_ok=True)
            nom_fichier = f"rapport_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            chemin      = os.path.join(str(output_dir), nom_fichier)
            with open(chemin, 'wb') as f:
                f.write(pdf_bytes)

        nom_dl = f"rapport_voyageiq_{datetime.now().strftime('%Y-%m-%d')}.pdf"
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype         = 'application/pdf',
            as_attachment    = True,
            download_name    = nom_dl,
        )

    except RuntimeError as e:
        # xhtml2pdf non installé ou autre erreur PDF
        current_app.logger.error(f'[rapports.export_pdf] {e}')
        return jsonify({'message': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f'[rapports.export_pdf] {e}')
        return jsonify({'message': 'Erreur génération PDF.'}), 500


# ── API : envoi email ───────────────────────────────────────────────────────

@bp_rapports.route('/envoyer-email', methods=['POST'])
@login_required
def envoyer_email():
    """
    Génère le PDF et l'envoie par email (Gmail SMTP via Flask-Mail).
    Paramètres identiques à /generer.
    """
    body = request.get_json(silent=True) or {}

    try:
        from flask_mail import Mail, Message as MailMessage
        mail = Mail(current_app)
    except ImportError:
        return jsonify({'message': 'Flask-Mail non installé (pip install Flask-Mail).'}), 500

    try:
        # Paramètres
        ligne_id = body.get('ligne_id')
        try:
            ligne_id = int(ligne_id) if ligne_id else None
        except (ValueError, TypeError):
            ligne_id = None

        donnees   = collecter_donnees(
            type_rapport = body.get('type_rapport', 'exploitation'),
            type_periode = body.get('type_periode'),
            date_debut   = body.get('date_debut'),
            date_fin     = body.get('date_fin'),
            ligne_id     = ligne_id,
        )
        pdf_bytes = generer_pdf(donnees)
        meta      = donnees['meta']
        kpis      = donnees['kpis']

        dest = current_app.config.get('RAPPORT_DEST_EMAIL', 'paolocisse6@gmail.com')

        msg = MailMessage(
            subject    = f"[VoyageIQ Pro] Rapport {meta['type_rapport']} — {meta['debut']} → {meta['fin']}",
            recipients = [dest],
            sender     = current_app.config.get('MAIL_DEFAULT_SENDER'),
        )

        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <div style="background:#0A0A0A;padding:20px;border-radius:8px 8px 0 0;text-align:center">
            <h1 style="color:#C9A84C;font-size:22px;margin:0">VoyageIQ Pro</h1>
            <p style="color:#7A766E;font-size:12px;margin:4px 0 0">Rapport automatique</p>
          </div>
          <div style="background:#f9f9f9;padding:24px;border:1px solid #eee">
            <h2 style="color:#1A1A1A;font-size:16px">Rapport {meta['type_rapport'].upper()}</h2>
            <p style="color:#555;font-size:13px">Période : <strong>{meta['debut']} → {meta['fin']}</strong></p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#C9A84C">
                <td style="padding:8px 12px;color:#0A0A0A;font-weight:700;font-size:12px">Indicateur</td>
                <td style="padding:8px 12px;color:#0A0A0A;font-weight:700;font-size:12px;text-align:right">Valeur</td>
              </tr>
              <tr style="background:#fff">
                <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #eee">Recettes</td>
                <td style="padding:8px 12px;font-size:12px;text-align:right;color:#16A34A;border-bottom:1px solid #eee">
                  {kpis['recettes']:,.0f} FCFA
                </td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #eee">Dépenses</td>
                <td style="padding:8px 12px;font-size:12px;text-align:right;color:#DC2626;border-bottom:1px solid #eee">
                  {kpis['depenses']:,.0f} FCFA
                </td>
              </tr>
              <tr style="background:#fff">
                <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #eee">Marge</td>
                <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:700;
                           color:{'#C9A84C' if kpis['marge'] >= 0 else '#DC2626'};border-bottom:1px solid #eee">
                  {kpis['marge']:+,.0f} FCFA
                </td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:8px 12px;font-size:12px">Voyages / Passagers</td>
                <td style="padding:8px 12px;font-size:12px;text-align:right">
                  {kpis['voyages']} / {kpis['passagers']}
                </td>
              </tr>
            </table>
            <p style="color:#555;font-size:12px">Le rapport complet est joint en PDF à cet email.</p>
          </div>
          <div style="background:#eee;padding:12px;border-radius:0 0 8px 8px;text-align:center">
            <p style="color:#888;font-size:10px;margin:0">
              VoyageIQ Pro — Généré le {meta['genere_le']} — Document confidentiel
            </p>
          </div>
        </div>
        """

        nom_pdf = f"rapport_{meta['type_rapport']}_{datetime.now().strftime('%Y%m%d')}.pdf"
        msg.attach(nom_pdf, 'application/pdf', pdf_bytes)
        mail.send(msg)

        return jsonify({'message': f'Email envoyé à {dest}'}), 200

    except Exception as e:
        current_app.logger.error(f'[rapports.envoyer_email] {e}')
        return jsonify({'message': str(e)}), 500
