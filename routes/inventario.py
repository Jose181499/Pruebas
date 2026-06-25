from flask import Blueprint, render_template

inventario_bp = Blueprint('inventario', __name__)

@inventario_bp.route('/inventario')
def inventario():
    return render_template('inventario.html')
