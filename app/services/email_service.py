"""
services/email_service.py
Envoi d'emails via Flask-Mail (Gmail SMTP).
pip install flask-mail
"""
from flask import current_app
from flask_mail import Mail, Message

# Instance partagée (initialisée dans app/__init__.py)
mail = Mail()


def envoyer_rapport_email(
    destinataire: str,
    sujet: str,
    corps_html: str,
    pdf_bytes: bytes | None = None,
    nom_fichier: str = 'rapport.pdf',
) -> tuple[bool, str]:
    """
    Envoie un rapport par email.

    Args:
        destinataire : adresse email cible
        sujet        : sujet de l'email
        corps_html   : contenu HTML de l'email
        pdf_bytes    : PDF en bytes à attacher (optionnel)
        nom_fichier  : nom du fichier PDF joint

    Returns:
        (True, '')           si envoi réussi
        (False, message_err) en cas d'échec
    """
    try:
        msg = Message(
            subject=sujet,
            recipients=[destinataire],
            html=corps_html,
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
        )

        if pdf_bytes:
            msg.attach(
                filename=nom_fichier,
                content_type='application/pdf',
                data=pdf_bytes,
            )

        mail.send(msg)
        current_app.logger.info(f'[Email] Rapport envoyé à {destinataire} — {sujet}')
        return True, ''

    except Exception as exc:
        current_app.logger.error(f'[Email] Erreur envoi rapport : {exc}')
        return False, str(exc)


def _corps_email_rapport(titre: str, periode: str, kpis: dict, url_rapport: str) -> str:
    """Génère le corps HTML de l'email de notification de rapport."""
    gold = '#C9A84C'
    return f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F0F0F;font-family:'DM Sans',Arial,sans-serif;color:#F5F0E8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#111;border:1px solid #242424;border-radius:12px;overflow:hidden;margin-bottom:16px;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #242424;">
              <p style="margin:0 0 4px;font-size:11px;color:{gold};letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">
                VoyageIQ Pro — Rapport automatique
              </p>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#F5F0E8;">{titre}</h1>
              <p style="margin:6px 0 0;font-size:12px;color:#5A5048;">{periode}</p>
            </td>
          </tr>

          <!-- KPIs -->
          <tr>
            <td style="padding:20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding:12px;">
                    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:{gold};">
                      {"{:,.0f}".format(kpis.get("recettes", 0))} FCFA
                    </p>
                    <p style="margin:0;font-size:10px;color:#9A9080;text-transform:uppercase;letter-spacing:.5px;">Recettes</p>
                  </td>
                  <td style="text-align:center;padding:12px;border-left:1px solid #242424;">
                    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#22C55E;">
                      {kpis.get("voyages", 0)}
                    </p>
                    <p style="margin:0;font-size:10px;color:#9A9080;text-transform:uppercase;letter-spacing:.5px;">Voyages</p>
                  </td>
                  <td style="text-align:center;padding:12px;border-left:1px solid #242424;">
                    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#60A5FA;">
                      {kpis.get("passagers", 0)}
                    </p>
                    <p style="margin:0;font-size:10px;color:#9A9080;text-transform:uppercase;letter-spacing:.5px;">Passagers</p>
                  </td>
                  <td style="text-align:center;padding:12px;border-left:1px solid #242424;">
                    <p style="margin:0 0 4px;font-size:22px;font-weight:800;
                       color:{'#22C55E' if kpis.get('marge', 0) >= 0 else '#EF4444'};">
                      {"{:+,.0f}".format(kpis.get("marge", 0))} FCFA
                    </p>
                    <p style="margin:0;font-size:10px;color:#9A9080;text-transform:uppercase;letter-spacing:.5px;">Marge</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 28px;border-top:1px solid #242424;text-align:center;">
              <p style="margin:0 0 16px;font-size:12px;color:#5A5048;">
                Le rapport complet est joint à cet email en PDF.<br>
                Vous pouvez également le consulter directement dans l'application.
              </p>
              <a href="{url_rapport}"
                 style="display:inline-block;padding:10px 24px;background:{gold};color:#0A0A0A;
                        border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;">
                Voir le rapport en ligne
              </a>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="text-align:center;font-size:10px;color:#2A2520;margin-top:16px;">
          VoyageIQ Pro — {current_app.config.get('APP_COMPANY', 'VoyageIQ Transport')} —
          Email généré automatiquement, ne pas répondre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""
