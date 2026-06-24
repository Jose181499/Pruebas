from flask import Flask, jsonify, request, render_template, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.pool import NullPool
import os
from urllib.parse import quote_plus
from functools import wraps
from datetime import datetime

app = Flask(__name__)

# ==================== CONFIGURACIÓN SUPABASE ====================
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres.tkfmwvsenvgpyexvdcat:admin3561967kcf@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'sb_secret_k56lhPYVINqZMj_BZexRbw_JzeBx8Hx'

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 5,
    'pool_recycle': 300,
    'pool_pre_ping': True,
    'pool_use_lifo': True,
    'connect_args': {
        'connect_timeout': 10,
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5
    }
}

db = SQLAlchemy()
db.init_app(app)

# ==================== IMPORTAR MODELOS ====================
from models.producto import Producto
from models.movimiento_stock import MovimientoStock

# ==================== FUNCIONES DE AUTENTICACIÓN ====================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Por favor, inicia sesión para acceder.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ==================== RUTAS DE AUTENTICACIÓN ====================

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Página de login usando Supabase Auth"""
    if request.method == 'GET':
        return render_template('login.html')
    
    # POST - Procesar login
    try:
        from database import verificar_usuario_supabase
        from flask import request, jsonify
        
        email = request.form.get('usuario', '').strip()
        password = request.form.get('password', '')
        empresa_seleccionada = request.form.get('empresa', 'KCF')
        
        if not email or not password:
            flash('Por favor, ingresa usuario y contraseña.', 'error')
            return render_template('login.html')
        
        # Verificar en Supabase
        resultado = verificar_usuario_supabase(email, password, empresa_seleccionada)
        
        if resultado and resultado.get('success'):
            # Guardar sesión
            session['user_id'] = resultado['user_id']
            session['usuario'] = resultado['usuario_sistema']
            session['nombre_completo'] = resultado['nombres_apellidos']
            session['rol'] = resultado['rol']
            session['empresa'] = empresa_seleccionada
            session['auth_user_id'] = resultado['auth_user_id']
            
            flash(f'✅ Bienvenido {resultado["nombres_apellidos"]}!', 'success')
            
            # Redirigir al dashboard
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
        else:
            flash(resultado.get('error', '❌ Usuario o contraseña incorrectos.'), 'error')
            return render_template('login.html')
            
    except Exception as e:
        print(f"❌ Error en login: {e}")
        flash('❌ Error al conectar con el servidor.', 'error')
        return render_template('login.html')


@app.route('/logout')
def logout():
    """Cerrar sesión"""
    session.clear()
    flash('Has cerrado sesión correctamente.', 'info')
    return redirect(url_for('login'))


@app.route('/index')
@login_required
def index():
    """Dashboard principal"""
    return render_template('index.html', 
                          nombre=session.get('nombre_completo'),
                          usuario=session.get('usuario'),
                          empresa=session.get('empresa'))


@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return redirect(url_for('login'))


# ==================== RUTAS DE CONFIGURACIÓN Y SEGURIDAD ====================
# Importar el blueprint de configuración
from routes.configuracion_seguridad import config_seguridad_bp
app.register_blueprint(config_seguridad_bp)


# ==================== RUTAS API EXISTENTES ====================
# (Todas tus rutas API actuales...)

@app.route('/api/productos', methods=['GET'])
def get_productos():
    # ... tu código existente ...
    pass

# ... resto de tus rutas API ...


# ==================== BLUEPRINTS ====================
from routes.usuarios import usuarios_bp
from routes.cotizaciones import cotizaciones_bp
from routes.mantenedor_productos import productos_bp
from routes.mantenedor_clientes import mantenedor_clientes_bp
from routes.compras import compras_bp
from routes.proveedores import proveedores_bp
from routes.guias_remision import guias_bp

app.register_blueprint(usuarios_bp)
app.register_blueprint(cotizaciones_bp)
app.register_blueprint(productos_bp)
app.register_blueprint(mantenedor_clientes_bp)
app.register_blueprint(compras_bp)
app.register_blueprint(proveedores_bp)
app.register_blueprint(guias_bp)

print("🔵 Blueprints registrados:", list(app.blueprints.keys()))

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Base de datos inicializada")
    app.run(debug=True, host='0.0.0.0', port=5000)