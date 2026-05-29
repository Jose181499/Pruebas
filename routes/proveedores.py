from flask import Blueprint, request, jsonify, current_app
from database import (
    obtener_proveedores,
    insertar_proveedor,
    actualizar_proveedor,
    obtener_proveedor_por_id,
    db_tx
)

proveedores_bp = Blueprint("proveedores", __name__)


# =========================================
# LISTAR PROVEEDORES
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

        proveedores = [dict(p) for p in data]   # Mejor conversión

        return jsonify({
            "success": True,
            "data": proveedores
        })

    except Exception as e:
        current_app.logger.error(f"Error listando proveedores: {e}")
        return jsonify({
            "success": False,
            "error": "Error interno del servidor"
        }), 500


# =========================================
# CREAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/guardar", methods=["POST"])
def api_guardar_proveedor():
    try:
        data = request.get_json()

        if not data.get("razon_social") or not data.get("ruc"):
            return jsonify({"success": False, "error": "Razón social y RUC son obligatorios"}), 400

        if len(str(data.get("ruc", "")).strip()) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"}), 400

        nuevo_id = insertar_proveedor(
            razon_social=data.get("razon_social"),
            razon_comercial=data.get("razon_comercial"),
            direccion=data.get("direccion"),
            ruc=data.get("ruc"),
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
                "codigo_proveedor": proveedor["codigo_proveedor"]
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
            "data": dict(proveedor)   # Asegurar formato dict
        })

    except Exception as e:
        current_app.logger.error(f"Error obteniendo proveedor {id}: {e}")
        return jsonify({"success": False, "error": "Error interno"}), 500


# =========================================
# ACTUALIZAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["PUT"])
def api_actualizar_proveedor(id):
    try:
        data = request.get_json()

        actualizar_proveedor(
            proveedor_id=id,                     # ← CORREGIDO
            razon_social=data.get("razon_social"),
            razon_comercial=data.get("razon_comercial"),
            direccion=data.get("direccion"),
            ruc=data.get("ruc"),
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
# ELIMINAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor(id):
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE proveedores 
                SET activo = FALSE, 
                    fecha_eliminacion = NOW()
                WHERE id = %s
            """, (id,))

        return jsonify({
            "success": True,
            "message": "Proveedor eliminado correctamente"
        })

    except Exception as e:
        current_app.logger.error(f"Error eliminando proveedor {id}: {e}")
        return jsonify({"success": False, "error": "No se pudo eliminar"}), 500