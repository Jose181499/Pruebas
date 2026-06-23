from flask import Blueprint, render_template, jsonify, request, session, flash
from functools import wraps
from datetime import datetime, date

# Crear el Blueprint para finanzas
finanzas_bp = Blueprint('finanzas', __name__, url_prefix='/finanzas')

# ==========================================
# RUTAS DE VISTAS (Páginas HTML)
# ==========================================

@finanzas_bp.route('/cuentas-por-pagar')
def cuentas_por_pagar():
    """Vista de cuentas por pagar"""
    return render_template('finanzas/cuentas_por_pagar.html')

@finanzas_bp.route('/cuentas-por-cobrar')
def cuentas_por_cobrar():
    """Vista de cuentas por cobrar"""
    return render_template('finanzas/cuentas_por_cobrar.html')

@finanzas_bp.route('/tesoreria')
def tesoreria():
    """Vista de tesorería"""
    return render_template('finanzas/tesoreria.html')

@finanzas_bp.route('/bancos')
def bancos():
    """Vista de bancos y cuentas"""
    return render_template('finanzas/bancos.html')

# ==========================================
# APIS PARA DATOS DINÁMICOS
# ==========================================

@finanzas_bp.route('/api/cuentas-por-pagar', methods=['GET'])
def api_cuentas_por_pagar():
    """API para obtener datos de cuentas por pagar"""
    try:
        # 🔥 AQUÍ DEBES CONECTAR A TU BASE DE DATOS 🔥
        # Ejemplo con tu database.py:
        # from database import obtener_facturas_por_pagar
        # facturas = obtener_facturas_por_pagar()
        
        # Datos de ejemplo (reemplazar con datos reales de la BD)
        facturas = [
            {
                'id': 1,
                'proveedor': 'Soluciones Industriales SAC',
                'ruc': '20100012345',
                'rubro': 'Suministros industriales',
                'factura': 'F002-231',
                'oc': 'OC-8821',
                'moneda': 'PEN',
                'emision': '2026-07-02',
                'vencimiento': '2026-07-02',
                'condicion': 'Contado',
                'total': 6500.00,
                'pagado': 0,
                'responsable': 'Edith',
                'estado': 'Contado pendiente',
                'pdf': 'factura_F002-231.pdf',
                'ocPdf': 'oc_OC-8821.pdf',
                'voucher': None,
                'hist': ['Factura registrada desde OC-8821. Pendiente pago contado.']
            },
            {
                'id': 2,
                'proveedor': 'Importaciones Delta',
                'ruc': '20567890123',
                'rubro': 'Importaciones',
                'factura': 'F001-118',
                'oc': 'OC-8780',
                'moneda': 'USD',
                'emision': '2026-06-28',
                'vencimiento': '2026-07-28',
                'condicion': '50/50',
                'total': 4000.00,
                'pagado': 2000.00,
                'responsable': 'Helen',
                'estado': 'Pago parcial',
                'pdf': 'factura_F001-118.pdf',
                'ocPdf': 'oc_OC-8780.pdf',
                'voucher': 'voucher_parcial_delta.pdf',
                'hist': ['Se pagó 50% inicial. Queda saldo a crédito 30 días.']
            },
            {
                'id': 3,
                'proveedor': 'Servicios Logísticos Perú',
                'ruc': '20600456789',
                'rubro': 'Logística',
                'factura': 'F003-420',
                'oc': 'OC-8701',
                'moneda': 'PEN',
                'emision': '2026-07-01',
                'vencimiento': '2026-07-31',
                'condicion': 'Crédito 30',
                'total': 3800.00,
                'pagado': 0,
                'responsable': 'Helen',
                'estado': 'Por vencer',
                'pdf': 'factura_F003-420.pdf',
                'ocPdf': 'oc_OC-8701.pdf',
                'voucher': None,
                'hist': ['Proveedor con crédito 30 días.']
            },
            {
                'id': 4,
                'proveedor': 'Metalúrgica Andina',
                'ruc': '20123456780',
                'rubro': 'Mantenimiento',
                'factura': 'F004-105',
                'oc': 'OC-8514',
                'moneda': 'PEN',
                'emision': '2026-06-10',
                'vencimiento': '2026-07-10',
                'condicion': 'Cheque 30',
                'total': 8900.00,
                'pagado': 0,
                'responsable': 'Edith',
                'estado': 'Vencida con penalidad',
                'pdf': 'factura_F004-105.pdf',
                'ocPdf': 'oc_OC-8514.pdf',
                'voucher': None,
                'hist': ['Proveedor informa penalidad por atraso en cheque. Pago urgente.']
            },
            {
                'id': 5,
                'proveedor': 'Equipos Mineros SAC',
                'ruc': '20456789012',
                'rubro': 'Equipos mineros',
                'factura': 'F002-067',
                'oc': 'OC-8550',
                'moneda': 'USD',
                'emision': '2026-06-15',
                'vencimiento': '2026-06-15',
                'condicion': 'Contado',
                'total': 1200.00,
                'pagado': 1200.00,
                'responsable': 'Helen',
                'estado': 'Pagada',
                'pdf': 'factura_F002-067.pdf',
                'ocPdf': 'oc_OC-8550.pdf',
                'voucher': 'voucher_equipos_mineros.pdf',
                'hist': ['Pago completo registrado con voucher.']
            }
        ]
        
        # Calcular totales
        total_por_pagar = sum(f['total'] - f['pagado'] for f in facturas)
        vencido = sum(f['total'] - f['pagado'] for f in facturas if f['estado'] in ['Vencida con penalidad', 'Crítica'])
        por_vencer = sum(f['total'] - f['pagado'] for f in facturas if f['estado'] in ['Por vencer', 'Vence hoy'])
        pagado_mes = sum(f['pagado'] for f in facturas)
        proveedores_criticos = len([f for f in facturas if f['estado'] in ['Crítica', 'Vencida con penalidad']])
        
        return jsonify({
            'success': True,
            'data': {
                'total_por_pagar': total_por_pagar,
                'vencido': vencido,
                'por_vencer': por_vencer,
                'pagado_mes': pagado_mes,
                'proveedores_criticos': proveedores_criticos,
                'facturas': facturas
            }
        })
        
    except Exception as e:
        print(f"❌ Error en api_cuentas_por_pagar: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@finanzas_bp.route('/api/cuentas-por-cobrar', methods=['GET'])
def api_cuentas_por_cobrar():
    """API para obtener datos de cuentas por cobrar"""
    try:
        # 🔥 AQUÍ DEBES CONECTAR A TU BASE DE DATOS 🔥
        # from database import obtener_facturas_por_cobrar
        # facturas = obtener_facturas_por_cobrar()
        
        facturas = [
            {
                'id': 1,
                'cliente': 'Komatsu',
                'codigo': 'CLI-001',
                'ruc': '20100000000',
                'factura': 'F001-123',
                'pc': 'OC-5521',
                'emision': '2026-06-01',
                'vencimiento': '2026-08-30',
                'condicion': 'Crédito 90',
                'total': 4500.00,
                'pagado': 0,
                'estado': 'Por vencer',
                'hist': ['Factura generada automáticamente.']
            },
            {
                'id': 2,
                'cliente': 'Cliente B',
                'codigo': 'CLI-002',
                'ruc': '20500000000',
                'factura': 'F001-124',
                'pc': 'OC-9981',
                'emision': '2026-04-01',
                'vencimiento': '2026-06-30',
                'condicion': 'Crédito 90',
                'total': 2000.00,
                'pagado': 500.00,
                'estado': 'Pago parcial',
                'hist': ['Abono parcial registrado.']
            },
            {
                'id': 3,
                'cliente': 'Constructora Andina SAC',
                'codigo': 'CLI-003',
                'ruc': '20600000000',
                'factura': 'F001-110',
                'pc': 'OC-3344',
                'emision': '2026-03-15',
                'vencimiento': '2026-06-15',
                'condicion': 'Crédito 90',
                'total': 3200.00,
                'pagado': 0,
                'estado': 'Vencida',
                'hist': ['Se envió recordatorio por correo.']
            }
        ]
        
        total_por_cobrar = sum(f['total'] - f['pagado'] for f in facturas)
        vencido = sum(f['total'] - f['pagado'] for f in facturas if f['estado'] == 'Vencida')
        por_vencer = sum(f['total'] - f['pagado'] for f in facturas if f['estado'] == 'Por vencer')
        cobrado_mes = sum(f['pagado'] for f in facturas)
        clientes_criticos = len([f for f in facturas if f['estado'] == 'Vencida'])
        
        return jsonify({
            'success': True,
            'data': {
                'total_por_cobrar': total_por_cobrar,
                'vencido': vencido,
                'por_vencer': por_vencer,
                'cobrado_mes': cobrado_mes,
                'clientes_criticos': clientes_criticos,
                'facturas': facturas
            }
        })
        
    except Exception as e:
        print(f"❌ Error en api_cuentas_por_cobrar: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@finanzas_bp.route('/api/registrar-pago', methods=['POST'])
def api_registrar_pago():
    """Registrar un nuevo pago"""
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('factura_id'):
            return jsonify({'success': False, 'error': 'ID de factura requerido'})
        
        if not data.get('monto') or float(data.get('monto', 0)) <= 0:
            return jsonify({'success': False, 'error': 'Monto válido requerido'})
        
        if not data.get('fecha_pago'):
            return jsonify({'success': False, 'error': 'Fecha de pago requerida'})
        
        factura_id = data.get('factura_id')
        monto = float(data.get('monto'))
        fecha_pago = data.get('fecha_pago')
        medio_pago = data.get('medio_pago', 'Transferencia')
        banco = data.get('banco', 'BCP')
        numero_operacion = data.get('numero_operacion', '')
        comentario = data.get('comentario', '')
        
        # 🔥 AQUÍ DEBES GUARDAR EN TU BASE DE DATOS 🔥
        # from database import guardar_pago
        # pago_id = guardar_pago(factura_id, monto, fecha_pago, medio_pago, banco, numero_operacion, comentario)
        # 
        # Ejemplo:
        # pago_id = 123  # ID generado por la BD
        # saldo_restante = actualizar_saldo_factura(factura_id, monto)
        
        # Simulación de guardado
        print(f"💳 Pago registrado:")
        print(f"   Factura ID: {factura_id}")
        print(f"   Monto: S/ {monto}")
        print(f"   Fecha: {fecha_pago}")
        print(f"   Medio: {medio_pago}")
        print(f"   Banco: {banco}")
        print(f"   Operación: {numero_operacion}")
        print(f"   Comentario: {comentario}")
        
        # Calcular saldo restante (simulado)
        # En producción esto vendría de la BD
        saldo_restante = 2500.00  # Calcular desde DB
        
        return jsonify({
            'success': True,
            'message': 'Pago registrado correctamente',
            'data': {
                'pago_id': 123,
                'factura_id': factura_id,
                'monto': monto,
                'fecha': fecha_pago,
                'saldo_restante': saldo_restante
            }
        })
        
    except Exception as e:
        print(f"❌ Error en api_registrar_pago: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@finanzas_bp.route('/api/resumen-financiero', methods=['GET'])
def api_resumen_financiero():
    """Obtener resumen financiero general"""
    try:
        # 🔥 AQUÍ DEBES CONECTAR A TU BASE DE DATOS 🔥
        # from database import obtener_resumen_financiero
        # resumen = obtener_resumen_financiero()
        
        resumen = {
            'total_por_cobrar': 32000.00,
            'total_por_pagar': 28500.00,
            'flujo_efectivo': 3500.00,
            'vencido_cobrar': 15000.00,
            'vencido_pagar': 12400.00,
            'proyeccion_mes': 45000.00
        }
        
        return jsonify({'success': True, 'data': resumen})
        
    except Exception as e:
        print(f"❌ Error en api_resumen_financiero: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==========================================
# FUNCIONES DE UTILIDAD PARA FINANZAS
# ==========================================

def formato_moneda(valor, moneda='PEN'):
    """Formatear moneda para mostrar en vistas"""
    try:
        valor = float(valor) if valor else 0
        if moneda == 'USD':
            return f"$ {valor:,.2f}"
        return f"S/ {valor:,.2f}"
    except:
        return "S/ 0.00"


def calcular_dias_vencimiento(fecha_vencimiento):
    """Calcular días hasta vencimiento"""
    try:
        if isinstance(fecha_vencimiento, str):
            fecha_vencimiento = datetime.strptime(fecha_vencimiento, '%Y-%m-%d').date()
        
        hoy = date.today()
        dias = (fecha_vencimiento - hoy).days
        return dias
    except:
        return 0


# ==========================================
# DECORADOR DE PERMISOS PARA FINANZAS
# ==========================================

def requiere_permiso_finanzas(modulo, accion="ver"):
    """Decorador para verificar permisos en módulos de finanzas"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "usuario" not in session:
                flash("Debes iniciar sesión para acceder", "error")
                return redirect(url_for("login"))
            
            # Administrador tiene acceso total
            if session.get("rol") == "administrador":
                return f(*args, **kwargs)
            
            # Usuario normal: permisos limitados
            if session.get("rol") == "usuario":
                permisos_finanzas = {
                    "cuentas_pagar": ["ver"],
                    "cuentas_cobrar": ["ver"],
                    "tesoreria": ["ver"],
                    "bancos": ["ver"],
                    "pagos": ["crear", "ver"]
                }
                
                if modulo in permisos_finanzas and accion in permisos_finanzas[modulo]:
                    return f(*args, **kwargs)
            
            flash("No tienes permisos para acceder a esta sección", "error")
            return redirect(url_for("index"))
        
        return decorated_function
    return decorator