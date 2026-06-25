from flask import Blueprint, request, jsonify
import requests
from database import buscar_clientes, obtener_cliente_completo_por_id,db_tx,obtener_clientes,db_execute

clientes_bp = Blueprint("clientes", __name__)

@clientes_bp.route("/api/clientes/buscar")
def api_buscar_clientes():
    try:
        busqueda = request.args.get('busqueda', '').strip()
        q = request.args.get('q', '').strip()
        busqueda = busqueda or q
        tipo_documento = request.args.get('tipo_documento', '')

        data = obtener_clientes()
        data.sort(key=lambda c: c.get('id', 0), reverse=True)

        # Aplanar contacto principal a la raíz
        for c in data:
            contactos = c.get('contactos', [])
            contacto = next((x for x in contactos if x.get('principal')), contactos[0] if contactos else {})
            c['nombre_contacto'] = contacto.get('nombre_contacto', '')
            c['email_contacto'] = contacto.get('email', '')
            c['telefono_contacto'] = contacto.get('telefono', '')

        if busqueda:
            busqueda_lower = busqueda.lower()
            data = [
                c for c in data if (
                    (c.get('numero_documento') and busqueda_lower in str(c.get('numero_documento', '')).lower()) or
                    (c.get('razon_social') and busqueda_lower in str(c.get('razon_social', '')).lower()) or
                    (c.get('nombre_comercial') and busqueda_lower in str(c.get('nombre_comercial', '')).lower()) or
                    (c.get('codigo_cliente') and busqueda_lower in str(c.get('codigo_cliente', '')).lower()) or
                    (c.get('nombre_contacto') and busqueda_lower in str(c.get('nombre_contacto', '')).lower())
                )
            ]

        if tipo_documento:
            data = [c for c in data if c.get('tipo_documento') == tipo_documento]

        return jsonify({
            "success": True,
            "data": data
        })

    except Exception as e:
        print("🔥 ERROR en búsqueda de clientes:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@clientes_bp.route("/api/clientes/<int:cliente_id>")
def api_cliente_por_id(cliente_id):
    data = obtener_cliente_completo_por_id(cliente_id)

    if not data:
        return jsonify({"success": False, "error": "Cliente no encontrado"}), 404

    return jsonify({
        "success": True,
        "data": data
    })
@clientes_bp.route("/api/clientes/guardar", methods=["POST"])
def guardar_cliente():
    data = request.get_json()

    try:
        tipo_documento = data.get("tipo_documento")
        numero_documento = data.get("numero_documento")
        razon_social = data.get("razon_social")
        direccion = data.get("direccion_fiscal")
        nombre_comercial = data.get("nombre_comercial")

        if not tipo_documento or not numero_documento or not razon_social:
            return jsonify({
                "success": False,
                "error": "Campos obligatorios faltantes"
            }), 400

        # =========================================
        # LIMPIAR PRINCIPALES
        # =========================================
        def limpiar_principales(lista):
            encontrado = False
            for item in lista:
                if item.get("principal") and not encontrado:
                    encontrado = True
                else:
                    item["principal"] = False
            return lista

        contactos = limpiar_principales(data.get("contactos", []))
        puntos = limpiar_principales(data.get("puntos_entrega", []))

        with db_tx() as conn:
            cur = conn.cursor()

            # Validar duplicado
            cur.execute("SELECT id FROM clientes WHERE numero_documento = %s", (numero_documento,))
            if cur.fetchone():
                return jsonify({
                    "success": False,
                    "error": "El cliente ya existe"
                }), 400

            # =========================================
            # INSERTAR CLIENTE
            # =========================================
            cur.execute("""
                INSERT INTO clientes (
                    tipo_documento, numero_documento, razon_social,
                    nombre_comercial, direccion_fiscal
                ) VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (tipo_documento, numero_documento, razon_social, nombre_comercial, direccion))

            cliente_id = cur.fetchone()[0]

            # =========================================
            # INSERTAR CONTACTOS
            # =========================================
            for c in contactos:
                cur.execute("""
                    INSERT INTO clientes_contactos (
                        cliente_id, nombre_contacto, cargo, email, telefono, principal
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    c.get("nombre_contacto"),
                    c.get("cargo"),
                    c.get("email"),
                    c.get("telefono"),
                    c.get("principal", False)
                ))

            # MARTIN ERES UNA MAQUINA , DE MAQUINAS UN CRACK =========================================
            # INSERTAR NUEVOS PUNTOS DE ENTREGA
            # =========================================
            for p in puntos:
                nombre_punto = p.get("nombre_punto") or p.get("nombre") or p.get("edit_nombre_punto") or ""
                if not nombre_punto.strip():
                    continue

                telefono = (
                    p.get("telefono") or 
                    p.get("telefono_punto") or 
                    p.get("telefono_contacto") or 
                    p.get("edit_telefono_punto") or 
                    ""
                )

                cur.execute("""
                    INSERT INTO clientes_puntos_entrega (
                        cliente_id, nombre_punto, direccion, responsable, telefono_contacto,
                        principal, condicion_pago, tiempo_credito
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cliente_id,
                    nombre_punto.strip(),
                    p.get("direccion") or p.get("edit_direccion") or "",
                    p.get("responsable") or p.get("edit_responsable") or "",
                    telefono.strip(),
                    bool(p.get("principal")),
                    p.get("condicion_pago") or "Contado",
                    p.get("tiempo_credito") or ""
                ))

        return jsonify({
            "success": True,
            "message": "Cliente guardado correctamente",
            "cliente_id": cliente_id
        })

    except Exception as e:
        import traceback
        print("🔥 ERROR al guardar cliente:")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
# =========================================
# EDITAR CLIENTE
# =========================================
@clientes_bp.route('/api/clientes/<int:id>', methods=['PUT'])
def editar_cliente(id):
    data = request.get_json()

    try:
        with db_tx() as conn:
            cur = conn.cursor()

            # =========================================
            # ACTUALIZAR DATOS BÁSICOS DEL CLIENTE
            # =========================================
            cur.execute("""
                UPDATE clientes
                SET tipo_documento = %s,
                    numero_documento = %s,
                    razon_social = %s,
                    nombre_comercial = %s,
                    direccion_fiscal = %s
                WHERE id = %s
            """, (
                data.get('tipo_documento'),
                data.get('numero_documento'),
                data.get('razon_social'),
                data.get('nombre_comercial'),
                data.get('direccion_fiscal'),
                id
            ))

            # =========================================
            # ELIMINAR CONTACTOS Y PUNTOS ANTIGUOS
            # =========================================
            cur.execute("DELETE FROM clientes_contactos WHERE cliente_id = %s", (id,))
            cur.execute("DELETE FROM clientes_puntos_entrega WHERE cliente_id = %s", (id,))

            # =========================================
            # LIMPIAR PRINCIPALES
            # =========================================
            def limpiar_principales(lista):
                encontrado = False
                for item in lista:
                    if item.get("principal") and not encontrado:
                        encontrado = True
                    else:
                        item["principal"] = False
                return lista

            contactos = limpiar_principales(data.get("contactos", []))
            puntos = limpiar_principales(data.get("puntos_entrega", []))

            # =========================================
            # INSERTAR NUEVOS CONTACTOS
            # =========================================
            for c in contactos:
                cur.execute("""
                    INSERT INTO clientes_contactos (
                        cliente_id, nombre_contacto, cargo, email, telefono, principal
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    id,
                    c.get("nombre_contacto"),
                    c.get("cargo"),
                    c.get("email"),
                    c.get("telefono"),
                    c.get("principal", False)
                ))

            # =========================================
            # 5. INSERTAR NUEVOS PUNTOS DE ENTREGA (CORREGIDO)
            # =========================================
            for p in puntos:
                nombre_punto = p.get("nombre_punto") or p.get("nombre") or ""
                if not nombre_punto:
                    continue  # Saltar si no tiene nombre de punto

                # Obtener teléfono (probando diferentes nombres posibles del frontend)
                telefono = (
                    p.get("telefono") or 
                    p.get("telefono_punto") or 
                    p.get("telefono_contacto") or 
                    ""
                )

                cur.execute("""
                    INSERT INTO clientes_puntos_entrega (
                        cliente_id,
                        nombre_punto,
                        direccion,
                        responsable,
                        telefono_contacto,
                        principal,
                        condicion_pago,
                        tiempo_credito
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    id,
                    nombre_punto,
                    p.get("direccion") or p.get("edit_direccion") or "",
                    p.get("responsable") or p.get("edit_responsable") or "",
                    telefono,                          # ← Teléfono corregido
                    p.get("principal", False),
                    p.get("condicion_pago") or "",
                    p.get("tiempo_credito") or ""
                ))

        return jsonify({
            "success": True,
            "message": "Cliente actualizado correctamente"
        })

    except Exception as e:
        import traceback
        print("🔥 ERROR al editar cliente:")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@clientes_bp.route("/api/clientes/<int:cliente_id>", methods=["DELETE"])
def eliminar_cliente(cliente_id):
    try:
        with db_tx() as conn:
            cur = conn.cursor()

            # =========================================
            # ELIMINAR EN ORDEN CORRECTO (hijos primero)
            # =========================================

            # 1. Eliminar contactos
            cur.execute("""
                DELETE FROM clientes_contactos 
                WHERE cliente_id = %s
            """, (cliente_id,))

            # 2. Eliminar puntos de entrega
            cur.execute("""
                DELETE FROM clientes_puntos_entrega 
                WHERE cliente_id = %s
            """, (cliente_id,))

            # 3. Eliminar el cliente
            cur.execute("""
                DELETE FROM clientes 
                WHERE id = %s
            """, (cliente_id,))

            # Verificar si realmente se eliminó
            if cur.rowcount == 0:
                return jsonify({
                    "success": False,
                    "error": "Cliente no encontrado"
                }), 404

        return jsonify({
            "success": True,
            "message": "Cliente eliminado correctamente"
        })

    except Exception as e:
        import traceback
        print("🔥 ERROR al eliminar cliente:")
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    

# =========================================
# BUSCAR CLIENTE POR RUC EXACTO
# =========================================
@clientes_bp.route("/api/clientes/buscar-por-ruc", methods=["GET"])
def buscar_cliente_por_ruc():
    """Buscar cliente exactamente por número de RUC/DNI"""
    try:
        ruc = request.args.get('ruc', '').strip()
        
        if not ruc or len(ruc) < 3:
            return jsonify({
                "success": False, 
                "error": "Debe ingresar un RUC/DNI válido"
            }), 400
        
        from database import db_query
        
        # Buscar cliente por número de documento exacto
        query = """
            SELECT 
                id,
                tipo_documento,
                numero_documento,
                razon_social,
                nombre_comercial,
                direccion_fiscal,
                codigo_cliente,
                telefono_contacto,
                email_contacto,
                nombre_contacto
            FROM clientes
            WHERE activo = TRUE 
            AND numero_documento = %s
            LIMIT 1
        """
        
        clientes = db_query(query, (ruc,))
        
        if clientes and len(clientes) > 0:
            cliente = clientes[0]
            
            # Obtener contactos adicionales si existen
            contactos_query = """
                SELECT nombre_contacto, email, telefono, cargo, principal
                FROM clientes_contactos
                WHERE cliente_id = %s AND activo = TRUE
                ORDER BY principal DESC
            """
            contactos = db_query(contactos_query, (cliente['id'],))
            
            # Obtener puntos de entrega
            puntos_query = """
                SELECT nombre_punto, direccion, telefono_contacto, responsable, condicion_pago, principal
                FROM clientes_puntos_entrega
                WHERE cliente_id = %s AND activo = TRUE
                ORDER BY principal DESC
            """
            puntos = db_query(puntos_query, (cliente['id'],))
            
            return jsonify({
                "success": True,
                "data": {
                    "id": cliente['id'],
                    "tipo_documento": cliente.get('tipo_documento', ''),
                    "numero_documento": cliente.get('numero_documento', ''),
                    "razon_social": cliente.get('razon_social', ''),
                    "nombre_comercial": cliente.get('nombre_comercial', ''),
                    "direccion_fiscal": cliente.get('direccion_fiscal', ''),
                    "codigo_cliente": cliente.get('codigo_cliente', ''),
                    "telefono_contacto": cliente.get('telefono_contacto', ''),
                    "email_contacto": cliente.get('email_contacto', ''),
                    "nombre_contacto": cliente.get('nombre_contacto', ''),
                    "contactos": contactos if contactos else [],
                    "puntos_entrega": puntos if puntos else []
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": "Cliente no encontrado"
            })
            
    except Exception as e:
        import traceback
        print("❌ Error en buscar_cliente_por_ruc:")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
   