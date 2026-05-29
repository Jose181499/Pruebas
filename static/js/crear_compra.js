// crear_orden_compra.js - COMPLETO Y FUNCIONAL PARA COMPRAS

document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // HELPERS
    // =========================
    const toNum = (v) => {
        const x = Number(String(v ?? '').replace(',', '.'));
        return Number.isFinite(x) ? x : 0;
    };

    function formatCantidad(cant) {
        if (cant === null || cant === undefined) return '0';
        let numero = parseFloat(cant);
        if (isNaN(numero)) return '0';
        if (numero % 1 === 0) return numero.toString();
        return numero.toFixed(3).replace(/\.?0+$/, '');
    }

    // =========================
    // GENERACIÓN DE CÓDIGOS PERSONALIZADOS PARA COMPRAS
    // =========================
    let codigoOrdenActual = '';
    let correlativoActual = 0;
    let usuarioActual = null;
    let esBorrador = true;

    async function obtenerUsuarioActual() {
        try {
            const response = await fetch('/api/usuarios/actual');
            const data = await response.json();
            if (data.success && data.data) {
                usuarioActual = data.data;
                
                const codigoCompradorSpan = document.getElementById('codigo_comprador');
                if (codigoCompradorSpan && usuarioActual.codigo_vendedor) {
                    codigoCompradorSpan.textContent = usuarioActual.codigo_vendedor;
                }
                
                const compradorInput = document.getElementById('comprador_responsable');
                if (compradorInput && usuarioActual.nombre_completo) {
                    compradorInput.value = usuarioActual.nombre_completo;
                    const usuarioIdInput = document.getElementById('usuario_id');
                    const emailContacto = document.getElementById('email_contacto_user');
                    const telefonoUser = document.getElementById('telefono_contacto_user');
                    
                    if (usuarioIdInput) usuarioIdInput.value = usuarioActual.id;
                    if (emailContacto) emailContacto.value = usuarioActual.email || '';
                    if (telefonoUser) telefonoUser.value = usuarioActual.telefono || '';
                }
                
                return usuarioActual;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }

    async function obtenerUltimoCorrelativoCompra(usuarioId) {
        try {
            const response = await fetch(`/api/orden_compra/ultimo-correlativo?usuario_id=${usuarioId}`);
            const data = await response.json();
            if (data.success) {
                correlativoActual = data.correlativo || 0;
                return correlativoActual;
            }
            return 0;
        } catch (error) {
            console.error('Error obteniendo correlativo:', error);
            return 0;
        }
    }

    async function verificarCodigoExiste(codigo) {
        try {
            const response = await fetch(`/api/orden_compra/verificar-codigo?codigo=${encodeURIComponent(codigo)}`);
            const data = await response.json();
            return data.exists === true;
        } catch (error) {
            console.error('Error verificando código:', error);
            return false;
        }
    }

    function generarCodigoTemporal() {
        const fecha = new Date();
        const timestamp = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;
        const codigoComprador = usuarioActual?.codigo_vendedor || 'TMP';
        return `TMP-COMPRA-${codigoComprador}-${timestamp}`;
    }

    async function generarCodigoOficial() {
        if (!usuarioActual) {
            await obtenerUsuarioActual();
        }
        
        if (usuarioActual) {
            await obtenerUltimoCorrelativoCompra(usuarioActual.id);
            let nuevoCorrelativo = correlativoActual + 1;
            let codigoGenerado = null;
            let intentos = 0;
            const maxIntentos = 10;
            
            while (!codigoGenerado && intentos < maxIntentos) {
                const codigoComprador = usuarioActual.codigo_vendedor || `C${String(usuarioActual.id).padStart(3, '0')}`;
                const fecha = new Date();
                const año = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                
                const codigo = `OC-${codigoComprador}-${año}${mes}${dia}-${String(nuevoCorrelativo).padStart(4, '0')}`;
                
                const existe = await verificarCodigoExiste(codigo);
                
                if (!existe) {
                    codigoGenerado = codigo;
                    correlativoActual = nuevoCorrelativo;
                } else {
                    nuevoCorrelativo++;
                }
                intentos++;
            }
            
            if (!codigoGenerado) {
                mostrarNotificacion('Error: No se pudo generar un código único.', 'danger');
                return null;
            }
            
            return codigoGenerado;
        }
        return null;
    }

    function actualizarNumeroOrdenUI(codigo, esBorradorActual = esBorrador) {
        const numeroDiv = document.getElementById('numero_orden');
        const tipoDocSpan = document.getElementById('tipo_documento');
        
        if (numeroDiv && codigo) {
            if (esBorradorActual) {
                numeroDiv.innerHTML = `<span style="font-size: 1rem; color: #f59e0b;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #f59e0b;">⚠️ BORRADOR</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-warning"><i class="bi bi-pencil"></i> BORRADOR</span>';
            } else {
                numeroDiv.innerHTML = `<span style="font-size: 1.2rem; color: #10b981;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #6b7280;">Correlativo: ${correlativoActual}</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-success"><i class="bi bi-check-circle"></i> OFICIAL</span>';
            }
            codigoOrdenActual = codigo;
        }
        
        actualizarEstadoBotonPDF();
    }

    async function inicializarCodigo() {
        await obtenerUsuarioActual();
        esBorrador = true;
        const codigoTemporal = generarCodigoTemporal();
        actualizarNumeroOrdenUI(codigoTemporal, true);
        return codigoTemporal;
    }

    // =========================
    // HABILITAR/DESHABILITAR BOTÓN PDF
    // =========================
    function actualizarEstadoBotonPDF() {
        const btnPdf = document.getElementById('btnPdf');
        const ordenId = document.getElementById('orden_compra_id')?.value;
        
        if (btnPdf) {
            if (ordenId && ordenId !== '' && ordenId !== 'None' && esBorrador === false) {
                btnPdf.disabled = false;
                btnPdf.classList.remove('opacity-50');
            } else {
                btnPdf.disabled = true;
                btnPdf.classList.add('opacity-50');
            }
        }
    }

    // =========================
    // NOTIFICACIONES
    // =========================
    function mostrarNotificacion(mensaje, tipo) {
        const notificacion = document.createElement('div');
        notificacion.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3`;
        notificacion.style.zIndex = '9999';
        notificacion.style.minWidth = '300px';
        notificacion.style.animation = 'slideIn 0.3s ease';
        notificacion.innerHTML = `<i class="bi bi-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${mensaje}`;
        document.body.appendChild(notificacion);
        setTimeout(() => notificacion.remove(), 3000);
    }

    // =========================
    // CONSULTA A SUNAT (PROVEEDORES)
    // =========================
  async function consultarSunat(ruc) {
    try {
        mostrarNotificacion(`🔍 Consultando RUC ${ruc} en SUNAT...`, 'info');
        
        // 🔥 CAMBIO: Usar tu propio backend en lugar de llamar directamente a la API externa
        const response = await fetch(`/api/sunat/consulta_proveedor?ruc=${ruc}`);
        
        if (!response.ok) {
            throw new Error('Error al consultar SUNAT');
        }
        
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                razon_social: data.razon_social || '',
                nombre_comercial: data.nombre_comercial || '',
                direccion: data.direccion || '',
                estado: data.estado || ''
            };
        } else {
            return { success: false, error: data.error || 'No se encontraron datos' };
        }
    } catch (error) {
        console.error('Error consultando SUNAT:', error);
        return { success: false, error: error.message };
    }
}

    async function autocompletarConSunat() {
        const tipoDocumento = document.getElementById('nuevo_tipo_documento')?.value;
        const numeroDocumento = document.getElementById('nuevo_numero_documento')?.value.trim();
        
        if (tipoDocumento !== 'RUC') {
            mostrarNotificacion('⚠️ La búsqueda en SUNAT solo está disponible para RUC', 'warning');
            return;
        }
        
        if (!numeroDocumento || numeroDocumento.length !== 11) {
            mostrarNotificacion('⚠️ Ingrese un RUC válido de 11 dígitos', 'warning');
            return;
        }
        
        const btnBuscar = document.getElementById('btnBuscarSunat');
        const textoOriginal = btnBuscar?.innerHTML;
        if (btnBuscar) {
            btnBuscar.innerHTML = '<i class="bi bi-hourglass-split"></i> Buscando...';
            btnBuscar.disabled = true;
        }
        
        try {
            const resultado = await consultarSunat(numeroDocumento);
            
            if (resultado.success) {
                document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                document.getElementById('nuevo_nombre_comercial').value = resultado.nombre_comercial || '';
                document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                
                mostrarNotificacion('✅ Datos cargados desde SUNAT correctamente', 'success');
            } else {
                mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error al consultar SUNAT', 'danger');
        } finally {
            if (btnBuscar) {
                btnBuscar.innerHTML = textoOriginal;
                btnBuscar.disabled = false;
            }
        }
    }

    // =========================
    // CARGAR DIRECCIONES DEL PROVEEDOR
    // =========================
    async function cargarDireccionesProveedor(proveedorId) {
        const select = document.getElementById('lugar_entrega_select');
        if (!select) return;
        
        while (select.options.length > 2) {
            select.remove(2);
        }
        
        if (!proveedorId || proveedorId === '') return;
        
        try {
            const response = await fetch(`/api/proveedores/${proveedorId}/direcciones`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                result.data.forEach(dir => {
                    const option = document.createElement('option');
                    option.value = dir.direccion;
                    option.textContent = dir.direccion.length > 50 ? dir.direccion.substring(0, 47) + '...' : dir.direccion;
                    if (dir.principal) {
                        option.textContent += ' (Principal)';
                    }
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando direcciones:', error);
        }
    }

    // =========================
    // BOTÓN BUSCAR PROVEEDOR POR RUC
    // =========================
    const btnBuscarProveedorPorRuc = document.getElementById('btnBuscarProveedorPorRuc');
    const buscarRucInput = document.getElementById('buscar_ruc');
    const btnLimpiarProveedor = document.getElementById('btnLimpiarProveedor');

    if (btnBuscarProveedorPorRuc) {
        btnBuscarProveedorPorRuc.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const ruc = buscarRucInput?.value.trim();
            
            if (!ruc) {
                mostrarNotificacion('⚠️ Ingrese un RUC para buscar', 'warning');
                return;
            }
            
            if (ruc.length !== 11) {
                mostrarNotificacion('⚠️ El RUC debe tener 11 dígitos', 'warning');
                return;
            }
            
            mostrarNotificacion('🔍 Consultando SUNAT para RUC: ' + ruc, 'info');
            
            const textoOriginal = btnBuscarProveedorPorRuc.innerHTML;
            btnBuscarProveedorPorRuc.innerHTML = '<i class="bi bi-hourglass-split"></i> Consultando SUNAT...';
            btnBuscarProveedorPorRuc.disabled = true;
            
            try {
                const resultado = await consultarSunat(ruc);
                
                if (resultado.success) {
                    document.getElementById('proveedor_razon_social').value = resultado.razon_social || '';
                    document.getElementById('proveedor_doc').value = ruc;
                    document.getElementById('proveedor_direccion').value = resultado.direccion || '';
                    
                    document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                    document.getElementById('nuevo_nombre_comercial').value = resultado.nombre_comercial || '';
                    document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                    document.getElementById('nuevo_numero_documento').value = ruc;
                    
                    mostrarNotificacion('✅ Datos cargados desde SUNAT correctamente', 'success');
                } else {
                    mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC en SUNAT'), 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion('❌ Error al consultar SUNAT: ' + error.message, 'danger');
            } finally {
                btnBuscarProveedorPorRuc.innerHTML = textoOriginal;
                btnBuscarProveedorPorRuc.disabled = false;
            }
        });
    }

    if (btnLimpiarProveedor) {
        btnLimpiarProveedor.addEventListener('click', function() {
            document.getElementById('proveedor_id').value = '';
            document.getElementById('proveedor_razon_social').value = '';
            document.getElementById('proveedor_doc').value = '';
            document.getElementById('proveedor_direccion').value = '';
            document.getElementById('telefono_contacto').value = '';
            document.getElementById('proveedor_contacto').value = '';
            document.getElementById('email_contacto_proveedor').value = '';
            document.getElementById('num_cotizacion').value = '';
            if (buscarRucInput) buscarRucInput.value = '';
            mostrarNotificacion('🧹 Proveedor limpiado', 'info');
        });
    }

    // =========================
    // CREAR NUEVO PROVEEDOR
    // =========================
    async function guardarNuevoProveedor() {
        const tipoDocumento = document.getElementById('nuevo_tipo_documento')?.value;
        const numeroDocumento = document.getElementById('nuevo_numero_documento')?.value.trim();
        const razonSocial = document.getElementById('nuevo_razon_social')?.value.trim();
        
        if (!numeroDocumento) {
            mostrarNotificacion('⚠️ Ingrese el número de documento', 'warning');
            return;
        }
        
        if (!razonSocial) {
            mostrarNotificacion('⚠️ Ingrese la razón social', 'warning');
            return;
        }
        
        const btnGuardar = document.getElementById('btnGuardarNuevoProveedor');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
        btnGuardar.disabled = true;
        
        try {
            const payload = {
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento,
                razon_social: razonSocial,
                nombre_comercial: document.getElementById('nuevo_nombre_comercial')?.value.trim() || '',
                direccion_fiscal: document.getElementById('nuevo_direccion_fiscal')?.value.trim() || '',
                telefono_contacto: document.getElementById('nuevo_telefono')?.value.trim() || '',
                email_contacto: document.getElementById('nuevo_email')?.value.trim() || '',
                nombre_contacto: document.getElementById('nuevo_nombre_contacto')?.value.trim() || ''
            };
            
            const response = await fetch('/api/proveedores/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('formNuevoProveedor')?.reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoProveedor'));
                modal.hide();
                mostrarNotificacion('✅ Proveedor creado exitosamente', 'success');
                await cargarProveedorEnOrden(result.data.id);
            } else {
                mostrarNotificacion('❌ Error: ' + (result.error || 'No se pudo crear el proveedor'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error de conexión', 'danger');
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    }

    async function cargarProveedorEnOrden(proveedorId) {
        try {
            const response = await fetch(`/api/proveedores/${proveedorId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const proveedor = result.data;
                
                document.getElementById('proveedor_id').value = proveedor.id;
                document.getElementById('proveedor_razon_social').value = proveedor.razon_social;
                document.getElementById('proveedor_doc').value = proveedor.numero_documento || '';
                document.getElementById('proveedor_direccion').value = proveedor.direccion_fiscal || '';
                document.getElementById('telefono_contacto').value = proveedor.telefono_contacto || '';
                document.getElementById('proveedor_contacto').value = proveedor.nombre_contacto || '';
                document.getElementById('email_contacto_proveedor').value = proveedor.email_contacto || '';
                
                await cargarDireccionesProveedor(proveedor.id);
                
                mostrarNotificacion('✅ Proveedor cargado correctamente', 'success');
            }
        } catch (error) {
            console.error('Error cargando proveedor:', error);
        }
    }

    // =========================
    // MODAL DE CONFIRMACIÓN
    // =========================
    function mostrarModalConfirmacion(datos) {
        const modalBody = document.getElementById('modalConfirmacionBody');
        if (!modalBody) return;
        
        const ahora = new Date();
        const fechaActual = ahora.toLocaleDateString('es-PE');
        const horaActual = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        
        modalBody.innerHTML = `
            <div class="text-center mb-3"><i class="bi bi-check-circle-fill" style="font-size: 48px; color: #10b981;"></i></div>
            <div class="alert alert-success"><strong>✅ ¡Orden de Compra guardada exitosamente!</strong></div>
            <div class="row">
                <div class="col-6"><strong>Número:</strong></div>
                <div class="col-6">${datos.numero || datos.codigo_orden}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Tipo:</strong></div>
                <div class="col-6">${datos.tipo || (esBorrador ? 'BORRADOR' : 'OFICIAL')}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Comprador:</strong></div>
                <div class="col-6">${usuarioActual?.nombre_completo || 'No asignado'}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Fecha:</strong></div>
                <div class="col-6">${fechaActual}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Hora:</strong></div>
                <div class="col-6">${horaActual}</div>
            </div>
            <hr>
            <div class="text-muted small"><i class="bi bi-info-circle"></i> El código es único y quedará registrado.</div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
        modal.show();
        
        document.getElementById('btnDescargarPDFModal').onclick = () => {
            const ordenId = document.getElementById('orden_compra_id')?.value;
            if (ordenId && !esBorrador) {
                window.open(`/api/orden_compra/pdf/${ordenId}`, '_blank');
            } else {
                mostrarNotificacion('⚠️ Debe convertir a oficial antes de generar PDF', 'warning');
            }
        };
        
        document.getElementById('btnNuevaOrdenModal').onclick = () => {
            window.location.href = '/crear_compra';
        };
    }

    // =========================
    // ESTADO GLOBAL
    // =========================
    let estadoOrden = 'pendiente';
    let ordenBloqueada = false;
    let datosModificados = false;
    let itemCounter = 0;
    let modoConsulta = false;

    const tableBody = document.getElementById('table-body');
    const portal = document.getElementById('portalSuggestions');

    function portalHide() {
        if (portal) {
            portal.style.display = 'none';
            portal.innerHTML = '';
        }
    }

    function portalShow(inputEl, html) {
        if (!portal) return;
        const rect = inputEl.getBoundingClientRect();
        portal.style.left = rect.left + 'px';
        portal.style.top = (rect.bottom + 4) + 'px';
        portal.style.minWidth = Math.max(rect.width, 280) + 'px';
        portal.innerHTML = html;
        portal.style.display = 'block';
    }

    // =========================
    // OBTENER LISTA DE PRODUCTOS
    // =========================
    function obtenerListaProductos() {
        const filas = document.querySelectorAll("#table-body tr");
        let listaProductos = [];

        filas.forEach(row => {
            const getInput = (selector) => {
                const el = row.querySelector(selector);
                return el ? el.value : 0;
            };

            const cantidad = Number(getInput('.cantidad')) || 0;
            const precio_unitario = Number(getInput('.precio_venta_unitario')) || 0;
            const valor_total = cantidad * precio_unitario;

            const producto = {
                producto_id: Number(getInput('.producto_id')) || null,
                codigo: getInput('.codigo_producto') || '',
                descripcion: getInput('.descripcion') || '',
                modelo: getInput('.modelo') || '',
                marca: getInput('.marca') || '',
                unidad_medida: getInput('.unidad_medida') || '',
                cantidad: cantidad,
                precio_unitario: precio_unitario,
                valor_total: valor_total
            };

            listaProductos.push(producto);
        });

        return listaProductos;
    }

    // =========================
    // FUNCIONES DE BÚSQUEDA
    // =========================
    async function buscarProveedores(q) {
        try {
            const res = await fetch(`/api/proveedores/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            return json.data || [];
        } catch (error) {
            console.error('Error buscando proveedores:', error);
            return [];
        }
    }

    async function buscarProductos(q) {
        try {
            console.log('🔎 Buscando productos con:', q);
            const res = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            console.log('📦 Productos encontrados:', json);
            return json.data || [];
        } catch (error) {
            console.error('Error buscando productos:', error);
            return [];
        }
    }

    // =========================
    // GUARDAR ORDEN DE COMPRA
    // =========================
    async function guardarOrdenCompra() {
        const proveedor_id = Number(document.getElementById('proveedor_id')?.value || 0);
        if (!proveedor_id) { mostrarNotificacion("⚠️ Seleccione proveedor", "warning"); return; }

        const listaProductos = obtenerListaProductos();
        if (listaProductos.length === 0) { mostrarNotificacion("⚠️ Agregue items", "warning"); return; }
        
        for (let i = 0; i < listaProductos.length; i++) {
            if (!listaProductos[i].producto_id) { mostrarNotificacion(`⚠️ Falta seleccionar producto en la fila ${i + 1}`, "warning"); return; }
        }
        
        const totalSinDescuento = Number(document.getElementById('total_valor_venta')?.textContent || 0);
        
        const descuentoInput = document.getElementById('descuento_porcentaje_input');
        const descuentoTipo = document.getElementById('descuento_tipo');
        let descuentoPorcentaje = 0;
        let descuentoMonto = 0;
        
        if (descuentoInput && descuentoInput.value) {
            const valorDescuento = parseFloat(descuentoInput.value) || 0;
            
            if (descuentoTipo && descuentoTipo.value === 'monto') {
                descuentoMonto = Math.min(valorDescuento, totalSinDescuento);
                descuentoPorcentaje = (descuentoMonto / totalSinDescuento) * 100;
            } else {
                descuentoPorcentaje = valorDescuento;
                descuentoMonto = totalSinDescuento * (descuentoPorcentaje / 100);
            }
        }
        
        const totalConDescuento = totalSinDescuento - descuentoMonto;
        const igv = totalConDescuento * 0.18;
        const subtotal = totalConDescuento - igv;
        
        const orden_id = document.getElementById('orden_compra_id')?.value;
        
        const payload = {
            id: orden_id && orden_id !== '' && orden_id !== 'None' ? parseInt(orden_id) : null,
            proveedor_id: proveedor_id,
            usuario_id: Number(document.getElementById("usuario_id")?.value || 0),
            estado: document.getElementById("estado")?.value || "pendiente",
            subtotal: subtotal,
            igv: igv,
            total: totalConDescuento,
            condicion_pago: document.getElementById("condicion_pago")?.value || "",
            tiempo_entrega: document.getElementById("tiempo_entrega")?.value || "",
            fecha_requerida: document.getElementById("fecha_requerida")?.value || "",
            lugar_entrega: document.getElementById("lugar_entrega")?.value || "",
            num_cotizacion: document.getElementById("num_cotizacion")?.value || "",
            nota_compra: document.getElementById("nota_compra")?.value || "",
            notas: document.getElementById('notas')?.value || "",
            productos: listaProductos,
            codigo_orden: codigoOrdenActual,
            correlativo: esBorrador ? 0 : correlativoActual,
            es_borrador: esBorrador,
            descuento_porcentaje: descuentoPorcentaje,
            descuento_monto: descuentoMonto,
            descuento_tipo: descuentoTipo?.value || 'porcentaje',
            proveedor_contacto: document.getElementById('proveedor_contacto')?.value || '',
            telefono_contacto: document.getElementById('telefono_contacto')?.value || '',
            email_contacto_proveedor: document.getElementById('email_contacto_proveedor')?.value || ''
        };

        const btnGuardar = esBorrador ? document.getElementById('btnGuardarBorrador') : document.getElementById('btnGuardarOficial');
        const textoOriginal = btnGuardar?.innerHTML;
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
            btnGuardar.disabled = true;
        }
        
        try {
            const res = await fetch('/api/orden_compra/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (!json.success) { 
                mostrarNotificacion("❌ Error: " + (json.error || "Error desconocido"), "danger");
                return; 
            }
            
            document.getElementById('orden_compra_id').value = json.data.id;
            
            if (!esBorrador) {
                correlativoActual++;
            }
            
            if (!esBorrador) {
                actualizarEstadoBotonPDF();
            }
            
            mostrarModalConfirmacion({ 
                id: json.data.id, 
                numero: json.data.codigo_orden, 
                tipo: esBorrador ? 'BORRADOR' : 'OFICIAL' 
            });
            
        } catch (err) { 
            console.error(err); 
            mostrarNotificacion("❌ Error de conexión con el servidor", "danger");
        } finally {
            if (btnGuardar) {
                btnGuardar.innerHTML = textoOriginal;
                btnGuardar.disabled = false;
            }
        }
    }

    // =========================
    // CONVERTIR A OFICIAL
    // =========================
    async function convertirAOficial() {
        if (!esBorrador) { 
            mostrarNotificacion("⚠️ Esta orden de compra ya es oficial", "warning"); 
            return; 
        }
        
        const proveedor_id = Number(document.getElementById('proveedor_id')?.value || 0);
        if (!proveedor_id) {
            mostrarNotificacion("⚠️ Debe seleccionar un proveedor antes de convertir a oficial", "warning");
            return;
        }
        
        const listaProductos = obtenerListaProductos();
        if (listaProductos.length === 0) {
            mostrarNotificacion("⚠️ Debe agregar al menos un producto antes de convertir a oficial", "warning");
            return;
        }
        
        for (let i = 0; i < listaProductos.length; i++) {
            if (!listaProductos[i].precio_unitario || listaProductos[i].precio_unitario <= 0) {
                mostrarNotificacion(`⚠️ El producto ${listaProductos[i].codigo || 'sin código'} no tiene precio válido`, "warning");
                return;
            }
        }
        
        if (!confirm("¿Convertir este borrador a orden de compra oficial?\n\nEsta acción generará un código único y definitivo.")) return;
        
        const nuevoCodigo = await generarCodigoOficial();
        if (nuevoCodigo) {
            esBorrador = false;
            actualizarNumeroOrdenUI(nuevoCodigo, false);
            document.getElementById('estado').value = 'pendiente';
            await guardarOrdenCompra();
            mostrarNotificacion(`✅ Orden de compra convertida a OFICIAL\nNúmero: ${nuevoCodigo}`, "success");
        } else {
            mostrarNotificacion("❌ Error al generar código oficial. Intente nuevamente.", "danger");
        }
    }

    // =========================
    // GENERAR PDF
    // =========================
    function generatePdf() {
        const ordenId = document.getElementById('orden_compra_id')?.value;
        
        if (!ordenId || ordenId === '' || ordenId === 'None') {
            mostrarNotificacion("⚠️ Debe guardar la orden primero", "warning");
            return;
        }
        
        if (esBorrador) {
            mostrarNotificacion("⚠️ Debe convertir la orden a OFICIAL antes de generar PDF", "warning");
            return;
        }
        
        const pdfUrl = `/api/orden_compra/pdf/${ordenId}`;
        
        try {
            mostrarNotificacion("📄 Generando PDF, espere...", "info");
            window.open(pdfUrl, '_blank');
        } catch (error) {
            console.error('Error al generar PDF:', error);
            mostrarNotificacion("❌ Error al generar el PDF", "danger");
        }
    }

    // =========================
    // SET PRODUCTO EN FILA
    // =========================
    function setProductoEnFila(row, p) {  
        const productoIdInput = row.querySelector('.producto_id');
        const codigoInput = row.querySelector('.codigo_producto');
        const descripcionInput = row.querySelector('.descripcion');
        const modeloInput = row.querySelector('.modelo');
        const marcaInput = row.querySelector('.marca');
        const unidadMedidaInput = row.querySelector('.unidad_medida');
        const precioVentaInput = row.querySelector('.precio_venta_unitario');
        const cantidadInput = row.querySelector('.cantidad');
        
        if (productoIdInput) productoIdInput.value = p.id;
        if (codigoInput) codigoInput.value = p.codigo || "";
        if (descripcionInput) descripcionInput.value = p.descripcion || "";
        if (modeloInput) modeloInput.value = p.modelo || "";
        if (marcaInput) marcaInput.value = p.marca || "";
        if (unidadMedidaInput) unidadMedidaInput.value = p.unidad_medida || "UNIDAD";
        if (precioVentaInput && p.precio_unitario) precioVentaInput.value = p.precio_unitario;
        
        if (cantidadInput && cantidadInput.value === '0' || !cantidadInput.value) {
            cantidadInput.value = 1;
        }
        
        setTimeout(() => recalculateAll(), 50);
    }

    // =========================
    // AUTOCOMPLETES
    // =========================
    function attachProveedorAutocomplete(idInput) {
        const input = document.getElementById(idInput);
        if (!input) return;
        let timeoutId = null;

        input.addEventListener('input', async () => {
            const q = input.value.trim();
            if (timeoutId) clearTimeout(timeoutId);
            if (q.length < 2) { portalHide(); return; }
            
            timeoutId = setTimeout(async () => {
                const proveedores = await buscarProveedores(q);
                if (!proveedores.length) { portalShow(input, `<div class="empty">No encontrado</div>`); return; }

                const html = proveedores.map(p => `<div class="item" data-id="${p.id}" data-razon="${p.razon_social}" data-doc="${p.numero_documento || ''}" data-direccion="${p.direccion_fiscal || ''}" data-telefono="${p.telefono_contacto || ''}" data-contacto="${p.nombre_contacto || ''}" data-email="${p.email_contacto || ''}">
                    <strong>🏢 ${p.razon_social}</strong><div class="meta">${p.tipo_documento || 'RUC'} • ${p.numero_documento || 'Sin documento'}</div></div>`).join('');
                portalShow(input, html);

                portal.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', async () => {
                        document.getElementById('proveedor_id').value = el.dataset.id;
                        document.getElementById('proveedor_razon_social').value = el.dataset.razon;
                        document.getElementById('proveedor_doc').value = el.dataset.doc || '';
                        document.getElementById('proveedor_direccion').value = el.dataset.direccion || '';
                        document.getElementById('telefono_contacto').value = el.dataset.telefono || '';
                        document.getElementById('proveedor_contacto').value = el.dataset.contacto || '';
                        document.getElementById('email_contacto_proveedor').value = el.dataset.email || '';
                        await cargarDireccionesProveedor(el.dataset.id);
                        portalHide();
                    });
                });
            }, 300);
        });
    }

    function attachProductoAutocomplete(row) {
        const input = row.querySelector('.codigo_producto');
        
        if (!input) {
            console.error('❌ No se encontró input .codigo_producto en la fila');
            return;
        }
        
        let timeoutId = null;

        input.addEventListener('input', async () => {
            const q = input.value.trim();
            
            if (timeoutId) clearTimeout(timeoutId);
            if (q.length < 2) { 
                portalHide(); 
                return; 
            }
            
            timeoutId = setTimeout(async () => {
                const productos = await buscarProductos(q);
                
                if (!productos.length) { 
                    portalShow(input, `<div class="empty">❌ No se encontraron productos</div>`); 
                    return; 
                }

                const html = productos.map(p => `<div class="item" 
                    data-id="${p.id}" 
                    data-codigo="${p.codigo}" 
                    data-descripcion="${p.descripcion}" 
                    data-modelo="${p.modelo || ''}" 
                    data-marca="${p.marca || ''}" 
                    data-unidad="${p.unidad || 'UNIDAD'}" 
                    data-precio="${p.precio_unitario || 0}">
                        <strong>📦 ${p.codigo}</strong> - ${p.descripcion}
                        <div class="meta">${p.marca || ''} • Precio: S/ ${(p.precio_unitario || 0).toFixed(2)}</div>
                    </div>`).join('');
                portalShow(input, html);

                portal.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', () => {
                        const productoData = {
                            id: el.dataset.id,
                            codigo: el.dataset.codigo,
                            descripcion: el.dataset.descripcion,
                            modelo: el.dataset.modelo,
                            marca: el.dataset.marca,
                            unidad_medida: el.dataset.unidad,
                            precio_unitario: parseFloat(el.dataset.precio) || 0
                        };
                        setProductoEnFila(row, productoData);
                        portalHide();
                        recalculateAll();
                    });
                });
            }, 300);
        });
    }

    // =========================
    // RECALCULAR CON DESCUENTO PERSONALIZABLE
    // =========================
    function recalculateAll() {
        const rows = document.querySelectorAll("#table-body tr");
        let totalValorVenta = 0;

        rows.forEach(r => {
            const cantidad = Number(r.querySelector('.cantidad')?.value || 0);
            const precioVenta = Number(r.querySelector('.precio_venta_unitario')?.value || 0);
            
            const valorVentaTotal = cantidad * precioVenta;
            const valorVentaTotalElem = r.querySelector('.valor_venta_total');
            if (valorVentaTotalElem) valorVentaTotalElem.textContent = formatCantidad(valorVentaTotal);
            totalValorVenta += valorVentaTotal;
        });

        const totalValorVentaElem = document.getElementById('total_valor_venta');
        if (totalValorVentaElem) totalValorVentaElem.textContent = formatCantidad(totalValorVenta);
        
        const summarySubtotal = document.getElementById('summary_subtotal_venta');
        if (summarySubtotal) summarySubtotal.textContent = formatCantidad(totalValorVenta);
        
        const descuentoInput = document.getElementById('descuento_porcentaje_input');
        const descuentoTipo = document.getElementById('descuento_tipo');
        let descuentoValor = 0;
        let descuentoMonto = 0;
        
        if (descuentoInput && descuentoInput.value) {
            descuentoValor = parseFloat(descuentoInput.value) || 0;
            if (descuentoTipo && descuentoTipo.value === 'monto') {
                descuentoMonto = Math.min(descuentoValor, totalValorVenta);
            } else {
                descuentoMonto = totalValorVenta * (descuentoValor / 100);
            }
        }
        
        const subtotalConDescuento = totalValorVenta - descuentoMonto;
        const igv = subtotalConDescuento * 0.18;
        const totalVenta = subtotalConDescuento + igv;
        
        const summaryDescuento = document.getElementById('summary_descuento');
        if (summaryDescuento) summaryDescuento.textContent = formatCantidad(descuentoMonto);
        
        const summarySubtotalDescuento = document.getElementById('summary_subtotal_descuento');
        if (summarySubtotalDescuento) summarySubtotalDescuento.textContent = formatCantidad(subtotalConDescuento);
        
        const summaryIgv = document.getElementById('summary_igv');
        if (summaryIgv) summaryIgv.textContent = formatCantidad(igv);
        
        const summaryTotal = document.getElementById('summary_total_venta');
        if (summaryTotal) summaryTotal.textContent = formatCantidad(totalVenta);
        
        const descuentoHidden = document.getElementById('descuento_porcentaje');
        if (descuentoHidden) {
            if (descuentoTipo && descuentoTipo.value === 'monto') {
                descuentoHidden.value = descuentoValor;
            } else {
                descuentoHidden.value = descuentoValor;
            }
        }
    }

    // =========================
    // AGREGAR ITEMS
    // =========================
    function addItem() {
        if (ordenBloqueada) { 
            mostrarNotificacion("⚠️ La orden está bloqueada.", "warning"); 
            return; 
        }
        itemCounter++;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="col-item">${itemCounter}</td>
            <td class="col-codigo">
                <input type="text" class="codigo_producto" placeholder="Buscar producto..." style="width:100%; min-width:120px;">
                <input type="hidden" class="producto_id">
            </td>
            <td class="col-desc"><input type="text" class="descripcion" readonly style="width:100%;"></td>
            <td class="col-modelo"><input type="text" class="modelo" readonly style="width:100%;"></td>
            <td class="col-marca"><input type="text" class="marca" readonly style="width:100%;"></td>
            <td class="col-unidad"><input type="text" class="unidad_medida" value="UNIDAD" style="width:100%;"></td>
            <td class="col-cantidad"><input type="number" class="cantidad" value="1" step="0.01" style="width:100%;"></td>
            <td class="col-precio"><input type="number" class="precio_venta_unitario" value="0" step="0.01" style="width:100%;"></td>
            <td class="valor_venta_total">0.00</td>
            <td class="col-eliminar"><button class="btn-del">🗑</button></td>
        `;
        
        if (tableBody) tableBody.appendChild(row);
        
        attachProductoAutocomplete(row);
        
        const rec = () => { 
            if (!modoConsulta) { 
                recalculateAll(); 
                datosModificados = true; 
            } 
        };
        
        row.querySelector('.cantidad')?.addEventListener('input', rec);
        row.querySelector('.precio_venta_unitario')?.addEventListener('input', rec);
        row.querySelector('.btn-del')?.addEventListener('click', () => { 
            row.remove(); 
            recalculateAll(); 
        });
        
        setTimeout(recalculateAll, 50);
    }

    // =========================
    // ESTADO VISUAL
    // =========================
    function actualizarEstadoVisual(estado) {
        const estadoDiv = document.getElementById('estado_fixed');
        const estadoTexto = document.getElementById('estado_texto');
        
        const estadoMapa = {
            'pendiente': { class: 'estado-pendiente', text: 'PENDIENTE' },
            'cotizando': { class: 'estado-cotizando', text: 'EN COTIZACIÓN' },
            'aprobado': { class: 'estado-aprobado', text: 'APROBADO' },
            'rechazado': { class: 'estado-rechazado', text: 'RECHAZADO' },
            'ordenado': { class: 'estado-ordenado', text: 'ORDENADO' },
            'recibido': { class: 'estado-recibido', text: 'RECIBIDO' }
        };
        
        const estadoData = estadoMapa[estado] || estadoMapa.pendiente;
        
        if (estadoDiv && estadoTexto) {
            estadoDiv.className = `erp-status ${estadoData.class}`;
            estadoTexto.textContent = estadoData.text;
        }
        
        actualizarBotones();
    }

    function actualizarBotones() {
        const pdfBtn = document.getElementById('btnPdf');
        const guardarBorrador = document.getElementById('btnGuardarBorrador');
        const guardarOficial = document.getElementById('btnGuardarOficial');
        const agregarBtn = document.getElementById('btnAgregarItem');
        const btnAprobado = document.getElementById('btnAprobado');
        
        if (modoConsulta) {
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
            if (agregarBtn) agregarBtn.disabled = true;
            if (pdfBtn) pdfBtn.disabled = false;
            ordenBloqueada = true;
            return;
        }
        
        const estado = document.getElementById('estado')?.value || 'pendiente';
        
        if (estado === 'pendiente' || estado === 'cotizando') {
            ordenBloqueada = false;
            if (guardarBorrador) guardarBorrador.disabled = false;
            if (guardarOficial) guardarOficial.disabled = false;
            if (agregarBtn) agregarBtn.disabled = false;
            if (btnAprobado) btnAprobado.disabled = false;
        } else {
            ordenBloqueada = true;
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
            if (agregarBtn) agregarBtn.disabled = true;
        }
    }

    function aplicarBloqueoUI() {
        const disabled = ordenBloqueada;
        document.querySelectorAll('#table-body input').forEach(i => i.disabled = disabled);
        ['proveedor_razon_social', 'proveedor_doc', 'telefono_contacto', 'proveedor_contacto', 'email_contacto_proveedor', 'num_cotizacion', 'estado'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        ['comprador_responsable', 'email_contacto_user', 'telefono_contacto_user', 'condicion_pago', 'tiempo_entrega', 'fecha_requerida', 'lugar_entrega', 'nota_compra', 'notas', 'descuento_porcentaje_input', 'descuento_tipo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        const btnAgregar = document.getElementById('btnAgregarItem');
        if (btnAgregar) btnAgregar.disabled = disabled;
        document.querySelectorAll('#table-body .btn-del').forEach(b => b.disabled = disabled);
    }

    function showModificarModal() {
        const modal = new bootstrap.Modal(document.getElementById('modalModificar'));
        modal.show();
    }

    async function cargarOrdenCompra(id) {
        try {
            console.log("🔍 Cargando orden de compra ID:", id);
            const res = await fetch(`/api/orden_compra/${id}`);
            const json = await res.json();
            console.log("📦 Datos recibidos:", json);
            
            if (!json.success) { 
                mostrarNotificacion("Error al cargar orden de compra", "danger"); 
                return; 
            }
            
            const data = json.data;
            console.log("✅ Datos de orden:", data);
            
            if (data.codigo_orden) {
                codigoOrdenActual = data.codigo_orden;
                correlativoActual = data.correlativo || 0;
                esBorrador = data.codigo_orden.startsWith('TMP-');
                actualizarNumeroOrdenUI(data.codigo_orden, esBorrador);
            }
            
            if (data.proveedor_id) {
                document.getElementById('proveedor_id').value = data.proveedor_id;
            }
            document.getElementById('proveedor_razon_social').value = data.proveedor || data.razon_social || '';
            document.getElementById('proveedor_doc').value = data.numero_documento || '';
            document.getElementById('proveedor_direccion').value = data.direccion_fiscal || '';
            document.getElementById('proveedor_contacto').value = data.proveedor_contacto || '';
            document.getElementById('email_contacto_proveedor').value = data.email_contacto_proveedor || '';
            document.getElementById('telefono_contacto').value = data.telefono_contacto || '';
            document.getElementById('num_cotizacion').value = data.num_cotizacion || '';
            
            document.getElementById('estado').value = data.estado || 'pendiente';
            document.getElementById('notas').value = data.notas || '';
            document.getElementById('condicion_pago').value = data.condicion_pago || 'Contado';
            document.getElementById('tiempo_entrega').value = data.tiempo_entrega || '';
            document.getElementById('fecha_requerida').value = data.fecha_requerida || '';
            document.getElementById('lugar_entrega').value = data.lugar_entrega || '';
            document.getElementById('nota_compra').value = data.nota_compra || '';
            
            document.getElementById('usuario_id').value = data.usuario_id || '';
            document.getElementById('comprador_responsable').value = data.nombre_completo || '';
            document.getElementById('email_contacto_user').value = data.email || '';
            document.getElementById('telefono_contacto_user').value = data.telefono || '';
            
            if (data.descuento_porcentaje !== undefined && data.descuento_porcentaje !== null) {
                const descuentoInput = document.getElementById('descuento_porcentaje_input');
                const descuentoTipo = document.getElementById('descuento_tipo');
                if (descuentoInput) descuentoInput.value = data.descuento_porcentaje;
                if (descuentoTipo && data.descuento_tipo) descuentoTipo.value = data.descuento_tipo;
            }
            
            const total = Number(data.total || 0);
            const totalValorVentaElem = document.getElementById('total_valor_venta');
            if (totalValorVentaElem) totalValorVentaElem.textContent = formatCantidad(total);
            
            const summarySubtotal = document.getElementById('summary_subtotal_venta');
            if (summarySubtotal) summarySubtotal.textContent = formatCantidad(total);
            
            const summaryIgv = document.getElementById('summary_igv');
            if (summaryIgv) summaryIgv.textContent = formatCantidad(Number(data.igv || 0));
            
            const summaryTotal = document.getElementById('summary_total_venta');
            if (summaryTotal) summaryTotal.textContent = formatCantidad(total);
            
            document.getElementById('table-body').innerHTML = '';
            itemCounter = 0;
            
            if (data.detalle && data.detalle.length > 0) {
                data.detalle.forEach(item => {
                    addItem();
                    const row = document.querySelector("#table-body tr:last-child");
                    if (row) {
                        row.querySelector('.producto_id').value = item.producto_id || '';
                        row.querySelector('.cantidad').value = formatCantidad(item.cantidad || 0);
                        row.querySelector('.precio_venta_unitario').value = item.precio_unitario || 0;
                        row.querySelector('.codigo_producto').value = item.codigo || '';
                        row.querySelector('.descripcion').value = item.descripcion || '';
                        row.querySelector('.modelo').value = item.modelo || '';
                        row.querySelector('.marca').value = item.marca || '';
                        row.querySelector('.unidad_medida').value = item.unidad_medida || 'UNIDAD';
                    }
                });
            }
            
            recalculateAll();
            
            if (data.proveedor_id) {
                await cargarDireccionesProveedor(data.proveedor_id);
            }
            
            actualizarEstadoVisual(data.estado || 'pendiente');
            actualizarEstadoBotonPDF();
            
        } catch (err) { 
            console.error("🔥 ERROR en cargarOrdenCompra:", err); 
            mostrarNotificacion("Error cargando orden de compra", "danger"); 
        }
    }

    // =========================
    // DIAGNÓSTICO
    // =========================
    function diagnosticar() {
        console.log('=== DIAGNÓSTICO COMPRAS ===');
        console.log('Estado orden:', estadoOrden);
        console.log('Bloqueada:', ordenBloqueada);
        console.log('Modo consulta:', modoConsulta);
        console.log('Es borrador:', esBorrador);
        console.log('Item counter:', itemCounter);
        
        const filas = document.querySelectorAll("#table-body tr");
        console.log('Filas en tabla:', filas.length);
        
        mostrarNotificacion('Diagnóstico completo. Revisa la consola (F12)', 'info');
    }

    // =========================
    // CONFIGURACIONES
    // =========================
    function configurarTiempoEntrega() {
        const select = document.getElementById('tiempo_entrega_select');
        const input = document.getElementById('tiempo_entrega');
        
        if (select && input) {
            select.addEventListener('change', function() {
                const valor = this.value;
                if (valor === 'personalizado') {
                    input.style.display = 'block';
                    input.value = '';
                    input.focus();
                } else if (valor === '') {
                    input.style.display = 'none';
                    input.value = '';
                } else {
                    input.style.display = 'none';
                    input.value = valor;
                }
            });
        }
    }

    function configurarFechaRequerida() {
        const select = document.getElementById('fecha_requerida_select');
        const input = document.getElementById('fecha_requerida');
        
        if (select && input) {
            select.addEventListener('change', function() {
                const valor = this.value;
                if (valor === 'personalizado') {
                    input.style.display = 'block';
                    input.value = '';
                    input.focus();
                } else if (valor === '') {
                    input.style.display = 'none';
                    input.value = '';
                } else {
                    input.style.display = 'none';
                    input.value = valor;
                }
            });
        }
    }

    function configurarCondicionPago() {
        const select = document.getElementById('condicion_pago_select');
        const input = document.getElementById('condicion_pago');
        
        if (select && input) {
            select.addEventListener('change', function() {
                const valor = this.value;
                if (valor === 'personalizado') {
                    input.style.display = 'block';
                    input.value = '';
                    input.focus();
                } else if (valor === '') {
                    input.style.display = 'none';
                    input.value = '';
                } else {
                    input.style.display = 'none';
                    input.value = valor;
                }
            });
        }
    }

    function configurarLugarEntrega() {
        const select = document.getElementById('lugar_entrega_select');
        const input = document.getElementById('lugar_entrega');
        
        if (select && input) {
            select.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    input.style.display = 'block';
                    input.value = '';
                    input.focus();
                } else if (this.value === '') {
                    input.style.display = 'none';
                    input.value = '';
                } else {
                    input.style.display = 'none';
                    input.value = this.value;
                }
            });
        }
    }

    function configurarDescuentoPersonalizable() {
        const descuentoInput = document.getElementById('descuento_porcentaje_input');
        const descuentoTipo = document.getElementById('descuento_tipo');
        const descuentoSymbol = document.getElementById('descuento_simbolo');
        
        if (descuentoTipo && descuentoSymbol) {
            descuentoTipo.addEventListener('change', function() {
                if (this.value === 'monto') {
                    descuentoSymbol.textContent = 'S/';
                    if (descuentoInput) {
                        descuentoInput.max = '';
                    }
                } else {
                    descuentoSymbol.textContent = '%';
                    if (descuentoInput) {
                        descuentoInput.max = '100';
                    }
                }
                recalculateAll();
            });
        }
        
        if (descuentoInput) {
            descuentoInput.addEventListener('input', () => recalculateAll());
        }
    }

    // =========================
    // EVENTOS
    // =========================
    document.getElementById('btnGuardarBorrador')?.addEventListener('click', guardarOrdenCompra);
    document.getElementById('btnGuardarOficial')?.addEventListener('click', convertirAOficial);
    document.getElementById('btnPdf')?.addEventListener('click', generatePdf);
    document.getElementById('btnModificar')?.addEventListener('click', showModificarModal);
    document.getElementById('btnAgregarItem')?.addEventListener('click', addItem);
    document.getElementById('btnDiagnostico')?.addEventListener('click', diagnosticar);
    document.getElementById('btnCrearProveedor')?.addEventListener('click', () => {
        document.getElementById('formNuevoProveedor')?.reset();
        new bootstrap.Modal(document.getElementById('modalNuevoProveedor')).show();
    });
    document.getElementById('btnGuardarNuevoProveedor')?.addEventListener('click', guardarNuevoProveedor);
    
    const btnBuscarSunat = document.getElementById('btnBuscarSunat');
    if (btnBuscarSunat) {
        btnBuscarSunat.addEventListener('click', autocompletarConSunat);
    }

    // Botón confirmar modificar
    document.getElementById('btn-confirmar-modificar')?.addEventListener('click', function() {
        const modalElement = document.getElementById('modalModificar');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        ordenBloqueada = false;
        aplicarBloqueoUI();
        mostrarNotificacion('✅ Orden habilitada para modificación', 'success');
    });

    // Botón aprobar
    document.getElementById('btnAprobado')?.addEventListener('click', async function() {
        const ordenId = document.getElementById('orden_compra_id')?.value;
        if (!ordenId || ordenId === 'None') {
            mostrarNotificacion('⚠️ Debe guardar la orden primero', 'warning');
            return;
        }
        
        const ordenProveedor = prompt('Ingrese el número de orden de compra del proveedor:');
        if (ordenProveedor) {
            document.getElementById('estado').value = 'aprobado';
            actualizarEstadoVisual('aprobado');
            await guardarOrdenCompra();
            mostrarNotificacion('✅ Orden de compra aprobada', 'success');
        }
    });

    // Escuchar cambios en el select de estado
    const estadoSelect = document.getElementById('estado');
    if (estadoSelect) {
        estadoSelect.addEventListener('change', function() {
            actualizarEstadoVisual(this.value);
        });
    }

    // =========================
    // INIT
    // =========================
    configurarTiempoEntrega();
    configurarFechaRequerida();
    configurarCondicionPago();
    configurarLugarEntrega();
    configurarDescuentoPersonalizable();
    
    actualizarEstadoVisual('pendiente');
    aplicarBloqueoUI();
    
    attachProveedorAutocomplete('proveedor_razon_social');
    attachProveedorAutocomplete('proveedor_doc');
    
    addItem();
    inicializarCodigo();

    const ordenId = document.getElementById('orden_compra_id')?.value;
    if (ordenId && ordenId !== 'None' && ordenId !== '') { 
        cargarOrdenCompra(ordenId); 
    } else { 
        esBorrador = true; 
        document.getElementById('estado').value = 'pendiente'; 
    }
});