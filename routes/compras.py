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
        
        # Obtener órdenes recientes
        ordenes = obtener_ordenes_recientes(limit=300)
        
        # SIMPLEMENTE USAR RENDER_TEMPLATE
        return render_template("crear_compra.html",
                              ordenes=ordenes,
                              orden_compra_id=None,
                              modo='nuevo')
                              
    except Exception as e:
        error_detalle = traceback.format_exc()
        print(f"🔥 Error en crear_compra: {error_detalle}")
        
        # Mostrar información de depuración
        debug_info = f"""
        <html>
        <head><title>Error - Debug</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Error al cargar crear_compra</h1>
            <p><strong>Error:</strong> {str(e)}</p>
            <h2>Información de depuración:</h2>
            <p><strong>Directorio actual:</strong> {os.getcwd()}</p>
            <p><strong>¿Existe templates/crear_compra.html?</strong> {os.path.exists('templates/crear_compra.html')}</p>
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
    return render_template("crear_compra.html", ordenes=[], orden_compra_id=None, modo='nuevo')

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
# API ENDPOINTS - Mantén todo tu código original aquí
# ==========================================

@compras_bp.route("/api/usuarios/actual", methods=["GET"])
def obtener_usuario_actual():
    # ... tu código original ...
    pass

# ... todos los demás @compras_bp.route("/api/...") ...


# ==========================================
# GENERAR PDF - ORDEN DE COMPRA
# ==========================================

@compras_bp.route("/api/orden_compra/pdf/<int:orden_id>")
def generar_pdf_orden_compra(orden_id):
    # ... tu código original ...
    pass