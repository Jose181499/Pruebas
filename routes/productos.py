# routes/productos.py
from flask import Blueprint, render_template, request, jsonify, session, flash, redirect, url_for
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
        # Obtener el número más alto
        result = db_query("""
            SELECT MAX(CAST(REPLACE(codigo, 'PRD-', '') AS INTEGER)) as max_num
            FROM productos 
            WHERE codigo LIKE 'PRD-%' 
            AND codigo ~ '^PRD-[0-9]+$'
        """)
        
        print(f"📋 Resultado de MAX: {result}")
        
        max_num = 0
        if result and result[0].get('max_num') is not None:
            max_num = int(result[0]['max_num'])
            print(f"📊 Máximo número encontrado: {max_num}")
        else:
            print("⚠️ No se encontraron códigos PRD-XXXX")
        
        nuevo_num = max_num + 1
        nuevo_codigo = f"PRD-{str(nuevo_num).zfill(4)}"
        
        print(f"✅ Nuevo código generado: {nuevo_codigo}")
        return nuevo_codigo
        
    except Exception as e:
        print(f"❌ Error generando código: {e}")
        import traceback
        traceback.print_exc()
        # Fallback: obtener el último ID y sumar 1
        try:
            result = db_query("SELECT MAX(id) as max_id FROM productos")
            if result and result[0].get('max_id'):
                nuevo_num = int(result[0]['max_id']) + 1
                return f"PRD-{str(nuevo_num).zfill(4)}"
        except:
            pass
        return "PRD-0011"

# ============================================================
# RUTAS PARA PÁGINAS HTML
# ============================================================

@productos_bp.route('/')
@login_required
def productos():
    """Página principal de productos - Redirige a nuevo producto"""
    codigo_auto = obtener_ultimo_codigo_producto()
    return render_template('productos.html', 
                          active_tab='nuevo',
                          codigo_auto=codigo_auto,
                          editando=False,
                          producto=None)

@productos_bp.route('/nuevo')
@login_required
def productos_nuevo():
    """Página de nuevo producto con código automático"""
    codigo_auto = obtener_ultimo_codigo_producto()
    return render_template('productos.html', 
                          active_tab='nuevo', 
                          codigo_auto=codigo_auto,
                          editando=False,
                          producto=None)

@productos_bp.route('/base-datos')
@login_required
def productos_base_datos():
    """Página de base de datos de productos"""
    return render_template('productos.html', 
                          active_tab='base-datos',
                          producto=None,
                          editando=False)

@productos_bp.route('/comparativo')
@login_required
def productos_comparativo():
    """Página de comparativo de costos"""
    return render_template('productos.html', 
                          active_tab='comparativo',
                          producto=None,
                          editando=False)

@productos_bp.route('/editar/<int:producto_id>')
@login_required
def productos_editar(producto_id):
    try:
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
        
        # ✅ Convertir a diccionario para mejor manejo
        producto_dict = dict(producto[0])
        print(f"📝 Producto encontrado: {producto_dict}")
        
        # ✅ Obtener código automático (aunque no se use en edición)
        codigo_auto = obtener_ultimo_codigo_producto()
        
        # ✅ Pasar el producto como diccionario
        return render_template('productos.html', 
                              active_tab='nuevo',
                              codigo_auto=codigo_auto,
                              producto=producto_dict,
                              editando=True)
        
    except Exception as e:
        print(f"❌ Error en productos_editar: {e}")
        import traceback
        traceback.print_exc()
        flash('Error al cargar el producto', 'error')
        return redirect(url_for('productos.productos_base_datos'))


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
        
        # ✅ VERIFICAR QUE EL PRODUCTO EXISTE
        existente = db_query("SELECT id, codigo FROM productos WHERE id = %s AND activo = TRUE", (producto_id,))
        if not existente:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        
        # ✅ MANTENER EL CÓDIGO EXISTENTE (no actualizar)
        codigo_existente = existente[0]['codigo']
        
        db_execute("""
            UPDATE productos SET
                descripcion = %s, descripcion_larga = %s,
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
            'message': 'Producto actualizado exitosamente',
            'data': {'codigo': codigo_existente}
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

# ⚠️ UNICA DEFINICION - Eliminada la duplicada
@productos_bp.route('/api/productos/ultimo-codigo', methods=['GET'])
@login_required
def get_ultimo_codigo():
    """Obtener el último código de producto generado"""
    try:
        codigo = obtener_ultimo_codigo_producto()
        print(f"📝 Código generado por backend: {codigo}")
        return jsonify({
            'success': True,
            'data': {'codigo': codigo}
        })
    except Exception as e:
        print(f"❌ Error en get_ultimo_codigo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ENDPOINTS PARA COMPARATIVO DE COSTOS
# ============================================================

@productos_bp.route('/api/comparativo-costos', methods=['GET'])
@login_required
def get_comparativo_costos():
    """
    API: Obtener datos del comparativo de costos
    Con soporte para filtros opcionales
    """
    try:
        # Obtener parámetros de filtro
        categoria = request.args.get('categoria', '').strip()
        marca = request.args.get('marca', '').strip()
        min_margen = request.args.get('min_margen', '').strip()
        max_margen = request.args.get('max_margen', '').strip()
        busqueda = request.args.get('q', '').strip()
        producto_id = request.args.get('producto_id', '').strip()
        
        # Construir la consulta base
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
        
        # Aplicar filtros
        if producto_id:
            query += " AND producto_id = %s"
            params.append(int(producto_id))
        
        if categoria:
            query += " AND categoria ILIKE %s"
            params.append(f'%{categoria}%')
        
        if marca:
            query += " AND marca ILIKE %s"
            params.append(f'%{marca}%')
        
        if busqueda:
            query += """ AND (
                codigo ILIKE %s OR 
                nombre_producto ILIKE %s OR 
                modelo ILIKE %s OR 
                marca ILIKE %s
            )"""
            params.extend([f'%{busqueda}%'] * 4)
        
        if min_margen:
            query += " AND margen_actual_porcentaje >= %s"
            params.append(float(min_margen))
        
        if max_margen:
            query += " AND margen_actual_porcentaje <= %s"
            params.append(float(max_margen))
        
        # Ordenar
        query += " ORDER BY nombre_producto"
        
        # Ejecutar consulta
        resultados = db_query(query, params)
        
        return jsonify({
            'success': True,
            'data': resultados,
            'total': len(resultados),
            'filtros_aplicados': {
                'categoria': categoria if categoria else None,
                'marca': marca if marca else None,
                'min_margen': float(min_margen) if min_margen else None,
                'max_margen': float(max_margen) if max_margen else None,
                'busqueda': busqueda if busqueda else None
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_comparativo_costos: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/api/comparativo-costos/resumen', methods=['GET'])
@login_required
def get_resumen_costos():
    """
    API: Obtener resumen del dashboard de costos
    """
    try:
        resultado = db_query("""
            SELECT * FROM vista_resumen_costos
        """)
        
        # Si no hay resultados, devolver valores por defecto
        if not resultado:
            return jsonify({
                'success': True,
                'data': {
                    'total_productos_con_costos': 0,
                    'total_registros_costos': 0,
                    'tipos_costo_utilizados': 0,
                    'promedio_general_costos': 0,
                    'costo_minimo_registrado': 0,
                    'costo_maximo_registrado': 0,
                    'promedio_costo_compra': 0,
                    'promedio_costo_transporte': 0,
                    'promedio_costo_almacenaje': 0,
                    'promedio_costo_manufactura': 0,
                    'registros_ultimos_30_dias': 0,
                    'promedio_ultimos_30_dias': 0
                }
            })
        
        return jsonify({
            'success': True,
            'data': resultado[0]
        })
        
    except Exception as e:
        print(f"❌ Error en get_resumen_costos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/api/productos/<int:producto_id>/costos-historicos', methods=['GET'])
@login_required
def get_costos_historicos(producto_id):
    """
    API: Obtener el historial de costos de un producto específico
    """
    try:
        # Verificar que el producto existe
        producto = db_query("""
            SELECT id, codigo, descripcion 
            FROM productos 
            WHERE id = %s AND activo = TRUE
        """, (producto_id,))
        
        if not producto:
            return jsonify({
                'success': False, 
                'error': 'Producto no encontrado'
            }), 404
        
        # Obtener historial de costos
        historial = db_query("""
            SELECT 
                id,
                fecha_registro,
                tipo_costo,
                monto,
                observaciones
            FROM costos_productos
            WHERE producto_id = %s
            ORDER BY fecha_registro DESC
        """, (producto_id,))
        
        return jsonify({
            'success': True,
            'data': {
                'producto': producto[0],
                'historial': historial,
                'total_registros': len(historial)
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_costos_historicos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/api/comparativo-costos/filtros', methods=['GET'])
@login_required
def get_filtros_comparativo():
    """
    API: Obtener opciones de filtros para el comparativo
    """
    try:
        # Obtener categorías únicas de la vista
        categorias = db_query("""
            SELECT DISTINCT categoria 
            FROM vista_comparativo_costos 
            WHERE categoria IS NOT NULL AND categoria != ''
            ORDER BY categoria
        """)
        
        # Obtener marcas únicas
        marcas = db_query("""
            SELECT DISTINCT marca 
            FROM vista_comparativo_costos 
            WHERE marca IS NOT NULL AND marca != ''
            ORDER BY marca
        """)
        
        # Obtener productos con datos
        productos = db_query("""
            SELECT DISTINCT producto_id, codigo, nombre_producto
            FROM vista_comparativo_costos
            ORDER BY nombre_producto
            LIMIT 100
        """)
        
        return jsonify({
            'success': True,
            'data': {
                'categorias': [c['categoria'] for c in categorias] if categorias else [],
                'marcas': [m['marca'] for m in marcas] if marcas else [],
                'productos': productos if productos else []
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_filtros_comparativo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/api/comparativo-costos/exportar', methods=['GET'])
@login_required
def exportar_comparativo_csv():
    """
    API: Exportar datos del comparativo a CSV
    """
    try:
        # Obtener todos los datos
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
        
        # Construir CSV
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Encabezados
        writer.writerow([
            'Código',
            'Producto',
            'Modelo',
            'Marca',
            'Categoría',
            'Costo Actual (S/)',
            'Precio Venta (S/)',
            'Costo Promedio Histórico (S/)',
            'Margen Actual (%)',
            'Margen Histórico (%)',
            'N° Registros Costos',
            'Fecha Último Costo'
        ])
        
        # Datos
        for row in resultados:
            writer.writerow([
                row.get('codigo', ''),
                row.get('nombre_producto', ''),
                row.get('modelo', ''),
                row.get('marca', ''),
                row.get('categoria', ''),
                f"{float(row.get('costo_actual', 0)):.2f}",
                f"{float(row.get('precio_actual', 0)):.2f}",
                f"{float(row.get('costo_promedio_historico', 0)):.2f}",
                f"{float(row.get('margen_actual_porcentaje', 0)):.2f}",
                f"{float(row.get('margen_historico_porcentaje', 0)):.2f}",
                row.get('total_registros_costos', 0),
                row.get('fecha_ultimo_costo', '')
            ])
        
        csv_content = output.getvalue()
        output.close()
        
        # Devolver como archivo CSV
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=comparativo_costos_{datetime.now().strftime("%Y%m%d")}.csv'
            }
        )
        
    except Exception as e:
        print(f"❌ Error en exportar_comparativo_csv: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@productos_bp.route('/api/comparativo-costos/mejor-producto', methods=['GET'])
@login_required
def get_mejor_producto():
    """
    API: Obtener el producto con mejor margen
    """
    try:
        resultado = db_query("""
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
        
        if not resultado:
            return jsonify({
                'success': True,
                'data': None,
                'message': 'No hay productos con datos de costos'
            })
        
        return jsonify({
            'success': True,
            'data': resultado[0]
        })
        
    except Exception as e:
        print(f"❌ Error en get_mejor_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500