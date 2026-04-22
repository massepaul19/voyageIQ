from flask import Flask, redirect, url_for, render_template
from config.settings import config
from app.extensions import db, login_manager, csrf


def create_app(env='default'):
    app = Flask(__name__)
    app.config.from_object(config[env])

    # ── Extensions ────────────────────────────────────────────
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    login_manager.login_view         = 'auth.login'
    login_manager.login_message      = 'Veuillez vous connecter pour accéder à cette page.'
    login_manager.login_message_category = 'warning'

    # ── Variables globales Jinja2 ─────────────────────────────
    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        return dict(current_user=current_user)

    # ── Blueprints ────────────────────────────────────────────
    from app.blueprints.bp_auth       import bp_auth
    from app.blueprints.bp_public     import bp_public
    from app.blueprints.bp_dashboard  import bp_dashboard
    from app.blueprints.bp_saisie     import bp_saisie
    from app.blueprints.bp_lignes     import bp_lignes
    from app.blueprints.bp_flotte     import bp_flotte
    from app.blueprints.bp_finance    import bp_finance
    from app.blueprints.bp_operations import bp_operations
    from app.blueprints.bp_clientele  import bp_clientele
    from app.blueprints.bp_analytique import bp_analytique
    from app.blueprints.bp_alertes    import bp_alertes
    from app.blueprints.bp_admin      import bp_admin
    from app.blueprints.bp_chauffeur  import bp_chauffeur
    from app.blueprints.bp_rapports   import bp_rapports
    from app.blueprints.bp_api        import bp_api

    app.register_blueprint(bp_public,     url_prefix='')
    app.register_blueprint(bp_auth,       url_prefix='/auth')
    app.register_blueprint(bp_chauffeur,  url_prefix='/chauffeur')
    app.register_blueprint(bp_dashboard,  url_prefix='/dashboard')
    app.register_blueprint(bp_saisie,     url_prefix='/saisie')
    app.register_blueprint(bp_lignes,     url_prefix='/lignes')
    app.register_blueprint(bp_flotte,     url_prefix='/flotte')
    app.register_blueprint(bp_finance,    url_prefix='/finance')
    app.register_blueprint(bp_operations, url_prefix='/operations')
    app.register_blueprint(bp_clientele,  url_prefix='/clientele')
    app.register_blueprint(bp_analytique, url_prefix='/analytique')
    app.register_blueprint(bp_alertes,    url_prefix='/alertes')
    app.register_blueprint(bp_admin,      url_prefix='/admin')
    app.register_blueprint(bp_rapports,   url_prefix='/rapports')
    app.register_blueprint(bp_api,        url_prefix='/api')

    # ── Gestionnaires d'erreurs ───────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        return render_template('errors/500.html'), 500

    return app
