from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
from datetime import datetime
import uuid
import json
from config import Config

ventas_bp = Blueprint('ventas', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_supabase():
    return Config.get_supabase()

# ============================================================
# RUTAS PRINCIPALES
# ============================================================

@ventas_bp.route('/ventas')
@login_required
def ventas():
    tab = request.args.get('tab', 'cotizaciones')
    return render_template('ventas/index.html', 
                         active_tab=tab,
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

# ============================================================
# COTIZACIONES - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/cotizaciones/listar', methods=['GET'])
@login_required
def api_cotizaciones_listar():
    """Listar todas las cotizaciones"""
    try:
        supabase = get_supabase()
        empresa = session.get('empresa', 'KCF')
        
        response = supabase.table('cotizaciones')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        # Formatear datos para el frontend
        data = []
        for row in response.data:
            data.append({
                'id': row.get('id'),
                'numero': row.get('numero_cotizacion') or row.get('codigo_cotizacion'),
                'fecha': row.get('fecha_creacion'),
                'estado': row.get('estado'),
                'ruc': row.get('cliente_id'),  # En tu tabla cliente_id es el RUC
                'razon': row.get('cliente_nombre') or row.get('cliente_id'),
                'descripcion': row.get('nota_cotizacion') or row.get('notas'),
                'monto': float(row.get('total', 0)),
                'subtotal': float(row.get('subtotal', 0)),
                'igv': float(row.get('igv', 0)),
                'condicion': row.get('condicion_pago'),
                'vendedor': row.get('usuario_id'),
                'vencimiento': row.get('validez_oferta'),
                'cod_cliente': row.get('cliente_id'),
                'direccion': row.get('direccion_entrega'),
                'requerimiento': row.get('requerimiento'),
                'nota': row.get('nota_cotizacion'),
                'descuento_porcentaje': float(row.get('descuento_porcentaje', 0)),
                'descuento_monto': float(row.get('descuento_monto', 0)),
                'descuento_tipo': row.get('descuento_tipo'),
                'contacto': row.get('contacto_cliente'),
                'telefono': row.get('telefono_cliente'),
                'email': row.get('email_cliente')
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/guardar', methods=['POST'])
@login_required
def api_cotizaciones_guardar():
    """Guardar una cotización"""
    try:
        data = request.get_json()
        supabase = get_supabase()
        usuario = session.get('usuario', '')
        usuario_id = session.get('usuario_id', 8)  # Valor por defecto
        
        # Calcular totales
        subtotal = float(data.get('subtotal', 0))
        descuento_porcentaje = float(data.get('descuento_porcentaje', 0))
        descuento_monto = float(data.get('descuento_monto', 0))
        igv = float(data.get('igv', 18))
        
        # Calcular total
        if data.get('descuento_tipo') == 'monto':
            total = (subtotal - descuento_monto) * (1 + igv / 100)
        else:
            total = (subtotal * (1 - descuento_porcentaje / 100)) * (1 + igv / 100)
        
        cotizacion_data = {
            'cliente_id': data.get('ruc'),
            'cliente_nombre': data.get('razon'),
            'fecha_creacion': datetime.now().isoformat(),
            'estado': data.get('estado', 'Borrador'),
            'subtotal': subtotal,
            'igv': subtotal * (igv / 100),
            'total': total,
            'usuario_id': usuario_id,
            'notas': data.get('nota', ''),
            'forma_pago': data.get('condicion_pago'),
            'tiempo_entrega': data.get('tiempo_entrega'),
            'validez_oferta': data.get('vencimiento'),
            'condicion_pago': data.get('condicion_pago'),
            'direccion_entrega': data.get('direccion_entrega'),
            'requerimiento': data.get('requerimiento'),
            'nota_cotizacion': data.get('nota_comercial'),
            'descuento_porcentaje': descuento_porcentaje,
            'descuento_monto': descuento_monto,
            'descuento_tipo': data.get('descuento_tipo', 'porcentaje'),
            'contacto_cliente': data.get('contacto'),
            'telefono_cliente': data.get('telefono'),
            'email_cliente': data.get('email')
        }
        
        # Si tiene ID, actualizar
        if data.get('id'):
            cotizacion_id = data['id']
            response = supabase.table('cotizaciones')\
                .update(cotizacion_data)\
                .eq('id', cotizacion_id)\
                .execute()
            
            return jsonify({'success': True, 'message': 'Cotización actualizada', 'data': {'id': cotizacion_id}})
        
        # Si no tiene ID, crear nuevo
        else:
            # Generar número de cotización
            count_response = supabase.table('cotizaciones')\
                .select('id', count='exact')\
                .execute()
            count = len(count_response.data) + 1
            numero = f"COT-{str(count).zfill(6)}"
            cotizacion_data['numero_cotizacion'] = numero
            cotizacion_data['codigo_cotizacion'] = f"COT-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(4)}"
            cotizacion_data['correlativo'] = count
            
            response = supabase.table('cotizaciones').insert(cotizacion_data).execute()
            cotizacion_id = response.data[0]['id']
            
            return jsonify({
                'success': True, 
                'message': 'Cotización creada correctamente',
                'data': {'id': cotizacion_id, 'numero': numero}
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['GET'])
@login_required
def api_cotizaciones_obtener(id):
    """Obtener una cotización por ID"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('cotizaciones')\
            .select('*')\
            .eq('id', id)\
            .execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Cotización no encontrada'}), 404
        
        row = response.data[0]
        data = {
            'id': row.get('id'),
            'numero': row.get('numero_cotizacion') or row.get('codigo_cotizacion'),
            'fecha': row.get('fecha_creacion'),
            'estado': row.get('estado'),
            'ruc': row.get('cliente_id'),
            'razon': row.get('cliente_nombre') or row.get('cliente_id'),
            'monto': float(row.get('total', 0)),
            'subtotal': float(row.get('subtotal', 0)),
            'igv': float(row.get('igv', 0)),
            'condicion': row.get('condicion_pago'),
            'vencimiento': row.get('validez_oferta'),
            'direccion': row.get('direccion_entrega'),
            'requerimiento': row.get('requerimiento'),
            'nota': row.get('nota_cotizacion'),
            'contacto': row.get('contacto_cliente'),
            'telefono': row.get('telefono_cliente'),
            'email': row.get('email_cliente'),
            'descuento_porcentaje': float(row.get('descuento_porcentaje', 0)),
            'descuento_monto': float(row.get('descuento_monto', 0)),
            'descuento_tipo': row.get('descuento_tipo')
        }
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>/toggle', methods=['PUT'])
@login_required
def api_cotizaciones_toggle(id):
    """Cambiar estado de una cotización"""
    try:
        supabase = get_supabase()
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        response = supabase.table('cotizaciones')\
            .update({'estado': nuevo_estado})\
            .eq('id', id)\
            .execute()
        
        return jsonify({'success': True, 'message': f'Estado actualizado a {nuevo_estado}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['DELETE'])
@login_required
def api_cotizaciones_eliminar(id):
    """Eliminar una cotización"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('cotizaciones')\
            .update({'estado': 'Eliminada'})\
            .eq('id', id)\
            .execute()
        
        return jsonify({'success': True, 'message': 'Cotización eliminada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# GUÍAS DE REMISIÓN - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/guias/listar', methods=['GET'])
@login_required
def api_guias_listar():
    """Listar todas las guías"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('guias_remision')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        # Formatear datos
        data = []
        for row in response.data:
            items = []
            try:
                if row.get('items_json'):
                    items = json.loads(row.get('items_json'))
            except:
                items = []
            
            data.append({
                'id': row.get('id'),
                'serie': row.get('serie'),
                'numero': row.get('numero'),
                'fecha': row.get('fecha_emision'),
                'fecha_traslado': row.get('fecha_traslado'),
                'estado': row.get('estado_sunat') or row.get('estado'),
                'ruc': row.get('ruc_destinatario'),
                'cliente': row.get('destinatario_nombre'),
                'cotizacion': row.get('documento_asociado'),  # Número de cotización
                'comprobante': row.get('documento_asociado'),
                'origen': row.get('remitente_direccion'),
                'destino': row.get('destinatario_direccion'),
                'motivo': row.get('motivo_traslado'),
                'observaciones': row.get('observaciones'),
                'items': items,
                'placa': row.get('placa_vehiculo'),
                'conductor': row.get('conductor_nombre'),
                'transportista': row.get('transportista_nombre')
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/guardar', methods=['POST'])
@login_required
def api_guias_guardar():
    """Guardar una guía"""
    try:
        data = request.get_json()
        supabase = get_supabase()
        usuario = session.get('usuario', '')
        usuario_id = session.get('usuario_id', 8)
        
        # Preparar items_json
        items_json = data.get('items', [])
        
        guia_data = {
            'serie': data.get('serie', 'T001'),
            'numero': data.get('numero'),
            'fecha_emision': datetime.now().date().isoformat(),
            'fecha_traslado': data.get('fecha_traslado') or datetime.now().date().isoformat(),
            'ruc_remitente': data.get('ruc_remitente') or session.get('empresa_ruc', '20602095704'),
            'remitente_nombre': data.get('remitente_nombre') or session.get('empresa_nombre', 'KCF CORPORACION SAC'),
            'remitente_direccion': data.get('remitente_direccion') or '',
            'remitente_ubigeo': data.get('remitente_ubigeo') or '',
            'ruc_destinatario': data.get('ruc'),
            'destinatario_nombre': data.get('cliente'),
            'destinatario_direccion': data.get('destino'),
            'destinatario_ubigeo': data.get('destinatario_ubigeo') or '',
            'modalidad_transporte': data.get('modalidad_transporte', 'PRIVADO'),
            'placa_vehiculo': data.get('placa_vehiculo') or '',
            'conductor_dni': data.get('conductor_dni') or '',
            'conductor_nombre': data.get('conductor_nombre') or '',
            'licencia_conductor': data.get('licencia_conductor') or '',
            'transportista_ruc': data.get('transportista_ruc') or '',
            'transportista_nombre': data.get('transportista_nombre') or '',
            'motivo_traslado': data.get('motivo_traslado', 'VENTA'),
            'documento_asociado': data.get('cotizacion_numero') or data.get('cotizacion'),
            'peso_total': float(data.get('peso_total', 0)),
            'items_json': json.dumps(items_json),
            'observaciones': data.get('observaciones', ''),
            'estado_sunat': data.get('estado', 'BORRADOR'),
            'creado_por': usuario_id,
            'updated_at': datetime.now().isoformat()
        }
        
        # Generar número si no tiene
        if not guia_data['numero']:
            count_response = supabase.table('guias_remision')\
                .select('id', count='exact')\
                .execute()
            count = len(count_response.data) + 1
            guia_data['numero'] = str(count)
        
        if data.get('id'):
            response = supabase.table('guias_remision')\
                .update(guia_data)\
                .eq('id', data['id'])\
                .execute()
            return jsonify({'success': True, 'message': 'Guía actualizada'})
        else:
            response = supabase.table('guias_remision').insert(guia_data).execute()
            guia_id = response.data[0]['id']
            
            return jsonify({'success': True, 'message': 'Guía creada', 'data': {'id': guia_id}})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/<int:id>', methods=['GET'])
@login_required
def api_guias_obtener(id):
    """Obtener una guía por ID"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('guias_remision')\
            .select('*')\
            .eq('id', id)\
            .execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
        row = response.data[0]
        items = []
        try:
            if row.get('items_json'):
                items = json.loads(row.get('items_json'))
        except:
            pass
        
        data = {
            'id': row.get('id'),
            'serie': row.get('serie'),
            'numero': row.get('numero'),
            'fecha': row.get('fecha_emision'),
            'fecha_traslado': row.get('fecha_traslado'),
            'estado': row.get('estado_sunat') or row.get('estado'),
            'ruc': row.get('ruc_destinatario'),
            'cliente': row.get('destinatario_nombre'),
            'cotizacion': row.get('documento_asociado'),
            'destino': row.get('destinatario_direccion'),
            'origen': row.get('remitente_direccion'),
            'motivo': row.get('motivo_traslado'),
            'observaciones': row.get('observaciones'),
            'items': items,
            'placa': row.get('placa_vehiculo'),
            'conductor': row.get('conductor_nombre'),
            'transportista': row.get('transportista_nombre')
        }
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/<int:id>', methods=['DELETE'])
@login_required
def api_guias_eliminar(id):
    """Eliminar una guía"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('guias_remision')\
            .update({'estado_sunat': 'ANULADA'})\
            .eq('id', id)\
            .execute()
        
        return jsonify({'success': True, 'message': 'Guía anulada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# COMPROBANTES (FACTURAS/BOLETAS) - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/comprobantes/listar', methods=['GET'])
@login_required
def api_comprobantes_listar():
    """Listar todos los comprobantes"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('comprobantes')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        data = []
        for row in response.data:
            items = []
            try:
                if row.get('items_json'):
                    items = json.loads(row.get('items_json'))
            except:
                pass
            
            data.append({
                'id': row.get('id'),
                'tipo': row.get('tipo_comprobante'),
                'serie': row.get('serie'),
                'numero': row.get('numero'),
                'fecha': row.get('fecha_emision'),
                'estado': row.get('estado_sunat') or 'Borrador',
                'ruc': row.get('cliente_numero_doc'),
                'cliente': row.get('cliente_nombre'),
                'cotizacion': row.get('documento_asociado'),
                'monto': float(row.get('total', 0)),
                'subtotal': float(row.get('subtotal', 0)),
                'igv': float(row.get('igv', 0)),
                'condicion': 'Contado',
                'observaciones': row.get('observaciones'),
                'items': items
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/comprobantes/guardar', methods=['POST'])
@login_required
def api_comprobantes_guardar():
    """Guardar un comprobante"""
    try:
        data = request.get_json()
        supabase = get_supabase()
        usuario_id = session.get('usuario_id', 8)
        
        items_json = data.get('items', [])
        
        comprobante_data = {
            'tipo_comprobante': data.get('tipo', 'FACTURA'),
            'serie': data.get('serie', 'F001'),
            'numero': data.get('numero'),
            'fecha_emision': datetime.now().date().isoformat(),
            'moneda': data.get('moneda', 'PEN'),
            'cliente_tipo_doc': data.get('cliente_tipo_doc', 'RUC'),
            'cliente_numero_doc': data.get('ruc'),
            'cliente_nombre': data.get('cliente'),
            'cliente_direccion': data.get('direccion') or '',
            'cliente_email': data.get('email') or '',
            'cliente_telefono': data.get('telefono') or '',
            'subtotal': float(data.get('subtotal', 0)),
            'igv': float(data.get('igv', 0)),
            'total': float(data.get('total', 0)),
            'items_json': json.dumps(items_json),
            'observaciones': data.get('observaciones', ''),
            'estado_sunat': data.get('estado', 'BORRADOR'),
            'creado_por': usuario_id,
            'updated_at': datetime.now().isoformat()
        }
        
        if data.get('id'):
            response = supabase.table('comprobantes')\
                .update(comprobante_data)\
                .eq('id', data['id'])\
                .execute()
            return jsonify({'success': True, 'message': 'Comprobante actualizado'})
        else:
            # Generar número
            if not comprobante_data['numero']:
                count_response = supabase.table('comprobantes')\
                    .select('id', count='exact')\
                    .execute()
                count = len(count_response.data) + 1
                comprobante_data['numero'] = str(count)
            
            response = supabase.table('comprobantes').insert(comprobante_data).execute()
            comprobante_id = response.data[0]['id']
            
            return jsonify({'success': True, 'message': 'Comprobante creado', 'data': {'id': comprobante_id}})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/comprobantes/<int:id>', methods=['DELETE'])
@login_required
def api_comprobantes_eliminar(id):
    """Eliminar un comprobante"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('comprobantes')\
            .update({'estado_sunat': 'ANULADO'})\
            .eq('id', id)\
            .execute()
        
        return jsonify({'success': True, 'message': 'Comprobante anulado'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# NOTAS DE CRÉDITO - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/notas-credito/listar', methods=['GET'])
@login_required
def api_notas_credito_listar():
    """Listar todas las notas de crédito"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('notas_credito')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        data = []
        for row in response.data:
            data.append({
                'id': row.get('id'),
                'serie': row.get('serie'),
                'numero': row.get('numero'),
                'fecha': row.get('fecha_emision'),
                'estado': row.get('estado'),
                'ruc': row.get('cliente_numero_doc'),
                'cliente': row.get('cliente_nombre'),
                'comprobante': row.get('comprobante_asociado'),
                'motivo': row.get('motivo'),
                'monto': float(row.get('monto', 0)),
                'observaciones': row.get('observaciones')
            })
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# PEDIDO COMPRA (PC) - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/pedido-compra/listar', methods=['GET'])
@login_required
def api_pedido_compra_listar():
    """Listar todos los PC del cliente"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('pedido_compra_pc')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        return jsonify({'success': True, 'data': response.data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/pedido-compra/guardar', methods=['POST'])
@login_required
def api_pedido_compra_guardar():
    """Guardar un PC del cliente"""
    try:
        data = request.get_json()
        supabase = get_supabase()
        usuario_id = session.get('usuario_id', 8)
        
        pc_data = {
            'numero': data.get('numero'),
            'fecha': datetime.now().isoformat(),
            'estado': data.get('estado', 'Pendiente'),
            'cotizacion_id': data.get('cotizacion_id'),
            'cotizacion_numero': data.get('cotizacion_numero'),
            'cliente': data.get('cliente'),
            'ruc': data.get('ruc'),
            'monto': float(data.get('monto', 0)),
            'correo_origen': data.get('correo_origen'),
            'fecha_recepcion': data.get('fecha_recepcion'),
            'fecha_despacho': data.get('fecha_despacho'),
            'archivo_oc': data.get('archivo_oc'),
            'observaciones': data.get('observaciones'),
            'valida_precios': data.get('valida_precios', False),
            'valida_cantidades': data.get('valida_cantidades', False),
            'valida_stock': data.get('valida_stock', False),
            'valida_entrega': data.get('valida_entrega', False),
            'valida_montos': data.get('valida_montos', False),
            'responsable': data.get('responsable', 'Hellen'),
            'lugar_entrega': data.get('lugar_entrega'),
            'condicion_atencion': data.get('condicion_atencion'),
            'creado_por': usuario_id
        }
        
        if data.get('id'):
            response = supabase.table('pedido_compra_pc')\
                .update(pc_data)\
                .eq('id', data['id'])\
                .execute()
            return jsonify({'success': True, 'message': 'PC actualizado'})
        else:
            # Generar número
            if not pc_data['numero']:
                count_response = supabase.table('pedido_compra_pc')\
                    .select('id', count='exact')\
                    .execute()
                count = len(count_response.data) + 1
                pc_data['numero'] = f"PC-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(4)}"
            
            response = supabase.table('pedido_compra_pc').insert(pc_data).execute()
            
            return jsonify({'success': True, 'message': 'PC creado'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DESPACHOS - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/despachos/listar', methods=['GET'])
@login_required
def api_despachos_listar():
    """Listar todos los despachos"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('despachos')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        return jsonify({'success': True, 'data': response.data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/despachos/guardar', methods=['POST'])
@login_required
def api_despachos_guardar():
    """Guardar un despacho"""
    try:
        data = request.get_json()
        supabase = get_supabase()
        usuario_id = session.get('usuario_id', 8)
        
        despacho_data = {
            'numero': data.get('numero'),
            'fecha': datetime.now().isoformat(),
            'fecha_despacho': data.get('fecha_despacho'),
            'estado': data.get('estado', 'Pendiente despacho'),
            'pc_id': data.get('pc_id'),
            'pc_numero': data.get('pc_numero'),
            'cotizacion_id': data.get('cotizacion_id'),
            'cotizacion_numero': data.get('cotizacion_numero'),
            'cliente': data.get('cliente'),
            'ruc': data.get('ruc'),
            'comprobante': data.get('comprobante'),
            'guia': data.get('guia'),
            'origen': data.get('origen', 'ALM-SMP'),
            'destino': data.get('destino'),
            'transportista': data.get('transportista'),
            'observaciones': data.get('observaciones'),
            'responsable': data.get('responsable'),
            'creado_por': usuario_id
        }
        
        if data.get('id'):
            response = supabase.table('despachos')\
                .update(despacho_data)\
                .eq('id', data['id'])\
                .execute()
            return jsonify({'success': True, 'message': 'Despacho actualizado'})
        else:
            if not despacho_data['numero']:
                count_response = supabase.table('despachos')\
                    .select('id', count='exact')\
                    .execute()
                count = len(count_response.data) + 1
                despacho_data['numero'] = f"DESP-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(4)}"
            
            response = supabase.table('despachos').insert(despacho_data).execute()
            
            return jsonify({'success': True, 'message': 'Despacho creado'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DEVOLUCIONES - CRUD COMPLETO
# ============================================================

@ventas_bp.route('/ventas/api/devoluciones/listar', methods=['GET'])
@login_required
def api_devoluciones_listar():
    """Listar todas las devoluciones"""
    try:
        supabase = get_supabase()
        
        response = supabase.table('devoluciones')\
            .select('*')\
            .order('id', desc=True)\
            .execute()
        
        return jsonify({'success': True, 'data': response.data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# EXPORTAR DATOS
# ============================================================

@ventas_bp.route('/ventas/api/exportar/<tipo>', methods=['GET'])
@login_required
def api_exportar(tipo):
    """Exportar datos de un módulo"""
    try:
        return jsonify({'success': True, 'message': f'Exportación de {tipo} preparada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500