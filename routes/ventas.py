from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
from datetime import datetime
import json

# Importar desde database.py en lugar de config
from database import db_query, db_execute, db_tx, get_connection

ventas_bp = Blueprint('ventas', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# ============================================================
# FUNCIONES DE AYUDA PARA COTIZACIONES
# ============================================================

def obtener_cotizaciones_db():
    """Obtiene todas las cotizaciones desde la base de datos"""
    try:
        query = """
            SELECT 
                id, numero_cotizacion, cliente_id, fecha_creacion, estado,
                subtotal, igv, total, usuario_id, notas,
                forma_pago, tiempo_entrega, almacen, validez_oferta,
                codigo_cotizacion, correlativo, condicion_pago,
                direccion_entrega, requerimiento, nota_cotizacion,
                descuento_porcentaje, descuento_monto, descuento_tipo,
                contacto_cliente, telefono_cliente, email_cliente,
                created_at, updated_at
            FROM cotizaciones
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_cotizaciones_db: {e}")
        return []

def obtener_cotizacion_por_id_db(cotizacion_id):
    """Obtiene una cotización por su ID"""
    try:
        query = """
            SELECT 
                id, numero_cotizacion, cliente_id, fecha_creacion, estado,
                subtotal, igv, total, usuario_id, notas,
                forma_pago, tiempo_entrega, almacen, validez_oferta,
                codigo_cotizacion, correlativo, condicion_pago,
                direccion_entrega, requerimiento, nota_cotizacion,
                descuento_porcentaje, descuento_monto, descuento_tipo,
                contacto_cliente, telefono_cliente, email_cliente
            FROM cotizaciones
            WHERE id = %s
        """
        result = db_query(query, (cotizacion_id,))
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en obtener_cotizacion_por_id_db: {e}")
        return None

def guardar_cotizacion_db(data):
    """Guarda una nueva cotización"""
    try:
        query = """
            INSERT INTO cotizaciones (
                numero_cotizacion, cliente_id, fecha_creacion, estado,
                subtotal, igv, total, usuario_id, notas,
                forma_pago, tiempo_entrega, almacen, validez_oferta,
                codigo_cotizacion, correlativo, condicion_pago,
                direccion_entrega, requerimiento, nota_cotizacion,
                descuento_porcentaje, descuento_monto, descuento_tipo,
                contacto_cliente, telefono_cliente, email_cliente
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero_cotizacion
        """
        params = (
            data.get('numero_cotizacion'),
            data.get('cliente_id'),
            data.get('fecha_creacion') or datetime.now().isoformat(),
            data.get('estado', 'Borrador'),
            float(data.get('subtotal', 0)),
            float(data.get('igv', 0)),
            float(data.get('total', 0)),
            data.get('usuario_id'),
            data.get('notas', ''),
            data.get('forma_pago'),
            data.get('tiempo_entrega'),
            data.get('almacen'),
            data.get('validez_oferta'),
            data.get('codigo_cotizacion'),
            data.get('correlativo'),
            data.get('condicion_pago'),
            data.get('direccion_entrega'),
            data.get('requerimiento'),
            data.get('nota_cotizacion', ''),
            float(data.get('descuento_porcentaje', 0)),
            float(data.get('descuento_monto', 0)),
            data.get('descuento_tipo', 'porcentaje'),
            data.get('contacto_cliente'),
            data.get('telefono_cliente'),
            data.get('email_cliente')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_cotizacion_db: {e}")
        raise

def actualizar_cotizacion_db(cotizacion_id, data):
    """Actualiza una cotización existente"""
    try:
        query = """
            UPDATE cotizaciones SET
                cliente_id = %s,
                estado = %s,
                subtotal = %s,
                igv = %s,
                total = %s,
                usuario_id = %s,
                notas = %s,
                forma_pago = %s,
                tiempo_entrega = %s,
                almacen = %s,
                validez_oferta = %s,
                condicion_pago = %s,
                direccion_entrega = %s,
                requerimiento = %s,
                nota_cotizacion = %s,
                descuento_porcentaje = %s,
                descuento_monto = %s,
                descuento_tipo = %s,
                contacto_cliente = %s,
                telefono_cliente = %s,
                email_cliente = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, numero_cotizacion
        """
        params = (
            data.get('cliente_id'),
            data.get('estado', 'Borrador'),
            float(data.get('subtotal', 0)),
            float(data.get('igv', 0)),
            float(data.get('total', 0)),
            data.get('usuario_id'),
            data.get('notas', ''),
            data.get('forma_pago'),
            data.get('tiempo_entrega'),
            data.get('almacen'),
            data.get('validez_oferta'),
            data.get('condicion_pago'),
            data.get('direccion_entrega'),
            data.get('requerimiento'),
            data.get('nota_cotizacion', ''),
            float(data.get('descuento_porcentaje', 0)),
            float(data.get('descuento_monto', 0)),
            data.get('descuento_tipo', 'porcentaje'),
            data.get('contacto_cliente'),
            data.get('telefono_cliente'),
            data.get('email_cliente'),
            cotizacion_id
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en actualizar_cotizacion_db: {e}")
        raise

def actualizar_estado_cotizacion_db(cotizacion_id, nuevo_estado):
    """Actualiza el estado de una cotización"""
    try:
        query = """
            UPDATE cotizaciones 
            SET estado = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (nuevo_estado, cotizacion_id))
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en actualizar_estado_cotizacion_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA GUÍAS
# ============================================================

def obtener_guias_db():
    """Obtiene todas las guías"""
    try:
        query = """
            SELECT 
                id, serie, numero, fecha_emision, fecha_traslado,
                ruc_remitente, remitente_nombre, remitente_direccion,
                remitente_ubigeo, ruc_destinatario, destinatario_nombre,
                destinatario_direccion, destinatario_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni,
                conductor_nombre, licencia_conductor, transportista_ruc,
                transportista_nombre, motivo_traslado, documento_asociado,
                peso_total, items_json, observaciones, estado_sunat,
                cdr_response, sunat_response, creado_por, created_at, updated_at
            FROM guias_remision
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_guias_db: {e}")
        return []

def obtener_guia_por_id_db(guia_id):
    """Obtiene una guía por su ID"""
    try:
        query = """
            SELECT 
                id, serie, numero, fecha_emision, fecha_traslado,
                ruc_remitente, remitente_nombre, remitente_direccion,
                remitente_ubigeo, ruc_destinatario, destinatario_nombre,
                destinatario_direccion, destinatario_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni,
                conductor_nombre, licencia_conductor, transportista_ruc,
                transportista_nombre, motivo_traslado, documento_asociado,
                peso_total, items_json, observaciones, estado_sunat,
                cdr_response, sunat_response, creado_por
            FROM guias_remision
            WHERE id = %s
        """
        result = db_query(query, (guia_id,))
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en obtener_guia_por_id_db: {e}")
        return None

def guardar_guia_db(data):
    """Guarda una nueva guía"""
    try:
        query = """
            INSERT INTO guias_remision (
                serie, numero, fecha_emision, fecha_traslado,
                ruc_remitente, remitente_nombre, remitente_direccion,
                remitente_ubigeo, ruc_destinatario, destinatario_nombre,
                destinatario_direccion, destinatario_ubigeo,
                modalidad_transporte, placa_vehiculo, conductor_dni,
                conductor_nombre, licencia_conductor, transportista_ruc,
                transportista_nombre, motivo_traslado, documento_asociado,
                peso_total, items_json, observaciones, estado_sunat,
                creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero
        """
        params = (
            data.get('serie', 'T001'),
            data.get('numero'),
            data.get('fecha_emision') or datetime.now().date().isoformat(),
            data.get('fecha_traslado'),
            data.get('ruc_remitente'),
            data.get('remitente_nombre'),
            data.get('remitente_direccion'),
            data.get('remitente_ubigeo'),
            data.get('ruc_destinatario'),
            data.get('destinatario_nombre'),
            data.get('destinatario_direccion'),
            data.get('destinatario_ubigeo'),
            data.get('modalidad_transporte', 'PRIVADO'),
            data.get('placa_vehiculo'),
            data.get('conductor_dni'),
            data.get('conductor_nombre'),
            data.get('licencia_conductor'),
            data.get('transportista_ruc'),
            data.get('transportista_nombre'),
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado'),
            float(data.get('peso_total', 0)),
            data.get('items_json'),
            data.get('observaciones'),
            data.get('estado_sunat', 'BORRADOR'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_guia_db: {e}")
        raise

def actualizar_guia_db(guia_id, data):
    """Actualiza una guía existente"""
    try:
        query = """
            UPDATE guias_remision SET
                fecha_traslado = %s,
                ruc_destinatario = %s,
                destinatario_nombre = %s,
                destinatario_direccion = %s,
                destinatario_ubigeo = %s,
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
                estado_sunat = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, numero
        """
        params = (
            data.get('fecha_traslado'),
            data.get('ruc_destinatario'),
            data.get('destinatario_nombre'),
            data.get('destinatario_direccion'),
            data.get('destinatario_ubigeo'),
            data.get('placa_vehiculo'),
            data.get('conductor_dni'),
            data.get('conductor_nombre'),
            data.get('licencia_conductor'),
            data.get('transportista_ruc'),
            data.get('transportista_nombre'),
            data.get('motivo_traslado', 'VENTA'),
            data.get('documento_asociado'),
            float(data.get('peso_total', 0)),
            data.get('items_json'),
            data.get('observaciones'),
            data.get('estado_sunat', 'BORRADOR'),
            guia_id
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en actualizar_guia_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA COMPROBANTES
# ============================================================

def obtener_comprobantes_db():
    """Obtiene todos los comprobantes"""
    try:
        query = """
            SELECT 
                id, tipo_comprobante, serie, numero, fecha_emision,
                moneda, cliente_tipo_doc, cliente_numero_doc,
                cliente_nombre, cliente_direccion, cliente_email,
                cliente_telefono, subtotal, igv, total,
                items_json, observaciones, estado_sunat,
                sunat_response, cdr_response, creado_por,
                created_at, updated_at
            FROM comprobantes
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_comprobantes_db: {e}")
        return []

def guardar_comprobante_db(data):
    """Guarda un nuevo comprobante"""
    try:
        query = """
            INSERT INTO comprobantes (
                tipo_comprobante, serie, numero, fecha_emision,
                moneda, cliente_tipo_doc, cliente_numero_doc,
                cliente_nombre, cliente_direccion, cliente_email,
                cliente_telefono, subtotal, igv, total,
                items_json, observaciones, estado_sunat,
                creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, serie, numero
        """
        params = (
            data.get('tipo_comprobante', 'FACTURA'),
            data.get('serie', 'F001'),
            data.get('numero'),
            data.get('fecha_emision') or datetime.now().date().isoformat(),
            data.get('moneda', 'PEN'),
            data.get('cliente_tipo_doc', 'RUC'),
            data.get('cliente_numero_doc'),
            data.get('cliente_nombre'),
            data.get('cliente_direccion'),
            data.get('cliente_email'),
            data.get('cliente_telefono'),
            float(data.get('subtotal', 0)),
            float(data.get('igv', 0)),
            float(data.get('total', 0)),
            data.get('items_json'),
            data.get('observaciones'),
            data.get('estado_sunat', 'BORRADOR'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_comprobante_db: {e}")
        raise

def actualizar_estado_comprobante_db(comp_id, nuevo_estado):
    """Actualiza el estado de un comprobante"""
    try:
        query = """
            UPDATE comprobantes 
            SET estado_sunat = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado_sunat
        """
        result = db_query(query, (nuevo_estado, comp_id))
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en actualizar_estado_comprobante_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA NOTAS DE CRÉDITO
# ============================================================

def obtener_notas_credito_db():
    """Obtiene todas las notas de crédito"""
    try:
        query = """
            SELECT 
                id, serie, numero, fecha_emision, fecha_vencimiento,
                cliente_tipo_doc, cliente_numero_doc, cliente_nombre,
                cliente_direccion, cliente_email, cliente_telefono,
                comprobante_asociado, motivo, monto, observaciones,
                estado, creado_por, created_at, updated_at
            FROM notas_credito
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_notas_credito_db: {e}")
        return []

def guardar_nota_credito_db(data):
    """Guarda una nueva nota de crédito"""
    try:
        query = """
            INSERT INTO notas_credito (
                serie, numero, fecha_emision, fecha_vencimiento,
                cliente_tipo_doc, cliente_numero_doc, cliente_nombre,
                cliente_direccion, cliente_email, cliente_telefono,
                comprobante_asociado, motivo, monto, observaciones,
                estado, creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            RETURNING id, serie, numero
        """
        params = (
            data.get('serie', 'FC01'),
            data.get('numero'),
            data.get('fecha_emision') or datetime.now().date().isoformat(),
            data.get('fecha_vencimiento'),
            data.get('cliente_tipo_doc', 'RUC'),
            data.get('cliente_numero_doc'),
            data.get('cliente_nombre'),
            data.get('cliente_direccion'),
            data.get('cliente_email'),
            data.get('cliente_telefono'),
            data.get('comprobante_asociado'),
            data.get('motivo'),
            float(data.get('monto', 0)),
            data.get('observaciones'),
            data.get('estado', 'Borrador'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_nota_credito_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA PEDIDO COMPRA (PC)
# ============================================================

def obtener_pc_db():
    """Obtiene todos los pedidos de compra"""
    try:
        query = """
            SELECT 
                id, numero, fecha, estado, cliente, ruc, monto,
                cotizacion_id, cotizacion_numero, correo_origen,
                fecha_recepcion, fecha_despacho, archivo_oc,
                observaciones, valida_precios, valida_cantidades,
                valida_stock, valida_entrega, valida_montos,
                responsable, lugar_entrega, condicion_atencion,
                created_at, updated_at
            FROM pedido_compra_pc
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_pc_db: {e}")
        return []

def guardar_pc_db(data):
    """Guarda un nuevo pedido de compra"""
    try:
        query = """
            INSERT INTO pedido_compra_pc (
                numero, fecha, estado, cliente, ruc, monto,
                cotizacion_id, cotizacion_numero, correo_origen,
                fecha_recepcion, fecha_despacho, archivo_oc,
                observaciones, valida_precios, valida_cantidades,
                valida_stock, valida_entrega, valida_montos,
                responsable, lugar_entrega, condicion_atencion,
                creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero
        """
        params = (
            data.get('numero'),
            data.get('fecha') or datetime.now().isoformat(),
            data.get('estado', 'Pendiente'),
            data.get('cliente'),
            data.get('ruc'),
            float(data.get('monto', 0)),
            data.get('cotizacion_id'),
            data.get('cotizacion_numero'),
            data.get('correo_origen'),
            data.get('fecha_recepcion'),
            data.get('fecha_despacho'),
            data.get('archivo_oc'),
            data.get('observaciones'),
            data.get('valida_precios', False),
            data.get('valida_cantidades', False),
            data.get('valida_stock', False),
            data.get('valida_entrega', False),
            data.get('valida_montos', False),
            data.get('responsable', 'Hellen'),
            data.get('lugar_entrega'),
            data.get('condicion_atencion'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_pc_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA DESPACHOS
# ============================================================

def obtener_despachos_db():
    """Obtiene todos los despachos"""
    try:
        query = """
            SELECT 
                id, numero, fecha, fecha_despacho, estado,
                pc_id, pc_numero, cotizacion_id, cotizacion_numero,
                cliente, ruc, comprobante, guia, origen, destino,
                transportista, observaciones, responsable,
                created_at, updated_at
            FROM despachos
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_despachos_db: {e}")
        return []

def guardar_despacho_db(data):
    """Guarda un nuevo despacho"""
    try:
        query = """
            INSERT INTO despachos (
                numero, fecha, fecha_despacho, estado,
                pc_id, pc_numero, cotizacion_id, cotizacion_numero,
                cliente, ruc, comprobante, guia, origen, destino,
                transportista, observaciones, responsable,
                creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero
        """
        params = (
            data.get('numero'),
            data.get('fecha') or datetime.now().isoformat(),
            data.get('fecha_despacho'),
            data.get('estado', 'Pendiente despacho'),
            data.get('pc_id'),
            data.get('pc_numero'),
            data.get('cotizacion_id'),
            data.get('cotizacion_numero'),
            data.get('cliente'),
            data.get('ruc'),
            data.get('comprobante'),
            data.get('guia'),
            data.get('origen', 'ALM-SMP'),
            data.get('destino'),
            data.get('transportista'),
            data.get('observaciones'),
            data.get('responsable'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_despacho_db: {e}")
        raise

# ============================================================
# FUNCIONES DE AYUDA PARA DEVOLUCIONES
# ============================================================

def obtener_devoluciones_db():
    """Obtiene todas las devoluciones"""
    try:
        query = """
            SELECT 
                id, numero, fecha, estado, ruc, cliente,
                comprobante_id, comprobante_numero, guia, motivo,
                monto, observaciones, creado_por, created_at, updated_at
            FROM devoluciones
            ORDER BY id DESC
        """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_devoluciones_db: {e}")
        return []

def guardar_devolucion_db(data):
    """Guarda una nueva devolución"""
    try:
        query = """
            INSERT INTO devoluciones (
                numero, fecha, estado, ruc, cliente,
                comprobante_id, comprobante_numero, guia, motivo,
                monto, observaciones, creado_por
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero
        """
        params = (
            data.get('numero'),
            data.get('fecha') or datetime.now().isoformat(),
            data.get('estado', 'Pendiente'),
            data.get('ruc'),
            data.get('cliente'),
            data.get('comprobante_id'),
            data.get('comprobante_numero'),
            data.get('guia'),
            data.get('motivo'),
            float(data.get('monto', 0)),
            data.get('observaciones'),
            data.get('creado_por')
        )
        result = db_query(query, params)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en guardar_devolucion_db: {e}")
        raise

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
# COTIZACIONES - API
# ============================================================

@ventas_bp.route('/ventas/api/cotizaciones/listar', methods=['GET'])
@login_required
def api_cotizaciones_listar():
    try:
        data = obtener_cotizaciones_db()
        # Formatear datos para el frontend
        formatted_data = []
        for row in data:
            formatted_data.append({
                'id': row.get('id'),
                'numero': row.get('numero_cotizacion') or row.get('codigo_cotizacion'),
                'fecha': row.get('fecha_creacion'),
                'estado': row.get('estado'),
                'ruc': row.get('cliente_id'),
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
        return jsonify({'success': True, 'data': formatted_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/guardar', methods=['POST'])
@login_required
def api_cotizaciones_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        
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
        
        if data.get('id'):
            result = actualizar_cotizacion_db(data['id'], cotizacion_data)
            if result:
                return jsonify({'success': True, 'message': 'Cotización actualizada', 'data': {'id': data['id']}})
            return jsonify({'success': False, 'error': 'No se pudo actualizar'}), 400
        
        # Generar número de cotización
        count_data = db_query("SELECT COUNT(*) as total FROM cotizaciones")
        count = count_data[0]['total'] + 1 if count_data else 1
        numero = f"COT-{str(count).zfill(6)}"
        cotizacion_data['numero_cotizacion'] = numero
        cotizacion_data['codigo_cotizacion'] = f"COT-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(4)}"
        cotizacion_data['correlativo'] = count
        
        result = guardar_cotizacion_db(cotizacion_data)
        if result:
            return jsonify({
                'success': True,
                'message': 'Cotización creada correctamente',
                'data': {'id': result['id'], 'numero': numero}
            })
        return jsonify({'success': False, 'error': 'No se pudo crear'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['GET'])
@login_required
def api_cotizaciones_obtener(id):
    try:
        data = obtener_cotizacion_por_id_db(id)
        if data:
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'error': 'Cotización no encontrada'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>/toggle', methods=['PUT'])
@login_required
def api_cotizaciones_toggle(id):
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        result = actualizar_estado_cotizacion_db(id, nuevo_estado)
        if result:
            return jsonify({'success': True, 'message': f'Estado actualizado a {nuevo_estado}'})
        return jsonify({'success': False, 'error': 'No se pudo actualizar'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>', methods=['DELETE'])
@login_required
def api_cotizaciones_eliminar(id):
    try:
        result = actualizar_estado_cotizacion_db(id, 'Eliminada')
        if result:
            return jsonify({'success': True, 'message': 'Cotización eliminada'})
        return jsonify({'success': False, 'error': 'No se pudo eliminar'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# GUÍAS - API
# ============================================================

@ventas_bp.route('/ventas/api/guias/listar', methods=['GET'])
@login_required
def api_guias_listar():
    try:
        data = obtener_guias_db()
        formatted_data = []
        for row in data:
            items = []
            try:
                if row.get('items_json'):
                    items = json.loads(row.get('items_json'))
            except:
                pass
            formatted_data.append({
                'id': row.get('id'),
                'serie': row.get('serie'),
                'numero': row.get('numero'),
                'fecha': row.get('fecha_emision'),
                'fecha_traslado': row.get('fecha_traslado'),
                'estado': row.get('estado_sunat') or row.get('estado'),
                'ruc': row.get('ruc_destinatario'),
                'cliente': row.get('destinatario_nombre'),
                'cotizacion': row.get('documento_asociado'),
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
        return jsonify({'success': True, 'data': formatted_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/guardar', methods=['POST'])
@login_required
def api_guias_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        
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
            'creado_por': usuario_id
        }
        
        if not guia_data['numero']:
            count_data = db_query("SELECT COUNT(*) as total FROM guias_remision")
            count = count_data[0]['total'] + 1 if count_data else 1
            guia_data['numero'] = str(count)
        
        if data.get('id'):
            result = actualizar_guia_db(data['id'], guia_data)
            if result:
                return jsonify({'success': True, 'message': 'Guía actualizada'})
            return jsonify({'success': False, 'error': 'No se pudo actualizar'}), 400
        
        result = guardar_guia_db(guia_data)
        if result:
            return jsonify({'success': True, 'message': 'Guía creada', 'data': {'id': result['id']}})
        return jsonify({'success': False, 'error': 'No se pudo crear'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/<int:id>', methods=['GET'])
@login_required
def api_guias_obtener(id):
    try:
        data = obtener_guia_por_id_db(id)
        if data:
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/guias/<int:id>', methods=['DELETE'])
@login_required
def api_guias_eliminar(id):
    try:
        result = actualizar_guia_db(id, {'estado_sunat': 'ANULADA'})
        if result:
            return jsonify({'success': True, 'message': 'Guía anulada'})
        return jsonify({'success': False, 'error': 'No se pudo anular'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# COMPROBANTES - API
# ============================================================

@ventas_bp.route('/ventas/api/comprobantes/listar', methods=['GET'])
@login_required
def api_comprobantes_listar():
    try:
        data = obtener_comprobantes_db()
        formatted_data = []
        for row in data:
            items = []
            try:
                if row.get('items_json'):
                    items = json.loads(row.get('items_json'))
            except:
                pass
            formatted_data.append({
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
        return jsonify({'success': True, 'data': formatted_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/comprobantes/guardar', methods=['POST'])
@login_required
def api_comprobantes_guardar():
    try:
        data = request.get_json()
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
            'creado_por': usuario_id
        }
        
        if data.get('id'):
            # Actualizar
            query = """
                UPDATE comprobantes SET
                    tipo_comprobante = %s, serie = %s, numero = %s,
                    fecha_emision = %s, moneda = %s,
                    cliente_tipo_doc = %s, cliente_numero_doc = %s,
                    cliente_nombre = %s, cliente_direccion = %s,
                    cliente_email = %s, cliente_telefono = %s,
                    subtotal = %s, igv = %s, total = %s,
                    items_json = %s, observaciones = %s,
                    estado_sunat = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, serie, numero
            """
            params = (
                comprobante_data['tipo_comprobante'],
                comprobante_data['serie'],
                comprobante_data['numero'],
                comprobante_data['fecha_emision'],
                comprobante_data['moneda'],
                comprobante_data['cliente_tipo_doc'],
                comprobante_data['cliente_numero_doc'],
                comprobante_data['cliente_nombre'],
                comprobante_data['cliente_direccion'],
                comprobante_data['cliente_email'],
                comprobante_data['cliente_telefono'],
                comprobante_data['subtotal'],
                comprobante_data['igv'],
                comprobante_data['total'],
                comprobante_data['items_json'],
                comprobante_data['observaciones'],
                comprobante_data['estado_sunat'],
                data['id']
            )
            result = db_query(query, params)
            if result:
                return jsonify({'success': True, 'message': 'Comprobante actualizado', 'data': result[0]})
            return jsonify({'success': False, 'error': 'No se pudo actualizar'}), 400
        
        # Crear nuevo
        if not comprobante_data['numero']:
            count_data = db_query("SELECT COUNT(*) as total FROM comprobantes")
            count = count_data[0]['total'] + 1 if count_data else 1
            comprobante_data['numero'] = str(count)
        
        result = guardar_comprobante_db(comprobante_data)
        if result:
            return jsonify({'success': True, 'message': 'Comprobante creado', 'data': result})
        return jsonify({'success': False, 'error': 'No se pudo crear'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/comprobantes/<int:id>', methods=['DELETE'])
@login_required
def api_comprobantes_eliminar(id):
    try:
        result = actualizar_estado_comprobante_db(id, 'ANULADO')
        if result:
            return jsonify({'success': True, 'message': 'Comprobante anulado'})
        return jsonify({'success': False, 'error': 'No se pudo anular'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# NOTAS DE CRÉDITO - API
# ============================================================

@ventas_bp.route('/ventas/api/notas-credito/listar', methods=['GET'])
@login_required
def api_notas_credito_listar():
    try:
        data = obtener_notas_credito_db()
        formatted_data = []
        for row in data:
            formatted_data.append({
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
        return jsonify({'success': True, 'data': formatted_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/notas-credito/guardar', methods=['POST'])
@login_required
def api_notas_credito_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        data['creado_por'] = usuario_id
        
        if not data.get('numero'):
            count_data = db_query("SELECT COUNT(*) as total FROM notas_credito")
            count = count_data[0]['total'] + 1 if count_data else 1
            data['numero'] = str(count)
        
        result = guardar_nota_credito_db(data)
        if result:
            return jsonify({'success': True, 'message': 'Nota de crédito creada', 'data': result})
        return jsonify({'success': False, 'error': 'No se pudo crear'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# PEDIDO COMPRA (PC) - API
# ============================================================

@ventas_bp.route('/ventas/api/pedido-compra/listar', methods=['GET'])
@login_required
def api_pedido_compra_listar():
    try:
        data = obtener_pc_db()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/pedido-compra/guardar', methods=['POST'])
@login_required
def api_pedido_compra_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        data['creado_por'] = usuario_id
        
        if not data.get('numero'):
            data['numero'] = f"PC-{datetime.now().strftime('%Y%m%d')}-{str(datetime.now().timestamp()).split('.')[0][-4:]}"
        
        result = guardar_pc_db(data)
        if result:
            return jsonify({'success': True, 'message': 'PC guardado', 'data': result})
        return jsonify({'success': False, 'error': 'No se pudo guardar'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DESPACHOS - API
# ============================================================

@ventas_bp.route('/ventas/api/despachos/listar', methods=['GET'])
@login_required
def api_despachos_listar():
    try:
        data = obtener_despachos_db()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/despachos/guardar', methods=['POST'])
@login_required
def api_despachos_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        data['creado_por'] = usuario_id
        
        if not data.get('numero'):
            data['numero'] = f"DESP-{datetime.now().strftime('%Y%m%d')}-{str(datetime.now().timestamp()).split('.')[0][-4:]}"
        
        result = guardar_despacho_db(data)
        if result:
            return jsonify({'success': True, 'message': 'Despacho guardado', 'data': result})
        return jsonify({'success': False, 'error': 'No se pudo guardar'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DEVOLUCIONES - API
# ============================================================

@ventas_bp.route('/ventas/api/devoluciones/listar', methods=['GET'])
@login_required
def api_devoluciones_listar():
    try:
        data = obtener_devoluciones_db()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ventas_bp.route('/ventas/api/devoluciones/guardar', methods=['POST'])
@login_required
def api_devoluciones_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8)
        data['creado_por'] = usuario_id
        
        if not data.get('numero'):
            data['numero'] = f"DEV-{datetime.now().strftime('%Y%m%d')}-{str(datetime.now().timestamp()).split('.')[0][-4:]}"
        
        result = guardar_devolucion_db(data)
        if result:
            return jsonify({'success': True, 'message': 'Devolución guardada', 'data': result})
        return jsonify({'success': False, 'error': 'No se pudo guardar'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# EXPORTAR DATOS
# ============================================================

@ventas_bp.route('/ventas/api/exportar/<tipo>', methods=['GET'])
@login_required
def api_exportar(tipo):
    try:
        return jsonify({'success': True, 'message': f'Exportación de {tipo} preparada'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500