from flask import Blueprint, render_template, jsonify, request, session, send_file, make_response, Response
from psycopg2.extras import RealDictCursor, DictCursor

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
import os
from datetime import datetime

compras_bp = Blueprint("compras", __name__)

# ==========================================
# RUTAS DE VISTAS (HTML)
# ==========================================

@compras_bp.route("/gestor_compras")
def gestor_compras_principal():
    return render_template("compras.html")


@compras_bp.route("/crear_compra")
def crear_compra():
    """Nueva orden de compra - sin ID"""
    print(f"🆕 NUEVA ORDEN DE COMPRA - Sin ID")
    ordenes = obtener_ordenes_recientes(limit=300)
    return render_template("crear_compra.html",
                          ordenes=ordenes,
                          orden_compra_id=None,
                          modo='nuevo')


@compras_bp.route("/compra/nueva")
def nueva_compra():
    return render_template("crear_compra.html")


@compras_bp.route("/editar_compra/<int:orden_id>")
def editar_compra(orden_id):
    """Editar orden de compra existente - con ID"""
    print(f"✏️ EDITAR ORDEN DE COMPRA - ID: {orden_id}")
    return render_template("crear_compra.html",
                          orden_compra_id=orden_id,
                          modo='editar')


# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def obtener_ordenes_recientes(limit=100):
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


# ==========================================
# ENDPOINTS PARA CÓDIGOS DE ORDEN PERSONALIZADOS
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


# ==========================================
# ENDPOINT: BUSCAR PROVEEDOR POR RUC EXACTO
# ==========================================

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


# ==========================================
# ENDPOINT: BUSCAR PRODUCTOS
# ==========================================

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


# ==========================================
# ENDPOINT: VERIFICAR CÓDIGO DE ORDEN
# ==========================================

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


# ==========================================
# ENDPOINT: CREAR PROVEEDOR
# ==========================================

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


# ==========================================
# ENDPOINT: PROVEEDORES DIRECCIONES
# ==========================================

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


# ==========================================
# GUARDAR ORDEN DE COMPRA
# ==========================================

@compras_bp.route("/api/orden_compra/guardar", methods=["POST"])
def guardar_orden_compra():
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
        
        # Contacto proveedor
        contacto_proveedor = data.get("proveedor_contacto", "")
        telefono_proveedor = data.get("telefono_contacto", "")
        email_proveedor = data.get("email_contacto_proveedor", "")
        
        # Campos de descuento
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
                print(f"✏️ ACTUALIZANDO orden de compra ID: {orden_id}")
                
                # ACTUALIZAR cabecera
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
                    proveedor_id,
                    estado,
                    subtotal,
                    igv,
                    total,
                    condicion_pago,
                    tiempo_entrega,
                    fecha_requerida,
                    lugar_entrega,
                    num_cotizacion,
                    nota_compra,
                    usuario_id,
                    notas,
                    descuento_porcentaje,
                    descuento_monto,
                    descuento_tipo,
                    contacto_proveedor,
                    telefono_proveedor,
                    email_proveedor,
                    orden_id
                ))
                
                # ELIMINAR detalles antiguos
                cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
                
                # INSERTAR nuevos detalles
                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id,
                            producto_id,
                            cantidad,
                            costo_unitario,
                            subtotal_costo,
                            margen_porcentaje,
                            precio_venta_unitario,
                            subtotal_venta,
                            descuento_porcentaje,
                            precio_venta_con_descuento,
                            subtotal_venta_con_descuento,
                            descuento_total,
                            margen_final
                        )
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        orden_id,
                        p["producto_id"],
                        p["cantidad"],
                        p.get("costo_unitario", 0),
                        p.get("subtotal_costo", 0),
                        p.get("margen_porcentaje", 20),
                        p["precio_venta_unitario"],
                        p.get("subtotal_venta", 0),
                        p.get("descuento_porcentaje", 0),
                        p.get("precio_venta_con_descuento", p["precio_venta_unitario"]),
                        p.get("subtotal_venta_con_descuento", p.get("subtotal_venta", 0)),
                        p.get("descuento_total", 0),
                        p.get("margen_final", 20)
                    ))
                
                return jsonify({
                    "success": True,
                    "data": {
                        "id": orden_id,
                        "codigo_orden": codigo_orden,
                        "correlativo": correlativo,
                        "actualizado": True
                    }
                })
            
            else:
                # NUEVA ORDEN - INSERT
                print(f"🆕 Creando NUEVA orden de compra")
                
                # Generar número de orden secuencial
                row = db_query("""
                    SELECT numero_orden 
                    FROM ordenes_compra 
                    ORDER BY id DESC 
                    LIMIT 1
                """)
                if row:
                    ultimo = row[0]["numero_orden"]
                    numero_int = int(ultimo.split("-")[1]) + 1
                else:
                    numero_int = 1
                numero = f"OC-{str(numero_int).zfill(5)}"
                
                # Generar código personalizado si no viene
                if not codigo_orden:
                    if es_borrador:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        codigo_comprador = "TMP"
                        codigo_orden = f"TMP-COMPRA-{codigo_comprador}-{timestamp}"
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
                        numero_orden,
                        proveedor_id,
                        fecha_creacion,
                        estado,
                        subtotal,
                        igv,
                        total,
                        condicion_pago,
                        tiempo_entrega,
                        fecha_requerida,
                        lugar_entrega,
                        num_cotizacion,
                        nota_compra,
                        usuario_id,
                        notas,
                        codigo_orden,
                        correlativo,
                        descuento_porcentaje,
                        descuento_monto,
                        descuento_tipo,
                        contacto_proveedor,
                        telefono_proveedor,
                        email_proveedor
                    )
                    VALUES (%s, %s, (NOW() AT TIME ZONE 'America/Lima'), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    numero,
                    proveedor_id,
                    estado,
                    subtotal,
                    igv,
                    total,
                    condicion_pago,
                    tiempo_entrega,
                    fecha_requerida,
                    lugar_entrega,
                    num_cotizacion,
                    nota_compra,
                    usuario_id,
                    notas,
                    codigo_orden,
                    correlativo,
                    descuento_porcentaje,
                    descuento_monto,
                    descuento_tipo,
                    contacto_proveedor,
                    telefono_proveedor,
                    email_proveedor
                ))

                nuevo_id = cur.fetchone()[0]

                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id,
                            producto_id,
                            cantidad,
                            costo_unitario,
                            subtotal_costo,
                            margen_porcentaje,
                            precio_venta_unitario,
                            subtotal_venta,
                            descuento_porcentaje,
                            precio_venta_con_descuento,
                            subtotal_venta_con_descuento,
                            descuento_total,
                            margen_final
                        )
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        nuevo_id,
                        p["producto_id"],
                        p["cantidad"],
                        p.get("costo_unitario", 0),
                        p.get("subtotal_costo", 0),
                        p.get("margen_porcentaje", 20),
                        p["precio_venta_unitario"],
                        p.get("subtotal_venta", 0),
                        p.get("descuento_porcentaje", 0),
                        p.get("precio_venta_con_descuento", p["precio_venta_unitario"]),
                        p.get("subtotal_venta_con_descuento", p.get("subtotal_venta", 0)),
                        p.get("descuento_total", 0),
                        p.get("margen_final", 20)
                    ))

                return jsonify({
                    "success": True,
                    "data": {
                        "id": nuevo_id,
                        "numero": numero,
                        "codigo_orden": codigo_orden,
                        "correlativo": correlativo
                    }
                })

    except Exception as e:
        print("🔥 ERROR:", e)
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# OBTENER ORDEN DE COMPRA - CON DESCUENTO Y CAMPOS DE CONTACTO
# ==========================================

logging.basicConfig(filename='app.log', level=logging.ERROR)

@compras_bp.route("/api/orden_compra/<int:orden_id>")
def api_get_orden_compra(orden_id):
    try:
        if orden_id <= 0:
            return jsonify({
                "success": False,
                "error": "ID de orden inválido"
            }), 400

        data = obtener_orden_completa(orden_id)

        if not data:
            return jsonify({
                "success": False,
                "error": "Orden de compra no encontrada"
            }), 404

        cabecera = data.get("cabecera", {})
        detalle = data.get("detalle", [])

        es_borrador = cabecera.get("codigo_orden", "").startswith("TMP-COMPRA-")
        
        fecha_creacion = cabecera.get("fecha_creacion")
        if fecha_creacion:
            if hasattr(fecha_creacion, 'strftime'):
                fecha_creacion_str = fecha_creacion.strftime('%Y-%m-%d %H:%M:%S')
            else:
                fecha_creacion_str = str(fecha_creacion)
        else:
            fecha_creacion_str = ''

        return jsonify({
            "success": True,
            "data": {
                **cabecera,
                "fecha_creacion": fecha_creacion_str,
                "proveedor_id": cabecera.get("proveedor_id"),
                "proveedor": cabecera.get("razon_social") or cabecera.get("nombre_empresa"),
                "proveedor_ruc": cabecera.get("numero_documento") or cabecera.get("proveedor_ruc") or "",
                "codigo_orden": cabecera.get("codigo_orden"),
                "correlativo": cabecera.get("correlativo"),
                "es_borrador": es_borrador,
                "detalle": detalle,
                "descuento_porcentaje": cabecera.get("descuento_porcentaje", 0),
                "descuento_monto": cabecera.get("descuento_monto", 0),
                "descuento_tipo": cabecera.get("descuento_tipo", "porcentaje"),
                "proveedor_contacto": cabecera.get("contacto_proveedor") or "",
                "telefono_contacto": cabecera.get("telefono_proveedor") or "",
                "email_contacto_proveedor": cabecera.get("email_proveedor") or ""
            }
        })

    except Exception as e:
        print("🔥 ERROR REAL:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# LISTAR ÓRDENES DE COMPRA
# ==========================================

@compras_bp.route("/api/ordenes_compra")
def listar_ordenes():
    try:
        buscar = request.args.get('buscar', '')
        
        if buscar == ':1' or buscar == ':' or buscar is None:
            print(f"⚠️ Limpiando parámetro inválido: '{buscar}'")
            buscar = ''
        
        query = """
            SELECT 
                o.id,
                o.numero_orden,
                o.codigo_orden,
                o.correlativo,
                o.fecha_creacion,
                o.estado,   
                o.subtotal,
                o.igv,
                o.total,
                o.usuario_id,
                o.notas,
                o.condicion_pago,
                o.tiempo_entrega,
                o.lugar_entrega,
                o.num_cotizacion,
                COALESCE(p.razon_social, 'Sin proveedor') AS proveedor,
                u.nombre_completo as comprador
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
        """
        
        params = []
        
        if buscar and buscar.strip():
            query += """
                WHERE (
                    o.numero_orden ILIKE %s OR
                    o.codigo_orden ILIKE %s OR
                    p.razon_social ILIKE %s OR
                    u.nombre_completo ILIKE %s
                )
            """
            like_param = f"%{buscar}%"
            params = [like_param, like_param, like_param, like_param]
            print(f"🔍 Filtrando por: '{buscar}'")
        
        query += " ORDER BY o.id DESC"
        
        rows = db_query(query, tuple(params) if params else None)
        
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
        
        print(f"✅ Encontradas {len(resultado)} órdenes de compra")
        
        return jsonify({"success": True, "data": resultado})
        
    except Exception as e:
        print(f"🔥 ERROR LISTAR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ELIMINAR ORDEN DE COMPRA
# ==========================================

@compras_bp.route("/api/ordenes_compra/<int:id>", methods=["DELETE"])
def eliminar_orden_compra(id):
    try:
        with db_tx() as conn:
            cur = conn.cursor()

            cur.execute("""
                DELETE FROM orden_compra_detalle 
                WHERE orden_id = %s
            """, (id,))

            cur.execute("""
                DELETE FROM ordenes_compra 
                WHERE id = %s
            """, (id,))

        return jsonify({"success": True})

    except Exception as e:
        print("🔥 ERROR ELIMINAR:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# GENERAR PDF - ORDEN DE COMPRA
# ==========================================

@compras_bp.route("/api/orden_compra/pdf/<int:orden_id>")
def generar_pdf_orden_compra(orden_id):
    telefono_contacto_form = request.args.get('telefono_contacto', '')
    proveedor_contacto_form = request.args.get('proveedor_contacto', '')
    email_contacto_proveedor_form = request.args.get('email_contacto_proveedor', '')
    num_cotizacion_form = request.args.get('num_cotizacion', '')
    lugar_entrega_form = request.args.get('lugar_entrega', '')
    
    data = obtener_orden_completa(orden_id)
    if not data:
        return jsonify({"success": False, "error": "No encontrada"}), 404

    cabecera = data.get("cabecera", {})
    detalle = data.get("detalle", [])

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_logo = os.path.join(BASE_DIR, "templates", "pdf", "logo-kcf.png")

    try:
        with open(ruta_logo, "rb") as img:
            logo_base64 = base64.b64encode(img.read()).decode('utf-8')
    except Exception:
        logo_base64 = ""

    productos = []
    total_subtotal_venta = 0
    total_descuento_subtotal = 0
    total_subtotal_venta_desc = 0

    for i, p in enumerate(detalle, start=1):
        subtotal = p.get("subtotal_venta", 0)
        descuento = p.get("descuento_total", 0)
        subtotal_desc = p.get("subtotal_venta_con_descuento", subtotal)

        productos.append({
            "item": i,
            "codigo": p.get("codigo", ""),
            "descripcion": p.get("descripcion", ""),
            "marca": p.get("marca", ""),
            "modelo": p.get("modelo", ""),
            "cantidad": p.get("cantidad", 0),
            "unidad": p.get("unidad", "Unid"),
            "precio_venta_unitario": p.get("precio_venta_unitario", 0),
            "subtotal_venta": subtotal,
            "porcentaje_descuento": p.get("descuento_porcentaje", 0),
            "descuento_subtotal": descuento,
            "subtotal_venta_desc": subtotal_desc
        })

        total_subtotal_venta += subtotal
        total_descuento_subtotal += descuento
        total_subtotal_venta_desc += subtotal_desc

    # OBTENER DESCUENTO DE CABECERA
    descuento_global_porcentaje = cabecera.get("descuento_porcentaje", 0)
    descuento_global_monto = cabecera.get("descuento_monto", 0)
    descuento_global_tipo = cabecera.get("descuento_tipo", "porcentaje")
    
    hay_descuentos = total_descuento_subtotal > 0 or descuento_global_porcentaje > 0 or descuento_global_monto > 0
    
    fecha_creacion = cabecera.get("fecha_creacion", "")
    
    if fecha_creacion:
        try:
            if isinstance(fecha_creacion, str) and ' ' in fecha_creacion:
                partes = fecha_creacion.split(' ')
                fecha_parte = partes[0]
                hora_parte = partes[1]
                fecha_actual = '/'.join(fecha_parte.split('-')[::-1])
                hora_actual = hora_parte[:5]
            else:
                fecha_actual = datetime.now().strftime("%d/%m/%Y")
                hora_actual = datetime.now().strftime("%H:%M")
        except:
            fecha_actual = datetime.now().strftime("%d/%m/%Y")
            hora_actual = datetime.now().strftime("%H:%M")
    else:
        fecha_actual = datetime.now().strftime("%d/%m/%Y")
        hora_actual = datetime.now().strftime("%H:%M")

    telefono_final = telefono_contacto_form if telefono_contacto_form else cabecera.get("telefono_proveedor", "")
    contacto_final = proveedor_contacto_form if proveedor_contacto_form else cabecera.get("nombre_contacto", "")
    email_final = email_contacto_proveedor_form if email_contacto_proveedor_form else cabecera.get("email_contacto", "")
    num_cotizacion_final = num_cotizacion_form if num_cotizacion_form else cabecera.get("num_cotizacion", "")
    lugar_entrega_final = lugar_entrega_form if lugar_entrega_form else cabecera.get("lugar_entrega", "")

    html = render_template(
        "pdf/orden_compra_kcf.html",
        logo_base64=logo_base64,
        codigo_orden=cabecera.get("codigo_orden") or cabecera.get("numero_orden") or "N/A",
        fecha_actual=fecha_actual,
        hora_actual=hora_actual,
        
        proveedor_razon_social=cabecera.get("razon_social") or "",
        proveedor_ruc=cabecera.get("numero_documento") or "",
        proveedor_direccion=cabecera.get("direccion_fiscal") or "",
        telefono_contacto=telefono_final,
        proveedor_contacto=contacto_final,
        email_contacto_proveedor=email_final,
        num_cotizacion=num_cotizacion_final,
        lugar_entrega=lugar_entrega_final,
        
        comprador_responsable=cabecera.get("nombre_completo") or "Admin",
        email_contacto_user=cabecera.get("email") or "compras@kcfcorporacion.com",
        telefono_contacto_user=cabecera.get("telefono") or "999932051",
        
        condicion_pago=cabecera.get("condicion_pago") or "Contado",
        tiempo_entrega=cabecera.get("tiempo_entrega") or "Inmediato",
        fecha_requerida=cabecera.get("fecha_requerida") or "A coordinar",
        
        productos=productos,
        total_subtotal_venta=total_subtotal_venta,
        total_descuento_subtotal=total_descuento_subtotal,
        total_subtotal_venta_desc=total_subtotal_venta_desc,
        hay_descuentos=hay_descuentos,
        summary_igv=cabecera.get("igv", 0),
        summary_total_venta=cabecera.get("total", 0),
        nota_compra=cabecera.get("nota_compra") or "",
        
        descuento_global_porcentaje=descuento_global_porcentaje,
        descuento_global_monto=descuento_global_monto,
        descuento_global_tipo=descuento_global_tipo
    )

    try:
        pdf = HTML(string=html).write_pdf()
    except Exception as e:
        print("🔥 ERROR EN WEASYPRINT:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Error al generar PDF: {str(e)}"}), 500

    return Response(
        pdf,
        content_type='application/pdf',
        headers={"Content-Disposition": f"inline; filename=orden_compra_{orden_id}.pdf"}
    )