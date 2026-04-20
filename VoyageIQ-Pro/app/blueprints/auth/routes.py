from flask import render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from app.blueprints.auth import auth_bp
from app.models.utilisateur import Utilisateur
from datetime import datetime

@auth_bp.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    if request.method == 'POST':
        identifiant = request.form.get('identifiant','').strip()
        password    = request.form.get('password','')
        user = Utilisateur.query.filter_by(identifiant=identifiant, actif=True).first()
        if user and user.check_password(password):
            user.last_login = datetime.utcnow()
            from app.extensions import db
            db.session.commit()
            login_user(user, remember=False)
            flash(f'Bienvenue, {user.nom} !', 'success')
            return redirect(url_for('dashboard.index'))
        flash('Identifiant ou mot de passe incorrect.', 'danger')
    return render_template('auth/login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('auth.login'))
