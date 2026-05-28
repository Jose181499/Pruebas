// listado_cotizaciones.js
let filtro;
let buscador;
let timeout;
let cotizacionesData = [];
let cotizacionAEliminar = null;

document.addEventListener('DOMContentLoaded', () => {

    filtro = document.getElementById("filtroTipo");
    buscador = document.getElementById("buscador");
    const btnRefrescar = document.getElementById("btnRefrescar");

    // 🔥 Limpiar valor inválido del buscador al inicio
    if (buscador && (buscador.value === ':1' || buscador.value === ':')) {
        console.warn("⚠️ Limpiando valor inválido del buscador:", buscador.value);
        buscador.value = '';
    }

    cargarCotizaciones();

    // 🔽 filtro
    if (filtro) {
        filtro.addEventListener("change", () => {
            aplicarFiltros();
        });
    }

    // 🔍 buscador con debounce
    if (buscador) {
        buscador.addEventListener("keyup", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                aplicarFiltros();
            }, 400);
        });
    }

    // 🔄 botón refrescar
    if (btnRefrescar) {
        btnRefrescar.addEventListener("click", () => {
            cargarCotizaciones();
        });
    }

    // 🗑️ botón confirmar eliminar en modal
    const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener("click", eliminarCotizacionConfirmado);
    }

    // 🆕 botón crear cliente en listado
    const btnCrearClienteListado = document.getElementById("btnCrearClienteListado");
    if (btnCrearClienteListado) {
        btnCrearClienteListado.addEventListener("click", () => {
            const form = document.getElementById('formNuevoClienteListado');
            if (form) form.reset();
            const modalElement = document.getElementById('modalNuevoClienteListado');
            if (modalElement) {
                new bootstrap.Modal(modalElement).show();
            }
        });
    }

    // 💾 botón guardar nuevo cliente
    const btnGuardarNuevoClienteListado = document.getElementById("btnGuardarNuevoClienteListado");
    if (btnGuardarNuevoClienteListado) {
        btnGuardarNuevoClienteListado.addEventListener("click", guardarNuevoClienteListado);
    }

    // 🔍 Botón buscar en SUNAT
    const btnBuscarSunatListado = document.getElementById("btnBuscarSunatListado");
    if (btnBuscarSunatListado) {
        btnBuscarSunatListado.addEventListener("click", autocompletarConSunatListado);
    }
});

// ===========================
// FUNCIÓN PARA FORMATEAR CANTIDAD (elimina .000)
// ===========================
function formatCantidad(cant) {
    if (cant === null || cant === undefined) return '0';
    // Convertir a número
    let numero = parseFloat(cant);
    if (isNaN(numero)) return '0';
    // Si es entero (incluyendo .000), mostrar sin decimales
    if (numero % 1 === 0) {
        return numero.toString();
    }
    // Si tiene decimales, mostrarlos sin ceros innecesarios al final
    return numero.toFixed(3).replace(/\.?0+$/, '');
}

// ===========================
// CONSULTA A SUNAT
// ===========================
async function consultarSunatListado(ruc) {
    try {
        mostrarNotificacion(`🔍 Consultando RUC ${ruc} en SUNAT...`, 'info');
        
        const response = await fetch(`/api/sunat/consulta?ruc=${ruc}`);
        const data = await response.json();
        
        if (data.success) {
            return {
                success: true,
                razon_social: data.razon_social || '',
                nombre_comercial: data.nombre_comercial || '',
                direccion: data.direccion || ''
            };
        } else {
            return { success: false, error: data.error || 'No se encontraron datos' };
        }
    } catch (error) {
        console.error('Error consultando SUNAT:', error);
        return { success: false, error: error.message };
    }
}

async function autocompletarConSunatListado() {
    const tipoDocumento = document.getElementById('nuevo_tipo_documento_listado')?.value;
    const numeroDocumento = document.getElementById('nuevo_numero_documento_listado')?.value.trim();
    
    if (tipoDocumento !== 'RUC') {
        mostrarNotificacion('⚠️ La búsqueda en SUNAT solo está disponible para RUC', 'warning');
        return;
    }
    
    if (!numeroDocumento || numeroDocumento.length !== 11) {
        mostrarNotificacion('⚠️ Ingrese un RUC válido de 11 dígitos', 'warning');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscarSunatListado');
    const textoOriginal = btnBuscar?.innerHTML;
    if (btnBuscar) {
        btnBuscar.innerHTML = '<i class="bi bi-hourglass-split"></i> Buscando...';
        btnBuscar.disabled = true;
    }
    
    try {
        const resultado = await consultarSunatListado(numeroDocumento);
        
        if (resultado.success) {
            document.getElementById('nuevo_razon_social_listado').value = resultado.razon_social || '';
            document.getElementById('nuevo_nombre_comercial_listado').value = resultado.nombre_comercial || '';
            document.getElementById('nuevo_direccion_fiscal_listado').value = resultado.direccion || '';
            
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

// ===========================
// CARGAR COTIZACIONES
// ===========================
async function cargarCotizaciones() {
    const tbody = document.getElementById('tbodyCotizaciones');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div class="spinner-border text-primary mb-3"></div>
                    <div class="text-muted">Cargando cotizaciones...</div>
                </td>
            </tr>
        `;
    }

    try {
        let buscar = buscador ? buscador.value : "";
        
        // 🔥 VALIDACIÓN CRÍTICA: Limpiar valor :1 si aparece
        if (buscar === ':1' || buscar === ':' || buscar === null) {
            console.warn("⚠️ Limpiando valor inválido del buscador:", buscar);
            buscar = "";
            if (buscador) buscador.value = "";
        }
        
        // 🔥 Construir URL correctamente
        const url = buscar ? `/api/cotizacion_comercial?buscar=${encodeURIComponent(buscar)}` : '/api/cotizacion_comercial';
        console.log("🌐 Fetching URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error response:", response.status, errorText.substring(0, 200));
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();

        console.log("🔥 DATA:", result);

        if (!result.success) {
            mostrarNotificacion('Error al cargar cotizaciones: ' + (result.error || 'Error desconocido'), 'danger');
            return;
        }

        cotizacionesData = result.data || [];
        actualizarEstadisticas();
        renderizarTabla(cotizacionesData);

    } catch (e) {
        console.error("🔥 ERROR:", e);
        mostrarNotificacion('Error de conexión con el servidor: ' + e.message, 'danger');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-danger">
                        <i class="bi bi-wifi-off fs-1"></i>
                        <div class="mt-2">Error de conexión: ${e.message}</div>
                        <div class="mt-2 small">Recargue la página o contacte al administrador</div>
                    </td>
                </tr>
            `;
        }
    }
}

// ===========================
// ACTUALIZAR ESTADÍSTICAS
// ===========================
function actualizarEstadisticas() {
    const total = cotizacionesData.length;
    const borradores = cotizacionesData.filter(c => c.codigo_cotizacion && c.codigo_cotizacion.startsWith('TMP-')).length;
    const generadas = cotizacionesData.filter(c => c.estado === 'Generada' || c.estado === 'generada').length;
    const aceptadas = cotizacionesData.filter(c => c.estado === 'Aceptada por Cliente' || c.estado === 'aceptada').length;
    
    const totalSpan = document.getElementById('totalCotizaciones');
    const borradoresSpan = document.getElementById('totalBorradores');
    const generadasSpan = document.getElementById('totalGeneradas');
    const aceptadasSpan = document.getElementById('totalAceptadas');
    
    if (totalSpan) totalSpan.textContent = total;
    if (borradoresSpan) borradoresSpan.textContent = borradores;
    if (generadasSpan) generadasSpan.textContent = generadas;
    if (aceptadasSpan) aceptadasSpan.textContent = aceptadas;
}

// ===========================
// APLICAR FILTROS
// ===========================
function aplicarFiltros() {
    const filtroTipo = filtro ? filtro.value : 'todas';
    const busqueda = buscador ? buscador.value.toLowerCase() : '';
    
    let filtradas = [...cotizacionesData];
    
    if (filtroTipo !== 'todas') {
        filtradas = filtradas.filter(c => {
            if (filtroTipo === 'borrador') {
                return c.codigo_cotizacion && c.codigo_cotizacion.startsWith('TMP-');
            } else if (filtroTipo === 'generada') {
                return c.estado === 'Generada' || c.estado === 'generada';
            } else if (filtroTipo === 'aceptada') {
                return c.estado === 'Aceptada por Cliente' || c.estado === 'aceptada';
            } else if (filtroTipo === 'rechazada') {
                return c.estado === 'Rechazada' || c.estado === 'rechazada';
            } else if (filtroTipo === 'en_proceso') {
                return c.estado === 'En Proceso' || c.estado === 'en_proceso';
            }
            return true;
        });
    }
    
    if (busqueda) {
        filtradas = filtradas.filter(c => {
            return (
                (c.numero_cotizacion && c.numero_cotizacion.toLowerCase().includes(busqueda)) ||
                (c.codigo_cotizacion && c.codigo_cotizacion.toLowerCase().includes(busqueda)) ||
                (c.cliente && c.cliente.toLowerCase().includes(busqueda)) ||
                (c.vendedor && c.vendedor.toLowerCase().includes(busqueda))
            );
        });
    }
    
    renderizarTabla(filtradas);
}

// ===========================
// FORMATEAR FECHA (DD/MM/YYYY)
// ===========================
function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    // El string viene como "2025-05-26 15:30:00"
    const partes = fechaStr.split(' ');
    if (partes.length >= 1) {
        const fechaParte = partes[0];
        const fechaParts = fechaParte.split('-');
        if (fechaParts.length === 3) {
            return `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;
        }
    }
    return fechaStr.substring(0, 10) || '-';
}

// ===========================
// FORMATEAR HORA (HH:MM)
// ===========================
function formatearHora(fechaStr) {
    if (!fechaStr) return '-';
    // El string viene como "2025-05-26 15:30:00"
    const partes = fechaStr.split(' ');
    if (partes.length >= 2) {
        const horaParte = partes[1];
        const horaParts = horaParte.split(':');
        if (horaParts.length >= 2) {
            return `${horaParts[0]}:${horaParts[1]}`;
        }
        return horaParte.substring(0, 5);
    }
    return '-';
}

// ===========================
// RENDERIZAR TABLA CON FECHA Y HORA
// ===========================
function renderizarTabla(cotizaciones) {
    const tbody = document.getElementById('tbodyCotizaciones');
    
    if (!tbody) return;
    
    if (!cotizaciones || cotizaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1"></i>
                    <div class="mt-2">No hay cotizaciones para mostrar</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = cotizaciones.map((c, index) => {
        const fecha = formatearFecha(c.fecha_creacion);
        const hora = formatearHora(c.fecha_creacion);
        const total = Number(c.total || 0).toFixed(2);
        const esBorrador = c.codigo_cotizacion && c.codigo_cotizacion.startsWith('TMP-');
        const codigoMostrar = c.codigo_cotizacion || c.numero_cotizacion;
        let estadoHtml = renderEstado(c.estado, esBorrador);
        
        return `
            <tr data-id="${c.id}" data-codigo="${codigoMostrar}">
                <td class="text-center fw-bold" style="width:50px">${index + 1}</td>
                <td class="codigo-cell">
                    <strong>${escapeHtml(codigoMostrar || '-')}</strong>
                    ${c.correlativo ? `<br><small class="text-muted">Correl: ${c.correlativo}</small>` : ''}
                 </td>
                <td class="fecha-cell">
                    <div class="fecha-hora">
                        <div class="fecha"><strong>${fecha}</strong></div>
                        <div class="hora small text-muted">${hora}</div>
                    </div>
                 </td>
                <td class="cliente-cell">
                    <strong>${escapeHtml(c.cliente || 'Sin cliente')}</strong>
                    ${c.vendedor ? `<br><small class="text-muted"><i class="bi bi-person"></i> ${escapeHtml(c.vendedor)}</small>` : ''}
                 </td>
                <td class="estado-cell">${estadoHtml}</td>
                <td class="monto text-end">S/ ${Number(total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td class="acciones text-center">
                    <button class="btn-mini btn-ver" onclick="verDetalle(${c.id})" title="Ver Detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-mini btn-editar" onclick="editar(${c.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-mini btn-eliminar" onclick="mostrarModalEliminar(${c.id}, '${escapeHtml(codigoMostrar)}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                  </td>
               </tr>
        `;
    }).join('');
}

// ===========================
// ESCAPE HTML (seguridad)
// ===========================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===========================
// VER DETALLE - MODIFICADO CON ITEM, VALOR TOTAL SIN IG Y PRECIO TOTAL CON IG
// ===========================
async function verDetalle(id) {
    try {
        mostrarNotificacion('Cargando detalle...', 'info');
        const response = await fetch(`/api/cotizacion/${id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            const esBorrador = data.codigo_cotizacion && data.codigo_cotizacion.startsWith('TMP-');
            const fecha = formatearFecha(data.fecha_creacion);
            const hora = formatearHora(data.fecha_creacion);
            const total = Number(data.total || 0).toFixed(2);
            let estadoBadge = renderEstado(data.estado, esBorrador);
            
            // 🔥 PRODUCTOS HTML - Con número de item correlativo, Valor total sin IG y Precio total con IG
            const productosHtml = (data.detalle || []).map((p, index) => {
                // Calcular subtotal sin IGV (asumiendo que subtotal_venta_con_descuento es el neto sin IGV)
                const subtotalSinIGV = Number(p.subtotal_venta_con_descuento || 0);
                // Calcular IGV (18% sobre el subtotal sin IGV)
                const igv = subtotalSinIGV * 0.18;
                // Calcular precio total con IGV
                const precioTotalConIGV = subtotalSinIGV + igv;
                
                return `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${escapeHtml(p.codigo || '-')}</td>
                        <td>${escapeHtml(p.descripcion || '-')}</td>
                        <td>${escapeHtml(p.marca || '-')}</td>
                        <td class="text-center">${formatCantidad(p.cantidad || 0)}</td>
                        <td class="text-end">S/ ${subtotalSinIGV.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                        <td class="text-end">S/ ${precioTotalConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    </tr>
                `;
            }).join('');
            
            const modalBody = document.getElementById('detalleBody');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="text-muted small">NÚMERO</div>
                            <strong>${escapeHtml(data.codigo_cotizacion || data.numero_cotizacion)}</strong>
                            ${data.correlativo ? `<br><small class="text-muted">Correlativo: ${data.correlativo}</small>` : ''}
                        </div>
                        <div class="col-md-6">
                            <div class="text-muted small">ESTADO</div>
                            ${estadoBadge}
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="text-muted small">FECHA Y HORA</div>
                            <strong>${fecha} - ${hora}</strong>
                        </div>
                        <div class="col-md-6">
                            <div class="text-muted small">TOTAL</div>
                            <strong class="text-success">S/ ${Number(total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <hr>
                    <div class="mb-3">
                        <div class="text-muted small">CLIENTE</div>
                        <strong>${escapeHtml(data.cliente || 'Sin cliente')}</strong>
                        ${data.cliente_ruc ? `<br><small>RUC: ${escapeHtml(data.cliente_ruc)}</small>` : ''}
                    </div>
                    ${data.direccion_fiscal ? `<div class="mb-3"><div class="text-muted small">DIRECCIÓN FISCAL</div>${escapeHtml(data.direccion_fiscal)}</div>` : ''}
                    <hr>
                    <div class="mb-3">
                        <div class="text-muted small">PRODUCTOS</div>
                        <div class="table-responsive mt-2">
                            <table class="table table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th class="text-center">Item</th>
                                        <th>Código<br>Producto</th>
                                        <th>Descripción</th>
                                        <th>Marca</th>
                                        <th class="text-center">Cant</th>
                                        <th class="text-end">Valor total (sin IG)</th>
                                        <th class="text-end">Precio total (con IG)</th>
                                    </tr>
                                </thead>
                                <tbody>${productosHtml || '<tr><td colspan="7" class="text-center">Sin productos</td></tr>'}</tbody>
                            </table>
                        </div>
                    </div>
                    ${data.condicion_pago ? `<div class="row mb-2"><div class="col-4 text-muted small">Condición Pago:</div><div class="col-8">${escapeHtml(data.condicion_pago)}</div></div>` : ''}
                    ${data.tiempo_entrega ? `<div class="row mb-2"><div class="col-4 text-muted small">Tiempo Entrega:</div><div class="col-8">${escapeHtml(data.tiempo_entrega)}</div></div>` : ''}
                    ${data.direccion_entrega ? `<div class="row mb-2"><div class="col-4 text-muted small">Dirección Entrega:</div><div class="col-8">${escapeHtml(data.direccion_entrega)}</div></div>` : ''}
                    ${data.validez_oferta ? `<div class="row mb-2"><div class="col-4 text-muted small">Validez Oferta:</div><div class="col-8">${escapeHtml(data.validez_oferta)}</div></div>` : ''}
                    ${data.nota_cotizacion ? `<hr><div class="mb-2"><div class="text-muted small">NOTA COMERCIAL</div>${escapeHtml(data.nota_cotizacion)}</div>` : ''}
                    ${data.notas ? `<hr><div class="mb-2"><div class="text-muted small">NOTAS INTERNAS</div>${escapeHtml(data.notas)}</div>` : ''}
                `;
            }
            
            const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
            modal.show();
        } else {
            mostrarNotificacion('Error al cargar detalle', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
    }
}

// ===========================
// EDITAR
// ===========================
function editar(id) {
    window.location.href = `/cotizacion/consultar/${id}`;
}

// ===========================
// MOSTRAR MODAL ELIMINAR
// ===========================
function mostrarModalEliminar(id, codigo) {
    cotizacionAEliminar = id;
    const infoSpan = document.getElementById('eliminarInfo');
    if (infoSpan) {
        infoSpan.innerHTML = `Cotización: <strong>${escapeHtml(codigo)}</strong><br>Esta acción no se puede deshacer.`;
    }
    const modal = new bootstrap.Modal(document.getElementById('modalEliminar'));
    modal.show();
}

// ===========================
// ELIMINAR COTIZACIÓN CONFIRMADO
// ===========================
async function eliminarCotizacionConfirmado() {
    if (!cotizacionAEliminar) return;
    
    try {
        const response = await fetch(`/api/cotizacion_comercial/${cotizacionAEliminar}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminar'));
            if (modal) modal.hide();
            mostrarNotificacion('✅ Cotización eliminada correctamente', 'success');
            await cargarCotizaciones();
        } else {
            mostrarNotificacion('❌ Error al eliminar: ' + (result.error || 'Error desconocido'), 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error de conexión', 'danger');
    }
    cotizacionAEliminar = null;
}

// ===========================
// ESTADO CON COLOR
// ===========================
function renderEstado(estado, esBorrador = false) {
    if (esBorrador) {
        return `<span class="estado estado-borrador">📝 BORRADOR</span>`;
    }
    let clase = '';
    let texto = estado || 'En Proceso';
    if (texto === 'En Proceso') {
        clase = 'estado-proceso';
        texto = '⏳ En Proceso';
    } else if (texto === 'Generada') {
        clase = 'estado-generada';
        texto = '📄 Generada';
    } else if (texto === 'Aceptada por Cliente') {
        clase = 'estado-aceptada';
        texto = '✅ Aceptada';
    } else if (texto === 'Rechazada') {
        clase = 'estado-rechazada';
        texto = '❌ Rechazada';
    } else {
        clase = 'estado-proceso';
    }
    return `<span class="estado ${clase}">${texto}</span>`;
}

// ===========================
// MOSTRAR NOTIFICACIÓN
// ===========================
function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3`;
    notificacion.style.zIndex = '9999';
    notificacion.style.minWidth = '300px';
    notificacion.style.animation = 'slideIn 0.3s ease';
    let icono = tipo === 'success' ? 'check-circle' : (tipo === 'danger' ? 'exclamation-triangle' : 'info-circle');
    notificacion.innerHTML = `<i class="bi bi-${icono} me-2"></i>${escapeHtml(mensaje)}`;
    document.body.appendChild(notificacion);
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ===========================
// CREAR NUEVO CLIENTE DESDE LISTADO
// ===========================
async function guardarNuevoClienteListado() {
    const tipoDocumento = document.getElementById('nuevo_tipo_documento_listado')?.value;
    const numeroDocumento = document.getElementById('nuevo_numero_documento_listado')?.value.trim();
    const razonSocial = document.getElementById('nuevo_razon_social_listado')?.value.trim();
    
    if (!numeroDocumento) {
        mostrarNotificacion('⚠️ Ingrese el número de documento', 'warning');
        return;
    }
    if (!razonSocial) {
        mostrarNotificacion('⚠️ Ingrese la razón social', 'warning');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardarNuevoClienteListado');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
    btnGuardar.disabled = true;
    
    try {
        const payload = {
            tipo_documento: tipoDocumento,
            numero_documento: numeroDocumento,
            razon_social: razonSocial,
            nombre_comercial: document.getElementById('nuevo_nombre_comercial_listado')?.value.trim() || '',
            direccion_fiscal: document.getElementById('nuevo_direccion_fiscal_listado')?.value.trim() || '',
            telefono_contacto: document.getElementById('nuevo_telefono_listado')?.value.trim() || '',
            email_contacto: document.getElementById('nuevo_email_listado')?.value.trim() || '',
            nombre_contacto: document.getElementById('nuevo_nombre_contacto_listado')?.value.trim() || ''
        };
        
        const response = await fetch('/api/clientes/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('formNuevoClienteListado')?.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoClienteListado'));
            if (modal) modal.hide();
            mostrarNotificacion('✅ Cliente creado exitosamente', 'success');
        } else {
            mostrarNotificacion('❌ Error: ' + (result.error || 'No se pudo crear el cliente'), 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error de conexión', 'danger');
    } finally {
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
    }
}

// ===========================
// ESTILOS ADICIONALES
// ===========================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .estado-borrador { background: #fef3c7; color: #92400e; border-left: 3px solid #f59e0b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    .estado-proceso { background: #e0e7ff; color: #3730a3; border-left: 3px solid #6366f1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    .estado-generada { background: #dbeafe; color: #1e40af; border-left: 3px solid #3b82f6; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    .estado-aceptada { background: #d1fae5; color: #065f46; border-left: 3px solid #10b981; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    .estado-rechazada { background: #fee2e2; color: #991b1b; border-left: 3px solid #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
    .btn-mini { background: none; border: none; font-size: 1.1rem; padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; margin: 0 2px; }
    .btn-mini:hover { transform: scale(1.05); }
    .btn-ver { color: #3b82f6; }
    .btn-ver:hover { background: rgba(59, 130, 246, 0.1); }
    .btn-editar { color: #f59e0b; }
    .btn-editar:hover { background: rgba(245, 158, 11, 0.1); }
    .btn-eliminar { color: #ef4444; }
    .btn-eliminar:hover { background: rgba(239, 68, 68, 0.1); }
    .monto { font-weight: 700; color: #111827; }
    .acciones { white-space: nowrap; }
    .codigo-cell, .fecha-cell, .cliente-cell, .estado-cell, .monto, .acciones { vertical-align: middle; }
    .fecha-hora .fecha { font-weight: 600; color: #111827; }
    .fecha-hora .hora { font-size: 11px; color: #6b7280; }
`;
document.head.appendChild(style);