// listado_cotizaciones.js - VERSIÓN COMPACTA Y OPTIMIZADA
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

    // 📌 Ajustar altura de la tabla
    setTimeout(ajustarAlturaTabla, 200);
    window.addEventListener('resize', ajustarAlturaTabla);
});

// ===========================
// AJUSTAR ALTURA DE LA TABLA PARA SCROLL
// ===========================
function ajustarAlturaTabla() {
    const container = document.querySelector('.tabla-cotizaciones-container');
    if (!container) return;
    
    const windowHeight = window.innerHeight;
    let offsetTop = 0;
    let elem = container;
    while (elem) {
        offsetTop += elem.offsetTop || 0;
        elem = elem.offsetParent;
    }
    
    const availableHeight = windowHeight - offsetTop - 80;
    container.style.maxHeight = Math.max(availableHeight, 250) + 'px';
}

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
// CARGAR COTIZACIONES - CON ORDEN DESCENDENTE (más reciente primero)
// ===========================
// ===========================
// CARGAR COTIZACIONES - CON ORDEN: Aceptadas y Generadas primero
// ===========================
async function cargarCotizaciones() {
    const tbody = document.getElementById('tbodyCotizaciones');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center py-4">
                    <div class="spinner-border text-primary spinner-border-sm mb-1"></div>
                    <div class="small text-muted">Cargando cotizaciones...</div>
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
        
        // ==========================================
        // ✅ ORDENAR: Aceptadas y Generadas primero
        // ==========================================
        cotizacionesData.sort((a, b) => {
            // Definir prioridad de estados
            const prioridad = {
                'Aceptada por Cliente': 0,
                'aceptada': 0,
                'Generada': 1,
                'generada': 1,
                'En Proceso': 2,
                'en_proceso': 2,
                'Rechazada': 3,
                'rechazada': 3,
                'Borrador': 4,
                'borrador': 4
            };
            
            // Obtener prioridad de cada estado
            const prioridadA = prioridad[a.estado?.toLowerCase()] ?? 99;
            const prioridadB = prioridad[b.estado?.toLowerCase()] ?? 99;
            
            // Si tienen la misma prioridad, ordenar por fecha (más reciente primero)
            if (prioridadA === prioridadB) {
                const fechaA = new Date(a.fecha_creacion || 0);
                const fechaB = new Date(b.fecha_creacion || 0);
                return fechaB - fechaA;
            }
            
            return prioridadA - prioridadB;
        });
        
        // Cargar conteos de documentos vinculados
        await cargarConteoDocumentos(cotizacionesData);
        
        actualizarEstadisticas();
        renderizarTabla(cotizacionesData);

    } catch (e) {
        console.error("🔥 ERROR:", e);
        mostrarNotificacion('Error de conexión con el servidor: ' + e.message, 'danger');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center py-4 text-danger">
                        <i class="bi bi-wifi-off fs-3"></i>
                        <div class="small mt-1">Error de conexión: ${e.message}</div>
                    </td>
                </tr>
            `;
        }
    }
}
// ===========================
// CARGAR CONTEO DE DOCUMENTOS PARA CADA COTIZACIÓN
// ===========================
async function cargarConteoDocumentos(cotizaciones) {
    if (!cotizaciones || cotizaciones.length === 0) {
        return cotizaciones;
    }

    try {
        const promesas = cotizaciones.map(cot => 
            fetch(`/api/cotizacion/${cot.id}/documentos/count`)
                .then(res => res.json())
                .then(data => ({
                    id: cot.id,
                    count: data.success ? data.count : 0,
                    hasDocumentos: data.success ? data.has_documentos : false
                }))
                .catch(() => ({
                    id: cot.id,
                    count: 0,
                    hasDocumentos: false
                }))
        );

        const resultados = await Promise.all(promesas);
        
        const mapa = {};
        resultados.forEach(r => {
            mapa[r.id] = { count: r.count, hasDocumentos: r.hasDocumentos };
        });

        cotizaciones.forEach(cot => {
            const info = mapa[cot.id] || { count: 0, hasDocumentos: false };
            cot.documents_count = info.count;
            cot.tiene_documentos = info.hasDocumentos;
        });

        return cotizaciones;
    } catch (error) {
        console.error('Error cargando conteos de documentos:', error);
        return cotizaciones;
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
// RENDERIZAR TABLA - VERSIÓN COMPACTA Y OPTIMIZADA
// ===========================
function renderizarTabla(cotizaciones) {
    const tbody = document.getElementById('tbodyCotizaciones');
    
    if (!tbody) return;
    
    if (!cotizaciones || cotizaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-4 d-block"></i>
                    <small>No hay cotizaciones para mostrar</small>
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
        let estadoHtml = renderEstadoCompacto(c.estado, esBorrador);
        
        const ruc = c.ruc || '---';
        const codigoCliente = c.codigo_cliente || '---';
        const razonComercial = c.razon_comercial || c.nombre_comercial || '---';
        const razonSocial = c.razon_social || c.cliente || '---';
        const descripcion = c.descripcion || '---';
        const notaAclaratoria = c.nota_aclaratoria || '---';
        const condicionPago = c.condicion_pago || 'Contado';
        
        const tieneDocumentos = c.tiene_documentos || false;
        const documentosCount = c.documents_count || 0;
        
        // ID único para el dropdown
        const dropdownId = `dropdown-${c.id}-${index}`;
        
        // Construir items del dropdown
        let dropdownItems = `
            <li><a class="dropdown-item" href="#" onclick="verDetalle(${c.id}); return false;">
                <i class="bi bi-eye"></i> Ver detalle
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="editar(${c.id}); return false;">
                <i class="bi bi-pencil"></i> Editar
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="duplicarCotizacion(${c.id}); return false;">
                <i class="bi bi-files"></i> Duplicar
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="enviarPorEmail(${c.id}); return false;">
                <i class="bi bi-envelope"></i> Email
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="exportarPDF(${c.id}); return false;">
                <i class="bi bi-file-pdf"></i> PDF
            </a></li>
            <li><a class="dropdown-item text-info" href="#" onclick="verDocumentos(${c.id}); return false;">
                <i class="bi bi-link-45deg"></i> Documentos
                ${tieneDocumentos ? `<span class="badge bg-primary ms-1" style="font-size:9px;">${documentosCount}</span>` : ''}
            </a></li>
        `;
        
        // Agregar opción "Aceptada" solo si está Generada
        if (c.estado === 'Generada' || c.estado === 'generada') {
            dropdownItems += `
                <li><a class="dropdown-item text-success" href="#" onclick="aceptarCotizacion(${c.id}, '${escapeHtml(codigoMostrar)}'); return false;">
                    <i class="bi bi-check-circle-fill"></i> Aceptada
                </a></li>
            `;
        }
        
        // Agregar opciones para Aceptadas
        if (c.estado === 'Aceptada por Cliente' || c.estado === 'aceptada') {
            dropdownItems += `
                <li><a class="dropdown-item text-primary" href="#" onclick="crearGuiaRemision(${c.id}); return false;">
                    <i class="bi bi-truck"></i> Guía
                </a></li>
                <li><a class="dropdown-item text-success" href="#" onclick="crearComprobante(${c.id}, 'FACTURA'); return false;">
                    <i class="bi bi-receipt"></i> Factura
                </a></li>
                <li><a class="dropdown-item text-info" href="#" onclick="crearComprobante(${c.id}, 'BOLETA'); return false;">
                    <i class="bi bi-ticket-perforated"></i> Boleta
                </a></li>
            `;
        }
        
        // Agregar separador y eliminar
        dropdownItems += `
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="mostrarModalEliminar(${c.id}, '${escapeHtml(codigoMostrar)}'); return false;">
                <i class="bi bi-trash"></i> Eliminar
            </a></li>
        `;
        
        return `
            <tr data-id="${c.id}" data-codigo="${escapeHtml(codigoMostrar)}">
                <td class="text-center fw-bold" style="font-size:12px;">${index + 1}</td>
                <td>
                    <div class="fecha-compacta">
                        <div class="fecha">${fecha}</div>
                        <div class="hora">${hora}</div>
                    </div>
                </td>
                <td>${estadoHtml}</td>
                <td>
                    <strong style="font-size:12px;">${escapeHtml(codigoMostrar || '-')}</strong>
                    ${c.correlativo ? `<br><small style="font-size:9px;color:#6b7280;">${c.correlativo}</small>` : ''}
                </td>
                <td style="font-size:11px;">${escapeHtml(ruc)}</td>
                <td><span class="badge-codigo-cliente">${escapeHtml(codigoCliente)}</span></td>
                <td><small style="font-size:11px;">${escapeHtml(razonComercial)}</small></td>
                <td><strong style="font-size:12px;">${escapeHtml(razonSocial)}</strong></td>
                <td><small style="font-size:11px;" title="${escapeHtml(descripcion)}">${escapeHtml(descripcion.length > 35 ? descripcion.substring(0, 35) + '...' : descripcion)}</small></td>
                <td class="text-end monto-texto">S/ ${Number(total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td><small style="font-size:10px;color:#6b7280;" title="${escapeHtml(notaAclaratoria)}">${escapeHtml(notaAclaratoria.length > 20 ? notaAclaratoria.substring(0, 20) + '...' : notaAclaratoria)}</small></td>
                <td><small style="font-size:11px;">${escapeHtml(condicionPago)}</small></td>
                <td class="text-center">
                    <div class="dropdown dropdown-acciones" data-cotizacion-id="${c.id}">
                        <button class="btn-acciones" type="button" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false"
                                id="${dropdownId}">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="${dropdownId}">
                            ${dropdownItems}
                        </ul>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Ajustar altura después de renderizar
    setTimeout(ajustarAlturaTabla, 50);
}

// ===========================
// RENDER ESTADO - VERSIÓN COMPACTA
// ===========================
function renderEstadoCompacto(estado, esBorrador = false) {
    if (esBorrador) {
        return `<span class="estado-badge borrador">📝 BORRADOR</span>`;
    }
    let clase = 'proceso';
    let texto = estado || 'En Proceso';
    if (texto === 'En Proceso') {
        clase = 'proceso';
        texto = '⏳ Proceso';
    } else if (texto === 'Generada' || texto === 'generada') {
        clase = 'generada';
        texto = '📄 Generada';
    } else if (texto === 'Aceptada por Cliente' || texto === 'aceptada') {
        clase = 'aceptada';
        texto = '✅ Aceptada';
    } else if (texto === 'Rechazada' || texto === 'rechazada') {
        clase = 'rechazada';
        texto = '❌ Rechazada';
    }
    return `<span class="estado-badge ${clase}">${texto}</span>`;
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
            let estadoBadge = renderEstadoCompacto(data.estado, esBorrador);
            
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
                    <div class="row mb-2">
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
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <div class="text-muted small">FECHA Y HORA</div>
                            <strong>${fecha} - ${hora}</strong>
                        </div>
                        <div class="col-md-6">
                            <div class="text-muted small">TOTAL</div>
                            <strong class="text-success">S/ ${Number(total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                    <hr class="my-2">
                    <div class="mb-2">
                        <div class="text-muted small">CLIENTE</div>
                        <strong>${escapeHtml(data.cliente || 'Sin cliente')}</strong>
                        ${data.cliente_ruc ? `<br><small>RUC: ${escapeHtml(data.cliente_ruc)}</small>` : ''}
                    </div>
                    ${data.direccion_fiscal ? `<div class="mb-2"><div class="text-muted small">DIRECCIÓN FISCAL</div>${escapeHtml(data.direccion_fiscal)}</div>` : ''}
                    <hr class="my-2">
                    <div class="mb-2">
                        <div class="text-muted small">PRODUCTOS</div>
                        <div class="table-responsive mt-1">
                            <table class="table table-sm table-bordered" style="font-size:12px;">
                                <thead class="table-light">
                                    <tr>
                                        <th class="text-center">#</th>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Marca</th>
                                        <th class="text-center">Cant</th>
                                        <th class="text-end">Valor s/IGV</th>
                                        <th class="text-end">Precio c/IGV</th>
                                    </tr>
                                </thead>
                                <tbody>${productosHtml || '<tr><td colspan="7" class="text-center">Sin productos</td></tr>'}</tbody>
                            </table>
                        </div>
                    </div>
                    ${data.condicion_pago ? `<div class="row mb-1"><div class="col-4 text-muted small">Condición Pago:</div><div class="col-8">${escapeHtml(data.condicion_pago)}</div></div>` : ''}
                    ${data.tiempo_entrega ? `<div class="row mb-1"><div class="col-4 text-muted small">Tiempo Entrega:</div><div class="col-8">${escapeHtml(data.tiempo_entrega)}</div></div>` : ''}
                    ${data.direccion_entrega ? `<div class="row mb-1"><div class="col-4 text-muted small">Dirección Entrega:</div><div class="col-8">${escapeHtml(data.direccion_entrega)}</div></div>` : ''}
                    ${data.validez_oferta ? `<div class="row mb-1"><div class="col-4 text-muted small">Validez Oferta:</div><div class="col-8">${escapeHtml(data.validez_oferta)}</div></div>` : ''}
                    ${data.nota_cotizacion ? `<hr class="my-1"><div class="mb-1"><div class="text-muted small">NOTA COMERCIAL</div>${escapeHtml(data.nota_cotizacion)}</div>` : ''}
                    ${data.notas ? `<hr class="my-1"><div class="mb-1"><div class="text-muted small">NOTAS INTERNAS</div>${escapeHtml(data.notas)}</div>` : ''}
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
// DUPLICAR COTIZACIÓN
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
// CREAR COMPROBANTE (FACTURA/BOLETA)
// ===========================
async function crearComprobante(cotizacionId, tipoComprobante) {
    try {
        mostrarNotificacion(`📝 Preparando ${tipoComprobante === 'FACTURA' ? 'factura' : 'boleta'}...`, 'info');
        
        const response = await fetch(`/api/cotizacion/${cotizacionId}`);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            mostrarNotificacion('❌ Error al cargar datos de la cotización', 'danger');
            return;
        }
        
        const cotizacion = result.data;
        
        if (cotizacion.estado !== 'Aceptada por Cliente' && cotizacion.estado !== 'aceptada') {
            mostrarNotificacion('⚠️ Solo se pueden crear comprobantes de cotizaciones aceptadas', 'warning');
            return;
        }
        
        const productosComprobante = (cotizacion.detalle || []).map(producto => ({
            codigo: producto.codigo || '',
            descripcion: producto.descripcion || '',
            unidad: producto.unidad || 'NIU',
            cantidad: parseFloat(producto.cantidad || 0),
            precio_unitario: parseFloat(producto.precio_unitario || producto.costo_unitario || 0)
        }));
        
        const subtotal = productosComprobante.reduce((sum, p) => sum + (p.cantidad * p.precio_unitario), 0);
        const igv = subtotal * 0.18;
        const total = subtotal + igv;
        
        const datosComprobante = {
            tipo: tipoComprobante,
            cliente: {
                tipo_documento: cotizacion.numero_documento?.length === 11 ? 'RUC' : 'DNI',
                numero_documento: cotizacion.numero_documento || cotizacion.cliente_ruc,
                razon_social: cotizacion.razon_social || cotizacion.cliente,
                direccion: cotizacion.direccion_fiscal || cotizacion.direccion_entrega,
                telefono: cotizacion.telefono_cliente || cotizacion.telefono_contacto,
                email: cotizacion.email_cliente || cotizacion.email_contacto
            },
            productos: productosComprobante,
            subtotal: subtotal,
            igv: igv,
            total: total,
            numero_cotizacion: cotizacion.numero_cotizacion || cotizacion.codigo_cotizacion,
            observaciones: cotizacion.nota_cotizacion || cotizacion.notas || '',
            fecha_cotizacion: cotizacion.fecha_creacion
        };
        
        localStorage.setItem('datos_cotizacion_para_comprobante', JSON.stringify(datosComprobante));
        
        if (tipoComprobante === 'FACTURA') {
            window.location.href = '/comprobantes/crear?tipo=FACTURA&from_cotizacion=' + cotizacionId;
        } else {
            window.location.href = '/comprobantes/crear?tipo=BOLETA&from_cotizacion=' + cotizacionId;
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al preparar: ' + error.message, 'danger');
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
    window.open(`/api/cotizacion/exportar-pdf/${id}`, '_blank');
}

// ===========================
// ACEPTAR COTIZACIÓN - MOVER AL PRINCIPIO
// ===========================
async function aceptarCotizacion(id, codigo) {
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
            const cotizacion = cotizacionesData.find(c => c.id === id);
            if (cotizacion) {
                cotizacion.estado = 'Aceptada por Cliente';
            }
            
            cotizacionesData.sort((a, b) => {
                if (a.id === id) return -1;
                if (b.id === id) return 1;
                const orden = { 'Aceptada por Cliente': 0, 'aceptada': 0, 'Generada': 1, 'generada': 1 };
                const ordenA = orden[a.estado] ?? 2;
                const ordenB = orden[b.estado] ?? 2;
                return ordenA - ordenB;
            });
            
            mostrarNotificacion('✅ Cotización marcada como ACEPTADA correctamente', 'success');
            actualizarEstadisticas();
            renderizarTabla(cotizacionesData);
        } else {
            mostrarNotificacion('❌ Error al aceptar: ' + (result.error || 'Error desconocido'), 'danger');
        }
    } catch (error) {
        console.error('Error al aceptar cotización:', error);
        mostrarNotificacion('❌ Error de conexión al aceptar la cotización', 'danger');
    }
}

// ===========================
// CREAR GUÍA DE REMISIÓN
// ===========================
async function crearGuiaRemision(cotizacionId) {
    try {
        mostrarNotificacion('🚚 Preparando guía de remisión...', 'info');
        
        const response = await fetch(`/api/cotizacion/${cotizacionId}`);
        const result = await response.json();
        
        if (!result.success || !result.data) {
            mostrarNotificacion('❌ Error al cargar datos de la cotización', 'danger');
            return;
        }
        
        const cotizacion = result.data;
        
        if (cotizacion.estado !== 'Aceptada por Cliente' && cotizacion.estado !== 'aceptada') {
            mostrarNotificacion('⚠️ Solo se pueden crear guías de cotizaciones aceptadas', 'warning');
            return;
        }
        
        const datosGuia = {
            cliente: {
                ruc: cotizacion.numero_documento || cotizacion.cliente_ruc,
                razon_social: cotizacion.razon_social || cotizacion.cliente,
                direccion: cotizacion.direccion_entrega || cotizacion.direccion_fiscal,
                telefono: cotizacion.telefono_cliente || cotizacion.telefono_contacto,
                email: cotizacion.email_cliente || cotizacion.email_contacto,
                contacto: cotizacion.contacto_cliente || cotizacion.nombre_contacto
            },
            productos: (cotizacion.detalle || []).map(p => ({
                codigo: p.codigo || '',
                descripcion: p.descripcion || '',
                unidad: p.unidad || 'NIU',
                cantidad: parseFloat(p.cantidad || 0),
                peso_unitario: p.peso || 0
            })),
            documento_asociado: cotizacion.numero_cotizacion || cotizacion.codigo_cotizacion,
            observaciones: cotizacion.nota_cotizacion || cotizacion.notas || '',
            fecha_cotizacion: cotizacion.fecha_creacion
        };
        
        localStorage.setItem('datos_cotizacion_para_guia', JSON.stringify(datosGuia));
        window.location.href = '/guias/crear?from_cotizacion=' + cotizacionId;
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('❌ Error al preparar guía de remisión: ' + error.message, 'danger');
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
// ESTADO CON COLOR SEMÁFORO - VERSIÓN LEGACY (para compatibilidad)
// ===========================
function renderEstado(estado, esBorrador = false) {
    return renderEstadoCompacto(estado, esBorrador);
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
// 🆕 VER DOCUMENTOS VINCULADOS
// ===========================
window.verDocumentos = async function(id) {
    const lista = document.getElementById('documentosLista');
    if (lista) {
        lista.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary spinner-border-sm"></div>
                <p class="mt-1 small text-muted">Cargando documentos...</p>
            </div>
        `;
    }

    const modalElement = document.getElementById('modalDocumentosVinculados');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }

    try {
        const response = await fetch(`/api/cotizacion/${id}/documentos`);
        const data = await response.json();

        if (!data.success) {
            mostrarNotificacion('❌ Error al cargar documentos: ' + (data.error || 'Error desconocido'), 'danger');
            if (lista) {
                lista.innerHTML = `
                    <div class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-triangle fs-3 d-block"></i>
                        <p class="small">Error al cargar los documentos</p>
                    </div>
                `;
            }
            return;
        }

        const info = data.data;
        const cotizacion = info.cotizacion || {};
        const documentos = info.documentos || [];

        const docNumero = document.getElementById('docCotizacionNumero');
        const docCliente = document.getElementById('docClienteNombre');
        const docVendedor = document.getElementById('docVendedorNombre');

        if (docNumero) docNumero.textContent = cotizacion.codigo_cotizacion || cotizacion.numero_cotizacion || '--';
        if (docCliente) docCliente.textContent = cotizacion.cliente_nombre || '--';
        if (docVendedor) docVendedor.textContent = cotizacion.vendedor_nombre || '--';

        let html = '';
        if (documentos.length === 0) {
            html = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-file-earmark-x fs-3 d-block mb-2"></i>
                    <h6 class="small">No hay documentos vinculados</h6>
                </div>
            `;
        } else {
            documentos.forEach(doc => {
                const icon = getDocumentoIcon(doc.tipo_corto || doc.tipo);
                const color = getDocumentoColor(doc.tipo_corto || doc.tipo);
                const esCotizacion = doc.es_cotizacion || false;
                
                let fechaMostrar = doc.fecha || '--';
                if (fechaMostrar && fechaMostrar !== '--') {
                    const partes = fechaMostrar.split(' ');
                    if (partes.length >= 2) {
                        const fechaParte = partes[0].split('-');
                        if (fechaParte.length === 3) {
                            fechaMostrar = `${fechaParte[2]}/${fechaParte[1]}/${fechaParte[0]} ${partes[1].substring(0, 5)}`;
                        }
                    }
                }

                const estiloFila = esCotizacion ? 'background-color: #f0f4ff; border-left: 3px solid #4f46e5;' : '';

                html += `
                    <div class="documento-item" style="${estiloFila}">
                        <div class="documento-tipo">
                            <i class="bi ${icon}" style="color: ${color}; font-size: 18px;"></i>
                            <span class="ms-2 small">${escapeHtml(doc.tipo || 'Documento')}</span>
                            ${esCotizacion ? '<span class="badge bg-primary ms-1" style="font-size:9px;">Principal</span>' : ''}
                        </div>
                        <div class="documento-detalle">
                            <span class="documento-numero">${escapeHtml(doc.numero || '--')}</span>
                            <span class="documento-fecha"><i class="bi bi-clock me-1"></i>${fechaMostrar}</span>
                            <span class="documento-cliente"><i class="bi bi-person me-1"></i>${escapeHtml(doc.cliente_nombre || doc.cliente_ruc || '--')}</span>
                            ${doc.url ? `<a href="${doc.url}" class="btn btn-sm btn-outline-primary" target="_blank" title="Ver documento"><i class="bi bi-eye"></i></a>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        if (lista) lista.innerHTML = html;

    } catch (error) {
        console.error('Error al cargar documentos:', error);
        mostrarNotificacion('❌ Error de conexión al cargar documentos', 'danger');
        if (lista) {
            lista.innerHTML = `
                <div class="text-center py-4 text-danger">
                    <i class="bi bi-wifi-off fs-3 d-block"></i>
                    <p class="small">Error de conexión: ${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }
};





// ===========================
// EXPORTAR A EXCEL
// ===========================
function exportarExcel() {
    try {
        // Obtener los datos actuales (filtrados o no)
        const filtroTipo = document.getElementById('filtroTipo')?.value || 'todas';
        const busqueda = document.getElementById('buscador')?.value?.toLowerCase() || '';
        
        let datos = [...cotizacionesData];
        
        // Aplicar filtros
        if (filtroTipo !== 'todas') {
            datos = datos.filter(c => {
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
            datos = datos.filter(c => {
                return (
                    (c.numero_cotizacion && c.numero_cotizacion.toLowerCase().includes(busqueda)) ||
                    (c.codigo_cotizacion && c.codigo_cotizacion.toLowerCase().includes(busqueda)) ||
                    (c.cliente && c.cliente.toLowerCase().includes(busqueda)) ||
                    (c.vendedor && c.vendedor.toLowerCase().includes(busqueda)) ||
                    (c.ruc && c.ruc.toLowerCase().includes(busqueda))
                );
            });
        }

        if (datos.length === 0) {
            mostrarNotificacion('⚠️ No hay datos para exportar', 'warning');
            return;
        }

        mostrarNotificacion('📊 Generando archivo Excel...', 'info');

        // Crear encabezados
        const headers = [
            'N°',
            'Código Cotización',
            'Estado',
            'Fecha',
            'Hora',
            'RUC',
            'Código Cliente',
            'Razón Comercial',
            'Razón Social',
            'Descripción',
            'Monto (S/)',
            'Nota Aclaratoria',
            'Condición Pago',
            'Vendedor'
        ];

        // Preparar datos para Excel
        const rows = datos.map((c, index) => {
            const fecha = formatearFecha(c.fecha_creacion);
            const hora = formatearHora(c.fecha_creacion);
            const total = Number(c.total || 0).toFixed(2);
            const esBorrador = c.codigo_cotizacion && c.codigo_cotizacion.startsWith('TMP-');
            let estado = c.estado || 'En Proceso';
            if (esBorrador) estado = 'BORRADOR';
            
            return [
                index + 1,
                c.codigo_cotizacion || c.numero_cotizacion || '-',
                estado,
                fecha,
                hora,
                c.ruc || '---',
                c.codigo_cliente || '---',
                c.razon_comercial || c.nombre_comercial || '---',
                c.razon_social || c.cliente || '---',
                c.descripcion || '---',
                total,
                c.nota_aclaratoria || '---',
                c.condicion_pago || 'Contado',
                c.vendedor || '---'
            ];
        });

        // Construir contenido CSV/Excel
        let csvContent = '\uFEFF'; // BOM para UTF-8
        csvContent += headers.join(',') + '\n';
        
        rows.forEach(row => {
            const escapedRow = row.map(cell => {
                if (typeof cell === 'string') {
                    // Escapar comillas y manejar comas
                    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                }
                return cell;
            });
            csvContent += escapedRow.join(',') + '\n';
        });

        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const fechaActual = new Date();
        const fechaStr = fechaActual.toISOString().slice(0, 10);
        link.setAttribute('download', `cotizaciones_${fechaStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarNotificacion(`✅ Excel exportado correctamente (${datos.length} registros)`, 'success');

    } catch (error) {
        console.error('Error al exportar Excel:', error);
        mostrarNotificacion('❌ Error al exportar: ' + error.message, 'danger');
    }
}

// ===========================
// EXPORTAR A EXCEL CON XLSX (versión mejorada - requiere librería)
// ===========================
async function exportarExcelAvanzado() {
    try {
        // Verificar si la librería XLSX está disponible
        if (typeof XLSX === 'undefined') {
            // Cargar librería dinámicamente
            await cargarLibreriaXLSX();
        }

        const filtroTipo = document.getElementById('filtroTipo')?.value || 'todas';
        const busqueda = document.getElementById('buscador')?.value?.toLowerCase() || '';
        
        let datos = [...cotizacionesData];
        
        // Aplicar filtros
        if (filtroTipo !== 'todas') {
            datos = datos.filter(c => {
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
            datos = datos.filter(c => {
                return (
                    (c.numero_cotizacion && c.numero_cotizacion.toLowerCase().includes(busqueda)) ||
                    (c.codigo_cotizacion && c.codigo_cotizacion.toLowerCase().includes(busqueda)) ||
                    (c.cliente && c.cliente.toLowerCase().includes(busqueda)) ||
                    (c.vendedor && c.vendedor.toLowerCase().includes(busqueda)) ||
                    (c.ruc && c.ruc.toLowerCase().includes(busqueda))
                );
            });
        }

        if (datos.length === 0) {
            mostrarNotificacion('⚠️ No hay datos para exportar', 'warning');
            return;
        }

        mostrarNotificacion('📊 Generando archivo Excel...', 'info');

        // Crear datos para el libro
        const excelData = datos.map((c, index) => {
            const fecha = formatearFecha(c.fecha_creacion);
            const hora = formatearHora(c.fecha_creacion);
            const total = Number(c.total || 0).toFixed(2);
            const esBorrador = c.codigo_cotizacion && c.codigo_cotizacion.startsWith('TMP-');
            let estado = c.estado || 'En Proceso';
            if (esBorrador) estado = 'BORRADOR';
            
            return {
                'N°': index + 1,
                'Código Cotización': c.codigo_cotizacion || c.numero_cotizacion || '-',
                'Estado': estado,
                'Fecha': fecha,
                'Hora': hora,
                'RUC': c.ruc || '---',
                'Código Cliente': c.codigo_cliente || '---',
                'Razón Comercial': c.razon_comercial || c.nombre_comercial || '---',
                'Razón Social': c.razon_social || c.cliente || '---',
                'Descripción': c.descripcion || '---',
                'Monto (S/)': total,
                'Nota Aclaratoria': c.nota_aclaratoria || '---',
                'Condición Pago': c.condicion_pago || 'Contado',
                'Vendedor': c.vendedor || '---'
            };
        });

        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Ajustar anchos de columnas
        const colWidths = [
            { wch: 6 },   // N°
            { wch: 18 },  // Código Cotización
            { wch: 12 },  // Estado
            { wch: 12 },  // Fecha
            { wch: 10 },  // Hora
            { wch: 14 },  // RUC
            { wch: 14 },  // Código Cliente
            { wch: 20 },  // Razón Comercial
            { wch: 25 },  // Razón Social
            { wch: 30 },  // Descripción
            { wch: 14 },  // Monto
            { wch: 25 },  // Nota Aclaratoria
            { wch: 18 },  // Condición Pago
            { wch: 18 }   // Vendedor
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
        
        // Generar archivo
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const fechaActual = new Date();
        const fechaStr = fechaActual.toISOString().slice(0, 10);
        link.setAttribute('download', `cotizaciones_${fechaStr}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarNotificacion(`✅ Excel exportado correctamente (${datos.length} registros)`, 'success');

    } catch (error) {
        console.error('Error al exportar Excel:', error);
        mostrarNotificacion('❌ Error al exportar: ' + error.message, 'danger');
    }
}

// ===========================
// CARGAR LIBRERÍA XLSX
// ===========================
function cargarLibreriaXLSX() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Error al cargar la librería XLSX'));
        document.head.appendChild(script);
    });
}

// ===========================
// ASIGNAR EVENTO AL BOTÓN DE EXPORTAR
// ===========================
function inicializarExportacion() {
    const btnExportar = document.getElementById('btnExportarExcel');
    if (btnExportar) {
        btnExportar.addEventListener('click', function(e) {
            e.preventDefault();
            // Usar versión avanzada si es posible, o la básica
            if (typeof XLSX !== 'undefined') {
                exportarExcelAvanzado();
            } else {
                // Intentar cargar la librería primero
                cargarLibreriaXLSX()
                    .then(() => exportarExcelAvanzado())
                    .catch(() => {
                        // Fallback a CSV si no se puede cargar XLSX
                        mostrarNotificacion('⚠️ Usando formato CSV (instalando librería...)', 'warning');
                        exportarExcel();
                    });
            }
        });
    }
}

// ===========================
// EXPORTAR SOLO LOS DATOS VISIBLES (filtrados)
// ===========================
function exportarFiltrados() {
    // Esta función usa los datos ya filtrados en la tabla actual
    const tbody = document.getElementById('tbodyCotizaciones');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr[data-id]');
    if (rows.length === 0) {
        mostrarNotificacion('⚠️ No hay datos visibles para exportar', 'warning');
        return;
    }
    
    // Extraer datos de la tabla visible
    const datosVisibles = [];
    rows.forEach((row, index) => {
        const celdas = row.querySelectorAll('td');
        if (celdas.length >= 12) {
            datosVisibles.push({
                'N°': index + 1,
                'Código Cotización': celdas[3]?.textContent?.trim() || '-',
                'Estado': celdas[2]?.textContent?.trim() || '-',
                'Fecha': celdas[0]?.querySelector('.fecha')?.textContent?.trim() || '-',
                'Hora': celdas[0]?.querySelector('.hora')?.textContent?.trim() || '-',
                'RUC': celdas[4]?.textContent?.trim() || '-',
                'Código Cliente': celdas[5]?.textContent?.trim() || '-',
                'Razón Comercial': celdas[6]?.textContent?.trim() || '-',
                'Razón Social': celdas[7]?.textContent?.trim() || '-',
                'Descripción': celdas[8]?.textContent?.trim() || '-',
                'Monto (S/)': celdas[9]?.textContent?.replace('S/ ', '')?.trim() || '0.00',
                'Nota Aclaratoria': celdas[10]?.textContent?.trim() || '-',
                'Condición Pago': celdas[11]?.textContent?.trim() || 'Contado'
            });
        }
    });
    
    if (datosVisibles.length === 0) {
        mostrarNotificacion('⚠️ No hay datos para exportar', 'warning');
        return;
    }
    
    // Crear CSV con los datos visibles
    let csvContent = '\uFEFF';
    const headers = Object.keys(datosVisibles[0]);
    csvContent += headers.join(',') + '\n';
    
    datosVisibles.forEach(row => {
        const values = headers.map(key => {
            let val = row[key] || '';
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csvContent += values.join(',') + '\n';
    });
    
    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fechaActual = new Date();
    const fechaStr = fechaActual.toISOString().slice(0, 10);
    link.setAttribute('download', `cotizaciones_filtradas_${fechaStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion(`✅ Exportadas ${datosVisibles.length} cotizaciones visibles`, 'success');
}

// ===========================
// INICIALIZAR AL CARGAR LA PÁGINA
// ===========================
// Agregar al DOMContentLoaded existente
const originalDOMContentLoaded = window.addEventListener('DOMContentLoaded', function() {
    inicializarExportacion();
});

// También agregar al final del archivo para asegurar
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    inicializarExportacion();
} else {
    document.addEventListener('DOMContentLoaded', inicializarExportacion);
}
// ===========================
// FUNCIONES AUXILIARES PARA DOCUMENTOS
// ===========================
function getDocumentoIcon(tipo) {
    const icons = {
        'Cotización': 'bi-file-earmark-text',
        'Guía': 'bi-truck',
        'Guía de Remisión': 'bi-truck',
        'Factura': 'bi-file-earmark-pdf',
        'Boleta': 'bi-receipt',
        'Comprobante': 'bi-receipt-cut'
    };
    return icons[tipo] || 'bi-file-earmark';
}

function getDocumentoColor(tipo) {
    const colors = {
        'Cotización': '#4f46e5',
        'Guía': '#2563eb',
        'Guía de Remisión': '#2563eb',
        'Factura': '#d97706',
        'Boleta': '#059669',
        'Comprobante': '#059669'
    };
    return colors[tipo] || '#6b7280';
}

// ===========================
// ESTILOS ADICIONALES - VERSIÓN COMPACTA
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
    
    /* Estados compactos */
    .estado-badge {
        padding: 2px 10px;
        border-radius: 30px;
        font-size: 10px;
        font-weight: 700;
        display: inline-block;
        white-space: nowrap;
    }
    
    .estado-badge.borrador {
        background: #FEF3C7;
        color: #92400E;
    }
    
    .estado-badge.generada {
        background: #0055FF !important;
        color: #FFFFFF !important;
        box-shadow: 0 0 8px rgba(0, 85, 255, 0.3);
        border: 1px solid #0044CC;
    }
    
    .estado-badge.aceptada {
        background: #00FF00 !important;
        color: #000000 !important;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.4);
        font-weight: 900;
        border: 1px solid #00CC00;
    }
    
    .estado-badge.rechazada {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    .estado-badge.proceso {
        background: #E0E7FF;
        color: #3730A3;
    }
    
    /* Fecha compacta */
    .fecha-compacta {
        line-height: 1.2;
    }
    
    .fecha-compacta .fecha {
        font-weight: 600;
        font-size: 11px;
        color: #111827;
    }
    
    .fecha-compacta .hora {
        font-size: 10px;
        color: #6b7280;
    }
    
    /* Código cliente compacto */
    .badge-codigo-cliente {
        font-family: monospace;
        font-size: 11px;
        font-weight: 600;
        background: #f3f4f6;
        padding: 2px 8px;
        border-radius: 4px;
        color: #374151;
    }
    
    /* Monto compacto */
    .monto-texto {
        font-weight: 700;
        color: #059669;
        font-size: 12px;
    }
    
    /* Dropdown compacto y optimizado */
    .dropdown-acciones {
        position: relative;
        display: inline-block;
    }
    
    .dropdown-acciones .btn-acciones {
        width: 28px;
        height: 28px;
        padding: 0;
        font-size: 14px;
        background: #e5e7eb;
        border: none;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        cursor: pointer;
    }
    
    .dropdown-acciones .btn-acciones:hover {
        background: #d1d5db;
        transform: scale(1.05);
    }
    
    .dropdown-acciones .btn-acciones:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(108, 117, 125, 0.3);
    }
    
    .dropdown-acciones .dropdown-menu {
        min-width: 160px;
        padding: 4px 0;
        border-radius: 8px;
        font-size: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        border: 1px solid rgba(0,0,0,0.05);
        z-index: 1050;
    }
    
    .dropdown-acciones .dropdown-menu.show {
        animation: dropdownFadeIn 0.15s ease;
    }
    
    @keyframes dropdownFadeIn {
        from { opacity: 0; transform: translateY(-6px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .dropdown-acciones .dropdown-item {
        padding: 4px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.1s ease;
    }
    
    .dropdown-acciones .dropdown-item:hover {
        background: #f3f4f6;
    }
    
    .dropdown-acciones .dropdown-item i {
        margin-right: 6px;
        font-size: 13px;
        width: 16px;
        text-align: center;
    }
    
    .dropdown-acciones .dropdown-item.text-danger:hover {
        background: #fef2f2;
    }
    
    .dropdown-acciones .dropdown-item.text-success:hover {
        background: #f0fdf4;
    }
    
    .dropdown-acciones .dropdown-item.text-info:hover {
        background: #eff6ff;
    }
    
    .dropdown-acciones .dropdown-item.text-primary:hover {
        background: #eff6ff;
    }
    
    .dropdown-acciones .dropdown-divider {
        margin: 2px 0;
        border-color: #e5e7eb;
    }
    
    /* Documentos */
    .documento-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
        border-radius: 6px;
        margin-bottom: 2px;
        font-size: 13px;
    }
    
    .documento-item:hover {
        background: #f8fafc;
    }
    
    .documento-item:last-child {
        border-bottom: none;
    }
    
    .documento-tipo {
        font-weight: 700;
        font-size: 13px;
        color: #111827;
        display: flex;
        align-items: center;
    }
    
    .documento-tipo i {
        margin-right: 8px;
        font-size: 18px;
    }
    
    .documento-detalle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .documento-numero {
        font-family: monospace;
        font-weight: 600;
        color: #374151;
        background: #f3f4f6;
        padding: 2px 10px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .documento-fecha {
        font-size: 11px;
        color: #6b7280;
    }
    
    .documento-cliente {
        font-size: 12px;
        color: #4b5563;
    }
    
    /* Scrollbar */
    .tabla-cotizaciones-container::-webkit-scrollbar {
        width: 5px;
        height: 5px;
    }
    
    .tabla-cotizaciones-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    .tabla-cotizaciones-container::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 10px;
    }
    
    .tabla-cotizaciones-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }
`;
document.head.appendChild(style);

// ===========================
// EXPONER FUNCIONES GLOBALES
// ===========================
window.aceptarCotizacion = aceptarCotizacion;
window.crearComprobante = crearComprobante;
window.verDocumentos = verDocumentos;
window.editar = editar;
window.duplicarCotizacion = duplicarCotizacion;
window.exportarPDF = exportarPDF;
window.enviarPorEmail = enviarPorEmail;
window.crearGuiaRemision = crearGuiaRemision;
window.mostrarModalEliminar = mostrarModalEliminar;
window.verDetalle = verDetalle;