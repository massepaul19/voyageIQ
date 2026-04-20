from flask import Blueprint
lignes_bp = Blueprint('lignes', __name__, template_folder='../../templates/lignes')
from app.blueprints.lignes import routes  # noqa
