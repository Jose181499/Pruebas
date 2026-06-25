from flask import Blueprint, render_template

finanzas_bp = Blueprint('finanzas', __name__)

@finanzas_bp.route('/finanzas')
def finanzas():
    return render_template('finanzas.html')
