from flask import Blueprint
saisie_bp = Blueprint('saisie', __name__, template_folder='../../templates/saisie')
from app.blueprints.saisie import routes  # noqa
