from flask import Blueprint, render_template

mantenedor_proveedores_bp = Blueprint("mantenedor_proveedores", __name__)


@mantenedor_proveedores_bp.route("/mantenedor/proveedores/gestion")
def gestionar_proveedores():
    return render_template("mantenedor/gestion_proveedores.html")


# Esta ruta la puedes eliminar o dejar comentada:
# @mantenedor_proveedores_bp.route("/mantenedor/proveedores/nuevo")
# def insertar_proveedor():
#     return render_template("mantenedor/nuevo_proveedor.html")