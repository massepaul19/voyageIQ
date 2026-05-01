from functools import wraps
from flask import abort, flash, redirect, url_for
from flask_login import current_user


def role_required(*roles):
    """
    Restreint l'accès aux utilisateurs ayant l'un des rôles listés.
    Accepte un ou plusieurs rôles : @role_required('admin', 'dg', 'chef')
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                flash('Veuillez vous connecter.', 'warning')
                return redirect(url_for('auth.login'))
            # Les chauffeurs n'ont pas d'attribut 'role'
            if not hasattr(current_user, 'role'):
                flash('Accès non autorisé.', 'danger')
                return redirect(url_for('public.index'))
            if current_user.role not in roles:
                flash('Vous n\'avez pas les permissions pour accéder à cette page.', 'danger')
                abort(403)
            return f(*args, **kwargs)
        return decorated
    return decorator


def niveau_required(niveau_min):
    """
    Restreint l'accès aux utilisateurs ayant un niveau >= niveau_min.
    Utile pour des règles hiérarchiques : @niveau_required(3)
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                flash('Veuillez vous connecter.', 'warning')
                return redirect(url_for('auth.login'))
            if not hasattr(current_user, 'niveau'):
                flash('Accès non autorisé.', 'danger')
                return redirect(url_for('public.index'))
            if current_user.niveau() < niveau_min:
                flash('Niveau d\'accès insuffisant.', 'danger')
                abort(403)
            return f(*args, **kwargs)
        return decorated
    return decorator


def can_saisir(f):
    """
    Restreint l'accès aux rôles autorisés à faire la saisie journalière :
    admin, chef, superviseur.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Veuillez vous connecter.', 'warning')
            return redirect(url_for('auth.login'))
        if not hasattr(current_user, 'role'):
            flash('Accès réservé au personnel.', 'danger')
            return redirect(url_for('public.index'))
        if current_user.role not in ('admin', 'chef', 'superviseur'):
            flash('Vous n\'êtes pas autorisé à effectuer la saisie.', 'danger')
            abort(403)
        return f(*args, **kwargs)
    return decorated


def chauffeur_required(f):
    """
    Restreint l'accès aux chauffeurs actifs et validés.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Connectez-vous à votre espace chauffeur.', 'warning')
            return redirect(url_for('chauffeur.login'))
        if not hasattr(current_user, 'statut_inscription'):
            flash('Accès réservé aux chauffeurs.', 'danger')
            return redirect(url_for('public.index'))
        if not current_user.actif:
            flash('Votre compte est en attente de validation.', 'warning')
            return redirect(url_for('chauffeur.inscription_attente'))
        return f(*args, **kwargs)
    return decorated
