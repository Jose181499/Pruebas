# routes/productos.py
from flask import Blueprint, render_template, request, jsonify
from utils import login_required  # ✅ Cambiado de 'main' a 'utils'
from database import db_query, db_execute, db_tx
from psycopg2.extras import RealDictCursor

# ============================================================
# BLUEPRINT - CON url_prefix
# ============================================================
productos_bp = Blueprint('productos', __name__, url_prefix='/productos')

# ============================================================
# RUTAS PARA PÁGINAS HTML - SIN /productos (ya está en el prefijo)
# ============================================================

@productos_bp.route('/')  # ✅ Esto maneja /productos
@login_required
def productos():
    """Página principal de productos - Redirige a nuevo producto"""
    return render_template('productos.html', active_tab='nuevo')

@productos_bp.route('/nuevo')  # ✅ Esto maneja /productos/nuevo
@login_required
def productos_nuevo():
    """Página de nuevo producto"""
    return render_template('productos.html', active_tab='nuevo')

@productos_bp.route('/base-datos')  # ✅ Esto maneja /productos/base-datos
@login_required
def productos_base_datos():
    """Página de base de datos de productos"""
    return render_template('productos.html', active_tab='base-datos')

@productos_bp.route('/comparativo')  # ✅ Esto maneja /productos/comparativo
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
    """Obtener todos los productos"""
    try:
        productos = db_query("""
            SELECT 
                id,
                codigo,
                descripcion,
                modelo,
                marca,
                familia as categoria,
                subcategoria,
                peso,
                transporte,
                costo_unitario,
                precio_unitario,
                observaciones,
                estado,
                presentacion_proveedor,
                presentacion_venta,
                venta_minima,
                codigo_barras,
                volumen,
                origen,
                tiempo_entrega,
                abastecimiento,
                stock_minimo,
                descripcion_larga,
                activo,
                fecha_creacion
            FROM productos
            WHERE activo = TRUE
            ORDER BY codigo
        """)
        
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
                id,
                codigo,
                descripcion,
                descripcion_larga,
                modelo,
                marca,
                familia as categoria,
                subcategoria,
                unidad,
                peso,
                volumen,
                observaciones,
                transporte,
                costo_unitario,
                precio_unitario,
                stock,
                stock_minimo,
                estado,
                presentacion_proveedor,
                presentacion_venta,
                venta_minima,
                codigo_barras,
                origen,
                tiempo_entrega,
                abastecimiento,
                activo,
                fecha_creacion
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
        data = request.get_json()
        
        # Validar campos requeridos
        required = ['codigo', 'descripcion', 'modelo', 'marca', 'familia', 'unidad', 'transporte']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'Campo {field} es requerido'}), 400
        
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO productos (
                    codigo, descripcion, descripcion_larga,
                    modelo, marca, familia, subcategoria,
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
                RETURNING id
            """, (
                data.get('codigo'),
                data.get('descripcion'),
                data.get('descripcion_larga', ''),
                data.get('modelo'),
                data.get('marca'),
                data.get('familia'),
                data.get('subcategoria', ''),
                data.get('unidad'),
                data.get('peso', 0),
                data.get('volumen', 0),
                data.get('observaciones', ''),
                data.get('transporte'),
                data.get('costo_unitario', 0),
                data.get('precio_unitario', 0),
                data.get('stock', 0),
                data.get('stock_minimo', 0),
                data.get('estado', 'activo'),
                data.get('presentacion_proveedor', ''),
                data.get('presentacion_venta', ''),
                data.get('venta_minima', 1),
                data.get('codigo_barras', ''),
                data.get('origen', ''),
                data.get('tiempo_entrega', ''),
                data.get('abastecimiento', '')
            ))
            
            producto_id = cur.fetchone()['id']
            
            return jsonify({
                'success': True,
                'data': {'id': producto_id},
                'message': 'Producto creado exitosamente'
            })
            
    except Exception as e:
        print(f"❌ Error en create_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@productos_bp.route('/api/productos/<int:producto_id>', methods=['PUT'])
@login_required
def update_producto(producto_id):
    """Actualizar un producto existente"""
    try:
        data = request.get_json()
        
        db_execute("""
            UPDATE productos SET
                codigo = %s,
                descripcion = %s,
                descripcion_larga = %s,
                modelo = %s,
                marca = %s,
                familia = %s,
                subcategoria = %s,
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
        """, (
            data.get('codigo'),
            data.get('descripcion'),
            data.get('descripcion_larga', ''),
            data.get('modelo'),
            data.get('marca'),
            data.get('familia'),
            data.get('subcategoria', ''),
            data.get('unidad'),
            data.get('peso', 0),
            data.get('volumen', 0),
            data.get('observaciones', ''),
            data.get('transporte'),
            data.get('costo_unitario', 0),
            data.get('precio_unitario', 0),
            data.get('stock', 0),
            data.get('stock_minimo', 0),
            data.get('estado', 'activo'),
            data.get('presentacion_proveedor', ''),
            data.get('presentacion_venta', ''),
            data.get('venta_minima', 1),
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
            SELECT 
                id,
                codigo,
                descripcion,
                modelo,
                marca,
                precio_unitario,
                stock
            FROM productos
            WHERE activo = TRUE
            AND (codigo ILIKE %s OR descripcion ILIKE %s)
            ORDER BY codigo
            LIMIT 20
        """, (f'%{q}%', f'%{q}%'))
        
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
        # Obtener categorías
        categorias = db_query("""
            SELECT DISTINCT familia as categoria
            FROM productos
            WHERE activo = TRUE AND familia IS NOT NULL AND familia != ''
            ORDER BY familia
        """)
        
        # Obtener marcas
        marcas = db_query("""
            SELECT DISTINCT marca
            FROM productos
            WHERE activo = TRUE AND marca IS NOT NULL AND marca != ''
            ORDER BY marca
        """)
        
        # Obtener modelos
        modelos = db_query("""
            SELECT DISTINCT modelo
            FROM productos
            WHERE activo = TRUE AND modelo IS NOT NULL AND modelo != ''
            ORDER BY modelo
        """)
        
        return jsonify({
            'success': True,
            'data': {
                'categorias': [c['categoria'] for c in categorias],
                'marcas': [m['marca'] for m in marcas],
                'modelos': [m['modelo'] for m in modelos]
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_filtros_productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500