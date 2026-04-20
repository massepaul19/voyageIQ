from flask import Blueprint
flotte_bp = Blueprint('flotte', __name__, template_folder='../../templates/flotte')
from app.blueprints.flotte import routes  # noqa
