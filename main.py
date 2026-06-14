import os
import sys
import pandas as pd
import requests
import base64
sys.dont_write_bytecode = True
from flask import (
    Flask, render_template, request, redirect, url_for, session, flash, jsonify
)
from functools import wraps
from routes.clientes import clientes_bp
from routes.cotizaciones import cotizaciones_bp
from routes.compras import compras_bp
from routes.proveedores import proveedores_bp
from routes.mantenedor_productos import mantenedor_productos_bp
from routes.usuarios import usuarios_bp
from routes.mantenedor_principal import mantenedor_principal_bp
from routes.mantenedor_clientes import mantenedor_clientes_bp
from routes.mantenedor_proveedores import mantenedor_proveedores_bp
from routes.mantenedor_usuarios import mantenedor_usuarios_bp
from routes.guias_remision import guias_bp  # ← AGREGAR ESTA LÍNEA
from routes.comprobantes import comprobantes_bp
from routes.comprobantes_compra import comprobantes_compra_bp
from routes.guias_remision_compra import guias_compra_bp
from routes.transportistas import transportistas_bp
from routes.inventario_routes import inventario_bp

from database import (
    verificar_usuario,
    insertar_cliente_completo,
    obtener_todos_clientes_con_detalles,
    obtener_cliente_completo_por_id,
    actualizar_cliente_completo,
    eliminar_cliente_db,
    obtener_ultimo_codigo_cliente,
    buscar_clientes_completo,
    # Funciones para proveedores
    insertar_proveedor_completo,
    obtener_todos_proveedores,
    obtener_proveedor_por_id,
    actualizar_proveedor,
    eliminar_proveedor_db,
    obtener_ultimo_codigo_proveedor
)

from pdf_generator import pdf_generator

app = Flask(__name__)

# ==========================================
# REGISTRO DE BLUEPRINTS
# ==========================================
app.register_blueprint(clientes_bp)
app.register_blueprint(proveedores_bp)
app.register_blueprint(cotizaciones_bp)
app.register_blueprint(compras_bp)  # ✅ NUEVO: Registrar blueprint de compras
app.register_blueprint(mantenedor_productos_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(mantenedor_principal_bp)
app.register_blueprint(mantenedor_clientes_bp)
app.register_blueprint(mantenedor_usuarios_bp)
app.register_blueprint(mantenedor_proveedores_bp)
app.register_blueprint(guias_bp)
app.register_blueprint(comprobantes_bp)
app.register_blueprint(comprobantes_compra_bp)
app.register_blueprint(guias_compra_bp)
app.register_blueprint(transportistas_bp)
app.register_blueprint(inventario_bp)

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")


# =========================
# Helpers
# =========================
def formato_moneda_soles(valor):
    try:
        if valor is None:
            return "0.00"
        if isinstance(valor, str):
            v = valor.replace(",", "").strip()
            if not v:
                return "0.00"
            numero = float(v)
        else:
            numero = float(valor)
        return "{:,.2f}".format(numero)
    except (ValueError, TypeError):
        return "0.00"


app.jinja_env.filters["formato_soles"] = formato_moneda_soles


def requiere_permiso(modulo, accion="ver"):

    def decorator(f):

        @wraps(f)
        def decorated_function(*args, **kwargs):

            if "usuario" not in session:
                return redirect(url_for("login"))

            # =========================
            # ADMINISTRADOR
            # =========================
            if session.get("rol") == "administrador":
                return f(*args, **kwargs)

            # =========================
            # USUARIO NORMAL
            # =========================
            if session.get("rol") == "usuario":

                permisos_usuario = {
                    "productos": ["crear", "ver"],
                    "proveedores": ["crear", "ver"],
                    "clientes": ["crear", "ver"],
                    "precios": ["crear", "ver"],
                    "usuarios": []
                }

                if modulo in permisos_usuario and accion in permisos_usuario[modulo]:
                    return f(*args, **kwargs)

            flash("No tiene permisos para realizar esta acción", "error")
            return redirect(url_for("mantenedor"))

        return decorated_function

    return decorator


@app.before_request
def require_login():

    allowed_routes = {"login", "static", "logout"}

    if request.endpoint and request.endpoint not in allowed_routes:
        if "usuario" not in session:
            return redirect(url_for("login"))



# ==========================================
# ENDPOINT DE DIAGNÓSTICO
# ==========================================

@app.route("/api/diagnostico/clientes", methods=["GET"])
def api_diagnostico_clientes():
    """Endpoint para diagnosticar problemas con clientes"""
    try:
        from database import diagnosticar_clientes
        diagnosticar_clientes()
        return jsonify({
            'success': True,
            'message': 'Diagnóstico completado. Revisa la consola del servidor para ver los resultados.'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# =========================
# Auth
# =========================
@app.route("/")
def root():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():

    if "usuario" in session:
        return redirect(url_for("index"))

    if request.method == "POST":

        usuario = request.form.get("usuario", "").strip()
        password = request.form.get("password", "")

        usuario_data = verificar_usuario(usuario, password)

        if usuario_data:

            session["usuario"] = usuario_data["usuario"]
            session["rol"] = usuario_data["rol"]
            session["nombre_completo"] = usuario_data["nombre_completo"]
            session["usuario_id"] = usuario_data["id"]

            flash(
                f'Bienvenido/a {usuario_data["nombre_completo"]}!',
                "success"
            )

            return redirect(url_for("index"))

        flash("Usuario o contraseña incorrectos", "error")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Has cerrado sesión correctamente", "info")
    return redirect(url_for("login"))


@app.route("/index")
def index():
    return render_template("index.html")


# =========================
# ENDPOINTS CLIENTES API
# =========================

@app.route("/api/clientes/guardar", methods=["POST"])
def api_guardar_cliente():
    """Guardar nuevo cliente - El código se genera automáticamente"""
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get("razon_social"):
            return jsonify({"success": False, "error": "La razón social es obligatoria"})
        
        if not data.get("numero_documento"):
            return jsonify({"success": False, "error": "El número de documento es obligatorio"})
        
        if not data.get("contactos") or len(data.get("contactos")) == 0:
            return jsonify({"success": False, "error": "Agregue al menos un contacto"})
        
        if not data.get("puntos_entrega") or len(data.get("puntos_entrega")) == 0:
            return jsonify({"success": False, "error": "Agregue al menos un punto de entrega"})
        
        # Insertar cliente (el código se genera automáticamente por el trigger)
        resultado = insertar_cliente_completo(data)
        
        return jsonify({
            "success": True,
            "data": resultado,
            "message": f'Cliente creado con código {resultado["codigo_cliente"]}'
        })
        
    except Exception as e:
        print(f"Error al guardar cliente: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/clientes/buscar", methods=["GET"])
def api_buscar_clientes():
    """Buscar clientes por nombre o documento - VERSIÓN CORREGIDA"""
    try:
        from database import buscar_clientes_completo  # ← Importar la función correcta
        
        busqueda = request.args.get('q', request.args.get('busqueda', '')).strip()
        
        print(f"🔍 Buscando clientes: '{busqueda}'")
        
        if not busqueda or len(busqueda) < 2:
            return jsonify({"success": True, "data": []})
        
        # Usar la función que SÍ incluye teléfono, email y contacto
        clientes = buscar_clientes_completo(busqueda, limit=50)
        
        print(f"✅ Encontrados {len(clientes)} clientes")
        if clientes:
            print(f"Ejemplo - Teléfono: {clientes[0].get('telefono_contacto')}")
            print(f"Ejemplo - Email: {clientes[0].get('email_contacto')}")
            print(f"Ejemplo - Contacto: {clientes[0].get('nombre_contacto')}")
        
        return jsonify({"success": True, "data": clientes})
        
    except Exception as e:
        print(f"❌ Error en api_buscar_clientes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e), "data": []}), 500

@app.route("/api/clientes/<int:cliente_id>", methods=["GET"])
def api_obtener_cliente(cliente_id):
    """Obtener cliente por ID"""
    try:
        cliente = obtener_cliente_completo_por_id(cliente_id)
        
        if not cliente:
            return jsonify({"success": False, "error": "Cliente no encontrado"})
        
        return jsonify({"success": True, "data": cliente})
        
    except Exception as e:
        print(f"Error al obtener cliente: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/clientes/<int:cliente_id>/direcciones", methods=["GET"])
def api_obtener_direcciones_cliente(cliente_id):
    """Obtener direcciones/puntos de entrega de un cliente"""
    try:
        from database import db_query
        
        query = """
            SELECT id, direccion, nombre_punto, principal, telefono_contacto
            FROM clientes_puntos_entrega
            WHERE cliente_id = %s
            ORDER BY principal DESC, nombre_punto
        """
        direcciones = db_query(query, (cliente_id,))
        
        if not direcciones:
            direcciones = []
        
        print(f"📦 Direcciones encontradas para cliente {cliente_id}: {len(direcciones)}")
        
        return jsonify({
            'success': True,
            'data': direcciones
        })
        
    except Exception as e:
        print(f"❌ Error en /api/clientes/{cliente_id}/direcciones: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500
        
@app.route("/api/clientes/<int:cliente_id>", methods=["PUT"])
def api_actualizar_cliente(cliente_id):
    """Actualizar cliente existente"""
    try:
        data = request.get_json()
        resultado = actualizar_cliente_completo(cliente_id, data)
        return jsonify({"success": True, "data": resultado, "message": "Cliente actualizado correctamente"})
        
    except Exception as e:
        print(f"Error al actualizar cliente: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/clientes/<int:cliente_id>", methods=["DELETE"])
def api_eliminar_cliente(cliente_id):
    """Eliminar cliente (borrado lógico)"""
    try:
        resultado = eliminar_cliente_db(cliente_id)
        return jsonify({"success": True, "data": resultado, "message": "Cliente eliminado correctamente"})
        
    except Exception as e:
        print(f"Error al eliminar cliente: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/clientes/ultimo-codigo", methods=["GET"])
def api_ultimo_codigo():
    """Obtener el último código generado (opcional)"""
    try:
        codigo = obtener_ultimo_codigo_cliente()
        return jsonify({"success": True, "ultimoCodigo": codigo})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# =========================
# ENDPOINTS PROVEEDORES API
# =========================

@app.route("/api/proveedores/guardar", methods=["POST"])
def api_guardar_proveedor():
    """Guardar nuevo proveedor - El código se genera automáticamente"""
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get("razon_social"):
            return jsonify({"success": False, "error": "La razón social es obligatoria"})
        
        if not data.get("ruc"):
            return jsonify({"success": False, "error": "El RUC es obligatorio"})
        
        if len(data.get("ruc", "")) != 11:
            return jsonify({"success": False, "error": "El RUC debe tener 11 dígitos"})
        
        if not data.get("direccion"):
            return jsonify({"success": False, "error": "La dirección es obligatoria"})
        
        # Insertar proveedor (el código se genera automáticamente por el trigger)
        resultado = insertar_proveedor_completo(data)
        
        return jsonify({
            "success": True,
            "data": resultado,
            "message": f'Proveedor creado con código {resultado["codigo_proveedor"]}'
        })
        
    except Exception as e:
        print(f"Error al guardar proveedor: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/proveedores/listar", methods=["GET"])
def api_listar_proveedores():
    """Listar todos los proveedores"""
    try:
        proveedores = obtener_todos_proveedores()
        return jsonify({"success": True, "data": proveedores})
        
    except Exception as e:
        print(f"Error al listar proveedores: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/proveedores", methods=["GET"])
def api_buscar_proveedores():
    """Buscar proveedores con filtros"""
    try:
        busqueda = request.args.get("busqueda", "")
        tipo = request.args.get("tipo_documento", "")
        
        proveedores = obtener_todos_proveedores()
        
        # Aplicar filtros
        if busqueda:
            busqueda_lower = busqueda.lower()
            proveedores = [
                p for p in proveedores 
                if busqueda_lower in p.get("razon_social", "").lower()
                or busqueda_lower in p.get("ruc", "").lower()
                or busqueda_lower in p.get("codigo_proveedor", "").lower()
            ]
        
        return jsonify({"success": True, "data": proveedores})
        
    except Exception as e:
        print(f"Error al buscar proveedores: {e}")
        return jsonify({"success": False, "data": [], "error": str(e)})


@app.route("/api/proveedores/<int:id>", methods=["GET"])
def api_obtener_proveedor(id):
    """Obtener proveedor por ID"""
    try:
        proveedor = obtener_proveedor_por_id(id)
        
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"})
        
        return jsonify({"success": True, "data": proveedor})
        
    except Exception as e:
        print(f"Error al obtener proveedor: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/proveedores/<int:id>", methods=["PUT"])
def api_actualizar_proveedor(id):
    """Actualizar proveedor existente"""
    try:
        data = request.get_json()
        resultado = actualizar_proveedor(id, data)
        return jsonify({"success": True, "data": resultado, "message": "Proveedor actualizado correctamente"})
        
    except Exception as e:
        print(f"Error al actualizar proveedor: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/proveedores/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor(id):
    """Eliminar proveedor (borrado lógico)"""
    try:
        resultado = eliminar_proveedor_db(id)
        return jsonify({"success": True, "data": resultado, "message": "Proveedor eliminado correctamente"})
        
    except Exception as e:
        print(f"Error al eliminar proveedor: {e}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/proveedores/ultimo-codigo", methods=["GET"])
def api_ultimo_codigo_proveedor():
    """Obtener el último código generado de proveedor"""
    try:
        codigo = obtener_ultimo_codigo_proveedor()
        return jsonify({"success": True, "ultimoCodigo": codigo})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# =========================
# ENDPOINT SUNAT CORREGIDO - VERSIÓN DEFINITIVA
# =========================

@app.route("/api/sunat/consulta", methods=["GET"])
def api_consulta_sunat():
    """Consulta a SUNAT usando API de apis.net.pe - VERSIÓN CORREGIDA"""
    
    ruc = request.args.get('ruc', '')
    
    # Log para depuración
    print(f"🔍 Consultando RUC: {ruc}")
    
    if not ruc or len(ruc) != 11:
        return jsonify({'success': False, 'error': 'RUC inválido, debe tener 11 dígitos'})
    
    try:
        # API funcional de apis.net.pe
        url = f'https://api.apis.net.pe/v1/ruc?numero={ruc}'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, timeout=15, headers=headers)
        
        print(f"📡 Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Datos recibidos: {data}")
            
            # IMPORTANTE: La API usa "nombre" no "razonSocial"
            if data and data.get('nombre'):
                return jsonify({
                    'success': True,
                    'razon_social': data.get('nombre', ''),
                    'nombre_comercial': data.get('nombre', ''),
                    'direccion': data.get('direccion', ''),
                    'estado': data.get('estado', ''),
                    'condicion': data.get('condicion', ''),
                    'distrito': data.get('distrito', ''),
                    'provincia': data.get('provincia', ''),
                    'departamento': data.get('departamento', ''),
                    'ubigeo': data.get('ubigeo', '')
                })
            else:
                return jsonify({'success': False, 'error': 'No se encontraron datos para este RUC'})
                
        elif response.status_code == 404:
            return jsonify({'success': False, 'error': 'RUC no encontrado en SUNAT'})
        else:
            return jsonify({'success': False, 'error': f'Error en la consulta: Código {response.status_code}'})
            
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'Tiempo de espera agotado. Intente nuevamente.'})
    except requests.exceptions.ConnectionError:
        return jsonify({'success': False, 'error': 'Error de conexión. Verifique su internet.'})
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)})


# =========================
# ENDPOINTS PRODUCTOS API - CORREGIDO
# =========================

@app.route("/api/productos/buscar", methods=["GET"])
def api_buscar_productos():
    """Buscar productos por código o descripción"""
    try:
        q = request.args.get('q', '').strip()
        print(f"🔎 Buscando productos con: '{q}'")
        
        if not q or len(q) < 1:
            return jsonify({'success': True, 'data': []})
        
        # Configuración de Supabase
        _a = base64.b64decode('cG9zdGdyZXNxbDovLy9wb3N0Z3Jlcy50a2Ztd3ZzZW52Z3B5ZXh2ZGNhdDphZG1pbjM1NjE5NjdrY2ZAYXdzLTEtdXMtZWFzdC0xLnBvb2xlci5zdXBhYmFzZS5jb206NjU0My9wb3N0Z3Jlcw==').decode('utf-8')
        
        from sqlalchemy import create_engine, text
        engine = create_engine(_a)
        
        with engine.connect() as conn:
            # Consulta sin la columna que no existe (precio_costo)
            query = text("""
                SELECT id, codigo, descripcion, marca, modelo, stock
                FROM productos 
                WHERE codigo ILIKE :q OR descripcion ILIKE :q
                ORDER BY codigo
                LIMIT 20
            """)
            result = conn.execute(query, {"q": f'%{q}%'})
            
            productos = []
            for row in result:
                productos.append({
                    'id': row[0],
                    'codigo': row[1] or '',
                    'descripcion': row[2] or '',
                    'marca': row[3] or '',
                    'modelo': row[4] or '',
                    'stock': row[5] or 0,
                    'costo_unitario': 0,  # Valor por defecto
                    'unidad': 'und'
                })
        
        print(f"✅ Encontrados {len(productos)} productos")
        return jsonify({'success': True, 'data': productos})
        
    except Exception as e:
        print(f"❌ Error en api_buscar_productos: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route("/api/productos", methods=["GET"])
def api_listar_productos():
    """Listar todos los productos"""
    try:
        # Configuración de Supabase
        _a = base64.b64decode('cG9zdGdyZXNxbDovLy9wb3N0Z3Jlcy50a2Ztd3ZzZW52Z3B5ZXh2ZGNhdDphZG1pbjM1NjE5NjdrY2ZAYXdzLTEtdXMtZWFzdC0xLnBvb2xlci5zdXBhYmFzZS5jb206NjU0My9wb3N0Z3Jlcw==').decode('utf-8')
        
        from sqlalchemy import create_engine, text
        engine = create_engine(_a)
        
        with engine.connect() as conn:
            query = text("""
                SELECT id, codigo, descripcion, marca, modelo, stock
                FROM productos 
                ORDER BY codigo
                LIMIT 100
            """)
            result = conn.execute(query)
            
            productos = []
            for row in result:
                productos.append({
                    'id': row[0],
                    'codigo': row[1] or '',
                    'descripcion': row[2] or '',
                    'marca': row[3] or '',
                    'modelo': row[4] or '',
                    'stock': row[5] or 0,
                    'costo_unitario': 0
                })
        
        return jsonify({'success': True, 'data': productos})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/compras")
def gestor_compras_directo():
    try:
        return render_template("compras.html")
    except Exception as e:
        return f"Error al cargar template: {str(e)}", 500

        @app.route("/test_compras")
        def test_compras():
         return "Funciona!"


# =========================
# Ejecutar
# =========================
if __name__ == "__main__":

    host = "0.0.0.0"
    port = 5000

    print(f"🚀 Servidor corriendo en:")
    print(f"👉 http://localhost:{port}")
    print(f"👉 http://127.0.0.1:{port}")
    print(f"\n📋 Rutas disponibles:")
    print(f"   - Cotizaciones: http://localhost:{port}/cotizacion")
    print(f"   - Gestor Compras: http://localhost:{port}/gestor_compras")
    print(f"   - Crear Compra: http://localhost:{port}/crear_compra")

    app.run(
        debug=True,
        host=host,
        port=port
    )