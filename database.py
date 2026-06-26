import os
import psycopg2
import json
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# =========================
# SUPABASE DATABASE URL
# =========================
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres.tkfmwvsenvgpyexvdcat:admin3561967kcf@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

if DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

# =========================
# CONEXIÓN
# =========================
def get_connection():
    return psycopg2.connect(DATABASE_URL, client_encoding="UTF8")

# =========================
# TRANSACCIONES
# =========================
@contextmanager
def db_tx():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# =========================
# QUERY
# =========================
def db_query(sql, params=None):
    """Ejecuta una consulta SELECT y devuelve los resultados"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if params:
        cur.execute(sql, params)
    else:
        cur.execute(sql)
    data = cur.fetchall()
    cur.close()
    conn.close()
    return data

def db_execute(sql, params=()):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error en db_execute: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def db_update(sql, params=()):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error en db_update: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def db_insert(sql, params=()):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        if cur.description:
            resultado = cur.fetchone()
            if resultado:
                return resultado[0]
        return None
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Error en db_insert: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# =========================
# USUARIOS (AUTH BÁSICO)
# =========================
def guardar_usuario_db(data):
    conn = get_connection()
    cur = conn.cursor()
    password_hash = generate_password_hash(data['password'])
    cur.execute("""
        INSERT INTO usuarios (
            usuario, password, rol, nombre_completo,
            email, telefono, activo
        ) VALUES (%s, %s, %s, %s, %s, %s, true)
    """, (
        data['usuario'],
        password_hash,
        data['rol'],
        data['nombre_completo'],
        data['email'],
        data['telefono']
    ))
    conn.commit()
    cur.close()
    conn.close()

def listar_usuarios_db():
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, usuario, rol, nombre_completo, email, telefono, activo, fecha_creacion
        FROM usuarios ORDER BY id DESC
    """)
    usuarios = cur.fetchall()
    cur.close()
    conn.close()
    return usuarios

def eliminar_usuario_db(id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM usuarios WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()

def verificar_usuario(usuario: str, password: str):
    rows = db_query("""
        SELECT id, usuario, password, rol, nombre_completo
        FROM usuarios WHERE usuario = %s AND activo = TRUE LIMIT 1
    """, (usuario,))
    if not rows:
        return None
    u = rows[0]
    if check_password_hash(u["password"], password):
        return {
            "id": u["id"],
            "usuario": u["usuario"],
            "rol": u["rol"],
            "nombre_completo": u["nombre_completo"]
        }
    return None

def actualizar_usuario_db(id, data):
    if data.get('password'):
        pwd_hash = generate_password_hash(data['password'])
        db_execute("""
            UPDATE usuarios SET nombre_completo = %s, usuario = %s, password = %s,
                rol = %s, email = %s, telefono = %s
            WHERE id = %s
        """, (
            data['nombre_completo'], data['usuario'], pwd_hash,
            data['rol'], data['email'], data['telefono'], id
        ))
    else:
        db_execute("""
            UPDATE usuarios SET nombre_completo = %s, usuario = %s,
                rol = %s, email = %s, telefono = %s
            WHERE id = %s
        """, (
            data['nombre_completo'], data['usuario'],
            data['rol'], data['email'], data['telefono'], id
        ))

# =========================
# PRODUCTOS
# =========================
def obtener_productos():
    return db_query("""
        SELECT id, familia, codigo, descripcion, descripcion_larga,
            marca, modelo, unidad, peso, observaciones, transporte,
            costo_unitario, precio_unitario, stock, stock_minimo,
            estado, presentacion_proveedor, presentacion_venta,
            venta_minima, codigo_barras, volumen,
            categoria_derivada, origen, tiempo_entrega, abastecimiento,
            activo, fecha_creacion
        FROM productos WHERE activo = TRUE ORDER BY familia, codigo
    """)

def insertar_producto(familia, codigo, descripcion, descripcion_larga="", marca="", modelo="", unidad="Unidad"):
    rows = db_query("""
        INSERT INTO productos (familia, codigo, descripcion, descripcion_larga, marca, modelo, unidad, activo)
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id
    """, (familia, codigo, descripcion, descripcion_larga, marca, modelo, unidad))
    return rows[0]["id"]

def buscar_productos(q: str, limit: int = 15):
    q = (q or "").strip()
    if len(q) < 2:
        return []
    return db_query("""
        SELECT id, codigo, descripcion, marca, modelo, unidad, familia
        FROM productos WHERE activo = TRUE
        AND (codigo ILIKE %s OR descripcion ILIKE %s)
        ORDER BY descripcion LIMIT %s
    """, (f"%{q}%", f"%{q}%", limit))

def obtener_producto_completo_por_id(producto_id):
    rows = db_query("""
        SELECT id, familia, codigo, descripcion, descripcion_larga,
            marca, modelo, unidad, peso, observaciones, transporte,
            costo_unitario, precio_unitario, stock, activo, fecha_creacion
        FROM productos WHERE id = %s LIMIT 1
    """, (producto_id,))
    return dict(rows[0]) if rows else None

def crear_producto_con_stock(data):
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO productos (
                familia, codigo, descripcion, descripcion_larga,
                marca, modelo, unidad, peso, volumen, observaciones,
                transporte, costo_unitario, precio_unitario, stock,
                stock_minimo, estado, presentacion_proveedor,
                presentacion_venta, venta_minima, codigo_barras,
                categoria_derivada, origen, tiempo_entrega, abastecimiento,
                activo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id
        """, (
            data.get('familia'), data.get('codigo'), data.get('descripcion'),
            data.get('descripcion_larga', ''), data.get('marca', ''),
            data.get('modelo', ''), data.get('unidad', 'Unidad'),
            data.get('peso', '0'), data.get('volumen', '0'),
            data.get('observaciones', ''), data.get('transporte', ''),
            float(data.get('costo_unitario', 0) or 0),
            float(data.get('precio_unitario', 0) or 0),
            int(data.get('stock', 0) or 0),
            int(data.get('stock_minimo', 0) or 0),
            data.get('estado', 'activo'),
            data.get('presentacion_proveedor', ''),
            data.get('presentacion_venta', ''),
            int(data.get('venta_minima', 1) or 1),
            data.get('codigo_barras', ''),
            data.get('categoria_derivada', ''),
            data.get('origen', ''),
            data.get('tiempo_entrega', ''),
            data.get('abastecimiento', '')
        ))
        return cur.fetchone()['id']

# =========================
# CLIENTES
# =========================
def obtener_clientes():
    with db_tx() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, tipo_documento, numero_documento, razon_social,
                direccion_fiscal, codigo_cliente, nombre_comercial,
                fecha_creacion, created_at
            FROM clientes WHERE activo = TRUE ORDER BY id DESC
        """)
        clientes = cur.fetchall()
        resultado = []
        for c in clientes:
            cliente_id = c[0]
            cur.execute("""
                SELECT nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos WHERE cliente_id = %s ORDER BY principal DESC
            """, (cliente_id,))
            contactos = [{"nombre_contacto": row[0], "email": row[1], "telefono": row[2], "cargo": row[3], "principal": row[4]} for row in cur.fetchall()]
            cur.execute("""
                SELECT nombre_punto, condicion_pago, direccion, responsable, telefono_contacto, principal
                FROM clientes_puntos_entrega WHERE cliente_id = %s
            """, (cliente_id,))
            puntos = [{"nombre_punto": row[0], "condicion_pago": row[1], "direccion": row[2], "responsable": row[3], "telefono_contacto": row[4], "principal": row[5]} for row in cur.fetchall()]
            resultado.append({
                "id": c[0], "tipo_documento": c[1], "numero_documento": c[2],
                "razon_social": c[3], "direccion_fiscal": c[4], "codigo_cliente": c[5],
                "nombre_comercial": c[6], "fecha_creacion": c[7].isoformat() if c[7] else None,
                "created_at": c[8].isoformat() if len(c) > 8 and c[8] else None,
                "contactos": contactos, "puntos_entrega": puntos
            })
        return resultado

def insertar_cliente(tipo_documento, numero_documento, razon_social, direccion_fiscal, nombre_comercial):
    rows = db_query("""
        INSERT INTO clientes (tipo_documento, numero_documento, razon_social, direccion_fiscal, nombre_comercial)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
    """, (tipo_documento, numero_documento, razon_social, direccion_fiscal, nombre_comercial))
    return rows[0]["id"]

def insertar_contacto_cliente(cliente_id, nombre_contacto, email, telefono, cargo, principal):
    db_execute("""
        INSERT INTO clientes_contactos (cliente_id, nombre_contacto, email, telefono, cargo, principal)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (cliente_id, nombre_contacto, email, telefono, cargo, principal))

def insertar_punto_entrega(cliente_id, nombre_punto, direccion, departamento="", provincia="", distrito="", telefono_contacto="", responsable="", condicion_pago="", tiempo_credito="", principal=False):
    db_execute("""
        INSERT INTO clientes_puntos_entrega (cliente_id, nombre_punto, direccion, departamento, provincia, distrito, telefono_contacto, responsable, condicion_pago, tiempo_credito, principal)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (cliente_id, nombre_punto, direccion, departamento, provincia, distrito, telefono_contacto, responsable, condicion_pago, tiempo_credito, principal))

def buscar_clientes(q: str, limit: int = 10):
    q = (q or "").strip()
    if len(q) < 2:
        return []
    return db_query("""
        SELECT id, tipo_documento, numero_documento, razon_social, direccion_fiscal, codigo_cliente, nombre_comercial
        FROM clientes WHERE activo = TRUE
        AND (numero_documento ILIKE %s OR razon_social ILIKE %s OR nombre_comercial ILIKE %s)
        ORDER BY razon_social LIMIT %s
    """, (f"%{q}%", f"%{q}%", f"%{q}%", limit))

def buscar_clientes_completo(q: str, limit: int = 20):
    q = (q or "").strip()
    if len(q) < 2:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT c.id, c.tipo_documento, c.numero_documento, c.razon_social,
            c.nombre_comercial, c.razon_comercial, c.direccion_fiscal, c.codigo_cliente,
            cc.nombre_contacto, cc.email AS email_contacto, cc.telefono AS telefono_contacto
        FROM clientes c
        LEFT JOIN clientes_contactos cc ON cc.cliente_id = c.id AND cc.principal = TRUE
        WHERE c.activo = TRUE
        AND (c.numero_documento ILIKE %s OR c.razon_social ILIKE %s OR c.nombre_comercial ILIKE %s OR c.razon_comercial ILIKE %s OR cc.nombre_contacto ILIKE %s)
        ORDER BY c.razon_social LIMIT %s
    """
    like_param = f"%{q}%"
    cur.execute(query, (like_param, like_param, like_param, like_param, like_param, limit))
    result = cur.fetchall()
    cur.close()
    conn.close()
    return result

def obtener_cliente_completo_por_id(cliente_id):
    rows = db_query("SELECT * FROM clientes WHERE id = %s LIMIT 1", (cliente_id,))
    if not rows:
        return None
    cliente = dict(rows[0])
    contactos = db_query("SELECT * FROM clientes_contactos WHERE cliente_id = %s", (cliente_id,))
    puntos = db_query("SELECT * FROM clientes_puntos_entrega WHERE cliente_id = %s", (cliente_id,))
    cliente["contactos"] = [dict(c) for c in contactos]
    cliente["puntos_entrega"] = [dict(p) for p in puntos]
    return cliente

def buscar_cliente_por_ruc(ruc: str):
    if not ruc or len(ruc) < 3:
        return None
    rows = db_query("""
        SELECT id, tipo_documento, numero_documento, razon_social, nombre_comercial, direccion_fiscal, codigo_cliente
        FROM clientes WHERE activo = TRUE AND numero_documento = %s LIMIT 1
    """, (ruc,))
    return rows[0] if rows else None

def obtener_cliente_por_documento(numero_documento):
    if not numero_documento:
        return None
    rows = db_query("""
        SELECT id, razon_social, numero_documento, telefono_contacto, email_contacto, nombre_contacto, direccion_fiscal
        FROM clientes WHERE numero_documento = %s AND activo = TRUE LIMIT 1
    """, (numero_documento,))
    return rows[0] if rows else None

def insertar_cliente_completo(data):
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO clientes (tipo_documento, numero_documento, razon_social, nombre_comercial, direccion_fiscal, activo)
            VALUES (%s, %s, %s, %s, %s, TRUE) RETURNING id, codigo_cliente
        """, (
            data.get('tipo_documento'), data.get('numero_documento'),
            data.get('razon_social'), data.get('nombre_comercial'),
            data.get('direccion_fiscal')
        ))
        resultado = cur.fetchone()
        cliente_id = resultado['id']
        codigo_generado = resultado['codigo_cliente']
        for contacto in data.get('contactos', []):
            if contacto.get('nombre_contacto'):
                cur.execute("""
                    INSERT INTO clientes_contactos (cliente_id, nombre, email, telefono, cargo, principal)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (cliente_id, contacto.get('nombre_contacto'), contacto.get('email'), contacto.get('telefono'), contacto.get('cargo'), contacto.get('principal', False)))
        for punto in data.get('puntos_entrega', []):
            if punto.get('nombre_punto'):
                cur.execute("""
                    INSERT INTO clientes_puntos_entrega (cliente_id, nombre_punto, direccion, departamento, provincia, distrito, telefono_contacto, responsable, condicion_pago, tiempo_credito, principal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (cliente_id, punto.get('nombre_punto'), punto.get('direccion'), punto.get('departamento'), punto.get('provincia'), punto.get('distrito'), punto.get('telefono'), punto.get('responsable'), punto.get('condicion_pago'), punto.get('tiempo_credito'), punto.get('principal', False)))
        return {'id': cliente_id, 'codigo_cliente': codigo_generado, 'success': True}

def obtener_ultimo_codigo_cliente():
    rows = db_query("SELECT codigo_cliente FROM clientes WHERE codigo_cliente IS NOT NULL ORDER BY id DESC LIMIT 1")
    return rows[0]['codigo_cliente'] if rows else 'CLI-000000'

def obtener_todos_clientes_con_detalles():
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, tipo_documento, numero_documento, razon_social, nombre_comercial, direccion_fiscal, codigo_cliente, activo, fecha_creacion
            FROM clientes WHERE activo = TRUE ORDER BY id DESC
        """)
        clientes = cur.fetchall()
        resultado = []
        for cliente in clientes:
            cliente_id = cliente['id']
            cur.execute("SELECT id, nombre_contacto, email, telefono, cargo, principal FROM clientes_contactos WHERE cliente_id = %s", (cliente_id,))
            contactos = cur.fetchall()
            cur.execute("SELECT id, nombre_punto, direccion, departamento, provincia, distrito, telefono_contacto, responsable, condicion_pago, tiempo_credito, principal FROM clientes_puntos_entrega WHERE cliente_id = %s", (cliente_id,))
            puntos = cur.fetchall()
            cliente['contactos'] = contactos
            cliente['puntos_entrega'] = puntos
            resultado.append(cliente)
        return resultado

def actualizar_cliente_completo(cliente_id, data):
    with db_tx() as conn:
        cur = conn.cursor()
        cur.execute("""
            UPDATE clientes SET tipo_documento = %s, numero_documento = %s,
                razon_social = %s, nombre_comercial = %s, direccion_fiscal = %s
            WHERE id = %s
        """, (data.get('tipo_documento'), data.get('numero_documento'), data.get('razon_social'), data.get('nombre_comercial'), data.get('direccion_fiscal'), cliente_id))
        cur.execute("DELETE FROM clientes_contactos WHERE cliente_id = %s", (cliente_id,))
        for contacto in data.get('contactos', []):
            if contacto.get('nombre_contacto'):
                cur.execute("""
                    INSERT INTO clientes_contactos (cliente_id, nombre_contacto, email, telefono, cargo, principal)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (cliente_id, contacto.get('nombre_contacto'), contacto.get('email'), contacto.get('telefono'), contacto.get('cargo'), contacto.get('principal', False)))
        cur.execute("DELETE FROM clientes_puntos_entrega WHERE cliente_id = %s", (cliente_id,))
        for punto in data.get('puntos_entrega', []):
            if punto.get('nombre_punto'):
                cur.execute("""
                    INSERT INTO clientes_puntos_entrega (cliente_id, nombre_punto, direccion, departamento, provincia, distrito, telefono_contacto, responsable, condicion_pago, tiempo_credito, principal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (cliente_id, punto.get('nombre_punto'), punto.get('direccion'), punto.get('departamento'), punto.get('provincia'), punto.get('distrito'), punto.get('telefono'), punto.get('responsable'), punto.get('condicion_pago'), punto.get('tiempo_credito'), punto.get('principal', False)))
        return {'success': True}

def eliminar_cliente_db(cliente_id):
    db_execute("UPDATE clientes SET activo = FALSE WHERE id = %s", (cliente_id,))
    return {'success': True}

# =========================
# PROVEEDORES
# =========================
def insertar_proveedor(razon_social, ruc, direccion, telefono="", contacto="", email="", razon_comercial="", condicion_pago="", tiempo_credito="", banco="", numero_cuenta="", cci="", lugar_recojo=""):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_proveedor FROM 6) AS INTEGER)), 0) + 1 as siguiente
                FROM proveedores WHERE codigo_proveedor LIKE 'PROV-%'
            """)
            siguiente = cur.fetchone()['siguiente']
            codigo_proveedor = f"PROV-{siguiente:05d}"
            cur.execute("""
                INSERT INTO proveedores (codigo_proveedor, razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, activo, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW()) RETURNING id
            """, (codigo_proveedor, razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo))
            return cur.fetchone()['id']
    except Exception as e:
        print(f"Error insertando proveedor: {e}")
        raise

def obtener_proveedores(busqueda=None, codigo=None, tipo_documento=None):
    try:
        query = """
            SELECT id, codigo_proveedor, razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, fecha_creacion, activo
            FROM proveedores WHERE activo = TRUE
        """
        params = []
        if codigo:
            query += " AND codigo_proveedor ILIKE %s"
            params.append(f"%{codigo}%")
        if busqueda:
            query += " AND (razon_social ILIKE %s OR ruc ILIKE %s OR codigo_proveedor ILIKE %s OR contacto ILIKE %s)"
            like = f"%{busqueda}%"
            params.extend([like, like, like, like])
        if tipo_documento:
            query += " AND condicion_pago = %s"
            params.append(tipo_documento)
        query += " ORDER BY razon_social ASC"
        return db_query(query, params if params else None)
    except Exception as e:
        print(f"Error en obtener_proveedores: {e}")
        return []

def insertar_proveedor_completo(data):
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO proveedores (razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id, codigo_proveedor
        """, (
            data.get('razon_social'), data.get('razon_comercial'), data.get('ruc'),
            data.get('direccion'), data.get('telefono'), data.get('contacto'),
            data.get('email'), data.get('condicion_pago'), data.get('tiempo_credito'),
            data.get('banco'), data.get('numero_cuenta'), data.get('cci'),
            data.get('lugar_recojo')
        ))
        resultado = cur.fetchone()
        return {'id': resultado['id'], 'codigo_proveedor': resultado['codigo_proveedor'], 'success': True}

def obtener_todos_proveedores():
    return db_query("""
        SELECT id, codigo_proveedor, razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, activo, fecha_creacion
        FROM proveedores WHERE activo = TRUE ORDER BY id DESC
    """)

def obtener_proveedor_por_id(proveedor_id):
    try:
        rows = db_query("""
            SELECT id, codigo_proveedor, razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, activo, fecha_creacion
            FROM proveedores WHERE id = %s AND activo = TRUE
        """, (proveedor_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_proveedor_por_id: {e}")
        return None

def actualizar_proveedor(proveedor_id, razon_social=None, razon_comercial=None, ruc=None, direccion=None, telefono=None, contacto=None, email=None, condicion_pago=None, tiempo_credito=None, banco=None, numero_cuenta=None, cci=None, lugar_recojo=None):
    try:
        db_execute("""
            UPDATE proveedores SET razon_social = %s, razon_comercial = %s, ruc = %s, direccion = %s, telefono = %s, contacto = %s, email = %s, condicion_pago = %s, tiempo_credito = %s, banco = %s, numero_cuenta = %s, cci = %s, lugar_recojo = %s
            WHERE id = %s AND activo = TRUE
        """, (razon_social, razon_comercial, ruc, direccion, telefono, contacto, email, condicion_pago, tiempo_credito, banco, numero_cuenta, cci, lugar_recojo, proveedor_id))
        return {'success': True}
    except Exception as e:
        print(f"Error actualizando proveedor {proveedor_id}: {e}")
        raise

def eliminar_proveedor_db(proveedor_id):
    db_execute("UPDATE proveedores SET activo = FALSE WHERE id = %s", (proveedor_id,))
    return {'success': True}

def obtener_ultimo_codigo_proveedor():
    rows = db_query("SELECT codigo_proveedor FROM proveedores WHERE codigo_proveedor IS NOT NULL ORDER BY id DESC LIMIT 1")
    return rows[0]['codigo_proveedor'] if rows else 'PROV-000000'

def buscar_proveedor_por_ruc(ruc):
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, razon_social, ruc as numero_documento, direccion, telefono as telefono_contacto, contacto as nombre_contacto, email as email_contacto
            FROM proveedores WHERE ruc = %s AND activo = TRUE
        """, (ruc,))
        proveedor = cursor.fetchone()
        conn.close()
        return proveedor
    except Exception as e:
        print(f"Error en buscar_proveedor_por_ruc: {e}")
        return None

# =========================
# COTIZACIONES
# =========================
def obtener_cotizaciones_recientes(limit: int = 200):
    return db_query("""
        SELECT c.id, c.numero_cotizacion, c.fecha_creacion, c.estado, c.total,
            cl.razon_social AS cliente_razon_social, cl.numero_documento AS cliente_ruc
        FROM cotizaciones c JOIN clientes cl ON c.cliente_id = cl.id ORDER BY c.id DESC LIMIT %s
    """, (limit,))

def crear_cotizacion_transaccional(payload: dict, usuario_id: int):
    cliente_id = payload.get("cliente_id")
    productos = payload.get("productos", [])
    if not cliente_id:
        raise ValueError("cliente_id es requerido")
    if not productos:
        raise ValueError("Debe enviar productos")
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        prefix = f"COT-{datetime.now().strftime('%y%m')}"
        cur.execute("SELECT numero_cotizacion FROM cotizaciones WHERE numero_cotizacion LIKE %s ORDER BY id DESC LIMIT 1", (f"{prefix}%",))
        row = cur.fetchone()
        nuevo = 1
        if row:
            try:
                nuevo = int(row["numero_cotizacion"][-4:]) + 1
            except:
                pass
        numero = f"{prefix}{nuevo:04d}"
        cur.execute("""
            INSERT INTO cotizaciones (numero_cotizacion, cliente_id, estado, subtotal, igv, total, usuario_id, notas, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, (NOW() AT TIME ZONE 'America/Lima')) RETURNING id
        """, (numero, int(cliente_id), payload.get("estado", "En Proceso"), float(payload.get("subtotal", 0)), float(payload.get("igv", 0)), float(payload.get("total", 0)), int(usuario_id), payload.get("notas", "")))
        cotizacion_id = cur.fetchone()["id"]
        for item in productos:
            cur.execute("INSERT INTO cotizacion_detalle (cotizacion_id, producto_id, cantidad) VALUES (%s,%s,%s)", (cotizacion_id, int(item["producto_id"]), float(item["cantidad"])))
        return {"cotizacion_id": cotizacion_id, "numero_cotizacion": numero}

def obtener_cotizacion_completa(cotizacion_id):
    rows = db_query("""
        SELECT c.id, c.numero_cotizacion, c.codigo_cotizacion, c.correlativo, c.fecha_creacion, c.estado, c.subtotal, c.igv, c.total, c.usuario_id, c.notas, c.condicion_pago, c.tiempo_entrega, c.validez_oferta, c.direccion_entrega, c.requerimiento, c.nota_cotizacion, c.cliente_id, c.contacto_cliente, c.telefono_cliente, c.email_cliente, cl.razon_social, cl.numero_documento, cl.direccion_fiscal, cl.telefono_contacto, cl.nombre_contacto, cl.email_contacto, u.nombre_completo, u.email, u.telefono
        FROM cotizaciones c LEFT JOIN clientes cl ON c.cliente_id = cl.id LEFT JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = %s LIMIT 1
    """, (cotizacion_id,))
    if not rows:
        return None
    cotizacion = dict(rows[0])
    if cotizacion.get('fecha_creacion') and hasattr(cotizacion['fecha_creacion'], 'strftime'):
        cotizacion['fecha_creacion'] = cotizacion['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
    detalle = db_query("""
        SELECT d.*, p.codigo, p.descripcion, p.marca, p.modelo, p.unidad, p.costo_unitario
        FROM cotizacion_detalle d JOIN productos p ON p.id = d.producto_id WHERE d.cotizacion_id = %s
    """, (cotizacion_id,))
    cotizacion["detalle"] = [dict(d) for d in detalle]
    return {"cabecera": cotizacion, "detalle": cotizacion["detalle"]}

# =========================
# ÓRDENES DE COMPRA
# =========================
def obtener_orden_completa(orden_id):
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT o.*, p.razon_social as proveedor, p.ruc as proveedor_ruc, p.direccion as proveedor_direccion, p.contacto as proveedor_contacto, p.telefono as telefono_contacto, p.email as email_contacto_proveedor, p.codigo_proveedor as codigo_proveedor, p.razon_comercial as nombre_comercial, u.nombre_completo as comprador, u.email as comprador_email, u.telefono as comprador_telefono
            FROM ordenes_compra o LEFT JOIN proveedores p ON o.proveedor_id = p.id LEFT JOIN usuarios u ON o.usuario_id = u.id WHERE o.id = %s
        """, (orden_id,))
        cabecera = cursor.fetchone()
        if not cabecera:
            conn.close()
            return None
        cursor.execute("""
            SELECT d.*, pr.codigo, pr.descripcion, pr.marca, pr.modelo, pr.unidad as unidad_medida
            FROM orden_compra_detalle d LEFT JOIN productos pr ON d.producto_id = pr.id WHERE d.orden_id = %s
        """, (orden_id,))
        detalles = cursor.fetchall()
        conn.close()
        cabecera_dict = dict(cabecera)
        for key in ['proveedor', 'proveedor_ruc', 'proveedor_direccion', 'proveedor_contacto', 'telefono_contacto', 'email_contacto_proveedor', 'codigo_proveedor', 'nombre_comercial', 'comprador']:
            if key not in cabecera_dict or cabecera_dict[key] is None:
                cabecera_dict[key] = '--'
        if cabecera_dict.get('fecha_creacion') and hasattr(cabecera_dict['fecha_creacion'], 'strftime'):
            cabecera_dict['fecha_creacion'] = cabecera_dict['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
        detalles_list = []
        for detalle in detalles:
            detalle_dict = dict(detalle)
            for key in ['codigo', 'descripcion', 'marca', 'modelo', 'unidad_medida']:
                if key not in detalle_dict or detalle_dict[key] is None:
                    detalle_dict[key] = '--'
            detalles_list.append(detalle_dict)
        return {"cabecera": cabecera_dict, "detalle": detalles_list}
    except Exception as e:
        print(f"Error en obtener_orden_completa: {e}")
        return None

def obtener_ordenes_recientes(limit=100):
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT o.*, p.ruc as proveedor_ruc, p.razon_social as proveedor, COALESCE(p.razon_comercial, p.razon_social) as nombre_comercial, p.contacto as proveedor_contacto, p.telefono as telefono_contacto, p.email as email_contacto_proveedor, p.direccion as proveedor_direccion, p.codigo_proveedor as codigo_proveedor, u.nombre_completo as comprador, u.email as comprador_email, u.telefono as comprador_telefono, COUNT(d.id) as total_items, COALESCE(SUM(d.cantidad), 0) as cantidad_total_items, COALESCE(SUM(d.subtotal_venta_con_descuento), 0) as total_detalle
            FROM ordenes_compra o LEFT JOIN proveedores p ON o.proveedor_id = p.id LEFT JOIN usuarios u ON o.usuario_id = u.id LEFT JOIN orden_compra_detalle d ON o.id = d.orden_id
            GROUP BY o.id, p.ruc, p.razon_social, p.razon_comercial, p.contacto, p.telefono, p.email, p.direccion, p.codigo_proveedor, u.nombre_completo, u.email, u.telefono
            ORDER BY o.id DESC LIMIT %s
        """, (limit,))
        ordenes = cursor.fetchall()
        conn.close()
        resultado = []
        for orden in ordenes:
            d = dict(orden)
            if d.get('fecha_creacion') and hasattr(d['fecha_creacion'], 'strftime'):
                d['fecha_creacion'] = d['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
            for key in ['proveedor', 'proveedor_ruc', 'nombre_comercial', 'proveedor_contacto', 'telefono_contacto', 'email_contacto_proveedor', 'proveedor_direccion', 'codigo_proveedor', 'comprador']:
                if d.get(key) is None:
                    d[key] = '--'
            resultado.append(d)
        return resultado
    except Exception as e:
        print(f"Error en obtener_ordenes_recientes: {e}")
        return []

def crear_orden_compra_transaccional(payload: dict, usuario_id: int):
    try:
        proveedor_id = payload.get("proveedor_id")
        productos = payload.get("productos", [])
        if not proveedor_id:
            raise ValueError("proveedor_id es requerido")
        if not productos:
            raise ValueError("Debe enviar productos")
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT numero_orden FROM ordenes_compra WHERE numero_orden LIKE 'OC-%' ORDER BY id DESC LIMIT 1")
            row = cur.fetchone()
            if row:
                try:
                    nuevo_numero = int(row["numero_orden"][3:]) + 1
                except:
                    nuevo_numero = 1
            else:
                nuevo_numero = 1
            numero_orden = f"OC-{nuevo_numero:05d}"
            cur.execute("""
                INSERT INTO ordenes_compra (numero_orden, codigo_orden, proveedor_id, usuario_id, estado, subtotal, igv, total, condicion_pago, tiempo_entrega, fecha_requerida, lugar_entrega, num_cotizacion, nota_compra, notas, contacto_proveedor, telefono_proveedor, email_proveedor, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()) RETURNING id, codigo_orden
            """, (numero_orden, payload.get("codigo_orden", numero_orden), proveedor_id, usuario_id, payload.get("estado", "pendiente"), float(payload.get("subtotal", 0)), float(payload.get("igv", 0)), float(payload.get("total", 0)), payload.get("condicion_pago"), payload.get("tiempo_entrega"), payload.get("fecha_requerida"), payload.get("lugar_entrega"), payload.get("num_cotizacion"), payload.get("nota_compra"), payload.get("notas", ""), payload.get("contacto_proveedor"), payload.get("telefono_proveedor"), payload.get("email_proveedor")))
            resultado = cur.fetchone()
            orden_id = resultado["id"]
            codigo_orden = resultado["codigo_orden"]
            for item in productos:
                cur.execute("""
                    INSERT INTO orden_compra_detalle (orden_id, producto_id, cantidad, costo_unitario, subtotal_costo, margen_porcentaje, precio_venta_unitario, subtotal_venta, descuento_porcentaje, precio_venta_con_descuento, subtotal_venta_con_descuento, descuento_total, margen_final)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (orden_id, item.get("producto_id"), float(item.get("cantidad", 0)), float(item.get("costo_unitario", 0)), float(item.get("subtotal_costo", 0)), float(item.get("margen_porcentaje", 0)), float(item.get("precio_venta_unitario", 0)), float(item.get("subtotal_venta", 0)), float(item.get("descuento_porcentaje", 0)), float(item.get("precio_venta_con_descuento", 0)), float(item.get("subtotal_venta_con_descuento", 0)), float(item.get("descuento_total", 0)), float(item.get("margen_final", 0))))
            return {"orden_id": orden_id, "numero_orden": numero_orden, "codigo_orden": codigo_orden, "success": True}
    except Exception as e:
        print(f"Error en crear_orden_compra_transaccional: {e}")
        raise

def actualizar_orden_compra(orden_id: int, payload: dict):
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE ordenes_compra SET proveedor_id = %s, estado = %s, subtotal = %s, igv = %s, total = %s, condicion_pago = %s, tiempo_entrega = %s, fecha_requerida = %s, lugar_entrega = %s, num_cotizacion = %s, nota_compra = %s, notas = %s, contacto_proveedor = %s, telefono_proveedor = %s, email_proveedor = %s, updated_at = NOW()
                WHERE id = %s
            """, (payload.get("proveedor_id"), payload.get("estado", "pendiente"), float(payload.get("subtotal", 0)), float(payload.get("igv", 0)), float(payload.get("total", 0)), payload.get("condicion_pago"), payload.get("tiempo_entrega"), payload.get("fecha_requerida"), payload.get("lugar_entrega"), payload.get("num_cotizacion"), payload.get("nota_compra"), payload.get("notas", ""), payload.get("contacto_proveedor"), payload.get("telefono_proveedor"), payload.get("email_proveedor"), orden_id))
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
            for item in payload.get("productos", []):
                cur.execute("""
                    INSERT INTO orden_compra_detalle (orden_id, producto_id, cantidad, costo_unitario, subtotal_costo, margen_porcentaje, precio_venta_unitario, subtotal_venta, descuento_porcentaje, precio_venta_con_descuento, subtotal_venta_con_descuento, descuento_total, margen_final)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (orden_id, item.get("producto_id"), float(item.get("cantidad", 0)), float(item.get("costo_unitario", 0)), float(item.get("subtotal_costo", 0)), float(item.get("margen_porcentaje", 0)), float(item.get("precio_venta_unitario", 0)), float(item.get("subtotal_venta", 0)), float(item.get("descuento_porcentaje", 0)), float(item.get("precio_venta_con_descuento", 0)), float(item.get("subtotal_venta_con_descuento", 0)), float(item.get("descuento_total", 0)), float(item.get("margen_final", 0))))
        return {"success": True}
    except Exception as e:
        print(f"Error en actualizar_orden_compra: {e}")
        raise

def eliminar_orden_compra_db(orden_id: int):
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
            cur.execute("DELETE FROM ordenes_compra WHERE id = %s", (orden_id,))
        return {"success": True}
    except Exception as e:
        print(f"Error en eliminar_orden_compra_db: {e}")
        raise

# =========================
# COMPROBANTES (VENTA)
# =========================
def obtener_comprobantes():
    try:
        return db_query("SELECT id, tipo_comprobante, serie, numero, cliente_nombre, cliente_numero_doc, fecha_emision, subtotal, igv, total, estado_sunat, created_at FROM comprobantes ORDER BY created_at DESC")
    except Exception as e:
        print(f"Error en obtener_comprobantes: {e}")
        return []

def obtener_comprobante_por_id(comp_id):
    try:
        rows = db_query("SELECT * FROM comprobantes WHERE id = %s", (comp_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_comprobante_por_id: {e}")
        return None

def insertar_comprobante(data):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO comprobantes (tipo_comprobante, serie, numero, fecha_emision, moneda, cliente_tipo_doc, cliente_numero_doc, cliente_nombre, cliente_direccion, cliente_email, cliente_telefono, subtotal, igv, total, items_json, observaciones, estado_sunat, creado_por)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (data.get('tipo_comprobante'), data.get('serie'), data.get('numero'), data.get('fecha_emision'), data.get('moneda', 'PEN'), data.get('cliente_tipo_doc', 'RUC'), data.get('cliente_numero_doc'), data.get('cliente_nombre'), data.get('cliente_direccion'), data.get('cliente_email'), data.get('cliente_telefono'), data.get('subtotal', 0), data.get('igv', 0), data.get('total', 0), data.get('items_json', '[]'), data.get('observaciones', ''), data.get('estado_sunat', 'BORRADOR'), data.get('creado_por')))
            result = cur.fetchone()
            return result['id'] if result else None
    except Exception as e:
        print(f"Error en insertar_comprobante: {e}")
        raise

def actualizar_comprobante(comp_id, data):
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE comprobantes SET fecha_emision = %s, cliente_tipo_doc = %s, cliente_numero_doc = %s, cliente_nombre = %s, cliente_direccion = %s, cliente_email = %s, cliente_telefono = %s, subtotal = %s, igv = %s, total = %s, items_json = %s, observaciones = %s, updated_at = NOW()
                WHERE id = %s
            """, (data.get('fecha_emision'), data.get('cliente_tipo_doc', 'RUC'), data.get('cliente_numero_doc'), data.get('cliente_nombre'), data.get('cliente_direccion'), data.get('cliente_email'), data.get('cliente_telefono'), data.get('subtotal', 0), data.get('igv', 0), data.get('total', 0), data.get('items_json', '[]'), data.get('observaciones', ''), comp_id))
        return True
    except Exception as e:
        print(f"Error en actualizar_comprobante: {e}")
        raise

def eliminar_comprobante_db(comp_id):
    try:
        db_execute("DELETE FROM comprobantes WHERE id = %s", (comp_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_comprobante_db: {e}")
        raise

def obtener_ultimo_numero_comprobante(serie):
    try:
        rows = db_query("SELECT COALESCE(MAX(numero), 0) as ultimo_numero FROM comprobantes WHERE serie = %s", (serie,))
        return rows[0]['ultimo_numero'] if rows else 0
    except Exception as e:
        print(f"Error en obtener_ultimo_numero_comprobante: {e}")
        return 0

# =========================
# COMPROBANTES (COMPRA)
# =========================
def obtener_comprobantes_compra():
    try:
        return db_query("SELECT id, tipo_comprobante, serie, numero, proveedor_nombre, proveedor_numero_doc, fecha_emision, subtotal, igv, total, estado, created_at FROM comprobantes_compra ORDER BY created_at DESC")
    except Exception as e:
        print(f"Error en obtener_comprobantes_compra: {e}")
        return []

def obtener_comprobante_compra_por_id(comp_id):
    try:
        rows = db_query("SELECT * FROM comprobantes_compra WHERE id = %s", (comp_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_comprobante_compra_por_id: {e}")
        return None

def insertar_comprobante_compra(data):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO comprobantes_compra (tipo_comprobante, serie, numero, fecha_emision, moneda, proveedor_tipo_doc, proveedor_numero_doc, proveedor_nombre, proveedor_direccion, proveedor_email, proveedor_telefono, subtotal, igv, total, items_json, observaciones, estado, creado_por)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (data.get('tipo_comprobante'), data.get('serie'), data.get('numero'), data.get('fecha_emision'), data.get('moneda', 'PEN'), data.get('proveedor_tipo_doc', 'RUC'), data.get('proveedor_numero_doc'), data.get('proveedor_nombre'), data.get('proveedor_direccion'), data.get('proveedor_email'), data.get('proveedor_telefono'), data.get('subtotal', 0), data.get('igv', 0), data.get('total', 0), data.get('items_json', '[]'), data.get('observaciones', ''), data.get('estado', 'BORRADOR'), data.get('creado_por')))
            result = cur.fetchone()
            return result['id'] if result else None
    except Exception as e:
        print(f"Error en insertar_comprobante_compra: {e}")
        raise

def eliminar_comprobante_compra_db(comp_id):
    try:
        db_execute("DELETE FROM comprobantes_compra WHERE id = %s", (comp_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_comprobante_compra_db: {e}")
        raise

# =========================
# GUÍAS DE REMISIÓN (COMPRA)
# =========================
def obtener_guias_compra():
    try:
        return db_query("SELECT id, serie, numero, proveedor_nombre, proveedor_ruc, fecha_emision, fecha_traslado, placa_vehiculo, peso_total, estado, created_at FROM guias_remision_compra ORDER BY created_at DESC")
    except Exception as e:
        print(f"Error en obtener_guias_compra: {e}")
        return []

def obtener_guia_compra_por_id(guia_id):
    try:
        rows = db_query("SELECT * FROM guias_remision_compra WHERE id = %s", (guia_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_guia_compra_por_id: {e}")
        return None

# =========================
# TRANSPORTISTAS
# =========================
def obtener_transportistas(activo=True):
    try:
        query = """
            SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo
            FROM transportistas WHERE activo = TRUE ORDER BY nombre_completo
        """
        if not activo:
            query = """
                SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo
                FROM transportistas ORDER BY nombre_completo
            """
        return db_query(query)
    except Exception as e:
        print(f"Error en obtener_transportistas: {e}")
        return []

def obtener_transportista_por_id(transportista_id):
    try:
        rows = db_query("SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo FROM transportistas WHERE id = %s AND activo = TRUE", (transportista_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_transportista_por_id: {e}")
        return None

# =========================
# CONFIGURACIÓN Y SEGURIDAD - MÓDULO 1
# =========================

# =========================
# 1. EMPRESAS
# =========================
def obtener_empresas(activo=True):
    try:
        query = """
            SELECT e.id, e.codigo, e.nombre_corto, e.nombre_comercial, e.razon_social, e.ruc,
                e.direccion_fiscal, e.telefono, e.correo_documentos, e.logo_url,
                e.color_primario, e.color_secundario, e.color_pastel, e.estado,
                e.created_at, e.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', cb.id, 'banco', cb.banco, 'tipo_cuenta', cb.tipo_cuenta,
                            'moneda', cb.moneda, 'numero_cuenta', cb.numero_cuenta,
                            'cci', cb.cci, 'es_principal', cb.es_principal, 'estado', cb.estado
                        )
                    )
                    FROM erp_empresa_cuentas_bancarias cb
                    WHERE cb.empresa_id = e.id AND cb.estado = 'activo'
                ) as cuentas_bancarias
            FROM erp_empresas e
        """
        if activo:
            query += " WHERE e.estado = 'activo'"
        query += " ORDER BY e.codigo"
        return db_query(query)
    except Exception as e:
        print(f"Error en obtener_empresas: {e}")
        return []

def obtener_empresa_por_id(empresa_id):
    try:
        rows = db_query("""
            SELECT e.*,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', cb.id, 'banco', cb.banco, 'tipo_cuenta', cb.tipo_cuenta,
                            'moneda', cb.moneda, 'numero_cuenta', cb.numero_cuenta,
                            'cci', cb.cci, 'es_principal', cb.es_principal, 'estado', cb.estado
                        )
                    )
                    FROM erp_empresa_cuentas_bancarias cb
                    WHERE cb.empresa_id = e.id AND cb.estado = 'activo'
                ) as cuentas_bancarias
            FROM erp_empresas e WHERE e.id = %s AND e.estado = 'activo'
        """, (empresa_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_empresa_por_id: {e}")
        return None

def obtener_empresa_por_codigo(codigo):
    try:
        rows = db_query("""
            SELECT id, codigo, nombre_corto, nombre_comercial, razon_social, ruc,
                direccion_fiscal, telefono, correo_documentos, logo_url,
                color_primario, color_secundario, color_pastel, estado,
                created_at, updated_at
            FROM erp_empresas WHERE codigo = %s AND estado = 'activo'
        """, (codigo,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_empresa_por_codigo: {e}")
        return None

def crear_empresa(data):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO erp_empresas (codigo, nombre_corto, nombre_comercial, razon_social, ruc, direccion_fiscal, telefono, correo_documentos, logo_url, color_primario, color_secundario, color_pastel, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (data.get('codigo'), data.get('nombre_corto'), data.get('nombre_comercial'), data.get('razon_social'), data.get('ruc'), data.get('direccion_fiscal', ''), data.get('telefono', ''), data.get('correo_documentos', ''), data.get('logo_url', ''), data.get('color_primario', '#EF233C'), data.get('color_secundario', '#1F1F1F'), data.get('color_pastel', '#FFECEF'), data.get('estado', 'activo')))
            empresa_id = cur.fetchone()['id']
            for cuenta in data.get('cuentas_bancarias', []):
                if cuenta.get('banco'):
                    cur.execute("""
                        INSERT INTO erp_empresa_cuentas_bancarias (empresa_id, banco, tipo_cuenta, moneda, numero_cuenta, cci, es_principal, estado)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (empresa_id, cuenta.get('banco'), cuenta.get('tipo_cuenta'), cuenta.get('moneda', 'PEN'), cuenta.get('numero_cuenta'), cuenta.get('cci'), cuenta.get('es_principal', False), cuenta.get('estado', 'activo')))
            return empresa_id
    except Exception as e:
        print(f"Error en crear_empresa: {e}")
        raise

def actualizar_empresa(empresa_id, data):
    try:
        db_execute("""
            UPDATE erp_empresas SET codigo = %s, nombre_corto = %s, nombre_comercial = %s,
                razon_social = %s, ruc = %s, direccion_fiscal = %s, telefono = %s,
                correo_documentos = %s, logo_url = %s, color_primario = %s,
                color_secundario = %s, color_pastel = %s, estado = %s, updated_at = NOW()
            WHERE id = %s
        """, (data.get('codigo'), data.get('nombre_corto'), data.get('nombre_comercial'), data.get('razon_social'), data.get('ruc'), data.get('direccion_fiscal', ''), data.get('telefono', ''), data.get('correo_documentos', ''), data.get('logo_url', ''), data.get('color_primario', '#EF233C'), data.get('color_secundario', '#1F1F1F'), data.get('color_pastel', '#FFECEF'), data.get('estado', 'activo'), empresa_id))
        return True
    except Exception as e:
        print(f"Error en actualizar_empresa: {e}")
        raise

def eliminar_empresa_db(empresa_id):
    try:
        db_execute("UPDATE erp_empresas SET estado = 'inactivo', updated_at = NOW() WHERE id = %s", (empresa_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_empresa_db: {e}")
        raise

# =========================
# 2. USUARIOS Y PERMISOS
# =========================
def obtener_usuarios(activo=True):
    try:
        query = """
            SELECT u.id, u.auth_user_id, u.usuario_sistema, u.nombres_apellidos, u.area,
                u.correo, u.celular, u.estado, u.created_at, u.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', ue.id, 'empresa_id', ue.empresa_id,
                            'empresa_codigo', e.codigo, 'empresa_nombre', e.nombre_comercial,
                            'es_principal', ue.es_empresa_principal, 'estado', ue.estado,
                            'rol_id', ue.rol_id, 'rol_codigo', r.codigo,
                            'rol_nombre', r.nombre, 'rol_es_admin', r.es_admin
                        )
                    )
                    FROM erp_usuario_empresas ue
                    LEFT JOIN erp_empresas e ON e.id = ue.empresa_id
                    LEFT JOIN erp_roles r ON r.id = ue.rol_id
                    WHERE ue.auth_user_id = u.auth_user_id AND ue.estado = 'activo'
                ) as empresas_acceso
            FROM usuarios u
        """
        if activo:
            query += " WHERE u.estado = 'activo'"
        query += " ORDER BY u.usuario_sistema"
        return db_query(query)
    except Exception as e:
        print(f"Error en obtener_usuarios: {e}")
        return []

def obtener_usuario_por_id(usuario_id):
    try:
        rows = db_query("""
            SELECT id, auth_user_id, usuario_sistema, nombres_apellidos, area,
                correo, celular, estado, created_at, updated_at
            FROM usuarios WHERE id = %s AND estado = 'activo'
        """, (usuario_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_usuario_por_id: {e}")
        return None

def crear_usuario(data):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO usuarios (auth_user_id, usuario_sistema, nombres_apellidos, area, correo, celular, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (data.get('auth_user_id'), data.get('usuario_sistema'), data.get('nombres_apellidos'), data.get('area'), data.get('correo'), data.get('celular'), data.get('estado', 'activo')))
            usuario_id = cur.fetchone()['id']
            for acceso in data.get('empresas_acceso', []):
                if acceso.get('empresa_id') and acceso.get('rol_id'):
                    cur.execute("""
                        INSERT INTO erp_usuario_empresas (auth_user_id, empresa_id, rol_id, es_empresa_principal, estado)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (auth_user_id, empresa_id) DO UPDATE SET rol_id = EXCLUDED.rol_id, estado = EXCLUDED.estado
                    """, (data.get('auth_user_id'), acceso.get('empresa_id'), acceso.get('rol_id'), acceso.get('es_empresa_principal', False), acceso.get('estado', 'activo')))
            return usuario_id
    except Exception as e:
        print(f"Error en crear_usuario: {e}")
        raise

def actualizar_usuario(usuario_id, data):
    try:
        db_execute("""
            UPDATE usuarios SET usuario_sistema = %s, nombres_apellidos = %s,
                area = %s, correo = %s, celular = %s, estado = %s, updated_at = NOW()
            WHERE id = %s
        """, (data.get('usuario_sistema'), data.get('nombres_apellidos'), data.get('area'), data.get('correo'), data.get('celular'), data.get('estado', 'activo'), usuario_id))
        return True
    except Exception as e:
        print(f"Error en actualizar_usuario: {e}")
        raise

def eliminar_usuario_db(usuario_id):
    try:
        db_execute("UPDATE usuarios SET estado = 'inactivo', updated_at = NOW() WHERE id = %s", (usuario_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_usuario_db: {e}")
        raise

def obtener_roles():
    try:
        return db_query("""
            SELECT id, codigo, nombre, descripcion, es_admin, estado, created_at, updated_at
            FROM erp_roles WHERE estado = 'activo' ORDER BY nombre
        """)
    except Exception as e:
        print(f"Error en obtener_roles: {e}")
        return []

# =========================
# 3. CORRELATIVOS
# =========================
def obtener_correlativos(activo=True):
    try:
        query = """
            SELECT c.id, c.empresa_id, e.codigo as empresa_codigo,
                e.nombre_comercial as empresa_nombre, c.documento,
                c.codigo_documento, c.prefijo, c.anio, c.ultimo_numero,
                c.estado, c.created_at, c.updated_at
            FROM erp_correlativos c
            JOIN erp_empresas e ON e.id = c.empresa_id
        """
        if activo:
            query += " WHERE c.estado = 'activo'"
        query += " ORDER BY e.codigo, c.documento"
        return db_query(query)
    except Exception as e:
        print(f"Error en obtener_correlativos: {e}")
        return []

def crear_correlativo(data):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO erp_correlativos (empresa_id, documento, codigo_documento, prefijo, anio, ultimo_numero, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (data.get('empresa_id'), data.get('documento'), data.get('codigo_documento'), data.get('prefijo'), data.get('anio', datetime.now().year), data.get('ultimo_numero', 0), data.get('estado', 'activo')))
            return cur.fetchone()['id']
    except Exception as e:
        print(f"Error en crear_correlativo: {e}")
        raise

def actualizar_correlativo(correlativo_id, data):
    try:
        db_execute("""
            UPDATE erp_correlativos SET documento = %s, codigo_documento = %s,
                prefijo = %s, anio = %s, ultimo_numero = %s, estado = %s, updated_at = NOW()
            WHERE id = %s
        """, (data.get('documento'), data.get('codigo_documento'), data.get('prefijo'), data.get('anio'), data.get('ultimo_numero'), data.get('estado', 'activo'), correlativo_id))
        return True
    except Exception as e:
        print(f"Error en actualizar_correlativo: {e}")
        raise

def eliminar_correlativo_db(correlativo_id):
    try:
        db_execute("UPDATE erp_correlativos SET estado = 'inactivo', updated_at = NOW() WHERE id = %s", (correlativo_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_correlativo_db: {e}")
        raise

def tomar_correlativo(empresa_codigo, documento, anio=None):
    try:
        if anio is None:
            anio = datetime.now().year
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("SELECT erp_tomar_correlativo(%s, %s, %s) as codigo", (empresa_codigo, documento, anio))
            resultado = cur.fetchone()
            return resultado[0] if resultado else None
    except Exception as e:
        print(f"Error en tomar_correlativo: {e}")
        raise

# =========================
# 4. PARÁMETROS
# =========================
def obtener_parametros(empresa_id=None, activo=True):
    try:
        query = """
            SELECT id, empresa_id, grupo, codigo, nombre, valor_bool,
                valor_text, valor_num, regla, es_critico, estado,
                created_at, updated_at
            FROM erp_parametros
        """
        params = []
        condiciones = []
        if activo:
            condiciones.append("estado = 'activo'")
        if empresa_id:
            condiciones.append("(empresa_id = %s OR empresa_id IS NULL)")
            params.append(empresa_id)
        if condiciones:
            query += " WHERE " + " AND ".join(condiciones)
        query += " ORDER BY grupo, codigo"
        return db_query(query, params if params else None)
    except Exception as e:
        print(f"Error en obtener_parametros: {e}")
        return []

def guardar_parametro(data):
    try:
        db_execute("""
            INSERT INTO erp_parametros (empresa_id, grupo, codigo, nombre, valor_bool, valor_text, valor_num, regla, es_critico, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (empresa_id, codigo) DO UPDATE SET
                valor_bool = EXCLUDED.valor_bool, valor_text = EXCLUDED.valor_text,
                valor_num = EXCLUDED.valor_num, regla = EXCLUDED.regla,
                es_critico = EXCLUDED.es_critico, updated_at = NOW()
        """, (data.get('empresa_id'), data.get('grupo'), data.get('codigo'), data.get('nombre'), data.get('valor_bool'), data.get('valor_text'), data.get('valor_num'), data.get('regla'), data.get('es_critico', False), data.get('estado', 'activo')))
        return True
    except Exception as e:
        print(f"Error en guardar_parametro: {e}")
        raise

# =========================
# 5. MÓDULOS Y SUBMÓDULOS
# =========================
def obtener_modulos():
    try:
        return db_query("""
            SELECT m.id, m.orden, m.codigo, m.nombre, m.descripcion, m.estado,
                m.created_at, m.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', s.id, 'orden', s.orden, 'codigo', s.codigo,
                            'nombre', s.nombre, 'descripcion', s.descripcion,
                            'estado', s.estado
                        ) ORDER BY s.orden
                    )
                    FROM erp_submodulos s
                    WHERE s.modulo_id = m.id AND s.estado = 'activo'
                ) as submodulos
            FROM erp_modulos m WHERE m.estado = 'activo' ORDER BY m.orden
        """)
    except Exception as e:
        print(f"Error en obtener_modulos: {e}")
        return []

def obtener_submodulos():
    try:
        return db_query("""
            SELECT s.id, s.codigo, s.nombre, s.descripcion,
                m.codigo as modulo_codigo, m.nombre as modulo_nombre,
                m.orden as modulo_orden
            FROM erp_submodulos s
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE s.estado = 'activo' AND m.estado = 'activo'
            ORDER BY m.orden, s.orden
        """)
    except Exception as e:
        print(f"Error en obtener_submodulos: {e}")
        return []

# =========================
# 6. PERMISOS DE USUARIO
# =========================
def obtener_permisos_usuario(auth_user_id, empresa_id):
    try:
        return db_query("""
            SELECT up.id, up.auth_user_id, up.empresa_id, up.submodulo_id,
                s.codigo as submodulo_codigo, s.nombre as submodulo_nombre,
                m.codigo as modulo_codigo, m.nombre as modulo_nombre,
                up.puede_ver, up.puede_crear, up.puede_editar,
                up.puede_aprobar, up.puede_anular, up.puede_eliminar,
                up.puede_exportar, up.puede_subir_evidencia,
                up.observacion, up.created_at, up.updated_at
            FROM erp_usuario_permisos up
            JOIN erp_submodulos s ON s.id = up.submodulo_id
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE up.auth_user_id = %s AND up.empresa_id = %s
            ORDER BY m.orden, s.orden
        """, (auth_user_id, empresa_id))
    except Exception as e:
        print(f"Error en obtener_permisos_usuario: {e}")
        return []

def guardar_permisos_usuario(auth_user_id, empresa_id, permisos):
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            for permiso in permisos:
                submodulo_id = permiso.get('submodulo_id')
                if not submodulo_id:
                    continue
                cur.execute("""
                    INSERT INTO erp_usuario_permisos (auth_user_id, empresa_id, submodulo_id,
                        puede_ver, puede_crear, puede_editar, puede_aprobar,
                        puede_anular, puede_eliminar, puede_exportar,
                        puede_subir_evidencia, observacion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (auth_user_id, empresa_id, submodulo_id) DO UPDATE SET
                        puede_ver = EXCLUDED.puede_ver,
                        puede_crear = EXCLUDED.puede_crear,
                        puede_editar = EXCLUDED.puede_editar,
                        puede_aprobar = EXCLUDED.puede_aprobar,
                        puede_anular = EXCLUDED.puede_anular,
                        puede_eliminar = EXCLUDED.puede_eliminar,
                        puede_exportar = EXCLUDED.puede_exportar,
                        puede_subir_evidencia = EXCLUDED.puede_subir_evidencia,
                        observacion = EXCLUDED.observacion,
                        updated_at = NOW()
                """, (auth_user_id, empresa_id, submodulo_id, permiso.get('puede_ver', False), permiso.get('puede_crear', False), permiso.get('puede_editar', False), permiso.get('puede_aprobar', False), permiso.get('puede_anular', False), permiso.get('puede_eliminar', False), permiso.get('puede_exportar', False), permiso.get('puede_subir_evidencia', False), permiso.get('observacion', '')))
        return True
    except Exception as e:
        print(f"Error en guardar_permisos_usuario: {e}")
        raise

def obtener_submodulos_con_permisos(auth_user_id, empresa_id):
    try:
        submodulos = obtener_submodulos()
        permisos = db_query("""
            SELECT submodulo_id, puede_ver, puede_crear, puede_editar,
                puede_aprobar, puede_anular, puede_eliminar,
                puede_exportar, puede_subir_evidencia
            FROM erp_usuario_permisos
            WHERE auth_user_id = %s AND empresa_id = %s
        """, (auth_user_id, empresa_id))
        permisos_map = {}
        for p in permisos:
            permisos_map[p['submodulo_id']] = {
                'puede_ver': p.get('puede_ver', False),
                'puede_crear': p.get('puede_crear', False),
                'puede_editar': p.get('puede_editar', False),
                'puede_aprobar': p.get('puede_aprobar', False),
                'puede_anular': p.get('puede_anular', False),
                'puede_eliminar': p.get('puede_eliminar', False),
                'puede_exportar': p.get('puede_exportar', False),
                'puede_subir_evidencia': p.get('puede_subir_evidencia', False)
            }
        for sub in submodulos:
            sub['permisos'] = permisos_map.get(sub['id'], {
                'puede_ver': False, 'puede_crear': False, 'puede_editar': False,
                'puede_aprobar': False, 'puede_anular': False, 'puede_eliminar': False,
                'puede_exportar': False, 'puede_subir_evidencia': False
            })
        return submodulos
    except Exception as e:
        print(f"Error en obtener_submodulos_con_permisos: {e}")
        return []

def tiene_permiso_usuario(auth_user_id, empresa_id, submodulo_codigo, accion='ver'):
    try:
        campo_permiso = {
            'ver': 'puede_ver', 'crear': 'puede_crear', 'editar': 'puede_editar',
            'aprobar': 'puede_aprobar', 'anular': 'puede_anular',
            'eliminar': 'puede_eliminar', 'exportar': 'puede_exportar',
            'subir_evidencia': 'puede_subir_evidencia'
        }
        if accion not in campo_permiso:
            return False
        usuario = db_query("""
            SELECT r.es_admin
            FROM erp_usuario_empresas ue
            JOIN erp_roles r ON r.id = ue.rol_id
            WHERE ue.auth_user_id = %s AND ue.empresa_id = %s
            AND ue.estado = 'activo' AND r.es_admin = TRUE
        """, (auth_user_id, empresa_id))
        if usuario:
            return True
        permiso = db_query(f"""
            SELECT 1
            FROM erp_usuario_permisos up
            JOIN erp_submodulos s ON s.id = up.submodulo_id
            WHERE up.auth_user_id = %s AND up.empresa_id = %s
            AND s.codigo = %s AND up.{campo_permiso[accion]} = TRUE LIMIT 1
        """, (auth_user_id, empresa_id, submodulo_codigo))
        return len(permiso) > 0
    except Exception as e:
        print(f"Error en tiene_permiso_usuario: {e}")
        return False

def obtener_usuario_con_permisos(auth_user_id, empresa_codigo=None):
    try:
        user = db_query("""
            SELECT id, auth_user_id, usuario_sistema, nombres_apellidos,
                area, correo, celular, estado, created_at, updated_at
            FROM usuarios WHERE auth_user_id = %s AND estado = 'activo'
        """, (auth_user_id,))
        if not user:
            return None
        usuario = user[0]
        empresas = db_query("""
            SELECT ue.id, ue.empresa_id, e.codigo as empresa_codigo,
                e.nombre_comercial as empresa_nombre, ue.es_empresa_principal,
                ue.estado as acceso_estado, ue.rol_id, r.codigo as rol_codigo,
                r.nombre as rol_nombre, r.es_admin
            FROM erp_usuario_empresas ue
            LEFT JOIN erp_empresas e ON e.id = ue.empresa_id
            LEFT JOIN erp_roles r ON r.id = ue.rol_id
            WHERE ue.auth_user_id = %s AND ue.estado = 'activo'
        """, (auth_user_id,))
        usuario['empresas_acceso'] = empresas
        if empresa_codigo:
            empresa = next((e for e in empresas if e['empresa_codigo'] == empresa_codigo), None)
            if empresa:
                permisos = obtener_permisos_usuario(auth_user_id, empresa['empresa_id'])
                usuario['permisos'] = permisos
                usuario['empresa_actual'] = empresa
        return usuario
    except Exception as e:
        print(f"Error en obtener_usuario_con_permisos: {e}")
        return None

# =========================
# 7. AUDITORÍA
# =========================
def obtener_auditoria(empresa_id=None, tabla=None, accion=None, limit=100, offset=0):
    try:
        query = """
            SELECT a.id, a.empresa_id, e.codigo as empresa_codigo,
                a.auth_user_id, u.usuario_sistema, u.nombres_apellidos,
                a.tabla, a.registro_id, a.accion, a.data_anterior,
                a.data_nueva, a.created_at
            FROM erp_auditoria a
            LEFT JOIN erp_empresas e ON e.id = a.empresa_id
            LEFT JOIN usuarios u ON u.auth_user_id = a.auth_user_id
            WHERE 1=1
        """
        params = []
        if empresa_id:
            query += " AND a.empresa_id = %s"
            params.append(empresa_id)
        if tabla:
            query += " AND a.tabla = %s"
            params.append(tabla)
        if accion:
            query += " AND a.accion = %s"
            params.append(accion)
        query += " ORDER BY a.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        return db_query(query, params)
    except Exception as e:
        print(f"Error en obtener_auditoria: {e}")
        return []

def registrar_auditoria(empresa_id, auth_user_id, tabla, registro_id, accion, data_anterior=None, data_nueva=None):
    try:
        db_execute("""
            INSERT INTO erp_auditoria (empresa_id, auth_user_id, tabla, registro_id, accion, data_anterior, data_nueva)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (empresa_id, auth_user_id, tabla, registro_id, accion, json.dumps(data_anterior) if data_anterior else None, json.dumps(data_nueva) if data_nueva else None))
        return True
    except Exception as e:
        print(f"Error en registrar_auditoria: {e}")
        return False

# =========================
# 8. LOGIN CON SUPABASE AUTH
# =========================
def verificar_usuario_supabase(email: str, password: str, empresa_codigo: str = 'KCF'):
    try:
        import supabase
        import os
        SUPABASE_URL = "https://tkfmwvsenvgpyexvdcat.supabase.co"
        SUPABASE_KEY = "sb_secret_k56lhPYVINqZMj_BZexRbw_JzeBx8Hx"
        supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
        
        auth_response = supabase_client.auth.sign_in_with_password({"email": email, "password": password})
        if not auth_response.user:
            return {"success": False, "error": "Usuario o contraseña incorrectos"}
        
        auth_user = auth_response.user
        user_result = supabase_client.table('usuarios').select('*').eq('auth_user_id', auth_user.id).single().execute()
        if not user_result.data:
            return {"success": False, "error": "Usuario no registrado en el sistema ERP"}
        
        user_data = user_result.data
        empresa_result = supabase_client.table('erp_usuario_empresas').select('*, erp_empresas!inner(*), erp_roles!inner(*)').eq('auth_user_id', auth_user.id).eq('estado', 'activo').execute()
        if not empresa_result.data:
            return {"success": False, "error": "No tiene acceso a ninguna empresa"}
        
        empresa_acceso = None
        for acceso in empresa_result.data:
            if acceso.get('erp_empresas', {}).get('codigo') == empresa_codigo:
                empresa_acceso = acceso
                break
        
        if not empresa_acceso:
            return {"success": False, "error": f"No tiene acceso a la empresa {empresa_codigo}"}
        
        rol_data = empresa_acceso.get('erp_roles', {})
        return {
            "success": True,
            "user_id": user_data.get('id'),
            "auth_user_id": auth_user.id,
            "usuario_sistema": user_data.get('usuario_sistema'),
            "nombres_apellidos": user_data.get('nombres_apellidos'),
            "area": user_data.get('area'),
            "email": auth_user.email,
            "rol": rol_data.get('codigo', 'usuario'),
            "rol_nombre": rol_data.get('nombre', 'Usuario'),
            "es_admin": rol_data.get('es_admin', False)
        }
    except Exception as e:
        print(f"Error en verificar_usuario_supabase: {e}")
        return {"success": False, "error": str(e)}

# database.py - Funciones para productos con tu estructura

def obtener_productos(filtros=None):
    """Obtiene todos los productos activos con filtros opcionales"""
    query = """
        SELECT 
            id, codigo, descripcion, descripcion_larga,
            modelo, marca, familia, categoria_derivada,
            unidad, peso, volumen, observaciones, transporte,
            costo_unitario, precio_unitario, stock, stock_minimo,
            estado, presentacion_proveedor, presentacion_venta,
            venta_minima, codigo_barras, origen, tiempo_entrega,
            abastecimiento, activo, fecha_creacion
        FROM productos
        WHERE activo = TRUE
    """
    params = []
    condiciones = []
    
    if filtros:
        if filtros.get('busqueda'):
            condiciones.append("(codigo ILIKE %s OR descripcion ILIKE %s OR modelo ILIKE %s)")
            params.extend([f'%{filtros["busqueda"]}%'] * 3)
        
        if filtros.get('categoria'):
            condiciones.append("familia = %s")
            params.append(filtros['categoria'])
        
        if filtros.get('marca'):
            condiciones.append("marca = %s")
            params.append(filtros['marca'])
        
        if filtros.get('modelo'):
            condiciones.append("modelo = %s")
            params.append(filtros['modelo'])
    
    if condiciones:
        query += " AND " + " AND ".join(condiciones)
    
    query += " ORDER BY codigo"
    
    return db_query(query, params)

def obtener_producto_por_id(producto_id):
    """Obtiene un producto por su ID"""
    query = """
        SELECT 
            id, codigo, descripcion, descripcion_larga,
            modelo, marca, familia, categoria_derivada,
            unidad, peso, volumen, observaciones, transporte,
            costo_unitario, precio_unitario, stock, stock_minimo,
            estado, presentacion_proveedor, presentacion_venta,
            venta_minima, codigo_barras, origen, tiempo_entrega,
            abastecimiento, activo, fecha_creacion
        FROM productos
        WHERE id = %s AND activo = TRUE
    """
    result = db_query(query, (producto_id,))
    return result[0] if result else None

def crear_producto(data):
    """Crea un nuevo producto con tu estructura de tabla"""
    query = """
        INSERT INTO productos (
            codigo, descripcion, descripcion_larga,
            modelo, marca, familia, categoria_derivada,
            unidad, peso, volumen,
            observaciones, transporte,
            costo_unitario, precio_unitario, stock,
            stock_minimo, estado,
            presentacion_proveedor, presentacion_venta,
            venta_minima, codigo_barras,
            origen, tiempo_entrega, abastecimiento,
            activo
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            %s, %s, %s,
            TRUE
        )
        RETURNING id, codigo
    """
    
    params = (
        data.get('codigo'),
        data.get('descripcion'),
        data.get('descripcion_larga', ''),
        data.get('modelo'),
        data.get('marca'),
        data.get('familia'),
        data.get('categoria_derivada', '') or data.get('subcategoria', ''),
        data.get('unidad'),
        float(data.get('peso', 0)),
        float(data.get('volumen', 0)),
        data.get('observaciones', ''),
        data.get('transporte'),
        float(data.get('costo_unitario', 0)),
        float(data.get('precio_unitario', 0)),
        int(data.get('stock', 0)),
        int(data.get('stock_minimo', 0)),
        data.get('estado', 'activo'),
        data.get('presentacion_proveedor', ''),
        data.get('presentacion_venta', ''),
        int(data.get('venta_minima', 1)),
        data.get('codigo_barras', ''),
        data.get('origen', ''),
        data.get('tiempo_entrega', ''),
        data.get('abastecimiento', '')
    )
    
    result = db_query(query, params)
    return result[0] if result else None

def actualizar_producto(producto_id, data):
    """Actualiza un producto existente"""
    query = """
        UPDATE productos SET
            codigo = %s,
            descripcion = %s,
            descripcion_larga = %s,
            modelo = %s,
            marca = %s,
            familia = %s,
            categoria_derivada = %s,
            unidad = %s,
            peso = %s,
            volumen = %s,
            observaciones = %s,
            transporte = %s,
            costo_unitario = %s,
            precio_unitario = %s,
            stock = %s,
            stock_minimo = %s,
            estado = %s,
            presentacion_proveedor = %s,
            presentacion_venta = %s,
            venta_minima = %s,
            codigo_barras = %s,
            origen = %s,
            tiempo_entrega = %s,
            abastecimiento = %s,
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, codigo
    """
    
    params = (
        data.get('codigo'),
        data.get('descripcion'),
        data.get('descripcion_larga', ''),
        data.get('modelo'),
        data.get('marca'),
        data.get('familia'),
        data.get('categoria_derivada', '') or data.get('subcategoria', ''),
        data.get('unidad'),
        float(data.get('peso', 0)),
        float(data.get('volumen', 0)),
        data.get('observaciones', ''),
        data.get('transporte'),
        float(data.get('costo_unitario', 0)),
        float(data.get('precio_unitario', 0)),
        int(data.get('stock', 0)),
        int(data.get('stock_minimo', 0)),
        data.get('estado', 'activo'),
        data.get('presentacion_proveedor', ''),
        data.get('presentacion_venta', ''),
        int(data.get('venta_minima', 1)),
        data.get('codigo_barras', ''),
        data.get('origen', ''),
        data.get('tiempo_entrega', ''),
        data.get('abastecimiento', ''),
        producto_id
    )
    
    result = db_query(query, params)
    return result[0] if result else None

def obtener_ultimo_codigo_producto():
    """Obtiene el último código de producto para generar el siguiente"""
    try:
        # Buscar el último código PRD-, GEN- o SEG-
        result = db_query("""
            SELECT codigo FROM productos 
            WHERE codigo LIKE 'PRD-%' OR codigo LIKE 'GEN-%' OR codigo LIKE 'SEG-%'
            ORDER BY id DESC LIMIT 1
        """)
        
        if result and len(result) > 0 and result[0].get('codigo'):
            codigo = result[0]['codigo']
            print(f"📝 Último código encontrado: {codigo}")
            partes = codigo.split('-')
            if len(partes) >= 2:
                try:
                    ultimo_num = int(partes[-1])
                    nuevo_num = ultimo_num + 1
                    prefijo = partes[0]
                    nuevo_codigo = f"{prefijo}-{str(nuevo_num).zfill(4)}"
                    print(f"✅ Nuevo código generado: {nuevo_codigo}")
                    return nuevo_codigo
                except ValueError as e:
                    print(f"⚠️ Error parseando número: {e}")
                    pass
        
        # Si no hay códigos PRD-, GEN- o SEG-, buscar el mayor número en cualquier código
        print("📝 Buscando códigos existentes para extraer números...")
        result = db_query("""
            SELECT codigo FROM productos 
            ORDER BY id DESC LIMIT 20
        """)
        
        import re
        max_num = 0
        for row in result:
            codigo = row.get('codigo', '')
            numeros = re.findall(r'\d+', codigo)
            for num_str in numeros:
                try:
                    num = int(num_str)
                    if num > max_num:
                        max_num = num
                except:
                    pass
        
        if max_num > 0:
            nuevo_num = max_num + 1
            nuevo_codigo = f"PRD-{str(nuevo_num).zfill(4)}"
            print(f"✅ Nuevo código generado desde números: {nuevo_codigo}")
            return nuevo_codigo
        
        # Fallback: usar timestamp
        print("⚠️ Usando timestamp como fallback")
        from datetime import datetime
        timestamp = datetime.now().strftime('%y%m%d%H%M%S')
        return f"PRD-{timestamp}"
        
    except Exception as e:
        print(f"❌ Error generando código: {e}")
        import traceback
        traceback.print_exc()
        return "PRD-0001"
    """Obtiene el último código de producto para generar el siguiente"""
    result = db_query("""
        SELECT codigo FROM productos 
        WHERE codigo LIKE 'PRD-%' OR codigo LIKE 'GEN-%' OR codigo LIKE 'SEG-%'
        ORDER BY id DESC LIMIT 1
    """)
    
    if result:
        codigo = result[0]['codigo']
        # Extraer el número del código
        partes = codigo.split('-')
        if len(partes) >= 2:
            try:
                # Intentar obtener el número de la última parte
                ultimo_num = int(partes[-1])
                nuevo_num = str(ultimo_num + 1).zfill(4)
                # Mantener el prefijo (ej: PRD, GEN, SEG)
                prefijo = partes[0]
                return f"{prefijo}-{nuevo_num}"
            except:
                pass
    
    # Si no hay productos o hay error, generar uno nuevo
    from datetime import datetime
    return f"PRD-0001"

# =========================
# COMPARATIVO DE COSTOS
# =========================

def obtener_comparativo_costos(filtros=None):
    """
    Obtiene datos del comparativo de costos desde la vista
    """
    try:
        query = """
            SELECT 
                producto_id,
                codigo,
                nombre_producto,
                modelo,
                marca,
                categoria,
                subcategoria,
                costo_actual,
                precio_actual,
                stock,
                stock_minimo,
                estado,
                activo,
                precio_venta,
                precio_lista,
                margen_preferido,
                total_registros_costos,
                costo_promedio_historico,
                costo_minimo_historico,
                costo_maximo_historico,
                costo_compra_promedio,
                costo_transporte_promedio,
                costo_almacenaje_promedio,
                costo_manufactura_promedio,
                ultimo_costo_registrado,
                fecha_ultimo_costo,
                margen_actual_porcentaje,
                margen_historico_porcentaje,
                diferencia_margen_preferido
            FROM vista_comparativo_costos
            WHERE 1=1
        """
        params = []
        
        if filtros:
            if filtros.get('producto_id'):
                query += " AND producto_id = %s"
                params.append(int(filtros['producto_id']))
            
            if filtros.get('categoria'):
                query += " AND categoria ILIKE %s"
                params.append(f'%{filtros["categoria"]}%')
            
            if filtros.get('marca'):
                query += " AND marca ILIKE %s"
                params.append(f'%{filtros["marca"]}%')
            
            if filtros.get('busqueda'):
                query += """ AND (
                    codigo ILIKE %s OR 
                    nombre_producto ILIKE %s OR 
                    modelo ILIKE %s OR 
                    marca ILIKE %s
                )"""
                params.extend([f'%{filtros["busqueda"]}%'] * 4)
            
            if filtros.get('min_margen') is not None:
                query += " AND margen_actual_porcentaje >= %s"
                params.append(float(filtros['min_margen']))
            
            if filtros.get('max_margen') is not None:
                query += " AND margen_actual_porcentaje <= %s"
                params.append(float(filtros['max_margen']))
        
        query += " ORDER BY nombre_producto"
        
        return db_query(query, params)
    except Exception as e:
        print(f"❌ Error en obtener_comparativo_costos: {e}")
        return []

def obtener_resumen_costos():
    """
    Obtiene el resumen del dashboard de costos
    """
    try:
        result = db_query("SELECT * FROM vista_resumen_costos")
        return result[0] if result else {}
    except Exception as e:
        print(f"❌ Error en obtener_resumen_costos: {e}")
        return {}

def obtener_costos_historicos(producto_id):
    """
    Obtiene el historial de costos de un producto específico
    """
    try:
        # Verificar que el producto existe
        producto = db_query("""
            SELECT id, codigo, descripcion 
            FROM productos 
            WHERE id = %s AND activo = TRUE
        """, (producto_id,))
        
        if not producto:
            return None
        
        # Obtener historial de costos
        historial = db_query("""
            SELECT 
                id,
                fecha_registro,
                tipo_costo,
                monto,
                observaciones,
                proveedor_id,
                factura_referencia,
                creado_por
            FROM costos_productos
            WHERE producto_id = %s
            ORDER BY fecha_registro DESC
        """, (producto_id,))
        
        return {
            'producto': producto[0],
            'historial': historial,
            'total_registros': len(historial)
        }
    except Exception as e:
        print(f"❌ Error en obtener_costos_historicos: {e}")
        return None

def obtener_opciones_filtros_comparativo():
    """
    Obtiene las opciones de filtros para el comparativo
    """
    try:
        categorias = db_query("""
            SELECT DISTINCT categoria 
            FROM vista_comparativo_costos 
            WHERE categoria IS NOT NULL AND categoria != ''
            ORDER BY categoria
        """)
        
        marcas = db_query("""
            SELECT DISTINCT marca 
            FROM vista_comparativo_costos 
            WHERE marca IS NOT NULL AND marca != ''
            ORDER BY marca
        """)
        
        productos = db_query("""
            SELECT DISTINCT producto_id, codigo, nombre_producto
            FROM vista_comparativo_costos
            ORDER BY nombre_producto
            LIMIT 100
        """)
        
        return {
            'categorias': [c['categoria'] for c in categorias] if categorias else [],
            'marcas': [m['marca'] for m in marcas] if marcas else [],
            'productos': productos if productos else []
        }
    except Exception as e:
        print(f"❌ Error en obtener_opciones_filtros_comparativo: {e}")
        return {'categorias': [], 'marcas': [], 'productos': []}

def obtener_mejor_producto():
    """
    Obtiene el producto con mejor margen
    """
    try:
        result = db_query("""
            SELECT 
                producto_id,
                codigo,
                nombre_producto,
                marca,
                modelo,
                categoria,
                precio_actual,
                costo_actual,
                margen_actual_porcentaje,
                costo_promedio_historico,
                total_registros_costos
            FROM vista_comparativo_costos
            WHERE margen_actual_porcentaje = (
                SELECT MAX(margen_actual_porcentaje) 
                FROM vista_comparativo_costos
            )
            LIMIT 1
        """)
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Error en obtener_mejor_producto: {e}")
        return None

def registrar_costo_producto(producto_id, tipo_costo, monto, observaciones=None, proveedor_id=None, factura_referencia=None, creado_por=None):
    """
    Registra un nuevo costo para un producto
    """
    try:
        query = """
            INSERT INTO costos_productos (
                producto_id, tipo_costo, monto, observaciones,
                proveedor_id, factura_referencia, creado_por
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (
            producto_id,
            tipo_costo,
            float(monto),
            observaciones,
            proveedor_id,
            factura_referencia,
            creado_por
        )
        result = db_query(query, params)
        return result[0]['id'] if result else None
    except Exception as e:
        print(f"❌ Error en registrar_costo_producto: {e}")
        raise

def actualizar_precio_producto(producto_id, precio_venta, precio_lista=None, margen_preferido=None):
    """
    Actualiza o inserta el precio de un producto
    """
    try:
        # Verificar si ya existe
        existente = db_query("""
            SELECT producto_id FROM precios_productos 
            WHERE producto_id = %s
        """, (producto_id,))
        
        if existente:
            # Actualizar
            query = """
                UPDATE precios_productos SET
                    precio_venta = %s,
                    precio_lista = COALESCE(%s, precio_lista),
                    margen_preferido = COALESCE(%s, margen_preferido),
                    actualizado_en = NOW()
                WHERE producto_id = %s
            """
            db_execute(query, (float(precio_venta), precio_lista, margen_preferido, producto_id))
        else:
            # Insertar
            query = """
                INSERT INTO precios_productos (
                    producto_id, precio_venta, precio_lista, margen_preferido
                ) VALUES (%s, %s, %s, %s)
            """
            db_execute(query, (producto_id, float(precio_venta), precio_lista or precio_venta * 1.1, margen_preferido or 30.0))
        
        return True
    except Exception as e:
        print(f"❌ Error en actualizar_precio_producto: {e}")
        raise

def exportar_comparativo_csv():
    """
    Exporta los datos del comparativo a formato CSV
    """
    try:
        resultados = db_query("""
            SELECT 
                codigo,
                nombre_producto,
                modelo,
                marca,
                categoria,
                costo_actual,
                precio_actual,
                costo_promedio_historico,
                margen_actual_porcentaje,
                margen_historico_porcentaje,
                total_registros_costos,
                fecha_ultimo_costo
            FROM vista_comparativo_costos
            ORDER BY nombre_producto
        """)
        return resultados
    except Exception as e:
        print(f"❌ Error en exportar_comparativo_csv: {e}")
        return []

# =========================
# FUNCIONES PARA PROVEEDORES EN COMPARATIVO
# =========================

def obtener_proveedores_para_comparativo(producto_id=None):
    """
    Obtiene proveedores para el comparativo de costos
    """
    try:
        query = """
            SELECT 
                p.id,
                p.codigo_proveedor,
                p.razon_social,
                p.razon_comercial,
                p.ruc,
                p.contacto,
                p.telefono,
                p.email,
                p.lugar_recojo,
                p.condicion_pago,
                p.tiempo_credito
            FROM proveedores p
            WHERE p.activo = TRUE
        """
        params = []
        
        if producto_id:
            # Si se especifica un producto, obtener los proveedores que han cotizado ese producto
            query += """
                AND p.id IN (
                    SELECT DISTINCT proveedor_id 
                    FROM costos_productos 
                    WHERE producto_id = %s
                )
            """
            params.append(producto_id)
        
        query += " ORDER BY p.razon_social"
        
        return db_query(query, params if params else None)
    except Exception as e:
        print(f"❌ Error en obtener_proveedores_para_comparativo: {e}")
        return []

def obtener_costos_por_proveedor(producto_id, proveedor_id=None):
    """
    Obtiene los costos de un producto agrupados por proveedor
    """
    try:
        query = """
            SELECT 
                cp.id,
                cp.producto_id,
                cp.tipo_costo,
                cp.monto,
                cp.fecha_registro,
                cp.observaciones,
                cp.proveedor_id,
                p.razon_social as proveedor_nombre,
                p.codigo_proveedor as proveedor_codigo
            FROM costos_productos cp
            LEFT JOIN proveedores p ON p.id = cp.proveedor_id
            WHERE cp.producto_id = %s
        """
        params = [producto_id]
        
        if proveedor_id:
            query += " AND cp.proveedor_id = %s"
            params.append(proveedor_id)
        
        query += " ORDER BY cp.fecha_registro DESC"
        
        return db_query(query, params)
    except Exception as e:
        print(f"❌ Error en obtener_costos_por_proveedor: {e}")
        return []