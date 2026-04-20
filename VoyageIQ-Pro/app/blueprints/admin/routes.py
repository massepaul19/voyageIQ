from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.blueprints.admin import admin_bp
from app.extensions import db
from app.models.utilisateur import Utilisateur, ROLES
from app.utils.decorators import role_required

@admin_bp.route('/')
@login_required
@role_required('admin')
def index():
    users = Utilisateur.query.all()
    return render_template('admin/index.html', users=users, roles=ROLES)

@admin_bp.route('/ajouter-utilisateur', methods=['POST'])
@login_required
@role_required('admin')
def ajouter_utilisateur():
    u = Utilisateur(
        identifiant = request.form['identifiant'].strip(),
        nom         = request.form['nom'].strip(),
        role        = request.form['role'],
        agence      = request.form.get('agence',''),
    )
    u.set_password(request.form['password'])
    db.session.add(u); db.session.commit()
    flash(f'Utilisateur {u.identifiant} créé.', 'success')
    return redirect(url_for('admin.index'))

@admin_bp.route('/supprimer-utilisateur/<int:uid>', methods=['POST'])
@login_required
@role_required('admin')
def supprimer_utilisateur(uid):
    u = Utilisateur.query.get_or_404(uid)
    db.session.delete(u); db.session.commit()
    flash(f'Utilisateur supprimé.', 'warning')
    return redirect(url_for('admin.index'))
