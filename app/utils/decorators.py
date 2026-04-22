from functools import wraps
from flask import abort, flash, redirect, url_for
from flask_login import current_user

def role_required(*roles):
    """Décorateur : accès restreint aux rôles listés."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.role not in roles:
                flash("Accès refusé — droits insuffisants.", "danger")
                return redirect(url_for('dashboard.index'))
            return f(*args, **kwargs)
        return decorated
    return decorator

def niveau_min(niveau):
    """Décorateur : niveau hiérarchique minimum requis."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('auth.login'))
            if current_user.niveau() < niveau:
                flash("Accès refusé — niveau hiérarchique insuffisant.", "danger")
                return redirect(url_for('dashboard.index'))
            return f(*args, **kwargs)
        return decorated
    return decorator

def can_saisir(f):
    """Décorateur : peut effectuer des saisies (chef, superviseur, admin)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if current_user.role not in ('admin', 'chef', 'superviseur'):
            flash("Vous n'avez pas l'autorisation de saisir des données.", "danger")
            return redirect(url_for('dashboard.index'))
        return f(*args, **kwargs)
    return decorated
