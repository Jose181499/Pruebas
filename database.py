import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# =========================
# SUPABASE DATABASE URL
# =========================
# 1. Primero intenta leer la URL limpia que configuraste en Render
DATABASE_URL = os.environ.get('DATABASE_URL')

# 2. Si estás en local y no existe la variable de Render, usa esta por defecto (sin +psycopg2)
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres.tkfmwvsenvgpyexvdcat:admin3561967kcf@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

# 3. Por si acaso se te pasa un +psycopg2 en algún lado, esto lo limpia automáticamente:
if DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

# =========================
# CONEXIÓN
# =========================
def get_connection():
    return psycopg2.connect(
        DATABASE_URL,
        client_encoding="UTF8"
    )


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
def db_query(sql, params=()):

    conn = get_connection()

    cur = conn.cursor(
        cursor_factory=RealDictCursor
    )

    cur.execute(sql, params)

    data = cur.fetchall()

    cur.close()

    conn.close()

    return data


def db_execute(sql, params=()):
    """
    Ejecuta una consulta SQL y retorna el número de filas afectadas
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        filas_afectadas = cur.rowcount
        return filas_afectadas
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

# =====================================
# GUARDAR
# =====================================
def guardar_usuario_db(data):

    conn = get_connection()

    cur = conn.cursor()

    password_hash = generate_password_hash(
        data['password']
    )

    cur.execute("""

        INSERT INTO usuarios (

            usuario,
            password,
            rol,
            nombre_completo,
            email,
            telefono,
            activo

        )

        VALUES (%s,%s,%s,%s,%s,%s,true)

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


# =====================================
# LISTAR
# =====================================
def listar_usuarios_db():

    conn = get_connection()

    cur = conn.cursor(
        cursor_factory=RealDictCursor
    )

    cur.execute("""

        SELECT
            id,
            usuario,
            rol,
            nombre_completo,
            email,
            telefono,
            activo,
            fecha_creacion
        FROM usuarios
        ORDER BY id DESC

    """)

    usuarios = cur.fetchall()

    cur.close()
    conn.close()

    return usuarios


# =====================================
# ELIMINAR
# =====================================
def eliminar_usuario_db(id):

    conn = get_connection()

    cur = conn.cursor()

    cur.execute("""

        DELETE FROM usuarios
        WHERE id = %s

    """, (id,))

    conn.commit()

    cur.close()
    conn.close()


# =========================
# Auth
# =========================
def verificar_usuario(usuario: str, password: str):

    rows = db_query("""
        SELECT id, usuario, password, rol, nombre_completo
        FROM usuarios
        WHERE usuario = %s AND activo = TRUE
        LIMIT 1
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

# =====================================
# ACTUALIZAR USUARIO
# =====================================
def actualizar_usuario_db(id, data):

    if data.get('password'):
        pwd_hash = generate_password_hash(data['password'])
        db_execute("""
            UPDATE usuarios
            SET nombre_completo = %s,
                usuario         = %s,
                password        = %s,
                rol             = %s,
                email           = %s,
                telefono        = %s
            WHERE id = %s
        """, (
            data['nombre_completo'],
            data['usuario'],
            pwd_hash,
            data['rol'],
            data['email'],
            data['telefono'],
            id
        ))
    else:
        db_execute("""
            UPDATE usuarios
            SET nombre_completo = %s,
                usuario         = %s,
                rol             = %s,
                email           = %s,
                telefono        = %s
            WHERE id = %s
        """, (
            data['nombre_completo'],
            data['usuario'],
            data['rol'],
            data['email'],
            data['telefono'],
            id
        ))


# =========================
# Productos - ACTUALIZADA
# =========================
def obtener_productos():
    """Obtener todos los productos con TODAS las columnas"""
    return db_query("""
        SELECT 
            id, familia, codigo, descripcion, descripcion_larga,
            marca, modelo, unidad, peso, observaciones, transporte,
            costo_unitario, precio_unitario, stock, stock_minimo,
            estado, presentacion_proveedor, presentacion_venta,
            venta_minima, codigo_barras, volumen,
            categoria_derivada, origen, tiempo_entrega, abastecimiento,
            activo, fecha_creacion
        FROM productos
        WHERE activo = TRUE
        ORDER BY familia, codigo
    """)

# =========================
# Insertar nuevo proveedor (Versión Actualizada)
# =========================
def insertar_proveedor(
    razon_social,
    ruc,
    direccion,
    telefono="",
    contacto="",
    email="",
    razon_comercial="",
    condicion_pago="",
    tiempo_credito="",
    banco="",
    numero_cuenta="",
    cci="",
    lugar_recojo=""
):
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Generar código automáticamente (PROV-00001, PROV-00002...)
            cur.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_proveedor FROM 6) AS INTEGER)), 0) + 1 as siguiente
                FROM proveedores 
                WHERE codigo_proveedor LIKE 'PROV-%'
            """)
            siguiente = cur.fetchone()['siguiente']
            codigo_proveedor = f"PROV-{siguiente:05d}"

            cur.execute("""
                INSERT INTO proveedores (
                    codigo_proveedor,
                    razon_social,
                    razon_comercial,
                    ruc,
                    direccion,
                    telefono,
                    contacto,
                    email,
                    condicion_pago,
                    tiempo_credito,
                    banco,
                    numero_cuenta,
                    cci,
                    lugar_recojo,
                    activo,
                    fecha_creacion
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW())
                RETURNING id
            """, (
                codigo_proveedor,
                razon_social,
                razon_comercial,
                ruc,
                direccion,
                telefono,
                contacto,
                email,
                condicion_pago,
                tiempo_credito,
                banco,
                numero_cuenta,
                cci,
                lugar_recojo
            ))

            nuevo_id = cur.fetchone()['id']
            conn.commit()  # Por si db_tx no hace commit automático

            return nuevo_id   # ← Muy importante

    except Exception as e:
        print(f"Error insertando proveedor: {e}")
        raise  # Para que la API lo capture


# =========================
# Obtener proveedores
# =========================
def obtener_proveedores(busqueda=None, codigo=None, tipo_documento=None):
    try:
        query = """
            SELECT 
                id, 
                codigo_proveedor,
                razon_social, 
                razon_comercial,
                ruc, 
                direccion, 
                telefono, 
                contacto,
                email, 
                condicion_pago, 
                tiempo_credito, 
                banco,
                numero_cuenta, 
                cci,
                lugar_recojo,
                fecha_creacion,
                activo
            FROM proveedores
            WHERE activo = TRUE
        """
        params = []

        # Filtro por Código de Proveedor
        if codigo:
            query += " AND codigo_proveedor ILIKE %s"
            params.append(f"%{codigo}%")

        # Filtro por Búsqueda general
        if busqueda:
            query += """ AND (
                razon_social ILIKE %s 
                OR ruc ILIKE %s 
                OR codigo_proveedor ILIKE %s
                OR contacto ILIKE %s
            )"""
            like = f"%{busqueda}%"
            params.extend([like, like, like, like])

        # Filtro por Condición de Pago
        if tipo_documento:
            query += " AND condicion_pago = %s"
            params.append(tipo_documento)

        query += " ORDER BY razon_social ASC"

        return db_query(query, params if params else None)

    except Exception as e:
        print(f"Error en obtener_proveedores: {e}")
        return []

# =========================
# Obtener Clientes
# =========================
def obtener_clientes():

    with db_tx() as conn:

        cur = conn.cursor()

        cur.execute("""
            SELECT
                id,
                tipo_documento,
                numero_documento,
                razon_social,
                direccion_fiscal,
                codigo_cliente,
                nombre_comercial,
                fecha_creacion,
                created_at
            FROM clientes
            WHERE activo = TRUE
            ORDER BY id DESC
        """)

        clientes = cur.fetchall()
        resultado = []

        for c in clientes:

            cliente_id = c[0]

            cur.execute("""
                SELECT nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos
                WHERE cliente_id = %s
                ORDER BY principal DESC
            """, (cliente_id,))

            contactos = [
                {
                    "nombre_contacto": row[0],
                    "email": row[1],
                    "telefono": row[2],
                    "cargo": row[3],
                    "principal": row[4]
                }
                for row in cur.fetchall()
            ]

            cur.execute("""
                SELECT nombre_punto, condicion_pago, direccion, responsable, telefono_contacto, principal
                FROM clientes_puntos_entrega
                WHERE cliente_id = %s
            """, (cliente_id,))

            puntos = [
                {
                    "nombre_punto": row[0],
                    "condicion_pago": row[1],
                    "direccion": row[2],
                    "responsable": row[3],
                    "telefono_contacto": row[4],
                    "principal": row[5]
                }
                for row in cur.fetchall()
            ]

            cliente = {
                "id": c[0],
                "tipo_documento": c[1],
                "numero_documento": c[2],
                "razon_social": c[3],
                "direccion_fiscal": c[4],
                "codigo_cliente": c[5],
                "nombre_comercial": c[6],
                "fecha_creacion": c[7].isoformat() if c[7] else None,  # ← FORMATO ISO
                "created_at": c[8].isoformat() if len(c) > 8 and c[8] else None,  # ← FORMATO ISO
                "contactos": contactos,
                "puntos_entrega": puntos
            }

            resultado.append(cliente)

        return resultado
# =========================
# Insertar cliente
# =========================
def insertar_cliente(tipo_documento, numero_documento, razon_social, direccion_fiscal,nombre_comercial):

    rows = db_query("""
        INSERT INTO clientes
        (tipo_documento, numero_documento, razon_social, direccion_fiscal,nombre_comercial)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (
        tipo_documento,
        numero_documento,
        razon_social,
        direccion_fiscal,
        nombre_comercial
    ))

    return rows[0]["id"]

# =========================
# Insertar contacto cliente
# =========================
def insertar_contacto_cliente(cliente_id, nombre_contacto, email, telefono, cargo, principal):

    db_execute("""
        INSERT INTO clientes_contactos
        (cliente_id, nombre_contacto, email, telefono, cargo, principal)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        cliente_id,
        nombre_contacto,
        email,
        telefono,
        cargo,
        principal
    ))


# =========================
# Insertar punto entrega
# =========================
def insertar_punto_entrega(
    cliente_id,
    nombre_punto,
    direccion,
    departamento="",
    provincia="",
    distrito="",
    telefono_contacto="",
    responsable="",
    condicion_pago="",
    tiempo_credito="",
    principal=False
):

    db_execute("""
        INSERT INTO clientes_puntos_entrega
        (cliente_id, nombre_punto, direccion, departamento, provincia, distrito,
         telefono_contacto, responsable,condicion_pago,tiempo_credito, principal)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        cliente_id,
        nombre_punto,
        direccion,
        departamento,
        provincia,
        distrito,
        telefono_contacto,
        responsable,
        condicion_pago,
        tiempo_credito,
        principal
    ))

# =========================
# Insertar producto
# =========================
def insertar_producto(
    familia,
    codigo,
    descripcion,
    descripcion_larga="",
    marca="",
    modelo="",
    unidad="Unidad"):

    rows = db_query("""
        INSERT INTO productos
        (familia, codigo, descripcion, descripcion_larga, marca, modelo, unidad, activo)
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id
    """, (
        familia,
        codigo,
        descripcion,
        descripcion_larga,
        marca,
        modelo,
        unidad
    ))

    return rows[0]["id"]

def buscar_clientes_mejorado(tipo_documento='', busqueda='', limit=50):
    print(f"🔥🔥🔥 DENTRO DE buscar_clientes_mejorado - busqueda: '{busqueda}'")
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            if busqueda and busqueda.strip():
                busqueda_like = f"%{busqueda.strip()}%"
                cur.execute("""
                    SELECT 
                        c.id,
                        c.razon_social,
                        c.numero_documento,
                        cc.nombre_contacto,
                        cc.email,
                        cc.telefono
                    FROM clientes c
                    LEFT JOIN clientes_contactos cc ON cc.cliente_id = c.id 
                        AND cc.activo = TRUE AND cc.principal = TRUE
                    WHERE c.activo = TRUE
                    AND (
                        c.razon_social ILIKE %s OR
                        c.numero_documento ILIKE %s OR
                        cc.nombre_contacto ILIKE %s
                    )
                    ORDER BY c.razon_social
                    LIMIT %s
                """, (busqueda_like, busqueda_like, busqueda_like, limit))
            else:
                cur.execute("""
                    SELECT 
                        c.id,
                        c.razon_social,
                        c.numero_documento,
                        cc.nombre_contacto,
                        cc.email,
                        cc.telefono
                    FROM clientes c
                    LEFT JOIN clientes_contactos cc ON cc.cliente_id = c.id 
                        AND cc.activo = TRUE AND cc.principal = TRUE
                    WHERE c.activo = TRUE
                    ORDER BY c.razon_social
                    LIMIT %s
                """, (limit,))
            
            clientes = cur.fetchall()
            print(f"🔥🔥🔥 RESULTADOS SQL: {len(clientes)} clientes encontrados")
            for c in clientes:
                print(f"   - nombre_contacto: {c.get('nombre_contacto')} | razon_social: {c.get('razon_social')}")
            
            return clientes
            
    except Exception as e:
        print(f"❌ Error en buscar_clientes_mejorado: {e}")
        return []
# =========================
# BUSCAR CLIENTES CON PAGINACIÓN
# =========================
def buscar_clientes_paginado(tipo_documento='', busqueda='', pagina=1, por_pagina=20):
    """
    Buscar clientes con paginación - CORREGIDO con campos de contacto
    """
    try:
        offset = (pagina - 1) * por_pagina
        
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Consulta para contar total
            count_query = """
                SELECT COUNT(*) as total
                FROM clientes
                WHERE activo = TRUE
            """
            count_params = []
            
            # 🔥 IMPORTANTE: Seleccionar TODOS los campos necesarios
            data_query = """
                SELECT 
                    id,
                    tipo_documento,
                    numero_documento,
                    razon_social,
                    nombre_comercial,
                    direccion_fiscal,
                    codigo_cliente,
                    activo,
                    fecha_creacion,
                    telefono_contacto,
                    email_contacto,
                    nombre_contacto
                FROM clientes
                WHERE activo = TRUE
            """
            params = []
            
            # Filtrar por tipo de documento
            if tipo_documento and tipo_documento.strip():
                count_query += " AND tipo_documento = %s"
                data_query += " AND tipo_documento = %s"
                count_params.append(tipo_documento)
                params.append(tipo_documento)
            
            # Búsqueda por texto
            if busqueda and busqueda.strip():
                busqueda_like = f"%{busqueda.strip()}%"
                count_query += """ AND (
                    numero_documento ILIKE %s OR 
                    razon_social ILIKE %s OR 
                    nombre_comercial ILIKE %s
                )"""
                data_query += """ AND (
                    numero_documento ILIKE %s OR 
                    razon_social ILIKE %s OR 
                    nombre_comercial ILIKE %s
                )"""
                count_params.extend([busqueda_like, busqueda_like, busqueda_like])
                params.extend([busqueda_like, busqueda_like, busqueda_like])
            
            # Obtener total
            cur.execute(count_query, count_params)
            total = cur.fetchone()['total']
            
            # Obtener datos con paginación
            data_query += " ORDER BY id DESC LIMIT %s OFFSET %s"
            params.extend([por_pagina, offset])
            
            print(f"🔍 EJECUTANDO QUERY: {data_query}")
            print(f"📊 PARAMS: {params}")
            
            cur.execute(data_query, params)
            clientes = cur.fetchall()
            
            print(f"📋 CLIENTES ENCONTRADOS: {len(clientes)}")
            for c in clientes:
                print(f"  - {c.get('razon_social')}: tel={c.get('telefono_contacto')}, email={c.get('email_contacto')}, contacto={c.get('nombre_contacto')}")
            
            # Obtener contactos y puntos para cada cliente
            resultado = []
            for cliente in clientes:
                cliente_id = cliente['id']
                
                # Obtener contactos adicionales
                cur.execute("""
                    SELECT id, nombre, email, telefono, cargo, principal
                    FROM clientes_contactos
                    WHERE cliente_id = %s
                """, (cliente_id,))
                contactos = cur.fetchall()
                
                # Obtener puntos de entrega
                cur.execute("""
                    SELECT id, nombre_punto, direccion, departamento, provincia, 
                           distrito, telefono_contacto, responsable, condicion_pago, 
                           tiempo_credito, principal
                    FROM clientes_puntos_entrega
                    WHERE cliente_id = %s
                """, (cliente_id,))
                puntos = cur.fetchall()
                
                cliente['contactos'] = contactos
                cliente['puntos_entrega'] = puntos
                resultado.append(cliente)
            
            return {
                'data': resultado,
                'total': total,
                'pagina': pagina,
                'por_pagina': por_pagina,
                'total_paginas': (total + por_pagina - 1) // por_pagina
            }
            
    except Exception as e:
        print(f"❌ Error en buscar_clientes_paginado: {e}")
        import traceback
        traceback.print_exc()
        return {
            'data': [],
            'total': 0,
            'pagina': 1,
            'por_pagina': por_pagina,
            'total_paginas': 0
        }


# =========================
# Buscar clientes con todos los campos (VERSIÓN CORREGIDA)
# =========================
def buscar_clientes_completo(q: str, limit: int = 20):
    """Buscar clientes por texto incluyendo contactos"""
    q = (q or "").strip()
    
    if len(q) < 2:
        return []
    
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
        SELECT 
            c.id,
            c.tipo_documento,
            c.numero_documento,
            c.razon_social,
            c.nombre_comercial,
            c.razon_comercial,
            c.direccion_fiscal,
            c.codigo_cliente,
            cc.nombre_contacto,
            cc.email AS email_contacto,
            cc.telefono AS telefono_contacto
        FROM clientes c
        LEFT JOIN clientes_contactos cc ON cc.cliente_id = c.id AND cc.principal = TRUE
        WHERE c.activo = TRUE
        AND (
            c.numero_documento ILIKE %s OR 
            c.razon_social ILIKE %s OR 
            c.nombre_comercial ILIKE %s OR
            c.razon_comercial ILIKE %s OR
            cc.nombre_contacto ILIKE %s
        )
        ORDER BY c.razon_social
        LIMIT %s
    """
    
    like_param = f"%{q}%"
    cur.execute(query, (like_param, like_param, like_param, like_param, like_param, limit))
    result = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return result
# =========================
# Buscar clientes (versión antigua - mantener compatibilidad)
# =========================
def buscar_clientes(q: str, limit: int = 10):

    q = (q or "").strip()

    if len(q) < 2:
        return []

    return db_query("""
        SELECT id, tipo_documento, numero_documento, razon_social, direccion_fiscal, codigo_cliente, nombre_comercial
        FROM clientes
        WHERE activo = TRUE
        AND (numero_documento ILIKE %s OR razon_social ILIKE %s OR nombre_comercial ILIKE %s)
        ORDER BY razon_social
        LIMIT %s
    """, (f"%{q}%", f"%{q}%", f"%{q}%", limit))


# =========================
# Buscar productos
# =========================
def buscar_productos(q: str, limit: int = 15):

    q = (q or "").strip()

    if len(q) < 2:
        return []

    return db_query("""
        SELECT id, codigo, descripcion, marca, modelo, unidad, familia
        FROM productos
        WHERE activo = TRUE
        AND (codigo ILIKE %s OR descripcion ILIKE %s)
        ORDER BY descripcion
        LIMIT %s
    """, (f"%{q}%", f"%{q}%", limit))


# ===============================
# obtener_cliente_completo_por_id
# ===============================
def obtener_cliente_completo_por_id(cliente_id):

    rows = db_query("""
        SELECT *
        FROM clientes
        WHERE id = %s
        LIMIT 1
    """, (cliente_id,))

    if not rows:
        return None

    cliente = dict(rows[0])

    # contactos del cliente
    contactos = db_query("""
        SELECT *
        FROM clientes_contactos
        WHERE cliente_id = %s
    """, (cliente_id,))

    # puntos de entrega
    puntos = db_query("""
        SELECT *
        FROM clientes_puntos_entrega
        WHERE cliente_id = %s
    """, (cliente_id,))

    cliente["contactos"] = [dict(c) for c in contactos]
    cliente["puntos_entrega"] = [dict(p) for p in puntos]

    return cliente


# ================================
# obtener_producto_completo_por_id
# ================================
def obtener_producto_completo_por_id(producto_id):
    rows = db_query("""
        SELECT 
            id, familia, codigo, descripcion, descripcion_larga,
            marca, modelo, unidad, peso, observaciones, transporte,
            costo_unitario, precio_unitario, stock, activo, fecha_creacion
        FROM productos
        WHERE id = %s
        LIMIT 1
    """, (producto_id,))

    if not rows:
        return None

    return dict(rows[0])

# =========================
# Crear Producto con Stock Inicial (Kardex)
# =========================
def crear_producto_con_stock(data):
    """Inserta un nuevo producto con TODOS los campos"""
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
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id
        """, (
            data.get('familia'),
            data.get('codigo'),
            data.get('descripcion'),
            data.get('descripcion_larga', ''),
            data.get('marca', ''),
            data.get('modelo', ''),
            data.get('unidad', 'Unidad'),
            data.get('peso', '0'),
            data.get('volumen', '0'),
            data.get('observaciones', ''),
            data.get('transporte', ''),
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

        producto_id = cur.fetchone()['id']
        return producto_id
# =========================
# Cotizaciones recientes
# =========================
def obtener_cotizaciones_recientes(limit: int = 200):

    return db_query("""
        SELECT
            c.id,
            c.numero_cotizacion,
            c.fecha_creacion,
            c.estado,
            c.total,
            cl.razon_social AS cliente_razon_social,
            cl.numero_documento AS cliente_ruc
        FROM cotizaciones c
        JOIN clientes cl ON c.cliente_id = cl.id 
        ORDER BY c.id DESC
        LIMIT %s
    """, (limit,))


# ==============================
# Crear o guardar cotización transaccional - CON HORA PERÚ
# ==============================
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

        cur.execute("""
            SELECT numero_cotizacion
            FROM cotizaciones
            WHERE numero_cotizacion LIKE %s
            ORDER BY id DESC
            LIMIT 1
        """, (f"{prefix}%",))

        row = cur.fetchone()
        nuevo = 1

        if row:
            try:
                nuevo = int(row["numero_cotizacion"][-4:]) + 1
            except:
                pass

        numero = f"{prefix}{nuevo:04d}"

        # 🔥 CORREGIDO: Usar hora de Perú (UTC-5)
        cur.execute("""
            INSERT INTO cotizaciones
            (numero_cotizacion, cliente_id, estado, subtotal, igv, total, usuario_id, notas, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, (NOW() AT TIME ZONE 'America/Lima'))
            RETURNING id
        """, (
            numero,
            int(cliente_id),
            payload.get("estado", "En Proceso"),
            float(payload.get("subtotal", 0)),
            float(payload.get("igv", 0)),
            float(payload.get("total", 0)),
            int(usuario_id),
            payload.get("notas", "")
        ))

        cotizacion_id = cur.fetchone()["id"]

        for item in productos:
            cur.execute("""
                INSERT INTO cotizacion_detalle
                (cotizacion_id, producto_id, cantidad)
                VALUES (%s,%s,%s)
            """, (
                cotizacion_id,
                int(item["producto_id"]),
                float(item["cantidad"])
            ))

        return {
            "cotizacion_id": cotizacion_id,
            "numero_cotizacion": numero
        }

# ==========================
# Obtener cotización completa - CORREGIDO (sin columnas que no existen)
# ==========================
def obtener_cotizacion_completa(cotizacion_id):
    rows = db_query("""
        SELECT 
            c.id,
            c.numero_cotizacion,
            c.codigo_cotizacion,
            c.correlativo,
            c.fecha_creacion,
            c.estado,
            c.subtotal,
            c.igv,
            c.total,
            c.usuario_id,
            c.notas,
            c.condicion_pago,
            c.tiempo_entrega,
            c.validez_oferta,
            c.direccion_entrega,
            c.requerimiento,
            c.nota_cotizacion,
            c.cliente_id,
            -- 🔥 AGREGAR ESTOS TRES CAMPOS DE LA TABLA COTIZACIONES
            c.contacto_cliente,
            c.telefono_cliente,
            c.email_cliente,
            -- Datos del cliente
            cl.razon_social,
            cl.numero_documento,
            cl.direccion_fiscal,
            cl.telefono_contacto,
            cl.nombre_contacto,
            cl.email_contacto,
            -- Datos del usuario
            u.nombre_completo,
            u.email,
            u.telefono
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.id = %s
        LIMIT 1
    """, (cotizacion_id,))
    
    if not rows:
        return None

    cotizacion = dict(rows[0])
    
    # Formatear fecha_creacion para que tenga hora
    if cotizacion.get('fecha_creacion'):
        if hasattr(cotizacion['fecha_creacion'], 'strftime'):
            cotizacion['fecha_creacion'] = cotizacion['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')

    # detalle de productos
    detalle = db_query("""
        SELECT 
            d.*,
            p.codigo,
            p.descripcion,
            p.marca,
            p.modelo,
            p.unidad,
            p.costo_unitario
        FROM cotizacion_detalle d
        JOIN productos p ON p.id = d.producto_id
        WHERE d.cotizacion_id = %s
    """, (cotizacion_id,))

    cotizacion["detalle"] = [dict(d) for d in detalle]

    return {
        "cabecera": cotizacion,
        "detalle": cotizacion["detalle"]
    }

# =========================================
# CLIENTES - NUEVAS FUNCIONES
# =========================================

def insertar_cliente_completo(data):
    """
    Insertar cliente completo con contactos y puntos de entrega
    El código de cliente se genera automáticamente por el trigger
    """
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Insertar cliente (NO enviar codigo_cliente)
        cur.execute("""
            INSERT INTO clientes (
                tipo_documento, 
                numero_documento, 
                razon_social, 
                nombre_comercial,
                direccion_fiscal,
                activo
            )
            VALUES (%s, %s, %s, %s, %s, TRUE)
            RETURNING id, codigo_cliente
        """, (
            data.get('tipo_documento'),
            data.get('numero_documento'),
            data.get('razon_social'),
            data.get('nombre_comercial'),
            data.get('direccion_fiscal')
        ))
        
        resultado = cur.fetchone()
        cliente_id = resultado['id']
        codigo_generado = resultado['codigo_cliente']
        
        print(f"✅ Cliente insertado - ID: {cliente_id}, Código: {codigo_generado}")
        
        # 2. Insertar contactos
        contactos = data.get('contactos', [])
        for contacto in contactos:
            # Verificar que tenga al menos el nombre
            if contacto.get('nombre_contacto'):
                cur.execute("""
                    INSERT INTO clientes_contactos 
                    (cliente_id, nombre, email, telefono, cargo, principal)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    contacto.get('nombre_contacto'),
                    contacto.get('email'),
                    contacto.get('telefono'),
                    contacto.get('cargo'),
                    contacto.get('principal', False)
                ))
        
        # 3. Insertar puntos de entrega
        puntos = data.get('puntos_entrega', [])
        for punto in puntos:
            # Verificar que tenga al menos el nombre del punto
            if punto.get('nombre_punto'):
                cur.execute("""
                    INSERT INTO clientes_puntos_entrega 
                    (cliente_id, nombre_punto, direccion, departamento, provincia, 
                     distrito, telefono_contacto, responsable, condicion_pago, 
                     tiempo_credito, principal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    punto.get('nombre_punto'),
                    punto.get('direccion'),
                    punto.get('departamento'),
                    punto.get('provincia'),
                    punto.get('distrito'),
                    punto.get('telefono'),
                    punto.get('responsable'),
                    punto.get('condicion_pago'),
                    punto.get('tiempo_credito'),
                    punto.get('principal', False)
                ))
        
        return {
            'id': cliente_id,
            'codigo_cliente': codigo_generado,
            'success': True
        }


def obtener_ultimo_codigo_cliente():
    """Obtener el último código generado de cliente"""
    rows = db_query("""
        SELECT codigo_cliente 
        FROM clientes 
        WHERE codigo_cliente IS NOT NULL 
        ORDER BY id DESC 
        LIMIT 1
    """)
    
    if rows:
        return rows[0]['codigo_cliente']
    return 'CLI-000000'


def obtener_todos_clientes_con_detalles():
    """Obtener todos los clientes con sus contactos y puntos"""
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener clientes
        cur.execute("""
            SELECT 
                id,
                tipo_documento,
                numero_documento,
                razon_social,
                nombre_comercial,
                direccion_fiscal,
                codigo_cliente,
                activo,
                fecha_creacion
            FROM clientes
            WHERE activo = TRUE
            ORDER BY id DESC
        """)
        
        clientes = cur.fetchall()
        resultado = []
        
        for cliente in clientes:
            cliente_id = cliente['id']
            
            # Obtener contactos
            cur.execute("""
                SELECT id, nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos
                WHERE cliente_id = %s
            """, (cliente_id,))
            contactos = cur.fetchall()
            
            # Obtener puntos de entrega
            cur.execute("""
                SELECT id, nombre_punto, direccion, departamento, provincia, 
                       distrito, telefono_contacto, responsable, condicion_pago, 
                       tiempo_credito, principal
                FROM clientes_puntos_entrega
                WHERE cliente_id = %s
            """, (cliente_id,))
            puntos = cur.fetchall()
            
            cliente['contactos'] = contactos
            cliente['puntos_entrega'] = puntos
            resultado.append(cliente)
        
        return resultado


def actualizar_cliente_completo(cliente_id, data):
    """Actualizar cliente completo"""
    with db_tx() as conn:
        cur = conn.cursor()
        
        # Actualizar datos básicos
        cur.execute("""
            UPDATE clientes 
            SET tipo_documento = %s,
                numero_documento = %s,
                razon_social = %s,
                nombre_comercial = %s,
                direccion_fiscal = %s
            WHERE id = %s
        """, (
            data.get('tipo_documento'),
            data.get('numero_documento'),
            data.get('razon_social'),
            data.get('nombre_comercial'),
            data.get('direccion_fiscal'),
            cliente_id
        ))
        
        # Eliminar contactos antiguos y reinsertar
        cur.execute("DELETE FROM clientes_contactos WHERE cliente_id = %s", (cliente_id,))
        for contacto in data.get('contactos', []):
            if contacto.get('nombre_contacto'):
                cur.execute("""
                    INSERT INTO clientes_contactos 
                    (cliente_id, nombre_contacto, email, telefono, cargo, principal)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    contacto.get('nombre_contacto'),
                    contacto.get('email'),
                    contacto.get('telefono'),
                    contacto.get('cargo'),
                    contacto.get('principal', False)
                ))
        
        # Eliminar puntos antiguos y reinsertar
        cur.execute("DELETE FROM clientes_puntos_entrega WHERE cliente_id = %s", (cliente_id,))
        for punto in data.get('puntos_entrega', []):
            if punto.get('nombre_punto'):
                cur.execute("""
                    INSERT INTO clientes_puntos_entrega 
                    (cliente_id, nombre_punto, direccion, departamento, provincia, 
                     distrito, telefono_contacto, responsable, condicion_pago, 
                     tiempo_credito, principal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    punto.get('nombre_punto'),
                    punto.get('direccion'),
                    punto.get('departamento'),
                    punto.get('provincia'),
                    punto.get('distrito'),
                    punto.get('telefono'),
                    punto.get('responsable'),
                    punto.get('condicion_pago'),
                    punto.get('tiempo_credito'),
                    punto.get('principal', False)
                ))
        
        return {'success': True}


def eliminar_cliente_db(cliente_id):
    """Eliminar cliente (borrado lógico)"""
    db_execute("""
        UPDATE clientes SET activo = FALSE WHERE id = %s
    """, (cliente_id,))
    return {'success': True}

def obtener_cliente_por_documento(numero_documento):
    """Buscar cliente por número de documento (RUC/DNI)"""
    try:
        if not numero_documento:
            return None
        
        rows = db_query("""
            SELECT 
                id, 
                razon_social, 
                numero_documento, 
                telefono_contacto, 
                email_contacto, 
                nombre_contacto, 
                direccion_fiscal
            FROM clientes 
            WHERE numero_documento = %s AND activo = TRUE
            LIMIT 1
        """, (numero_documento,))
        
        return rows[0] if rows else None
        
    except Exception as e:
        print(f"❌ Error en obtener_cliente_por_documento: {e}")
        return None
# =========================================
# PROVEEDORES - NUEVAS FUNCIONES
# =========================================

def insertar_proveedor_completo(data):
    """Insertar proveedor completo - El código se genera automáticamente por el trigger"""
    with db_tx() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            INSERT INTO proveedores (
                razon_social,
                razon_comercial,
                ruc,
                direccion,
                telefono,
                contacto,
                email,
                condicion_pago,
                tiempo_credito,
                banco,
                numero_cuenta, 
                cci,
                lugar_recojo,
                activo
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id, codigo_proveedor
        """, (
            data.get('razon_social'),
            data.get('razon_comercial'),
            data.get('ruc'),
            data.get('direccion'),
            data.get('telefono'),
            data.get('contacto'),
            data.get('email'),
            data.get('condicion_pago'),
            data.get('tiempo_credito'),
            data.get('banco'),
            data.get('numero_cuenta'),   
            data.get('cci'),
            data.get('lugar_recojo')
        ))
        
        resultado = cur.fetchone()
        print(f"✅ Proveedor insertado - ID: {resultado['id']}, Código: {resultado['codigo_proveedor']}")
        
        return {
            'id': resultado['id'],
            'codigo_proveedor': resultado['codigo_proveedor'],
            'success': True
        }


def obtener_todos_proveedores():
    """Obtener todos los proveedores activos"""
    return db_query("""
        SELECT 
            id,
            codigo_proveedor,
            razon_social,
            razon_comercial,
            ruc,
            direccion,
            telefono,
            contacto,
            email,
            condicion_pago,
            tiempo_credito,
            banco,
            numero_cuenta, 
            cci,
            lugar_recojo,
            activo,
            fecha_creacion
        FROM proveedores
        WHERE activo = TRUE
        ORDER BY id DESC
    """)


def obtener_proveedor_por_id(proveedor_id):
    """Obtener proveedor por ID"""
    try:
        rows = db_query("""
            SELECT 
                id,
                codigo_proveedor,
                razon_social,
                razon_comercial,
                ruc,
                direccion,
                telefono,
                contacto,
                email,
                condicion_pago,
                tiempo_credito,
                banco,
                numero_cuenta, 
                cci,
                lugar_recojo,
                activo,
                fecha_creacion
            FROM proveedores
            WHERE id = %s AND activo = TRUE
        """, (proveedor_id,))
        
        if not rows:
            return None
            
        return rows[0]   # Retorna el primer (y único) registro

    except Exception as e:
        print(f"❌ Error en obtener_proveedor_por_id({proveedor_id}): {e}")
        return None


def actualizar_proveedor(proveedor_id, razon_social=None, razon_comercial=None, 
                         ruc=None, direccion=None, telefono=None, contacto=None,
                         email=None, condicion_pago=None, tiempo_credito=None,
                         banco=None, numero_cuenta=None, cci=None, lugar_recojo=None):
    """Actualizar proveedor con parámetros individuales"""
    try:
        db_execute("""
            UPDATE proveedores 
            SET razon_social = %s,
                razon_comercial = %s,
                ruc = %s,
                direccion = %s,
                telefono = %s,
                contacto = %s,
                email = %s,
                condicion_pago = %s,
                tiempo_credito = %s,
                banco = %s,
                numero_cuenta = %s,   
                cci = %s, 
                lugar_recojo = %s
            WHERE id = %s AND activo = TRUE
        """, (
            razon_social,
            razon_comercial,
            ruc,
            direccion,
            telefono,
            contacto,
            email,
            condicion_pago,
            tiempo_credito,
            banco,
            numero_cuenta,
            cci,
            lugar_recojo,
            proveedor_id
        ))
        return {'success': True}
    except Exception as e:
        print(f"Error actualizando proveedor {proveedor_id}: {e}")
        raise

def eliminar_proveedor_db(proveedor_id):
    """Eliminar proveedor (borrado lógico)"""
    db_execute("""
        UPDATE proveedores SET activo = FALSE WHERE id = %s
    """, (proveedor_id,))
    return {'success': True}


def obtener_ultimo_codigo_proveedor():
    """Obtener el último código generado de proveedor"""
    rows = db_query("""
        SELECT codigo_proveedor 
        FROM proveedores 
        WHERE codigo_proveedor IS NOT NULL 
        ORDER BY id DESC 
        LIMIT 1
    """)
    
    if rows:
        return rows[0]['codigo_proveedor']
    return 'PROV-000000'


# =========================================
# BUSCAR CLIENTE POR RUC EXACTO (CORREGIDO)
# =========================================
def buscar_cliente_por_ruc(ruc: str):
    """Buscar cliente exactamente por número de RUC"""
    if not ruc or len(ruc) < 3:
        return None
    
    rows = db_query("""
        SELECT 
            id,
            tipo_documento,
            numero_documento,
            razon_social,
            nombre_comercial,
            direccion_fiscal,
            codigo_cliente
        FROM clientes
        WHERE activo = TRUE
        AND numero_documento = %s
        LIMIT 1
    """, (ruc,))
    
    return rows[0] if rows else None

    # =========================================
# ÓRDENES DE COMPRA - FUNCIONES
# =========================================
def obtener_orden_completa(orden_id):
    """Obtener orden de compra completa con cabecera y detalles - CORREGIDO"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener cabecera de la orden con TODOS los campos
        cursor.execute("""
            SELECT 
                o.id,
                o.numero_orden,
                o.codigo_orden,
                o.correlativo,
                o.fecha_creacion,
                o.estado,
                o.subtotal,
                o.igv,
                o.total,
                o.condicion_pago,
                o.tiempo_entrega,
                o.fecha_requerida,
                o.lugar_entrega,
                o.num_cotizacion,
                o.nota_compra,
                o.usuario_id,
                o.notas,
                o.descuento_porcentaje,
                o.descuento_monto,
                o.descuento_tipo,
                o.contacto_proveedor,
                o.telefono_proveedor,
                o.email_proveedor,
                -- Datos del proveedor
                p.razon_social as proveedor,
                p.ruc as proveedor_ruc,
                p.direccion as proveedor_direccion,
                p.contacto as proveedor_contacto,
                p.telefono as telefono_contacto,
                p.email as email_contacto_proveedor,
                p.codigo_proveedor as codigo_proveedor,
                p.razon_comercial as nombre_comercial,
                -- Datos del usuario
                u.nombre_completo as comprador,
                u.email as comprador_email,
                u.telefono as comprador_telefono
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.id = %s
        """, (orden_id,))
        
        cabecera = cursor.fetchone()
        if not cabecera:
            conn.close()
            return None
        
        # Obtener detalles de la orden con productos
        cursor.execute("""
            SELECT 
                d.id,
                d.orden_id,
                d.producto_id,
                d.cantidad,
                d.costo_unitario,
                d.subtotal_costo,
                d.margen_porcentaje,
                d.precio_venta_unitario,
                d.subtotal_venta,
                d.descuento_porcentaje,
                d.precio_venta_con_descuento,
                d.subtotal_venta_con_descuento,
                d.descuento_total,
                d.margen_final,
                pr.codigo,
                pr.descripcion,
                pr.marca,
                pr.modelo,
                pr.unidad as unidad_medida
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
        """, (orden_id,))
        
        detalles = cursor.fetchall()
        conn.close()
        
        # Convertir cabecera a diccionario con valores por defecto
        cabecera_dict = dict(cabecera)
        cabecera_dict['proveedor'] = cabecera_dict.get('proveedor') or 'Sin proveedor'
        cabecera_dict['proveedor_ruc'] = cabecera_dict.get('proveedor_ruc') or '--'
        cabecera_dict['proveedor_direccion'] = cabecera_dict.get('proveedor_direccion') or '--'
        cabecera_dict['proveedor_contacto'] = cabecera_dict.get('proveedor_contacto') or cabecera_dict.get('contacto_proveedor') or '--'
        cabecera_dict['telefono_contacto'] = cabecera_dict.get('telefono_contacto') or cabecera_dict.get('telefono_proveedor') or '--'
        cabecera_dict['email_contacto_proveedor'] = cabecera_dict.get('email_contacto_proveedor') or cabecera_dict.get('email_proveedor') or '--'
        cabecera_dict['codigo_proveedor'] = cabecera_dict.get('codigo_proveedor') or '--'
        cabecera_dict['nombre_comercial'] = cabecera_dict.get('nombre_comercial') or '--'
        cabecera_dict['comprador'] = cabecera_dict.get('comprador') or '--'
        cabecera_dict['condicion_pago'] = cabecera_dict.get('condicion_pago') or '--'
        cabecera_dict['nota_compra'] = cabecera_dict.get('nota_compra') or '--'
        cabecera_dict['notas'] = cabecera_dict.get('notas') or '--'
        cabecera_dict['lugar_entrega'] = cabecera_dict.get('lugar_entrega') or '--'
        cabecera_dict['tiempo_entrega'] = cabecera_dict.get('tiempo_entrega') or '--'
        cabecera_dict['num_cotizacion'] = cabecera_dict.get('num_cotizacion') or '--'
        
        # Obtener descripción desde los productos
        descripcion = obtener_descripcion_orden(orden_id)
        cabecera_dict['descripcion'] = descripcion
        
        # Formatear fecha
        if cabecera_dict.get('fecha_creacion'):
            if hasattr(cabecera_dict['fecha_creacion'], 'strftime'):
                cabecera_dict['fecha_creacion'] = cabecera_dict['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Convertir detalles
        detalles_list = []
        for detalle in detalles:
            detalle_dict = dict(detalle)
            detalle_dict['codigo'] = detalle_dict.get('codigo') or '--'
            detalle_dict['descripcion'] = detalle_dict.get('descripcion') or '--'
            detalle_dict['marca'] = detalle_dict.get('marca') or '--'
            detalle_dict['modelo'] = detalle_dict.get('modelo') or '--'
            detalle_dict['unidad_medida'] = detalle_dict.get('unidad_medida') or 'Unid'
            detalle_dict['cantidad'] = float(detalle_dict.get('cantidad') or 0)
            detalle_dict['precio_venta_unitario'] = float(detalle_dict.get('precio_venta_unitario') or 0)
            detalle_dict['subtotal_venta_con_descuento'] = float(detalle_dict.get('subtotal_venta_con_descuento') or 0)
            detalles_list.append(detalle_dict)
        
        return {
            "cabecera": cabecera_dict,
            "detalle": detalles_list
        }
        
    except Exception as e:
        print(f"🔥 Error en obtener_orden_completa: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def diagnosticar_orden(orden_id):
    """Diagnóstico de una orden específica"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("\n" + "=" * 80)
        print(f"🔍 DIAGNÓSTICO DE ORDEN ID: {orden_id}")
        print("=" * 80)
        
        # Verificar cabecera
        cursor.execute("SELECT * FROM ordenes_compra WHERE id = %s", (orden_id,))
        cabecera = cursor.fetchone()
        
        if cabecera:
            print("\n📋 CABECERA:")
            for key, value in cabecera.items():
                print(f"   {key}: {value}")
        else:
            print(f"\n❌ No existe la orden con ID {orden_id}")
            conn.close()
            return
        
        # Verificar detalle
        cursor.execute("""
            SELECT d.*, pr.codigo, pr.descripcion 
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
        """, (orden_id,))
        detalles = cursor.fetchall()
        
        print(f"\n📦 DETALLE ({len(detalles)} items):")
        for detalle in detalles:
            print(f"   - Producto: {detalle.get('codigo')} - {detalle.get('descripcion')}")
            print(f"     Cantidad: {detalle.get('cantidad')}, Precio: {detalle.get('precio_venta_unitario')}")
        
        # Verificar proveedor
        if cabecera.get('proveedor_id'):
            cursor.execute("""
                SELECT * FROM proveedores WHERE id = %s
            """, (cabecera['proveedor_id'],))
            proveedor = cursor.fetchone()
            if proveedor:
                print("\n🏢 PROVEEDOR:")
                for key, value in proveedor.items():
                    print(f"   {key}: {value}")
        
        conn.close()
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"❌ Error en diagnóstico: {str(e)}")
        import traceback
        traceback.print_exc()

def obtener_ordenes_recientes(limit=100):
    """Obtener órdenes de compra recientes con TODOS los campos necesarios"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                o.id,
                o.numero_orden,
                o.codigo_orden,
                o.correlativo,
                o.fecha_creacion,
                o.estado,
                o.total,
                o.subtotal,
                o.igv,
                o.condicion_pago,
                o.nota_compra,
                o.notas,
                o.lugar_entrega,
                o.fecha_requerida,
                o.tiempo_entrega,
                o.num_cotizacion,
                o.proveedor_id,
                o.contacto_proveedor,
                o.telefono_proveedor,
                o.email_proveedor,
                -- Datos del proveedor - CORREGIDO
                p.ruc as proveedor_ruc,
                p.razon_social as proveedor,
                -- 🔥 IMPORTANTE: Usar razon_comercial de la tabla proveedores
                COALESCE(p.razon_comercial, p.razon_social) as nombre_comercial,
                p.contacto as proveedor_contacto,
                p.telefono as telefono_contacto,
                p.email as email_contacto_proveedor,
                p.direccion as proveedor_direccion,
                p.codigo_proveedor as codigo_proveedor,
                -- Datos del usuario
                u.nombre_completo as comprador,
                u.email as comprador_email,
                u.telefono as comprador_telefono,
                -- Contadores
                COUNT(d.id) as total_items,
                COALESCE(SUM(d.cantidad), 0) as cantidad_total_items,
                COALESCE(SUM(d.subtotal_venta_con_descuento), 0) as total_detalle,
                -- 🔥 AGREGAR LA DESCRIPCIÓN DE LA ORDEN
                (SELECT STRING_AGG(pr.descripcion, ' / ') 
                 FROM orden_compra_detalle d2 
                 LEFT JOIN productos pr ON d2.producto_id = pr.id 
                 WHERE d2.orden_id = o.id 
                 LIMIT 3) as descripcion
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN usuarios u ON o.usuario_id = u.id
            LEFT JOIN orden_compra_detalle d ON o.id = d.orden_id
            GROUP BY 
                o.id, o.numero_orden, o.codigo_orden, o.correlativo, 
                o.fecha_creacion, o.estado, o.total, o.subtotal, o.igv,
                o.condicion_pago, o.nota_compra, o.notas,
                o.lugar_entrega, o.fecha_requerida, o.tiempo_entrega,
                o.num_cotizacion, o.proveedor_id,
                o.contacto_proveedor, o.telefono_proveedor, o.email_proveedor,
                p.ruc, p.razon_social, p.razon_comercial, p.contacto,
                p.telefono, p.email, p.direccion, p.codigo_proveedor,
                u.nombre_completo, u.email, u.telefono
            ORDER BY o.id DESC
            LIMIT %s
        """, (limit,))

        ordenes = cursor.fetchall()
        conn.close()
        
        # Convertir a lista de diccionarios con valores por defecto
        resultado = []
        for orden in ordenes:
            resultado.append({
                'id': orden.get('id'),
                'numero_orden': orden.get('numero_orden'),
                'codigo_orden': orden.get('codigo_orden'),
                'correlativo': orden.get('correlativo'),
                'fecha_creacion': orden.get('fecha_creacion').strftime('%Y-%m-%d %H:%M:%S') if orden.get('fecha_creacion') else '',
                'estado': orden.get('estado', 'pendiente'),
                'total': float(orden.get('total') or 0),
                'subtotal': float(orden.get('subtotal') or 0),
                'igv': float(orden.get('igv') or 0),
                'condicion_pago': orden.get('condicion_pago') or '--',
                'nota_compra': orden.get('nota_compra') or '--',
                'notas': orden.get('notas') or '--',
                'descripcion': orden.get('descripcion') or '--',
                'lugar_entrega': orden.get('lugar_entrega') or '--',
                'fecha_requerida': orden.get('fecha_requerida') or '--',
                'tiempo_entrega': orden.get('tiempo_entrega') or '--',
                'num_cotizacion': orden.get('num_cotizacion') or '--',
                'proveedor_id': orden.get('proveedor_id'),
                'proveedor_ruc': orden.get('proveedor_ruc') or '--',
                'proveedor': orden.get('proveedor') or 'Sin proveedor',
                'nombre_comercial': orden.get('nombre_comercial') or '--',
                'proveedor_contacto': orden.get('proveedor_contacto') or orden.get('contacto_proveedor') or '--',
                'telefono_contacto': orden.get('telefono_contacto') or orden.get('telefono_proveedor') or '--',
                'email_contacto_proveedor': orden.get('email_contacto_proveedor') or orden.get('email_proveedor') or '--',
                'proveedor_direccion': orden.get('proveedor_direccion') or '--',
                'codigo_proveedor': orden.get('codigo_proveedor') or '--',
                'comprador': orden.get('comprador') or '--',
                'comprador_email': orden.get('comprador_email') or '--',
                'comprador_telefono': orden.get('comprador_telefono') or '--',
                'total_items': int(orden.get('total_items') or 0),
                'cantidad_total_items': int(orden.get('cantidad_total_items') or 0),
                'total_detalle': float(orden.get('total_detalle') or 0),
                'contacto_proveedor': orden.get('contacto_proveedor') or '--',
                'telefono_proveedor': orden.get('telefono_proveedor') or '--',
                'email_proveedor': orden.get('email_proveedor') or '--'
            })
        
        return resultado
        
    except Exception as e:
        print(f"🔥 Error en obtener_ordenes_recientes: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
    
def obtener_descripcion_orden(orden_id):
    """Obtener descripción de la orden desde sus productos"""
    try:
        if not orden_id:
            return '--'
        
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT STRING_AGG(pr.descripcion, ' / ') as descripcion
            FROM orden_compra_detalle d
            LEFT JOIN productos pr ON d.producto_id = pr.id
            WHERE d.orden_id = %s
            LIMIT 3
        """, (orden_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result.get('descripcion'):
            desc = result['descripcion']
            # Limitar a 100 caracteres
            if len(desc) > 100:
                desc = desc[:100] + '...'
            return desc
        return '--'
        
    except Exception as e:
        print(f"Error en obtener_descripcion_orden: {e}")
        return '--'


def buscar_proveedor_por_ruc(ruc):
    """Buscar proveedor por RUC exacto"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                id, 
                razon_social, 
                ruc as numero_documento, 
                direccion, 
                telefono as telefono_contacto, 
                contacto as nombre_contacto, 
                email as email_contacto
            FROM proveedores 
            WHERE ruc = %s AND activo = TRUE
        """, (ruc,))
        
        proveedor = cursor.fetchone()
        conn.close()
        
        return proveedor
        
    except Exception as e:
        print(f"Error en buscar_proveedor_por_ruc: {str(e)}")
        return None


def crear_orden_compra_transaccional(payload: dict, usuario_id: int):
    """Crear una nueva orden de compra"""
    try:
        proveedor_id = payload.get("proveedor_id")
        productos = payload.get("productos", [])

        if not proveedor_id:
            raise ValueError("proveedor_id es requerido")

        if not productos:
            raise ValueError("Debe enviar productos")

        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Generar número de orden automático
            cur.execute("""
                SELECT numero_orden FROM ordenes_compra 
                WHERE numero_orden LIKE 'OC-%' 
                ORDER BY id DESC LIMIT 1
            """)
            row = cur.fetchone()
            
            if row:
                try:
                    nuevo_numero = int(row["numero_orden"][3:]) + 1
                except:
                    nuevo_numero = 1
            else:
                nuevo_numero = 1
            
            numero_orden = f"OC-{nuevo_numero:05d}"
            
            # Insertar orden
            cur.execute("""
                INSERT INTO ordenes_compra (
                    numero_orden,
                    codigo_orden,
                    proveedor_id,
                    usuario_id,
                    estado,
                    subtotal,
                    igv,
                    total,
                    condicion_pago,
                    tiempo_entrega,
                    fecha_requerida,
                    lugar_entrega,
                    num_cotizacion,
                    nota_compra,
                    notas,
                    contacto_proveedor,
                    telefono_proveedor,
                    email_proveedor,
                    fecha_creacion
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id, codigo_orden
            """, (
                numero_orden,
                payload.get("codigo_orden", numero_orden),
                proveedor_id,
                usuario_id,
                payload.get("estado", "pendiente"),
                float(payload.get("subtotal", 0)),
                float(payload.get("igv", 0)),
                float(payload.get("total", 0)),
                payload.get("condicion_pago"),
                payload.get("tiempo_entrega"),
                payload.get("fecha_requerida"),
                payload.get("lugar_entrega"),
                payload.get("num_cotizacion"),
                payload.get("nota_compra"),
                payload.get("notas", ""),
                payload.get("contacto_proveedor"),
                payload.get("telefono_proveedor"),
                payload.get("email_proveedor")
            ))
            
            resultado = cur.fetchone()
            orden_id = resultado["id"]
            codigo_orden = resultado["codigo_orden"]
            
            # Insertar detalles
            for item in productos:
                cur.execute("""
                    INSERT INTO orden_compra_detalle (
                        orden_id,
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
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    orden_id,
                    item.get("producto_id"),
                    float(item.get("cantidad", 0)),
                    float(item.get("costo_unitario", 0)),
                    float(item.get("subtotal_costo", 0)),
                    float(item.get("margen_porcentaje", 0)),
                    float(item.get("precio_venta_unitario", 0)),
                    float(item.get("subtotal_venta", 0)),
                    float(item.get("descuento_porcentaje", 0)),
                    float(item.get("precio_venta_con_descuento", 0)),
                    float(item.get("subtotal_venta_con_descuento", 0)),
                    float(item.get("descuento_total", 0)),
                    float(item.get("margen_final", 0))
                ))
            
            return {
                "orden_id": orden_id,
                "numero_orden": numero_orden,
                "codigo_orden": codigo_orden,
                "success": True
            }
            
    except Exception as e:
        print(f"Error en crear_orden_compra_transaccional: {str(e)}")
        raise


def actualizar_orden_compra(orden_id: int, payload: dict):
    """Actualizar una orden de compra existente"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            # Actualizar cabecera
            cur.execute("""
                UPDATE ordenes_compra 
                SET proveedor_id = %s,
                    estado = %s,
                    subtotal = %s,
                    igv = %s,
                    total = %s,
                    condicion_pago = %s,
                    tiempo_entrega = %s,
                    fecha_requerida = %s,
                    lugar_entrega = %s,
                    num_cotizacion = %s,
                    nota_compra = %s,
                    notas = %s,
                    contacto_proveedor = %s,
                    telefono_proveedor = %s,
                    email_proveedor = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                payload.get("proveedor_id"),
                payload.get("estado", "pendiente"),
                float(payload.get("subtotal", 0)),
                float(payload.get("igv", 0)),
                float(payload.get("total", 0)),
                payload.get("condicion_pago"),
                payload.get("tiempo_entrega"),
                payload.get("fecha_requerida"),
                payload.get("lugar_entrega"),
                payload.get("num_cotizacion"),
                payload.get("nota_compra"),
                payload.get("notas", ""),
                payload.get("contacto_proveedor"),
                payload.get("telefono_proveedor"),
                payload.get("email_proveedor"),
                orden_id
            ))
            
            # Eliminar detalles antiguos
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
            
            # Insertar nuevos detalles
            for item in payload.get("productos", []):
                cur.execute("""
                    INSERT INTO orden_compra_detalle (
                        orden_id,
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
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    orden_id,
                    item.get("producto_id"),
                    float(item.get("cantidad", 0)),
                    float(item.get("costo_unitario", 0)),
                    float(item.get("subtotal_costo", 0)),
                    float(item.get("margen_porcentaje", 0)),
                    float(item.get("precio_venta_unitario", 0)),
                    float(item.get("subtotal_venta", 0)),
                    float(item.get("descuento_porcentaje", 0)),
                    float(item.get("precio_venta_con_descuento", 0)),
                    float(item.get("subtotal_venta_con_descuento", 0)),
                    float(item.get("descuento_total", 0)),
                    float(item.get("margen_final", 0))
                ))
            
            return {"success": True}
            
    except Exception as e:
        print(f"Error en actualizar_orden_compra: {str(e)}")
        raise


def eliminar_orden_compra_db(orden_id: int):
    """Eliminar una orden de compra"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            # Primero eliminar detalles
            cur.execute("DELETE FROM orden_compra_detalle WHERE orden_id = %s", (orden_id,))
            
            # Luego eliminar cabecera
            cur.execute("DELETE FROM ordenes_compra WHERE id = %s", (orden_id,))
            
            return {"success": True}
            
    except Exception as e:
        print(f"Error en eliminar_orden_compra_db: {str(e)}")
        raise

def obtener_direcciones_proveedor(proveedor_id: int):
    """Obtener direcciones guardadas de un proveedor"""
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, nombre_punto, direccion, telefono_contacto, principal
            FROM proveedores_direcciones
            WHERE proveedor_id = %s
            ORDER BY principal DESC, nombre_punto
        """, (proveedor_id,))
        
        direcciones = cursor.fetchall()
        conn.close()
        
        return direcciones
        
    except Exception as e:
        print(f"Error en obtener_direcciones_proveedor: {str(e)}")
        return []


# ==========================================
# DB UPDATE - Para ejecutar UPDATE en la base de datos
# ==========================================
def db_update(sql, params=()):
    """
    Ejecuta una consulta UPDATE y retorna el número de filas afectadas
    
    Args:
        sql: Consulta SQL (UPDATE, DELETE, etc.)
        params: Parámetros para la consulta
    
    Returns:
        int: Número de filas afectadas
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        filas_afectadas = cur.rowcount
        return filas_afectadas
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


# ==========================================
# DB INSERT - Para ejecutar INSERT y obtener el ID
# ==========================================
def db_insert(sql, params=()):
    """
    Ejecuta una consulta INSERT y retorna el ID generado
    
    Args:
        sql: Consulta SQL (INSERT ... RETURNING id)
        params: Parámetros para la consulta
    
    Returns:
        int: ID del registro insertado, o None si falló
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        
        # Intentar obtener el ID retornado
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


# ==========================================
# FUNCIÓN DE DIAGNÓSTICO PARA CLIENTES
# ==========================================
def diagnosticar_clientes():
    """Función para diagnosticar problemas con los campos de clientes"""
    print("\n" + "=" * 80)
    print("🔬 DIAGNÓSTICO DE CLIENTES")
    print("=" * 80)
    
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar estructura de la tabla
        print("\n📋 ESTRUCTURA DE LA TABLA clientes:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'clientes'
            ORDER BY ordinal_position
        """)
        columnas = cur.fetchall()
        for col in columnas:
            print(f"   - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        # Verificar si las columnas de contacto existen
        print("\n🔍 VERIFICANDO COLUMNAS DE CONTACTO:")
        columnas_requeridas = ['telefono_contacto', 'email_contacto', 'nombre_contacto']
        for col_req in columnas_requeridas:
            existe = any(col['column_name'] == col_req for col in columnas)
            if existe:
                print(f"   ✅ Columna '{col_req}' EXISTE")
            else:
                print(f"   ❌ Columna '{col_req}' NO EXISTE - Debes crearla")
        
        # Verificar datos de un cliente específico
        print("\n📊 DATOS DE CLIENTE ID 84:")
        cur.execute("""
            SELECT id, razon_social, telefono_contacto, email_contacto, nombre_contacto
            FROM clientes 
            WHERE id = 84
        """)
        cliente = cur.fetchone()
        if cliente:
            print(f"   - razon_social: {cliente.get('razon_social')}")
            print(f"   - telefono_contacto: '{cliente.get('telefono_contacto')}'")
            print(f"   - email_contacto: '{cliente.get('email_contacto')}'")
            print(f"   - nombre_contacto: '{cliente.get('nombre_contacto')}'")
            
            if cliente.get('telefono_contacto') is None:
                print(f"   ⚠️ teléfono_contacto es NULL")
            if cliente.get('email_contacto') is None:
                print(f"   ⚠️ email_contacto es NULL")
            if cliente.get('nombre_contacto') is None:
                print(f"   ⚠️ nombre_contacto es NULL")
        else:
            print(f"   ❌ No existe cliente con ID 84")
        
        # Contar clientes con datos completos
        print("\n📈 ESTADÍSTICAS GENERALES:")
        cur.execute("SELECT COUNT(*) as total FROM clientes")
        total = cur.fetchone()['total']
        print(f"   - Total clientes: {total}")
        
        cur.execute("SELECT COUNT(*) as total FROM clientes WHERE telefono_contacto IS NOT NULL AND telefono_contacto != ''")
        con_telefono = cur.fetchone()['total']
        print(f"   - Con teléfono: {con_telefono} ({con_telefono*100/total if total > 0 else 0:.1f}%)")
        
        cur.execute("SELECT COUNT(*) as total FROM clientes WHERE email_contacto IS NOT NULL AND email_contacto != ''")
        con_email = cur.fetchone()['total']
        print(f"   - Con email: {con_email} ({con_email*100/total if total > 0 else 0:.1f}%)")
        
        cur.execute("SELECT COUNT(*) as total FROM clientes WHERE nombre_contacto IS NOT NULL AND nombre_contacto != ''")
        con_contacto = cur.fetchone()['total']
        print(f"   - Con contacto: {con_contacto} ({con_contacto*100/total if total > 0 else 0:.1f}%)")
        
        cur.close()
        conn.close()
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"❌ Error en diagnóstico: {str(e)}")
        import traceback
        traceback.print_exc()


# ==========================================
# COMPROBANTES DE VENTA - FUNCIONES
# ==========================================

def obtener_comprobantes():
    """Obtener todos los comprobantes"""
    try:
        return db_query("""
            SELECT id, tipo_comprobante, serie, numero, 
                   cliente_nombre, cliente_numero_doc, fecha_emision, 
                   subtotal, igv, total, estado_sunat, created_at
            FROM comprobantes
            ORDER BY created_at DESC
        """)
    except Exception as e:
        print(f"Error en obtener_comprobantes: {e}")
        return []


def obtener_comprobante_por_id(comp_id):
    """Obtener un comprobante por ID"""
    try:
        rows = db_query("""
            SELECT * FROM comprobantes WHERE id = %s
        """, (comp_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_comprobante_por_id: {e}")
        return None


def insertar_comprobante(data):
    """Insertar un nuevo comprobante"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO comprobantes (
                    tipo_comprobante, serie, numero, fecha_emision, moneda,
                    cliente_tipo_doc, cliente_numero_doc, cliente_nombre, 
                    cliente_direccion, cliente_email, cliente_telefono,
                    subtotal, igv, total, items_json, observaciones, 
                    estado_sunat, creado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('tipo_comprobante'),
                data.get('serie'),
                data.get('numero'),
                data.get('fecha_emision'),
                data.get('moneda', 'PEN'),
                data.get('cliente_tipo_doc', 'RUC'),
                data.get('cliente_numero_doc'),
                data.get('cliente_nombre'),
                data.get('cliente_direccion'),
                data.get('cliente_email'),
                data.get('cliente_telefono'),
                data.get('subtotal', 0),
                data.get('igv', 0),
                data.get('total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                data.get('estado_sunat', 'BORRADOR'),
                data.get('creado_por')
            ))
            
            result = cur.fetchone()
            return result['id'] if result else None
            
    except Exception as e:
        print(f"Error en insertar_comprobante: {e}")
        raise


def actualizar_comprobante(comp_id, data):
    """Actualizar un comprobante existente"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE comprobantes SET
                    fecha_emision = %s,
                    cliente_tipo_doc = %s,
                    cliente_numero_doc = %s,
                    cliente_nombre = %s,
                    cliente_direccion = %s,
                    cliente_email = %s,
                    cliente_telefono = %s,
                    subtotal = %s,
                    igv = %s,
                    total = %s,
                    items_json = %s,
                    observaciones = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                data.get('fecha_emision'),
                data.get('cliente_tipo_doc', 'RUC'),
                data.get('cliente_numero_doc'),
                data.get('cliente_nombre'),
                data.get('cliente_direccion'),
                data.get('cliente_email'),
                data.get('cliente_telefono'),
                data.get('subtotal', 0),
                data.get('igv', 0),
                data.get('total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                comp_id
            ))
            
            return True
            
    except Exception as e:
        print(f"Error en actualizar_comprobante: {e}")
        raise


def eliminar_comprobante_db(comp_id):
    """Eliminar un comprobante (borrado físico)"""
    try:
        db_execute("DELETE FROM comprobantes WHERE id = %s", (comp_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_comprobante_db: {e}")
        raise


def actualizar_estado_sunat_comprobante(comp_id, estado, sunat_response=None, cdr_response=None):
    """Actualizar el estado SUNAT de un comprobante"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE comprobantes 
                SET estado_sunat = %s,
                    sunat_response = %s,
                    cdr_response = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (estado, sunat_response, cdr_response, comp_id))
            
            return True
            
    except Exception as e:
        print(f"Error en actualizar_estado_sunat_comprobante: {e}")
        raise


def obtener_ultimo_numero_comprobante(serie):
    """Obtener el último número de comprobante para una serie"""
    try:
        rows = db_query("""
            SELECT COALESCE(MAX(numero), 0) as ultimo_numero
            FROM comprobantes 
            WHERE serie = %s
        """, (serie,))
        return rows[0]['ultimo_numero'] if rows else 0
    except Exception as e:
        print(f"Error en obtener_ultimo_numero_comprobante: {e}")
        return 0


def listar_comprobantes_api(filtros=None):
    """Listar comprobantes con filtros para la API"""
    try:
        query = """
            SELECT id, tipo_comprobante, serie, numero, cliente_nombre, 
                   cliente_numero_doc, fecha_emision, subtotal, igv, total, 
                   estado_sunat, created_at
            FROM comprobantes
            WHERE 1=1
        """
        params = []
        
        if filtros:
            if filtros.get('tipo'):
                query += " AND tipo_comprobante = %s"
                params.append(filtros['tipo'])
            
            if filtros.get('estado'):
                query += " AND estado_sunat = %s"
                params.append(filtros['estado'])
            
            if filtros.get('fecha_desde'):
                query += " AND fecha_emision >= %s"
                params.append(filtros['fecha_desde'])
            
            if filtros.get('fecha_hasta'):
                query += " AND fecha_emision <= %s"
                params.append(filtros['fecha_hasta'])
            
            if filtros.get('busqueda'):
                busqueda = f"%{filtros['busqueda']}%"
                query += " AND (cliente_nombre ILIKE %s OR CAST(numero AS TEXT) ILIKE %s)"
                params.extend([busqueda, busqueda])
        
        query += " ORDER BY created_at DESC"
        
        return db_query(query, params if params else None)
        
    except Exception as e:
        print(f"Error en listar_comprobantes_api: {e}")
        return []
    
# ==========================================
# COMPROBANTES DE COMPRA - FUNCIONES
# ==========================================

def obtener_comprobantes_compra():
    """Obtener todos los comprobantes de compra"""
    try:
        return db_query("""
            SELECT id, tipo_comprobante, serie, numero, 
                   proveedor_nombre, proveedor_numero_doc, fecha_emision, 
                   subtotal, igv, total, estado, created_at
            FROM comprobantes_compra
            ORDER BY created_at DESC
        """)
    except Exception as e:
        print(f"Error en obtener_comprobantes_compra: {e}")
        return []


def obtener_comprobante_compra_por_id(comp_id):
    """Obtener un comprobante de compra por ID"""
    try:
        rows = db_query("SELECT * FROM comprobantes_compra WHERE id = %s", (comp_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_comprobante_compra_por_id: {e}")
        return None


def insertar_comprobante_compra(data):
    """Insertar un nuevo comprobante de compra"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO comprobantes_compra (
                    tipo_comprobante, serie, numero, fecha_emision, moneda,
                    proveedor_tipo_doc, proveedor_numero_doc, proveedor_nombre, 
                    proveedor_direccion, proveedor_email, proveedor_telefono,
                    subtotal, igv, total, items_json, observaciones, 
                    estado, creado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('tipo_comprobante'),
                data.get('serie'),
                data.get('numero'),
                data.get('fecha_emision'),
                data.get('moneda', 'PEN'),
                data.get('proveedor_tipo_doc', 'RUC'),
                data.get('proveedor_numero_doc'),
                data.get('proveedor_nombre'),
                data.get('proveedor_direccion'),
                data.get('proveedor_email'),
                data.get('proveedor_telefono'),
                data.get('subtotal', 0),
                data.get('igv', 0),
                data.get('total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                data.get('estado', 'BORRADOR'),
                data.get('creado_por')
            ))
            
            result = cur.fetchone()
            return result['id'] if result else None
            
    except Exception as e:
        print(f"Error en insertar_comprobante_compra: {e}")
        raise


def actualizar_comprobante_compra(comp_id, data):
    """Actualizar un comprobante de compra existente"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE comprobantes_compra SET
                    fecha_emision = %s,
                    proveedor_tipo_doc = %s,
                    proveedor_numero_doc = %s,
                    proveedor_nombre = %s,
                    proveedor_direccion = %s,
                    proveedor_email = %s,
                    proveedor_telefono = %s,
                    subtotal = %s,
                    igv = %s,
                    total = %s,
                    items_json = %s,
                    observaciones = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                data.get('fecha_emision'),
                data.get('proveedor_tipo_doc', 'RUC'),
                data.get('proveedor_numero_doc'),
                data.get('proveedor_nombre'),
                data.get('proveedor_direccion'),
                data.get('proveedor_email'),
                data.get('proveedor_telefono'),
                data.get('subtotal', 0),
                data.get('igv', 0),
                data.get('total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                comp_id
            ))
            
            return True
            
    except Exception as e:
        print(f"Error en actualizar_comprobante_compra: {e}")
        raise


def eliminar_comprobante_compra_db(comp_id):
    """Eliminar un comprobante de compra"""
    try:
        db_execute("DELETE FROM comprobantes_compra WHERE id = %s", (comp_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_comprobante_compra_db: {e}")
        raise


def listar_comprobantes_compra_api(filtros=None):
    """Listar comprobantes de compra con filtros"""
    try:
        query = """
            SELECT id, tipo_comprobante, serie, numero, proveedor_nombre, 
                   proveedor_numero_doc, fecha_emision, subtotal, igv, total, 
                   estado, created_at
            FROM comprobantes_compra
            WHERE 1=1
        """
        params = []
        
        if filtros:
            if filtros.get('tipo'):
                query += " AND tipo_comprobante = %s"
                params.append(filtros['tipo'])
            
            if filtros.get('estado'):
                query += " AND estado = %s"
                params.append(filtros['estado'])
            
            if filtros.get('fecha_desde'):
                query += " AND fecha_emision >= %s"
                params.append(filtros['fecha_desde'])
            
            if filtros.get('fecha_hasta'):
                query += " AND fecha_emision <= %s"
                params.append(filtros['fecha_hasta'])
            
            if filtros.get('busqueda'):
                busqueda = f"%{filtros['busqueda']}%"
                query += " AND (proveedor_nombre ILIKE %s OR CAST(numero AS TEXT) ILIKE %s)"
                params.extend([busqueda, busqueda])
        
        query += " ORDER BY created_at DESC"
        
        return db_query(query, params if params else None)
        
    except Exception as e:
        print(f"Error en listar_comprobantes_compra_api: {e}")
        return []


def obtener_ultimo_numero_comprobante_compra(serie):
    """Obtener el último número de comprobante de compra para una serie"""
    try:
        rows = db_query("""
            SELECT COALESCE(MAX(numero), 0) as ultimo_numero
            FROM comprobantes_compra 
            WHERE serie = %s
        """, (serie,))
        return rows[0]['ultimo_numero'] if rows else 0
    except Exception as e:
        print(f"Error en obtener_ultimo_numero_comprobante_compra: {e}")
        return 0


# ==========================================
# GUÍAS DE REMISIÓN DE COMPRA - FUNCIONES
# ==========================================

def obtener_guias_compra():
    """Obtener todas las guías de remisión de compra"""
    try:
        return db_query("""
            SELECT id, serie, numero, proveedor_nombre, proveedor_ruc,
                   fecha_emision, fecha_traslado, placa_vehiculo,
                   peso_total, estado, created_at
            FROM guias_remision_compra
            ORDER BY created_at DESC
        """)
    except Exception as e:
        print(f"Error en obtener_guias_compra: {e}")
        return []


def obtener_guia_compra_por_id(guia_id):
    """Obtener una guía de remisión de compra por ID"""
    try:
        rows = db_query("SELECT * FROM guias_remision_compra WHERE id = %s", (guia_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"Error en obtener_guia_compra_por_id: {e}")
        return None


def insertar_guia_compra(data):
    """Insertar una nueva guía de remisión de compra"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO guias_remision_compra (
                    serie, numero, fecha_emision, fecha_traslado,
                    proveedor_ruc, proveedor_nombre, proveedor_direccion, proveedor_ubigeo,
                    ruc_remitente, remitente_nombre, remitente_direccion, remitente_ubigeo,
                    modalidad_transporte, placa_vehiculo, conductor_dni, conductor_nombre, licencia_conductor,
                    transportista_ruc, transportista_nombre,
                    motivo_traslado, factura_asociada, peso_total,
                    items_json, observaciones, estado, creado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('serie'),
                data.get('numero'),
                data.get('fecha_emision'),
                data.get('fecha_traslado'),
                data.get('proveedor_ruc'),
                data.get('proveedor_nombre'),
                data.get('proveedor_direccion'),
                data.get('proveedor_ubigeo'),
                data.get('ruc_remitente'),
                data.get('remitente_nombre'),
                data.get('remitente_direccion'),
                data.get('remitente_ubigeo'),
                data.get('modalidad_transporte', 'PRIVADO'),
                data.get('placa_vehiculo'),
                data.get('conductor_dni'),
                data.get('conductor_nombre'),
                data.get('licencia_conductor'),
                data.get('transportista_ruc'),
                data.get('transportista_nombre'),
                data.get('motivo_traslado', 'COMPRA'),
                data.get('factura_asociada'),
                data.get('peso_total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                data.get('estado', 'BORRADOR'),
                data.get('creado_por')
            ))
            
            result = cur.fetchone()
            return result['id'] if result else None
            
    except Exception as e:
        print(f"Error en insertar_guia_compra: {e}")
        raise


def actualizar_guia_compra(guia_id, data):
    """Actualizar una guía de remisión de compra existente"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE guias_remision_compra SET
                    fecha_emision = %s,
                    fecha_traslado = %s,
                    proveedor_ruc = %s,
                    proveedor_nombre = %s,
                    proveedor_direccion = %s,
                    proveedor_ubigeo = %s,
                    ruc_remitente = %s,
                    remitente_nombre = %s,
                    remitente_direccion = %s,
                    remitente_ubigeo = %s,
                    modalidad_transporte = %s,
                    placa_vehiculo = %s,
                    conductor_dni = %s,
                    conductor_nombre = %s,
                    licencia_conductor = %s,
                    transportista_ruc = %s,
                    transportista_nombre = %s,
                    motivo_traslado = %s,
                    factura_asociada = %s,
                    peso_total = %s,
                    items_json = %s,
                    observaciones = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                data.get('fecha_emision'),
                data.get('fecha_traslado'),
                data.get('proveedor_ruc'),
                data.get('proveedor_nombre'),
                data.get('proveedor_direccion'),
                data.get('proveedor_ubigeo'),
                data.get('ruc_remitente'),
                data.get('remitente_nombre'),
                data.get('remitente_direccion'),
                data.get('remitente_ubigeo'),
                data.get('modalidad_transporte', 'PRIVADO'),
                data.get('placa_vehiculo'),
                data.get('conductor_dni'),
                data.get('conductor_nombre'),
                data.get('licencia_conductor'),
                data.get('transportista_ruc'),
                data.get('transportista_nombre'),
                data.get('motivo_traslado', 'COMPRA'),
                data.get('factura_asociada'),
                data.get('peso_total', 0),
                data.get('items_json', '[]'),
                data.get('observaciones', ''),
                guia_id
            ))
            
            return True
            
    except Exception as e:
        print(f"Error en actualizar_guia_compra: {e}")
        raise


def eliminar_guia_compra_db(guia_id):
    """Eliminar una guía de remisión de compra"""
    try:
        db_execute("DELETE FROM guias_remision_compra WHERE id = %s", (guia_id,))
        return True
    except Exception as e:
        print(f"Error en eliminar_guia_compra_db: {e}")
        raise


def listar_guias_compra_api(filtros=None):
    """Listar guías de remisión de compra con filtros"""
    try:
        query = """
            SELECT id, serie, numero, proveedor_nombre, proveedor_ruc,
                   fecha_emision, fecha_traslado, placa_vehiculo,
                   peso_total, estado, created_at
            FROM guias_remision_compra
            WHERE 1=1
        """
        params = []
        
        if filtros:
            if filtros.get('estado'):
                query += " AND estado = %s"
                params.append(filtros['estado'])
            
            if filtros.get('fecha_desde'):
                query += " AND fecha_emision >= %s"
                params.append(filtros['fecha_desde'])
            
            if filtros.get('fecha_hasta'):
                query += " AND fecha_emision <= %s"
                params.append(filtros['fecha_hasta'])
            
            if filtros.get('busqueda'):
                busqueda = f"%{filtros['busqueda']}%"
                query += " AND (proveedor_nombre ILIKE %s OR CAST(numero AS TEXT) ILIKE %s)"
                params.extend([busqueda, busqueda])
        
        query += " ORDER BY created_at DESC"
        
        return db_query(query, params if params else None)
        
    except Exception as e:
        print(f"Error en listar_guias_compra_api: {e}")
        return []


def obtener_ultimo_numero_guia_compra(serie):
    """Obtener el último número de guía de compra para una serie"""
    try:
        rows = db_query("""
            SELECT COALESCE(MAX(numero), 0) as ultimo_numero
            FROM guias_remision_compra 
            WHERE serie = %s
        """, (serie,))
        return rows[0]['ultimo_numero'] if rows else 0
    except Exception as e:
        print(f"Error en obtener_ultimo_numero_guia_compra: {e}")
        return 0

# ==========================================
# TRANSPORTISTAS - FUNCIONES
# ==========================================

def obtener_transportistas(activo=True):
    """Obtener lista de transportistas/conductores"""
    try:
        query = """
            SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo
            FROM transportistas
            WHERE activo = TRUE
            ORDER BY nombre_completo
        """
        if not activo:
            query = """
                SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo
                FROM transportistas
                ORDER BY nombre_completo
            """
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_transportistas: {e}")
        return []

def obtener_transportista_por_id(transportista_id):
    """Obtener transportista por ID"""
    try:
        rows = db_query("""
            SELECT id, nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo
            FROM transportistas
            WHERE id = %s AND activo = TRUE
        """, (transportista_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"❌ Error en obtener_transportista_por_id: {e}")
        return None

def insertar_transportista(data):
    """Insertar nuevo transportista"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                INSERT INTO transportistas (nombre_completo, dni, placa, medidas, licencia, telefono, peso_carga, tipo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('nombre_completo'),
                data.get('dni'),
                data.get('placa'),
                data.get('medidas'),
                data.get('licencia'),
                data.get('telefono'),
                data.get('peso_carga'),
                data.get('tipo', 'conductor')
            ))
            result = cur.fetchone()
            return result['id'] if result else None
    except Exception as e:
        print(f"❌ Error en insertar_transportista: {e}")
        return None

def actualizar_transportista(transportista_id, data):
    """Actualizar transportista existente"""
    try:
        db_execute("""
            UPDATE transportistas 
            SET nombre_completo = %s,
                dni = %s,
                placa = %s,
                medidas = %s,
                licencia = %s,
                telefono = %s,
                peso_carga = %s,
                tipo = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('nombre_completo'),
            data.get('dni'),
            data.get('placa'),
            data.get('medidas'),
            data.get('licencia'),
            data.get('telefono'),
            data.get('peso_carga'),
            data.get('tipo', 'conductor'),
            transportista_id
        ))
        return True
    except Exception as e:
        print(f"❌ Error en actualizar_transportista: {e}")
        return False

def eliminar_transportista_db(transportista_id):
    """Eliminar transportista (borrado lógico)"""
    try:
        db_execute("UPDATE transportistas SET activo = FALSE WHERE id = %s", (transportista_id,))
        return True
    except Exception as e:
        print(f"❌ Error en eliminar_transportista_db: {e}")
        return False
# ==========================================
# ==========================================
# CONFIGURACIÓN Y SEGURIDAD - NUEVAS FUNCIONES
# ==========================================
# ==========================================

# ==========================================
# 1. EMPRESAS
# ==========================================

def obtener_empresas(activo=True):
    """Obtener todas las empresas con sus cuentas bancarias"""
    try:
        query = """
            SELECT 
                e.id,
                e.codigo,
                e.nombre_corto,
                e.nombre_comercial,
                e.razon_social,
                e.ruc,
                e.direccion_fiscal,
                e.telefono,
                e.correo_documentos,
                e.logo_url,
                e.color_primario,
                e.color_secundario,
                e.color_pastel,
                e.estado,
                e.created_at,
                e.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', cb.id,
                            'banco', cb.banco,
                            'tipo_cuenta', cb.tipo_cuenta,
                            'moneda', cb.moneda,
                            'numero_cuenta', cb.numero_cuenta,
                            'cci', cb.cci,
                            'es_principal', cb.es_principal,
                            'estado', cb.estado
                        )
                    )
                    FROM erp_empresa_cuentas_bancarias cb
                    WHERE cb.empresa_id = e.id
                    AND cb.estado = 'activo'
                ) as cuentas_bancarias
            FROM erp_empresas e
        """
        if activo:
            query += " WHERE e.estado = 'activo'"
        query += " ORDER BY e.codigo"
        
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_empresas: {e}")
        return []


def obtener_empresa_por_id(empresa_id):
    """Obtener una empresa por ID"""
    try:
        rows = db_query("""
            SELECT 
                e.id,
                e.codigo,
                e.nombre_corto,
                e.nombre_comercial,
                e.razon_social,
                e.ruc,
                e.direccion_fiscal,
                e.telefono,
                e.correo_documentos,
                e.logo_url,
                e.color_primario,
                e.color_secundario,
                e.color_pastel,
                e.estado,
                e.created_at,
                e.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', cb.id,
                            'banco', cb.banco,
                            'tipo_cuenta', cb.tipo_cuenta,
                            'moneda', cb.moneda,
                            'numero_cuenta', cb.numero_cuenta,
                            'cci', cb.cci,
                            'es_principal', cb.es_principal,
                            'estado', cb.estado
                        )
                    )
                    FROM erp_empresa_cuentas_bancarias cb
                    WHERE cb.empresa_id = e.id
                    AND cb.estado = 'activo'
                ) as cuentas_bancarias
            FROM erp_empresas e
            WHERE e.id = %s AND e.estado = 'activo'
        """, (empresa_id,))
        
        return rows[0] if rows else None
    except Exception as e:
        print(f"❌ Error en obtener_empresa_por_id: {e}")
        return None


def crear_empresa(data):
    """Crear una nueva empresa"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO erp_empresas (
                    codigo, nombre_corto, nombre_comercial, razon_social,
                    ruc, direccion_fiscal, telefono, correo_documentos,
                    logo_url, color_primario, color_secundario, color_pastel,
                    estado
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('codigo'),
                data.get('nombre_corto'),
                data.get('nombre_comercial'),
                data.get('razon_social'),
                data.get('ruc'),
                data.get('direccion_fiscal', ''),
                data.get('telefono', ''),
                data.get('correo_documentos', ''),
                data.get('logo_url', ''),
                data.get('color_primario', '#EF233C'),
                data.get('color_secundario', '#1F1F1F'),
                data.get('color_pastel', '#FFECEF'),
                data.get('estado', 'activo')
            ))
            
            empresa_id = cur.fetchone()['id']
            
            # Insertar cuentas bancarias
            cuentas = data.get('cuentas_bancarias', [])
            for cuenta in cuentas:
                if cuenta.get('banco'):
                    cur.execute("""
                        INSERT INTO erp_empresa_cuentas_bancarias (
                            empresa_id, banco, tipo_cuenta, moneda,
                            numero_cuenta, cci, es_principal, estado
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        empresa_id,
                        cuenta.get('banco'),
                        cuenta.get('tipo_cuenta'),
                        cuenta.get('moneda', 'PEN'),
                        cuenta.get('numero_cuenta'),
                        cuenta.get('cci'),
                        cuenta.get('es_principal', False),
                        cuenta.get('estado', 'activo')
                    ))
            
            return empresa_id
    except Exception as e:
        print(f"❌ Error en crear_empresa: {e}")
        raise


def actualizar_empresa(empresa_id, data):
    """Actualizar una empresa existente"""
    try:
        db_execute("""
            UPDATE erp_empresas SET
                codigo = %s,
                nombre_corto = %s,
                nombre_comercial = %s,
                razon_social = %s,
                ruc = %s,
                direccion_fiscal = %s,
                telefono = %s,
                correo_documentos = %s,
                logo_url = %s,
                color_primario = %s,
                color_secundario = %s,
                color_pastel = %s,
                estado = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('codigo'),
            data.get('nombre_corto'),
            data.get('nombre_comercial'),
            data.get('razon_social'),
            data.get('ruc'),
            data.get('direccion_fiscal', ''),
            data.get('telefono', ''),
            data.get('correo_documentos', ''),
            data.get('logo_url', ''),
            data.get('color_primario', '#EF233C'),
            data.get('color_secundario', '#1F1F1F'),
            data.get('color_pastel', '#FFECEF'),
            data.get('estado', 'activo'),
            empresa_id
        ))
        return True
    except Exception as e:
        print(f"❌ Error en actualizar_empresa: {e}")
        raise


def eliminar_empresa_db(empresa_id):
    """Eliminar empresa (borrado lógico)"""
    try:
        db_execute("""
            UPDATE erp_empresas SET estado = 'inactivo', updated_at = NOW()
            WHERE id = %s
        """, (empresa_id,))
        return True
    except Exception as e:
        print(f"❌ Error en eliminar_empresa_db: {e}")
        raise


# ==========================================
# 2. USUARIOS Y PERMISOS
# ==========================================

def obtener_usuarios(activo=True):
    """Obtener todos los usuarios con sus empresas y roles"""
    try:
        query = """
            SELECT 
                u.id,
                u.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                u.area,
                u.correo,
                u.celular,
                u.estado,
                u.created_at,
                u.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', ue.id,
                            'empresa_id', ue.empresa_id,
                            'empresa_codigo', e.codigo,
                            'empresa_nombre', e.nombre_comercial,
                            'es_principal', ue.es_empresa_principal,
                            'estado', ue.estado,
                            'rol_id', ue.rol_id,
                            'rol_codigo', r.codigo,
                            'rol_nombre', r.nombre,
                            'rol_es_admin', r.es_admin
                        )
                    )
                    FROM erp_usuario_empresas ue
                    LEFT JOIN erp_empresas e ON e.id = ue.empresa_id
                    LEFT JOIN erp_roles r ON r.id = ue.rol_id
                    WHERE ue.auth_user_id = u.auth_user_id
                    AND ue.estado = 'activo'
                ) as empresas_acceso
            FROM usuarios u
        """
        if activo:
            query += " WHERE u.estado = 'activo'"
        query += " ORDER BY u.usuario_sistema"
        
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_usuarios: {e}")
        return []


def obtener_usuario_por_id(usuario_id):
    """Obtener un usuario por ID"""
    try:
        rows = db_query("""
            SELECT 
                u.id,
                u.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                u.area,
                u.correo,
                u.celular,
                u.estado,
                u.created_at,
                u.updated_at
            FROM usuarios u
            WHERE u.id = %s AND u.estado = 'activo'
        """, (usuario_id,))
        return rows[0] if rows else None
    except Exception as e:
        print(f"❌ Error en obtener_usuario_por_id: {e}")
        return None


def crear_usuario(data):
    """Crear un nuevo usuario"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO usuarios (
                    auth_user_id, usuario_sistema, nombres_apellidos,
                    area, correo, celular, estado
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('auth_user_id'),
                data.get('usuario_sistema'),
                data.get('nombres_apellidos'),
                data.get('area'),
                data.get('correo'),
                data.get('celular'),
                data.get('estado', 'activo')
            ))
            
            usuario_id = cur.fetchone()['id']
            
            # Asignar empresas y roles
            empresas_acceso = data.get('empresas_acceso', [])
            for acceso in empresas_acceso:
                if acceso.get('empresa_id') and acceso.get('rol_id'):
                    cur.execute("""
                        INSERT INTO erp_usuario_empresas (
                            auth_user_id, empresa_id, rol_id,
                            es_empresa_principal, estado
                        ) VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (auth_user_id, empresa_id) 
                        DO UPDATE SET rol_id = EXCLUDED.rol_id, estado = EXCLUDED.estado
                    """, (
                        data.get('auth_user_id'),
                        acceso.get('empresa_id'),
                        acceso.get('rol_id'),
                        acceso.get('es_empresa_principal', False),
                        acceso.get('estado', 'activo')
                    ))
            
            return usuario_id
    except Exception as e:
        print(f"❌ Error en crear_usuario: {e}")
        raise


def actualizar_usuario(usuario_id, data):
    """Actualizar un usuario existente"""
    try:
        db_execute("""
            UPDATE usuarios SET
                usuario_sistema = %s,
                nombres_apellidos = %s,
                area = %s,
                correo = %s,
                celular = %s,
                estado = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('usuario_sistema'),
            data.get('nombres_apellidos'),
            data.get('area'),
            data.get('correo'),
            data.get('celular'),
            data.get('estado', 'activo'),
            usuario_id
        ))
        return True
    except Exception as e:
        print(f"❌ Error en actualizar_usuario: {e}")
        raise


def eliminar_usuario_db(usuario_id):
    """Eliminar usuario (borrado lógico)"""
    try:
        db_execute("""
            UPDATE usuarios SET estado = 'inactivo', updated_at = NOW()
            WHERE id = %s
        """, (usuario_id,))
        return True
    except Exception as e:
        print(f"❌ Error en eliminar_usuario_db: {e}")
        raise


def obtener_roles():
    """Obtener todos los roles activos"""
    try:
        return db_query("""
            SELECT 
                id,
                codigo,
                nombre,
                descripcion,
                es_admin,
                estado,
                created_at,
                updated_at
            FROM erp_roles
            WHERE estado = 'activo'
            ORDER BY nombre
        """)
    except Exception as e:
        print(f"❌ Error en obtener_roles: {e}")
        return []


# ==========================================
# 3. CORRELATIVOS
# ==========================================

def obtener_correlativos(activo=True):
    """Obtener todos los correlativos"""
    try:
        query = """
            SELECT 
                c.id,
                c.empresa_id,
                e.codigo as empresa_codigo,
                e.nombre_comercial as empresa_nombre,
                c.documento,
                c.codigo_documento,
                c.prefijo,
                c.anio,
                c.ultimo_numero,
                c.estado,
                c.created_at,
                c.updated_at,
                (c.prefijo || '-' || c.anio::text || '-' || LPAD((c.ultimo_numero + 1)::text, 4, '0')) as siguiente_codigo
            FROM erp_correlativos c
            JOIN erp_empresas e ON e.id = c.empresa_id
        """
        if activo:
            query += " WHERE c.estado = 'activo'"
        query += " ORDER BY e.codigo, c.documento"
        
        return db_query(query)
    except Exception as e:
        print(f"❌ Error en obtener_correlativos: {e}")
        return []


def crear_correlativo(data):
    """Crear un nuevo correlativo"""
    try:
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO erp_correlativos (
                    empresa_id, documento, codigo_documento,
                    prefijo, anio, ultimo_numero, estado
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('empresa_id'),
                data.get('documento'),
                data.get('codigo_documento'),
                data.get('prefijo'),
                data.get('anio', datetime.now().year),
                data.get('ultimo_numero', 0),
                data.get('estado', 'activo')
            ))
            
            return cur.fetchone()['id']
    except Exception as e:
        print(f"❌ Error en crear_correlativo: {e}")
        raise


def actualizar_correlativo(correlativo_id, data):
    """Actualizar un correlativo existente"""
    try:
        db_execute("""
            UPDATE erp_correlativos SET
                documento = %s,
                codigo_documento = %s,
                prefijo = %s,
                anio = %s,
                ultimo_numero = %s,
                estado = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('documento'),
            data.get('codigo_documento'),
            data.get('prefijo'),
            data.get('anio'),
            data.get('ultimo_numero'),
            data.get('estado', 'activo'),
            correlativo_id
        ))
        return True
    except Exception as e:
        print(f"❌ Error en actualizar_correlativo: {e}")
        raise


def eliminar_correlativo_db(correlativo_id):
    """Eliminar correlativo (borrado lógico)"""
    try:
        db_execute("""
            UPDATE erp_correlativos SET estado = 'inactivo', updated_at = NOW()
            WHERE id = %s
        """, (correlativo_id,))
        return True
    except Exception as e:
        print(f"❌ Error en eliminar_correlativo_db: {e}")
        raise


def tomar_correlativo(empresa_codigo, documento, anio=None):
    """Tomar un correlativo (incrementar y devolver el siguiente número)"""
    try:
        if anio is None:
            anio = datetime.now().year
        
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT erp_tomar_correlativo(%s, %s, %s) as codigo
            """, (empresa_codigo, documento, anio))
            
            resultado = cur.fetchone()
            return resultado[0] if resultado else None
    except Exception as e:
        print(f"❌ Error en tomar_correlativo: {e}")
        raise


# ==========================================
# 4. PARÁMETROS
# ==========================================

def obtener_parametros(empresa_id=None, activo=True):
    """Obtener parámetros generales"""
    try:
        query = """
            SELECT 
                id,
                empresa_id,
                grupo,
                codigo,
                nombre,
                valor_bool,
                valor_text,
                valor_num,
                regla,
                es_critico,
                estado,
                created_at,
                updated_at
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
        print(f"❌ Error en obtener_parametros: {e}")
        return []


def guardar_parametro(data):
    """Guardar o actualizar un parámetro"""
    try:
        db_execute("""
            INSERT INTO erp_parametros (
                empresa_id, grupo, codigo, nombre,
                valor_bool, valor_text, valor_num, regla,
                es_critico, estado
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (empresa_id, codigo) DO UPDATE SET
                valor_bool = EXCLUDED.valor_bool,
                valor_text = EXCLUDED.valor_text,
                valor_num = EXCLUDED.valor_num,
                regla = EXCLUDED.regla,
                es_critico = EXCLUDED.es_critico,
                updated_at = NOW()
        """, (
            data.get('empresa_id'),
            data.get('grupo'),
            data.get('codigo'),
            data.get('nombre'),
            data.get('valor_bool'),
            data.get('valor_text'),
            data.get('valor_num'),
            data.get('regla'),
            data.get('es_critico', False),
            data.get('estado', 'activo')
        ))
        return True
    except Exception as e:
        print(f"❌ Error en guardar_parametro: {e}")
        raise


# ==========================================
# 5. MÓDULOS Y SUBMÓDULOS
# ==========================================

def obtener_modulos():
    """Obtener todos los módulos con sus submódulos"""
    try:
        return db_query("""
            SELECT 
                m.id,
                m.orden,
                m.codigo,
                m.nombre,
                m.descripcion,
                m.estado,
                m.created_at,
                m.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', s.id,
                            'orden', s.orden,
                            'codigo', s.codigo,
                            'nombre', s.nombre,
                            'descripcion', s.descripcion,
                            'estado', s.estado
                        ) ORDER BY s.orden
                    )
                    FROM erp_submodulos s
                    WHERE s.modulo_id = m.id
                    AND s.estado = 'activo'
                ) as submodulos
            FROM erp_modulos m
            WHERE m.estado = 'activo'
            ORDER BY m.orden
        """)
    except Exception as e:
        print(f"❌ Error en obtener_modulos: {e}")
        return []


# ==========================================
# 6. PERMISOS DE USUARIO
# ==========================================

def obtener_permisos_usuario(auth_user_id, empresa_id):
    """Obtener permisos de un usuario en una empresa"""
    try:
        return db_query("""
            SELECT 
                up.id,
                up.auth_user_id,
                up.empresa_id,
                up.submodulo_id,
                s.codigo as submodulo_codigo,
                s.nombre as submodulo_nombre,
                m.codigo as modulo_codigo,
                m.nombre as modulo_nombre,
                up.puede_ver,
                up.puede_crear,
                up.puede_editar,
                up.puede_aprobar,
                up.puede_anular,
                up.puede_eliminar,
                up.puede_exportar,
                up.puede_subir_evidencia,
                up.observacion,
                up.created_at,
                up.updated_at
            FROM erp_usuario_permisos up
            JOIN erp_submodulos s ON s.id = up.submodulo_id
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE up.auth_user_id = %s
            AND up.empresa_id = %s
            ORDER BY m.orden, s.orden
        """, (auth_user_id, empresa_id))
    except Exception as e:
        print(f"❌ Error en obtener_permisos_usuario: {e}")
        return []


def guardar_permisos_usuario(auth_user_id, empresa_id, permisos):
    """Guardar permisos de un usuario en una empresa"""
    try:
        with db_tx() as conn:
            cur = conn.cursor()
            
            for permiso in permisos:
                submodulo_id = permiso.get('submodulo_id')
                if not submodulo_id:
                    continue
                
                cur.execute("""
                    INSERT INTO erp_usuario_permisos (
                        auth_user_id, empresa_id, submodulo_id,
                        puede_ver, puede_crear, puede_editar,
                        puede_aprobar, puede_anular, puede_eliminar,
                        puede_exportar, puede_subir_evidencia,
                        observacion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                """, (
                    auth_user_id,
                    empresa_id,
                    submodulo_id,
                    permiso.get('puede_ver', False),
                    permiso.get('puede_crear', False),
                    permiso.get('puede_editar', False),
                    permiso.get('puede_aprobar', False),
                    permiso.get('puede_anular', False),
                    permiso.get('puede_eliminar', False),
                    permiso.get('puede_exportar', False),
                    permiso.get('puede_subir_evidencia', False),
                    permiso.get('observacion', '')
                ))
        
        return True
    except Exception as e:
        print(f"❌ Error en guardar_permisos_usuario: {e}")
        raise


# ==========================================
# 7. AUDITORÍA
# ==========================================

def obtener_auditoria(empresa_id=None, tabla=None, accion=None, limit=100, offset=0):
    """Obtener registros de auditoría"""
    try:
        query = """
            SELECT 
                a.id,
                a.empresa_id,
                e.codigo as empresa_codigo,
                a.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                a.tabla,
                a.registro_id,
                a.accion,
                a.data_anterior,
                a.data_nueva,
                a.created_at
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
        print(f"❌ Error en obtener_auditoria: {e}")
        return []


def registrar_auditoria(empresa_id, auth_user_id, tabla, registro_id, accion, data_anterior=None, data_nueva=None):
    """Registrar un evento de auditoría"""
    try:
        db_execute("""
            INSERT INTO erp_auditoria (
                empresa_id, auth_user_id, tabla, registro_id,
                accion, data_anterior, data_nueva
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            empresa_id,
            auth_user_id,
            tabla,
            registro_id,
            accion,
            json.dumps(data_anterior) if data_anterior else None,
            json.dumps(data_nueva) if data_nueva else None
        ))
        return True
    except Exception as e:
        print(f"❌ Error en registrar_auditoria: {e}")
        # No lanzar excepción para no interrumpir la operación principal
        return False
def verificar_columnas_productos():
    """Verificar y agregar columnas faltantes en la tabla productos"""
    try:
        # Obtener columnas existentes
        columnas = db_query("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'productos'
        """)
        columnas_existentes = [c['column_name'] for c in columnas]
        
        # Columnas que deben existir
        columnas_necesarias = {
            'origen': 'VARCHAR(100)',
            'tiempo_entrega': 'VARCHAR(50)',
            'abastecimiento': 'VARCHAR(100)',
            'categoria_derivada': 'VARCHAR(100)',
            'presentacion_proveedor': 'VARCHAR(100)',
            'presentacion_venta': 'VARCHAR(100)',
            'venta_minima': 'INTEGER DEFAULT 1',
            'codigo_barras': 'VARCHAR(50)',
            'stock_minimo': 'INTEGER DEFAULT 0',
            'volumen': 'DECIMAL(10,3) DEFAULT 0'
        }
        
        for col, tipo in columnas_necesarias.items():
            if col not in columnas_existentes:
                try:
                    db_execute(f"ALTER TABLE productos ADD COLUMN {col} {tipo}")
                    print(f"✅ Columna '{col}' agregada a productos")
                except Exception as e:
                    print(f"⚠️ No se pudo agregar columna {col}: {e}")
        
        print("✅ Verificación de columnas completada")
        
    except Exception as e:
        print(f"❌ Error en verificar_columnas_productos: {e}")