# routes/productos.py
from flask import Blueprint, render_template, request, jsonify, session
from utils import login_required
from database import db_query, db_execute, db_tx
from psycopg2.extras import RealDictCursor
from datetime import datetime

# ============================================================
# BLUEPRINT - CON url_prefix
# ============================================================
productos_bp = Blueprint('productos', __name__, url_prefix='/productos')

# ============================================================
# FUNCIONES DE UTILIDAD
# ============================================================

def safe_float(value, default=0):
    """Convierte a float de forma segura"""
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def safe_int(value, default=0):
    """Convierte a int de forma segura"""
    if value is None or value == '':
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def obtener_ultimo_codigo_producto():
    """Obtiene el último código de producto para generar el siguiente"""
    try:
        # Buscar el último código que comience con PRD-
        result = db_query("""
            SELECT codigo FROM productos 
            WHERE codigo LIKE 'PRD-%'
            ORDER BY id DESC LIMIT 1
        """)
        
        if result and len(result) > 0 and result[0].get('codigo'):
            codigo = result[0]['codigo']
            print(f"📝 Último código encontrado: {codigo}")
            # Extraer el número del código (ej: PRD-0001 -> 1, PRD-0024 -> 24)
            partes = codigo.split('-')
            if len(partes) >= 2:
                try:
                    # Tomar la última parte y convertir a número
                    num_str = partes[-1]
                    # Si tiene ceros a la izquierda, convertirlos a número
                    ultimo_num = int(num_str)
                    nuevo_num = ultimo_num + 1
                    # Formatear con ceros a la izquierda (4 dígitos)
                    nuevo_codigo = f"PRD-{str(nuevo_num).zfill(4)}"
                    print(f"✅ Nuevo código generado: {nuevo_codigo}")
                    return nuevo_codigo
                except ValueError as e:
                    print(f"⚠️ Error parseando número del código {codigo}: {e}")
                    pass
        
        # Si no hay productos con PRD-, usar el mayor ID numérico
        print("📝 No se encontraron códigos PRD-, buscando por ID...")
        result = db_query("""
            SELECT codigo FROM productos 
            ORDER BY id DESC LIMIT 1
        """)
        
        if result and len(result) > 0 and result[0].get('codigo'):
            codigo = result[0]['codigo']
            print(f"📝 Último código por ID: {codigo}")
            # Intentar extraer un número del código
            import re
            numeros = re.findall(r'\d+', codigo)
            if numeros:
                try:
                    ultimo_num = int(numeros[-1])
                    nuevo_num = ultimo_num + 1
                    nuevo_codigo = f"PRD-{str(nuevo_num).zfill(4)}"
                    print(f"✅ Nuevo código generado desde números: {nuevo_codigo}")
                    return nuevo_codigo
                except:
                    pass
        
        # Si todo falla, PRD-0001
        print("⚠️ Usando PRD-0001 como fallback")
        return "PRD-0001"
        
    except Exception as e:
        print(f"❌ Error generando código: {e}")
        import traceback
        traceback.print_exc()
        return "PRD-0001"

# ============================================================
# RUTAS PARA PÁGINAS HTML
# ============================================================

@productos_bp.route('/')
@login_required
def productos():
    """Página principal de productos - Redirige a nuevo producto"""
    return render_template('productos.html', active_tab='nuevo')

@productos_bp.route('/nuevo')
@login_required
def productos_nuevo():
    """Página de nuevo producto con código automático"""
    codigo_auto = obtener_ultimo_codigo_producto()
    return render_template('productos.html', active_tab='nuevo', codigo_auto=codigo_auto)

@productos_bp.route('/base-datos')
@login_required
def productos_base_datos():
    """Página de base de datos de productos"""
    return render_template('productos.html', active_tab='base-datos')

@productos_bp.route('/comparativo')
@login_required
def productos_comparativo():
    """Página de comparativo de costos"""
    return render_template('productos.html', active_tab='comparativo')

# ============================================================
# ENDPOINTS API PARA PRODUCTOS
# ============================================================

@productos_bp.route('/api/productos', methods=['GET'])
@login_required
def get_productos():
    """Obtener todos los productos con filtros opcionales"""
    try:
        busqueda = request.args.get('q', '').strip()
        categoria = request.args.get('categoria', '').strip()
        marca = request.args.get('marca', '').strip()
        modelo = request.args.get('modelo', '').strip()
        
        query = """
            SELECT 
                id, codigo, descripcion, descripcion_larga,
                modelo, marca, familia as categoria,
                categoria_derivada as subcategoria,
                unidad, peso, volumen, observaciones, transporte,
                costo_unitario, precio_unitario, stock, stock_minimo,
                estado, presentacion_proveedor, presentacion_venta,
                venta_minima, codigo_barras, origen, tiempo_entrega,
                abastecimiento, activo, fecha_creacion, updated_at
            FROM productos
            WHERE activo = TRUE
        """
        params = []
        condiciones = []
        
        if busqueda:
            condiciones.append("(codigo ILIKE %s OR descripcion ILIKE %s OR modelo ILIKE %s OR marca ILIKE %s)")
            params.extend([f'%{busqueda}%'] * 4)
        if categoria:
            condiciones.append("familia = %s")
            params.append(categoria)
        if marca:
            condiciones.append("marca = %s")
            params.append(marca)
        if modelo:
            condiciones.append("modelo = %s")
            params.append(modelo)
        
        if condiciones:
            query += " AND " + " AND ".join(condiciones)
        
        query += " ORDER BY fecha_creacion DESC"
        
        productos = db_query(query, params)
        
        return jsonify({
            'success': True,
            'data': productos,
            'total': len(productos)
        })
        
    except Exception as e:
        print(f"❌ Error en get_productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/<int:producto_id>', methods=['GET'])
@login_required
def get_producto(producto_id):
    """Obtener un producto específico"""
    try:
        producto = db_query("""
            SELECT 
                id, codigo, descripcion, descripcion_larga,
                modelo, marca, familia as categoria,
                categoria_derivada as subcategoria,
                unidad, peso, volumen, observaciones, transporte,
                costo_unitario, precio_unitario, stock, stock_minimo,
                estado, presentacion_proveedor, presentacion_venta,
                venta_minima, codigo_barras, origen, tiempo_entrega,
                abastecimiento, activo, fecha_creacion, updated_at
            FROM productos
            WHERE id = %s AND activo = TRUE
        """, (producto_id,))
        
        if not producto:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'data': producto[0]
        })
        
    except Exception as e:
        print(f"❌ Error en get_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos', methods=['POST'])
@login_required
def create_producto():
    """Crear un nuevo producto"""
    try:
        print("📥 Recibiendo solicitud POST /api/productos")
        
        # Obtener datos
        if request.content_type and 'application/json' in request.content_type:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            foto = request.files.get('foto')
            if foto and foto.filename:
                data['foto'] = foto.filename
        
        print(f"📦 Datos recibidos: {data}")
        
        # Validar campos requeridos
        required_fields = ['codigo', 'descripcion', 'modelo', 'marca', 'familia', 'unidad', 'transporte']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False, 
                    'error': f'El campo "{field}" es requerido'
                }), 400
        
        # Insertar producto usando las funciones seguras
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
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
            """, (
                data.get('codigo'),
                data.get('descripcion'),
                data.get('descripcion_larga', ''),
                data.get('modelo'),
                data.get('marca'),
                data.get('familia'),
                data.get('categoria_derivada', '') or data.get('subcategoria', ''),
                data.get('unidad'),
                safe_float(data.get('peso')),
                safe_float(data.get('volumen')),
                data.get('observaciones', ''),
                data.get('transporte'),
                safe_float(data.get('costo_unitario')),
                safe_float(data.get('precio_unitario')),
                safe_int(data.get('stock')),
                safe_int(data.get('stock_minimo')),
                data.get('estado', 'activo'),
                data.get('presentacion_proveedor', ''),
                data.get('presentacion_venta', ''),
                safe_int(data.get('venta_minima'), 1),
                data.get('codigo_barras', ''),
                data.get('origen', ''),
                data.get('tiempo_entrega', ''),
                data.get('abastecimiento', '')
            ))
            
            resultado = cur.fetchone()
            print(f"✅ Producto insertado: ID={resultado['id']}, Código={resultado['codigo']}")
            
            return jsonify({
                'success': True,
                'data': {
                    'id': resultado['id'],
                    'codigo': resultado['codigo']
                },
                'message': f'Producto creado exitosamente con código {resultado["codigo"]}'
            })
            
    except Exception as e:
        print(f"❌ Error en create_producto: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/<int:producto_id>', methods=['PUT'])
@login_required
def update_producto(producto_id):
    """Actualizar un producto existente"""
    try:
        data = request.get_json()
        
        existente = db_query("SELECT id FROM productos WHERE id = %s AND activo = TRUE", (producto_id,))
        if not existente:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        
        db_execute("""
            UPDATE productos SET
                codigo = %s, descripcion = %s, descripcion_larga = %s,
                modelo = %s, marca = %s, familia = %s, categoria_derivada = %s,
                unidad = %s, peso = %s, volumen = %s,
                observaciones = %s, transporte = %s,
                costo_unitario = %s, precio_unitario = %s,
                stock = %s, stock_minimo = %s,
                estado = %s,
                presentacion_proveedor = %s, presentacion_venta = %s,
                venta_minima = %s, codigo_barras = %s,
                origen = %s, tiempo_entrega = %s, abastecimiento = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            data.get('codigo'),
            data.get('descripcion'),
            data.get('descripcion_larga', ''),
            data.get('modelo'),
            data.get('marca'),
            data.get('familia'),
            data.get('categoria_derivada', '') or data.get('subcategoria', ''),
            data.get('unidad'),
            safe_float(data.get('peso')),
            safe_float(data.get('volumen')),
            data.get('observaciones', ''),
            data.get('transporte'),
            safe_float(data.get('costo_unitario')),
            safe_float(data.get('precio_unitario')),
            safe_int(data.get('stock')),
            safe_int(data.get('stock_minimo')),
            data.get('estado', 'activo'),
            data.get('presentacion_proveedor', ''),
            data.get('presentacion_venta', ''),
            safe_int(data.get('venta_minima'), 1),
            data.get('codigo_barras', ''),
            data.get('origen', ''),
            data.get('tiempo_entrega', ''),
            data.get('abastecimiento', ''),
            producto_id
        ))
        
        return jsonify({
            'success': True,
            'message': 'Producto actualizado exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error en update_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/<int:producto_id>', methods=['DELETE'])
@login_required
def delete_producto(producto_id):
    """Eliminar producto (borrado lógico)"""
    try:
        existente = db_query("SELECT id FROM productos WHERE id = %s AND activo = TRUE", (producto_id,))
        if not existente:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        
        db_execute("""
            UPDATE productos SET activo = FALSE, updated_at = NOW()
            WHERE id = %s
        """, (producto_id,))
        
        return jsonify({
            'success': True,
            'message': 'Producto desactivado exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error en delete_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/buscar', methods=['GET'])
@login_required
def buscar_productos():
    """Buscar productos por código o descripción"""
    try:
        q = request.args.get('q', '').strip()
        if not q or len(q) < 2:
            return jsonify({'success': True, 'data': []})
        
        productos = db_query("""
            SELECT id, codigo, descripcion, modelo, marca, precio_unitario, stock, unidad
            FROM productos
            WHERE activo = TRUE
            AND (codigo ILIKE %s OR descripcion ILIKE %s OR modelo ILIKE %s OR marca ILIKE %s)
            ORDER BY codigo
            LIMIT 20
        """, (f'%{q}%', f'%{q}%', f'%{q}%', f'%{q}%'))
        
        return jsonify({
            'success': True,
            'data': productos
        })
        
    except Exception as e:
        print(f"❌ Error en buscar_productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/filtros', methods=['GET'])
@login_required
def get_filtros_productos():
    """Obtener opciones de filtros para productos"""
    try:
        categorias = db_query("""
            SELECT DISTINCT familia as categoria
            FROM productos WHERE activo = TRUE AND familia IS NOT NULL AND familia != ''
            ORDER BY familia
        """)
        
        marcas = db_query("""
            SELECT DISTINCT marca
            FROM productos WHERE activo = TRUE AND marca IS NOT NULL AND marca != ''
            ORDER BY marca
        """)
        
        modelos = db_query("""
            SELECT DISTINCT modelo
            FROM productos WHERE activo = TRUE AND modelo IS NOT NULL AND modelo != ''
            ORDER BY modelo
        """)
        
        return jsonify({
            'success': True,
            'data': {
                'categorias': [c['categoria'] for c in categorias] if categorias else [],
                'marcas': [m['marca'] for m in marcas] if marcas else [],
                'modelos': [m['modelo'] for m in modelos] if modelos else []
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_filtros_productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/ultimo-codigo', methods=['GET'])
@login_required
def get_ultimo_codigo():
    """Obtener el último código de producto generado"""
    try:
        codigo = obtener_ultimo_codigo_producto()
        return jsonify({
            'success': True,
            'data': {'codigo': codigo}
        })
    except Exception as e:
        print(f"❌ Error en get_ultimo_codigo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/editar/<int:producto_id>')
@login_required
def productos_editar(producto_id):
    """Página de edición de producto"""
    try:
        # Obtener el producto
        producto = db_query("""
            SELECT 
                id, codigo, descripcion, descripcion_larga,
                modelo, marca, familia, categoria_derivada,
                unidad, peso, volumen, observaciones, transporte,
                costo_unitario, precio_unitario, stock, stock_minimo,
                estado, presentacion_proveedor, presentacion_venta,
                venta_minima, codigo_barras, origen, tiempo_entrega,
                abastecimiento, activo
            FROM productos
            WHERE id = %s AND activo = TRUE
        """, (producto_id,))
        
        if not producto:
            flash('Producto no encontrado', 'error')
            return redirect(url_for('productos.productos_base_datos'))
        
        # Renderizar la página de edición
        return render_template('productos.html', 
                              active_tab='nuevo', 
                              producto=producto[0],
                              editando=True)
    except Exception as e:
        print(f"❌ Error en productos_editar: {e}")
        flash('Error al cargar el producto', 'error')
        return redirect(url_for('productos.productos_base_datos'))