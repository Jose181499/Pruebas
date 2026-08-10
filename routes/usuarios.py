# routes/usuarios.py
from flask import Blueprint, render_template, request, jsonify, session
from database import db_query, db_execute, db_tx
from psycopg2.extras import RealDictCursor

# ============================================================
# BLUEPRINT
# ============================================================
usuarios_bp = Blueprint('usuarios', __name__)

# ============================================================
# PÁGINA HTML
# ============================================================
@usuarios_bp.route('/usuarios')
def usuarios_page():
    return render_template('usuarios.html')

# ============================================================
# OBTENER USUARIOS (CON ORDEN PERSONALIZADO)
# ============================================================
@usuarios_bp.route('/api/config/usuarios', methods=['GET'])
def get_usuarios():
    """Obtener todos los usuarios con sus empresas y roles"""
    try:
        # ✅ CONSULTA CON NOMBRES DE TABLAS CORRECTOS
        usuarios = db_query("""
            SELECT 
                u.id,
                u.usuario_sistema,
                u.nombre_completo,
                u.email,
                u.area,
                u.estado,
                u.created_at,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'empresa_id', e.id,
                            'empresa_codigo', e.codigo,
                            'empresa_nombre', e.nombre_comercial,
                            'rol_codigo', uer.rol_codigo,
                            'rol_nombre', r.nombre
                        )
                    ), '[]'::json)
                    FROM usuarios_empresas ue
                    JOIN empresas e ON e.id = ue.empresa_id
                    LEFT JOIN usuarios_empresas_roles uer ON uer.usuario_empresa_id = ue.id
                    LEFT JOIN roles r ON r.codigo = uer.rol_codigo
                    WHERE ue.usuario_id = u.id AND ue.estado = 'activo'
                ) as empresas_acceso
            FROM usuarios u
            WHERE u.estado = 'activo'
            ORDER BY 
                CASE 
                    WHEN u.nombre_completo = 'ANTONY GAMONAL' THEN 1
                    WHEN u.nombre_completo = 'ERIKA DE LA CRUZ' THEN 2
                    WHEN u.nombre_completo = 'HELLEN BLAS PRINCIPE' THEN 3
                    WHEN u.nombre_completo = 'ESTRELLA SANTOS' THEN 4
                    WHEN u.nombre_completo = 'LUIS' THEN 5
                    WHEN u.nombre_completo = 'DESPACHO' THEN 6
                    ELSE 999
                END ASC,
                u.nombre_completo ASC
        """)
        
        return jsonify({
            'success': True,
            'data': usuarios,
            'total': len(usuarios)
        })
        
    except Exception as e:
        print(f"❌ Error en get_usuarios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# OBTENER UN USUARIO
# ============================================================
@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['GET'])
def get_usuario(usuario_id):
    try:
        usuario = db_query("""
            SELECT 
                u.id,
                u.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                u.area,
                u.correo,
                u.celular,
                u.estado,
                u.created_at,
                u.updated_at
            FROM usuarios u
            WHERE u.id = %s AND u.estado = 'activo'
        """, (usuario_id,))
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        return jsonify({'success': True, 'data': usuario[0]})
    except Exception as e:
        print(f"❌ Error en get_usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# CREAR USUARIO
# ============================================================
@usuarios_bp.route('/api/config/usuarios', methods=['POST'])
def create_usuario():
    try:
        data = request.get_json()
        
        if not data.get('auth_user_id') or not data.get('usuario_sistema'):
            return jsonify({'success': False, 'error': 'auth_user_id y usuario_sistema son requeridos'}), 400
        
        with db_tx() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                INSERT INTO usuarios (
                    auth_user_id, usuario_sistema, nombres_apellidos,
                    area, correo, celular, estado
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('auth_user_id'),
                data.get('usuario_sistema'),
                data.get('nombres_apellidos'),
                data.get('area'),
                data.get('correo'),
                data.get('celular'),
                data.get('estado', 'activo')
            ))
            
            usuario_id = cur.fetchone()['id']
            
            empresas_acceso = data.get('empresas_acceso', [])
            for acceso in empresas_acceso:
                if acceso.get('empresa_id') and acceso.get('rol_id'):
                    cur.execute("""
                        INSERT INTO erp_usuario_empresas (
                            auth_user_id, empresa_id, rol_id,
                            es_empresa_principal, estado
                        ) VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (auth_user_id, empresa_id) 
                        DO UPDATE SET rol_id = EXCLUDED.rol_id, estado = EXCLUDED.estado
                    """, (
                        data.get('auth_user_id'),
                        acceso.get('empresa_id'),
                        acceso.get('rol_id'),
                        acceso.get('es_empresa_principal', False),
                        acceso.get('estado', 'activo')
                    ))
            
            return jsonify({
                'success': True,
                'data': {'id': usuario_id},
                'message': 'Usuario creado exitosamente'
            })
    except Exception as e:
        print(f"❌ Error en create_usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ACTUALIZAR USUARIO
# ============================================================
@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['PUT'])
def update_usuario(usuario_id):
    try:
        data = request.get_json()
        
        with db_tx() as conn:
            cur = conn.cursor()
            cur.execute("""
                UPDATE usuarios SET
                    usuario_sistema = %s,
                    nombres_apellidos = %s,
                    area = %s,
                    correo = %s,
                    celular = %s,
                    estado = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                data.get('usuario_sistema'),
                data.get('nombres_apellidos'),
                data.get('area'),
                data.get('correo'),
                data.get('celular'),
                data.get('estado', 'activo'),
                usuario_id
            ))
            
            return jsonify({
                'success': True,
                'message': 'Usuario actualizado exitosamente'
            })
    except Exception as e:
        print(f"❌ Error en update_usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ELIMINAR USUARIO
# ============================================================
@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['DELETE'])
def delete_usuario(usuario_id):
    try:
        db_execute("""
            UPDATE usuarios SET estado = 'inactivo', updated_at = NOW()
            WHERE id = %s
        """, (usuario_id,))
        
        return jsonify({
            'success': True,
            'message': 'Usuario desactivado exitosamente'
        })
    except Exception as e:
        print(f"❌ Error en delete_usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# OBTENER ROLES
# ============================================================
@usuarios_bp.route('/api/config/roles', methods=['GET'])
def get_roles():
    try:
        roles = db_query("""
            SELECT 
                r.id,
                r.codigo,
                r.nombre,
                r.descripcion,
                r.es_admin,
                r.estado,
                r.created_at,
                r.updated_at
            FROM roles r
            WHERE r.estado = 'activo'
            ORDER BY r.nombre
        """)
        
        if roles:
            return jsonify({'success': True, 'data': roles, 'total': len(roles)})
        else:
            return jsonify({
                'success': True,
                'data': [
                    {'codigo': 'GERENCIA_TOTAL', 'nombre': 'Gerencia total', 'es_admin': True},
                    {'codigo': 'OPERATIVO_COMERCIAL_LOGISTICA', 'nombre': 'Operativo comercial/logística', 'es_admin': False},
                    {'codigo': 'LECTURA_TI', 'nombre': 'Practicante TI / lectura', 'es_admin': False}
                ],
                'total': 3,
                'message': 'Usando roles por defecto'
            })
    except Exception as e:
        print(f"❌ Error en get_roles: {e}")
        return jsonify({
            'success': True,
            'data': [
                {'codigo': 'GERENCIA_TOTAL', 'nombre': 'Gerencia total', 'es_admin': True},
                {'codigo': 'OPERATIVO_COMERCIAL_LOGISTICA', 'nombre': 'Operativo comercial/logística', 'es_admin': False},
                {'codigo': 'LECTURA_TI', 'nombre': 'Practicante TI / lectura', 'es_admin': False}
            ],
            'total': 3,
            'message': 'Usando roles por defecto'
        }), 200