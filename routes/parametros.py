# routes/integracion.py
from flask import Blueprint, render_template, request, jsonify, session
from database import db_query, db_execute, db_tx
from psycopg2.extras import RealDictCursor
import json

# ============================================================
# BLUEPRINT - UN SOLO Blueprint para todo
# ============================================================
integracion_bp = Blueprint('integracion', __name__)

# ============================================================
# RUTA PARA LA PÁGINA HTML
# ============================================================
@integracion_bp.route('/integracion')
def integracion_page():
    """Página de integración"""
    return render_template('integracion.html')

# ============================================================
# ENDPOINTS API PARA INTEGRACIÓN
# ============================================================

@integracion_bp.route('/api/config/modulos', methods=['GET'])
def get_modulos():
    """Obtener todos los módulos con sus submódulos"""
    try:
        modulos = db_query("""
            SELECT 
                m.id,
                m.orden,
                m.codigo,
                m.nombre,
                m.descripcion,
                m.estado,
                m.created_at,
                m.updated_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', s.id,
                            'orden', s.orden,
                            'codigo', s.codigo,
                            'nombre', s.nombre,
                            'descripcion', s.descripcion,
                            'estado', s.estado
                        ) ORDER BY s.orden
                    )
                    FROM erp_submodulos s
                    WHERE s.modulo_id = m.id
                    AND s.estado = 'activo'
                ) as submodulos
            FROM erp_modulos m
            WHERE m.estado = 'activo'
            ORDER BY m.orden
        """)
        
        return jsonify({
            'success': True,
            'data': modulos,
            'total': len(modulos)
        })
        
    except Exception as e:
        print(f"❌ Error en get_modulos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@integracion_bp.route('/api/config/submodulos', methods=['GET'])
def get_submodulos():
    """Obtener todos los submódulos"""
    try:
        submodulos = db_query("""
            SELECT 
                s.id,
                s.codigo,
                s.nombre,
                s.descripcion,
                m.codigo as modulo_codigo,
                m.nombre as modulo_nombre,
                m.orden as modulo_orden
            FROM erp_submodulos s
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE s.estado = 'activo' AND m.estado = 'activo'
            ORDER BY m.orden, s.orden
        """)
        
        return jsonify({
            'success': True,
            'data': submodulos
        })
        
    except Exception as e:
        print(f"❌ Error en get_submodulos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@integracion_bp.route('/api/config/usuarios/<usuario_id>/permisos', methods=['GET'])
def get_usuario_permisos(usuario_id):
    """Obtener los permisos de un usuario en una empresa específica"""
    try:
        empresa_id = request.args.get('empresa_id')
        
        if not empresa_id:
            return jsonify({'success': False, 'error': 'empresa_id es requerido'}), 400
        
        usuario = db_query("""
            SELECT auth_user_id FROM usuarios WHERE id = %s
        """, (usuario_id,))
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        auth_user_id = usuario[0]['auth_user_id']
        
        permisos = db_query("""
            SELECT 
                up.id,
                up.auth_user_id,
                up.empresa_id,
                up.submodulo_id,
                s.codigo as submodulo_codigo,
                s.nombre as submodulo_nombre,
                m.codigo as modulo_codigo,
                m.nombre as modulo_nombre,
                up.puede_ver,
                up.puede_crear,
                up.puede_editar,
                up.puede_aprobar,
                up.puede_anular,
                up.puede_eliminar,
                up.puede_exportar,
                up.puede_subir_evidencia,
                up.observacion,
                up.created_at,
                up.updated_at
            FROM erp_usuario_permisos up
            JOIN erp_submodulos s ON s.id = up.submodulo_id
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE up.auth_user_id = %s
            AND up.empresa_id = %s
            ORDER BY m.orden, s.orden
        """, (auth_user_id, empresa_id))
        
        submodulos = db_query("""
            SELECT 
                s.id,
                s.codigo,
                s.nombre,
                m.codigo as modulo_codigo,
                m.nombre as modulo_nombre
            FROM erp_submodulos s
            JOIN erp_modulos m ON m.id = s.modulo_id
            WHERE s.estado = 'activo'
            ORDER BY m.orden, s.orden
        """)
        
        return jsonify({
            'success': True,
            'data': {
                'permisos': permisos,
                'submodulos': submodulos
            }
        })
        
    except Exception as e:
        print(f"❌ Error en get_usuario_permisos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@integracion_bp.route('/api/config/usuarios/<usuario_id>/permisos', methods=['POST'])
def update_usuario_permisos(usuario_id):
    """Actualizar los permisos de un usuario en una empresa"""
    try:
        data = request.get_json()
        empresa_id = data.get('empresa_id')
        permisos = data.get('permisos', [])
        
        if not empresa_id:
            return jsonify({'success': False, 'error': 'empresa_id es requerido'}), 400
        
        usuario = db_query("""
            SELECT auth_user_id FROM usuarios WHERE id = %s
        """, (usuario_id,))
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        auth_user_id = usuario[0]['auth_user_id']
        
        with db_tx() as conn:
            cur = conn.cursor()
            
            cur.execute("""
                DELETE FROM erp_usuario_permisos 
                WHERE auth_user_id = %s AND empresa_id = %s
            """, (auth_user_id, empresa_id))
            
            for permiso in permisos:
                submodulo_id = permiso.get('submodulo_id')
                if not submodulo_id:
                    continue
                
                cur.execute("""
                    INSERT INTO erp_usuario_permisos (
                        auth_user_id, empresa_id, submodulo_id,
                        puede_ver, puede_crear, puede_editar,
                        puede_aprobar, puede_anular, puede_eliminar,
                        puede_exportar, puede_subir_evidencia,
                        observacion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    auth_user_id,
                    empresa_id,
                    submodulo_id,
                    permiso.get('puede_ver', False),
                    permiso.get('puede_crear', False),
                    permiso.get('puede_editar', False),
                    permiso.get('puede_aprobar', False),
                    permiso.get('puede_anular', False),
                    permiso.get('puede_eliminar', False),
                    permiso.get('puede_exportar', False),
                    permiso.get('puede_subir_evidencia', False),
                    permiso.get('observacion', '')
                ))
        
        return jsonify({
            'success': True,
            'message': 'Permisos actualizados exitosamente'
        })
        
    except Exception as e:
        print(f"❌ Error en update_usuario_permisos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@integracion_bp.route('/api/config/auditoria', methods=['GET'])
def get_auditoria():
    """Obtener registros de auditoría"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        empresa_id = request.args.get('empresa_id')
        tabla = request.args.get('tabla')
        accion = request.args.get('accion')
        
        query = """
            SELECT 
                a.id,
                a.empresa_id,
                e.codigo as empresa_codigo,
                a.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                a.tabla,
                a.registro_id,
                a.accion,
                a.data_anterior,
                a.data_nueva,
                a.created_at
            FROM erp_auditoria a
            LEFT JOIN erp_empresas e ON e.id = a.empresa_id
            LEFT JOIN usuarios u ON u.auth_user_id = a.auth_user_id
            WHERE 1=1
        """
        params = []
        
        if empresa_id:
            query += " AND a.empresa_id = %s"
            params.append(empresa_id)
        
        if tabla:
            query += " AND a.tabla = %s"
            params.append(tabla)
        
        if accion:
            query += " AND a.accion = %s"
            params.append(accion)
        
        query += " ORDER BY a.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        auditoria = db_query(query, params)
        
        return jsonify({
            'success': True,
            'data': auditoria,
            'total': len(auditoria),
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        print(f"❌ Error en get_auditoria: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


def registrar_auditoria(empresa_id, auth_user_id, tabla, registro_id, accion, data_anterior=None, data_nueva=None):
    """Función auxiliar para registrar auditoría"""
    try:
        db_execute("""
            INSERT INTO erp_auditoria (
                empresa_id, auth_user_id, tabla, registro_id,
                accion, data_anterior, data_nueva
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            empresa_id,
            auth_user_id,
            tabla,
            registro_id,
            accion,
            json.dumps(data_anterior) if data_anterior else None,
            json.dumps(data_nueva) if data_nueva else None
        ))
    except Exception as e:
        print(f"❌ Error en registrar_auditoria: {e}")


@integracion_bp.route('/api/config/session', methods=['GET'])
def get_session_info():
    """Obtener información de la sesión actual"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'No autenticado'}), 401
        
        usuario = db_query("""
            SELECT 
                u.id,
                u.auth_user_id,
                u.usuario_sistema,
                u.nombres_apellidos,
                u.area,
                u.correo,
                (
                    SELECT json_agg(
                        json_build_object(
                            'empresa_id', ue.empresa_id,
                            'empresa_codigo', e.codigo,
                            'empresa_nombre', e.nombre_comercial,
                            'rol_id', ue.rol_id,
                            'rol_codigo', r.codigo,
                            'rol_nombre', r.nombre,
                            'es_admin', r.es_admin,
                            'es_principal', ue.es_empresa_principal
                        )
                    )
                    FROM erp_usuario_empresas ue
                    LEFT JOIN erp_empresas e ON e.id = ue.empresa_id
                    LEFT JOIN erp_roles r ON r.id = ue.rol_id
                    WHERE ue.auth_user_id = u.auth_user_id
                    AND ue.estado = 'activo'
                ) as empresas_acceso
            FROM usuarios u
            WHERE u.id = %s AND u.estado = 'activo'
        """, (user_id,))
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'data': usuario[0]
        })
        
    except Exception as e:
        print(f"❌ Error en get_session_info: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500