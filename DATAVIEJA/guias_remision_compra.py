# routes/guias_remision_compra.py
from flask import Blueprint, render_template, request, jsonify, session, send_file
from functools import wraps
import sys
import os
import json
from datetime import datetime, date
from io import BytesIO

sys.dont_write_bytecode = True

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db_insert, db_query, db_update

guias_compra_bp = Blueprint('guias_compra', __name__, url_prefix='/compras/guias')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return jsonify({'success': False, 'error': 'No autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ==========================================
# RUTAS DE VISTAS (HTML)
# ==========================================

@guias_compra_bp.route('/')
def index():
    """Lista de guías de remisión de compra"""
    try:
        query = """
            SELECT id, serie, numero, proveedor_nombre, proveedor_ruc,
                   fecha_emision, fecha_traslado, placa_vehiculo,
                   peso_total, estado, created_at
            FROM guias_remision_compra
            ORDER BY created_at DESC
        """
        guias = db_query(query)
        return render_template('compras/guias/lista.html', guias=guias or [])
    except Exception as e:
        print(f"Error: {e}")
        return render_template('compras/guias/lista.html', guias=[])


@guias_compra_bp.route('/crear')
def crear():
    """Formulario para crear nueva guía de remisión de compra"""
    return render_template('compras/guias/crear.html')


@guias_compra_bp.route('/editar/<int:guia_id>')
def editar(guia_id):
    """Formulario para editar una guía de remisión de compra"""
    try:
        query = "SELECT * FROM guias_remision_compra WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return "Guía no encontrada", 404
        
        guia_dict = dict(guia[0])
        
        if guia_dict.get('created_at'):
            if isinstance(guia_dict['created_at'], (datetime, date)):
                guia_dict['created_at'] = guia_dict['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        if guia_dict.get('fecha_emision'):
            if isinstance(guia_dict['fecha_emision'], (datetime, date)):
                guia_dict['fecha_emision'] = guia_dict['fecha_emision'].strftime('%Y-%m-%d')
        
        if guia_dict.get('fecha_traslado'):
            if isinstance(guia_dict['fecha_traslado'], (datetime, date)):
                guia_dict['fecha_traslado'] = guia_dict['fecha_traslado'].strftime('%Y-%m-%d')
        
        if guia_dict.get('items_json') and isinstance(guia_dict['items_json'], (dict, list)):
            guia_dict['items_json'] = json.dumps(guia_dict['items_json'])
        
        return render_template('compras/guias/editar.html', guia=guia_dict)
    except Exception as e:
        return f"Error: {e}", 500


# ==========================================
# API ENDPOINTS
# ==========================================

@guias_compra_bp.route('/api/guardar', methods=['POST'])
@login_required
def guardar_guia():
    """Guardar guía de remisión de compra como borrador"""
    try:
        data = request.get_json()
        
        if not data.get('proveedor', {}).get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC del proveedor es obligatorio'})
        
        if not data.get('vehiculo', {}).get('placa'):
            return jsonify({'success': False, 'error': 'La placa del vehículo es obligatoria'})
        
        if not data.get('items') or len(data.get('items')) == 0:
            return jsonify({'success': False, 'error': 'Debe agregar al menos un producto'})
        
        serie = data.get('serie', 'G001')
        
        query_max = """
            SELECT COALESCE(MAX(numero), 0) + 1 as next_num
            FROM guias_remision_compra 
            WHERE serie = %s
        """
        result = db_query(query_max, (serie,))
        numero = result[0]['next_num'] if result else 1
        
        peso_total = sum(
            float(item.get('peso_unitario', 0)) * float(item.get('cantidad', 1)) 
            for item in data['items']
        )
        
        items_json = json.dumps(data['items'], default=str)
        
        insert_query = """
            INSERT INTO guias_remision_compra (
                serie, numero, fecha_emision, fecha_traslado,
                proveedor_ruc, proveedor_nombre, proveedor_direccion, proveedor_ubigeo,
                ruc_remitente, remitente_nombre, remitente_direccion, remitente_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni, conductor_nombre, licencia_conductor,
                transportista_ruc, transportista_nombre,
                motivo_traslado, factura_asociada, peso_total,
                items_json, observaciones, estado, creado_por
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        
        params = (
            serie, numero,
            data.get('fecha_emision'), data.get('fecha_traslado'),
            data.get('proveedor', {}).get('ruc', ''),
            data.get('proveedor', {}).get('nombre', ''),
            data.get('proveedor', {}).get('direccion', ''),
            data.get('proveedor', {}).get('ubigeo', ''),
            data.get('remitente', {}).get('ruc', ''),
            data.get('remitente', {}).get('nombre', ''),
            data.get('remitente', {}).get('direccion', ''),
            data.get('remitente', {}).get('ubigeo', ''),
            data.get('modalidad_transporte', 'PRIVADO'),
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            data.get('transportista', {}).get('ruc', '') if data.get('transportista') else '',
            data.get('transportista', {}).get('nombre', '') if data.get('transportista') else '',
            data.get('motivo_traslado', 'COMPRA'),
            data.get('factura_asociada', ''),
            peso_total,
            items_json,
            data.get('observaciones', ''),
            'BORRADOR',
            session.get('usuario_id')
        )
        
        result = db_insert(insert_query, params)
        
        if result:
            return jsonify({
                'success': True,
                'guia_id': result,
                'numero_guia': f"{serie}-{numero}",
                'message': 'Borrador guardado exitosamente'
            })
        else:
            return jsonify({'success': False, 'error': 'Error al guardar'})
            
    except Exception as e:
        print(f"Error guardando borrador: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


@guias_compra_bp.route('/api/listar', methods=['GET'])
@login_required
def listar_guias():
    """Listar todas las guías de remisión de compra"""
    try:
        query = """
            SELECT id, serie, numero, proveedor_nombre, proveedor_ruc,
                   fecha_emision, fecha_traslado, placa_vehiculo,
                   peso_total, estado, created_at
            FROM guias_remision_compra
            ORDER BY created_at DESC
        """
        guias = db_query(query)
        
        return jsonify({
            'success': True,
            'data': guias or []
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@guias_compra_bp.route('/api/obtener/<int:guia_id>', methods=['GET'])
@login_required
def obtener_guia(guia_id):
    """Obtener una guía por ID"""
    try:
        query = "SELECT * FROM guias_remision_compra WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return jsonify({'success': False, 'error': 'Guía no encontrada'})
        
        return jsonify({
            'success': True,
            'data': guia[0]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@guias_compra_bp.route('/api/actualizar/<int:guia_id>', methods=['PUT'])
@login_required
def actualizar_guia(guia_id):
    """Actualizar una guía de remisión de compra existente"""
    try:
        data = request.get_json()
        
        check_query = "SELECT estado FROM guias_remision_compra WHERE id = %s"
        check_result = db_query(check_query, (guia_id,))
        
        if not check_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'})
        
        if check_result[0]['estado'] != 'BORRADOR':
            return jsonify({'success': False, 'error': 'Solo se pueden editar guías en estado BORRADOR'})
        
        if not data.get('proveedor', {}).get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC del proveedor es obligatorio'})
        
        if not data.get('items') or len(data.get('items')) == 0:
            return jsonify({'success': False, 'error': 'Debe agregar al menos un producto'})
        
        peso_total = sum(
            float(item.get('peso_unitario', 0)) * float(item.get('cantidad', 1)) 
            for item in data['items']
        )
        
        items_json = json.dumps(data['items'], default=str)
        
        update_query = """
            UPDATE guias_remision_compra SET
                fecha_emision = %s,
                fecha_traslado = %s,
                proveedor_ruc = %s,
                proveedor_nombre = %s,
                proveedor_direccion = %s,
                proveedor_ubigeo = %s,
                ruc_remitente = %s,
                remitente_nombre = %s,
                remitente_direccion = %s,
                remitente_ubigeo = %s,
                modalidad_transporte = %s,
                placa_vehiculo = %s,
                conductor_dni = %s,
                conductor_nombre = %s,
                licencia_conductor = %s,
                transportista_ruc = %s,
                transportista_nombre = %s,
                motivo_traslado = %s,
                factura_asociada = %s,
                peso_total = %s,
                items_json = %s,
                observaciones = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
        """
        
        params = (
            data.get('fecha_emision'),
            data.get('fecha_traslado'),
            data.get('proveedor', {}).get('ruc', ''),
            data.get('proveedor', {}).get('nombre', ''),
            data.get('proveedor', {}).get('direccion', ''),
            data.get('proveedor', {}).get('ubigeo', ''),
            data.get('remitente', {}).get('ruc', ''),
            data.get('remitente', {}).get('nombre', ''),
            data.get('remitente', {}).get('direccion', ''),
            data.get('remitente', {}).get('ubigeo', ''),
            data.get('modalidad_transporte', 'PRIVADO'),
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            data.get('transportista', {}).get('ruc', '') if data.get('transportista') else '',
            data.get('transportista', {}).get('nombre', '') if data.get('transportista') else '',
            data.get('motivo_traslado', 'COMPRA'),
            data.get('factura_asociada', ''),
            peso_total,
            items_json,
            data.get('observaciones', ''),
            guia_id
        )
        
        result = db_update(update_query, params)
        
        if result:
            return jsonify({
                'success': True,
                'guia_id': guia_id,
                'message': 'Guía actualizada exitosamente'
            })
        else:
            return jsonify({'success': False, 'error': 'Error al actualizar'})
            
    except Exception as e:
        print(f"Error actualizando guía: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})


@guias_compra_bp.route('/api/eliminar/<int:guia_id>', methods=['DELETE'])
@login_required
def eliminar_guia(guia_id):
    """Eliminar una guía de remisión de compra"""
    try:
        check_query = "SELECT estado FROM guias_remision_compra WHERE id = %s"
        check_result = db_query(check_query, (guia_id,))
        
        if not check_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        if check_result[0]['estado'] != 'BORRADOR':
            return jsonify({'success': False, 'error': 'Solo se pueden eliminar guías en estado BORRADOR'}), 400
        
        delete_query = "DELETE FROM guias_remision_compra WHERE id = %s"
        db_update(delete_query, (guia_id,))
        
        return jsonify({
            'success': True,
            'message': 'Guía eliminada exitosamente'
        })
        
    except Exception as e:
        print(f"Error eliminando guía: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@guias_compra_bp.route('/api/pdf/<int:guia_id>', methods=['GET'])
@login_required
def descargar_pdf(guia_id):
    """Generar y descargar PDF de la guía de remisión de compra"""
    try:
        query = "SELECT * FROM guias_remision_compra WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        guia_data = guia[0]
        
        items = []
        if guia_data.get('items_json'):
            if isinstance(guia_data['items_json'], str):
                items = json.loads(guia_data['items_json'])
            else:
                items = guia_data['items_json']
        
        html_content = generar_html_pdf_guia_compra(guia_data, items)
        
        try:
            from weasyprint import HTML
        except ImportError:
            return jsonify({'success': False, 'error': 'Módulo weasyprint no instalado'}), 500
        
        pdf_file = BytesIO()
        HTML(string=html_content).write_pdf(pdf_file)
        pdf_file.seek(0)
        
        nombre_archivo = f"guia_compra_{guia_data['serie']}-{guia_data['numero']}.pdf"
        
        return send_file(
            pdf_file,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=nombre_archivo
        )
        
    except Exception as e:
        print(f"Error generando PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


def generar_html_pdf_guia_compra(guia_data, items):
    """Genera el HTML para el PDF de la guía de remisión de compra"""
    
    if not isinstance(guia_data, dict):
        if hasattr(guia_data, 'items'):
            guia_data = dict(guia_data)
        else:
            guia_data = {}
    
    serie = guia_data.get('serie', 'G001')
    numero = guia_data.get('numero', 1)
    proveedor_ruc = guia_data.get('proveedor_ruc', '-')
    proveedor_nombre = guia_data.get('proveedor_nombre', '-')
    proveedor_direccion = guia_data.get('proveedor_direccion', '-')
    remitente_ruc = guia_data.get('ruc_remitente', '-')
    remitente_nombre = guia_data.get('remitente_nombre', '-')
    remitente_direccion = guia_data.get('remitente_direccion', '-')
    placa_vehiculo = guia_data.get('placa_vehiculo', '-')
    conductor_nombre = guia_data.get('conductor_nombre', '-')
    conductor_dni = guia_data.get('conductor_dni', '-')
    motivo_traslado = guia_data.get('motivo_traslado', 'COMPRA')
    estado = guia_data.get('estado', 'BORRADOR')
    observaciones = guia_data.get('observaciones', '')
    peso_total = float(guia_data.get('peso_total', 0))
    
    fecha_emision = guia_data.get('fecha_emision', '')
    if fecha_emision:
        try:
            if isinstance(fecha_emision, (datetime, date)):
                fecha_emision = fecha_emision.strftime('%d/%m/%Y')
            else:
                fecha_emision = datetime.strptime(str(fecha_emision), '%Y-%m-%d').strftime('%d/%m/%Y')
        except:
            fecha_emision = str(fecha_emision)
    
    fecha_traslado = guia_data.get('fecha_traslado', '')
    if fecha_traslado:
        try:
            if isinstance(fecha_traslado, (datetime, date)):
                fecha_traslado = fecha_traslado.strftime('%d/%m/%Y')
            else:
                fecha_traslado = datetime.strptime(str(fecha_traslado), '%Y-%m-%d').strftime('%d/%m/%Y')
        except:
            fecha_traslado = str(fecha_traslado)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Guía de Remisión de Compra {serie}-{numero}</title>
        <style>
            @page {{ size: A4; margin: 1.5cm; }}
            body {{ font-family: 'Helvetica', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; }}
            .header {{ text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }}
            .header h1 {{ font-size: 18px; margin: 0; color: #1a1a2e; }}
            .info-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }}
            .info-box {{ border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #f9f9f9; }}
            .info-box h3 {{ font-size: 12px; margin: 0 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid #ddd; color: #2563eb; }}
            .info-row {{ margin-bottom: 5px; }}
            .info-label {{ font-weight: bold; font-size: 10px; color: #666; }}
            .products-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            .products-table th {{ background: #1e293b; color: white; padding: 8px; font-size: 10px; text-align: center; border: 1px solid #333; }}
            .products-table td {{ padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px; }}
            .summary {{ margin-top: 15px; text-align: right; }}
            .footer {{ margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>GUÍA DE REMISIÓN DE COMPRA</h1>
            <p>N° {serie}-{numero}</p>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h3>🏢 PROVEEDOR (Remitente)</h3>
                <div class="info-row"><span class="info-label">RUC:</span> {proveedor_ruc}</div>
                <div class="info-row"><span class="info-label">Razón Social:</span> {proveedor_nombre}</div>
                <div class="info-row"><span class="info-label">Dirección:</span> {proveedor_direccion}</div>
            </div>
            <div class="info-box">
                <h3>🏭 EMPRESA COMPRADORA (Destinatario)</h3>
                <div class="info-row"><span class="info-label">RUC:</span> {remitente_ruc}</div>
                <div class="info-row"><span class="info-label">Razón Social:</span> {remitente_nombre}</div>
                <div class="info-row"><span class="info-label">Dirección:</span> {remitente_direccion}</div>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h3>🚚 VEHÍCULO</h3>
                <div class="info-row"><span class="info-label">Placa:</span> {placa_vehiculo}</div>
                <div class="info-row"><span class="info-label">Conductor:</span> {conductor_nombre} (DNI: {conductor_dni})</div>
            </div>
            <div class="info-box">
                <h3>📋 TRASLADO</h3>
                <div class="info-row"><span class="info-label">Motivo:</span> {motivo_traslado}</div>
                <div class="info-row"><span class="info-label">Fecha Emisión:</span> {fecha_emision}</div>
                <div class="info-row"><span class="info-label">Fecha Traslado:</span> {fecha_traslado}</div>
                <div class="info-row"><span class="info-label">Peso Total:</span> {peso_total:.2f} kg</div>
                <div class="info-row"><span class="info-label">Estado:</span> {estado}</div>
            </div>
        </div>
        
        <h3 style="margin: 15px 0 10px 0;">📋 PRODUCTOS</h3>
        <table class="products-table">
            <thead><tr><th>Item</th><th>Código</th><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>Peso Unit.</th><th>Peso Total</th></tr></thead>
            <tbody>
    """
    
    for idx, item in enumerate(items, 1):
        if isinstance(item, dict):
            cantidad = float(item.get('cantidad', 0))
            peso = float(item.get('peso_unitario', 0))
            peso_total_item = cantidad * peso
            codigo = item.get('codigo', '-')
            descripcion = item.get('descripcion', '-')
            unidad = item.get('unidad', 'NIU')
        else:
            cantidad = peso = peso_total_item = 0
            codigo = descripcion = '-'
            unidad = 'NIU'
        
        html += f"""
                <tr>
                    <td>{idx}</td>
                    <td>{codigo}</td>
                    <td style="text-align: left;">{descripcion}</td>
                    <td>{unidad}</td>
                    <td>{cantidad:.2f}</td>
                    <td>{peso:.2f} kg</td>
                    <td>{peso_total_item:.2f} kg</td>
                </tr>
        """
    
    html += f"""
            </tbody>
        </table>
    """
    
    if observaciones:
        html += f"""
        <div class="observaciones" style="margin-top:15px;padding:10px;background:#fef3c7;border-left:3px solid #f59e0b;">
            <strong>📝 Observaciones:</strong><br>{observaciones}
        </div>
        """
    
    html += """
        <div class="footer">
            <p>Documento de traslado de mercadería - Guía de Remisión de Compra</p>
            <p>KCF CORPORACION SAC - Sistema ERP</p>
        </div>
    </body>
    </html>
    """
    
    return html