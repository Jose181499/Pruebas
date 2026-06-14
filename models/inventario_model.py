# models/inventario_model.py
from database import db_query, db_execute, get_connection
from contextlib import contextmanager
from psycopg2.extras import RealDictCursor

class InventarioModel:
    
    @staticmethod
    def get_stock_actual(producto_id):
        """Obtener stock actual de un producto"""
        try:
            query = "SELECT stock_actual FROM inventario WHERE producto_id = %s"
            result = db_query(query, (producto_id,))
            return result[0]['stock_actual'] if result else 0
        except Exception as e:
            print(f"Error en get_stock_actual: {e}")
            return 0
    
    @staticmethod
    def get_todos_stocks():
        """Obtener stock de todos los productos"""
        try:
            query = """
                SELECT p.id as producto_id, p.codigo, p.descripcion, p.marca, p.unidad,
                       COALESCE(i.stock_actual, 0) as stock_actual,
                       COALESCE(i.stock_minimo, 5) as stock_minimo,
                       COALESCE(i.stock_maximo, 100) as stock_maximo
                FROM productos p
                LEFT JOIN inventario i ON p.id = i.producto_id
                ORDER BY p.descripcion
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_todos_stocks: {e}")
            return []
    
    @staticmethod
    def get_resumen_stock():
        """Obtener resumen de stock"""
        try:
            query = """
                SELECT 
                    COUNT(DISTINCT p.id) as total_productos,
                    COALESCE(SUM(i.stock_actual), 0) as stock_total,
                    COUNT(CASE WHEN i.stock_actual <= i.stock_minimo AND i.stock_actual > 0 THEN 1 END) as stock_bajo,
                    COUNT(CASE WHEN i.stock_actual <= 0 THEN 1 END) as stock_cero
                FROM productos p
                LEFT JOIN inventario i ON p.id = i.producto_id
            """
            result = db_query(query)
            return result[0] if result else {'total_productos': 0, 'stock_total': 0, 'stock_bajo': 0, 'stock_cero': 0}
        except Exception as e:
            print(f"Error en get_resumen_stock: {e}")
            return {'total_productos': 0, 'stock_total': 0, 'stock_bajo': 0, 'stock_cero': 0}
    
    @staticmethod
    def get_productos_stock_critico():
        """Productos con stock crítico (0 o negativo)"""
        try:
            query = """
                SELECT p.id, p.codigo, p.descripcion, p.marca, 
                       COALESCE(i.stock_actual, 0) as stock_actual,
                       COALESCE(i.stock_minimo, 5) as stock_minimo,
                       COALESCE(i.stock_maximo, 100) as stock_maximo
                FROM productos p
                LEFT JOIN inventario i ON p.id = i.producto_id
                WHERE COALESCE(i.stock_actual, 0) <= 0
                ORDER BY stock_actual ASC
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_productos_stock_critico: {e}")
            return []
    
    @staticmethod
    def get_productos_stock_bajo():
        """Productos con stock por debajo del mínimo (pero mayor que 0)"""
        try:
            query = """
                SELECT p.id, p.codigo, p.descripcion, p.marca, 
                       COALESCE(i.stock_actual, 0) as stock_actual,
                       COALESCE(i.stock_minimo, 5) as stock_minimo
                FROM productos p
                LEFT JOIN inventario i ON p.id = i.producto_id
                WHERE COALESCE(i.stock_actual, 0) > 0 
                  AND COALESCE(i.stock_actual, 0) <= COALESCE(i.stock_minimo, 5)
                ORDER BY (COALESCE(i.stock_actual, 0) / NULLIF(COALESCE(i.stock_minimo, 5), 0)) ASC
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_productos_stock_bajo: {e}")
            return []
    
    @staticmethod
    def registrar_entrada(producto_id, cantidad, costo_unitario, documento, proveedor, observaciones):
        """Registrar entrada de mercadería"""
        try:
            stock_actual = InventarioModel.get_stock_actual(producto_id)
            nuevo_stock = stock_actual + float(cantidad)
            
            # Insertar movimiento
            db_execute("""
                INSERT INTO movimientos_inventario 
                (producto_id, tipo_movimiento, cantidad, costo_unitario, stock_anterior, stock_nuevo, referencia, observaciones)
                VALUES (%s, 'ENTRADA', %s, %s, %s, %s, %s, %s)
            """, (producto_id, cantidad, costo_unitario, stock_actual, nuevo_stock, documento, observaciones))
            
            # Actualizar stock (con UPSERT en PostgreSQL)
            try:
                db_execute("""
                    INSERT INTO inventario (producto_id, stock_actual) 
                    VALUES (%s, %s)
                    ON CONFLICT (producto_id) DO UPDATE SET stock_actual = inventario.stock_actual + %s
                """, (producto_id, cantidad, cantidad))
            except:
                # Si no hay UNIQUE constraint, usar UPDATE primero
                db_execute("UPDATE inventario SET stock_actual = stock_actual + %s WHERE producto_id = %s", (cantidad, producto_id))
                db_execute("""
                    INSERT INTO inventario (producto_id, stock_actual) 
                    SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM inventario WHERE producto_id = %s)
                """, (producto_id, cantidad, producto_id))
            
            return {'success': True, 'message': 'Entrada registrada'}
        except Exception as e:
            print(f"Error en registrar_entrada: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def registrar_salida(producto_id, cantidad, motivo, documento, destino, observaciones):
        """Registrar salida de mercadería"""
        try:
            stock_actual = InventarioModel.get_stock_actual(producto_id)
            
            if stock_actual < float(cantidad):
                return {'success': False, 'error': 'Stock insuficiente'}
            
            nuevo_stock = stock_actual - float(cantidad)
            
            # Insertar movimiento
            db_execute("""
                INSERT INTO movimientos_inventario 
                (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia, observaciones, motivo)
                VALUES (%s, 'SALIDA', %s, %s, %s, %s, %s, %s)
            """, (producto_id, cantidad, stock_actual, nuevo_stock, documento, observaciones, motivo))
            
            # Actualizar stock
            db_execute("UPDATE inventario SET stock_actual = stock_actual - %s WHERE producto_id = %s", (cantidad, producto_id))
            
            return {'success': True, 'message': 'Salida registrada'}
        except Exception as e:
            print(f"Error en registrar_salida: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_kardex(producto_id):
        """Obtener kardex de un producto (PostgreSQL)"""
        try:
            query = """
                SELECT 
                    TO_CHAR(fecha_creacion, 'YYYY-MM-DD HH24:MI') as fecha,
                    tipo_movimiento as tipo,
                    CASE WHEN tipo_movimiento = 'ENTRADA' THEN cantidad ELSE 0 END as entrada,
                    CASE WHEN tipo_movimiento = 'SALIDA' THEN cantidad ELSE 0 END as salida,
                    stock_nuevo as saldo,
                    referencia as documento,
                    observaciones
                FROM movimientos_inventario
                WHERE producto_id = %s
                ORDER BY fecha_creacion DESC
                LIMIT 100
            """
            return db_query(query, (producto_id,))
        except Exception as e:
            print(f"Error en get_kardex: {e}")
            return []
    
    @staticmethod
    def get_precios_producto(producto_id):
        """Obtener costos y precios de un producto"""
        try:
            query = """
                SELECT costo_unitario, precio_venta 
                FROM productos 
                WHERE id = %s
            """
            result = db_query(query, (producto_id,))
            return result[0] if result else {'costo_unitario': 0, 'precio_venta': 0}
        except Exception as e:
            print(f"Error en get_precios_producto: {e}")
            return {'costo_unitario': 0, 'precio_venta': 0}
    
    @staticmethod
    def revalorizar_individual(producto_id, nuevo_costo, nuevo_precio, motivo):
        """Revalorización individual de producto"""
        try:
            # Obtener valores actuales
            actual = InventarioModel.get_precios_producto(producto_id)
            
            # Registrar revalorización
            db_execute("""
                INSERT INTO revalorizaciones_inventario
                (producto_id, costo_anterior, costo_nuevo, precio_anterior, precio_nuevo, motivo)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (producto_id, actual.get('costo_unitario'), nuevo_costo, 
                   actual.get('precio_venta'), nuevo_precio, motivo))
            
            # Actualizar producto
            if nuevo_costo and float(nuevo_costo) > 0:
                db_execute("UPDATE productos SET costo_unitario = %s WHERE id = %s", (nuevo_costo, producto_id))
            if nuevo_precio and float(nuevo_precio) > 0:
                db_execute("UPDATE productos SET precio_venta = %s WHERE id = %s", (nuevo_precio, producto_id))
            
            return {'success': True, 'message': 'Revalorización aplicada'}
        except Exception as e:
            print(f"Error en revalorizar_individual: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_historial_revalorizaciones():
        """Historial de revalorizaciones (PostgreSQL)"""
        try:
            query = """
                SELECT r.*, p.codigo, p.descripcion as producto_nombre,
                       TO_CHAR(r.fecha_creacion, 'YYYY-MM-DD HH24:MI') as fecha
                FROM revalorizaciones_inventario r
                JOIN productos p ON r.producto_id = p.id
                ORDER BY r.fecha_creacion DESC
                LIMIT 50
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_historial_revalorizaciones: {e}")
            return []
    
    @staticmethod
    def registrar_recuento(producto_id, cantidad_fisica, ubicacion, observaciones, aplicar_ajuste):
        """Registrar recuento físico"""
        try:
            stock_sistema = InventarioModel.get_stock_actual(producto_id)
            diferencia = float(cantidad_fisica) - stock_sistema
            
            # Insertar recuento
            db_execute("""
                INSERT INTO recuentos_inventario
                (producto_id, cantidad_sistema, cantidad_fisica, diferencia, ubicacion, observaciones, ajuste_aplicado, fecha_recuento)
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
            """, (producto_id, stock_sistema, cantidad_fisica, diferencia, 
                   ubicacion, observaciones, aplicar_ajuste))
            
            # Aplicar ajuste si se solicitó
            if aplicar_ajuste and diferencia != 0:
                db_execute("UPDATE inventario SET stock_actual = %s WHERE producto_id = %s", (cantidad_fisica, producto_id))
                
                # Registrar movimiento de ajuste
                db_execute("""
                    INSERT INTO movimientos_inventario
                    (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, observaciones)
                    VALUES (%s, 'AJUSTE', %s, %s, %s, %s)
                """, (producto_id, abs(diferencia), stock_sistema, cantidad_fisica, 
                       f"Ajuste por recuento físico - {observaciones}"))
            
            return {'success': True, 'message': 'Recuento registrado'}
        except Exception as e:
            print(f"Error en registrar_recuento: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_historial_recuentos():
        """Historial de recuentos físicos (PostgreSQL)"""
        try:
            query = """
                SELECT r.*, p.codigo, p.descripcion as producto_nombre,
                       TO_CHAR(r.fecha_recuento, 'YYYY-MM-DD') as fecha
                FROM recuentos_inventario r
                JOIN productos p ON r.producto_id = p.id
                ORDER BY r.fecha_recuento DESC
                LIMIT 50
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_historial_recuentos: {e}")
            return []
    
    @staticmethod
    def realizar_transferencia(producto_id, cantidad, almacen_origen, almacen_destino, motivo):
        """Realizar transferencia entre almacenes"""
        try:
            stock_actual = InventarioModel.get_stock_actual(producto_id)
            
            if stock_actual < float(cantidad):
                return {'success': False, 'error': 'Stock insuficiente en almacén origen'}
            
            nuevo_stock = stock_actual - float(cantidad)
            
            # Registrar movimiento de salida (transferencia)
            db_execute("""
                INSERT INTO movimientos_inventario 
                (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, observaciones)
                VALUES (%s, 'TRANSFERENCIA', %s, %s, %s, %s, %s)
            """, (producto_id, cantidad, stock_actual, nuevo_stock, motivo, 
                   f"Transferencia de {almacen_origen} a {almacen_destino}"))
            
            # Actualizar stock
            db_execute("UPDATE inventario SET stock_actual = stock_actual - %s WHERE producto_id = %s", (cantidad, producto_id))
            
            return {'success': True, 'message': 'Transferencia realizada'}
        except Exception as e:
            print(f"Error en realizar_transferencia: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_historial_transferencias():
        """Obtener historial de transferencias"""
        try:
            query = """
                SELECT m.*, p.codigo, p.descripcion as producto_nombre,
                       TO_CHAR(m.fecha_creacion, 'YYYY-MM-DD HH24:MI') as fecha
                FROM movimientos_inventario m
                JOIN productos p ON m.producto_id = p.id
                WHERE m.tipo_movimiento = 'TRANSFERENCIA'
                ORDER BY m.fecha_creacion DESC
                LIMIT 50
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en get_historial_transferencias: {e}")
            return []
    
    @staticmethod
    def generar_orden_compra(proveedor_id, items, observaciones):
        """Generar orden de compra para reposición"""
        try:
            # Obtener último número de orden
            resultado = db_query("SELECT COUNT(*) as total FROM ordenes_compra")
            count = resultado[0]['total'] if resultado else 0
            from datetime import datetime
            numero_orden = f"OC-{datetime.now().strftime('%Y%m%d')}-{count + 1:04d}"
            
            # Insertar orden de compra
            db_execute("""
                INSERT INTO ordenes_compra
                (numero_orden, proveedor_id, fecha_emision, estado, observaciones)
                VALUES (%s, %s, CURRENT_DATE, 'PENDIENTE', %s)
            """, (numero_orden, proveedor_id, observaciones))
            
            # Obtener el ID de la orden insertada
            orden_result = db_query("SELECT id FROM ordenes_compra WHERE numero_orden = %s", (numero_orden,))
            orden_id = orden_result[0]['id'] if orden_result else None
            
            # Insertar detalles
            for item in items:
                db_execute("""
                    INSERT INTO orden_compra_detalle
                    (orden_id, producto_id, cantidad, precio_unitario)
                    VALUES (%s, %s, %s, %s)
                """, (orden_id, item['id'], item['cantidad'], 0))
            
            return {'success': True, 'message': 'Orden generada', 'numero_orden': numero_orden}
        except Exception as e:
            print(f"Error en generar_orden_compra: {e}")
            return {'success': False, 'error': str(e)}