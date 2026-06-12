from flask import Blueprint, request, jsonify, session
from functools import wraps
from database import obtener_transportistas, obtener_transportista_por_id, insertar_transportista, actualizar_transportista, eliminar_transportista_db

transportistas_bp = Blueprint('transportistas', __name__, url_prefix='/api/transportistas')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return jsonify({'success': False, 'error': 'No autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# API ENDPOINTS
# ==========================================

@transportistas_bp.route('', methods=['GET'])
@login_required
def listar_transportistas():
    """Listar todos los transportistas"""
    try:
        transportistas = obtener_transportistas()
        return jsonify({
            'success': True,
            'data': transportistas
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@transportistas_bp.route('/<int:transportista_id>', methods=['GET'])
@login_required
def obtener_transportista(transportista_id):
    """Obtener transportista por ID"""
    try:
        transportista = obtener_transportista_por_id(transportista_id)
        if transportista:
            return jsonify({'success': True, 'data': transportista})
        return jsonify({'success': False, 'error': 'Transportista no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@transportistas_bp.route('', methods=['POST'])
@login_required
def crear_transportista():
    """Crear nuevo transportista"""
    try:
        data = request.get_json()
        transportista_id = insertar_transportista(data)
        if transportista_id:
            return jsonify({
                'success': True,
                'message': 'Transportista creado correctamente',
                'id': transportista_id
            })
        return jsonify({'success': False, 'error': 'Error al crear transportista'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@transportistas_bp.route('/<int:transportista_id>', methods=['PUT'])
@login_required
def actualizar_transportista_route(transportista_id):
    """Actualizar transportista"""
    try:
        data = request.get_json()
        if actualizar_transportista(transportista_id, data):
            return jsonify({'success': True, 'message': 'Transportista actualizado correctamente'})
        return jsonify({'success': False, 'error': 'Error al actualizar'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@transportistas_bp.route('/<int:transportista_id>', methods=['DELETE'])
@login_required
def eliminar_transportista(transportista_id):
    """Eliminar transportista"""
    try:
        if eliminar_transportista_db(transportista_id):
            return jsonify({'success': True, 'message': 'Transportista eliminado correctamente'})
        return jsonify({'success': False, 'error': 'Error al eliminar'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500