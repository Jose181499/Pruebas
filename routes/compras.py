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
    """Nueva orden de compra - sin ID - Versión que lee el archivo directamente"""
    try:
        print(f"🆕 NUEVA ORDEN DE COMPRA - Sin ID")
        
        # Buscar el archivo crear_compra.html
        posibles_rutas = [
            '/opt/render/project/src/templates/crear_compra.html',  # Ruta absoluta en Render
            os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates', 'crear_compra.html'),
            os.path.join(os.getcwd(), 'templates', 'crear_compra.html'),
            'templates/crear_compra.html',
            'crear_compra.html'
        ]
        
        template_content = None
        template_path = None
        
        for ruta in posibles_rutas:
            if os.path.exists(ruta):
                template_path = ruta
                with open(ruta, 'r', encoding='utf-8') as f:
                    template_content = f.read()
                print(f"✅ Template encontrado en: {ruta}")
                break
        
        if not template_content:
            # Si no encuentra el template, crear uno básico
            template_content = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crear Orden de Compra</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="alert alert-warning">
            <h4>⚠️ Template no encontrado</h4>
            <p>No se encontró el archivo crear_compra.html en las siguientes ubicaciones:</p>
            <ul>
                {% for ruta in rutas_buscadas %}
                <li>{{ ruta }}</li>
                {% endfor %}
            </ul>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>Crear Orden de Compra (Versión de Emergencia)</h3>
            </div>
            <div class="card-body">
                <p>Modo: {{ modo }}</p>
                <p>Órdenes encontradas: {{ ordenes|length }}</p>
                <a href="/compras" class="btn btn-secondary">Volver</a>
            </div>
        </div>
    </div>
</body>
</html>"""
            print("⚠️ Usando template de emergencia")
        
        # Obtener datos
        ordenes = obtener_ordenes_recientes(limit=300)
        
        # Reemplazar variables manualmente
        html = template_content
        html = html.replace('{{ modo }}', 'nuevo')
        html = html.replace('{{ ordenes|length }}', str(len(ordenes)))
        
        # Crear tabla de órdenes simple
        ordenes_html = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Código</th><th>Proveedor</th><th>Estado</th></tr></thead><tbody>'
        for o in ordenes[:10]:
            ordenes_html += f'<tr><td>{o.get("codigo_orden", "N/A")}</td><td>{o.get("proveedor", "Sin proveedor")}</td><td>{o.get("estado", "-")}</td></tr>'
        ordenes_html += '</tbody></table></div>'
        
        html = html.replace('{{ ordenes }}', ordenes_html)
        
        # Manejar bloques if (simplificado)
        import re
        html = re.sub(r'{% if .*? %}', '', html)
        html = re.sub(r'{% endif %}', '', html)
        
        return html
        
    except Exception as e:
        import traceback
        error_detalle = traceback.format_exc()
        print(f"🔥 Error en crear_compra: {error_detalle}")
        return f"""
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Error al cargar crear_compra</h1>
            <p><strong>Error:</strong> {str(e)}</p>
            <h2>Información de depuración:</h2>
            <p>Directorio actual: {os.getcwd()}</p>
            <p>Archivos en directorio actual: {os.listdir('.') if os.path.exists('.') else 'No se puede listar'}</p>
            <details>
                <summary>Ver traceback completo</summary>
                <pre style="background: #f4f4f4; padding: 10px; overflow: auto;">{error_detalle}</pre>
            </details>
            <br>
            <a href="/compras">← Volver a Compras</a>
        </body>
        </html>
        """, 500

@compras_bp.route("/compra/nueva")
def nueva_compra():
    return crear_compra()  # Reutilizar la misma función

@compras_bp.route("/editar_compra/<int:orden_id>")
def editar_compra(orden_id):
    """Editar orden de compra existente - con ID"""
    print(f"✏️ EDITAR ORDEN DE COMPRA - ID: {orden_id}")
    return crear_compra()  # Reutilizar la misma función por ahora

# ==========================================
# FUNCIONES AUXILIARES (el resto igual)
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

# El resto de tus funciones (API endpoints) se mantienen igual...
# (desde @compras_bp.route("/api/usuarios/actual") hasta el final)