from flask import Blueprint, request, jsonify, current_app
from database import (
    obtener_proveedores,
    insertar_proveedor,
    actualizar_proveedor,
    obtener_proveedor_por_id,
    db_tx,
    db_execute,
    get_connection
)
import traceback

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

        proveedores = [dict(p) for p in data]

        return jsonify({
            "success": True,
            "data": proveedores
        })

    except Exception as e:
        current_app.logger.error(f"Error listando proveedores: {e}")
        traceback.print_exc()
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
        traceback.print_exc()
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
        traceback.print_exc()
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
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# ELIMINAR PROVEEDOR - VERSIÓN CON DEBUG COMPLETO
# =========================================
@proveedores_bp.route("/api/proveedores/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor(id):
    print("=" * 80)
    print(f"🔍 INICIANDO ELIMINACIÓN DE PROVEEDOR ID: {id}")
    print("=" * 80)
    
    conn = None
    cursor = None
    
    try:
        # ==========================================
        # PASO 1: Verificar si el proveedor existe
        # ==========================================
        print(f"\n📌 PASO 1: Verificando existencia del proveedor ID: {id}")
        
        try:
            proveedor = obtener_proveedor_por_id(id)
            print(f"   - proveedor encontrado: {proveedor is not None}")
            if proveedor:
                print(f"   - razon_social: {proveedor.get('razon_social')}")
                print(f"   - activo: {proveedor.get('activo')}")
                print(f"   - codigo_proveedor: {proveedor.get('codigo_proveedor')}")
        except Exception as e:
            print(f"   ❌ Error en obtener_proveedor_por_id: {str(e)}")
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "error": f"Error al verificar proveedor: {str(e)}",
                "paso": 1
            }), 500
        
        if not proveedor:
            print(f"   ❌ Proveedor ID {id} no encontrado")
            return jsonify({
                "success": False, 
                "error": f"Proveedor ID {id} no encontrado",
                "paso": 1
            }), 404

        # ==========================================
        # PASO 2: Verificar si ya está inactivo
        # ==========================================
        print(f"\n📌 PASO 2: Verificando si el proveedor ya está inactivo")
        
        if proveedor.get("activo") == False:
            print(f"   ⚠️ Proveedor ID {id} ya estaba eliminado (activo=FALSE)")
            return jsonify({
                "success": False, 
                "error": "El proveedor ya fue eliminado anteriormente",
                "paso": 2
            }), 400
        
        print(f"   ✅ El proveedor está activo (activo=TRUE)")

        # ==========================================
        # PASO 3: Obtener conexión a la base de datos
        # ==========================================
        print(f"\n📌 PASO 3: Obteniendo conexión a la base de datos")
        
        try:
            conn = get_connection()
            print(f"   ✅ Conexión obtenida: {conn is not None}")
            print(f"   - DSN: {conn.dsn if hasattr(conn, 'dsn') else 'No disponible'}")
        except Exception as e:
            print(f"   ❌ Error obteniendo conexión: {str(e)}")
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "error": f"Error de conexión: {str(e)}",
                "paso": 3
            }), 500

        # ==========================================
        # PASO 4: Ejecutar la consulta SQL
        # ==========================================
        print(f"\n📌 PASO 4: Ejecutando UPDATE para eliminar lógicamente")
        
        sql_update = """
            UPDATE proveedores 
            SET activo = FALSE
            WHERE id = %s AND activo = TRUE
        """
        print(f"   - SQL: {sql_update}")
        print(f"   - Parámetros: id={id}")
        
        try:
            cursor = conn.cursor()
            cursor.execute(sql_update, (id,))
            filas_afectadas = cursor.rowcount
            print(f"   ✅ UPDATE ejecutado correctamente")
            print(f"   - Filas afectadas: {filas_afectadas}")
        except Exception as e:
            print(f"   ❌ Error ejecutando UPDATE: {str(e)}")
            traceback.print_exc()
            if conn:
                conn.rollback()
            return jsonify({
                "success": False, 
                "error": f"Error en la consulta SQL: {str(e)}",
                "paso": 4
            }), 500

        # ==========================================
        # PASO 5: Commit de la transacción
        # ==========================================
        print(f"\n📌 PASO 5: Haciendo COMMIT de la transacción")
        
        try:
            conn.commit()
            print(f"   ✅ COMMIT exitoso")
        except Exception as e:
            print(f"   ❌ Error en COMMIT: {str(e)}")
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "error": f"Error al guardar cambios: {str(e)}",
                "paso": 5
            }), 500

        # ==========================================
        # PASO 6: Verificar el resultado
        # ==========================================
        print(f"\n📌 PASO 6: Verificando resultado")
        
        if filas_afectadas > 0:
            print(f"   ✅ ÉXITO: Proveedor ID {id} eliminado correctamente")
            return jsonify({
                "success": True,
                "message": "Proveedor eliminado correctamente",
                "filas_afectadas": filas_afectadas
            })
        else:
            print(f"   ⚠️ ADVERTENCIA: No se eliminó ningún registro")
            return jsonify({
                "success": False, 
                "error": "No se pudo eliminar el proveedor (0 filas afectadas)",
                "filas_afectadas": 0,
                "paso": 6
            }), 500

    except Exception as e:
        print(f"\n❌ ERROR INESPERADO EN EL PASO: {e}")
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
                print(f"   🔄 Rollback ejecutado")
            except:
                pass
        return jsonify({
            "success": False,
            "error": f"Error inesperado: {str(e)}",
            "tipo_error": type(e).__name__
        }), 500
        
    finally:
        # ==========================================
        # LIMPIEZA: Cerrar cursor y conexión
        # ==========================================
        print(f"\n📌 LIMPIEZA: Cerrando recursos")
        
        if cursor:
            try:
                cursor.close()
                print(f"   ✅ Cursor cerrado")
            except Exception as e:
                print(f"   ⚠️ Error cerrando cursor: {e}")
                
        if conn:
            try:
                conn.close()
                print(f"   ✅ Conexión cerrada")
            except Exception as e:
                print(f"   ⚠️ Error cerrando conexión: {e}")
        
        print(f"\n" + "=" * 80)
        print(f"🏁 FIN DE ELIMINACIÓN DE PROVEEDOR ID: {id}")
        print("=" * 80)


# =========================================
# RUTA DE PRUEBA PARA DIAGNÓSTICO - VERIFICAR ESTRUCTURA DE TABLA
# =========================================
@proveedores_bp.route("/api/proveedores/diagnostico", methods=["GET"])
def api_diagnostico():
    """Ruta para diagnosticar la estructura de la tabla proveedores"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Obtener estructura de la tabla
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'proveedores'
            ORDER BY ordinal_position
        """)
        columnas = cursor.fetchall()
        
        estructura = []
        for col in columnas:
            estructura.append({
                "nombre": col[0],
                "tipo": col[1],
                "nullable": col[2]
            })
        
        # Verificar si la columna 'activo' existe
        tiene_activo = any(col[0] == 'activo' for col in columnas)
        
        # Contar proveedores
        cursor.execute("SELECT COUNT(*) FROM proveedores")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM proveedores WHERE activo = TRUE")
        activos = cursor.fetchone()[0] if tiene_activo else total
        
        return jsonify({
            "success": True,
            "estructura_tabla": estructura,
            "tiene_columna_activo": tiene_activo,
            "total_proveedores": total,
            "proveedores_activos": activos,
            "mensaje": "Tabla proveedores verificada correctamente"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# =========================================
# RUTA DE PRUEBA PARA ELIMINACIÓN (usando db_execute)
# =========================================
@proveedores_bp.route("/api/proveedores/eliminar_test/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor_test(id):
    """Ruta de prueba para eliminar usando db_execute"""
    try:
        print(f"🔍 TEST: Intentando eliminar proveedor ID: {id} usando db_execute")
        
        # Verificar si existe
        proveedor = obtener_proveedor_por_id(id)
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404
        
        # Usar db_execute (que ahora debe retornar filas afectadas)
        filas = db_execute("""
            UPDATE proveedores 
            SET activo = FALSE
            WHERE id = %s AND activo = TRUE
        """, (id,))
        
        print(f"   - Filas afectadas: {filas}")
        
        if filas and filas > 0:
            return jsonify({
                "success": True,
                "message": "Proveedor eliminado correctamente",
                "filas_afectadas": filas
            })
        else:
            return jsonify({
                "success": False,
                "error": "No se pudo eliminar (0 filas afectadas)",
                "filas_afectadas": filas
            }), 500
            
    except Exception as e:
        print(f"❌ Error en test: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# =========================================
# REACTIVAR PROVEEDOR
# =========================================
@proveedores_bp.route("/api/proveedores/reactivar/<int:id>", methods=["PUT"])
def api_reactivar_proveedor(id):
    try:
        current_app.logger.info(f"Intentando reactivar proveedor ID: {id}")

        proveedor = obtener_proveedor_por_id(id)
        
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404

        filas_afectadas = db_execute("""
            UPDATE proveedores 
            SET activo = TRUE
            WHERE id = %s AND activo = FALSE
        """, (id,))
        
        if filas_afectadas and filas_afectadas > 0:
            return jsonify({"success": True, "message": "Proveedor reactivado correctamente"})
        else:
            return jsonify({"success": False, "error": "No se pudo reactivar el proveedor"}), 400

    except Exception as e:
        current_app.logger.error(f"Error reactivando proveedor {id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# VERIFICAR EXISTENCIA
# =========================================
@proveedores_bp.route("/api/proveedores/verificar/<int:id>", methods=["GET"])
def api_verificar_proveedor(id):
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
                    "codigo_proveedor": proveedor.get("codigo_proveedor"),
                    "activo": proveedor.get("activo")
                }
            })
        else:
            return jsonify({"success": True, "exists": False})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500