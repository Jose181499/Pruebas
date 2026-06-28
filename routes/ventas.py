from flask import Blueprint, render_template

ventas_bp = Blueprint('ventas', __name__)

@ventas_bp.route('/ventas')
def ventas():
    return render_template('ventas.html')
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import json
import os
from datetime import datetime

ventas_bp = Blueprint('ventas', __name__)

# ============================================================
# DECORADOR DE AUTENTICACIÓN
# ============================================================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# ============================================================
# RUTAS PRINCIPALES DEL MÓDULO VENTAS
# ============================================================

@ventas_bp.route('/ventas')
@login_required
def ventas():
    """Página principal del módulo Ventas"""
    tab = request.args.get('tab', 'cotizaciones')
    return render_template('ventas/index.html', 
                         active_tab=tab,
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

# ============================================================
# COTIZACIONES
# ============================================================

@ventas_bp.route('/ventas/cotizaciones')
@login_required
def cotizaciones():
    """Página de cotizaciones"""
    return render_template('ventas/cotizaciones.html',
                         active_tab='cotizaciones',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/cotizaciones/listar', methods=['GET'])
@login_required
def api_cotizaciones_listar():
    """Listar todas las cotizaciones"""
    try:
        # TODO: Conectar con base de datos
        # Por ahora, datos de ejemplo
        data = [
            {
                'id': 1,
                'fecha': '10/06/2026 16:57',
                'estado': 'Aceptada',
                'numero': 'COT-V010-20260610-0004',
                'ruc': '20114915026',
                'codCliente': 'CLI-000099',
                'razon': 'COMPAÑÍA MINERA ANTAPACCAY S.A.',
                'descripcion': 'Cable THHN 12 AWG',
                'monto': 110.00,
                'condicion': 'Crédito 30 días',
                'vendedor': 'Helen Blas Príncipe',
                'vencimiento': '25/06/2026'
            }
        ]
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/guardar', methods=['POST'])
@login_required
def api_cotizaciones_guardar():
    """Guardar una cotización (crear o actualizar)"""
    try:
        data = request.get_json()
        # TODO: Guardar en base de datos
        # Validar datos requeridos
        if not data.get('ruc'):
            return jsonify({'success': False, 'error': 'El RUC es obligatorio'}), 400
        if not data.get('razon'):
            return jsonify({'success': False, 'error': 'La razón social es obligatoria'}), 400
        
        # Generar número de cotización
        numero = f"COT-{datetime.now().strftime('%Y%m%d')}-{str(datetime.now().timestamp()).split('.')[0]}"
        
        return jsonify({
            'success': True,
            'message': 'Cotización guardada correctamente',
            'data': {'id': 1, 'numero': numero}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['GET'])
@login_required
def api_cotizaciones_obtener(id):
    """Obtener una cotización por ID"""
    try:
        # TODO: Obtener de base de datos
        data = {
            'id': id,
            'numero': f'COT-{datetime.now().strftime("%Y%m%d")}-0001',
            'ruc': '20114915026',
            'razon': 'COMPAÑÍA MINERA ANTAPACCAY S.A.',
            'estado': 'Borrador'
        }
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>/toggle', methods=['PUT'])
@login_required
def api_cotizaciones_toggle(id):
    """Cambiar estado de una cotización (Activar/Inactivar)"""
    try:
        # TODO: Actualizar en base de datos
        return jsonify({'success': True, 'message': 'Estado actualizado'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['DELETE'])
@login_required
def api_cotizaciones_eliminar(id):
    """Eliminar una cotización"""
    try:
        # TODO: Eliminar de base de datos
        return jsonify({'success': True, 'message': 'Cotización eliminada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# PEDIDO COMPRA (PC) - ACEPTACIÓN DEL CLIENTE
# ============================================================

@ventas_bp.route('/ventas/pedido-compra')
@login_required
def pedido_compra():
    """Página de PC Pedido Compras"""
    return render_template('ventas/pedido_compra.html',
                         active_tab='pedido_compra',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/pedido-compra/listar', methods=['GET'])
@login_required
def api_pedido_compra_listar():
    """Listar todos los PC del cliente"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/pedido-compra/guardar', methods=['POST'])
@login_required
def api_pedido_compra_guardar():
    """Guardar un PC del cliente"""
    try:
        data = request.get_json()
        return jsonify({'success': True, 'message': 'PC guardado correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DESPACHOS
# ============================================================

@ventas_bp.route('/ventas/despachar')
@login_required
def despachar():
    """Página de Despachos"""
    return render_template('ventas/despachar.html',
                         active_tab='despachar',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/despachos/listar', methods=['GET'])
@login_required
def api_despachos_listar():
    """Listar todos los despachos"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# GUÍAS DE REMISIÓN
# ============================================================

@ventas_bp.route('/ventas/guias')
@login_required
def guias():
    """Página de Guías de remisión"""
    return render_template('ventas/guias.html',
                         active_tab='guias',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/guias/listar', methods=['GET'])
@login_required
def api_guias_listar():
    """Listar todas las guías"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# COMPROBANTES (FACTURAS / BOLETAS)
# ============================================================

@ventas_bp.route('/ventas/comprobantes')
@login_required
def comprobantes():
    """Página de Comprobantes"""
    return render_template('ventas/comprobantes.html',
                         active_tab='comprobantes',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/comprobantes/listar', methods=['GET'])
@login_required
def api_comprobantes_listar():
    """Listar todos los comprobantes"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# NOTAS DE CRÉDITO
# ============================================================

@ventas_bp.route('/ventas/notas-credito')
@login_required
def notas_credito():
    """Página de Notas de crédito"""
    return render_template('ventas/notas_credito.html',
                         active_tab='notas_credito',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/notas-credito/listar', methods=['GET'])
@login_required
def api_notas_credito_listar():
    """Listar todas las notas de crédito"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DEVOLUCIONES
# ============================================================

@ventas_bp.route('/ventas/devoluciones')
@login_required
def devoluciones():
    """Página de Devoluciones"""
    return render_template('ventas/devoluciones.html',
                         active_tab='devoluciones',
                         usuario=session.get('usuario'),
                         nombre=session.get('nombre'),
                         empresa=session.get('empresa'))

@ventas_bp.route('/ventas/api/devoluciones/listar', methods=['GET'])
@login_required
def api_devoluciones_listar():
    """Listar todas las devoluciones"""
    try:
        data = []
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# UTILIDADES / CORRELATIVOS
# ============================================================

@ventas_bp.route('/ventas/api/correlativo', methods=['POST'])
@login_required
def api_generar_correlativo():
    """Generar un número de correlativo para documentos"""
    try:
        data = request.get_json()
        tipo = data.get('tipo', 'cotizacion')
        empresa = data.get('empresa', 'KCF')
        
        # TODO: Obtener correlativo de base de datos
        numero = f"{tipo.upper()}-{datetime.now().strftime('%Y%m%d')}-0001"
        
        return jsonify({'success': True, 'data': {'numero': numero}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# EXPORTAR DATOS
# ============================================================

@ventas_bp.route('/ventas/api/exportar/<tipo>', methods=['GET'])
@login_required
def api_exportar(tipo):
    """Exportar datos de un módulo a CSV/Excel"""
    try:
        # TODO: Generar archivo CSV/Excel
        return jsonify({'success': True, 'message': f'Exportación de {tipo} preparada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500