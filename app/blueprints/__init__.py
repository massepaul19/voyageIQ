"""
Blueprints VoyageIQ-Pro
Chaque module = un fichier bp_<module>.py
"""
from app.blueprints.bp_admin      import bp_admin
from app.blueprints.bp_alertes    import bp_alertes
from app.blueprints.bp_analytique import bp_analytique
from app.blueprints.bp_api        import bp_api
from app.blueprints.bp_auth       import bp_auth
from app.blueprints.bp_chauffeur  import bp_chauffeur
from app.blueprints.bp_clientele  import bp_clientele
from app.blueprints.bp_dashboard  import bp_dashboard
from app.blueprints.bp_finance    import bp_finance
from app.blueprints.bp_flotte     import bp_flotte
from app.blueprints.bp_lignes     import bp_lignes
from app.blueprints.bp_operations import bp_operations
from app.blueprints.bp_public     import bp_public
from app.blueprints.bp_rapports   import bp_rapports
from app.blueprints.bp_saisie     import bp_saisie

ALL_BLUEPRINTS = [
    (bp_public,     ''),
    (bp_auth,       '/auth'),
    (bp_dashboard,  '/dashboard'),
    (bp_admin,      '/admin'),
    (bp_chauffeur,  '/chauffeur'),
    (bp_saisie,     '/saisie'),
    (bp_flotte,     '/flotte'),
    (bp_lignes,     '/lignes'),
    (bp_finance,    '/finance'),
    (bp_operations, '/operations'),
    (bp_clientele,  '/clientele'),
    (bp_analytique, '/analytique'),
    (bp_alertes,    '/alertes'),
    (bp_rapports,   '/rapports'),
    (bp_api,        '/api'),
]
