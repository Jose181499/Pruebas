from flask import Blueprint, render_template, request, jsonify, session, current_app
from utils import login_required
from database import db_query
import traceback
import psycopg2

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
            SELECT id, codigo_cliente, razon_social,
                   numero_documento,
                   nombre_comercial, telefono_contacto, nombre_contacto,
                   email_contacto, direccion_fiscal, activo, tipo_documento
            FROM clientes
            WHERE activo = true
            ORDER BY razon_social
        """
        result = db_query(query)
        for row in result:
            row['ruc'] = row.get('numero_documento')
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        current_app.logger.error(f"Error listando clientes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/clientes/guardar', methods=['POST'])
@login_required
def api_clientes_guardar():
    """Guardar cliente (CREAR)"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar cliente: {data}")

        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})

        numero_documento = data.get('numero_documento') or data.get('ruc')
        if not numero_documento:
            return jsonify({"success": False, "error": "Número de documento/RUC obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = """
            INSERT INTO clientes (
                tipo_documento, numero_documento, razon_social,
                nombre_comercial, direccion_fiscal,
                telefono_contacto, nombre_contacto, email_contacto,
                activo, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
            )
            RETURNING id, codigo_cliente, numero_documento
        """
        
        params = (
            data.get('tipo_documento', 'RUC'),
            numero_documento,
            data.get('razon_social'),
            data.get('nombre_comercial', data.get('razon_social')),
            data.get('direccion_fiscal'),
            data.get('telefono_contacto'),
            data.get('nombre_contacto'),
            data.get('email_contacto'),
            True
        )
        
        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            cliente = {
                'id': result[0],
                'codigo_cliente': result[1],
                'numero_documento': result[2]
            }
            cliente['ruc'] = cliente.get('numero_documento')
            
            return jsonify({
                "success": True,
                "data": cliente,
                "message": f"Cliente creado con código {cliente['codigo_cliente']}"
            })

        return jsonify({"success": False, "error": "No se pudo crear el cliente"})

    except Exception as e:
        current_app.logger.error(f"❌ Error guardando cliente: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/clientes/<int:id>', methods=['GET'])
@login_required
def api_clientes_obtener(id):
    """Obtener cliente por ID con sus contactos y puntos de entrega"""
    try:
        # 1. Obtener datos del cliente - AHORA CON TODAS LAS COLUMNAS
        query_cliente = """
            SELECT id, codigo_cliente, razon_social,
                   numero_documento, tipo_documento,
                   nombre_comercial, telefono_contacto, nombre_contacto,
                   email_contacto, direccion_fiscal, activo,
                   condicion_pago, dias_credito, limite_credito, descuento,
                   estado, ambito, observaciones,
                   created_at, updated_at
            FROM clientes
            WHERE id = %s
        """
        cliente_result = db_query(query_cliente, (id,))
        
        if not cliente_result or len(cliente_result) == 0:
            return jsonify({"success": False, "error": "Cliente no encontrado"}), 404
        
        cliente = cliente_result[0]
        
        # 2. Obtener contactos del cliente
        try:
            query_contactos = """
                SELECT id, nombre_contacto as nombre, email, telefono, cargo, principal, activo
                FROM clientes_contactos
                WHERE cliente_id = %s AND activo = true
                ORDER BY principal DESC, nombre_contacto
            """
            contactos = db_query(query_contactos, (id,))
            cliente['contactos'] = contactos if contactos else []
        except Exception as e:
            current_app.logger.warning(f"Error obteniendo contactos: {e}")
            cliente['contactos'] = []
        
        # 3. Obtener puntos de entrega del cliente
        try:
            query_puntos = """
                SELECT id, nombre_punto as punto, direccion, telefono_contacto as telefono,
                       responsable as contacto, principal, activo,
                       condicion_pago, tiempo_credito
                FROM clientes_punto_entrega
                WHERE cliente_id = %s AND activo = true
                ORDER BY principal DESC, nombre_punto
            """
            puntos = db_query(query_puntos, (id,))
            cliente['puntos_entrega'] = puntos if puntos else []
        except Exception as e:
            current_app.logger.warning(f"Error obteniendo puntos de entrega: {e}")
            cliente['puntos_entrega'] = []
        
        # 4. Asegurar valores por defecto
        cliente['condicion_pago'] = cliente.get('condicion_pago') or 'Contado'
        cliente['dias_credito'] = cliente.get('dias_credito') or 0
        cliente['limite_credito'] = cliente.get('limite_credito') or ''
        cliente['descuento'] = cliente.get('descuento') or ''
        cliente['estado'] = cliente.get('estado') or 'Activo'
        cliente['ambito'] = cliente.get('ambito') or 'COMPARTIDO'
        cliente['observaciones'] = cliente.get('observaciones') or ''
        cliente['ruc'] = cliente.get('numero_documento')
        
        return jsonify({"success": True, "data": cliente})
        
    except Exception as e:
        current_app.logger.error(f"Error obteniendo cliente {id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500



@maestros_bp.route('/api/clientes/<int:id>', methods=['PUT'])
@login_required
def api_clientes_actualizar(id):
    """Actualizar cliente"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar cliente {id}: {data}")

        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})

        numero_documento = data.get('numero_documento') or data.get('ruc')
        if not numero_documento:
            return jsonify({"success": False, "error": "Número de documento/RUC obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = """
            UPDATE clientes SET
                tipo_documento = %s,
                numero_documento = %s,
                razon_social = %s,
                nombre_comercial = %s,
                direccion_fiscal = %s,
                telefono_contacto = %s,
                nombre_contacto = %s,
                email_contacto = %s,
                condicion_pago = %s,
                dias_credito = %s,
                limite_credito = %s,
                descuento = %s,
                estado = %s,
                ambito = %s,
                observaciones = %s,
                activo = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, codigo_cliente, numero_documento
        """

        params = (
            data.get('tipo_documento', 'RUC'),
            numero_documento,
            data.get('razon_social'),
            data.get('nombre_comercial', data.get('razon_social')),
            data.get('direccion_fiscal'),
            data.get('telefono_contacto') or data.get('telefono'),
            data.get('nombre_contacto') or data.get('contacto'),
            data.get('email_contacto') or data.get('email'),
            data.get('condicion_pago', 'Contado'),
            int(data.get('dias_credito', 0)),
            data.get('limite_credito', ''),
            data.get('descuento', ''),
            data.get('estado', 'Activo'),
            data.get('ambito', 'COMPARTIDO'),
            data.get('observaciones', ''),
            data.get('activo', True),
            id
        )

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            cliente = {
                'id': result[0],
                'codigo_cliente': result[1],
                'numero_documento': result[2]
            }
            cliente['ruc'] = cliente.get('numero_documento')
            return jsonify({
                "success": True,
                "data": cliente,
                "message": "Cliente actualizado correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el cliente"})

    except Exception as e:
        current_app.logger.error(f"❌ Error actualizando cliente: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = """
            UPDATE clientes
            SET activo = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Cliente {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})

    except Exception as e:
        current_app.logger.error(f"❌ Error togglando cliente: {e}")
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
        current_app.logger.error(f"Error listando proveedores: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/proveedores/guardar', methods=['POST'])
@login_required
def api_proveedores_guardar():
    """Guardar proveedor (CREAR)"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar proveedor: {data}")

        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('ruc'):
            return jsonify({"success": False, "error": "RUC obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Obtener último código
        cur.execute("SELECT codigo_proveedor FROM proveedores ORDER BY id DESC LIMIT 1")
        last = cur.fetchone()
        if last and last[0]:
            try:
                num = int(last[0].replace('PROV-', '')) + 1
            except:
                num = 1
            codigo = f"PROV-{str(num).zfill(6)}"
        else:
            codigo = "PROV-000001"

        # 🔥 SIN created_at y updated_at (no existen en la tabla)
        query = """
            INSERT INTO proveedores (
                codigo_proveedor, razon_social, ruc,
                razon_comercial, telefono, contacto, email,
                direccion, activo, condicion_pago, tiempo_credito,
                lugar_recojo, banco, numero_cuenta, cci
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
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
            data.get('tiempo_credito'),
            data.get('lugar_recojo'),
            data.get('banco'),
            data.get('numero_cuenta'),
            data.get('cci')
        )

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo_proveedor': result[1]},
                "message": f"Proveedor creado con código {result[1]}"
            })

        return jsonify({"success": False, "error": "No se pudo crear el proveedor"})
    except Exception as e:
        current_app.logger.error(f"Error guardando proveedor: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/proveedores/<int:id>', methods=['GET'])
@login_required
def api_proveedores_obtener(id):
    """Obtener un proveedor por ID"""
    try:
        query = """
            SELECT id, codigo_proveedor, razon_social, ruc,
                   razon_comercial, telefono, contacto, email,
                   direccion, activo, condicion_pago, tiempo_credito,
                   lugar_recojo, banco, numero_cuenta, cci,
                   estado, ambito, observaciones
            FROM proveedores
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            proveedor = result[0]
            # Asegurar valores por defecto para campos que puedan ser NULL
            proveedor['condicion_pago'] = proveedor.get('condicion_pago') or 'Contado'
            proveedor['tiempo_credito'] = proveedor.get('tiempo_credito') or ''
            proveedor['estado'] = proveedor.get('estado') or 'Activo'
            proveedor['ambito'] = proveedor.get('ambito') or 'COMPARTIDO'
            proveedor['observaciones'] = proveedor.get('observaciones') or ''
            proveedor['lugar_recojo'] = proveedor.get('lugar_recojo') or ''
            proveedor['banco'] = proveedor.get('banco') or ''
            proveedor['numero_cuenta'] = proveedor.get('numero_cuenta') or ''
            proveedor['cci'] = proveedor.get('cci') or ''
            return jsonify({"success": True, "data": proveedor})
        return jsonify({"success": False, "error": "Proveedor no encontrado"}), 404
    except Exception as e:
        current_app.logger.error(f"Error obteniendo proveedor: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@maestros_bp.route('/api/proveedores/<int:id>', methods=['PUT'])
@login_required
def api_proveedores_actualizar(id):
    """Actualizar proveedor"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar proveedor {id}: {data}")

        if not data.get('razon_social'):
            return jsonify({"success": False, "error": "Razón social obligatoria"})
        if not data.get('ruc'):
            return jsonify({"success": False, "error": "RUC obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

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
                estado = %s,
                ambito = %s,
                observaciones = %s,
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
            data.get('estado', 'Activo'),
            data.get('ambito', 'COMPARTIDO'),
            data.get('observaciones', ''),
            data.get('activo', True),
            id
        )

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo_proveedor': result[1]},
                "message": "Proveedor actualizado correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el proveedor"})
    except Exception as e:
        current_app.logger.error(f"Error actualizando proveedor: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE proveedores
            SET activo = %s
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Proveedor {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})
    except Exception as e:
        current_app.logger.error(f"Error togglando proveedor: {e}")
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
                   direccion, activo
            FROM almacenes
            WHERE activo = true
            ORDER BY nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        current_app.logger.error(f"Error listando almacenes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/almacenes/guardar', methods=['POST'])
@login_required
def api_almacenes_guardar():
    """Guardar almacén"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar almacén: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        if not data.get('responsable'):
            return jsonify({"success": False, "error": "Responsable obligatorio"})

        existing = db_query("SELECT id FROM almacenes WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe un almacén con este código"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 🔥 SIN created_at y updated_at
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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": f"Almacén creado con código {result[1]}"
            })

        return jsonify({"success": False, "error": "No se pudo crear el almacén"})
    except Exception as e:
        current_app.logger.error(f"Error guardando almacén: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/almacenes/<int:id>', methods=['GET'])
@login_required
def api_almacenes_obtener(id):
    """Obtener almacén por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, responsable, telefono,
                   direccion, activo
            FROM almacenes
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Almacén no encontrado"}), 404
    except Exception as e:
        current_app.logger.error(f"Error obteniendo almacén: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/almacenes/<int:id>', methods=['PUT'])
@login_required
def api_almacenes_actualizar(id):
    """Actualizar almacén"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar almacén {id}: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        if not data.get('responsable'):
            return jsonify({"success": False, "error": "Responsable obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE almacenes SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                responsable = %s,
                telefono = %s,
                direccion = %s,
                activo = %s
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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": "Almacén actualizado correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el almacén"})
    except Exception as e:
        current_app.logger.error(f"Error actualizando almacén: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE almacenes
            SET activo = %s
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activado" if nuevo_estado else "inactivado"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Almacén {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})
    except Exception as e:
        current_app.logger.error(f"Error togglando almacén: {e}")
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
            SELECT id, codigo, nombre, tipo, activo
            FROM categorias
            WHERE activo = true
            ORDER BY tipo, nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        current_app.logger.error(f"Error listando categorías: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/categorias/guardar', methods=['POST'])
@login_required
def api_categorias_guardar():
    """Guardar categoría"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar categoría: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})

        existing = db_query("SELECT id FROM categorias WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una categoría con este código"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": f"Categoría creada con código {result[1]}"
            })

        return jsonify({"success": False, "error": "No se pudo crear la categoría"})
    except Exception as e:
        current_app.logger.error(f"Error guardando categoría: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/categorias/<int:id>', methods=['GET'])
@login_required
def api_categorias_obtener(id):
    """Obtener categoría por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo
            FROM categorias
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Categoría no encontrada"}), 404
    except Exception as e:
        current_app.logger.error(f"Error obteniendo categoría: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/categorias/<int:id>', methods=['PUT'])
@login_required
def api_categorias_actualizar(id):
    """Actualizar categoría"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar categoría {id}: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE categorias SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                activo = %s
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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": "Categoría actualizada correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar la categoría"})
    except Exception as e:
        current_app.logger.error(f"Error actualizando categoría: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE categorias
            SET activo = %s
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Categoría {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})
    except Exception as e:
        current_app.logger.error(f"Error togglando categoría: {e}")
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
            SELECT id, codigo, nombre, tipo, activo
            FROM marcas
            WHERE activo = true
            ORDER BY nombre
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        current_app.logger.error(f"Error listando marcas: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/marcas/guardar', methods=['POST'])
@login_required
def api_marcas_guardar():
    """Guardar marca"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar marca: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})

        existing = db_query("SELECT id FROM marcas WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una marca con este código"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": f"Marca creada con código {result[1]}"
            })

        return jsonify({"success": False, "error": "No se pudo crear la marca"})
    except Exception as e:
        current_app.logger.error(f"Error guardando marca: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/marcas/<int:id>', methods=['GET'])
@login_required
def api_marcas_obtener(id):
    """Obtener marca por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, tipo, activo
            FROM marcas
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Marca no encontrada"}), 404
    except Exception as e:
        current_app.logger.error(f"Error obteniendo marca: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/marcas/<int:id>', methods=['PUT'])
@login_required
def api_marcas_actualizar(id):
    """Actualizar marca"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar marca {id}: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE marcas SET
                codigo = %s,
                nombre = %s,
                tipo = %s,
                activo = %s
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

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": "Marca actualizada correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar la marca"})
    except Exception as e:
        current_app.logger.error(f"Error actualizando marca: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE marcas
            SET activo = %s
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Marca {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})
    except Exception as e:
        current_app.logger.error(f"Error togglando marca: {e}")
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
                   decimales, activo, ambito
            FROM um
            WHERE activo = true
            ORDER BY ambito, codigo
        """
        result = db_query(query)
        return jsonify({"success": True, "data": result or []})
    except Exception as e:
        current_app.logger.error(f"Error listando unidades de medida: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/um/guardar', methods=['POST'])
@login_required
def api_um_guardar():
    """Guardar unidad de medida"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para guardar unidad: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        if not data.get('abreviatura'):
            return jsonify({"success": False, "error": "Abreviatura obligatoria"})

        existing = db_query("SELECT id FROM um WHERE codigo = %s", (data.get('codigo'),))
        if existing:
            return jsonify({"success": False, "error": "Ya existe una unidad con este código"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

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
            data.get('tipo', 'Cantidad'),
            data.get('decimales', False),
            data.get('activo', True),
            data.get('ambito', 'COMPARTIDO')
        )

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": f"Unidad creada con código {result[1]}"
            })

        return jsonify({"success": False, "error": "No se pudo crear la unidad"})
    except Exception as e:
        current_app.logger.error(f"Error guardando unidad de medida: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/um/<int:id>', methods=['GET'])
@login_required
def api_um_obtener(id):
    """Obtener unidad de medida por ID"""
    try:
        query = """
            SELECT id, codigo, nombre, abreviatura, tipo,
                   decimales, activo, ambito
            FROM um
            WHERE id = %s
        """
        result = db_query(query, (id,))
        if result and len(result) > 0:
            return jsonify({"success": True, "data": result[0]})
        return jsonify({"success": False, "error": "Unidad no encontrada"}), 404
    except Exception as e:
        current_app.logger.error(f"Error obteniendo unidad: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@maestros_bp.route('/api/um/<int:id>', methods=['PUT'])
@login_required
def api_um_actualizar(id):
    """Actualizar unidad de medida"""
    try:
        data = request.get_json()
        current_app.logger.info(f"📝 Datos recibidos para actualizar unidad {id}: {data}")

        if not data.get('codigo'):
            return jsonify({"success": False, "error": "Código obligatorio"})
        if not data.get('nombre'):
            return jsonify({"success": False, "error": "Nombre obligatorio"})
        if not data.get('abreviatura'):
            return jsonify({"success": False, "error": "Abreviatura obligatoria"})

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE um SET
                codigo = %s,
                nombre = %s,
                abreviatura = %s,
                tipo = %s,
                decimales = %s,
                ambito = %s,
                activo = %s
            WHERE id = %s
            RETURNING id, codigo
        """

        params = (
            data.get('codigo'),
            data.get('nombre'),
            data.get('abreviatura'),
            data.get('tipo', 'Cantidad'),
            data.get('decimales', False),
            data.get('ambito', 'COMPARTIDO'),
            data.get('activo', True),
            id
        )

        cur.execute(query, params)
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'codigo': result[1]},
                "message": "Unidad actualizada correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar la unidad"})
    except Exception as e:
        current_app.logger.error(f"Error actualizando unidad: {e}")
        traceback.print_exc()
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

        from database import DATABASE_URL
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        query = """
            UPDATE um
            SET activo = %s
            WHERE id = %s
            RETURNING id, activo
        """
        cur.execute(query, (nuevo_estado, id))
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if result:
            estado_texto = "activada" if nuevo_estado else "inactivada"
            return jsonify({
                "success": True,
                "data": {'id': result[0], 'activo': result[1]},
                "message": f"Unidad {estado_texto} correctamente"
            })

        return jsonify({"success": False, "error": "No se pudo actualizar el estado"})
    except Exception as e:
        current_app.logger.error(f"Error togglando unidad de medida: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# ENDPOINT DE PRUEBA
# ==========================================

@maestros_bp.route('/api/test', methods=['GET'])
@login_required
def api_test():
    """Endpoint para probar que la API funciona"""
    return jsonify({"success": True, "message": "API de maestros funcionando correctamente"})


# ============================================================
# BUSCAR CLIENTES (para autocomplete)
# ============================================================

@maestros_bp.route('/api/clientes/buscar', methods=['GET'])
@login_required
def api_clientes_buscar():
    """Buscar clientes por RUC, razón social o nombre comercial"""
    try:
        q = request.args.get('q', '').strip()
        
        if not q or len(q) < 2:
            return jsonify({'success': True, 'data': []})
        
        query = """
            SELECT 
                id, codigo_cliente, razon_social, numero_documento as ruc,
                nombre_comercial, nombre_contacto, telefono_contacto,
                email_contacto, direccion_fiscal, activo
            FROM clientes
            WHERE activo = TRUE
            AND (
                numero_documento ILIKE %s 
                OR razon_social ILIKE %s 
                OR nombre_comercial ILIKE %s
                OR codigo_cliente ILIKE %s
            )
            ORDER BY razon_social
            LIMIT 20
        """
        like = f"%{q}%"
        results = db_query(query, (like, like, like, like))
        
        return jsonify({'success': True, 'data': results})
        
    except Exception as e:
        print(f"❌ Error en api_clientes_buscar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500