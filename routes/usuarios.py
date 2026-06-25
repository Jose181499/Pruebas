# routes/usuarios.py
from flask import Blueprint, render_template, request, jsonify, session
from database import db_query, db_execute, db_tx
from psycopg2.extras import RealDictCursor

# ============================================================
# BLUEPRINT - UN SOLO Blueprint para todo
# ============================================================
usuarios_bp = Blueprint('usuarios', __name__)

# ============================================================
# RUTA PARA LA PÁGINA HTML
# ============================================================
@usuarios_bp.route('/usuarios')
def usuarios_page():
    """Página de usuarios"""
    return render_template('usuarios.html')

# ============================================================
# ENDPOINTS API PARA USUARIOS
# ============================================================

@usuarios_bp.route('/api/config/usuarios', methods=['GET'])
def get_usuarios():
    """Obtener todos los usuarios con sus empresas y roles"""
    try:
        usuarios = db_query("""
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
                u.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', ue.id,
                            'empresa_id', ue.empresa_id,
                            'empresa_codigo', e.codigo,
                            'empresa_nombre', e.nombre_comercial,
                            'es_principal', ue.es_empresa_principal,
                            'estado', ue.estado,
                            'rol_id', ue.rol_id,
                            'rol_codigo', r.codigo,
                            'rol_nombre', r.nombre,
                            'rol_es_admin', r.es_admin
                        )
                    )
                    FROM erp_usuario_empresas ue
                    LEFT JOIN erp_empresas e ON e.id = ue.empresa_id
                    LEFT JOIN erp_roles r ON r.id = ue.rol_id
                    WHERE ue.auth_user_id = u.auth_user_id
                    AND ue.estado = 'activo'
                ) as empresas_acceso
            FROM usuarios u
            WHERE u.estado = 'activo'
            ORDER BY u.usuario_sistema
        """)
        
        return jsonify({
            'success': True,
            'data': usuarios,
            'total': len(usuarios)
        })
        
    except Exception as e:
        print(f"❌ Error en get_usuarios: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['GET'])
def get_usuario(usuario_id):
    """Obtener un usuario específico"""
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
        
        return jsonify({
            'success': True,
            'data': usuario[0]
        })
        
    except Exception as e:
        print(f"❌ Error en get_usuario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@usuarios_bp.route('/api/config/usuarios', methods=['POST'])
def create_usuario():
    """Crear un nuevo usuario con sus asignaciones de empresa y rol"""
    try:
        data = request.get_json()
        
        if not data.get('auth_user_id'):
            return jsonify({'success': False, 'error': 'auth_user_id es requerido'}), 400
        
        if not data.get('usuario_sistema'):
            return jsonify({'success': False, 'error': 'usuario_sistema es requerido'}), 400
        
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


@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['PUT'])
def update_usuario(usuario_id):
    """Actualizar un usuario existente"""
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


@usuarios_bp.route('/api/config/usuarios/<usuario_id>', methods=['DELETE'])
def delete_usuario(usuario_id):
    """Eliminar usuario (borrado lógico)"""
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


@usuarios_bp.route('/api/config/roles', methods=['GET'])
def get_roles():
    """Obtener todos los roles"""
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
            FROM erp_roles r
            WHERE r.estado = 'activo'
            ORDER BY r.nombre
        """)
        
        if roles:
            return jsonify({
                'success': True,
                'data': roles,
                'total': len(roles)
            })
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