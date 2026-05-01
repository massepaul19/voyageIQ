from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from app.models.utilisateur import Utilisateur
from app.models.chauffeur import Chauffeur
from app.extensions import db
from datetime import datetime, timezone
from urllib.parse import urlparse

bp_auth = Blueprint('auth', __name__)


def _normaliser_telephone(tel):
    """Accepte +237XXXXXXXXX, 237XXXXXXXXX ou XXXXXXXXX (9 chiffres)."""
    tel = tel.strip().replace(' ', '').replace('-', '')
    if tel.startswith('237') and not tel.startswith('+'):
        tel = '+' + tel
    elif len(tel) == 9 and tel[0] in '6789':
        tel = '+237' + tel
    return tel


def _is_safe_url(target):
    """Vérifie que l'URL de redirection est interne (protection open redirect)."""
    if not target:
        return False
    ref_url = urlparse(request.host_url)
    test_url = urlparse(target)
    return test_url.scheme in ('http', 'https') and ref_url.netloc == test_url.netloc


@bp_auth.route('/login', methods=['GET', 'POST'])
def login():
    # Déjà connecté → redirection selon le type d'utilisateur
    if current_user.is_authenticated:
        if isinstance(current_user, Chauffeur):
            return redirect(url_for('chauffeur.index'))
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        saisie   = request.form.get('telephone', '').strip()
        password = request.form.get('password', '')

        if not saisie or not password:
            flash('Veuillez renseigner tous les champs.', 'warning')
            return render_template('auth/admin_login.html')

        tel_normalise = _normaliser_telephone(saisie)

        user = Utilisateur.query.filter(
            db.or_(
                Utilisateur.telephone == tel_normalise,
                Utilisateur.telephone == saisie,
                Utilisateur.identifiant == saisie,
            ),
            Utilisateur.actif == True
        ).first()

        if user and user.check_password(password):
            user.last_login = datetime.now(timezone.utc)
            db.session.commit()
            login_user(user, remember=False)
            flash(f'Bienvenue, {user.nom_complet()} !', 'success')
            next_page = request.args.get('next')
            # Protection open redirect
            if not _is_safe_url(next_page):
                next_page = url_for('dashboard.index')
            return redirect(next_page)

        flash('Numéro de téléphone ou mot de passe incorrect.', 'danger')

    return render_template('auth/admin_login.html')


@bp_auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('public.index'))
