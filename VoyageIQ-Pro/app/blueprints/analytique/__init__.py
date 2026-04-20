from flask import Blueprint
analytique_bp = Blueprint('analytique', __name__, template_folder='../../templates/analytique')
from app.blueprints.analytique import routes  # noqa
