# routes/guias_remision.py
from flask import Blueprint, render_template, request, jsonify, session
from functools import wraps
import sys
import os
sys.dont_write_bytecode = True

# Agregar el directorio padre al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db_insert, db_query, db_update

guias_bp = Blueprint('guias', __name__, url_prefix='/guias')

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

@guias_bp.route('/')
def index():
    """Lista de guías de remisión"""
    try:
        query = """
            SELECT id, serie, numero, ruc_destinatario, 
                   destinatario_nombre, fecha_emision, 
                   estado_sunat, created_at
            FROM guias_remision
            ORDER BY created_at DESC
        """
        guias = db_query(query)
        
        return render_template('guias_lista.html', guias=guias or [])
    except Exception as e:
        print(f"Error: {e}")
        return render_template('guias_lista.html', guias=[])

@guias_bp.route('/crear')
def crear():
    """Formulario para crear nueva guía de remisión"""
    return render_template('crear_guia.html')

@guias_bp.route('/ver/<int:guia_id>')
def ver(guia_id):
    """Ver detalle de una guía"""
    try:
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return "Guía no encontrada", 404
        
        return render_template('ver_guia.html', guia=guia[0])
    except Exception as e:
        return f"Error: {e}", 500

# ==========================================
# API ENDPOINTS (Backend)
# ==========================================

@guias_bp.route('/api/guardar-borrador', methods=['POST'])
@login_required
def guardar_borrador():
    """Guardar guía como borrador (sin enviar a SUNAT)"""
    try:
        data = request.get_json()
        
        # Validaciones mínimas
        if not data.get('destinatario', {}).get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC del destinatario es obligatorio'})
        
        if not data.get('vehiculo', {}).get('placa'):
            return jsonify({'success': False, 'error': 'La placa del vehículo es obligatoria'})
        
        if not data.get('items') or len(data.get('items')) == 0:
            return jsonify({'success': False, 'error': 'Debe agregar al menos un producto'})
        
        # Generar número de guía automático
        serie = data.get('serie', 'T001')
        
        # Obtener último número para esta serie
        query_max = """
            SELECT COALESCE(MAX(numero), 0) + 1 as next_num
            FROM guias_remision 
            WHERE serie = %s
        """
        result = db_query(query_max, (serie,))
        numero = result[0]['next_num'] if result else 1
        
        # Calcular peso total
        peso_total = sum(
            float(item.get('peso_unitario', 0)) * float(item.get('cantidad', 1)) 
            for item in data['items']
        )
        
        # Insertar en base de datos
        insert_query = """
            INSERT INTO guias_remision (
                serie, numero, fecha_emision, fecha_traslado,
                ruc_remitente, remitente_nombre, remitente_direccion, remitente_ubigeo,
                ruc_destinatario, destinatario_nombre, destinatario_direccion, destinatario_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni, conductor_nombre, licencia_conductor,
                transportista_ruc, transportista_nombre,
                motivo_traslado, documento_asociado, peso_total,
                items_json, observaciones, estado_sunat, creado_por
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s
            ) RETURNING id
        """
        
        import json
        items_json = json.dumps(data['items'], default=str)
        
        params = (
            serie, numero,
            data.get('fecha_emision'), data.get('fecha_traslado'),
            data.get('remitente', {}).get('ruc', ''),
            data.get('remitente', {}).get('nombre', ''),
            data.get('remitente', {}).get('direccion', ''),
            data.get('remitente', {}).get('ubigeo', ''),
            data['destinatario'].get('ruc', ''),
            data['destinatario'].get('nombre', ''),
            data['destinatario'].get('direccion', ''),
            data['destinatario'].get('ubigeo', ''),
            data.get('modalidad_transporte', 'PRIVADO'),
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            data.get('transportista', {}).get('ruc', ''),
            data.get('transportista', {}).get('nombre', ''),
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado', ''),
            peso_total,
            items_json,
            data.get('observaciones', ''),
            'BORRADOR',  # Estado inicial
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

@guias_bp.route('/api/enviar-sunat', methods=['POST'])
@login_required
def enviar_sunat():
    """
    Enviar guía a SUNAT (versión interna - solo guarda,
    luego se conectará con la API de SUNAT)
    """
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('destinatario', {}).get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC del destinatario es obligatorio'})
        
        if not data.get('vehiculo', {}).get('placa'):
            return jsonify({'success': False, 'error': 'La placa del vehículo es obligatoria'})
        
        if not data.get('items') or len(data.get('items')) == 0:
            return jsonify({'success': False, 'error': 'Debe agregar al menos un producto'})
        
        # Generar número de guía automático
        serie = data.get('serie', 'T001')
        
        query_max = """
            SELECT COALESCE(MAX(numero), 0) + 1 as next_num
            FROM guias_remision 
            WHERE serie = %s
        """
        result = db_query(query_max, (serie,))
        numero = result[0]['next_num'] if result else 1
        
        # Calcular peso total
        peso_total = sum(
            float(item.get('peso_unitario', 0)) * float(item.get('cantidad', 1)) 
            for item in data['items']
        )
        
        import json
        items_json = json.dumps(data['items'], default=str)
        
        # Guardar en base de datos con estado "PROCESANDO"
        insert_query = """
            INSERT INTO guias_remision (
                serie, numero, fecha_emision, fecha_traslado,
                ruc_remitente, remitente_nombre, remitente_direccion, remitente_ubigeo,
                ruc_destinatario, destinatario_nombre, destinatario_direccion, destinatario_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni, conductor_nombre, licencia_conductor,
                transportista_ruc, transportista_nombre,
                motivo_traslado, documento_asociado, peso_total,
                items_json, observaciones, estado_sunat, creado_por
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s
            ) RETURNING id
        """
        
        params = (
            serie, numero,
            data.get('fecha_emision'), data.get('fecha_traslado'),
            data.get('remitente', {}).get('ruc', ''),
            data.get('remitente', {}).get('nombre', ''),
            data.get('remitente', {}).get('direccion', ''),
            data.get('remitente', {}).get('ubigeo', ''),
            data['destinatario'].get('ruc', ''),
            data['destinatario'].get('nombre', ''),
            data['destinatario'].get('direccion', ''),
            data['destinatario'].get('ubigeo', ''),
            data.get('modalidad_transporte', 'PRIVADO'),
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            data.get('transportista', {}).get('ruc', ''),
            data.get('transportista', {}).get('nombre', ''),
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado', ''),
            peso_total,
            items_json,
            data.get('observaciones', ''),
            'PROCESANDO',  # Estado: PROCESANDO, ACEPTADA, RECHAZADA
            session.get('usuario_id')
        )
        
        guia_id = db_insert(insert_query, params)
        
        if not guia_id:
            return jsonify({'success': False, 'error': 'Error al guardar'})
        
        # TODO: Aquí se conectará con SUNAT (próximo paso)
        # Por ahora, simulamos que se envió correctamente
        # Actualizar estado a ACEPTADA (simulado)
        update_query = """
            UPDATE guias_remision 
            SET estado_sunat = 'ACEPTADA',
                cdr_response = 'Envío exitoso (modo demo - pendiente conexión SUNAT)',
                sunat_response = %s
            WHERE id = %s
        """
        demo_response = json.dumps({
            'code': '0',
            'message': 'Aceptada (modo demo)',
            'sunat_date': '2026-06-06T12:00:00'
        })
        db_update(update_query, (demo_response, guia_id))
        
        return jsonify({
            'success': True,
            'guia_id': guia_id,
            'numero_guia': f"{serie}-{numero}",
            'message': 'Guía procesada exitosamente (modo demo - pendiente conexión SUNAT real)'
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})

@guias_bp.route('/api/listar', methods=['GET'])
@login_required
def listar_guias():
    """Listar todas las guías de remisión"""
    try:
        query = """
            SELECT id, serie, numero, ruc_destinatario, destinatario_nombre,
                   fecha_emision, fecha_traslado, modalidad_transporte,
                   placa_vehiculo, motivo_traslado, peso_total,
                   estado_sunat, created_at
            FROM guias_remision
            ORDER BY created_at DESC
        """
        guias = db_query(query)
        
        return jsonify({
            'success': True,
            'data': guias or []
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@guias_bp.route('/api/obtener/<int:guia_id>', methods=['GET'])
@login_required
def obtener_guia(guia_id):
    """Obtener una guía por ID"""
    try:
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return jsonify({'success': False, 'error': 'Guía no encontrada'})
        
        return jsonify({
            'success': True,
            'data': guia[0]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    
@guias_bp.route('/api/pdf/<int:guia_id>', methods=['GET'])
@login_required
def descargar_pdf(guia_id):
    """Generar y descargar PDF de la guía de remisión"""
    try:
        from routes.pdf_guia_generator import generar_pdf_guia

        # Obtener datos de la guía
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        guia_data = guia[0]
        
        # Generar PDF
        pdf_file = generar_pdf_guia(guia_data)
        
        # Enviar como descarga
        from flask import send_file
        return send_file(
            pdf_file,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"guia_{guia_data['serie']}-{guia_data['numero']}.pdf"
        )
        
    except Exception as e:
        print(f"Error generando PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500