# ==================== APP.PY - KCF CORPORACIÓN ====================
# Backend completo con todas las funcionalidades integradas

from flask import Blueprint, render_template, request, redirect, flash, jsonify, send_file, url_for
import pandas as pd
from io import BytesIO
from datetime import datetime, date
import json
import os

from database import db_query, db_execute, obtener_productos, crear_producto_con_stock

# ==================== BLUEPRINT PRINCIPAL ====================
mantenedor_productos_bp = Blueprint("mantenedor_productos", __name__)

# ==================== RUTAS PRINCIPALES ====================

@mantenedor_productos_bp.route("/mantenedor/productos/gestion")
def gestionar_productos():
    productos = obtener_productos()
    return render_template("mantenedor/gestion_productos.html", productos=productos)

@mantenedor_productos_bp.route("/mantenedor/productos")
def listar_productos():
    productos = obtener_productos()
    return render_template("mantenedor/productos.html", productos=productos)

@mantenedor_productos_bp.route("/mantenedor/productos/nuevo")
def insertar_producto():
    return render_template("mantenedor/nuevo_producto.html")

@mantenedor_productos_bp.route("/mantenedor/productos/nuevo-completo")
def nuevo_producto_completo():
    """Vista mejorada del nuevo producto con todas las funcionalidades"""
    return render_template("mantenedor/nuevo_producto_completo.html")

@mantenedor_productos_bp.route("/mantenedor/productos/comparativo")
def comparativo_costos():
    """Vista del comparativo de costos por producto"""
    return render_template("mantenedor/comparativo_costos.html")

@mantenedor_productos_bp.route("/mantenedor/productos/base-datos")
def base_datos_productos():
    """Vista de la base de datos de productos"""
    return render_template("mantenedor/base_datos_productos.html")

@mantenedor_productos_bp.route("/mantenedor/productos/kardex")
def kardex_productos():
    """Vista del kárdex de productos"""
    return render_template("mantenedor/kardex_productos.html")

# ==================== GUARDAR PRODUCTO ====================
@mantenedor_productos_bp.route("/mantenedor/productos/guardar", methods=["POST"])
def guardar_producto():
    try:
        familia = request.form.get("familia", "")
        descripcion = request.form.get("descripcion", "")
        descripcion_larga = request.form.get("descripcion_larga", "")
        marca = request.form.get("marca", "")
        modelo = request.form.get("modelo", "")
        unidad = request.form.get("unidad", "Und")
        peso = request.form.get("peso", "0")
        volumen = request.form.get("volumen", "0")
        observaciones = request.form.get("observaciones", "")
        transporte = request.form.get("transporte", "")
        estado = request.form.get("estado", "activo")

        costo_unitario = float(request.form.get("costo_unitario", 0))
        precio_unitario = float(request.form.get("precio_unitario", 0))
        stock_inicial = int(request.form.get("stock", 0))
        stock_minimo = int(request.form.get("stock_minimo", 0))
        
        # Presentación
        presentacion_proveedor = request.form.get("presentacion_proveedor", "")
        presentacion_venta = request.form.get("presentacion_venta", "")
        venta_minima = int(request.form.get("venta_minima", 1))
        codigo_barras = request.form.get("codigo_barras", "")

        # Generación automática del código
        prefijos = {
            "Seguridad Industrial": "SEG",
            "Mobiliario de Oficina": "OFI",
            "Tecnología": "TEC",
            "Ferretería": "FER",
            "Limpieza": "LIM",
            "Cuidado Personal": "PER",
            "Iluminación": "ILU",
            "Señalización y tráfico": "SEN",
            "Chalecos": "CHA",
            "Herramientas": "HER",
            "Extintores": "EXT",
            "Protección Personal": "PRO",
            "Cintas": "CIN",
            "Primeros Auxilios": "PRI",
            "Calzado": "CAL",
            "Lámparas": "LAM"
        }

        prefijo = prefijos.get(familia, "GEN")

        result = db_query("SELECT COUNT(*) as total FROM productos WHERE familia = %s", (familia,))
        row = result[0] if result else {'total': 0}
        numero = (row.get('total') if isinstance(row, dict) else row[0]) + 1
        codigo = f"{prefijo}-{str(numero).zfill(3)}"

        # Preparar datos
        data = {
            'codigo': codigo,
            'familia': familia,
            'descripcion': descripcion,
            'descripcion_larga': descripcion_larga,
            'marca': marca,
            'modelo': modelo,
            'unidad': unidad,
            'volumen': float(volumen) if volumen else 0,
            'peso': float(peso) if peso else 0,
            'observaciones': observaciones,
            'transporte': transporte,
            'costo_unitario': costo_unitario,
            'precio_unitario': precio_unitario,
            'stock': stock_inicial,
            'stock_minimo': stock_minimo,
            'estado': estado,
            'presentacion_proveedor': presentacion_proveedor,
            'presentacion_venta': presentacion_venta,
            'venta_minima': venta_minima,
            'codigo_barras': codigo_barras
        }

        # Verificar si la tabla tiene las columnas adicionales
        try:
            db_query("SELECT presentacion_proveedor FROM productos LIMIT 1")
        except:
            # Agregar columnas si no existen
            db_execute("ALTER TABLE productos ADD COLUMN presentacion_proveedor VARCHAR(100)")
            db_execute("ALTER TABLE productos ADD COLUMN presentacion_venta VARCHAR(100)")
            db_execute("ALTER TABLE productos ADD COLUMN venta_minima INTEGER DEFAULT 1")
            db_execute("ALTER TABLE productos ADD COLUMN codigo_barras VARCHAR(50)")
            db_execute("ALTER TABLE productos ADD COLUMN estado VARCHAR(20) DEFAULT 'activo'")
            db_execute("ALTER TABLE productos ADD COLUMN stock_minimo INTEGER DEFAULT 0")
            db_execute("ALTER TABLE productos ADD COLUMN volumen DECIMAL(10,3) DEFAULT 0")

        producto_id = crear_producto_con_stock(data)

        flash(f'✅ Producto creado correctamente (Código: {codigo})', 'success')

    except Exception as e:
        flash(f'❌ Error al guardar el producto: {str(e)}', 'danger')

    return redirect("/mantenedor/productos")

# ==================== IMPORTAR EXCEL ====================
@mantenedor_productos_bp.route("/mantenedor/productos/importar", methods=["POST"])
def importar_productos():
    try:
        if 'file' not in request.files:
            flash('No se seleccionó ningún archivo', 'warning')
            return redirect("/mantenedor/productos")
        
        file = request.files['file']
        if file.filename == '':
            flash('No se seleccionó ningún archivo', 'warning')
            return redirect("/mantenedor/productos")
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            flash('Formato no soportado. Use archivos Excel (.xlsx, .xls)', 'danger')
            return redirect("/mantenedor/productos")
        
        # Leer Excel
        df = pd.read_excel(file)
        total_importados = 0
        errores = []
        
        for idx, row in df.iterrows():
            try:
                descripcion = row.get('descripcion') or row.get('Descripción') or row.get('DESCRIPCION')
                if not descripcion:
                    errores.append(f"Fila {idx+2}: Descripción requerida")
                    continue
                
                familia = row.get('familia') or row.get('Familia') or row.get('CATEGORIA') or ''
                marca = row.get('marca') or row.get('Marca') or ''
                modelo = row.get('modelo') or row.get('Modelo') or ''
                unidad = row.get('unidad') or row.get('Unidad') or 'Und'
                
                costo = float(row.get('costo') or row.get('Costo') or 0)
                precio = float(row.get('precio') or row.get('Precio') or 0)
                stock = int(row.get('stock') or row.get('Stock') or 0)
                
                # Generar código
                prefijos = {
                    "Seguridad Industrial": "SEG",
                    "Mobiliario de Oficina": "OFI",
                    "Tecnología": "TEC",
                    "Ferretería": "FER",
                }
                prefijo = prefijos.get(familia, "GEN")
                result = db_query("SELECT COUNT(*) as total FROM productos WHERE familia = %s", (familia,))
                numero = (result[0].get('total') if result else 0) + idx + 1
                codigo = f"{prefijo}-{str(numero).zfill(3)}"
                
                data = {
                    'codigo': codigo,
                    'familia': familia,
                    'descripcion': descripcion,
                    'descripcion_larga': row.get('descripcion_larga') or row.get('Descripción Larga') or '',
                    'marca': marca,
                    'modelo': modelo,
                    'unidad': unidad,
                    'volumen': float(row.get('volumen') or row.get('Volumen') or 0),
                    'peso': float(row.get('peso') or row.get('Peso') or 0),
                    'observaciones': row.get('observaciones') or row.get('Observaciones') or '',
                    'transporte': row.get('transporte') or row.get('Transporte') or '',
                    'costo_unitario': costo,
                    'precio_unitario': precio,
                    'stock': stock,
                    'stock_minimo': int(row.get('stock_minimo') or row.get('Stock Mínimo') or 0),
                    'estado': 'activo'
                }
                
                crear_producto_con_stock(data)
                total_importados += 1
                
            except Exception as e:
                errores.append(f"Fila {idx+2}: {str(e)}")
        
        mensaje = f'✅ {total_importados} productos importados correctamente'
        if errores:
            mensaje += f'. Errores: {len(errores)}'
        flash(mensaje, 'success' if total_importados > 0 else 'danger')
        
        if errores:
            flash(f'Errores: {", ".join(errores[:5])}', 'warning')
        
    except Exception as e:
        flash(f'❌ Error al importar: {str(e)}', 'danger')
    
    return redirect("/mantenedor/productos")

# ==================== EXPORTAR A EXCEL ====================
@mantenedor_productos_bp.route("/mantenedor/productos/exportar", methods=["GET"])
def exportar_productos():
    try:
        productos = db_query("""
            SELECT id, codigo, familia, descripcion, descripcion_larga, marca, modelo, 
                   unidad, peso, volumen, transporte, costo_unitario, precio_unitario, 
                   stock, stock_minimo, estado, presentacion_proveedor, presentacion_venta,
                   venta_minima, codigo_barras, observaciones
            FROM productos
            ORDER BY id
        """)
        
        if not productos:
            flash('No hay productos para exportar', 'warning')
            return redirect("/mantenedor/productos")
        
        # Crear DataFrame
        df = pd.DataFrame(productos)
        
        # Renombrar columnas para mejor presentación
        df.columns = ['ID', 'Código', 'Familia', 'Descripción', 'Descripción Larga', 
                      'Marca', 'Modelo', 'Unidad', 'Peso (kg)', 'Volumen (m³)', 
                      'Transporte', 'Costo Unitario', 'Precio Unitario', 
                      'Stock', 'Stock Mínimo', 'Estado', 'Presentación Proveedor',
                      'Presentación Venta', 'Venta Mínima', 'Código Barras', 'Observaciones']
        
        # Crear archivo Excel
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Productos', index=False)
            
            # Ajustar ancho de columnas
            worksheet = writer.sheets['Productos']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_length = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_length
        
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'productos_kcf_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
        
    except Exception as e:
        flash(f'❌ Error al exportar: {str(e)}', 'danger')
        return redirect("/mantenedor/productos")

# ==================== EDITAR PRODUCTO ====================
@mantenedor_productos_bp.route('/mantenedor/productos/editar', methods=['POST'])
def editar_producto():
    try:
        id_producto = request.form['id']
        familia = request.form.get('familia', '')
        descripcion = request.form.get('descripcion', '')
        descripcion_larga = request.form.get('descripcion_larga', '')
        marca = request.form.get('marca', '')
        modelo = request.form.get('modelo', '')
        unidad = request.form.get('unidad', 'Und')
        peso = request.form.get('peso', '0')
        volumen = request.form.get('volumen', '0')
        observaciones = request.form.get('observaciones', '')
        transporte = request.form.get('transporte', '')
        costo_unitario = float(request.form.get('costo_unitario', 0))
        precio_unitario = float(request.form.get('precio_unitario', 0))
        stock = int(request.form.get('stock', 0))
        stock_minimo = int(request.form.get('stock_minimo', 0))
        estado = request.form.get('estado', 'activo')
        
        # Campos adicionales
        presentacion_proveedor = request.form.get('presentacion_proveedor', '')
        presentacion_venta = request.form.get('presentacion_venta', '')
        venta_minima = int(request.form.get('venta_minima', 1))
        codigo_barras = request.form.get('codigo_barras', '')

        db_execute("""
            UPDATE productos
            SET familia = %s,
                descripcion = %s,
                descripcion_larga = %s,
                marca = %s,
                modelo = %s,
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
                codigo_barras = %s
            WHERE id = %s
        """, (familia, descripcion, descripcion_larga, marca, modelo, unidad, 
              peso, volumen, observaciones, transporte, costo_unitario, 
              precio_unitario, stock, stock_minimo, estado, 
              presentacion_proveedor, presentacion_venta, venta_minima,
              codigo_barras, id_producto))

        flash('✅ Producto actualizado correctamente', 'success')

    except Exception as e:
        flash(f'❌ Error al actualizar: {str(e)}', 'danger')

    return redirect('/mantenedor/productos')

# ==================== ELIMINAR ====================
@mantenedor_productos_bp.route('/mantenedor/productos/eliminar', methods=['POST'])
def eliminar_producto():
    id_producto = request.form['id']
    db_execute("DELETE FROM productos WHERE id = %s", (id_producto,))
    flash('✅ Producto eliminado correctamente', 'success')
    return redirect('/mantenedor/productos')

# ==================== API PARA KÁRDEX Y PRODUCTOS ====================

@mantenedor_productos_bp.route("/mantenedor/productos/api/productos", methods=["GET"])
def api_get_productos():
    """API: Obtener todos los productos"""
    try:
        productos = db_query("""
            SELECT id, codigo, familia, descripcion, descripcion_larga, marca, modelo, 
                   unidad, peso, volumen, transporte, costo_unitario, precio_unitario, 
                   stock, stock_minimo, estado, presentacion_proveedor, presentacion_venta,
                   venta_minima, codigo_barras, observaciones 
            FROM productos
            ORDER BY id
        """)
        
        # Procesar datos para JSON
        for p in productos:
            if p.get('costo_unitario'):
                p['costo_unitario'] = float(p['costo_unitario'])
            if p.get('precio_unitario'):
                p['precio_unitario'] = float(p['precio_unitario'])
            if p.get('peso'):
                p['peso'] = float(p['peso'])
            if p.get('volumen'):
                p['volumen'] = float(p['volumen'])
            p['stock'] = p.get('stock') or 0
            p['stock_minimo'] = p.get('stock_minimo') or 0
            p['venta_minima'] = p.get('venta_minima') or 1
                
        return jsonify(productos)
    except Exception as e:
        print(f"❌ Error en api_get_productos: {e}")
        return jsonify({'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/productos/<int:id>", methods=["GET"])
def api_get_producto(id):
    """API: Obtener un producto por ID"""
    try:
        productos = db_query("""
            SELECT id, codigo, familia, descripcion, descripcion_larga, marca, modelo, 
                   unidad, peso, volumen, transporte, costo_unitario, precio_unitario, 
                   stock, stock_minimo, estado, presentacion_proveedor, presentacion_venta,
                   venta_minima, codigo_barras, observaciones 
            FROM productos 
            WHERE id = %s
        """, (id,))
        
        if not productos:
            return jsonify({'error': 'Producto no encontrado'}), 404
        
        p = productos[0]
        
        if p.get('costo_unitario'):
            p['costo_unitario'] = float(p['costo_unitario'])
        if p.get('precio_unitario'):
            p['precio_unitario'] = float(p['precio_unitario'])
        if p.get('peso'):
            p['peso'] = float(p['peso'])
        if p.get('volumen'):
            p['volumen'] = float(p['volumen'])
        p['stock'] = p.get('stock') or 0
        p['stock_minimo'] = p.get('stock_minimo') or 0
        p['venta_minima'] = p.get('venta_minima') or 1
            
        return jsonify(p)
    except Exception as e:
        print(f"❌ Error en api_get_producto: {e}")
        return jsonify({'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/productos/<int:id>", methods=["PUT"])
def api_update_producto(id):
    """API: Actualizar un producto"""
    try:
        data = request.get_json()
        
        campos = []
        valores = []
        
        # Mapeo de campos permitidos
        campos_permitidos = [
            'familia', 'descripcion', 'descripcion_larga', 'marca', 'modelo', 
            'unidad', 'peso', 'volumen', 'transporte', 'costo_unitario', 
            'precio_unitario', 'stock', 'stock_minimo', 'observaciones', 
            'estado', 'presentacion_proveedor', 'presentacion_venta', 
            'venta_minima', 'codigo_barras'
        ]
        
        for campo in campos_permitidos:
            if campo in data:
                campos.append(f"{campo} = %s")
                valores.append(data[campo])
        
        if not campos:
            return jsonify({'success': False, 'error': 'No hay datos para actualizar'}), 400
        
        valores.append(id)
        sql = f"UPDATE productos SET {', '.join(campos)} WHERE id = %s"
        
        db_execute(sql, valores)
        
        return jsonify({'success': True, 'message': 'Producto actualizado correctamente'})
        
    except Exception as e:
        print(f"❌ Error en api_update_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/productos/<int:id>", methods=["DELETE"])
def api_delete_producto(id):
    """API: Eliminar un producto"""
    try:
        # Verificar si tiene movimientos
        try:
            movimientos = db_query("SELECT COUNT(*) as total FROM movimientos_stock WHERE producto_id = %s", (id,))
            if movimientos and movimientos[0].get('total', 0) > 0:
                return jsonify({
                    'success': False, 
                    'error': 'No se puede eliminar el producto porque tiene movimientos de stock asociados'
                }), 400
        except:
            pass
        
        db_execute("DELETE FROM productos WHERE id = %s", (id,))
        return jsonify({'success': True, 'message': 'Producto eliminado correctamente'})
        
    except Exception as e:
        print(f"❌ Error en api_delete_producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/kardex/<int:producto_id>", methods=["GET"])
def api_get_kardex(producto_id):
    """API: Obtener movimientos de kárdex para un producto"""
    try:
        # Crear tabla si no existe
        try:
            db_execute("""
                CREATE TABLE IF NOT EXISTS movimientos_stock (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    tipo VARCHAR(20) NOT NULL,
                    cantidad INTEGER NOT NULL,
                    costo_unitario DECIMAL(10,2),
                    referencia VARCHAR(100),
                    motivo TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        except:
            pass
        
        # Obtener movimientos
        movimientos = db_query("""
            SELECT id, producto_id, tipo, cantidad, costo_unitario, referencia, motivo, created_at
            FROM movimientos_stock
            WHERE producto_id = %s
            ORDER BY created_at ASC
        """, (producto_id,))
        
        # Obtener producto
        producto = db_query("SELECT stock, costo_unitario, descripcion FROM productos WHERE id = %s", (producto_id,))
        
        stock_actual = producto[0]['stock'] if producto else 0
        costo_unitario = float(producto[0]['costo_unitario']) if producto and producto[0].get('costo_unitario') else 0
        nombre_producto = producto[0]['descripcion'] if producto else 'Producto'
        
        # Procesar movimientos
        for m in movimientos:
            if m.get('costo_unitario'):
                m['costo_unitario'] = float(m['costo_unitario'])
            m['cantidad'] = m.get('cantidad') or 0
            if m.get('created_at'):
                m['fecha'] = str(m['created_at'])
        
        return jsonify({
            'success': True,
            'movimientos': movimientos,
            'stock_actual': stock_actual,
            'costo_unitario': costo_unitario,
            'nombre_producto': nombre_producto
        })
        
    except Exception as e:
        print(f"❌ Error en api_get_kardex: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/movimientos", methods=["POST"])
def api_create_movimiento():
    """API: Crear un movimiento de stock"""
    try:
        data = request.get_json()
        
        producto_id = data.get('producto_id')
        tipo = data.get('tipo')
        cantidad = data.get('cantidad')
        costo_unitario = data.get('costo_unitario')
        referencia = data.get('referencia')
        motivo = data.get('motivo')
        
        if not producto_id or not tipo or not cantidad:
            return jsonify({'success': False, 'error': 'Faltan datos requeridos'}), 400
        
        if cantidad <= 0:
            return jsonify({'success': False, 'error': 'La cantidad debe ser mayor a 0'}), 400
        
        # Verificar producto
        producto = db_query("SELECT stock FROM productos WHERE id = %s", (producto_id,))
        if not producto:
            return jsonify({'success': False, 'error': 'Producto no encontrado'}), 404
        
        stock_actual = producto[0]['stock'] or 0
        
        if tipo == 'SALIDA' and stock_actual < cantidad:
            return jsonify({
                'success': False, 
                'error': f'Stock insuficiente. Stock actual: {stock_actual}, solicitado: {cantidad}'
            }), 400
        
        # Calcular nuevo stock
        if tipo == 'ENTRADA':
            nuevo_stock = stock_actual + cantidad
        elif tipo == 'SALIDA':
            nuevo_stock = stock_actual - cantidad
        elif tipo == 'AJUSTE':
            nuevo_stock = cantidad
        else:
            return jsonify({'success': False, 'error': 'Tipo de movimiento inválido'}), 400
        
        # Insertar movimiento
        db_execute("""
            INSERT INTO movimientos_stock (producto_id, tipo, cantidad, costo_unitario, referencia, motivo)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (producto_id, tipo, cantidad, costo_unitario, referencia, motivo))
        
        # Actualizar stock del producto
        db_execute("UPDATE productos SET stock = %s WHERE id = %s", (nuevo_stock, producto_id))
        
        return jsonify({
            'success': True,
            'message': 'Movimiento registrado correctamente',
            'nuevo_stock': nuevo_stock
        })
        
    except Exception as e:
        print(f"❌ Error en api_create_movimiento: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/comparativo", methods=["GET"])
def api_get_comparativo():
    """API: Obtener datos para el comparativo de costos"""
    try:
        producto_id = request.args.get('producto_id')
        if not producto_id:
            return jsonify({'error': 'Se requiere producto_id'}), 400
        
        # Obtener cotizaciones del producto
        cotizaciones = db_query("""
            SELECT p.codigo, p.descripcion, p.marca, p.modelo, 
                   c.proveedor, c.cantidad, c.costo_historico, c.fecha_costo,
                   c.costo_unitario, c.precio_historico, c.fecha_precio,
                   c.venta_unitario, c.tiempo_entrega, c.tipo_entrega,
                   c.lugar_entrega, c.costo_transporte, c.comentario, c.estatus
            FROM productos p
            JOIN cotizaciones c ON p.id = c.producto_id
            WHERE p.id = %s
        """, (producto_id,))
        
        return jsonify(cotizaciones)
        
    except Exception as e:
        print(f"❌ Error en api_get_comparativo: {e}")
        return jsonify({'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/ultimo_codigo", methods=["GET"])
def api_ultimo_codigo():
    """API: Obtener último código para un prefijo"""
    try:
        prefijo = request.args.get('prefijo', 'GEN')
        
        resultados = db_query("""
            SELECT codigo FROM productos 
            WHERE codigo LIKE %s 
            ORDER BY id DESC LIMIT 1
        """, (f'{prefijo}%',))
        
        if resultados and resultados[0].get('codigo'):
            try:
                # Extraer número del código
                codigo = resultados[0]['codigo']
                import re
                match = re.search(r'\d+$', codigo)
                if match:
                    numero = int(match.group())
                    return jsonify({'success': True, 'ultimo_numero': numero})
            except:
                pass
        
        return jsonify({'success': True, 'ultimo_numero': 0})
                
    except Exception as e:
        print(f"❌ Error en api_ultimo_codigo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/familias", methods=["GET"])
def api_get_familias():
    """API: Obtener todas las familias/categorías"""
    try:
        resultados = db_query("SELECT DISTINCT familia FROM productos WHERE familia IS NOT NULL AND familia != '' ORDER BY familia")
        familias = [r['familia'] for r in resultados]
        return jsonify(familias)
    except Exception as e:
        print(f"❌ Error en api_get_familias: {e}")
        return jsonify({'error': str(e)}), 500

@mantenedor_productos_bp.route("/mantenedor/productos/api/estados", methods=["GET"])
def api_get_estados():
    """API: Obtener todos los estados posibles"""
    estados = ['activo', 'inactivo', 'bajo_pedido', 'disponible', 'bloqueado']
    return jsonify(estados)

# ==================== REGISTRAR EL BLUEPRINT EN LA APP PRINCIPAL ====================
# En tu archivo principal app.py, debes registrar el blueprint:
# from mantenedor_productos import mantenedor_productos_bp
# app.register_blueprint(mantenedor_productos_bp)

# ==================== FUNCIÓN DE UTILIDAD PARA CREAR TABLAS ====================
def crear_tablas():
    """Crear tablas necesarias si no existen"""
    try:
        # Verificar si la tabla productos tiene las columnas adicionales
        columnas = db_query("PRAGMA table_info(productos)")
        columnas_existentes = [c['name'] for c in columnas] if columnas else []
        
        columnas_nuevas = {
            'presentacion_proveedor': 'VARCHAR(100)',
            'presentacion_venta': 'VARCHAR(100)',
            'venta_minima': 'INTEGER DEFAULT 1',
            'codigo_barras': 'VARCHAR(50)',
            'estado': "VARCHAR(20) DEFAULT 'activo'",
            'stock_minimo': 'INTEGER DEFAULT 0',
            'volumen': 'DECIMAL(10,3) DEFAULT 0'
        }
        
        for col, tipo in columnas_nuevas.items():
            if col not in columnas_existentes:
                try:
                    db_execute(f"ALTER TABLE productos ADD COLUMN {col} {tipo}")
                    print(f"✅ Columna '{col}' agregada a productos")
                except Exception as e:
                    print(f"⚠️ No se pudo agregar columna {col}: {e}")
        
        # Crear tabla de cotizaciones
        try:
            db_execute("""
                CREATE TABLE IF NOT EXISTS cotizaciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    proveedor VARCHAR(100) NOT NULL,
                    cantidad INTEGER DEFAULT 1,
                    costo_historico DECIMAL(10,2),
                    fecha_costo TIMESTAMP,
                    costo_unitario DECIMAL(10,2),
                    precio_historico DECIMAL(10,2),
                    fecha_precio TIMESTAMP,
                    venta_unitario DECIMAL(10,2),
                    tiempo_entrega INTEGER,
                    tipo_entrega VARCHAR(50),
                    lugar_entrega VARCHAR(100),
                    costo_transporte DECIMAL(10,2),
                    comentario TEXT,
                    estatus VARCHAR(20) DEFAULT 'Evaluar',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )
            """)
            print("✅ Tabla 'cotizaciones' creada/verificada")
        except Exception as e:
            print(f"⚠️ Error al crear tabla cotizaciones: {e}")
        
        # Crear tabla de movimientos_stock
        try:
            db_execute("""
                CREATE TABLE IF NOT EXISTS movimientos_stock (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    tipo VARCHAR(20) NOT NULL,
                    cantidad INTEGER NOT NULL,
                    costo_unitario DECIMAL(10,2),
                    referencia VARCHAR(100),
                    motivo TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (producto_id) REFERENCES productos(id)
                )
            """)
            print("✅ Tabla 'movimientos_stock' creada/verificada")
        except Exception as e:
            print(f"⚠️ Error al crear tabla movimientos_stock: {e}")
            
    except Exception as e:
        print(f"❌ Error en crear_tablas: {e}")

# Ejecutar creación de tablas al importar
crear_tablas()