from flask import Blueprint, render_template, request, jsonify, session
from utils import login_required
from database import db_query
import logging

maestros_bp = Blueprint('maestros', __name__, url_prefix='/maestros')

@maestros_bp.route('/')
@login_required
def index():
    """Página principal de maestros"""
    return render_template('maestros/index.html', 
                          active_tab='clientes',
                          nombre=session.get('nombre_completo', 'Usuario'),
                          empresa=session.get('empresa', 'KCF'))

# ==========================================
# ENDPOINTS API PARA MAESTROS
# ==========================================

@maestros_bp.route('/api/clientes/listar')
@login_required
def api_clientes_listar():
    """Listar clientes"""
    try:
        query = """
            SELECT id, codigo_cliente, razon_social, numero_documento,
                   nombre_comercial, telefono_contacto, nombre_contacto,
                   email_contacto, direccion_fiscal, activo, tipo_documento
            FROM clientes
            WHERE activo = true
            ORDER BY razon_social
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando clientes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/clientes/guardar', methods=['POST'])
@login_required
def api_clientes_guardar():
    """Guardar cliente"""
    try:
        data = request.get_json()
        
        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('numero_documento'):
            return jsonify({"success": False, "error": "Número de documento obligatorio"})
        
        # Generar código
        last = db_query("SELECT codigo_cliente FROM clientes ORDER BY id DESC LIMIT 1")
        if last and last[0].get('codigo_cliente'):
            num = int(last[0]['codigo_cliente'].replace('CLI-', '')) + 1
            codigo = f"CLI-{str(num).zfill(6)}"
        else:
            codigo = "CLI-000001"
        
        query = """
            INSERT INTO clientes (
                codigo_cliente, razon_social, numero_documento,
                nombre_comercial, telefono_contacto, nombre_contacto,
                email_contacto, direccion_fiscal, tipo_documento, activo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo_cliente
        """
        
        params = (
            codigo,
            data.get('razon_social'),
            data.get('numero_documento'),
            data.get('nombre_comercial', data.get('razon_social')),
            data.get('telefono_contacto'),
            data.get('nombre_contacto'),
            data.get('email_contacto'),
            data.get('direccion_fiscal'),
            data.get('tipo_documento', 'RUC'),
            data.get('activo', True)
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Cliente creado con código {result[0]['codigo_cliente']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear el cliente"})
    except Exception as e:
        logging.error(f"Error guardando cliente: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/clientes/<int:id>/toggle', methods=['PUT'])
@login_required
def api_clientes_toggle(id):
    """Activar/Inactivar cliente"""
    try:
        # Obtener estado actual
        current = db_query("SELECT activo FROM clientes WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Cliente no encontrado"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE clientes 
            SET activo = %s 
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Cliente {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando cliente: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# ENDPOINTS PROVEEDORES
# ==========================================

@maestros_bp.route('/api/proveedores/listar')
@login_required
def api_proveedores_listar():
    """Listar proveedores"""
    try:
        query = """
            SELECT id, codigo_proveedor, razon_social, ruc,
                   razon_comercial, telefono, contacto, email,
                   direccion, activo, condicion_pago, tiempo_credito
            FROM proveedores
            WHERE activo = true
            ORDER BY razon_social
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando proveedores: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/proveedores/guardar', methods=['POST'])
@login_required
def api_proveedores_guardar():
    """Guardar proveedor"""
    try:
        data = request.get_json()
        
        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('ruc'):
            return jsonify({"success": False, "error": "RUC obligatorio"})
        
        # Generar código
        last = db_query("SELECT codigo_proveedor FROM proveedores ORDER BY id DESC LIMIT 1")
        if last and last[0].get('codigo_proveedor'):
            num = int(last[0]['codigo_proveedor'].replace('PROV-', '')) + 1
            codigo = f"PROV-{str(num).zfill(6)}"
        else:
            codigo = "PROV-000001"
        
        query = """
            INSERT INTO proveedores (
                codigo_proveedor, razon_social, ruc,
                razon_comercial, telefono, contacto, email,
                direccion, activo, condicion_pago, tiempo_credito
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo_proveedor
        """
        
        params = (
            codigo,
            data.get('razon_social'),
            data.get('ruc'),
            data.get('razon_comercial', data.get('razon_social')),
            data.get('telefono'),
            data.get('contacto'),
            data.get('email'),
            data.get('direccion'),
            data.get('activo', True),
            data.get('condicion_pago', 'Contado'),
            data.get('tiempo_credito')
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Proveedor creado con código {result[0]['codigo_proveedor']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear el proveedor"})
    except Exception as e:
        logging.error(f"Error guardando proveedor: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/proveedores/<int:id>/toggle', methods=['PUT'])
@login_required
def api_proveedores_toggle(id):
    """Activar/Inactivar proveedor"""
    try:
        current = db_query("SELECT activo FROM proveedores WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Proveedor no encontrado"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE proveedores 
            SET activo = %s 
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Proveedor {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando proveedor: {e}")
        return jsonify({"success": False, "error": str(e)}), 500