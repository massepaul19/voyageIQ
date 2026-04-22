from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user

bp_public = Blueprint('public', __name__)


# ── Routes à implémenter ──────────────────────────────────────

