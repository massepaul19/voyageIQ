from flask import Blueprint
alertes_bp = Blueprint('alertes', __name__, template_folder='../../templates/alertes')
from app.blueprints.alertes import routes  # noqa
