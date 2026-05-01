from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models.chauffeur import Chauffeur, CourseChauffeur
from app.extensions import db
from datetime import datetime, date, timezone
from functools import wraps
import os, uuid

bp_chauffeur = Blueprint('chauffeur', __name__)


# ── Filtre Jinja2 ─────────────────────────────────────────────
@bp_chauffeur.app_template_filter('format_fcfa')
def format_fcfa_filter(value):
    try:
        return f"{int(value):,}".replace(',', ' ') + " FCFA"
    except (ValueError, TypeError):
        return f"{value} FCFA"


# ── Décorateur : accès réservé aux chauffeurs actifs ──────────
def chauffeur_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Connectez-vous pour accéder à votre espace.', 'warning')
            return redirect(url_for('chauffeur.login'))
        # Vérifier que c'est bien un chauffeur (a l'attribut statut_inscription)
        if not hasattr(current_user, 'statut_inscription'):
            flash('Accès réservé aux chauffeurs.', 'danger')
            return redirect(url_for('public.index'))
        if not current_user.actif:
            return redirect(url_for('chauffeur.inscription_attente'))
        return f(*args, **kwargs)
    return decorated


def _normaliser_telephone(tel):
    tel = tel.strip().replace(' ', '').replace('-', '')
    if tel.startswith('237') and not tel.startswith('+'):
        tel = '+' + tel
    elif len(tel) == 9 and tel[0] in '6789':
        tel = '+237' + tel
    return tel


# ════════════════════════════════════════════════════════════
#  AUTH CHAUFFEUR
# ════════════════════════════════════════════════════════════

@bp_chauffeur.route('/login', methods=['GET', 'POST'])
def login():
    # Si déjà connecté en tant que chauffeur, on redirige vers son dashboard
    if current_user.is_authenticated and hasattr(current_user, 'statut_inscription'):
        return redirect(url_for('chauffeur.index'))
    
    # Note: On ne redirige plus les admins automatiquement pour leur permettre de voir le formulaire

    if request.method == 'POST':
        saisie   = request.form.get('telephone', '').strip()
        password = request.form.get('password', '')

        if not saisie or not password:
            flash('Veuillez renseigner tous les champs.', 'warning')
            return render_template('auth/chauffeur_login.html')

        tel = _normaliser_telephone(saisie)

        chauffeur = Chauffeur.query.filter(
            db.or_(
                Chauffeur.telephone == tel,
                Chauffeur.telephone == saisie,
                Chauffeur.username  == saisie,
            )
        ).first()

        if chauffeur and chauffeur.check_password(password):
            if not chauffeur.actif:
                flash('Votre compte est en attente de validation par un administrateur.', 'warning')
                return render_template('chauffeur/chauffeur_inscription_attente.html',
                                       chauffeur=chauffeur)
            chauffeur.last_login = datetime.now(timezone.utc)
            db.session.commit()
            
            # Si un autre utilisateur (ex: admin) est déjà connecté, on le déconnecte d'abord
            if current_user.is_authenticated:
                logout_user()
                
            login_user(chauffeur, remember=False)
            flash(f'Bienvenue, {chauffeur.prenom} !', 'success')
            return redirect(url_for('chauffeur.index'))

        flash('Numéro de téléphone ou mot de passe incorrect.', 'danger')

    return render_template('auth/chauffeur_login.html')


@bp_chauffeur.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('chauffeur.login'))


@bp_chauffeur.route('/inscription', methods=['GET', 'POST'])
def inscription():
    """Formulaire d'inscription chauffeur — compte en attente de validation."""
    if current_user.is_authenticated and hasattr(current_user, 'statut_inscription'):
        return redirect(url_for('chauffeur.index'))

    if request.method == 'POST':
        # Validation minimale
        username  = request.form.get('username', '').strip().lower()
        telephone = _normaliser_telephone(request.form.get('telephone', ''))
        password  = request.form.get('password', '')
        password2 = request.form.get('password2', '')
        nom       = request.form.get('nom', '').strip()
        prenom    = request.form.get('prenom', '').strip()

        erreurs = []
        if not all([username, telephone, password, nom, prenom]):
            erreurs.append('Les champs obligatoires (*) sont requis.')
        if password != password2:
            erreurs.append('Les mots de passe ne correspondent pas.')
        if len(password) < 6:
            erreurs.append('Le mot de passe doit contenir au moins 6 caractères.')
        if Chauffeur.query.filter_by(username=username).first():
            erreurs.append(f"Le nom d'utilisateur « {username} » est déjà pris.")
        if Chauffeur.query.filter_by(telephone=telephone).first():
            erreurs.append('Ce numéro de téléphone est déjà enregistré.')

        if erreurs:
            for e in erreurs:
                flash(e, 'danger')
            return render_template('chauffeur/chauffeur_inscription.html')

        try:
            chauffeur = Chauffeur(
                username            = username,
                nom                 = nom,
                prenom              = prenom,
                telephone           = telephone,
                telephone_urgence   = _normaliser_telephone(request.form.get('telephone_urgence', '')) or None,
                email               = request.form.get('email', '').strip() or None,
                adresse             = request.form.get('adresse', '').strip() or None,
                ville               = request.form.get('ville', ''),
                agence              = request.form.get('agence', ''),
                sexe                = request.form.get('sexe', 'M'),
                annees_exp          = int(request.form.get('annees_exp', 0) or 0),
                num_permis          = request.form.get('num_permis', '').strip() or None,
                categorie_permis    = request.form.get('categorie_permis', '') or None,
                exp_permis          = date.fromisoformat(request.form['exp_permis'])
                                      if request.form.get('exp_permis') else None,
                num_cni             = request.form.get('num_cni', '').strip() or None,
                statut_inscription  = 'en_attente',
                actif               = False,
            )

            # Date de naissance
            if request.form.get('date_naissance'):
                try:
                    chauffeur.date_naissance = date.fromisoformat(request.form['date_naissance'])
                except ValueError:
                    pass

            # Lieu de naissance
            chauffeur.lieu_naissance = request.form.get('lieu_naissance', '').strip() or None

            chauffeur.set_password(password)

            # Photo de profil (optionnel)
            photo = request.files.get('photo')
            if photo and photo.filename:
                ext = photo.filename.rsplit('.', 1)[-1].lower()
                if ext in {'png', 'jpg', 'jpeg', 'webp'}:
                    filename = f"{uuid.uuid4().hex}.{ext}"
                    from flask import current_app
                    save_path = os.path.join(
                        current_app.config.get('UPLOAD_CHAUFFEURS',
                            os.path.join('app', 'static', 'images', 'chauffeurs')),
                        filename
                    )
                    photo.save(save_path)
                    chauffeur.photo = filename

            db.session.add(chauffeur)
            db.session.commit()

            flash('Votre demande a été envoyée. Un administrateur va valider votre compte.', 'success')
            return render_template('chauffeur/chauffeur_inscription_attente.html',
                                   chauffeur=chauffeur)

        except Exception as e:
            db.session.rollback()
            flash(f'Erreur lors de l\'inscription : {str(e)}', 'danger')

    return render_template('chauffeur/chauffeur_inscription.html')


@bp_chauffeur.route('/inscription/attente')
def inscription_attente():
    return render_template('chauffeur/chauffeur_inscription_attente.html')


# ════════════════════════════════════════════════════════════
#  ESPACE CHAUFFEUR (routes protégées)
# ════════════════════════════════════════════════════════════

@bp_chauffeur.route('/')
@bp_chauffeur.route('/dashboard')
@chauffeur_required
def index():
    chauffeur = current_user
    courses   = chauffeur.courses.order_by(CourseChauffeur.date.desc()).limit(5).all()
    stats = {
        'total_courses'    : chauffeur.total_courses(),
        'total_km'         : chauffeur.total_km(),
        'total_passagers'  : chauffeur.total_passagers(),
        'ponctualite'      : chauffeur.taux_ponctualite(),
    }
    return render_template('chauffeur/chauffeur_dashboard.html',
                           chauffeur=chauffeur, courses=courses, stats=stats)


@bp_chauffeur.route('/profil')
@chauffeur_required
def profil():
    return render_template('chauffeur/chauffeur_profil.html', chauffeur=current_user)


@bp_chauffeur.route('/modifier-profil', methods=['GET', 'POST'])
@chauffeur_required
def modifier_profil():
    chauffeur = current_user
    if request.method == 'POST':
        chauffeur.nom      = (request.form.get('nom', chauffeur.nom) or "").strip()
        chauffeur.prenom   = (request.form.get('prenom', chauffeur.prenom) or "").strip()
        chauffeur.email    = (request.form.get('email', chauffeur.email) or "").strip() or None
        chauffeur.adresse  = (request.form.get('adresse', chauffeur.adresse) or "").strip() or None
        chauffeur.ville    = request.form.get('ville', chauffeur.ville)
        chauffeur.bio      = (request.form.get('bio', chauffeur.bio) or "").strip() or None

        # Changement de mot de passe (optionnel)
        new_pwd  = request.form.get('new_password', '').strip()
        new_pwd2 = request.form.get('new_password2', '').strip()
        if new_pwd:
            if new_pwd != new_pwd2:
                flash('Les nouveaux mots de passe ne correspondent pas.', 'danger')
                return render_template('chauffeur/chauffeur_modifier_profil.html',
                                       chauffeur=chauffeur)
            if len(new_pwd) < 6:
                flash('Le mot de passe doit contenir au moins 6 caractères.', 'danger')
                return render_template('chauffeur/chauffeur_modifier_profil.html',
                                       chauffeur=chauffeur)
            chauffeur.set_password(new_pwd)

        # Photo
        photo = request.files.get('photo')
        if photo and photo.filename:
            ext = photo.filename.rsplit('.', 1)[-1].lower()
            if ext in {'png', 'jpg', 'jpeg', 'webp'}:
                filename = f"{uuid.uuid4().hex}.{ext}"
                from flask import current_app
                save_path = os.path.join(
                    current_app.config.get('UPLOAD_CHAUFFEURS',
                        os.path.join('app', 'static', 'images', 'chauffeurs')),
                    filename
                )
                photo.save(save_path)
                chauffeur.photo = filename

        db.session.commit()
        flash('Profil mis à jour avec succès.', 'success')
        return redirect(url_for('chauffeur.profil'))

    return render_template('chauffeur/chauffeur_modifier_profil.html', chauffeur=chauffeur)


@bp_chauffeur.route('/courses')
@chauffeur_required
def courses():
    page    = request.args.get('page', 1, type=int)
    courses = current_user.courses\
        .order_by(CourseChauffeur.date.desc())\
        .paginate(page=page, per_page=15)
    return render_template('chauffeur/chauffeur_courses.html',
                           chauffeur=current_user, courses=courses)


@bp_chauffeur.route('/stats')
@chauffeur_required
def stats():
    chauffeur = current_user
    toutes_courses = chauffeur.courses.all()
    stats = {
        'total_courses'   : chauffeur.total_courses(),
        'total_km'        : round(chauffeur.total_km(), 1),
        'total_passagers' : chauffeur.total_passagers(),
        'ponctualite'     : chauffeur.taux_ponctualite(),
        'km_moyen'        : round(chauffeur.total_km() / max(chauffeur.total_courses(), 1), 1),
        'passagers_moyen' : round(chauffeur.total_passagers() / max(chauffeur.total_courses(), 1), 1),
    }
    return render_template('chauffeur/chauffeur_stats.html',
                           chauffeur=chauffeur, stats=stats, courses=toutes_courses)


@bp_chauffeur.route('/maintenance')
@chauffeur_required
def maintenance():
    from app.models.vehicule import Vehicule
    from app.models.ligne import Ligne
    # Chercher le véhicule associé via la ligne préférée du chauffeur
    vehicule = None
    if current_user.ligne_preferee:
        vehicule = Vehicule.query.filter_by(
            ligne_id=current_user.ligne_preferee,
            statut='operationnel'
        ).first()
    return render_template('chauffeur/chauffeur_maintenance.html',
                           chauffeur=current_user, vehicule=vehicule)


@bp_chauffeur.route('/carte')
@chauffeur_required
def carte():
    return render_template('chauffeur/chauffeur_carte.html', chauffeur=current_user)


@bp_chauffeur.route('/localisation')
@chauffeur_required
def localisation():
    return render_template('chauffeur/chauffeur_localisation.html', chauffeur=current_user)
