from flask import Blueprint, render_template, jsonify, request, session, send_file, make_response, Response
from psycopg2.extras import RealDictCursor, DictCursor
import os

from database import (obtener_ordenes_recientes, obtener_orden_completa, crear_orden_compra_transaccional,
                    db_query, db_execute, db_tx, get_connection, buscar_proveedor_por_ruc)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from weasyprint import HTML  
import base64
import logging
from datetime import datetime

compras_bp = Blueprint("compras", __name__)

# ==========================================
# RUTAS DE VISTAS (HTML)
# ==========================================

@compras_bp.route("/compras")
def compras_principal():
    import traceback
    try:
        return render_template("compras.html")
    except Exception as e:
        error_msg = f"Error en /compras: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return error_msg, 500
@compras_bp.route("/crear_compra")
def crear_compra():
    """Nueva orden de compra - sin ID"""
    import traceback
    try:
        print(f"🆕 NUEVA ORDEN DE COMPRA - Sin ID")
        
        ordenes = obtener_ordenes_recientes(limit=300)
        
        # 🔥 CAMBIO AQUÍ: "Crear_compra.html" → "cotizacion_oc/crear_compra.html"
        return render_template("cotizacion_oc/crear_compra.html",
                              ordenes=ordenes,
                              orden_compra_id=None,
                              modo='nuevo')
                              
    except Exception as e:
        error_detalle = traceback.format_exc()
        print(f"🔥 Error en crear_compra: {error_detalle}")
        
        debug_info = f"""
        <html>
        <head><title>Error - Debug</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Error al cargar crear_compra</h1>
            <p><strong>Error:</strong> {str(e)}</p>
            <h2>Información de depuración:</h2>
            <p><strong>Directorio actual:</strong> {os.getcwd()}</p>
            <p><strong>¿Existe templates/cotizacion_oc/crear_compra.html?</strong> {os.path.exists('templates/cotizacion_oc/crear_compra.html')}</p>
            <h3>Archivos en templates/:</h3>
            <ul>
        """
        try:
            for f in os.listdir('templates'):
                debug_info += f"<li>{f}</li>"
        except Exception as ex:
            debug_info += f"<li>Error al listar: {ex}</li>"
        
        debug_info += f"""
            </ul>
            <details>
                <summary>Ver traceback completo</summary>
                <pre style="background: #f4f4f4; padding: 10px; overflow: auto;">{error_detalle}</pre>
            </details>
            <br>
            <a href="/compras">← Volver a Compras</a>
        </body>
        </html>
        """
        return debug_info, 500

@compras_bp.route("/compra/nueva")
def nueva_compra():
    # 🔥 CAMBIO AQUÍ TAMBIÉN
    return render_template("cotizacion_oc/crear_compra.html", ordenes=[], orden_compra_id=None, modo='nuevo')

@compras_bp.route("/editar_compra/<int:orden_id>")
def editar_compra(orden_id):
    """Editar orden de compra existente - con ID"""
    print(f"✏️ EDITAR ORDEN DE COMPRA - ID: {orden_id}")
    ordenes = obtener_ordenes_recientes(limit=300)
    return render_template("crear_compra.html",
                          ordenes=ordenes,
                          orden_compra_id=orden_id,
                          modo='editar')

# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def obtener_ordenes_recientes(limit=100):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                o.id,
                o.numero_orden,
                o.codigo_orden,
                o.correlativo,
                o.fecha_creacion,
                o.estado,
                COALESCE(p.razon_social, 'Sin proveedor') AS proveedor,
                COALESCE(SUM(d.subtotal_venta_con_descuento), 0) AS total
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN orden_compra_detalle d ON o.id = d.orden_id
            GROUP BY o.id, p.razon_social, o.numero_orden, o.codigo_orden, o.correlativo, o.fecha_creacion, o.estado
            ORDER BY o.id DESC
            LIMIT %s
        """, (limit,))

        columnas = [col[0] for col in cursor.description]
        ordenes = [dict(zip(columnas, row)) for row in cursor.fetchall()]

        conn.close()
        return ordenes
        
    except Exception as e:
        print(f"🔥 Error en obtener_ordenes_recientes: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


# ==========================================
# API ENDPOINTS
# ==========================================

@compras_bp.route("/api/usuarios/actual", methods=["GET"])
def obtener_usuario_actual():
    """Obtener usuario actual con su código de vendedor/comprador"""
    try:
        usuario_id = session.get('usuario_id')
        
        if usuario_id:
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol 
                FROM usuarios 
                WHERE id = %s AND estado = 'activo'
            """
            usuarios = db_query(query, (usuario_id,))
        else:
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol 
                FROM usuarios 
                WHERE estado = 'activo'
                LIMIT 1
            """
            usuarios = db_query(query)
        
        if not usuarios:
            return jsonify({
                'success': False,
                'error': 'No hay usuarios activos'
            }), 404
        
        return jsonify({
            'success': True,
            'data': usuarios[0]
        })
        
    except Exception as e:
        print(f"Error en /api/usuarios/actual: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/orden_compra/ultimo-correlativo", methods=["GET"])
def obtener_ultimo_correlativo_compra():
    """Obtener el último correlativo de órdenes de compra por usuario"""
    try:
        usuario_id = request.args.get('usuario_id')
        
        if not usuario_id:
            return jsonify({
                'success': False,
                'error': 'usuario_id es requerido'
            }), 400
        
        query = """
            SELECT MAX(correlativo) as ultimo 
            FROM ordenes_compra 
            WHERE usuario_id = %s
        """
        resultado = db_query(query, (usuario_id,))
        
        ultimo_correlativo = resultado[0]['ultimo'] if resultado and resultado[0]['ultimo'] else 0
        
        return jsonify({
            'success': True,
            'correlativo': ultimo_correlativo
        })
        
    except Exception as e:
        print(f"Error en /api/orden_compra/ultimo-correlativo: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/usuarios/buscar", methods=["GET"])
def buscar_usuarios():
    """Buscar usuarios compradores por nombre"""
    try:
        q = request.args.get('q', '')
        
        if q and q.strip():
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol
                FROM usuarios 
                WHERE (nombre_completo ILIKE %s OR email ILIKE %s)
                AND estado = 'activo'
                AND rol IN ('comprador', 'admin', 'supervisor')
                LIMIT 20
            """
            usuarios = db_query(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol
                FROM usuarios 
                WHERE estado = 'activo'
                AND rol IN ('comprador', 'admin', 'supervisor')
                LIMIT 20
            """
            usuarios = db_query(query)
        
        return jsonify({
            'success': True,
            'data': usuarios
        })
        
    except Exception as e:
        print(f"Error en /api/usuarios/buscar: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/proveedores/buscar", methods=["GET"])
def buscar_proveedores():
    """Buscar proveedores por nombre o documento"""
    try:
        q = request.args.get('q', '')
        
        if q and q.strip():
            query = """
                SELECT id, razon_social, numero_documento, 
                       direccion_fiscal, telefono_contacto, nombre_contacto, 
                       tipo_documento, email_contacto
                FROM proveedores 
                WHERE razon_social ILIKE %s OR numero_documento ILIKE %s
                LIMIT 20
            """
            proveedores = db_query(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, razon_social, numero_documento, 
                       direccion_fiscal, telefono_contacto, nombre_contacto,
                       tipo_documento, email_contacto
                FROM proveedores 
                LIMIT 20
            """
            proveedores = db_query(query)
        
        for proveedor in proveedores:
            proveedor['proveedor_ruc'] = proveedor['numero_documento']
        
        return jsonify({
            'success': True,
            'data': proveedores
        })
        
    except Exception as e:
        print(f"Error en /api/proveedores/buscar: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/proveedores/buscar-por-ruc", methods=["GET"])
def buscar_proveedor_por_ruc_api():
    """Buscar proveedor por RUC exacto en la base de datos"""
    try:
        ruc = request.args.get('ruc', '').strip()
        
        if not ruc:
            return jsonify({"success": False, "error": "Debe ingresar un RUC"}), 400
        
        if len(ruc) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"}), 400
        
        proveedor = buscar_proveedor_por_ruc(ruc)
        
        if proveedor:
            return jsonify({
                "success": True,
                "found": True,
                "data": proveedor
            })
        else:
            return jsonify({
                "success": True,
                "found": False,
                "message": "Proveedor no encontrado en la base de datos"
            })
        
    except Exception as e:
        print(f"🔥 Error al buscar proveedor por RUC: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@compras_bp.route("/api/proveedores/<int:id>", methods=["GET"])
def obtener_proveedor(id):
    """Obtener proveedor por ID"""
    try:
        query = """
            SELECT id, razon_social, numero_documento, direccion_fiscal, 
                   telefono_contacto, nombre_contacto, tipo_documento, email_contacto
            FROM proveedores 
            WHERE id = %s
        """
        proveedor = db_query(query, (id,))
        
        if not proveedor:
            return jsonify({'success': False, 'error': 'Proveedor no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'data': proveedor[0]
        })
        
    except Exception as e:
        print(f"Error en /api/proveedores/{id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/productos/buscar", methods=["GET"])
def buscar_productos():
    """Buscar productos por código o descripción"""
    try:
        q = request.args.get('q', '')
        
        if q and q.strip():
            query = """
                SELECT id, codigo, descripcion, marca, modelo, unidad,
                       costo_unitario, precio_unitario, stock
                FROM productos 
                WHERE codigo ILIKE %s OR descripcion ILIKE %s
                ORDER BY codigo
                LIMIT 20
            """
            productos = db_query(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, codigo, descripcion, marca, modelo, unidad,
                       costo_unitario, precio_unitario, stock
                FROM productos 
                ORDER BY codigo
                LIMIT 20
            """
            productos = db_query(query)
        
        return jsonify({
            'success': True,
            'data': productos
        })
        
    except Exception as e:
        print(f"Error en /api/productos/buscar: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/orden_compra/verificar-codigo", methods=["GET"])
def verificar_codigo_orden():
    """Verificar si un código de orden de compra ya existe"""
    try:
        codigo = request.args.get('codigo', '')
        
        if not codigo:
            return jsonify({"exists": False, "error": "No se proporcionó código"}), 400
        
        resultado = db_query("SELECT id FROM ordenes_compra WHERE codigo_orden = %s", (codigo,))
        
        existe = len(resultado) > 0
        
        return jsonify({
            "exists": existe,
            "codigo": codigo
        })
        
    except Exception as e:
        print(f"🔥 Error verificando código: {str(e)}")
        return jsonify({"exists": False, "error": str(e)}), 500


@compras_bp.route("/api/proveedores/crear", methods=["POST"])
def crear_proveedor():
    """Crear un nuevo proveedor desde el formulario de orden de compra"""
    try:
        data = request.json
        
        tipo_documento = data.get('tipo_documento', 'RUC')
        numero_documento = data.get('numero_documento')
        razon_social = data.get('razon_social')
        nombre_comercial = data.get('nombre_comercial', '')
        direccion_fiscal = data.get('direccion_fiscal', '')
        telefono_contacto = data.get('telefono_contacto', '')
        email_contacto = data.get('email_contacto', '')
        nombre_contacto = data.get('nombre_contacto', '')
        
        if not numero_documento:
            return jsonify({'success': False, 'error': 'Número de documento requerido'}), 400
        
        if not razon_social:
            return jsonify({'success': False, 'error': 'Razón social requerida'}), 400
        
        existente = db_query("""
            SELECT id FROM proveedores WHERE numero_documento = %s
        """, (numero_documento,))
        
        if existente:
            return jsonify({
                'success': False, 
                'error': f'Ya existe un proveedor con el documento {numero_documento}'
            }), 400
        
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO proveedores 
                (tipo_documento, numero_documento, razon_social, nombre_comercial, 
                 direccion_fiscal, telefono_contacto, email_contacto, nombre_contacto, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id
            """, (tipo_documento, numero_documento, razon_social, nombre_comercial,
                  direccion_fiscal, telefono_contacto, email_contacto, nombre_contacto))
            
            proveedor_id = cur.fetchone()[0]
        
        return jsonify({
            'success': True,
            'data': {
                'id': proveedor_id, 
                'razon_social': razon_social,
                'numero_documento': numero_documento
            }
        })
        
    except Exception as e:
        print(f"Error en /api/proveedores/crear: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@compras_bp.route("/api/proveedores/<int:proveedor_id>/direcciones", methods=["GET"])
def obtener_direcciones_proveedor(proveedor_id):
    """Obtener direcciones de un proveedor"""
    try:
        query = """
            SELECT id, direccion, nombre_punto, principal, telefono_contacto
            FROM proveedores_direcciones
            WHERE proveedor_id = %s
            ORDER BY principal DESC, nombre_punto
        """
        direcciones = db_query(query, (proveedor_id,))
        
        return jsonify({
            'success': True,
            'data': direcciones
        })
        
    except Exception as e:
        print(f"Error en /api/proveedores/{proveedor_id}/direcciones: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@compras_bp.route("/api/orden_compra/guardar", methods=["POST"])
def guardar_orden_compra():
    """Guardar orden de compra"""
    data = request.json
    try:
        proveedor_id = data.get("proveedor_id")
        subtotal = data.get("subtotal", 0)
        estado = data.get("estado", "pendiente")
        igv = data.get("igv", 0)
        total = data.get("total", 0)
        notas = data.get("notas")
        usuario_id = data.get("usuario_id")
        condicion_pago = data.get("condicion_pago", "Contado")
        tiempo_entrega = data.get("tiempo_entrega")
        fecha_requerida = data.get("fecha_requerida")
        lugar_entrega = data.get("lugar_entrega")
        num_cotizacion = data.get("num_cotizacion")
        nota_compra = data.get("nota_compra")
        
        contacto_proveedor = data.get("proveedor_contacto", "")
        telefono_proveedor = data.get("telefono_contacto", "")
        email_proveedor = data.get("email_contacto_proveedor", "")
        
        descuento_porcentaje = data.get("descuento_porcentaje", 0)
        descuento_monto = data.get("descuento_monto", 0)
        descuento_tipo = data.get("descuento_tipo", "porcentaje")
        
        codigo_orden = data.get("codigo_orden")
        correlativo = data.get("correlativo")
        es_borrador = data.get("es_borrador", False)
        
        orden_id = data.get("id") or request.args.get('id')
        
        if not orden_id:
            orden_id = data.get("orden_compra_id")

        with db_tx() as conn:
            cur = conn.cursor()
            
            if orden_id:
                # Actualizar orden existente
                cur.execute("""
                    UPDATE ordenes_compra 
                    SET proveedor_id = %s,
                        estado = %s,
                        subtotal = %s,
                        igv = %s,
                        total = %s,
                        condicion_pago = %s,
                        tiempo_entrega = %s,
                        fecha_requerida = %s,
                        lugar_entrega = %s,
                        num_cotizacion = %s,
                        nota_compra = %s,
                        usuario_id = %s,
                        notas = %s,
                        descuento_porcentaje = %s,
                        descuento_monto = %s,
                        descuento_tipo = %s,
                        contacto_proveedor = %s,
                        telefono_proveedor = %s,
                        email_proveedor = %s
                    WHERE id = %s
                """, (
                    proveedor_id, estado, subtotal, igv, total,
                    condicion_pago, tiempo_entrega, fecha_requerida,
                    lugar_entrega, num_cotizacion, nota_compra,
                    usuario_id, notas, descuento_porcentaje,
                    descuento_monto, descuento_tipo,
                    contacto_proveedor, telefono_proveedor,
                    email_proveedor, orden_id
                ))
                
                # Eliminar detalles antiguos
                cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
                
                # Insertar nuevos detalles
                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id, producto_id, cantidad, costo_unitario,
                            subtotal_costo, margen_porcentaje, precio_venta_unitario,
                            subtotal_venta, descuento_porcentaje,
                            precio_venta_con_descuento, subtotal_venta_con_descuento,
                            descuento_total, margen_final
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        orden_id, p["producto_id"], p["cantidad"],
                        p.get("costo_unitario", 0), p.get("subtotal_costo", 0),
                        p.get("margen_porcentaje", 20), p["precio_venta_unitario"],
                        p.get("subtotal_venta", 0), p.get("descuento_porcentaje", 0),
                        p.get("precio_venta_con_descuento", p["precio_venta_unitario"]),
                        p.get("subtotal_venta_con_descuento", p.get("subtotal_venta", 0)),
                        p.get("descuento_total", 0), p.get("margen_final", 20)
                    ))
                
                return jsonify({
                    "success": True,
                    "data": {"id": orden_id, "actualizado": True}
                })
            
            else:
                # Crear nueva orden
                # Generar número de orden secuencial
                row = db_query("SELECT numero_orden FROM ordenes_compra ORDER BY id DESC LIMIT 1")
                if row:
                    ultimo = row[0]["numero_orden"]
                    numero_int = int(ultimo.split("-")[1]) + 1
                else:
                    numero_int = 1
                numero = f"OC-{str(numero_int).zfill(5)}"
                
                # Generar código personalizado
                if not codigo_orden:
                    if es_borrador:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        codigo_orden = f"TMP-COMPRA-{timestamp}"
                        correlativo = 0
                    else:
                        usuario_query = "SELECT codigo_vendedor FROM usuarios WHERE id = %s"
                        usuario = db_query(usuario_query, (usuario_id,))
                        codigo_comprador = usuario[0]['codigo_vendedor'] if usuario else f"C{str(usuario_id).zfill(3)}"
                        
                        corr_query = "SELECT MAX(correlativo) as ultimo FROM ordenes_compra WHERE usuario_id = %s"
                        ultimo_corr = db_query(corr_query, (usuario_id,))
                        nuevo_corr = (ultimo_corr[0]['ultimo'] or 0) + 1
                        
                        fecha = datetime.now()
                        codigo_orden = f"OC-{codigo_comprador}-{fecha.year}{str(fecha.month).zfill(2)}{str(fecha.day).zfill(2)}-{str(nuevo_corr).zfill(4)}"
                        correlativo = nuevo_corr

                cur.execute("""
                    INSERT INTO ordenes_compra (
                        numero_orden, proveedor_id, fecha_creacion, estado,
                        subtotal, igv, total, condicion_pago, tiempo_entrega,
                        fecha_requerida, lugar_entrega, num_cotizacion,
                        nota_compra, usuario_id, notas, codigo_orden,
                        correlativo, descuento_porcentaje, descuento_monto,
                        descuento_tipo, contacto_proveedor, telefono_proveedor,
                        email_proveedor
                    ) VALUES (%s, %s, (NOW() AT TIME ZONE 'America/Lima'), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    numero, proveedor_id, estado, subtotal, igv, total,
                    condicion_pago, tiempo_entrega, fecha_requerida,
                    lugar_entrega, num_cotizacion, nota_compra, usuario_id,
                    notas, codigo_orden, correlativo, descuento_porcentaje,
                    descuento_monto, descuento_tipo, contacto_proveedor,
                    telefono_proveedor, email_proveedor
                ))

                nuevo_id = cur.fetchone()[0]

                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id, producto_id, cantidad, costo_unitario,
                            subtotal_costo, margen_porcentaje, precio_venta_unitario,
                            subtotal_venta, descuento_porcentaje,
                            precio_venta_con_descuento, subtotal_venta_con_descuento,
                            descuento_total, margen_final
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        nuevo_id, p["producto_id"], p["cantidad"],
                        p.get("costo_unitario", 0), p.get("subtotal_costo", 0),
                        p.get("margen_porcentaje", 20), p["precio_venta_unitario"],
                        p.get("subtotal_venta", 0), p.get("descuento_porcentaje", 0),
                        p.get("precio_venta_con_descuento", p["precio_venta_unitario"]),
                        p.get("subtotal_venta_con_descuento", p.get("subtotal_venta", 0)),
                        p.get("descuento_total", 0), p.get("margen_final", 20)
                    ))

                return jsonify({
                    "success": True,
                    "data": {"id": nuevo_id, "numero": numero, "codigo_orden": codigo_orden}
                })

    except Exception as e:
        print("🔥 ERROR:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/orden_compra/<int:orden_id>", methods=["GET"])
def api_get_orden_compra(orden_id):
    """Obtener orden de compra por ID"""
    try:
        data = obtener_orden_completa(orden_id)
        if not data:
            return jsonify({"success": False, "error": "No encontrada"}), 404
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/ordenes_compra", methods=["GET"])
def listar_ordenes():
    """Listar órdenes de compra"""
    try:
        buscar = request.args.get('buscar', '')
        
        query = """
            SELECT o.id, o.numero_orden, o.codigo_orden, o.fecha_creacion, 
                   o.estado, o.total, COALESCE(p.razon_social, 'Sin proveedor') as proveedor,
                   u.nombre_completo as comprador
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
        """
        
        if buscar and buscar.strip():
            query += f" WHERE o.codigo_orden ILIKE '%{buscar}%' OR p.razon_social ILIKE '%{buscar}%'"
        
        query += " ORDER BY o.id DESC"
        
        rows = db_query(query)
        
        resultado = []
        for row in rows:
            resultado.append({
                'id': row['id'],
                'numero_orden': row['numero_orden'],
                'codigo_orden': row['codigo_orden'],
                'fecha_creacion': row['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S') if row['fecha_creacion'] else '',
                'estado': row['estado'],
                'proveedor': row['proveedor'],
                'comprador': row['comprador'],
                'total': float(row['total']) if row['total'] else 0
            })
        
        return jsonify({"success": True, "data": resultado})
        
    except Exception as e:
        print(f"🔥 ERROR LISTAR: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/ordenes_compra/<int:id>", methods=["DELETE"])
def eliminar_orden_compra(id):
    """Eliminar orden de compra"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (id,))
            cur.execute("DELETE FROM ordenes_compra WHERE id = %s", (id,))
        return jsonify({"success": True})
    except Exception as e:
        print("🔥 ERROR ELIMINAR:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/orden_compra/pdf/<int:orden_id>")
def generar_pdf_orden_compra(orden_id):
    """Generar PDF de orden de compra"""
    try:
        data = obtener_orden_completa(orden_id)
        if not data:
            return jsonify({"success": False, "error": "No encontrada"}), 404
        
        cabecera = data.get("cabecera", {})
        detalle = data.get("detalle", [])
        
        # Aquí va la generación del PDF con weasyprint
        # Por ahora devolvemos un placeholder
        return Response("PDF generado - Funcionalidad en desarrollo", 
                       content_type='application/pdf',
                       headers={"Content-Disposition": f"inline; filename=orden_compra_{orden_id}.pdf"})
    except Exception as e:
        print("🔥 ERROR PDF:", e)
        return jsonify({"success": False, "error": str(e)}), 500