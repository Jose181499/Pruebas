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
    let numero = parseFloat(cant);
    if (isNaN(numero)) return '0';
    if (numero % 1 === 0) {
        return numero.toString();
    }
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
                <td colspan="13" class="text-center py-5">
                    <div class="spinner-border text-primary mb-3"></div>
                    <div class="text-muted">Cargando cotizaciones...</div>
                </td>
            </tr>
        `;
    }

    try {
        let buscar = buscador ? buscador.value : "";
        
        if (buscar === ':1' || buscar === ':' || buscar === null) {
            console.warn("⚠️ Limpiando valor inválido del buscador:", buscar);
            buscar = "";
            if (buscador) buscador.value = "";
        }
        
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
                    <td colspan="13" class="text-center py-5 text-danger">
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
// RENDERIZAR TABLA - ORDEN CORRECTO DE COLUMNAS
// ===========================
function renderizarTabla(cotizaciones) {
    const tbody = document.getElementById('tbodyCotizaciones');
    
    if (!tbody) return;
    
    if (!cotizaciones || cotizaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center py-5 text-muted">
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
        
        // Tus datos existentes
        const ruc = c.ruc || '---';
        const codigoCliente = c.codigo_cliente || '---';
        const razonComercial = c.razon_comercial || c.nombre_comercial || '---';
        const razonSocial = c.razon_social || c.cliente || '---';
        const descripcion = c.descripcion || '---';
        const notaAclaratoria = c.nota_aclaratoria || '---';
        const condicionPago = c.condicion_pago || 'Contado';
        
        return `
            <tr data-id="${c.id}" data-codigo="${escapeHtml(codigoMostrar)}">
                <!-- 1. Ítems -->
                <td class="text-center fw-bold">${index + 1}</td>
                
                <!-- 2. Fecha y Hora -->
                <td class="fecha-cell">
                    <div class="fecha-hora">
                        <div class="fecha"><strong>${fecha}</strong></div>
                        <div class="hora small text-muted">${hora}</div>
                    </div>
                </td>
                
                <!-- 3. ESTADO (con colores semáforo) -->
                <td class="estado-cell">${estadoHtml}</td>
                
                <!-- 4. N° Cotización -->
                <td class="codigo-cell">
                    <strong>${escapeHtml(codigoMostrar || '-')}</strong>
                    ${c.correlativo ? `<br><small class="text-muted">Correl: ${c.correlativo}</small>` : ''}
                </td>
                
                <!-- 5. RUC -->
                <td>${escapeHtml(ruc)}</td>
                
                <!-- 6. Código Cliente -->
                <td><span class="badge-codigo">${escapeHtml(codigoCliente)}</span></td>
                
                <!-- 7. R comercial -->
                <td><small>${escapeHtml(razonComercial)}</small></td>
                
                <!-- 8. R social -->
                <td><strong>${escapeHtml(razonSocial)}</strong></td>
                
                <!-- 9. Descripción -->
                <td><small title="${escapeHtml(descripcion)}">${escapeHtml(descripcion.length > 50 ? descripcion.substring(0, 50) + '...' : descripcion)}</small></td>
                
                <!-- 10. Monto (Con IGV) -->
                <td class="monto text-end fw-bold text-success">S/ ${Number(total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                
                <!-- 11. Nota aclaratoria -->
                <td><small class="text-muted" title="${escapeHtml(notaAclaratoria)}">${escapeHtml(notaAclaratoria.length > 40 ? notaAclaratoria.substring(0, 40) + '...' : notaAclaratoria)}</small></td>
                
                <!-- 12. Condición pago -->
                <td><small>${escapeHtml(condicionPago)}</small></td>
                
                <!-- 13. Acciones -->
                <td class="acciones text-center">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="verDetalle(${c.id})">
                                <i class="bi bi-eye"></i> Ver detalle
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="editar(${c.id})">
                                <i class="bi bi-pencil"></i> Editar
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="duplicarCotizacion(${c.id})">
                                <i class="bi bi-files"></i> Duplicar
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="enviarPorEmail(${c.id})">
                                <i class="bi bi-envelope"></i> Enviar email
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="exportarPDF(${c.id})">
                                <i class="bi bi-file-pdf"></i> Exportar PDF
                            </a></li>
                            ${(c.estado === 'Generada' || c.estado === 'generada') ? `
                             <li><a class="dropdown-item text-success" href="#" onclick="aceptarCotizacion(${c.id}, '${escapeHtml(codigoMostrar)}')">
                             <i class="bi bi-check-circle-fill"></i> Aceptada
                             </a></li>
                             ` : ''}

                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="mostrarModalEliminar(${c.id}, '${escapeHtml(codigoMostrar)}')">
                                <i class="bi bi-trash"></i> Eliminar
                            </a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
// ===========================
// VER DETALLE
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
            
            const productosHtml = (data.detalle || []).map((p, index) => {
                const subtotalSinIGV = Number(p.subtotal_venta_con_descuento || 0);
                const igv = subtotalSinIGV * 0.18;
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
                                        <th>Código Producto</th>
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
// DUPLICAR COTIZACIÓN - FUNCIÓN PRINCIPAL
// ===========================
async function duplicarCotizacion(id) {
    try {
        mostrarNotificacion('📋 Duplicando cotización...', 'info');
        
        const response = await fetch(`/api/cotizacion/duplicar/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarNotificacion('✅ Cotización duplicada correctamente', 'success');
            // Recargar la lista para mostrar la nueva cotización
            await cargarCotizaciones();
        } else {
            mostrarNotificacion('❌ Error al duplicar: ' + (result.error || 'Error desconocido'), 'danger');
        }
    } catch (error) {
        console.error('Error al duplicar:', error);
        mostrarNotificacion('❌ Error de conexión al duplicar', 'danger');
    }
}

// ===========================
// ENVIAR POR EMAIL
// ===========================
async function enviarPorEmail(id) {
    try {
        mostrarNotificacion('📧 Enviando cotización por email...', 'info');
        
        const response = await fetch(`/api/cotizacion/enviar-email/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarNotificacion('✅ Cotización enviada por email correctamente', 'success');
        } else {
            mostrarNotificacion('❌ Error al enviar: ' + (result.error || 'Error desconocido'), 'danger');
        }
    } catch (error) {
        console.error('Error al enviar email:', error);
        mostrarNotificacion('❌ Error de conexión al enviar email', 'danger');
    }
}

// ===========================
// EXPORTAR PDF
// ===========================
function exportarPDF(id) {
    // Abrir el PDF en una nueva pestaña
    window.open(`/api/cotizacion/exportar-pdf/${id}`, '_blank');
}
// ===========================
// ACEPTAR COTIZACIÓN
// ===========================
async function aceptarCotizacion(id, codigo) {
    // Mostrar confirmación personalizada
    const confirmar = confirm(`¿Estás seguro que la cotización ${codigo} está aceptada?\n\nYa llegó el comprobante y esta acción no se puede corregir.\n\n¿Deseas marcarla como ACEPTADA?`);
    
    if (!confirmar) return;
    
    try {
        mostrarNotificacion('📝 Procesando aceptación de cotización...', 'info');
        
        const response = await fetch(`/api/cotizacion/aceptar/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarNotificacion('✅ Cotización marcada como ACEPTADA correctamente', 'success');
            // Recargar la tabla para mostrar el nuevo estado
            await cargarCotizaciones();
        } else {
            mostrarNotificacion('❌ Error al aceptar: ' + (result.error || 'Error desconocido'), 'danger');
        }
    } catch (error) {
        console.error('Error al aceptar cotización:', error);
        mostrarNotificacion('❌ Error de conexión al aceptar la cotización', 'danger');
    }
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
// ESTADO CON COLOR SEMÁFORO
// ===========================
function renderEstado(estado, esBorrador = false) {
    if (esBorrador) {
        return `<span class="estado-borrador">📝 BORRADOR</span>`;
    }
    let clase = '';
    let texto = estado || 'En Proceso';
    if (texto === 'En Proceso') {
        clase = 'estado-en-proceso';
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
        clase = 'estado-en-proceso';
    }
    return `<span class="${clase}">${texto}</span>`;
}

// ===========================
// MOSTRAR NOTIFICACIÓN
// ===========================
function mostrarNotificacion(mensaje, tipo) {
    const container = document.getElementById('notificacionesContainer');
    if (!container) return;
    
    const notificacion = document.createElement('div');
    const tipoClass = {
        'success': 'notificacion-exito',
        'danger': 'notificacion-error',
        'warning': 'notificacion-warning',
        'info': 'notificacion-info'
    };
    
    const iconos = {
        'success': 'bi-check-circle-fill',
        'danger': 'bi-x-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'info': 'bi-info-circle-fill'
    };
    
    notificacion.className = `notificacion ${tipoClass[tipo] || 'notificacion-info'}`;
    notificacion.innerHTML = `
        <i class="bi ${iconos[tipo] || 'bi-info-circle-fill'} me-2"></i>
        <span>${escapeHtml(mensaje)}</span>
        <button class="btn-close btn-close-white" onclick="this.parentElement.remove()"></button>
    `;
    
    container.appendChild(notificacion);
    
    setTimeout(() => {
        if (notificacion && notificacion.parentElement) {
            notificacion.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notificacion.remove(), 300);
        }
    }, 4000);
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
// ESTILOS ADICIONALES PARA SEMÁFORO
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
    
    .estado-borrador {
        background: #FEF3C7;
        color: #92400E;
        padding: 6px 14px;
        border-radius: 40px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
    }
    
    .estado-generada {
        background: #DCFCE7;
        color: #166534;
        padding: 6px 14px;
        border-radius: 40px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
    }
    
    .estado-aceptada {
        background: #D1FAE5;
        color: #065F46;
        padding: 6px 14px;
        border-radius: 40px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
    }
    
    .estado-rechazada {
        background: #FEE2E2;
        color: #991B1B;
        padding: 6px 14px;
        border-radius: 40px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
    }
    
    .estado-en-proceso {
        background: #E0E7FF;
        color: #3730A3;
        padding: 6px 14px;
        border-radius: 40px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        display: inline-block;
    }
    
    .badge-codigo {
        font-family: monospace;
        font-size: 13px;
        font-weight: 700;
        background: #f3f4f6;
        padding: 4px 10px;
        border-radius: 8px;
        color: #374151;
        display: inline-block;
    }
    
    .monto {
        font-weight: 700;
        color: #111827;
    }
    
    .fecha-hora .fecha {
        font-weight: 600;
        color: #111827;
    }
    
    .fecha-hora .hora {
        font-size: 11px;
        color: #6b7280;
    }
    
    .acciones .dropdown-toggle {
        background-color: #6c757d;
        border: none;
    }
    
    .dropdown-item i {
        margin-right: 8px;
    }
`;
document.head.appendChild(style);
window.aceptarCotizacion = aceptarCotizacion;