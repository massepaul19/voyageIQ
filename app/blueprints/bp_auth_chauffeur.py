from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models.chauffeur import Chauffeur
from app.extensions import db
from datetime import datetime, timezone

bp_auth_chauffeur = Blueprint('auth_chauffeur', __name__)


def _normaliser_telephone(tel):
    """Accepte +237XXXXXXXXX, 237XXXXXXXXX ou XXXXXXXXX (9 chiffres)."""
    tel = tel.strip().replace(' ', '').replace('-', '')
    if tel.startswith('237') and not tel.startswith('+'):
        tel = '+' + tel
    elif len(tel) == 9 and tel[0] in '6789':
        tel = '+237' + tel
    return tel


@bp_auth_chauffeur.route('/login', methods=['GET', 'POST'])
def login():
    """Page de connexion pour les chauffeurs."""
    if current_user.is_authenticated:
        return redirect(url_for('chauffeur.index'))

    if request.method == 'POST':
        saisie   = request.form.get('telephone', '').strip()
        password = request.form.get('password', '')

        if not saisie or not password:
            flash('Veuillez renseigner tous les champs.', 'warning')
            return render_template('auth/chauffeur_login.html')

        tel_normalise = _normaliser_telephone(saisie)

        # Recherche avec téléphone normalisé OU tel brut (robustesse)
        chauffeur = Chauffeur.query.filter(
            db.or_(
                Chauffeur.telephone == tel_normalise,
                Chauffeur.telephone == saisie,
            ),
            Chauffeur.actif == True
        ).first()

        if chauffeur and chauffeur.check_password(password):
            chauffeur.last_login = datetime.now(timezone.utc)  # corrigé : utcnow() déprécié
            db.session.commit()
            login_user(chauffeur, remember=False)
            flash(f'Bienvenue, {chauffeur.nom} !', 'success')
            return redirect(url_for('chauffeur.index'))

        flash('Téléphone ou mot de passe incorrect.', 'danger')

    return render_template('auth/chauffeur_login.html')


@bp_auth_chauffeur.route('/logout')
@login_required
def logout():
    """Déconnexion chauffeur."""
    logout_user()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('auth_chauffeur.login'))
