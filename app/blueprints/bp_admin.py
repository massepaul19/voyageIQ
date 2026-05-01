from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from app.extensions import db
from app.models.utilisateur import Utilisateur, ROLES
from app.models.chauffeur import Chauffeur
from app.utils.decorators import role_required
import uuid, os

bp_admin = Blueprint('admin', __name__)


def _normaliser_telephone(tel):
    """Nettoie et formate le numéro au format international Cameroun."""
    if not tel: return None
    tel = tel.strip().replace(' ', '').replace('-', '')
    if len(tel) == 9 and tel[0] in '6789':
        tel = '+237' + tel
    elif tel.startswith('237') and not tel.startswith('+'):
        tel = '+' + tel
    return tel

@bp_admin.route('/')
@login_required
@role_required('admin')
def index():
    return redirect(url_for('dashboard.index'))


# ── Utilisateurs ──────────────────────────────────────────────

@bp_admin.route('/utilisateurs')
@login_required
@role_required('admin')
def utilisateurs():
    page  = request.args.get('page', 1, type=int)
    users = Utilisateur.query.order_by(Utilisateur.role, Utilisateur.nom)\
                .paginate(page=page, per_page=15)
    roles = ROLES
    return render_template('admin/admin_utilisateurs.html', users=users, roles=roles)


@bp_admin.route('/ajouter-utilisateur', methods=['POST'])
@login_required
@role_required('admin')
def ajouter_utilisateur():
    identifiant = request.form.get('identifiant', '').strip()
    telephone   = request.form.get('telephone', '').strip()
    nom         = request.form.get('nom', '').strip()
    prenom      = request.form.get('prenom', '').strip()
    role        = request.form.get('role', 'superviseur')
    agence      = request.form.get('agence', '').strip()
    password    = request.form.get('password', '')

    if not all([identifiant, nom, password]):
        flash('Identifiant, nom et mot de passe sont obligatoires.', 'danger')
        return redirect(url_for('admin.utilisateurs'))

    if Utilisateur.query.filter_by(identifiant=identifiant).first():
        flash(f'L\'identifiant « {identifiant} » existe déjà.', 'danger')
        return redirect(url_for('admin.utilisateurs'))

    # Normaliser téléphone
    telephone = _normaliser_telephone(telephone)

    u = Utilisateur(
        identifiant = identifiant,
        nom         = nom,
        prenom      = prenom or None,
        role        = role,
        agence      = agence or None,
        telephone   = telephone or None,
        matricule   = request.form.get('matricule', '').strip() or None,
        email       = request.form.get('email', '').strip() or None,
    )
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    flash(f'Utilisateur {u.identifiant} créé avec succès.', 'success')
    return redirect(url_for('admin.utilisateurs'))


@bp_admin.route('/modifier-utilisateur/<int:uid>', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def modifier_utilisateur(uid):
    u = Utilisateur.query.get_or_404(uid)
    if request.method == 'POST':
        u.nom       = request.form.get('nom', u.nom).strip()
        u.prenom    = request.form.get('prenom', u.prenom or '').strip() or None
        u.role      = request.form.get('role', u.role)
        u.agence    = request.form.get('agence', u.agence or '').strip() or None
        u.telephone = _normaliser_telephone(request.form.get('telephone'))
        u.email     = request.form.get('email', u.email or '').strip() or None
        u.actif     = request.form.get('actif') == 'on'
        new_pwd     = request.form.get('password', '').strip()
        if new_pwd:
            u.set_password(new_pwd)
        db.session.commit()
        flash(f'Utilisateur {u.identifiant} mis à jour.', 'success')
        return redirect(url_for('admin.utilisateurs'))
    return render_template('admin/modifier_utilisateur.html', user=u, roles=ROLES)


@bp_admin.route('/supprimer-utilisateur/<int:uid>', methods=['POST'])
@login_required
@role_required('admin')
def supprimer_utilisateur(uid):
    u = Utilisateur.query.get_or_404(uid)
    if u.id == current_user.id:
        flash('Vous ne pouvez pas supprimer votre propre compte.', 'danger')
        return redirect(url_for('admin.utilisateurs'))
    db.session.delete(u)
    db.session.commit()
    flash('Utilisateur supprimé.', 'warning')
    return redirect(url_for('admin.utilisateurs'))


# ── Avis et Commentaires ──────────────────────────────────────

@bp_admin.route('/avis')
@login_required
@role_required('admin', 'dg')
def avis():
    # Données simulées pour admin_avis.html en attendant le modèle Avis
    avis_data = {
        'total': 0,
        'en_attente': 0,
        'approuves': 0,
        'rejetes': 0,
        'liste': [],
        'stats_notes': [0, 0, 0, 0, 0],
        'categories_labels': [],
        'categories_data': []
    }
    return render_template('admin/admin_avis.html', avis=avis_data)


# ── Chauffeurs ────────────────────────────────────────────────

@bp_admin.route('/chauffeurs')
@login_required
@role_required('admin', 'dg', 'chef')
def chauffeurs():
    page      = request.args.get('page', 1, type=int)
    statut    = request.args.get('statut', '')      # en_attente / valide / rejete
    query     = Chauffeur.query
    if statut:
        query = query.filter_by(statut_inscription=statut)
    chauffeurs = query.order_by(Chauffeur.created_at.desc())\
                      .paginate(page=page, per_page=15)
    en_attente = Chauffeur.query.filter_by(statut_inscription='en_attente').count()
    return render_template('admin/admin_chauffeurs.html',
                           chauffeurs=chauffeurs,
                           en_attente=en_attente,
                           statut_filtre=statut)


@bp_admin.route('/valider-chauffeur/<int:cid>', methods=['POST'])
@login_required
@role_required('admin', 'chef')
def valider_chauffeur(cid):
    from datetime import datetime, timezone
    c = Chauffeur.query.get_or_404(cid)
    c.statut_inscription = 'valide'
    c.actif              = True
    c.validated_by       = current_user.id
    c.validated_at       = datetime.now(timezone.utc)
    # Générer matricule
    count = Chauffeur.query.filter_by(statut_inscription='valide').count()
    c.matricule = f"VIQ-CHF-{str(count).zfill(3)}"
    db.session.commit()
    flash(f'Chauffeur {c.nom_complet()} validé — matricule {c.matricule}.', 'success')
    return redirect(url_for('admin.chauffeurs'))


@bp_admin.route('/rejeter-chauffeur/<int:cid>', methods=['POST'])
@login_required
@role_required('admin', 'chef')
def rejeter_chauffeur(cid):
    c = Chauffeur.query.get_or_404(cid)
    c.statut_inscription = 'rejete'
    c.actif              = False
    db.session.commit()
    flash(f'Demande de {c.nom_complet()} rejetée.', 'warning')
    return redirect(url_for('admin.chauffeurs'))


@bp_admin.route('/modifier-chauffeur/<int:cid>', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'chef')
def modifier_chauffeur(cid):
    c = Chauffeur.query.get_or_404(cid)
    if request.method == 'POST':
        c.nom      = request.form.get('nom', c.nom).strip()
        c.prenom   = request.form.get('prenom', c.prenom).strip()
        c.telephone= request.form.get('telephone', c.telephone).strip()
        c.agence   = request.form.get('agence', c.agence or '').strip() or None
        c.statut   = request.form.get('statut', c.statut)
        db.session.commit()
        flash(f'Chauffeur {c.nom_complet()} mis à jour.', 'success')
        return redirect(url_for('admin.chauffeurs'))
    return render_template('admin/modifier_chauffeur.html', chauffeur=c)


# ── Profil de l'utilisateur connecté ─────────────────────────

@bp_admin.route('/mon-profil', methods=['GET', 'POST'])
@login_required
def modifier_profil():
    if request.method == 'POST':
        current_user.nom      = request.form.get('nom', current_user.nom).strip()
        current_user.prenom   = request.form.get('prenom', current_user.prenom or '').strip() or None
        current_user.email    = request.form.get('email', current_user.email or '').strip() or None
        current_user.telephone= request.form.get('telephone', current_user.telephone or '').strip() or None
        current_user.bio      = request.form.get('bio', current_user.bio or '').strip() or None

        # Photo
        photo = request.files.get('photo')
        if photo and photo.filename:
            ext = photo.filename.rsplit('.', 1)[-1].lower()
            if ext in {'png', 'jpg', 'jpeg', 'webp'}:
                filename = f"{uuid.uuid4().hex}.{ext}"
                from flask import current_app
                save_path = os.path.join(
                    current_app.config.get('UPLOAD_AVATARS',
                        os.path.join('app', 'static', 'images', 'avatars')),
                    filename
                )
                photo.save(save_path)
                current_user.photo = filename

        # Mot de passe
        new_pwd  = request.form.get('new_password', '').strip()
        new_pwd2 = request.form.get('new_password2', '').strip()
        if new_pwd:
            if new_pwd != new_pwd2:
                flash('Les nouveaux mots de passe ne correspondent pas.', 'danger')
                return render_template('admin/modifier_profil.html')
            current_user.set_password(new_pwd)

        db.session.commit()
        flash('Profil mis à jour.', 'success')
        return redirect(url_for('admin.modifier_profil'))

    return render_template('admin/modifier_profil.html')
