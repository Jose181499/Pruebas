import os
import sys
import requests
import base64
sys.dont_write_bytecode = True

from flask import (
    Flask, render_template, request, redirect, url_for, session, flash, jsonify
)
from functools import wraps

# ==========================================
# IMPORTS DE BLUEPRINTS - SOLO LOS QUE EXISTEN
# ==========================================

# BLUEPRINTS DE CONFIGURACIÓN Y SEGURIDAD
from routes.empresas import empresas_bp
from routes.usuarios import usuarios_bp
from routes.correlativos import correlativos_bp
from routes.parametros import parametros_bp
from routes.integracion import integracion_bp
from routes.configuracion_seguridad import config_seguridad_bp

# OTROS BLUEPRINTS (para páginas HTML)
from routes.dashboard import dashboard_bp
from routes.productos import productos_bp
from routes.ventas import ventas_bp
from routes.compras import compras_bp
from routes.inventario import inventario_bp
from routes.finanzas import finanzas_bp
from routes.reportes import reportes_bp
from routes.herramientas import herramientas_bp
from routes.papelera import papelera_bp
from routes.configuracion import configuracion_bp

# ==========================================
# IMPORTS DE DATABASE
# ==========================================
from database import (
    verificar_usuario,
    verificar_usuario_supabase,
    insertar_cliente_completo,
    obtener_todos_clientes_con_detalles,
    obtener_cliente_completo_por_id,
    actualizar_cliente_completo,
    eliminar_cliente_db,
    obtener_ultimo_codigo_cliente,
    buscar_clientes_completo,
    insertar_proveedor_completo,
    obtener_todos_proveedores,
    obtener_proveedor_por_id,
    actualizar_proveedor,
    eliminar_proveedor_db,
    obtener_ultimo_codigo_proveedor,
    db_query
)

# ==========================================
# APP CONFIGURACIÓN
# ==========================================
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")

# ==========================================
# REGISTRO DE BLUEPRINTS
# ==========================================

# BLUEPRINTS DE CONFIGURACIÓN Y SEGURIDAD
app.register_blueprint(empresas_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(correlativos_bp)
app.register_blueprint(parametros_bp)
app.register_blueprint(integracion_bp)
app.register_blueprint(config_seguridad_bp)

# OTROS BLUEPRINTS
app.register_blueprint(dashboard_bp)
app.register_blueprint(productos_bp)
app.register_blueprint(ventas_bp)
app.register_blueprint(compras_bp)
app.register_blueprint(inventario_bp)
app.register_blueprint(finanzas_bp)
app.register_blueprint(reportes_bp)
app.register_blueprint(herramientas_bp)
app.register_blueprint(papelera_bp)
app.register_blueprint(configuracion_bp)

# ==========================================
# HELPERS
# ==========================================

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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario_id' not in session:
            flash('Por favor, inicia sesión para acceder.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# RUTAS DE AUTENTICACIÓN
# ==========================================

@app.route("/")
def root():
    if 'usuario_id' in session:
        return redirect(url_for('index'))
    return redirect(url_for('login'))

@app.route("/login", methods=["GET", "POST"])
def login():
    if 'usuario_id' in session:
        return redirect(url_for('index'))

    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()
        password = request.form.get("password", "")
        empresa = request.form.get("empresa", "KCF")

        print(f"🔍 Intentando login - Usuario: '{usuario}', Empresa: '{empresa}'")

        if not usuario or not password:
            flash("Por favor, ingresa usuario y contraseña.", "error")
            return render_template("login.html")

        if '@' in usuario:
            email = usuario
        else:
            try:
                from database import db_query
                user_result = db_query("""
                    SELECT correo FROM usuarios 
                    WHERE usuario_sistema = %s AND estado = 'activo'
                    LIMIT 1
                """, (usuario,))
                if user_result and user_result[0].get('correo'):
                    email = user_result[0]['correo']
                    print(f"✅ Email encontrado para usuario '{usuario}': '{email}'")
                else:
                    email = usuario
            except Exception as e:
                print(f"❌ Error buscando email: {e}")
                email = usuario

        print(f"📧 Email a verificar: '{email}'")

        resultado = verificar_usuario_supabase(email, password, empresa)

        print(f"📋 Resultado del login: {resultado}")

        if resultado and resultado.get('success'):
            session.clear()
            session["usuario_id"] = resultado["user_id"]
            session["usuario"] = resultado["usuario_sistema"]
            session["nombre_completo"] = resultado["nombres_apellidos"] or usuario
            session["rol"] = resultado["rol"]
            session["empresa"] = empresa
            session["auth_user_id"] = resultado["auth_user_id"]
            session.modified = True
            
            print(f"✅ SESIÓN GUARDADA: {dict(session)}")
            flash(f'✅ Bienvenido/a {session["nombre_completo"]}!', "success")
            return redirect(url_for("index"))

        flash(resultado.get('error', '❌ Usuario o contraseña incorrectos.'), "error")
        return render_template("login.html")

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("Has cerrado sesión correctamente.", "info")
    return redirect(url_for("login"))

# ==========================================
# RUTA INDEX (DASHBOARD)
# ==========================================

@app.route("/index")
@login_required
def index():
    """Dashboard principal - Pasar variables de sesión al template"""
    print(f"📋 INDEX - Sesión actual: {dict(session)}")
    return render_template("index.html",
                          nombre=session.get('nombre_completo', 'Usuario'),
                          usuario=session.get('usuario', ''),
                          empresa=session.get('empresa', 'KCF'),
                          rol=session.get('rol', 'usuario'))

# ==========================================
# RUTA DE DEPURACIÓN
# ==========================================

@app.route("/debug/session")
def debug_session():
    """Ver el contenido de la sesión actual"""
    return jsonify({
        'session': dict(session),
        'session_keys': list(session.keys()),
        'is_logged_in': 'usuario_id' in session
    })

# ==========================================
# ENDPOINTS CLIENTES API
# ==========================================

@app.route("/api/clientes/guardar", methods=["POST"])
def api_guardar_cliente():
    try:
        data = request.get_json()
        if not data.get("razon_social"):
            return jsonify({"success": False, "error": "La razón social es obligatoria"})
        if not data.get("numero_documento"):
            return jsonify({"success": False, "error": "El número de documento es obligatorio"})
        
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
    try:
        busqueda = request.args.get('q', request.args.get('busqueda', '')).strip()
        if not busqueda or len(busqueda) < 2:
            return jsonify({"success": True, "data": []})
        
        clientes = buscar_clientes_completo(busqueda, limit=50)
        return jsonify({"success": True, "data": clientes})
    except Exception as e:
        print(f"❌ Error en api_buscar_clientes: {e}")
        return jsonify({"success": False, "error": str(e), "data": []}), 500

@app.route("/api/clientes/<int:cliente_id>", methods=["GET"])
def api_obtener_cliente(cliente_id):
    try:
        cliente = obtener_cliente_completo_por_id(cliente_id)
        if not cliente:
            return jsonify({"success": False, "error": "Cliente no encontrado"})
        return jsonify({"success": True, "data": cliente})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/clientes/<int:cliente_id>/direcciones", methods=["GET"])
def api_obtener_direcciones_cliente(cliente_id):
    try:
        query = """
            SELECT id, direccion, nombre_punto, principal, telefono_contacto
            FROM clientes_puntos_entrega
            WHERE cliente_id = %s
            ORDER BY principal DESC, nombre_punto
        """
        direcciones = db_query(query, (cliente_id,))
        return jsonify({'success': True, 'data': direcciones or []})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500

@app.route("/api/clientes/<int:cliente_id>", methods=["PUT"])
def api_actualizar_cliente(cliente_id):
    try:
        data = request.get_json()
        resultado = actualizar_cliente_completo(cliente_id, data)
        return jsonify({"success": True, "data": resultado, "message": "Cliente actualizado correctamente"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/clientes/<int:cliente_id>", methods=["DELETE"])
def api_eliminar_cliente(cliente_id):
    try:
        resultado = eliminar_cliente_db(cliente_id)
        return jsonify({"success": True, "data": resultado, "message": "Cliente eliminado correctamente"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/clientes/ultimo-codigo", methods=["GET"])
def api_ultimo_codigo():
    try:
        codigo = obtener_ultimo_codigo_cliente()
        return jsonify({"success": True, "ultimoCodigo": codigo})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# ==========================================
# ENDPOINTS PROVEEDORES API
# ==========================================

@app.route("/api/proveedores/guardar", methods=["POST"])
def api_guardar_proveedor():
    try:
        data = request.get_json()
        if not data.get("razon_social"):
            return jsonify({"success": False, "error": "La razón social es obligatoria"})
        if not data.get("ruc"):
            return jsonify({"success": False, "error": "El RUC es obligatorio"})
        
        resultado = insertar_proveedor_completo(data)
        return jsonify({
            "success": True,
            "data": resultado,
            "message": f'Proveedor creado con código {resultado["codigo_proveedor"]}'
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/proveedores/listar", methods=["GET"])
def api_listar_proveedores():
    try:
        proveedores = obtener_todos_proveedores()
        return jsonify({"success": True, "data": proveedores})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/proveedores/<int:id>", methods=["GET"])
def api_obtener_proveedor(id):
    try:
        proveedor = obtener_proveedor_por_id(id)
        if not proveedor:
            return jsonify({"success": False, "error": "Proveedor no encontrado"})
        return jsonify({"success": True, "data": proveedor})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/proveedores/<int:id>", methods=["PUT"])
def api_actualizar_proveedor(id):
    try:
        data = request.get_json()
        resultado = actualizar_proveedor(id, data)
        return jsonify({"success": True, "data": resultado, "message": "Proveedor actualizado correctamente"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/proveedores/<int:id>", methods=["DELETE"])
def api_eliminar_proveedor(id):
    try:
        resultado = eliminar_proveedor_db(id)
        return jsonify({"success": True, "data": resultado, "message": "Proveedor eliminado correctamente"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/proveedores/ultimo-codigo", methods=["GET"])
def api_ultimo_codigo_proveedor():
    try:
        codigo = obtener_ultimo_codigo_proveedor()
        return jsonify({"success": True, "ultimoCodigo": codigo})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# ==========================================
# ENDPOINT SUNAT
# ==========================================

@app.route("/api/sunat/consulta", methods=["GET"])
def api_consulta_sunat():
    ruc = request.args.get('ruc', '')
    if not ruc or len(ruc) != 11:
        return jsonify({'success': False, 'error': 'RUC inválido, debe tener 11 dígitos'})
    
    try:
        url = f'https://api.apis.net.pe/v1/ruc?numero={ruc}'
        headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
        response = requests.get(url, timeout=15, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data and data.get('nombre'):
                return jsonify({
                    'success': True,
                    'razon_social': data.get('nombre', ''),
                    'nombre_comercial': data.get('nombre', ''),
                    'direccion': data.get('direccion', ''),
                    'estado': data.get('estado', ''),
                    'condicion': data.get('condicion', '')
                })
            return jsonify({'success': False, 'error': 'No se encontraron datos para este RUC'})
        return jsonify({'success': False, 'error': f'Error en la consulta: Código {response.status_code}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# ENDPOINTS PRODUCTOS API
# ==========================================

@app.route("/api/productos/buscar", methods=["GET"])
def api_buscar_productos():
    try:
        q = request.args.get('q', '').strip()
        if not q or len(q) < 1:
            return jsonify({'success': True, 'data': []})
        
        _a = base64.b64decode('cG9zdGdyZXNxbDovLy9wb3N0Z3Jlcy50a2Ztd3ZzZW52Z3B5ZXh2ZGNhdDphZG1pbjM1NjE5NjdrY2ZAYXdzLTEtdXMtZWFzdC0xLnBvb2xlci5zdXBhYmFzZS5jb206NjU0My9wb3N0Z3Jlcw==').decode('utf-8')
        from sqlalchemy import create_engine, text
        engine = create_engine(_a)
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, codigo, descripcion, marca, modelo, stock
                FROM productos WHERE codigo ILIKE :q OR descripcion ILIKE :q
                ORDER BY codigo LIMIT 20
            """), {"q": f'%{q}%'})
            
            productos = [{'id': row[0], 'codigo': row[1] or '', 'descripcion': row[2] or '', 
                         'marca': row[3] or '', 'modelo': row[4] or '', 'stock': row[5] or 0} for row in result]
        
        return jsonify({'success': True, 'data': productos})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/productos", methods=["GET"])
def api_listar_productos():
    try:
        _a = base64.b64decode('cG9zdGdyZXNxbDovLy9wb3N0Z3Jlcy50a2Ztd3ZzZW52Z3B5ZXh2ZGNhdDphZG1pbjM1NjE5NjdrY2ZAYXdzLTEtdXMtZWFzdC0xLnBvb2xlci5zdXBhYmFzZS5jb206NjU0My9wb3N0Z3Jlcw==').decode('utf-8')
        from sqlalchemy import create_engine, text
        engine = create_engine(_a)
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, codigo, descripcion, marca, modelo, stock
                FROM productos ORDER BY codigo LIMIT 100
            """))
            
            productos = [{'id': row[0], 'codigo': row[1] or '', 'descripcion': row[2] or '',
                         'marca': row[3] or '', 'modelo': row[4] or '', 'stock': row[5] or 0} for row in result]
        
        return jsonify({'success': True, 'data': productos})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==========================================
# RUTAS DE PÁGINAS PRINCIPALES
# ==========================================

@app.route("/compras")
@login_required
def gestor_compras_directo():
    try:
        return render_template("compras.html")
    except Exception as e:
        return f"Error al cargar template: {str(e)}", 500

# ==========================================
# RUTAS PARA NUEVOS TEMPLATES
# ==========================================

@app.route("/configuracion")
@login_required
def configuracion_page():
    return render_template("configuracion.html")

@app.route("/correlativos")
@login_required
def correlativos_page():
    return render_template("correlativos.html")

@app.route("/finanzas")
@login_required
def finanzas_page():
    return render_template("finanzas.html")

@app.route("/herramientas")
@login_required
def herramientas_page():
    return render_template("herramientas.html")

@app.route("/integracion")
@login_required
def integracion_page():
    return render_template("integracion.html")

@app.route("/inventario")
@login_required
def inventario_page():
    return render_template("inventario.html")

@app.route("/mantenedor")
@login_required
def mantenedor_page():
    return render_template("mantenedor.html")

@app.route("/papelera")
@login_required
def papelera_page():
    return render_template("papelera.html")

@app.route("/parametros")
@login_required
def parametros_page():
    return render_template("parametros.html")

@app.route("/productos")
@login_required
def productos_page():
    return render_template("productos.html")

@app.route("/reportes")
@login_required
def reportes_page():
    return render_template("reportes.html")

@app.route("/ventas")
@login_required
def ventas_page():
    return render_template("ventas.html")

# ==========================================
# EJECUTAR
# ==========================================

if __name__ == "__main__":
    host = "0.0.0.0"
    port = 5000

    print("=" * 60)
    print("🚀 SERVIDOR ERP MULTIEMPRESA INICIADO")
    print("=" * 60)
    print(f"📍 Servidor corriendo en:")
    print(f"   👉 http://localhost:{port}")
    print(f"   👉 http://127.0.0.1:{port}")
    print(f"\n📋 RUTAS PRINCIPALES:")
    print(f"   - Login:      http://localhost:{port}/login")
    print(f"   - Dashboard:  http://localhost:{port}/index")
    print(f"   - Empresas:   http://localhost:{port}/empresas")
    print(f"   - Usuarios:   http://localhost:{port}/usuarios")
    print(f"   - Maestros:   http://localhost:{port}/mantenedor")
    print(f"   - Productos:  http://localhost:{port}/productos")
    print(f"   - Ventas:     http://localhost:{port}/ventas")
    print(f"   - Compras:    http://localhost:{port}/compras")
    print(f"   - Inventario: http://localhost:{port}/inventario")
    print(f"   - Finanzas:   http://localhost:{port}/finanzas")
    print(f"   - Reportes:   http://localhost:{port}/reportes")
    print(f"\n📋 RUTAS DE CONFIGURACIÓN:")
    print(f"   - Correlativos:   http://localhost:{port}/correlativos")
    print(f"   - Parámetros:     http://localhost:{port}/parametros")
    print(f"   - Integración:    http://localhost:{port}/integracion")
    print(f"   - Herramientas:   http://localhost:{port}/herramientas")
    print(f"   - Papelera:       http://localhost:{port}/papelera")
    print("=" * 60)
    print("✅ Servidor listo para recibir peticiones")
    print("=" * 60)

    app.run(debug=True, host=host, port=port)