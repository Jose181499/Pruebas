from flask import Blueprint, render_template, jsonify, request, session, send_file, make_response, Response
from psycopg2.extras import RealDictCursor, DictCursor
import os
import traceback

from database import (obtener_ordenes_recientes, crear_orden_compra_transaccional,
                    db_query, db_execute, db_tx, get_connection)
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
    try:
        return render_template("compras.html")
    except Exception as e:
        error_msg = f"Error en /compras: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return error_msg, 500

@compras_bp.route("/crear_compra")
def crear_compra():
    """Nueva orden de compra - sin ID"""
    try:
        print(f"🆕 NUEVA ORDEN DE COMPRA - Sin ID")
        
        ordenes = obtener_ordenes_recientes(limit=300)
        
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
    return render_template("cotizacion_oc/crear_compra.html", ordenes=[], orden_compra_id=None, modo='nuevo')

@compras_bp.route("/editar_compra/<int:orden_id>")
def editar_compra(orden_id):
    """Editar orden de compra existente - con ID"""
    print(f"✏️ EDITAR ORDEN DE COMPRA - ID: {orden_id}")
    ordenes = obtener_ordenes_recientes(limit=300)
    return render_template("cotizacion_oc/crear_compra.html",
                          ordenes=ordenes,
                          orden_compra_id=orden_id,
                          modo='editar')

# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def obtener_ordenes_recientes(limit=100):
    """Obtener órdenes de compra recientes con TODOS los campos necesarios"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                o.id,
                o.numero_orden,
                o.codigo_orden,
                o.correlativo,
                o.fecha_creacion,
                o.estado,
                o.total,
                o.subtotal,
                o.igv,
                o.condicion_pago,
                o.nota_compra,
                o.notas,
                o.lugar_entrega,
                o.fecha_requerida,
                o.tiempo_entrega,
                o.num_cotizacion,
                o.proveedor_id,
                o.contacto_proveedor,
                o.telefono_proveedor,
                o.email_proveedor,
                -- Datos del proveedor - CORREGIDO
                p.ruc as proveedor_ruc,
                p.razon_social as proveedor,
                COALESCE(p.razon_comercial, p.razon_social) as nombre_comercial,
                p.contacto as proveedor_contacto,
                p.telefono as telefono_contacto,
                p.email as email_contacto_proveedor,
                p.direccion as proveedor_direccion,
                p.codigo_proveedor as codigo_proveedor,
                -- Datos del usuario
                u.nombre_completo as comprador,
                u.email as comprador_email,
                u.telefono as comprador_telefono,
                -- Contadores
                COUNT(d.id) as total_items,
                COALESCE(SUM(d.cantidad), 0) as cantidad_total_items,
                COALESCE(SUM(d.subtotal_venta_con_descuento), 0) as total_detalle,
                -- Descripción de la orden desde productos
                (SELECT STRING_AGG(pr.descripcion, ' / ') 
                 FROM orden_compra_detalle d2 
                 LEFT JOIN productos pr ON d2.producto_id = pr.id 
                 WHERE d2.orden_id = o.id 
                 LIMIT 3) as descripcion
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
            LEFT JOIN orden_compra_detalle d ON o.id = d.orden_id
            GROUP BY 
                o.id, o.numero_orden, o.codigo_orden, o.correlativo, 
                o.fecha_creacion, o.estado, o.total, o.subtotal, o.igv,
                o.condicion_pago, o.nota_compra, o.notas,
                o.lugar_entrega, o.fecha_requerida, o.tiempo_entrega,
                o.num_cotizacion, o.proveedor_id,
                o.contacto_proveedor, o.telefono_proveedor, o.email_proveedor,
                p.ruc, p.razon_social, p.razon_comercial, p.contacto,
                p.telefono, p.email, p.direccion, p.codigo_proveedor,
                u.nombre_completo, u.email, u.telefono
            ORDER BY o.id DESC
            LIMIT %s
        """, (limit,))

        ordenes = cursor.fetchall()
        conn.close()
        
        # Convertir a lista de diccionarios con valores por defecto
        resultado = []
        for orden in ordenes:
            resultado.append({
                'id': orden.get('id'),
                'numero_orden': orden.get('numero_orden'),
                'codigo_orden': orden.get('codigo_orden'),
                'correlativo': orden.get('correlativo'),
                'fecha_creacion': orden.get('fecha_creacion').strftime('%Y-%m-%d %H:%M:%S') if orden.get('fecha_creacion') else '',
                'estado': orden.get('estado', 'pendiente'),
                'total': float(orden.get('total') or 0),
                'subtotal': float(orden.get('subtotal') or 0),
                'igv': float(orden.get('igv') or 0),
                'condicion_pago': orden.get('condicion_pago') or '--',
                'nota_compra': orden.get('nota_compra') or '--',
                'notas': orden.get('notas') or '--',
                'descripcion': orden.get('descripcion') or '--',
                'lugar_entrega': orden.get('lugar_entrega') or '--',
                'fecha_requerida': orden.get('fecha_requerida') or '--',
                'tiempo_entrega': orden.get('tiempo_entrega') or '--',
                'num_cotizacion': orden.get('num_cotizacion') or '--',
                'proveedor_id': orden.get('proveedor_id'),
                'proveedor_ruc': orden.get('proveedor_ruc') or '--',
                'proveedor': orden.get('proveedor') or 'Sin proveedor',
                'nombre_comercial': orden.get('nombre_comercial') or '--',
                'proveedor_contacto': orden.get('proveedor_contacto') or orden.get('contacto_proveedor') or '--',
                'telefono_contacto': orden.get('telefono_contacto') or orden.get('telefono_proveedor') or '--',
                'email_contacto_proveedor': orden.get('email_contacto_proveedor') or orden.get('email_proveedor') or '--',
                'proveedor_direccion': orden.get('proveedor_direccion') or '--',
                'codigo_proveedor': orden.get('codigo_proveedor') or '--',
                'comprador': orden.get('comprador') or '--',
                'comprador_email': orden.get('comprador_email') or '--',
                'comprador_telefono': orden.get('comprador_telefono') or '--',
                'total_items': int(orden.get('total_items') or 0),
                'cantidad_total_items': int(orden.get('cantidad_total_items') or 0),
                'total_detalle': float(orden.get('total_detalle') or 0),
                'contacto_proveedor': orden.get('contacto_proveedor') or '--',
                'telefono_proveedor': orden.get('telefono_proveedor') or '--',
                'email_proveedor': orden.get('email_proveedor') or '--'
            })
        
        return resultado
        
    except Exception as e:
        print(f"🔥 Error en obtener_ordenes_recientes: {str(e)}")
        traceback.print_exc()
        return []


def obtener_descripcion_orden(orden_id):
    """Obtener descripción de la orden desde sus productos"""
    try:
        if not orden_id:
            return '--'
        
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT STRING_AGG(pr.descripcion, ' / ') as descripcion
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
            LIMIT 3
        """, (orden_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result.get('descripcion'):
            desc = result['descripcion']
            if len(desc) > 100:
                desc = desc[:100] + '...'
            return desc
        return '--'
        
    except Exception as e:
        print(f"Error en obtener_descripcion_orden: {e}")
        return '--'


def obtener_orden_completa(orden_id):
    """Obtener orden de compra completa con cabecera y detalles"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
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
                o.condicion_pago,
                o.tiempo_entrega,
                o.fecha_requerida,
                o.lugar_entrega,
                o.num_cotizacion,
                o.nota_compra,
                o.usuario_id,
                o.notas,
                o.descuento_porcentaje,
                o.descuento_monto,
                o.descuento_tipo,
                o.contacto_proveedor,
                o.telefono_proveedor,
                o.email_proveedor,
                -- Datos del proveedor
                p.razon_social as proveedor,
                p.ruc as proveedor_ruc,
                p.direccion as proveedor_direccion,
                p.contacto as proveedor_contacto,
                p.telefono as telefono_contacto,
                p.email as email_contacto_proveedor,
                p.codigo_proveedor as codigo_proveedor,
                p.razon_comercial as nombre_comercial,
                -- Datos del usuario
                u.nombre_completo as comprador,
                u.email as comprador_email,
                u.telefono as comprador_telefono
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.id = %s
        """, (orden_id,))
        
        cabecera = cursor.fetchone()
        if not cabecera:
            conn.close()
            return None
        
        cursor.execute("""
            SELECT 
                d.id,
                d.orden_id,
                d.producto_id,
                d.cantidad,
                d.costo_unitario,
                d.subtotal_costo,
                d.margen_porcentaje,
                d.precio_venta_unitario,
                d.subtotal_venta,
                d.descuento_porcentaje,
                d.precio_venta_con_descuento,
                d.subtotal_venta_con_descuento,
                d.descuento_total,
                d.margen_final,
                pr.codigo,
                pr.descripcion,
                pr.marca,
                pr.modelo,
                pr.unidad as unidad_medida
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
        """, (orden_id,))
        
        detalles = cursor.fetchall()
        conn.close()
        
        cabecera_dict = dict(cabecera)
        cabecera_dict['proveedor'] = cabecera_dict.get('proveedor') or 'Sin proveedor'
        cabecera_dict['proveedor_ruc'] = cabecera_dict.get('proveedor_ruc') or '--'
        cabecera_dict['proveedor_direccion'] = cabecera_dict.get('proveedor_direccion') or '--'
        cabecera_dict['proveedor_contacto'] = cabecera_dict.get('proveedor_contacto') or cabecera_dict.get('contacto_proveedor') or '--'
        cabecera_dict['telefono_contacto'] = cabecera_dict.get('telefono_contacto') or cabecera_dict.get('telefono_proveedor') or '--'
        cabecera_dict['email_contacto_proveedor'] = cabecera_dict.get('email_contacto_proveedor') or cabecera_dict.get('email_proveedor') or '--'
        cabecera_dict['codigo_proveedor'] = cabecera_dict.get('codigo_proveedor') or '--'
        cabecera_dict['nombre_comercial'] = cabecera_dict.get('nombre_comercial') or '--'
        cabecera_dict['comprador'] = cabecera_dict.get('comprador') or '--'
        cabecera_dict['condicion_pago'] = cabecera_dict.get('condicion_pago') or '--'
        cabecera_dict['nota_compra'] = cabecera_dict.get('nota_compra') or '--'
        cabecera_dict['notas'] = cabecera_dict.get('notas') or '--'
        cabecera_dict['lugar_entrega'] = cabecera_dict.get('lugar_entrega') or '--'
        cabecera_dict['tiempo_entrega'] = cabecera_dict.get('tiempo_entrega') or '--'
        cabecera_dict['num_cotizacion'] = cabecera_dict.get('num_cotizacion') or '--'
        cabecera_dict['descripcion'] = obtener_descripcion_orden(orden_id)
        
        if cabecera_dict.get('fecha_creacion'):
            if hasattr(cabecera_dict['fecha_creacion'], 'strftime'):
                cabecera_dict['fecha_creacion'] = cabecera_dict['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
        
        detalles_list = []
        for detalle in detalles:
            detalle_dict = dict(detalle)
            detalle_dict['codigo'] = detalle_dict.get('codigo') or '--'
            detalle_dict['descripcion'] = detalle_dict.get('descripcion') or '--'
            detalle_dict['marca'] = detalle_dict.get('marca') or '--'
            detalle_dict['modelo'] = detalle_dict.get('modelo') or '--'
            detalle_dict['unidad_medida'] = detalle_dict.get('unidad_medida') or 'Unid'
            detalle_dict['cantidad'] = float(detalle_dict.get('cantidad') or 0)
            detalle_dict['precio_venta_unitario'] = float(detalle_dict.get('precio_venta_unitario') or 0)
            detalle_dict['subtotal_venta_con_descuento'] = float(detalle_dict.get('subtotal_venta_con_descuento') or 0)
            detalles_list.append(detalle_dict)
        
        return {
            "cabecera": cabecera_dict,
            "detalle": detalles_list
        }
        
    except Exception as e:
        print(f"🔥 Error en obtener_orden_completa: {str(e)}")
        traceback.print_exc()
        return None


def buscar_proveedor_por_ruc(ruc):
    """Buscar proveedor por RUC"""
    try:
        query = """
            SELECT id, razon_social, ruc as numero_documento, direccion, 
                   telefono as telefono_contacto, contacto as nombre_contacto, email as email_contacto
            FROM proveedores 
            WHERE ruc = %s
        """
        resultado = db_query(query, (ruc,))
        return resultado[0] if resultado else None
    except Exception as e:
        print(f"Error buscando proveedor por RUC: {e}")
        return None

# ==========================================
# 🔥 ENDPOINTS DE DIAGNÓSTICO 🔥
# ==========================================

@compras_bp.route("/api/diagnostico/blueprint", methods=["GET"])
def diagnostico_blueprint():
    """Verificar que el blueprint está funcionando"""
    return jsonify({
        "success": True,
        "message": "Blueprint de compras funcionando correctamente",
        "blueprint_name": "compras_bp",
        "routes_disponibles": [
            "/compras",
            "/crear_compra", 
            "/editar_compra/<id>",
            "/api/orden_compra/<id>",
            "/api/ordenes_compra",
            "/api/test_conexion"
        ]
    })

@compras_bp.route("/api/diagnostico/ordenes", methods=["GET"])
def diagnostico_listar_ordenes():
    """Diagnóstico: Listar todas las órdenes de compra"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT COUNT(*) as total FROM ordenes_compra")
        count = cursor.fetchone()
        
        cursor.execute("""
            SELECT id, numero_orden, codigo_orden, estado, fecha_creacion 
            FROM ordenes_compra 
            ORDER BY id DESC 
            LIMIT 10
        """)
        ordenes = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            "success": True,
            "total_ordenes": count['total'] if count else 0,
            "ordenes": ordenes,
            "mensaje": f"Se encontraron {count['total'] if count else 0} órdenes en total"
        })
        
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@compras_bp.route("/api/diagnostico/orden/<int:orden_id>", methods=["GET"])
def diagnostico_orden_especifica(orden_id):
    """Diagnóstico: Ver detalles de una orden específica"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT * FROM ordenes_compra WHERE id = %s", (orden_id,))
        orden = cursor.fetchone()
        
        if not orden:
            return jsonify({
                "success": False,
                "error": f"No existe la orden con ID {orden_id}",
                "sugerencia": "Verifica que el ID sea correcto o crea una orden primero"
            }), 404
        
        cursor.execute("""
            SELECT d.*, pr.codigo, pr.descripcion 
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
        """, (orden_id,))
        detalles = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            "success": True,
            "orden": orden,
            "detalles": detalles,
            "cantidad_detalles": len(detalles),
            "mensaje": f"Orden {orden_id} encontrada correctamente"
        })
        
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@compras_bp.route("/api/test_conexion", methods=["GET"])
def test_conexion():
    """Prueba de conexión a la base de datos"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Conexión a base de datos exitosa",
            "test_result": result[0] if result else None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Error de conexión a la base de datos"
        }), 500

# ==========================================
# API ENDPOINTS PRINCIPALES
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
                SELECT id, razon_social, ruc, direccion, 
                       telefono, contacto, email
                FROM proveedores 
                WHERE razon_social ILIKE %s OR ruc ILIKE %s
                LIMIT 20
            """
            proveedores = db_query(query, (f'%{q}%', f'%{q}%'))
        else:
            query = """
                SELECT id, razon_social, ruc, direccion, 
                       telefono, contacto, email
                FROM proveedores 
                LIMIT 20
            """
            proveedores = db_query(query)
        
        for proveedor in proveedores:
            proveedor['proveedor_ruc'] = proveedor['ruc']
            proveedor['numero_documento'] = proveedor['ruc']
            proveedor['telefono_contacto'] = proveedor['telefono']
            proveedor['nombre_contacto'] = proveedor['contacto']
            proveedor['email_contacto'] = proveedor['email']
            proveedor['direccion_fiscal'] = proveedor['direccion']
        
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
            SELECT id, razon_social, ruc as numero_documento, direccion, 
                   telefono as telefono_contacto, contacto as nombre_contacto, email as email_contacto
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
        print(f"📝 Datos recibidos para crear proveedor: {data}")
        
        ruc = data.get('numero_documento')
        razon_social = data.get('razon_social')
        razon_comercial = data.get('nombre_comercial', '') or razon_social
        direccion = data.get('direccion_fiscal', '')
        telefono = data.get('telefono_contacto', '')
        contacto = data.get('nombre_contacto', '')
        email = data.get('email_contacto', '')
        
        if not ruc:
            return jsonify({'success': False, 'error': 'RUC requerido'}), 400
        
        if not razon_social:
            return jsonify({'success': False, 'error': 'Razón social requerida'}), 400
        
        existente = db_query("SELECT id FROM proveedores WHERE ruc = %s", (ruc,))
        
        if existente:
            return jsonify({
                'success': False, 
                'error': f'Ya existe un proveedor con el RUC {ruc}'
            }), 400
        
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO proveedores 
                (ruc, razon_social, razon_comercial, direccion, 
                 telefono, contacto, email, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id
            """, (
                ruc,
                razon_social,
                razon_comercial,
                direccion,
                telefono,
                contacto,
                email
            ))
            
            proveedor_id = cur.fetchone()[0]
        
        print(f"✅ Proveedor creado con ID: {proveedor_id}")
        
        return jsonify({
            'success': True,
            'data': {
                'id': proveedor_id, 
                'razon_social': razon_social,
                'numero_documento': ruc
            }
        })
        
    except Exception as e:
        print(f"❌ Error en /api/proveedores/crear: {str(e)}")
        traceback.print_exc()
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


# ==========================================
# 🔥 ENDPOINT GUARDAR - VERSIÓN CORREGIDA Y COMPLETA
# ==========================================

@compras_bp.route("/api/orden_compra/guardar", methods=["POST"])
def guardar_orden_compra():
    """Guardar orden de compra - VERSIÓN CORREGIDA Y COMPLETA"""
    data = request.json
    print("📦 Datos recibidos en guardar_orden_compra:", data)
    
    try:
        # 🔥 OBTENER PROVEEDOR_ID DE MÚLTIPLES FUENTES
        proveedor_id = data.get("proveedor_id")
        
        # Si no hay proveedor_id o es 0, intentar obtenerlo de proveedor_data
        if not proveedor_id or proveedor_id == 0:
            proveedor_data = data.get("proveedor_data", {})
            numero_documento = proveedor_data.get("numero_documento")
            razon_social = proveedor_data.get("razon_social")
            
            if numero_documento and razon_social:
                # Buscar proveedor por RUC en la base de datos
                proveedor = buscar_proveedor_por_ruc(numero_documento)
                if proveedor:
                    proveedor_id = proveedor.get("id")
                    print(f"✅ Proveedor encontrado por RUC: {proveedor_id}")
                else:
                    # Crear nuevo proveedor automáticamente
                    try:
                        with db_tx() as conn:
                            cur = conn.cursor()
                            cur.execute("""
                                INSERT INTO proveedores 
                                (ruc, razon_social, razon_comercial, direccion, 
                                 telefono, contacto, email, activo)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                                RETURNING id
                            """, (
                                numero_documento,
                                razon_social,
                                razon_social,  # razon_comercial
                                proveedor_data.get("direccion_fiscal", ""),
                                proveedor_data.get("telefono_contacto", ""),
                                proveedor_data.get("nombre_contacto", ""),
                                proveedor_data.get("email_contacto", "")
                            ))
                            proveedor_id = cur.fetchone()[0]
                            print(f"✅ Nuevo proveedor creado automáticamente: {proveedor_id}")
                    except Exception as e:
                        print(f"❌ Error creando proveedor: {e}")
                        return jsonify({
                            "success": False, 
                            "error": f"Error al crear proveedor: {str(e)}"
                        }), 400
        
        # 🔥 VALIDAR QUE TENGAMOS PROVEEDOR_ID
        if not proveedor_id or proveedor_id == 0:
            return jsonify({
                "success": False, 
                "error": "No se pudo identificar o crear el proveedor. Verifique que el RUC sea válido."
            }), 400
        
        # Obtener usuario_id
        usuario_id = data.get("usuario_id")
        if not usuario_id:
            usuario_id = session.get('usuario_id')
            if not usuario_id:
                return jsonify({"success": False, "error": "usuario_id es requerido"}), 400
        
        productos = data.get("productos", [])
        if not productos:
            return jsonify({"success": False, "error": "Debe agregar al menos un producto"}), 400
        
        # 🔥 VALIDAR QUE TODOS LOS PRODUCTOS TENGAN PRODUCTO_ID
        for i, p in enumerate(productos):
            if not p.get("producto_id"):
                return jsonify({
                    "success": False, 
                    "error": f"El producto en la fila {i+1} no tiene ID válido"
                }), 400
        
        # Calcular totales
        subtotal = float(data.get("subtotal", 0))
        igv = float(data.get("igv", 0))
        total = float(data.get("total", 0))
        
        if total == 0 and productos:
            total_sin_descuento = 0
            for p in productos:
                cantidad = float(p.get("cantidad", 1))
                precio = float(p.get("precio_venta_unitario", p.get("precio_unitario", 0)))
                total_sin_descuento += cantidad * precio
            
            descuento = float(data.get("descuento_monto", 0))
            total_con_descuento = total_sin_descuento - descuento
            igv = total_con_descuento * 0.18
            subtotal = total_con_descuento - igv
            total = total_con_descuento
        
        orden_id = data.get("id")
        
        with db_tx() as conn:
            cur = conn.cursor()
            
            if orden_id:
                # 🔥 ACTUALIZAR orden existente
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
                        email_proveedor = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, codigo_orden, numero_orden
                """, (
                    proveedor_id,
                    data.get("estado", "pendiente"),
                    subtotal,
                    igv,
                    total,
                    data.get("condicion_pago", ""),
                    data.get("tiempo_entrega", ""),
                    data.get("fecha_requerida", ""),
                    data.get("lugar_entrega", ""),
                    data.get("num_cotizacion", ""),
                    data.get("nota_compra", ""),
                    usuario_id,
                    data.get("notas", ""),
                    float(data.get("descuento_porcentaje", 0)),
                    float(data.get("descuento_monto", 0)),
                    data.get("descuento_tipo", "porcentaje"),
                    data.get("proveedor_contacto", ""),
                    data.get("telefono_contacto", ""),
                    data.get("email_contacto_proveedor", ""),
                    orden_id
                ))
                
                result = cur.fetchone()
                
                # 🔥 ELIMINAR DETALLES ANTIGUOS
                cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
                
                # 🔥 INSERTAR NUEVOS DETALLES
                for idx, p in enumerate(productos):
                    cantidad = float(p.get("cantidad", 1))
                    precio_unitario = float(p.get("precio_venta_unitario", p.get("precio_unitario", 0)))
                    subtotal_producto = cantidad * precio_unitario
                    
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id, producto_id, cantidad, costo_unitario,
                            subtotal_costo, margen_porcentaje, precio_venta_unitario,
                            subtotal_venta, descuento_porcentaje,
                            precio_venta_con_descuento, subtotal_venta_con_descuento,
                            descuento_total, margen_final
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        orden_id,
                        p.get("producto_id"),
                        cantidad,
                        p.get("costo_unitario", 0),
                        p.get("subtotal_costo", 0),
                        20,
                        precio_unitario,
                        subtotal_producto,
                        0,
                        precio_unitario,
                        subtotal_producto,
                        0,
                        20
                    ))
                
                return jsonify({
                    "success": True,
                    "data": {
                        "id": orden_id,
                        "codigo_orden": result[1] if result else None,
                        "numero_orden": result[2] if result else None,
                        "proveedor_id": proveedor_id,
                        "actualizado": True
                    }
                })
            
            else:
                # 🔥 CREAR NUEVA ORDEN
                cur.execute("SELECT MAX(id) as ultimo FROM ordenes_compra")
                row = cur.fetchone()
                nuevo_numero = (row[0] or 0) + 1
                numero_orden = f"OC-{nuevo_numero:05d}"
                
                codigo_orden = data.get("codigo_orden")
                if not codigo_orden:
                    if data.get("es_borrador", True):
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        codigo_orden = f"TMP-COMPRA-{timestamp}"
                        correlativo = 0
                    else:
                        fecha = datetime.now()
                        codigo_orden = f"OC-{fecha.year}{str(fecha.month).zfill(2)}{str(fecha.day).zfill(2)}-{str(nuevo_numero).zfill(4)}"
                        correlativo = nuevo_numero
                
                # 🔥 INSERTAR EN ORDENES_COMPRA
                cur.execute("""
                    INSERT INTO ordenes_compra (
                        numero_orden, codigo_orden, correlativo, proveedor_id, usuario_id,
                        estado, subtotal, igv, total, condicion_pago, tiempo_entrega,
                        fecha_requerida, lugar_entrega, num_cotizacion, nota_compra,
                        notas, descuento_porcentaje, descuento_monto, descuento_tipo,
                        contacto_proveedor, telefono_proveedor, email_proveedor,
                        fecha_creacion
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, (NOW() AT TIME ZONE 'America/Lima')
                    )
                    RETURNING id, codigo_orden, numero_orden
                """, (
                    numero_orden,
                    codigo_orden,
                    data.get("correlativo", nuevo_numero),
                    proveedor_id,
                    usuario_id,
                    data.get("estado", "pendiente"),
                    subtotal,
                    igv,
                    total,
                    data.get("condicion_pago", ""),
                    data.get("tiempo_entrega", ""),
                    data.get("fecha_requerida", ""),
                    data.get("lugar_entrega", ""),
                    data.get("num_cotizacion", ""),
                    data.get("nota_compra", ""),
                    data.get("notas", ""),
                    float(data.get("descuento_porcentaje", 0)),
                    float(data.get("descuento_monto", 0)),
                    data.get("descuento_tipo", "porcentaje"),
                    data.get("proveedor_contacto", ""),
                    data.get("telefono_contacto", ""),
                    data.get("email_contacto_proveedor", "")
                ))
                
                result = cur.fetchone()
                nueva_orden_id = result[0]
                codigo_generado = result[1]
                
                # 🔥 INSERTAR EN ORDEN_COMPRA_DETALLE
                for idx, p in enumerate(productos):
                    cantidad = float(p.get("cantidad", 1))
                    precio_unitario = float(p.get("precio_venta_unitario", p.get("precio_unitario", 0)))
                    subtotal_producto = cantidad * precio_unitario
                    
                    cur.execute("""
                        INSERT INTO orden_compra_detalle (
                            orden_id, producto_id, cantidad, costo_unitario,
                            subtotal_costo, margen_porcentaje, precio_venta_unitario,
                            subtotal_venta, descuento_porcentaje,
                            precio_venta_con_descuento, subtotal_venta_con_descuento,
                            descuento_total, margen_final
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        nueva_orden_id,
                        p.get("producto_id"),
                        cantidad,
                        p.get("costo_unitario", 0),
                        p.get("subtotal_costo", 0),
                        20,
                        precio_unitario,
                        subtotal_producto,
                        0,
                        precio_unitario,
                        subtotal_producto,
                        0,
                        20
                    ))
                
                return jsonify({
                    "success": True,
                    "data": {
                        "id": nueva_orden_id,
                        "codigo_orden": codigo_generado,
                        "numero_orden": numero_orden,
                        "proveedor_id": proveedor_id,
                        "nuevo": True
                    }
                })
    
    except Exception as e:
        print("🔥 ERROR en guardar_orden_compra:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# API ENDPOINTS CORREGIDOS - LISTADO
# ==========================================
@compras_bp.route("/api/orden_compra/<int:orden_id>", methods=["GET"])
def api_get_orden_compra(orden_id):
    """Obtener orden de compra por ID - CORREGIDO"""
    try:
        print(f"🔍 Buscando orden con ID: {orden_id}")
        
        data = obtener_orden_completa(orden_id)
        
        if not data:
            print(f"❌ Orden {orden_id} no encontrada")
            return jsonify({"success": False, "error": f"No encontrada la orden con ID {orden_id}"}), 404
        
        cabecera = data.get("cabecera", {})
        detalle = data.get("detalle", [])
        
        print(f"✅ Orden {orden_id} encontrada")
        
        # 🔥 CORREGIDO: Incluir todos los campos necesarios incluyendo numero_documento
        return jsonify({
            "success": True, 
            "data": {
                "id": cabecera.get("id"),
                "numero_orden": cabecera.get("numero_orden"),
                "codigo_orden": cabecera.get("codigo_orden"),
                "correlativo": cabecera.get("correlativo"),
                "fecha_creacion": cabecera.get("fecha_creacion"),
                "estado": cabecera.get("estado"),
                "subtotal": cabecera.get("subtotal"),
                "igv": cabecera.get("igv"),
                "total": cabecera.get("total"),
                "proveedor_id": cabecera.get("proveedor_id"),
                "proveedor": cabecera.get("proveedor"),
                "proveedor_ruc": cabecera.get("proveedor_ruc"),
                "proveedor_direccion": cabecera.get("proveedor_direccion"),
                "proveedor_contacto": cabecera.get("proveedor_contacto"),
                "telefono_contacto": cabecera.get("telefono_contacto"),
                "email_contacto_proveedor": cabecera.get("email_contacto_proveedor"),
                "codigo_proveedor": cabecera.get("codigo_proveedor"),
                "nombre_comercial": cabecera.get("nombre_comercial"),
                "razon_comercial": cabecera.get("razon_comercial"),
                "razon_social": cabecera.get("razon_social"),
                "comprador": cabecera.get("comprador"),
                "comprador_email": cabecera.get("comprador_email"),
                "comprador_telefono": cabecera.get("comprador_telefono"),
                "condicion_pago": cabecera.get("condicion_pago"),
                "tiempo_entrega": cabecera.get("tiempo_entrega"),
                "fecha_requerida": cabecera.get("fecha_requerida"),
                "lugar_entrega": cabecera.get("lugar_entrega"),
                "num_cotizacion": cabecera.get("num_cotizacion"),
                "nota_compra": cabecera.get("nota_compra"),
                "notas": cabecera.get("notas"),
                "descripcion": cabecera.get("descripcion"),
                "contacto_proveedor": cabecera.get("contacto_proveedor"),
                "telefono_proveedor": cabecera.get("telefono_proveedor"),
                "email_proveedor": cabecera.get("email_proveedor"),
                # 🔥 IMPORTANTE: Añadir estos campos para el frontend
                "numero_documento": cabecera.get("proveedor_ruc") or cabecera.get("ruc") or '',
                "direccion_fiscal": cabecera.get("proveedor_direccion") or cabecera.get("direccion") or '',
                "telefono_contacto_proveedor": cabecera.get("telefono_contacto") or cabecera.get("telefono") or '',
                "email_contacto_proveedor": cabecera.get("email_contacto_proveedor") or cabecera.get("email") or '',
                "nombre_contacto": cabecera.get("proveedor_contacto") or cabecera.get("contacto") or '',
                "detalle": detalle
            }
        })
    except Exception as e:
        print(f"🔥 Error en api_get_orden_compra: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/ordenes_compra", methods=["GET"])
def listar_ordenes():
    """Listar órdenes de compra - VERSIÓN CORREGIDA CON TODOS LOS CAMPOS"""
    try:
        buscar = request.args.get('buscar', '')
        estado = request.args.get('estado', '')
        
        print(f"📡 API: Listar órdenes - buscar='{buscar}', estado='{estado}'")
        
        # Obtener todas las órdenes usando la función corregida
        ordenes = obtener_ordenes_recientes(limit=300)
        
        # Aplicar filtros si existen
        if buscar:
            buscar_lower = buscar.lower()
            ordenes = [o for o in ordenes if 
                       buscar_lower in (o.get('numero_orden') or '').lower() or
                       buscar_lower in (o.get('codigo_orden') or '').lower() or
                       buscar_lower in (o.get('proveedor') or '').lower() or
                       buscar_lower in (o.get('proveedor_ruc') or '').lower()]
        
        if estado and estado != 'todas':
            ordenes = [o for o in ordenes if o.get('estado') == estado]
        
        print(f"✅ API: {len(ordenes)} órdenes encontradas")
        
        return jsonify({
            "success": True,
            "data": ordenes,
            "total": len(ordenes)
        })
        
    except Exception as e:
        print(f"🔥 ERROR LISTAR: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/ordenes_compra/<int:id>", methods=["DELETE"])
def eliminar_orden_compra(id):
    """Eliminar orden de compra"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (id,))
            cur.execute("DELETE FROM ordenes_compra WHERE id = %s", (id,))
        print(f"🗑️ Orden {id} eliminada")
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
        
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ruta_logo = os.path.join(BASE_DIR, "templates", "pdf", "logo-kcf.png")

        try:
            with open(ruta_logo, "rb") as img:
                logo_base64 = base64.b64encode(img.read()).decode('utf-8')
        except Exception:
            logo_base64 = ""

        productos = []
        total_subtotal = 0

        for i, p in enumerate(detalle, start=1):
            cantidad = p.get("cantidad", 0)
            precio = p.get("precio_venta_unitario", 0)
            subtotal = cantidad * precio

            productos.append({
                "item": i,
                "codigo": p.get("codigo", ""),
                "descripcion": p.get("descripcion", ""),
                "marca": p.get("marca", ""),
                "modelo": p.get("modelo", ""),
                "cantidad": cantidad,
                "unidad": p.get("unidad_medida", "Unid"),
                "precio_unitario": precio,
                "subtotal": subtotal
            })
            total_subtotal += subtotal

        descuento = cabecera.get("descuento_monto", 0)
        subtotal_con_descuento = total_subtotal - descuento
        igv = subtotal_con_descuento * 0.18
        total_venta = subtotal_con_descuento + igv

        fecha_creacion = cabecera.get("fecha_creacion", datetime.now())
        if isinstance(fecha_creacion, str):
            fecha_actual = fecha_creacion.split()[0] if ' ' in fecha_creacion else fecha_creacion
            hora_actual = fecha_creacion.split()[1][:5] if ' ' in fecha_creacion and len(fecha_creacion.split()) > 1 else datetime.now().strftime("%H:%M")
        else:
            fecha_actual = fecha_creacion.strftime("%d/%m/%Y") if fecha_creacion else datetime.now().strftime("%d/%m/%Y")
            hora_actual = fecha_creacion.strftime("%H:%M") if fecha_creacion else datetime.now().strftime("%H:%M")

        html = render_template(
            "pdf/orden_compra_kcf.html",
            logo_base64=logo_base64,
            codigo_orden=cabecera.get("codigo_orden") or cabecera.get("numero_orden") or "N/A",
            fecha_actual=fecha_actual,
            hora_actual=hora_actual,
            proveedor_razon_social=cabecera.get("proveedor") or cabecera.get("razon_social") or "",
            proveedor_ruc=cabecera.get("proveedor_ruc") or cabecera.get("numero_documento") or "",
            proveedor_direccion=cabecera.get("direccion") or "",
            telefono_contacto=cabecera.get("telefono") or "",
            proveedor_contacto=cabecera.get("contacto") or "",
            email_contacto_proveedor=cabecera.get("email") or "",
            comprador_responsable=cabecera.get("nombre_completo") or "No asignado",
            email_contacto_user=cabecera.get("user_email") or "",
            telefono_contacto_user=cabecera.get("user_telefono") or "",
            condicion_pago=cabecera.get("condicion_pago") or "Contado",
            tiempo_entrega=cabecera.get("tiempo_entrega") or "No especificado",
            fecha_requerida=cabecera.get("fecha_requerida") or "No especificada",
            lugar_entrega=cabecera.get("lugar_entrega") or "No especificado",
            num_cotizacion=cabecera.get("num_cotizacion") or "",
            productos=productos,
            total_subtotal=total_subtotal,
            descuento=descuento,
            subtotal_con_descuento=subtotal_con_descuento,
            igv=igv,
            total_venta=total_venta,
            nota_compra=cabecera.get("nota_compra") or "",
            notas=cabecera.get("notas") or ""
        )

        try:
            pdf = HTML(string=html).write_pdf()
        except Exception as e:
            print("🔥 ERROR EN WEASYPRINT:", e)
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Error al generar PDF: {str(e)}"}), 500

        return Response(
            pdf,
            content_type='application/pdf',
            headers={"Content-Disposition": f"inline; filename=orden_compra_{orden_id}.pdf"}
        )
    except Exception as e:
        print("🔥 ERROR PDF:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@compras_bp.route("/api/sunat/consulta_proveedor", methods=["GET"])
def consultar_sunat_proveedor():
    """Consulta a SUNAT para proveedores"""
    import requests
    
    ruc = request.args.get('ruc', '')
    
    print(f"🔍 Consultando SUNAT para RUC: {ruc}")
    
    if not ruc or len(ruc) != 11:
        return jsonify({'success': False, 'error': 'RUC inválido, debe tener 11 dígitos'}), 400
    
    try:
        url = f'https://api.apis.net.pe/v1/ruc?numero={ruc}'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, timeout=15, headers=headers)
        
        print(f"📡 Status code SUNAT: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Datos SUNAT recibidos: {data}")
            
            if data and data.get('nombre'):
                return jsonify({
                    'success': True,
                    'razon_social': data.get('nombre', ''),
                    'nombre_comercial': data.get('nombre', ''),
                    'direccion': data.get('direccion', ''),
                    'estado': data.get('estado', ''),
                    'condicion': data.get('condicion', '')
                })
            else:
                return jsonify({'success': False, 'error': 'No se encontraron datos para este RUC'})
                
        elif response.status_code == 404:
            return jsonify({'success': False, 'error': 'RUC no encontrado en SUNAT'})
        else:
            return jsonify({'success': False, 'error': f'Error en la consulta: Código {response.status_code}'})
            
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'Tiempo de espera agotado. Intente nuevamente.'})
    except requests.exceptions.ConnectionError:
        return jsonify({'success': False, 'error': 'Error de conexión. Verifique su internet.'})
    except Exception as e:
        print(f"❌ Error en consulta SUNAT: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500