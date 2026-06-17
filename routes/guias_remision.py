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
        
        # 🔥 MANEJO SEGURO DEL TRANSPORTISTA 🔥
        modalidad = data.get('modalidad_transporte', 'PRIVADO')
        transportista_data = data.get('transportista', {})
        
        # Si es público, usar los datos del transportista; si es privado, enviar vacío
        if modalidad == 'PUBLICO':
            transportista_ruc = transportista_data.get('ruc', '') if transportista_data else ''
            transportista_nombre = transportista_data.get('nombre', '') if transportista_data else ''
        else:
            transportista_ruc = ''
            transportista_nombre = ''
        
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
            modalidad,
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            transportista_ruc,
            transportista_nombre,
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado', ''),
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
        
        # 🔥 MANEJO SEGURO DEL TRANSPORTISTA 🔥
        modalidad = data.get('modalidad_transporte', 'PRIVADO')
        transportista_data = data.get('transportista', {})
        
        if modalidad == 'PUBLICO':
            transportista_ruc = transportista_data.get('ruc', '') if transportista_data else ''
            transportista_nombre = transportista_data.get('nombre', '') if transportista_data else ''
        else:
            transportista_ruc = ''
            transportista_nombre = ''
        
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
            modalidad,
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            transportista_ruc,
            transportista_nombre,
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado', ''),
            peso_total,
            items_json,
            data.get('observaciones', ''),
            'PROCESANDO',
            session.get('usuario_id')
        )
        
        guia_id = db_insert(insert_query, params)
        
        if not guia_id:
            return jsonify({'success': False, 'error': 'Error al guardar'})
        
        # TODO: Aquí se conectará con SUNAT (próximo paso)
        # Por ahora, simulamos que se envió correctamente
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
    

@guias_bp.route('/editar/<int:guia_id>')
def editar(guia_id):
    """Formulario para editar una guía de remisión"""
    try:
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia = db_query(query, (guia_id,))
        
        if not guia:
            return "Guía no encontrada", 404
        
        return render_template('editar_guia.html', guia=guia[0])
    except Exception as e:
        return f"Error: {e}", 500

@guias_bp.route('/api/actualizar/<int:guia_id>', methods=['PUT'])
@login_required
def actualizar_guia(guia_id):
    """Actualizar una guía de remisión existente"""
    try:
        data = request.get_json()
        
        # Validaciones mínimas
        if not data.get('destinatario', {}).get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC del destinatario es obligatorio'})
        
        if not data.get('vehiculo', {}).get('placa'):
            return jsonify({'success': False, 'error': 'La placa del vehículo es obligatoria'})
        
        if not data.get('items') or len(data.get('items')) == 0:
            return jsonify({'success': False, 'error': 'Debe agregar al menos un producto'})
        
        # Verificar que la guía esté en estado editable
        check_query = "SELECT estado_sunat FROM guias_remision WHERE id = %s"
        check_result = db_query(check_query, (guia_id,))
        
        if check_result and check_result[0]['estado_sunat'] not in ['BORRADOR', 'RECHAZADA']:
            return jsonify({'success': False, 'error': f'No se puede editar una guía en estado {check_result[0]["estado_sunat"]}. Solo BORRADOR o RECHAZADA.'})
        
        # Calcular peso total
        peso_total = sum(
            float(item.get('peso_unitario', 0)) * float(item.get('cantidad', 1)) 
            for item in data['items']
        )
        
        import json
        items_json = json.dumps(data['items'], default=str)
        
        # 🔥 MANEJO SEGURO DEL TRANSPORTISTA 🔥
        modalidad = data.get('modalidad_transporte', 'PRIVADO')
        transportista_ruc = ''
        transportista_nombre = ''
        if modalidad == 'PUBLICO' and data.get('transportista'):
            transportista_ruc = data['transportista'].get('ruc', '')
            transportista_nombre = data['transportista'].get('nombre', '')
        
        # Actualizar en base de datos
        update_query = """
            UPDATE guias_remision SET
                fecha_emision = %s,
                fecha_traslado = %s,
                remitente_direccion = %s,
                remitente_ubigeo = %s,
                ruc_destinatario = %s,
                destinatario_nombre = %s,
                destinatario_direccion = %s,
                destinatario_ubigeo = %s,
                modalidad_transporte = %s,
                placa_vehiculo = %s,
                conductor_dni = %s,
                conductor_nombre = %s,
                licencia_conductor = %s,
                transportista_ruc = %s,
                transportista_nombre = %s,
                motivo_traslado = %s,
                documento_asociado = %s,
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
            data.get('remitente', {}).get('direccion', ''),
            data.get('remitente', {}).get('ubigeo', ''),
            data['destinatario'].get('ruc', ''),
            data['destinatario'].get('nombre', ''),
            data['destinatario'].get('direccion', ''),
            data['destinatario'].get('ubigeo', ''),
            modalidad,
            data['vehiculo'].get('placa', ''),
            data['vehiculo'].get('conductor_dni', ''),
            data['vehiculo'].get('conductor_nombre', ''),
            data['vehiculo'].get('licencia_conducir', ''),
            transportista_ruc,
            transportista_nombre,
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado', ''),
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
            return jsonify({'success': False, 'error': 'Error al actualizar la guía'})
            
    except Exception as e:
        print(f"Error actualizando guía: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})    

@guias_bp.route('/api/eliminar/<int:guia_id>', methods=['DELETE'])
@login_required
def eliminar_guia(guia_id):
    """Eliminar una guía de remisión (solo si está en estado BORRADOR)"""
    try:
        # Verificar que la guía exista y esté en estado BORRADOR
        check_query = "SELECT estado_sunat FROM guias_remision WHERE id = %s"
        check_result = db_query(check_query, (guia_id,))
        
        if not check_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        if check_result[0]['estado_sunat'] != 'BORRADOR':
            return jsonify({'success': False, 'error': 'Solo se pueden eliminar guías en estado BORRADOR'}), 400
        
        # Eliminar la guía
        delete_query = "DELETE FROM guias_remision WHERE id = %s"
        db_update(delete_query, (guia_id,))
        
        return jsonify({
            'success': True,
            'message': 'Guía eliminada exitosamente'
        })
        
    except Exception as e:
        print(f"Error eliminando guía: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==========================================
# NUEVAS RUTAS: RÓTULO DE EMBALAJE (AGD GROUP)
# ==========================================

@guias_bp.route('/api/generar-rotulo/<int:guia_id>', methods=['POST'])
@login_required
def generar_rotulo(guia_id):
    """
    Genera y retorna el PDF del rótulo de embalaje
    Formato: AGD GROUP
    """
    try:
        # Obtener datos de la guía
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia_result = db_query(query, (guia_id,))
        
        if not guia_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        guia = guia_result[0]
        
        # Importar función de generación de rótulo
        from routes.rotulo_generator import generar_rotulo_pdf
        
        # Generar el PDF del rótulo
        pdf_data = generar_rotulo_pdf(guia)
        
        # Retornar el PDF
        from flask import send_file
        import io
        
        return send_file(
            io.BytesIO(pdf_data),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=f'rotulo_{guia["serie"]}-{guia["numero"]}.pdf'
        )
        
    except ImportError:
        return jsonify({'success': False, 'error': 'Módulo de generación de rótulo no disponible. Instala reportlab: pip install reportlab'}), 500
    except Exception as e:
        print(f"Error generando rótulo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@guias_bp.route('/api/rotulo-html/<int:guia_id>', methods=['GET'])
@login_required
def obtener_rotulo_html(guia_id):
    """
    Retorna el HTML del rótulo para mostrar en el modal
    """
    try:
        # Obtener datos de la guía
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia_result = db_query(query, (guia_id,))
        
        if not guia_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        guia = guia_result[0]
        
        # Importar función de generación de HTML
        from routes.rotulo_generator import generar_rotulo_html
        
        html = generar_rotulo_html(guia)
        
        return jsonify({
            'success': True,
            'html': html,
            'guia': guia
        })
        
    except ImportError:
        return jsonify({'success': False, 'error': 'Módulo de generación de rótulo no disponible'}), 500
    except Exception as e:
        print(f"Error generando HTML del rótulo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@guias_bp.route('/rotulo/pdf/<int:guia_id>', methods=['GET'])
@login_required
def descargar_rotulo_pdf(guia_id):
    """
    Descarga el rótulo en formato PDF (para impresión directa)
    """
    try:
        # Obtener datos de la guía
        query = "SELECT * FROM guias_remision WHERE id = %s"
        guia_result = db_query(query, (guia_id,))
        
        if not guia_result:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        guia = guia_result[0]
        
        # Importar función de generación de rótulo
        from routes.rotulo_generator import generar_rotulo_pdf
        
        pdf_data = generar_rotulo_pdf(guia)
        
        from flask import send_file, make_response
        import io
        
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=rotulo_{guia["serie"]}-{guia["numero"]}.pdf'
        return response
        
    except ImportError:
        return jsonify({'success': False, 'error': 'Módulo de generación de rótulo no disponible. Instala reportlab: pip install reportlab'}), 500
    except Exception as e:
        print(f"Error descargando rótulo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500