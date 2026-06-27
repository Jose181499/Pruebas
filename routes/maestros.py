from flask import Blueprint, render_template, request, jsonify, session
from utils import login_required

maestros_bp = Blueprint('maestros', __name__, url_prefix='/maestros')

@maestros_bp.route('/')
@login_required
def index():
    """Página principal de maestros"""
    return render_template('maestros/index.html', active_tab='clientes')

