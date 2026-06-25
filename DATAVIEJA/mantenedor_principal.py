from flask import Blueprint, render_template,request, jsonify
from database import obtener_productos

mantenedor_principal_bp = Blueprint("mantenedor_principal", __name__)

@mantenedor_principal_bp.route("/mantenedor")
def mantenedor():
     
    productos = obtener_productos()

    return render_template(
       "mantenedor.html",
        productos=productos
)