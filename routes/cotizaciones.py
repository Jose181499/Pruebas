from flask import Blueprint, render_template, jsonify, request, session, send_file, make_response, Response
from psycopg2.extras import RealDictCursor, DictCursor
from database import (obtener_cotizaciones_recientes, crear_cotizacion_transaccional, obtener_cotizacion_completa,
                    db_query, db_execute, db_tx, get_connection, buscar_cliente_por_ruc)
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

cotizaciones_bp = Blueprint("cotizaciones", __name__)

# ==========================================
# RUTAS DE VISTAS (HTML)
# ==========================================

@cotizaciones_bp.route("/cotizacion")
def cotizacion_principal():
    return render_template("listado_cotizaciones.html")


@cotizaciones_bp.route("/crear_cotizacion")
def cotizacion():
    """Nueva cotización - sin ID"""
    print(f"🆕 NUEVA COTIZACIÓN - Sin ID")
    cotizaciones = obtener_cotizaciones_recientes(limit=300)
    return render_template("cotizacion_oc/crear_cotizacion.html",
                          cotizaciones=cotizaciones,
                          cotizacion_id=None,
                          modo='nuevo')


@cotizaciones_bp.route("/cotizacion/nueva")
def nueva_cotizacion():
    return render_template("cotizacion_oc/crear_cotizacion.html")


@cotizaciones_bp.route("/cotizacion/orden")
def nueva_orden():
    return render_template("cotizacion_oc/generar_orden_compra.html")


@cotizaciones_bp.route("/cotizacion/consultar/<int:cotizacion_id>")
def cotizacion_consultar(cotizacion_id):
    """Editar cotización existente - con ID"""
    print(f"✏️ EDITAR COTIZACIÓN - ID: {cotizacion_id}")
    return render_template("cotizacion_oc/crear_cotizacion.html",
                          cotizacion_id=cotizacion_id,
                          modo='editar')


# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def obtener_cotizaciones_recientes(limit=100):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            c.id,
            c.numero_cotizacion,
            c.codigo_cotizacion,
            c.correlativo,
            c.fecha_creacion,
            c.estado,
            COALESCE(cl.razon_social, 'Sin cliente') AS cliente,
            COALESCE(SUM(d.subtotal_venta_con_descuento), 0) AS total
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN cotizacion_detalle d ON c.id = d.cotizacion_id
        GROUP BY c.id, cl.razon_social, c.numero_cotizacion, c.codigo_cotizacion, c.correlativo, c.fecha_creacion, c.estado
        ORDER BY c.id DESC
        LIMIT %s
    """, (limit,))

    columnas = [col[0] for col in cursor.description]
    cotizaciones = [dict(zip(columnas, row)) for row in cursor.fetchall()]

    conn.close()
    return cotizaciones


# ==========================================
# ENDPOINTS PARA CÓDIGOS DE COTIZACIÓN PERSONALIZADOS
# ==========================================

@cotizaciones_bp.route("/api/usuarios/actual", methods=["GET"])
def obtener_usuario_actual():
    """Obtener usuario actual con su código de vendedor"""
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


@cotizaciones_bp.route("/api/cotizacion/ultimo-correlativo", methods=["GET"])
def obtener_ultimo_correlativo():
    """Obtener el último correlativo de cotizaciones por usuario"""
    try:
        usuario_id = request.args.get('usuario_id')
        
        if not usuario_id:
            return jsonify({
                'success': False,
                'error': 'usuario_id es requerido'
            }), 400
        
        query = """
            SELECT MAX(correlativo) as ultimo 
            FROM cotizaciones 
            WHERE usuario_id = %s
        """
        resultado = db_query(query, (usuario_id,))
        
        ultimo_correlativo = resultado[0]['ultimo'] if resultado and resultado[0]['ultimo'] else 0
        
        return jsonify({
            'success': True,
            'correlativo': ultimo_correlativo
        })
        
    except Exception as e:
        print(f"Error en /api/cotizacion/ultimo-correlativo: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cotizaciones_bp.route("/api/usuarios/buscar", methods=["GET"])
def buscar_usuarios():
    """Buscar usuarios asesores por nombre"""
    try:
        q = request.args.get('q', '')
        
        if q and q.strip():
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol
                FROM usuarios 
                WHERE (nombre_completo ILIKE %s OR email ILIKE %s)
                AND estado = 'activo'
                AND rol IN ('vendedor', 'admin', 'supervisor')
                LIMIT 20
            """
            usuarios = db_query(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, nombre_completo, email, telefono, codigo_vendedor, rol
                FROM usuarios 
                WHERE estado = 'activo'
                AND rol IN ('vendedor', 'admin', 'supervisor')
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


@cotizaciones_bp.route("/api/clientes/buscar", methods=["GET"])
def buscar_clientes():
    """Buscar clientes por nombre o documento - VERSIÓN CORREGIDA"""
    print("=" * 60)
    print("🎯 ESTA ES LA VERSIÓN CORREGIDA DE cotizaciones.py")
    print("=" * 60)
    
    try:
        q = request.args.get('q', '')
        
        # Conexión directa para asegurar los campos
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if q and q.strip():
            query = """
                SELECT 
                    id, 
                    razon_social, 
                    numero_documento, 
                    direccion_fiscal, 
                    COALESCE(telefono_contacto, '') as telefono_contacto,
                    COALESCE(nombre_contacto, '') as nombre_contacto, 
                    tipo_documento, 
                    COALESCE(email_contacto, '') as email_contacto
                FROM clientes 
                WHERE razon_social ILIKE %s OR numero_documento ILIKE %s
                LIMIT 20
            """
            cur.execute(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT 
                    id, 
                    razon_social, 
                    numero_documento, 
                    direccion_fiscal, 
                    COALESCE(telefono_contacto, '') as telefono_contacto,
                    COALESCE(nombre_contacto, '') as nombre_contacto, 
                    tipo_documento, 
                    COALESCE(email_contacto, '') as email_contacto
                FROM clientes 
                LIMIT 20
            """
            cur.execute(query)
        
        clientes = cur.fetchall()
        cur.close()
        conn.close()
        
        for cliente in clientes:
            cliente['cliente_ruc'] = cliente['numero_documento']
        
        print(f"📊 PRIMER CLIENTE:", clientes[0] if clientes else "Ninguno")
        if clientes:
            print(f"   - telefono_contacto: {clientes[0].get('telefono_contacto')}")
            print(f"   - nombre_contacto: {clientes[0].get('nombre_contacto')}")
            print(f"   - email_contacto: {clientes[0].get('email_contacto')}")
        
        return jsonify({
            'success': True,
            'data': clientes
        })
        
    except Exception as e:
        print(f"❌ Error en /api/clientes/buscar: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# ==========================================
# ENDPOINT: BUSCAR CLIENTE POR RUC EXACTO
# ==========================================

@cotizaciones_bp.route("/api/clientes/buscar-por-ruc", methods=["GET"])
def buscar_cliente_por_ruc_api():
    """Buscar cliente por RUC exacto en la base de datos"""
    try:
        ruc = request.args.get('ruc', '').strip()
        
        if not ruc:
            return jsonify({"success": False, "error": "Debe ingresar un RUC"}), 400
        
        if len(ruc) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"}), 400
        
        cliente = buscar_cliente_por_ruc(ruc)
        
        if cliente:
            return jsonify({
                "success": True,
                "found": True,
                "data": cliente
            })
        else:
            return jsonify({
                "success": True,
                "found": False,
                "message": "Cliente no encontrado en la base de datos"
            })
        
    except Exception as e:
        print(f"🔥 Error al buscar cliente por RUC: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@cotizaciones_bp.route("/api/clientes/<int:id>", methods=["GET"])
def obtener_cliente(id):
    """Obtener cliente por ID con sus puntos de entrega"""
    try:
        query = """
            SELECT id, razon_social, numero_documento, direccion_fiscal, 
                   telefono_contacto, nombre_contacto, tipo_documento, email_contacto
            FROM clientes 
            WHERE id = %s
        """
        cliente = db_query(query, (id,))
        
        if not cliente:
            return jsonify({'success': False, 'error': 'Cliente no encontrado'}), 404
        
        query_puntos = """
            SELECT id, nombre_punto, direccion, telefono_contacto, nombre_contacto,
                   condicion_pago
            FROM clientes_puntos_entrega 
            WHERE cliente_id = %s
        """
        puntos_entrega = db_query(query_puntos, (id,))
        
        cliente[0]['puntos_entrega'] = puntos_entrega
        
        return jsonify({
            'success': True,
            'data': cliente[0]
        })
        
    except Exception as e:
        print(f"Error en /api/clientes/{id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cotizaciones_bp.route("/api/clientes/<int:cliente_id>/contactos", methods=["GET"])
def buscar_contactos_cliente(cliente_id):
    """Buscar contactos de un cliente específico"""
    try:
        q = request.args.get('q', '')
        
        if q and q.strip():
            query = """
                SELECT id, nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos
                WHERE cliente_id = %s 
                AND (nombre_contacto ILIKE %s OR email ILIKE %s OR telefono ILIKE %s)
                ORDER BY principal DESC, nombre_contacto
                LIMIT 10
            """
            contactos = db_query(query, (cliente_id, f'%{q}%', f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos
                WHERE cliente_id = %s
                ORDER BY principal DESC, nombre_contacto
                LIMIT 10
            """
            contactos = db_query(query, (cliente_id,))
        
        resultados = []
        for c in contactos:
            resultados.append({
                'id': c['id'],
                'nombre_contacto': c['nombre_contacto'],
                'email': c.get('email', ''),
                'telefono': c.get('telefono', ''),
                'cargo': c.get('cargo', ''),
                'principal': c.get('principal', False)
            })
        
        return jsonify({
            'success': True,
            'data': resultados
        })
        
    except Exception as e:
        print(f"Error en /api/clientes/{cliente_id}/contactos: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# ENDPOINT: BUSCAR PRODUCTOS
# ==========================================

@cotizaciones_bp.route("/api/productos/buscar", methods=["GET"])
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
# ENDPOINT: VERIFICAR CÓDIGO DE COTIZACIÓN
# ==========================================

@cotizaciones_bp.route("/api/cotizacion/verificar-codigo", methods=["GET"])
def verificar_codigo_cotizacion():
    """Verificar si un código de cotización ya existe"""
    try:
        codigo = request.args.get('codigo', '')
        
        if not codigo:
            return jsonify({"exists": False, "error": "No se proporcionó código"}), 400
        
        resultado = db_query("SELECT id FROM cotizaciones WHERE codigo_cotizacion = %s", (codigo,))
        
        existe = len(resultado) > 0
        
        return jsonify({
            "exists": existe,
            "codigo": codigo
        })
        
    except Exception as e:
        print(f"🔥 Error verificando código: {str(e)}")
        return jsonify({"exists": False, "error": str(e)}), 500


# ==========================================
# ENDPOINT: CREAR CLIENTE
# ==========================================

@cotizaciones_bp.route("/api/clientes/crear", methods=["POST"])
def crear_cliente():
    """Crear un nuevo cliente desde el formulario de cotización"""
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
            SELECT id FROM clientes WHERE numero_documento = %s
        """, (numero_documento,))
        
        if existente:
            return jsonify({
                'success': False, 
                'error': f'Ya existe un cliente con el documento {numero_documento}'
            }), 400
        
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO clientes 
                (tipo_documento, numero_documento, razon_social, nombre_comercial, 
                 direccion_fiscal, telefono_contacto, email_contacto, nombre_contacto, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id
            """, (tipo_documento, numero_documento, razon_social, nombre_comercial,
                  direccion_fiscal, telefono_contacto, email_contacto, nombre_contacto))
            
            cliente_id = cur.fetchone()[0]
        
        return jsonify({
            'success': True,
            'data': {
                'id': cliente_id, 
                'razon_social': razon_social,
                'numero_documento': numero_documento
            }
        })
        
    except Exception as e:
        print(f"Error en /api/clientes/crear: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==========================================
# ENDPOINT: CLIENTES PUNTOS DE ENTREGA
# ==========================================

@cotizaciones_bp.route("/api/clientes/<int:cliente_id>/direcciones", methods=["GET"])
def obtener_direcciones_cliente(cliente_id):
    """Obtener direcciones/puntos de entrega de un cliente"""
    try:
        query = """
            SELECT id, direccion, nombre_punto, principal, telefono_contacto
            FROM clientes_puntos_entrega
            WHERE cliente_id = %s
            ORDER BY principal DESC, nombre_punto
        """
        direcciones = db_query(query, (cliente_id,))
        
        return jsonify({
            'success': True,
            'data': direcciones
        })
        
    except Exception as e:
        print(f"Error en /api/clientes/{cliente_id}/direcciones: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==========================================
# GUARDAR COTIZACIÓN - CON DESCUENTO PERSONALIZADO
# ==========================================
@cotizaciones_bp.route("/api/cotizacion/guardar", methods=["POST"])
def guardar_cotizacion():
    data = request.json

    try:
        cliente_id = data.get("cliente_id")
        subtotal = data.get("subtotal", 0)
        estado = data.get("estado", "En Proceso")
        igv = data.get("igv", 0)
        total = data.get("total", 0)
        notas = data.get("notas")
        usuario_id = data.get("usuario_id")
        condicion_pago = data.get("condicion_pago", "Contado")
        tiempo_entrega = data.get("tiempo_entrega")
        validez_oferta = data.get("validez_oferta")
        direccion_entrega = data.get("direccion_entrega")
        requerimiento = data.get("requerimiento")
        nota_cotizacion = data.get("nota_cotizacion")
        
        # 🔥 AGREGAR ESTAS TRES LÍNEAS
        contacto_cliente = data.get("cliente_contacto", "")
        telefono_cliente = data.get("telefono_contacto", "")
        email_cliente = data.get("email_contacto_cliente", "")
        
        # Campos de descuento
        descuento_porcentaje = data.get("descuento_porcentaje", 0)
        descuento_monto = data.get("descuento_monto", 0)
        descuento_tipo = data.get("descuento_tipo", "porcentaje")
        
        codigo_cotizacion = data.get("codigo_cotizacion")
        correlativo = data.get("correlativo")
        es_borrador = data.get("es_borrador", False)
        
        # 🔥 OBTENER EL ID DE LA COTIZACIÓN (si existe)
        cotizacion_id = data.get("id") or request.args.get('id')
        
        # Si no viene en data, buscar en el objeto
        if not cotizacion_id:
            cotizacion_id = data.get("cotizacion_id")

        with db_tx() as conn:
            cur = conn.cursor()
            
            # 🔥 VERIFICAR SI ES ACTUALIZACIÓN O NUEVA COTIZACIÓN
            if cotizacion_id:
                print(f"✏️ ACTUALIZANDO cotización ID: {cotizacion_id}")
                
                # ACTUALIZAR cabecera
                cur.execute("""
                    UPDATE cotizaciones 
                    SET cliente_id = %s,
                        estado = %s,
                        subtotal = %s,
                        igv = %s,
                        total = %s,
                        condicion_pago = %s,
                        tiempo_entrega = %s,
                        validez_oferta = %s,
                        direccion_entrega = %s,
                        requerimiento = %s,
                        nota_cotizacion = %s,
                        usuario_id = %s,
                        notas = %s,
                        descuento_porcentaje = %s,
                        descuento_monto = %s,
                        descuento_tipo = %s,
                        contacto_cliente = %s,
                        telefono_cliente = %s,
                        email_cliente = %s
                    WHERE id = %s
                """, (
                    cliente_id,
                    estado,
                    subtotal,
                    igv,
                    total,
                    condicion_pago,
                    tiempo_entrega,
                    validez_oferta,
                    direccion_entrega,
                    requerimiento,
                    nota_cotizacion,
                    usuario_id,
                    notas,
                    descuento_porcentaje,
                    descuento_monto,
                    descuento_tipo,
                    contacto_cliente,
                    telefono_cliente,
                    email_cliente,
                    cotizacion_id
                ))
                
                # ELIMINAR detalles antiguos
                cur.execute("DELETE FROM cotizacion_detalle WHERE cotizacion_id = %s", (cotizacion_id,))
                
                # INSERTAR nuevos detalles
                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO cotizacion_detalle (
                            cotizacion_id,
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
                        cotizacion_id,
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
                        "id": cotizacion_id,
                        "codigo_cotizacion": codigo_cotizacion,
                        "correlativo": correlativo,
                        "actualizado": True
                    }
                })
            
            else:
                # 🔥 NUEVA COTIZACIÓN - INSERT
                print(f"🆕 Creando NUEVA cotización")
                
                # Generar número de cotización secuencial
                row = db_query("""
                    SELECT numero_cotizacion 
                    FROM cotizaciones 
                    ORDER BY id DESC 
                    LIMIT 1
                """)
                if row:
                    ultimo = row[0]["numero_cotizacion"]
                    numero_int = int(ultimo.split("-")[1]) + 1
                else:
                    numero_int = 1
                numero = f"COT-{str(numero_int).zfill(5)}"
                
                # Generar código personalizado si no viene
                if not codigo_cotizacion:
                    if es_borrador:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        codigo_vendedor = "TMP"
                        codigo_cotizacion = f"TMP-{codigo_vendedor}-{timestamp}"
                        correlativo = 0
                    else:
                        usuario_query = "SELECT codigo_vendedor FROM usuarios WHERE id = %s"
                        usuario = db_query(usuario_query, (usuario_id,))
                        codigo_vendedor = usuario[0]['codigo_vendedor'] if usuario else f"V{str(usuario_id).zfill(3)}"
                        
                        corr_query = "SELECT MAX(correlativo) as ultimo FROM cotizaciones WHERE usuario_id = %s"
                        ultimo_corr = db_query(corr_query, (usuario_id,))
                        nuevo_corr = (ultimo_corr[0]['ultimo'] or 0) + 1
                        
                        fecha = datetime.now()
                        codigo_cotizacion = f"COT-{codigo_vendedor}-{fecha.year}{str(fecha.month).zfill(2)}{str(fecha.day).zfill(2)}-{str(nuevo_corr).zfill(4)}"
                        correlativo = nuevo_corr

                cur.execute("""
                    INSERT INTO cotizaciones (
                        numero_cotizacion,
                        cliente_id,
                        fecha_creacion,
                        estado,
                        subtotal,
                        igv,
                        total,
                        condicion_pago,
                        tiempo_entrega,
                        validez_oferta,
                        direccion_entrega,
                        requerimiento,
                        nota_cotizacion,
                        usuario_id,
                        notas,
                        codigo_cotizacion,
                        correlativo,
                        descuento_porcentaje,
                        descuento_monto,
                        descuento_tipo,
                        contacto_cliente,
                        telefono_cliente,
                        email_cliente
                    )
                    VALUES (%s, %s, (NOW() AT TIME ZONE 'America/Lima'), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    numero,
                    cliente_id,
                    estado,
                    subtotal,
                    igv,
                    total,
                    condicion_pago,
                    tiempo_entrega,
                    validez_oferta,
                    direccion_entrega,
                    requerimiento,
                    nota_cotizacion,
                    usuario_id,
                    notas,
                    codigo_cotizacion,
                    correlativo,
                    descuento_porcentaje,
                    descuento_monto,
                    descuento_tipo,
                    contacto_cliente,
                    telefono_cliente,
                    email_cliente
                ))

                nuevo_id = cur.fetchone()[0]

                for p in data.get("productos", []):
                    cur.execute("""
                        INSERT INTO cotizacion_detalle (
                            cotizacion_id,
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
                        "codigo_cotizacion": codigo_cotizacion,
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
# OBTENER COTIZACIÓN - CON DESCUENTO Y CAMPOS DE CONTACTO
# ==========================================

logging.basicConfig(filename='app.log', level=logging.ERROR)

@cotizaciones_bp.route("/api/cotizacion/<int:cotizacion_id>")
def api_get_cotizacion(cotizacion_id):
    try:
        if cotizacion_id <= 0:
            return jsonify({
                "success": False,
                "error": "ID de cotización inválido"
            }), 400

        data = obtener_cotizacion_completa(cotizacion_id)

        if not data:
            return jsonify({
                "success": False,
                "error": "Cotización no encontrada"
            }), 404

        cabecera = data.get("cabecera", {})
        detalle = data.get("detalle", [])

        es_borrador = cabecera.get("codigo_cotizacion", "").startswith("TMP-")
        
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
        "cliente_id": cabecera.get("cliente_id"),
        "cliente": cabecera.get("razon_social") or cabecera.get("nombre_empresa"),
        "cliente_ruc": cabecera.get("numero_documento") or cabecera.get("cliente_ruc") or "",
        "codigo_cotizacion": cabecera.get("codigo_cotizacion"),
        "correlativo": cabecera.get("correlativo"),
        "es_borrador": es_borrador,
        "detalle": detalle,
        "descuento_porcentaje": cabecera.get("descuento_porcentaje", 0),
        "descuento_monto": cabecera.get("descuento_monto", 0),
        "descuento_tipo": cabecera.get("descuento_tipo", "porcentaje"),
        # 🔥 CORREGIDO: Usar los campos de la cotización (contacto_cliente, telefono_cliente, email_cliente)
        # NO usar nombre_contacto, telefono_contacto, email_contacto (esos son del cliente)
        "cliente_contacto": cabecera.get("contacto_cliente") or "",
        "telefono_contacto": cabecera.get("telefono_cliente") or "",
        "email_contacto_cliente": cabecera.get("email_cliente") or ""
    }
})

    except Exception as e:
        print("🔥 ERROR REAL:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# LISTAR COTIZACIONES
# ==========================================

@cotizaciones_bp.route("/api/cotizacion_comercial")
def listar_cotizaciones():
    try:
        buscar = request.args.get('buscar', '')
        
        if buscar == ':1' or buscar == ':' or buscar is None:
            print(f"⚠️ Limpiando parámetro inválido: '{buscar}'")
            buscar = ''
        
        query = """
            SELECT 
                c.id,
                c.numero_cotizacion,
                c.codigo_cotizacion,
                c.correlativo,
                c.fecha_creacion,
                c.estado,   
                c.subtotal,
                c.igv,
                c.total,
                c.usuario_id,
                c.notas,
                c.condicion_pago,
                c.tiempo_entrega,
                c.direccion_entrega,
                c.requerimiento,
                COALESCE(cl.razon_social, 'Sin cliente') AS cliente,
                u.nombre_completo as vendedor
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
        """
        
        params = []
        
        if buscar and buscar.strip():
            query += """
                WHERE (
                    c.numero_cotizacion ILIKE %s OR
                    c.codigo_cotizacion ILIKE %s OR
                    cl.razon_social ILIKE %s OR
                    u.nombre_completo ILIKE %s
                )
            """
            like_param = f"%{buscar}%"
            params = [like_param, like_param, like_param, like_param]
            print(f"🔍 Filtrando por: '{buscar}'")
        
        query += " ORDER BY c.id DESC"
        
        rows = db_query(query, tuple(params) if params else None)
        
        resultado = []
        for row in rows:
            resultado.append({
                'id': row['id'],
                'numero_cotizacion': row['numero_cotizacion'],
                'codigo_cotizacion': row['codigo_cotizacion'],
                'fecha_creacion': row['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S') if row['fecha_creacion'] else '',
                'estado': row['estado'],
                'cliente': row['cliente'],
                'vendedor': row['vendedor'],
                'total': float(row['total']) if row['total'] else 0
            })
        
        print(f"✅ Encontradas {len(resultado)} cotizaciones")
        
        return jsonify({"success": True, "data": resultado})
        
    except Exception as e:
        print(f"🔥 ERROR LISTAR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ELIMINAR COTIZACION
# ==========================================

@cotizaciones_bp.route("/api/cotizacion_comercial/<int:id>", methods=["DELETE"])
def eliminar_cotizacion(id):
    try:
        with db_tx() as conn:
            cur = conn.cursor()

            cur.execute("""
                DELETE FROM cotizacion_detalle 
                WHERE cotizacion_id = %s
            """, (id,))

            cur.execute("""
                DELETE FROM cotizaciones 
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
# API PARA PRODUCTOS - EDITAR Y ELIMINAR
# ==========================================

@cotizaciones_bp.route("/api/productos/<int:id>", methods=["PUT"])
def actualizar_producto(id):
    """Actualizar un producto existente"""
    try:
        data = request.json
        
        if not data.get('familia'):
            return jsonify({"success": False, "error": "La familia es requerida"}), 400
        
        if not data.get('descripcion'):
            return jsonify({"success": False, "error": "La descripción es requerida"}), 400
        
        existe = db_query("SELECT id FROM productos WHERE id = %s", (id,))
        if not existe:
            return jsonify({"success": False, "error": "Producto no encontrado"}), 404
        
        query = """
            UPDATE productos 
            SET familia = %s,
                marca = %s,
                descripcion = %s,
                modelo = %s,
                unidad = %s,
                volumen = %s,
                transporte = %s,
                observaciones = %s,
                descripcion_larga = %s,
                costo_unitario = %s,
                precio_unitario = %s,
                stock = %s,
                updated_at = NOW()
            WHERE id = %s
        """
        
        params = (
            data.get('familia'),
            data.get('marca'),
            data.get('descripcion'),
            data.get('modelo'),
            data.get('unidad'),
            data.get('volumen'),
            data.get('transporte'),
            data.get('observaciones'),
            data.get('descripcion_larga'),
            data.get('costo_unitario', 0),
            data.get('precio_unitario', 0),
            data.get('stock', 0),
            id
        )
        
        db_execute(query, params)
        
        return jsonify({
            "success": True,
            "message": "Producto actualizado correctamente"
        })
        
    except Exception as e:
        print(f"🔥 Error al actualizar producto {id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@cotizaciones_bp.route("/api/productos/<int:id>", methods=["DELETE"])
def eliminar_producto_api(id):
    """Eliminar un producto"""
    try:
        existe = db_query("SELECT id, descripcion FROM productos WHERE id = %s", (id,))
        if not existe:
            return jsonify({"success": False, "error": "Producto no encontrado"}), 404
        
        en_cotizacion = db_query("SELECT id FROM cotizacion_detalle WHERE producto_id = %s LIMIT 1", (id,))
        if en_cotizacion:
            return jsonify({
                "success": False, 
                "error": "No se puede eliminar el producto porque está asociado a una o más cotizaciones"
            }), 400
        
        db_execute("DELETE FROM productos WHERE id = %s", (id,))
        
        return jsonify({
            "success": True,
            "message": "Producto eliminado correctamente"
        })
        
    except Exception as e:
        print(f"🔥 Error al eliminar producto {id}: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# GENERAR PDF - CON DESCUENTO
# ==========================================

@cotizaciones_bp.route("/api/cotizacion/pdf/<int:cotizacion_id>")
def generar_pdf(cotizacion_id):
    telefono_contacto_form = request.args.get('telefono_contacto', '')
    cliente_contacto_form = request.args.get('cliente_contacto', '')
    email_contacto_cliente_form = request.args.get('email_contacto_cliente', '')
    requerimiento_form = request.args.get('requerimiento', '')
    direccion_entrega_form = request.args.get('direccion_entrega', '')
    
    data = obtener_cotizacion_completa(cotizacion_id)
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

    # 🔥 OBTENER DESCUENTO DE CABECERA
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

    telefono_final = telefono_contacto_form if telefono_contacto_form else cabecera.get("telefono_contacto", "")
    contacto_final = cliente_contacto_form if cliente_contacto_form else cabecera.get("nombre_contacto", "")
    email_final = email_contacto_cliente_form if email_contacto_cliente_form else cabecera.get("email_contacto", "")
    requerimiento_final = requerimiento_form if requerimiento_form else cabecera.get("requerimiento", "")
    direccion_entrega_final = direccion_entrega_form if direccion_entrega_form else cabecera.get("direccion_entrega", "")

    html = render_template(
        "pdf/cotizacion_kcf.html",
        logo_base64=logo_base64,
        codigo_cotizacion=cabecera.get("codigo_cotizacion") or cabecera.get("numero_cotizacion") or "N/A",
        fecha_actual=fecha_actual,
        hora_actual=hora_actual,
        
        cliente_razon_social=cabecera.get("razon_social") or "",
        cliente_ruc=cabecera.get("numero_documento") or "",
        cliente_direccion=cabecera.get("direccion_fiscal") or "",
        telefono_contacto=telefono_final,
        cliente_contacto=contacto_final,
        email_contacto_cliente=email_final,
        numero_requerimiento=requerimiento_final,
        direccion_entrega=direccion_entrega_final,
        
        asesor_comercial=cabecera.get("nombre_completo") or "Hellen Blas Principe",
        email_contacto=cabecera.get("email") or "ventas@kcfcorporacion.com",
        telefono_contacto_user=cabecera.get("telefono") or "999932051",
        
        condicion_pago=cabecera.get("condicion_pago") or "Contado",
        tiempo_entrega=cabecera.get("tiempo_entrega") or "Inmediato",
        validez_oferta=cabecera.get("validez_oferta") or "15 días",
        
        productos=productos,
        total_subtotal_venta=total_subtotal_venta,
        total_descuento_subtotal=total_descuento_subtotal,
        total_subtotal_venta_desc=total_subtotal_venta_desc,
        hay_descuentos=hay_descuentos,
        summary_igv=cabecera.get("igv", 0),
        summary_total_venta=cabecera.get("total", 0),
        nota_cotizacion=cabecera.get("nota_cotizacion") or "",
        
        # 🔥 NUEVOS CAMPOS PARA DESCUENTO GLOBAL
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
        headers={"Content-Disposition": f"inline; filename=cotizacion_{cotizacion_id}.pdf"}
    )