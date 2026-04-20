from flask import Flask
from config.settings import config
from app.extensions import db, login_manager, csrf


def create_app(env='default'):
    app = Flask(__name__)
    app.config.from_object(config[env])

    # Extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Veuillez vous connecter pour accéder à cette page.'
    login_manager.login_message_category = 'warning'

    # Context processor — variables globales Jinja2
    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        return dict(current_user=current_user)

    # Blueprints
    from app.blueprints.auth       import auth_bp
    from app.blueprints.dashboard  import dashboard_bp
    from app.blueprints.saisie     import saisie_bp
    from app.blueprints.lignes     import lignes_bp
    from app.blueprints.flotte     import flotte_bp
    from app.blueprints.finance    import finance_bp
    from app.blueprints.operations import operations_bp
    from app.blueprints.clientele  import clientele_bp
    from app.blueprints.analytique import analytique_bp
    from app.blueprints.alertes    import alertes_bp
    from app.blueprints.admin      import admin_bp
    from app.blueprints.api        import api_bp

    app.register_blueprint(auth_bp,       url_prefix='/auth')
    app.register_blueprint(dashboard_bp,  url_prefix='/dashboard')
    app.register_blueprint(saisie_bp,     url_prefix='/saisie')
    app.register_blueprint(lignes_bp,     url_prefix='/lignes')
    app.register_blueprint(flotte_bp,     url_prefix='/flotte')
    app.register_blueprint(finance_bp,    url_prefix='/finance')
    app.register_blueprint(operations_bp, url_prefix='/operations')
    app.register_blueprint(clientele_bp,  url_prefix='/clientele')
    app.register_blueprint(analytique_bp, url_prefix='/analytique')
    app.register_blueprint(alertes_bp,    url_prefix='/alertes')
    app.register_blueprint(admin_bp,      url_prefix='/admin')
    app.register_blueprint(api_bp,        url_prefix='/api')

    # Page d'accueil
    from flask import redirect, url_for
    @app.route('/')
    def index():
        return redirect(url_for('auth.login'))

    # Erreurs
    @app.errorhandler(404)
    def not_found(e):
        from flask import render_template
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        from flask import render_template
        return render_template('errors/500.html'), 500

    return app
