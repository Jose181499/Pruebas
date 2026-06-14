from flask import Blueprint, render_template, jsonify, request
from models.producto_model import ProductoModel
from models.inventario_model import InventarioModel
import traceback

inventario_bp = Blueprint('inventario', __name__, url_prefix='/inventario')

# ==========================================
# PÁGINAS PRINCIPALES
# ==========================================

@inventario_bp.route('/')
def index():
    return render_template('inventario/index.html')

@inventario_bp.route('/kardex')
def kardex():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/kardex.html', productos=productos)
    except Exception as e:
        return f"Error en kardex: {str(e)}", 500

@inventario_bp.route('/estado-stock')
def estado_stock():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/estado_stock.html', productos=productos)
    except Exception as e:
        return f"Error en estado-stock: {str(e)}", 500

@inventario_bp.route('/entrada')
def entrada_mercaderia():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/entrada_mercaderia.html', productos=productos)
    except Exception as e:
        return f"Error en entrada: {str(e)}", 500

@inventario_bp.route('/salida')
def salida_mercaderia():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/salida_mercaderia.html', productos=productos)
    except Exception as e:
        return f"Error en salida: {str(e)}", 500

@inventario_bp.route('/transferencia')
def transferencia():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/transferencia.html', productos=productos)
    except Exception as e:
        return f"Error en transferencia: {str(e)}", 500

@inventario_bp.route('/revalorizacion')
def revalorizacion():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/revalorizacion.html', productos=productos)
    except Exception as e:
        return f"Error en revalorizacion: {str(e)}", 500

@inventario_bp.route('/recuentos')
def recuentos():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/recuentos.html', productos=productos)
    except Exception as e:
        return f"Error en recuentos: {str(e)}", 500

@inventario_bp.route('/reposicion')
def reposicion_stock():
    try:
        productos = ProductoModel.obtener_todos()
        return render_template('inventario/reposicion_stock.html', productos=productos)
    except Exception as e:
        return f"Error en reposicion: {str(e)}", 500

# ==========================================
# APIS PARA STOCK
# ==========================================

@inventario_bp.route('/api/stock/<int:producto_id>')
def api_get_stock(producto_id):
    try:
        stock = InventarioModel.get_stock_actual(producto_id)
        return jsonify({'success': True, 'stock_actual': stock})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/todos-stocks')
def api_todos_stocks():
    try:
        stocks = InventarioModel.get_todos_stocks()
        return jsonify({'success': True, 'data': stocks})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/resumen-stock')
def api_resumen_stock():
    try:
        resumen = InventarioModel.get_resumen_stock()
        return jsonify({'success': True, **resumen})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/alertas-stock')
def api_alertas_stock():
    try:
        criticos = InventarioModel.get_productos_stock_critico()
        bajos = InventarioModel.get_productos_stock_bajo()
        return jsonify({
            'success': True,
            'criticos': criticos,
            'bajos': bajos
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA MOVIMIENTOS
# ==========================================

@inventario_bp.route('/api/movimiento/entrada', methods=['POST'])
def api_movimiento_entrada():
    try:
        data = request.json
        resultado = InventarioModel.registrar_entrada(
            producto_id=data.get('producto_id'),
            cantidad=data.get('cantidad'),
            costo_unitario=data.get('costo_unitario'),
            documento=data.get('documento'),
            proveedor=data.get('proveedor'),
            observaciones=data.get('observaciones')
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/movimiento/salida', methods=['POST'])
def api_movimiento_salida():
    try:
        data = request.json
        resultado = InventarioModel.registrar_salida(
            producto_id=data.get('producto_id'),
            cantidad=data.get('cantidad'),
            motivo=data.get('motivo'),
            documento=data.get('documento'),
            destino=data.get('destino'),
            observaciones=data.get('observaciones')
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/kardex/<int:producto_id>')
def api_get_kardex(producto_id):
    try:
        kardex = InventarioModel.get_kardex(producto_id)
        return jsonify({'success': True, 'data': kardex})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA TRANSFERENCIAS
# ==========================================

@inventario_bp.route('/api/transferencia', methods=['POST'])
def api_transferencia():
    try:
        data = request.json
        resultado = InventarioModel.realizar_transferencia(
            producto_id=data.get('producto_id'),
            cantidad=data.get('cantidad'),
            almacen_origen=data.get('almacen_origen'),
            almacen_destino=data.get('almacen_destino'),
            motivo=data.get('motivo')
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/transferencias/historial')
def api_transferencias_historial():
    try:
        historial = InventarioModel.get_historial_transferencias()
        return jsonify({'success': True, 'data': historial})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA REVALORIZACIÓN
# ==========================================

@inventario_bp.route('/api/producto/precios/<int:producto_id>')
def api_producto_precios(producto_id):
    try:
        precios = InventarioModel.get_precios_producto(producto_id)
        return jsonify({'success': True, 'data': precios})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/revalorizacion/individual', methods=['POST'])
def api_revalorizacion_individual():
    try:
        data = request.json
        resultado = InventarioModel.revalorizar_individual(
            producto_id=data.get('producto_id'),
            nuevo_costo=data.get('nuevo_costo'),
            nuevo_precio=data.get('nuevo_precio'),
            motivo=data.get('motivo')
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/revalorizaciones/historial')
def api_revalorizaciones_historial():
    try:
        historial = InventarioModel.get_historial_revalorizaciones()
        return jsonify({'success': True, 'data': historial})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA RECUENTOS
# ==========================================

@inventario_bp.route('/api/recuento', methods=['POST'])
def api_recuento():
    try:
        data = request.json
        resultado = InventarioModel.registrar_recuento(
            producto_id=data.get('producto_id'),
            cantidad_fisica=data.get('cantidad_fisica'),
            ubicacion=data.get('ubicacion'),
            observaciones=data.get('observaciones'),
            aplicar_ajuste=data.get('aplicar_ajuste', False)
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/recuentos/historial')
def api_recuentos_historial():
    try:
        historial = InventarioModel.get_historial_recuentos()
        return jsonify({'success': True, 'data': historial})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA REPOSICIÓN
# ==========================================

@inventario_bp.route('/api/producto/<int:producto_id>')
def api_get_producto(producto_id):
    try:
        producto = ProductoModel.obtener_por_id(producto_id)
        return jsonify({'success': True, 'descripcion': producto.get('descripcion', '') if producto else ''})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@inventario_bp.route('/api/generar-orden-compra', methods=['POST'])
def api_generar_orden_compra():
    try:
        data = request.json
        resultado = InventarioModel.generar_orden_compra(
            proveedor_id=data.get('proveedor_id'),
            items=data.get('items'),
            observaciones=data.get('observaciones')
        )
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# APIS PARA PRODUCTOS (adicionales)
# ==========================================

@inventario_bp.route('/api/productos')
def api_productos():
    try:
        productos = ProductoModel.obtener_todos()
        return jsonify({'success': True, 'data': productos})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})