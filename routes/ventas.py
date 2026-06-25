from flask import Blueprint, render_template

ventas_bp = Blueprint('ventas', __name__)

@ventas_bp.route('/ventas')
def ventas():
    return render_template('ventas.html')
