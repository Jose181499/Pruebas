from flask import Blueprint, request, jsonify

from database import (
    obtener_proveedores,
    insertar_proveedor,
    db_tx
)

proveedores_bp = Blueprint("proveedores", __name__)

# =========================================
# LISTAR PROVEEDORES
# =========================================
@proveedores_bp.route("/api/proveedores/listar")
def api_proveedores():

    try:

        data = obtener_proveedores()

        proveedores = []

        for p in data:

            proveedores.append({

                "id": p["id"],
                "codigo_proveedor": p["codigo_proveedor"],
                "razon_social": p["razon_social"],
                "razon_comercial": p["razon_comercial"],
                "ruc": p["ruc"],
                "direccion": p["direccion"],
                "telefono": p["telefono"],
                "contacto": p["contacto"],
                "email": p["email"],

                "condicion_pago": p["condicion_pago"],
                "tiempo_credito": p["tiempo_credito"],
                "lugar_recojo": p["lugar_recojo"],

                "banco": p["banco"],
                "numero_cuenta_cci": p["numero_cuenta_cci"]

            })

        return jsonify({
            "success": True,
            "data": proveedores
        })

    except Exception as e:

        print("🔥 ERROR:", e)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================
# CREAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores", methods=["POST"])
def crear_proveedor():

    try:

        data = request.get_json()

        insertar_proveedor(

            razon_social=data.get("razon_social"),
            ruc=data.get("ruc"),
            direccion=data.get("direccion"),
            telefono=data.get("telefono"),
            contacto=data.get("contacto"),
            email=data.get("email"),
            razon_comercial=data.get("razon_comercial"),

            codigo_proveedor=data.get("codigo_proveedor"),
            lugar_recojo=data.get("lugar_recojo"),

            condicion_pago=data.get("condicion_pago"),
            tiempo_credito=data.get("tiempo_credito"),

            banco=data.get("banco"),
            numero_cuenta_cci=data.get("numero_cuenta_cci")

        )

        return jsonify({
            "success": True,
            "message": "Proveedor registrado correctamente"
        })

    except Exception as e:

        print("🔥 ERROR:", e)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================
# ELIMINAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["DELETE"])
def eliminar_proveedor(id):

    with db_tx() as conn:

        cur = conn.cursor()

        cur.execute("""

            UPDATE proveedores
            SET activo = FALSE
            WHERE id = %s

        """, (id,))

    return jsonify({
        "success": True
    })