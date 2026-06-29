from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
from datetime import datetime
import json

# Importar desde database.py en lugar de config
from database import db_query, db_execute, db_tx, get_connection, buscar_cliente_por_ruc

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

def obtener_cotizaciones_db():
    """Obtiene todas las cotizaciones desde la base de datos"""
    try:
        query = """
            SELECT 
                c.id, 
                c.numero_cotizacion, 
                c.cliente_id, 
                c.fecha_creacion, 
                c.estado,
                c.subtotal, 
                c.igv, 
                c.total, 
                c.usuario_id, 
                c.notas,
                c.forma_pago, 
                c.tiempo_entrega, 
                c.almacen, 
                c.validez_oferta,
                c.codigo_cotizacion, 
                c.correlativo, 
                c.condicion_pago,
                c.direccion_entrega, 
                c.requerimiento, 
                c.nota_cotizacion,
                c.descuento_porcentaje, 
                c.descuento_monto, 
                c.descuento_tipo,
                c.contacto_cliente, 
                c.telefono_cliente, 
                c.email_cliente,
                -- Obtener datos del cliente
                cl.razon_social as cliente_razon_social,
                cl.numero_documento as cliente_ruc,
                cl.nombre_comercial as cliente_nombre_comercial
            FROM cotizaciones c
            LEFT JOIN clientes cl ON cl.id = c.cliente_id::integer
            ORDER BY c.id DESC
        """
        results = db_query(query)
        
        # Formatear fechas y datos
        for row in results:
            # Formatear fecha_creacion
            if row.get('fecha_creacion'):
                if hasattr(row['fecha_creacion'], 'strftime'):
                    row['fecha_creacion'] = row['fecha_creacion'].strftime('%d/%m/%Y %H:%M')
                elif isinstance(row['fecha_creacion'], str):
                    try:
                        if 'T' in row['fecha_creacion']:
                            dt = datetime.fromisoformat(row['fecha_creacion'].replace('Z', '+00:00'))
                        else:
                            dt = datetime.strptime(row['fecha_creacion'], '%Y-%m-%d %H:%M:%S.%f')
                        row['fecha_creacion'] = dt.strftime('%d/%m/%Y %H:%M')
                    except:
                        try:
                            dt = datetime.strptime(row['fecha_creacion'], '%Y-%m-%d %H:%M:%S')
                            row['fecha_creacion'] = dt.strftime('%d/%m/%Y %H:%M')
                        except:
                            pass
            
            # Si no hay cliente_razon_social, usar un valor por defecto
            if not row.get('cliente_razon_social'):
                row['cliente_razon_social'] = f"Cliente {row.get('cliente_id', '')}"
            
            # Si no hay cliente_ruc, usar cliente_id como RUC (fallback)
            if not row.get('cliente_ruc'):
                row['cliente_ruc'] = str(row.get('cliente_id', ''))
        
        return results
    except Exception as e:
        print(f"❌ Error en obtener_cotizaciones_db: {e}")
        import traceback
        traceback.print_exc()
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
        
        print(f"📝 INSERT params: {params}")
        result = db_query(query, params)
        print(f"📦 INSERT result: {result}")
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
        print("🔍 API COTIZACIONES LLAMADA")
        
        data = obtener_cotizaciones_db()
        print(f"📊 Cotizaciones encontradas: {len(data)}")
        
        formatted_data = []
        for row in data:
            formatted_data.append({
                'id': row.get('id'),
                'numero': row.get('numero_cotizacion') or row.get('codigo_cotizacion'),
                'fecha': row.get('fecha_creacion'),
                'estado': row.get('estado'),
                'ruc': row.get('cliente_ruc') or str(row.get('cliente_id', '')),
                'razon': row.get('cliente_razon_social') or row.get('cliente_nombre_comercial') or f"Cliente {row.get('cliente_id', '')}",
                'descripcion': row.get('nota_cotizacion') or row.get('notas') or 'Sin descripción',
                'monto': float(row.get('total', 0)),
                'subtotal': float(row.get('subtotal', 0)),
                'igv': float(row.get('igv', 0)),
                'condicion': row.get('condicion_pago') or row.get('forma_pago'),
                'vendedor': str(row.get('usuario_id', '')),
                'vencimiento': row.get('validez_oferta'),
                'cod_cliente': str(row.get('cliente_id', '')),
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
        
        print(f"✅ Datos formateados: {len(formatted_data)} cotizaciones")
        return jsonify({'success': True, 'data': formatted_data})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
      


@ventas_bp.route('/ventas/api/cotizaciones/guardar', methods=['POST'])
@login_required
def api_cotizaciones_guardar():
    try:
        data = request.get_json()
        usuario_id = session.get('usuario_id', 8) or data.get('usuario_id', 8)
        
        print("=" * 80)
        print("📦 API COTIZACIONES GUARDAR")
        print(f"  - cliente_id: {data.get('cliente_id')}")
        print(f"  - usuario_id: {usuario_id}")
        print(f"  - estado: {data.get('estado')}")
        print(f"  - total: {data.get('total')}")
        print(f"  - productos: {len(data.get('productos', []))}")
        print("=" * 80)
        
        # Obtener cliente_id
        cliente_id = data.get('cliente_id')
        if isinstance(cliente_id, str):
            try:
                cliente_id = int(cliente_id)
            except ValueError:
                return jsonify({'success': False, 'error': 'cliente_id debe ser un número'}), 400
        
        if not cliente_id:
            return jsonify({'success': False, 'error': 'cliente_id es requerido'}), 400
        
        # Verificar que el cliente existe
        cliente = db_query("SELECT id, razon_social FROM clientes WHERE id = %s", (cliente_id,))
        if not cliente:
            return jsonify({'success': False, 'error': f'Cliente con ID {cliente_id} no encontrado'}), 400
        
        print(f"✅ Cliente encontrado: {cliente[0]['razon_social']}")
        
        # Calcular totales
        subtotal = float(data.get('subtotal', 0))
        igv = float(data.get('igv', 0))
        total = float(data.get('total', 0))
        
        print(f"📊 Totales: subtotal={subtotal}, igv={igv}, total={total}")
        
        # Generar número de cotización
        count_data = db_query("SELECT COUNT(*) as total FROM cotizaciones")
        count = count_data[0]['total'] + 1 if count_data else 1
        numero = f"COT-{str(count).zfill(6)}"
        codigo = f"COT-{datetime.now().strftime('%Y%m%d')}-{str(count).zfill(4)}"
        
        print(f"📋 Nuevo número: {numero}")
        
        # ============================================================
        # INSERT EN COTIZACIONES
        # ============================================================
        
        query = """
            INSERT INTO cotizaciones (
                numero_cotizacion,
                cliente_id,
                fecha_creacion,
                estado,
                subtotal,
                igv,
                total,
                usuario_id,
                notas,
                forma_pago,
                tiempo_entrega,
                validez_oferta,
                codigo_cotizacion,
                correlativo,
                condicion_pago,
                direccion_entrega,
                requerimiento,
                nota_cotizacion,
                descuento_porcentaje,
                descuento_monto,
                descuento_tipo,
                contacto_cliente,
                telefono_cliente,
                email_cliente
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, numero_cotizacion
        """
        
        params = (
            numero,
            cliente_id,
            datetime.now().isoformat(),
            data.get('estado', 'Borrador'),
            subtotal,
            igv,
            total,
            usuario_id,
            data.get('notas', ''),
            data.get('condicion_pago'),
            data.get('tiempo_entrega'),
            data.get('validez'),
            codigo,
            count,
            data.get('condicion_pago'),
            data.get('direccion_entrega'),
            data.get('requerimiento'),
            data.get('nota_comercial', ''),
            float(data.get('descuento_porcentaje', 0)),
            float(data.get('descuento_monto', 0)),
            data.get('descuento_tipo', 'porcentaje'),
            data.get('contacto'),
            data.get('telefono'),
            data.get('email')
        )
        
        print("📝 Ejecutando INSERT en cotizaciones...")
        result = db_query(query, params)
        print(f"📦 Resultado: {result}")
        
        if not result:
            print("❌ Resultado vacío - INSERT falló")
            return jsonify({'success': False, 'error': 'No se pudo crear la cotización'}), 400
        
        cotizacion_id = result[0]['id']
        print(f"✅ Cotización creada con ID: {cotizacion_id}")
        
        # ============================================================
        # GUARDAR PRODUCTOS - VERSIÓN DEFINITIVA
        # ============================================================
        
        productos = data.get('productos', [])
        print(f"📦 Guardando {len(productos)} productos...")
        
        productos_guardados = 0
        productos_fallidos = 0
        
        for idx, producto in enumerate(productos):
            try:
                codigo_producto = producto.get('codigo', '').strip()
                producto_id = producto.get('producto_id')
                
                print(f"  🔍 Buscando: codigo='{codigo_producto}', id={producto_id}")
                
                # ✅ CASO 1: Buscar por ID
                if producto_id:
                    result_prod = db_query(
                        "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE id = %s",
                        (producto_id,)
                    )
                    if result_prod:
                        producto_bd = result_prod[0]
                        print(f"  ✅ Encontrado por ID: {producto_bd['codigo']}")
                    else:
                        print(f"  ❌ No encontrado por ID: {producto_id}")
                        productos_fallidos += 1
                        continue
                else:
                    # ✅ CASO 2: Buscar por código - USANDO db_query DIRECTAMENTE
                    query_prod = "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE codigo = %s"
                    result_prod = db_query(query_prod, (codigo_producto,))
                    
                    if not result_prod:
                        # Intentar con TRIM
                        query_prod = "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE TRIM(codigo) = TRIM(%s)"
                        result_prod = db_query(query_prod, (codigo_producto,))
                    
                    if not result_prod:
                        # Intentar con ILIKE
                        query_prod = "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE codigo ILIKE %s LIMIT 1"
                        result_prod = db_query(query_prod, (f"%{codigo_producto}%",))
                    
                    if not result_prod:
                        # Intentar con UPPER
                        query_prod = "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE UPPER(codigo) = UPPER(%s)"
                        result_prod = db_query(query_prod, (codigo_producto,))
                    
                    if not result_prod:
                        # Intentar sin espacios
                        codigo_sin_espacios = codigo_producto.replace(' ', '').replace('-', '').upper()
                        query_prod = "SELECT id, codigo, descripcion, precio_unitario, costo_unitario FROM productos WHERE REPLACE(REPLACE(UPPER(codigo), ' ', ''), '-', '') = %s"
                        result_prod = db_query(query_prod, (codigo_sin_espacios,))
                    
                    if not result_prod:
                        # ULTIMO INTENTO: Obtener TODOS los códigos y mostrar
                        todos = db_query("SELECT codigo FROM productos ORDER BY codigo")
                        print(f"  ❌ Producto '{codigo_producto}' NO ENCONTRADO")
                        print(f"  📋 Códigos disponibles ({len(todos)}): {[p['codigo'] for p in todos]}")
                        productos_fallidos += 1
                        continue
                    
                    producto_bd = result_prod[0]
                    print(f"  ✅ Producto ENCONTRADO: {producto_bd['codigo']} - {producto_bd['descripcion']}")
                
                # Extraer datos del producto encontrado
                producto_id_bd = producto_bd['id']
                cantidad = float(producto.get('cantidad', 1))
                precio_venta = float(producto.get('valorVenta', producto_bd.get('precio_unitario', 0)))
                costo_unitario = float(producto_bd.get('costo_unitario', 0))
                
                print(f"     ID: {producto_id_bd}, Precio: {precio_venta}, Costo: {costo_unitario}")
                
                # Calcular valores para cotizacion_detalle
                subtotal_costo = cantidad * costo_unitario
                subtotal_venta = cantidad * precio_venta
                
                # Calcular margen
                if costo_unitario > 0:
                    margen_porcentaje = ((precio_venta - costo_unitario) / costo_unitario * 100)
                else:
                    margen_porcentaje = 0
                
                # Insertar en cotizacion_detalle
                detalle_query = """
                    INSERT INTO cotizacion_detalle (
                        cotizacion_id,
                        producto_id,
                        cantidad,
                        costo_unitario,
                        subtotal_costo,
                        margen_porcentaje,
                        precio_venta_unitario,
                        subtotal_venta,
                        descuento_porcentaje,
                        precio_venta_con_descuento,
                        subtotal_venta_con_descuento,
                        descuento_total,
                        margen_final
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                
                db_execute(detalle_query, (
                    cotizacion_id,
                    producto_id_bd,
                    cantidad,
                    costo_unitario,
                    subtotal_costo,
                    margen_porcentaje,
                    precio_venta,
                    subtotal_venta,
                    0,
                    precio_venta,
                    subtotal_venta,
                    0,
                    margen_porcentaje
                ))
                
                productos_guardados += 1
                print(f"  ✅ Producto {idx+1}: {producto_bd['codigo']} - Cant: {cantidad}, Precio: {precio_venta}, Margen: {margen_porcentaje:.1f}%")
                
            except Exception as e:
                print(f"  ❌ Error guardando producto: {e}")
                import traceback
                traceback.print_exc()
                productos_fallidos += 1
        
        print(f"📊 Resumen productos: {productos_guardados} guardados, {productos_fallidos} fallidos")
        
        # ============================================================
        # RESPUESTA FINAL
        # ============================================================
        
        return jsonify({
            'success': True,
            'message': f'Cotización creada correctamente con {productos_guardados} productos',
            'data': {
                'id': cotizacion_id,
                'numero': numero,
                'productos_guardados': productos_guardados,
                'productos_fallidos': productos_fallidos
            }
        })
            
    except Exception as e:
        print(f"❌ Error general en api_cotizaciones_guardar: {e}")
        import traceback
        traceback.print_exc()
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

# ============================================================
# CONSULTAR SUNAT
# ============================================================

@ventas_bp.route('/ventas/api/sunat/consulta', methods=['GET'])
@login_required
def api_sunat_consulta():
    """Consultar RUC en SUNAT"""
    try:
        ruc = request.args.get('ruc', '').strip()
        
        if not ruc or len(ruc) != 11:
            return jsonify({'success': False, 'error': 'RUC inválido, debe tener 11 dígitos'}), 400
        
        # Primero, buscar en la base de datos
        cliente = buscar_cliente_por_ruc(ruc)
        
        if cliente:
            # Cliente encontrado en la base de datos
            return jsonify({
                'success': True,
                'encontrado': True,
                'origen': 'base_datos',
                'mensaje': '✅ Cliente encontrado en sistema',
                'data': {
                    'ruc': cliente.get('numero_documento'),
                    'razon_social': cliente.get('razon_social'),
                    'nombre_comercial': cliente.get('nombre_comercial'),
                    'direccion': cliente.get('direccion_fiscal'),
                    'telefono': cliente.get('telefono_contacto'),
                    'contacto': cliente.get('nombre_contacto'),
                    'email': cliente.get('email_contacto'),
                    'codigo_cliente': cliente.get('codigo_cliente'),
                    'tipo_documento': cliente.get('tipo_documento', 'RUC'),
                    'estado': cliente.get('estado', 'Activo')
                }
            })
        
        # Si no existe en BD, consultar SUNAT (simulado por ahora)
        # En producción, aquí iría la llamada a la API de SUNAT
        datos_sunat = {
            'ruc': ruc,
            'razon_social': f'EMPRESA CON RUC {ruc}',
            'nombre_comercial': f'EMPRESA {ruc[-4:]}',
            'direccion': 'Dirección fiscal consultada en SUNAT',
            'telefono': '',
            'contacto': '',
            'email': '',
            'estado': 'ACTIVO'
        }
        
        return jsonify({
            'success': True,
            'encontrado': False,
            'origen': 'sunat',
            'mensaje': '🌞 Cliente consultado en SUNAT - datos cargados',
            'data': datos_sunat
        })
        
    except Exception as e:
        print(f"❌ Error en api_sunat_consulta: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# DESPACHOS - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/despachos/<int:id>/toggle', methods=['PUT'])
@login_required
def api_despachos_toggle(id):
    """Cambia el estado de un despacho (ej: Pendiente -> Despachado)"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        # Validar que el estado sea válido
        estados_validos = ['Pendiente despacho', 'En preparación', 'Despachado', 'Entregado']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido. Permitidos: {", ".join(estados_validos)}'}), 400
        
        query = """
            UPDATE despachos 
            SET estado = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'Despacho actualizado a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'Despacho no encontrado'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_despachos_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@ventas_bp.route('/ventas/api/despachos/<int:id>', methods=['DELETE'])
@login_required
def api_despachos_eliminar(id):
    """Elimina (anula) un despacho"""
    try:
        query = """
            UPDATE despachos 
            SET estado = 'Anulado', updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (id,))
        
        if result:
            return jsonify({'success': True, 'message': 'Despacho anulado', 'data': result[0]})
        
        return jsonify({'success': False, 'error': 'Despacho no encontrado'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_despachos_eliminar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@ventas_bp.route('/ventas/api/despachos/<int:id>', methods=['GET'])
@login_required
def api_despachos_obtener(id):
    """Obtiene un despacho por su ID"""
    try:
        query = """
            SELECT 
                id, numero, fecha, fecha_despacho, estado,
                pc_id, pc_numero, cotizacion_id, cotizacion_numero,
                cliente, ruc, comprobante, guia, origen, destino,
                transportista, observaciones, responsable,
                created_at, updated_at
            FROM despachos
            WHERE id = %s
        """
        result = db_query(query, (id,))
        
        if result:
            return jsonify({'success': True, 'data': result[0]})
        
        return jsonify({'success': False, 'error': 'Despacho no encontrado'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_despachos_obtener: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# PEDIDO COMPRA - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/pedido-compra/<int:id>/toggle', methods=['PUT'])
@login_required
def api_pedido_compra_toggle(id):
    """Cambia el estado de un pedido de compra"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        estados_validos = ['Pendiente', 'Recibido por correo', 'En revisión interna', 'Validado por Hellen', 'Listo para despacho', 'Anulado']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido'}), 400
        
        query = """
            UPDATE pedido_compra_pc 
            SET estado = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'PC actualizado a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'PC no encontrado'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_pedido_compra_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# GUÍAS - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/guias/<int:id>/toggle', methods=['PUT'])
@login_required
def api_guias_toggle(id):
    """Cambia el estado de una guía"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        estados_validos = ['Borrador', 'Pendiente despacho', 'Emitida', 'Entregada', 'Anulada']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido'}), 400
        
        query = """
            UPDATE guias_remision 
            SET estado_sunat = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado_sunat as estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'Guía actualizada a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'Guía no encontrada'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_guias_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# COMPROBANTES - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/comprobantes/<int:id>/toggle', methods=['PUT'])
@login_required
def api_comprobantes_toggle(id):
    """Cambia el estado de un comprobante"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        estados_validos = ['Borrador', 'Emitido', 'Enviado', 'Pagado', 'Anulado']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido'}), 400
        
        query = """
            UPDATE comprobantes 
            SET estado_sunat = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado_sunat as estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'Comprobante actualizado a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'Comprobante no encontrado'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_comprobantes_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# NOTAS DE CRÉDITO - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/notas-credito/<int:id>/toggle', methods=['PUT'])
@login_required
def api_notas_credito_toggle(id):
    """Cambia el estado de una nota de crédito"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        estados_validos = ['Borrador', 'Emitida', 'Enviada', 'Aplicada', 'Anulada']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido'}), 400
        
        query = """
            UPDATE notas_credito 
            SET estado = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'Nota de crédito actualizada a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'Nota de crédito no encontrada'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_notas_credito_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# DEVOLUCIONES - ENDPOINTS ADICIONALES
# ============================================================

@ventas_bp.route('/ventas/api/devoluciones/<int:id>/toggle', methods=['PUT'])
@login_required
def api_devoluciones_toggle(id):
    """Cambia el estado de una devolución"""
    try:
        data = request.get_json()
        nuevo_estado = data.get('estado')
        
        if not nuevo_estado:
            return jsonify({'success': False, 'error': 'Estado requerido'}), 400
        
        estados_validos = ['Pendiente', 'En revisión', 'Aprobada', 'Rechazada', 'Procesada']
        if nuevo_estado not in estados_validos:
            return jsonify({'success': False, 'error': f'Estado inválido'}), 400
        
        query = """
            UPDATE devoluciones 
            SET estado = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, estado
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result:
            return jsonify({
                'success': True, 
                'message': f'Devolución actualizada a {nuevo_estado}',
                'data': result[0]
            })
        
        return jsonify({'success': False, 'error': 'Devolución no encontrada'}), 404
        
    except Exception as e:
        print(f"❌ Error en api_devoluciones_toggle: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# COTIZACIONES - OBTENER CON PRODUCTOS (PARA EDITAR)
# ============================================================

@ventas_bp.route('/ventas/api/cotizaciones/<int:id>/completa', methods=['GET'])
@login_required
def api_cotizaciones_obtener_completa(id):
    """Obtiene una cotización con sus productos para edición"""
    try:
        # Obtener cabecera
        query_cabecera = """
            SELECT 
                c.id, c.numero_cotizacion, c.cliente_id, c.fecha_creacion, c.estado,
                c.subtotal, c.igv, c.total, c.usuario_id, c.notas,
                c.forma_pago, c.tiempo_entrega, c.almacen, c.validez_oferta,
                c.codigo_cotizacion, c.correlativo, c.condicion_pago,
                c.direccion_entrega, c.requerimiento, c.nota_cotizacion,
                c.descuento_porcentaje, c.descuento_monto, c.descuento_tipo,
                c.contacto_cliente, c.telefono_cliente, c.email_cliente,
                cl.razon_social as cliente_razon_social,
                cl.numero_documento as cliente_ruc,
                cl.nombre_comercial as cliente_nombre_comercial,
                cl.codigo_cliente as cod_cliente
            FROM cotizaciones c
            LEFT JOIN clientes cl ON cl.id = c.cliente_id::integer
            WHERE c.id = %s
        """
        cabecera = db_query(query_cabecera, (id,))
        
        if not cabecera:
            return jsonify({'success': False, 'error': 'Cotización no encontrada'}), 404
        
        # Obtener productos
        query_productos = """
            SELECT 
                d.id, d.producto_id, d.cantidad,
                p.codigo, p.descripcion as producto, p.descripcion_larga,
                p.modelo, p.marca, p.unidad as um, p.stock,
                p.precio_unitario as valorVenta
            FROM cotizacion_detalle d
            LEFT JOIN productos p ON p.id = d.producto_id
            WHERE d.cotizacion_id = %s
        """
        productos = db_query(query_productos, (id,))
        
        # Combinar datos
        result = dict(cabecera[0])
        result['productos'] = [dict(p) for p in productos] if productos else []
        
        return jsonify({'success': True, 'data': result})
        
    except Exception as e:
        print(f"❌ Error en api_cotizaciones_obtener_completa: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# ALIAS PARA COMPATIBILIDAD CON FRONTEND (/api/cotizaciones)
# ============================================================

@ventas_bp.route('/api/cotizaciones', methods=['GET'])
@login_required
def api_cotizaciones_listar_alias():
    """Alias para /api/cotizaciones -> redirige a /ventas/api/cotizaciones/listar"""
    return api_cotizaciones_listar()

@ventas_bp.route('/api/cotizaciones', methods=['POST'])
@login_required
def api_cotizaciones_guardar_alias():
    """Alias para /api/cotizaciones -> redirige a /ventas/api/cotizaciones/guardar"""
    return api_cotizaciones_guardar()