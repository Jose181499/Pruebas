from flask import Blueprint, request, jsonify
from database import (db_query,guardar_usuario_db,listar_usuarios_db,eliminar_usuario_db, actualizar_usuario_db)

usuarios_bp = Blueprint("usuarios", __name__)

# =====================================
# GUARDAR
# =====================================
@usuarios_bp.route('/api/usuarios/guardar', methods=['POST'])
def guardar_usuario():

    data = request.json

    guardar_usuario_db(data)

    return jsonify(success=True)


# =====================================
# LISTAR
# =====================================
@usuarios_bp.route('/api/usuarios')
def listar_usuarios():

    usuarios = listar_usuarios_db()

    return jsonify(usuarios)


# =====================================
# ELIMINAR
# =====================================
@usuarios_bp.route('/api/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):

    eliminar_usuario_db(id)

    return jsonify(success=True)

# =====================================
# ACTUALIZAR
# =====================================
@usuarios_bp.route('/api/usuarios/<int:id>', methods=['PUT'])
def actualizar_usuario(id):

    data = request.json

    actualizar_usuario_db(id, data)

    return jsonify(success=True)

# =====================================
# BUSCAR
# =====================================

@usuarios_bp.route("/api/usuarios/buscar")
def api_buscar_usuarios():

    q = request.args.get("q", "").strip()

    if not q:
        return jsonify({
            "success": True,
            "data": []
        })

    rows = db_query("""
        SELECT id,usuario,password,rol,nombre_completo, email, telefono 
        FROM usuarios
        WHERE nombre_completo ILIKE %s
        LIMIT 5
    """, (f"%{q}%",))

    return jsonify({
        "success": True,
        "data": rows
    })
