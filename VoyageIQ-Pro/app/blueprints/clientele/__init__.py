from flask import Blueprint
clientele_bp = Blueprint('clientele', __name__, template_folder='../../templates/clientele')
from app.blueprints.clientele import routes  # noqa
