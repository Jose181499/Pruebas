from flask import Blueprint, request, jsonify, current_app
from database import (
    obtener_proveedores,
    insertar_proveedor,
    actualizar_proveedor,
    obtener_proveedor_por_id,
    db_tx,
    db_execute
)

proveedores_bp = Blueprint("proveedores", __name__)


# =========================================
# LISTAR PROVEEDORES (SOLO ACTIVOS)
# =========================================
@proveedores_bp.route("/api/proveedores/listar", methods=["GET"])
def api_listar_proveedores():
    try:
        busqueda = request.args.get("busqueda", "").strip()
        codigo = request.args.get("codigo", "").strip()

        data = obtener_proveedores(
            busqueda=busqueda or None,
            codigo=codigo or None
        )

        proveedores = [dict(p) for p in data]

        return jsonify({
            "success": True,
            "data": proveedores
        })

    except Exception as e:
        current_app.logger.error(f"Error listando proveedores: {e}")
        return jsonify({
            "success": False,
            "error": f"Error interno del servidor: {str(e)}"
        }), 500


# =========================================
# CREAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/guardar", methods=["POST"])
def api_guardar_proveedor():
    try:
        data = request.get_json()

        if not data.get("razon_social"):
            return jsonify({"success": False, "error": "La razón social es obligatoria"}), 400

        if not data.get("ruc"):
            return jsonify({"success": False, "error": "El RUC es obligatorio"}), 400

        ruc = str(data.get("ruc", "")).strip()
        if len(ruc) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"}), 400

        nuevo_id = insertar_proveedor(
            razon_social=data.get("razon_social"),
            razon_comercial=data.get("razon_comercial"),
            direccion=data.get("direccion"),
            ruc=ruc,
            contacto=data.get("contacto"),
            telefono=data.get("telefono"),
            email=data.get("email"),
            condicion_pago=data.get("condicion_pago"),
            tiempo_credito=data.get("tiempo_credito"),
            banco=data.get("banco"),
            numero_cuenta=data.get("numero_cuenta"),
            cci=data.get("cci"),
            lugar_recojo=data.get("lugar_recojo")
        )

        proveedor = obtener_proveedor_por_id(nuevo_id)

        return jsonify({
            "success": True,
            "message": "Proveedor registrado correctamente",
            "data": {
                "id": proveedor["id"],
                "codigo_proveedor": proveedor.get("codigo_proveedor", f"PROV-{nuevo_id:05d}")
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error creando proveedor: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# OBTENER UN PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["GET"])
def api_obtener_proveedor(id):
    try:
        proveedor = obtener_proveedor_por_id(id)
        
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404

        return jsonify({
            "success": True,
            "data": dict(proveedor)
        })

    except Exception as e:
        current_app.logger.error(f"Error obteniendo proveedor {id}: {e}")
        return jsonify({"success": False, "error": f"Error interno: {str(e)}"}), 500


# =========================================
# ACTUALIZAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["PUT"])
def api_actualizar_proveedor(id):
    try:
        data = request.get_json()

        # Verificar si el proveedor existe
        proveedor = obtener_proveedor_por_id(id)
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404

        # Validar RUC si se está actualizando
        ruc = data.get("ruc")
        if ruc and len(str(ruc).strip()) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"}), 400

        actualizar_proveedor(
            proveedor_id=id,
            razon_social=data.get("razon_social"),
            razon_comercial=data.get("razon_comercial"),
            direccion=data.get("direccion"),
            ruc=ruc,
            contacto=data.get("contacto"),
            telefono=data.get("telefono"),
            email=data.get("email"),
            condicion_pago=data.get("condicion_pago"),
            tiempo_credito=data.get("tiempo_credito"),
            banco=data.get("banco"),
            numero_cuenta=data.get("numero_cuenta"),
            cci=data.get("cci"),
            lugar_recojo=data.get("lugar_recojo")
        )

        return jsonify({
            "success": True,
            "message": "Proveedor actualizado correctamente"
        })

    except Exception as e:
        current_app.logger.error(f"Error actualizando proveedor {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# ELIMINAR PROVEEDOR (ELIMINACIÓN LÓGICA CON activo)
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor(id):
    try:
        current_app.logger.info(f"Intentando eliminar proveedor ID: {id}")

        # Verificar si el proveedor existe y está activo
        proveedor = obtener_proveedor_por_id(id)
        
        if not proveedor:
            current_app.logger.warning(f"Proveedor ID {id} no encontrado")
            return jsonify({
                "success": False, 
                "error": "Proveedor no encontrado"
            }), 404

        # Verificar si ya está inactivo
        if proveedor.get("activo") == False:
            current_app.logger.warning(f"Proveedor ID {id} ya estaba eliminado")
            return jsonify({
                "success": False, 
                "error": "El proveedor ya fue eliminado anteriormente"
            }), 400

        # Eliminación lógica (solo cambiar activo a FALSE)
        # NOTA: No usamos fecha_eliminacion porque NO existe en tu tabla
        filas_afectadas = db_execute("""
            UPDATE proveedores 
            SET activo = FALSE
            WHERE id = %s AND activo = TRUE
        """, (id,))
        
        if filas_afectadas and filas_afectadas > 0:
            current_app.logger.info(f"Proveedor ID {id} eliminado lógicamente (activo=FALSE)")
            return jsonify({
                "success": True,
                "message": "Proveedor eliminado correctamente"
            })
        else:
            current_app.logger.warning(f"No se pudo eliminar proveedor ID {id}")
            return jsonify({
                "success": False, 
                "error": "No se pudo eliminar el proveedor"
            }), 500

    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f"Error eliminando proveedor {id}: {error_msg}")
        
        # Verificar si es error de foreign key
        if "foreign key" in error_msg.lower() or "constraint" in error_msg.lower():
            return jsonify({
                "success": False,
                "error": "No se puede eliminar el proveedor porque tiene registros relacionados (compras, facturas, etc.)"
            }), 400
        else:
            return jsonify({
                "success": False,
                "error": f"Error al eliminar: {error_msg}"
            }), 500


# =========================================
# REACTIVAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/reactivar/<int:id>", methods=["PUT"])
def api_reactivar_proveedor(id):
    """Reactivar un proveedor que fue eliminado lógicamente"""
    try:
        current_app.logger.info(f"Intentando reactivar proveedor ID: {id}")

        # Verificar si el proveedor existe
        proveedor = obtener_proveedor_por_id(id)
        
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404

        # Reactivar (cambiar activo a TRUE)
        filas_afectadas = db_execute("""
            UPDATE proveedores 
            SET activo = TRUE
            WHERE id = %s AND activo = FALSE
        """, (id,))
        
        if filas_afectadas and filas_afectadas > 0:
            current_app.logger.info(f"Proveedor ID {id} reactivado correctamente")
            return jsonify({
                "success": True,
                "message": "Proveedor reactivado correctamente"
            })
        else:
            return jsonify({
                "success": False,
                "error": "No se pudo reactivar el proveedor o ya estaba activo"
            }), 400

    except Exception as e:
        current_app.logger.error(f"Error reactivando proveedor {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# VERIFICAR EXISTENCIA DE PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/verificar/<int:id>", methods=["GET"])
def api_verificar_proveedor(id):
    """Verifica si un proveedor existe y está activo"""
    try:
        proveedor = obtener_proveedor_por_id(id)
        
        if proveedor:
            return jsonify({
                "success": True,
                "exists": True,
                "activo": proveedor.get("activo", True),
                "data": {
                    "id": proveedor["id"],
                    "razon_social": proveedor.get("razon_social"),
                    "codigo_proveedor": proveedor.get("codigo_proveedor")
                }
            })
        else:
            return jsonify({
                "success": True,
                "exists": False
            })
    except Exception as e:
        current_app.logger.error(f"Error verificando proveedor {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500