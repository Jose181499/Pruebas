from flask import Blueprint, render_template, request, jsonify

from database import (guardar_usuario_db,listar_usuarios_db,eliminar_usuario_db)

mantenedor_usuarios_bp = Blueprint('mantenedor_usuarios',__name__)

# =====================================
# LISTA USUARIOS
# =====================================
@mantenedor_usuarios_bp.route('/mantenedor/usuarios')
def usuarios():

    return render_template(
        'mantenedor/usuarios.html'
    )

# =====================================
# NUEVO USUARIO
# =====================================
@mantenedor_usuarios_bp.route('/mantenedor/usuarios/nuevo')
def nuevo_usuario():

    return render_template(
        'mantenedor/nuevo_usuario.html'
    )


# =========================================
# GUARDAR
# =========================================
@mantenedor_usuarios_bp.route(
    '/api/usuarios/guardar',
    methods=['POST']
)
def guardar_usuario():

    data = request.json

    guardar_usuario_db(data)

    return jsonify(success=True)


# =========================================
# LISTAR
# =========================================
@mantenedor_usuarios_bp.route('/api/usuarios')
def listar_usuarios():

    usuarios = listar_usuarios_db()

    return jsonify(usuarios)


# =========================================
# ELIMINAR
# =========================================
@mantenedor_usuarios_bp.route(
    '/api/usuarios/<int:id>',
    methods=['DELETE']
)
def eliminar_usuario(id):

    eliminar_usuario_db(id)

    return jsonify(success=True)

