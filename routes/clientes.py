from flask import Blueprint, request, jsonify
from database import buscar_clientes, obtener_cliente_completo_por_id,db_tx,obtener_clientes,db_execute

clientes_bp = Blueprint("clientes", __name__)

@clientes_bp.route("/api/clientes/buscar")
def api_buscar_clientes():
    try:
        # Obtener parámetros de búsqueda
        busqueda = request.args.get('busqueda', '').strip()
        tipo_documento = request.args.get('tipo_documento', '')

        # Obtener todos los clientes primero
        data = obtener_clientes()

        # ✅ Agregar esta línea:
        data.sort(key=lambda c: c.get('id', 0), reverse=True)

        # Aplicar filtros si hay búsqueda
        if busqueda:
            busqueda = busqueda.lower()
            data = [
                c for c in data if (
                    (c.get('numero_documento') and busqueda in str(c.get('numero_documento', '')).lower()) or
                    (c.get('razon_social') and busqueda in str(c.get('razon_social', '')).lower()) or
                    (c.get('nombre_comercial') and busqueda in str(c.get('nombre_comercial', '')).lower()) or
                    (c.get('codigo_cliente') and busqueda in str(c.get('codigo_cliente', '')).lower())
                )
            ]

        # Filtrar por tipo de documento si se envía
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
                        departamento,
                        provincia,
                        distrito,
                        responsable,
                        telefono_contacto,
                        principal,
                        condicion_pago,
                        tiempo_credito
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    id,
                    nombre_punto,
                    p.get("direccion") or p.get("edit_direccion") or "",
                    p.get("departamento") or p.get("edit_departamento") or "",
                    p.get("provincia") or p.get("edit_provincia") or "",
                    p.get("distrito") or p.get("edit_distrito") or "",
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

   