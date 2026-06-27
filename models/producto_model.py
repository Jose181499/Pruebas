# models/producto_model.py
from database import db_query

class ProductoModel:
    
    @staticmethod
    def obtener_todos():
        """Obtener todos los productos activos"""
        try:
            query = """
                SELECT id, familia, codigo, descripcion, descripcion_larga,
                       marca, modelo, unidad, peso, observaciones, transporte,
                       costo_unitario, precio_unitario, stock, activo, fecha_creacion
                FROM productos
                WHERE activo = TRUE
                ORDER BY familia, codigo
            """
            return db_query(query)
        except Exception as e:
            print(f"Error en obtener_todos: {e}")
            return []
    
    @staticmethod
    def obtener_por_id(producto_id):
        """Obtener un producto por ID"""
        try:
            query = """
                SELECT id, familia, codigo, descripcion, descripcion_larga,
                       marca, modelo, unidad, peso, observaciones, transporte,
                       costo_unitario, precio_unitario, stock, activo, fecha_creacion
                FROM productos
                WHERE id = %s AND activo = TRUE
            """
            result = db_query(query, (producto_id,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error en obtener_por_id: {e}")
            return None