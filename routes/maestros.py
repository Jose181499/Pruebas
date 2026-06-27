from flask import Blueprint, render_template, request, jsonify, session
from utils import login_required
from database import db_query
import logging

maestros_bp = Blueprint('maestros', __name__, url_prefix='/maestros')

@maestros_bp.route('/')
@login_required
def index():
    """Página principal de maestros"""
    tab = request.args.get('tab', 'clientes')
    return render_template('maestros/index.html', 
                          active_tab=tab,
                          nombre=session.get('nombre_completo', 'Usuario'),
                          empresa=session.get('empresa', 'KCF'))

# ==========================================
# ENDPOINTS CLIENTES
# ==========================================

@maestros_bp.route('/api/clientes/listar', methods=['GET'])
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
    """Guardar cliente (CREAR)"""
    try:
        data = request.get_json()
        
        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('numero_documento'):
            return jsonify({"success": False, "error": "Número de documento obligatorio"})
        
        # Generar código
        last = db_query("SELECT codigo_cliente FROM clientes ORDER BY id DESC LIMIT 1")
        if last and last[0].get('codigo_cliente'):
            try:
                num = int(last[0]['codigo_cliente'].replace('CLI-', '')) + 1
            except:
                num = 1
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

@maestros_bp.route('/api/clientes/<int:id>', methods=['GET', 'PUT'])
@login_required
def api_clientes_id(id):
    """Obtener o actualizar un cliente por ID"""
    if request.method == 'GET':
        try:
            query = """
                SELECT id, codigo_cliente, razon_social, numero_documento,
                       nombre_comercial, telefono_contacto, nombre_contacto,
                       email_contacto, direccion_fiscal, activo, tipo_documento
                FROM clientes
                WHERE id = %s
            """
            result = db_query(query, (id,))
            if result and len(result) > 0:
                return jsonify({"success": True, "data": result[0]})
            return jsonify({"success": False, "error": "Cliente no encontrado"}), 404
        except Exception as e:
            logging.error(f"Error obteniendo cliente: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            if not data.get('razon_social'):
                return jsonify({"success": False, "error": "Razón social obligatoria"})
            if not data.get('numero_documento'):
                return jsonify({"success": False, "error": "Número de documento obligatorio"})
            
            query = """
                UPDATE clientes SET
                    razon_social = %s,
                    numero_documento = %s,
                    nombre_comercial = %s,
                    telefono_contacto = %s,
                    nombre_contacto = %s,
                    email_contacto = %s,
                    direccion_fiscal = %s,
                    tipo_documento = %s,
                    activo = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, codigo_cliente
            """
            
            params = (
                data.get('razon_social'),
                data.get('numero_documento'),
                data.get('nombre_comercial', data.get('razon_social')),
                data.get('telefono_contacto'),
                data.get('nombre_contacto'),
                data.get('email_contacto'),
                data.get('direccion_fiscal'),
                data.get('tipo_documento', 'RUC'),
                data.get('activo', True),
                id
            )
            
            result = db_query(query, params)
            
            if result and len(result) > 0:
                return jsonify({
                    "success": True,
                    "data": result[0],
                    "message": "Cliente actualizado correctamente"
                })
            
            return jsonify({"success": False, "error": "No se pudo actualizar el cliente"})
        except Exception as e:
            logging.error(f"Error actualizando cliente: {e}")
            return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/clientes/<int:id>/toggle', methods=['PUT'])
@login_required
def api_clientes_toggle(id):
    """Activar/Inactivar cliente"""
    try:
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

@maestros_bp.route('/api/proveedores/listar', methods=['GET'])
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
    """Guardar proveedor (CREAR)"""
    try:
        data = request.get_json()
        
        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('ruc'):
            return jsonify({"success": False, "error": "RUC obligatorio"})
        
        last = db_query("SELECT codigo_proveedor FROM proveedores ORDER BY id DESC LIMIT 1")
        if last and last[0].get('codigo_proveedor'):
            try:
                num = int(last[0]['codigo_proveedor'].replace('PROV-', '')) + 1
            except:
                num = 1
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

@maestros_bp.route('/api/proveedores/<int:id>', methods=['GET'])
@login_required
def api_proveedores_obtener(id):
    """Obtener un proveedor por ID"""
    try:
        query = """
            SELECT id, codigo_proveedor, razon_social, ruc,
                   razon_comercial, telefono, contacto, email,
                   direccion, activo, condicion_pago, tiempo_credito
            FROM proveedores
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404
    except Exception as e:
        logging.error(f"Error obteniendo proveedor: {e}")
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

# ==========================================
# ENDPOINTS ALMACENES
# ==========================================

@maestros_bp.route('/api/almacenes/listar', methods=['GET'])
@login_required
def api_almacenes_listar():
    """Listar almacenes"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, responsable, telefono,
                   direccion, activo, created_at, updated_at
            FROM almacenes
            WHERE activo = true
            ORDER BY nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando almacenes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/almacenes/guardar', methods=['POST'])
@login_required
def api_almacenes_guardar():
    """Guardar almacén"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        existing = db_query("SELECT id FROM almacenes WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe un almacén con este código"})
        
        query = """
            INSERT INTO almacenes (
                codigo, nombre, tipo, responsable, telefono,
                direccion, activo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'Principal'),
            data.get('responsable'),
            data.get('telefono'),
            data.get('direccion'),
            data.get('activo', True)
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Almacén creado con código {result[0]['codigo']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear el almacén"})
    except Exception as e:
        logging.error(f"Error guardando almacén: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/almacenes/<int:id>/toggle', methods=['PUT'])
@login_required
def api_almacenes_toggle(id):
    """Activar/Inactivar almacén"""
    try:
        current = db_query("SELECT activo FROM almacenes WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Almacén no encontrado"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE almacenes 
            SET activo = %s, updated_at = NOW()
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Almacén {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando almacén: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# ENDPOINTS CATEGORÍAS
# ==========================================

@maestros_bp.route('/api/categorias/listar', methods=['GET'])
@login_required
def api_categorias_listar():
    """Listar categorías"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo, 
                   created_at, updated_at
            FROM categorias
            WHERE activo = true
            ORDER BY tipo, nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando categorías: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/categorias/guardar', methods=['POST'])
@login_required
def api_categorias_guardar():
    """Guardar categoría"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        existing = db_query("SELECT id FROM categorias WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una categoría con este código"})
        
        query = """
            INSERT INTO categorias (
                codigo, nombre, tipo, activo
            ) VALUES (%s, %s, %s, %s)
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'General'),
            data.get('activo', True)
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Categoría creada con código {result[0]['codigo']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear la categoría"})
    except Exception as e:
        logging.error(f"Error guardando categoría: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/categorias/<int:id>/toggle', methods=['PUT'])
@login_required
def api_categorias_toggle(id):
    """Activar/Inactivar categoría"""
    try:
        current = db_query("SELECT activo FROM categorias WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Categoría no encontrada"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE categorias 
            SET activo = %s, updated_at = NOW()
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Categoría {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando categoría: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# ENDPOINTS MARCAS
# ==========================================

@maestros_bp.route('/api/marcas/listar', methods=['GET'])
@login_required
def api_marcas_listar():
    """Listar marcas"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo,
                   created_at, updated_at
            FROM marcas
            WHERE activo = true
            ORDER BY nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando marcas: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/marcas/guardar', methods=['POST'])
@login_required
def api_marcas_guardar():
    """Guardar marca"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        existing = db_query("SELECT id FROM marcas WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una marca con este código"})
        
        query = """
            INSERT INTO marcas (
                codigo, nombre, tipo, activo
            ) VALUES (%s, %s, %s, %s)
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'General'),
            data.get('activo', True)
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Marca creada con código {result[0]['codigo']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear la marca"})
    except Exception as e:
        logging.error(f"Error guardando marca: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/marcas/<int:id>/toggle', methods=['PUT'])
@login_required
def api_marcas_toggle(id):
    """Activar/Inactivar marca"""
    try:
        current = db_query("SELECT activo FROM marcas WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Marca no encontrada"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE marcas 
            SET activo = %s, updated_at = NOW()
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Marca {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando marca: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# ENDPOINTS UNIDADES DE MEDIDA (UM)
# ==========================================

@maestros_bp.route('/api/um/listar', methods=['GET'])
@login_required
def api_um_listar():
    """Listar unidades de medida"""
    try:
        query = """
            SELECT id, codigo, nombre, abreviatura, tipo,
                   decimales, activo, ambito, uso,
                   created_at, updated_at
            FROM um
            WHERE activo = true
            ORDER BY ambito, codigo
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        logging.error(f"Error listando unidades de medida: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/um/guardar', methods=['POST'])
@login_required
def api_um_guardar():
    """Guardar unidad de medida"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        existing = db_query("SELECT id FROM um WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una unidad con este código"})
        
        query = """
            INSERT INTO um (
                codigo, nombre, abreviatura, tipo,
                decimales, activo, ambito
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('abreviatura'),
            data.get('tipo', 'General'),
            data.get('decimales', False),
            data.get('activo', True),
            data.get('ambito', 'COMPARTIDO')
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Unidad creada con código {result[0]['codigo']}"
            })
        
        return jsonify({"success": False, "error": "No se pudo crear la unidad"})
    except Exception as e:
        logging.error(f"Error guardando unidad de medida: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/um/<int:id>/toggle', methods=['PUT'])
@login_required
def api_um_toggle(id):
    """Activar/Inactivar unidad de medida"""
    try:
        current = db_query("SELECT activo FROM um WHERE id = %s", (id,))
        if not current:
            return jsonify({"success": False, "error": "Unidad no encontrada"})
        
        nuevo_estado = not current[0].get('activo', True)
        
        query = """
            UPDATE um 
            SET activo = %s, updated_at = NOW()
            WHERE id = %s 
            RETURNING id, activo
        """
        result = db_query(query, (nuevo_estado, id))
        
        if result and len(result) > 0:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": result[0],
                "message": f"Unidad {estado_texto} correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar"})
    except Exception as e:
        logging.error(f"Error togglando unidad de medida: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# ENDPOINT DE PRUEBA
# ==========================================

@maestros_bp.route('/api/test', methods=['GET'])
@login_required
def api_test():
    """Endpoint para probar que la API funciona"""
    return jsonify({"success": True, "message": "API de maestros funcionando correctamente"})


# ==========================================
# ENDPOINTS PROVEEDORES - ACTUALIZAR (PUT)
# ==========================================

@maestros_bp.route('/api/proveedores/<int:id>', methods=['PUT'])
@login_required
def api_proveedores_actualizar(id):
    """Actualizar proveedor"""
    try:
        data = request.get_json()
        
        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('ruc'):
            return jsonify({"success": False, "error": "RUC obligatorio"})
        
        query = """
            UPDATE proveedores SET
                razon_social = %s,
                ruc = %s,
                razon_comercial = %s,
                telefono = %s,
                contacto = %s,
                email = %s,
                direccion = %s,
                condicion_pago = %s,
                tiempo_credito = %s,
                lugar_recojo = %s,
                banco = %s,
                numero_cuenta = %s,
                cci = %s,
                activo = %s
            WHERE id = %s
            RETURNING id, codigo_proveedor
        """
        
        params = (
            data.get('razon_social'),
            data.get('ruc'),
            data.get('razon_comercial', data.get('razon_social')),
            data.get('telefono'),
            data.get('contacto'),
            data.get('email'),
            data.get('direccion'),
            data.get('condicion_pago', 'Contado'),
            data.get('tiempo_credito'),
            data.get('lugar_recojo'),
            data.get('banco'),
            data.get('numero_cuenta'),
            data.get('cci'),
            data.get('activo', True),
            id
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": "Proveedor actualizado correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar el proveedor"})
    except Exception as e:
        logging.error(f"Error actualizando proveedor: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ENDPOINTS ALMACENES - OBTENER (GET) Y ACTUALIZAR (PUT)
# ==========================================

@maestros_bp.route('/api/almacenes/<int:id>', methods=['GET'])
@login_required
def api_almacenes_obtener(id):
    """Obtener almacén por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, responsable, telefono,
                   direccion, activo, created_at, updated_at
            FROM almacenes
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Almacén no encontrado"}), 404
    except Exception as e:
        logging.error(f"Error obteniendo almacén: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/almacenes/<int:id>', methods=['PUT'])
@login_required
def api_almacenes_actualizar(id):
    """Actualizar almacén"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        query = """
            UPDATE almacenes SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                responsable = %s,
                telefono = %s,
                direccion = %s,
                activo = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'Principal'),
            data.get('responsable'),
            data.get('telefono'),
            data.get('direccion'),
            data.get('activo', True),
            id
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": "Almacén actualizado correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar el almacén"})
    except Exception as e:
        logging.error(f"Error actualizando almacén: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ENDPOINTS CATEGORÍAS - OBTENER (GET) Y ACTUALIZAR (PUT)
# ==========================================

@maestros_bp.route('/api/categorias/<int:id>', methods=['GET'])
@login_required
def api_categorias_obtener(id):
    """Obtener categoría por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo,
                   created_at, updated_at
            FROM categorias
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Categoría no encontrada"}), 404
    except Exception as e:
        logging.error(f"Error obteniendo categoría: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/categorias/<int:id>', methods=['PUT'])
@login_required
def api_categorias_actualizar(id):
    """Actualizar categoría"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        query = """
            UPDATE categorias SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                activo = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'General'),
            data.get('activo', True),
            id
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": "Categoría actualizada correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar la categoría"})
    except Exception as e:
        logging.error(f"Error actualizando categoría: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ENDPOINTS MARCAS - OBTENER (GET) Y ACTUALIZAR (PUT)
# ==========================================

@maestros_bp.route('/api/marcas/<int:id>', methods=['GET'])
@login_required
def api_marcas_obtener(id):
    """Obtener marca por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo,
                   created_at, updated_at
            FROM marcas
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Marca no encontrada"}), 404
    except Exception as e:
        logging.error(f"Error obteniendo marca: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/marcas/<int:id>', methods=['PUT'])
@login_required
def api_marcas_actualizar(id):
    """Actualizar marca"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        query = """
            UPDATE marcas SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                activo = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('tipo', 'General'),
            data.get('activo', True),
            id
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": "Marca actualizada correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar la marca"})
    except Exception as e:
        logging.error(f"Error actualizando marca: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ENDPOINTS UNIDADES DE MEDIDA - OBTENER (GET) Y ACTUALIZAR (PUT)
# ==========================================

@maestros_bp.route('/api/um/<int:id>', methods=['GET'])
@login_required
def api_um_obtener(id):
    """Obtener unidad de medida por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, abreviatura, tipo,
                   decimales, activo, ambito, uso,
                   created_at, updated_at
            FROM um
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Unidad no encontrada"}), 404
    except Exception as e:
        logging.error(f"Error obteniendo unidad: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/um/<int:id>', methods=['PUT'])
@login_required
def api_um_actualizar(id):
    """Actualizar unidad de medida"""
    try:
        data = request.get_json()
        
        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        
        query = """
            UPDATE um SET
                codigo = %s,
                nombre = %s,
                abreviatura = %s,
                tipo = %s,
                decimales = %s,
                ambito = %s,
                activo = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, codigo
        """
        
        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('abreviatura'),
            data.get('tipo', 'General'),
            data.get('decimales', False),
            data.get('ambito', 'COMPARTIDO'),
            data.get('activo', True),
            id
        )
        
        result = db_query(query, params)
        
        if result and len(result) > 0:
            return jsonify({
                "success": True,
                "data": result[0],
                "message": "Unidad actualizada correctamente"
            })
        
        return jsonify({"success": False, "error": "No se pudo actualizar la unidad"})
    except Exception as e:
        logging.error(f"Error actualizando unidad: {e}")
        return jsonify({"success": False, "error": str(e)}), 500