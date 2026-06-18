// listado_compras.js - Gestor de Compras (VERSIÓN COMPLETA)

// Variables globales
let ordenesData = [];
let ordenesFiltradas = [];

// Mapeo de estados
const estadoMap = {
    'pendiente': { class: 'status-pendiente', icon: 'bi-clock-history', text: 'PENDIENTE' },
    'cotizando': { class: 'status-cotizando', icon: 'bi-arrow-repeat', text: 'EN COTIZACIÓN' },
    'aprobado': { class: 'status-aprobado', icon: 'bi-check-circle', text: 'APROBADO' },
    'rechazado': { class: 'status-rechazado', icon: 'bi-x-circle', text: 'RECHAZADO' },
    'ordenado': { class: 'status-ordenado', icon: 'bi-cart-check', text: 'ORDENADO' },
    'recibido': { class: 'status-recibido', icon: 'bi-box-seam', text: 'RECIBIDO' }
};

// =========================
// CARGAR ÓRDENES DESDE API
// =========================
async function cargarOrdenes() {
    mostrarLoading(true);
    
    try {
        const response = await fetch('/api/ordenes_compra');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log("📦 Datos recibidos:", result);
        
        if (result.success && Array.isArray(result.data)) {
            ordenesData = result.data;
        } else if (Array.isArray(result)) {
            ordenesData = result;
        } else {
            console.error("Formato de respuesta inválido:", result);
            ordenesData = [];
            mostrarNotificacion('Formato de datos inválido del servidor', 'error');
        }
        
        ordenesFiltradas = [...ordenesData];
        renderTable();
        actualizarStats();
        
    } catch (error) {
        console.error('Error al cargar órdenes:', error);
        mostrarNotificacion('Error al cargar las órdenes de compra', 'error');
        mostrarTablaVacia();
    } finally {
        mostrarLoading(false);
    }
}

// =========================
// MOSTRAR LOADING
// =========================
function mostrarLoading(mostrar) {
    const tbody = document.getElementById('tbodyOrdenes');
    
    if (mostrar && tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" style="color: #0a2540;"></div>
                    <div class="text-muted">Cargando órdenes de compra...</div>
                </td>
            </tr>
        `;
    }
}

// =========================
// MOSTRAR TABLA VACÍA
// =========================
function mostrarTablaVacia() {
    const tbody = document.getElementById('tbodyOrdenes');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center py-5">
                    <i class="bi bi-inbox fs-1 text-muted"></i>
                    <p class="text-muted mt-2">No hay órdenes de compra registradas</p>
                </td>
            </tr>
        `;
    }
}

// =========================
// RENDERIZAR TABLA - TODAS LAS COLUMNAS
// =========================
function renderTable() {
    const tbody = document.getElementById('tbodyOrdenes');
    
    if (!ordenesFiltradas || ordenesFiltradas.length === 0) {
        mostrarTablaVacia();
        return;
    }
    
    tbody.innerHTML = ordenesFiltradas.map(orden => {
        // Obtener datos del proveedor
        const proveedor = orden.proveedor || 'Sin proveedor';
        const proveedorRuc = orden.proveedor_ruc || orden.ruc || '--';
        const codigoProveedor = orden.codigo_proveedor || '--';
        const razonSocial = orden.razon_social || proveedor || '--';
        const nombreComercial = orden.nombre_comercial || '--';
        
        // Obtener estado
        const estado = estadoMap[orden.estado] || estadoMap.pendiente;
        
        // Número de orden
        const codigoMostrar = orden.numero_orden || orden.codigo_orden || '--';
        
        // Fecha y hora
        const fechaMostrar = orden.fecha_creacion || orden.fecha;
        
        // Monto total
        const montoMostrar = orden.total || 0;
        
        // Descripción
        const descripcion = orden.descripcion || '--';
        
        // Nota aclaratoria
        const notaAclaratoria = orden.nota_aclaratoria || orden.nota_compra || orden.notas || '--';
        
        // Condición de pago
        const condicionPago = orden.condicion_pago || '--';
        
        // Total de ítems
        const totalItems = orden.total_items || (orden.detalle ? orden.detalle.length : 0);
        
        return `
            <tr>
                <!-- Ítems -->
                <td class="text-center">
                    <span class="items-badge">${totalItems}</span>
                </td>
                
                <!-- Fecha y Hora -->
                <td>
                    <div class="fecha">${formatFecha(fechaMostrar)}</div>
                    <div class="hora"><i class="bi bi-clock"></i> ${formatHora(fechaMostrar)}</div>
                </td>
                
                <!-- Estado -->
                <td>
                    <span class="badge-status ${estado.class}">
                        <i class="bi ${estado.icon}"></i>
                        ${estado.text}
                    </span>
                </td>
                
                <!-- N° Orden -->
                <td><span class="order-code">${escapeHtml(codigoMostrar)}</span></td>
                
                <!-- RUC -->
                <td><span class="proveedor-ruc">${escapeHtml(proveedorRuc)}</span></td>
                
                <!-- Código Proveedor -->
                <td><span style="font-size:0.7rem; font-weight:600;">${escapeHtml(codigoProveedor)}</span></td>
                
                <!-- R. Comercial -->
                <td><span style="font-size:0.7rem;">${escapeHtml(nombreComercial)}</span></td>
                
                <!-- R. Social -->
                <td><span style="font-size:0.7rem; font-weight:500;">${escapeHtml(razonSocial)}</span></td>
                
                <!-- Descripción -->
                <td><span style="font-size:0.7rem;">${escapeHtml(descripcion)}</span></td>
                
                <!-- Monto (Con IGV) -->
                <td class="text-end">
                    <span class="amount">S/ ${formatMonto(montoMostrar)}</span>
                </td>
                
                <!-- Nota Aclaratoria -->
                <td><span style="font-size:0.65rem; color:#6c7e8e;">${escapeHtml(notaAclaratoria)}</span></td>
                
                <!-- Condición Pago -->
                <td><span style="font-size:0.65rem;">${escapeHtml(condicionPago)}</span></td>
                
                <!-- Acciones -->
                <td>
                    <div class="action-icons">
                        <button class="action-icon action-view" onclick="verDetalle(${orden.id})" title="Ver detalle">
                            <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="action-icon action-edit" onclick="editarOrden(${orden.id})" title="Editar">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="action-icon action-pdf" onclick="generarPDF(${orden.id})" title="Generar PDF">
                            <i class="bi bi-file-pdf-fill"></i>
                        </button>
                        <button class="action-icon action-delete" onclick="eliminarOrden(${orden.id})" title="Eliminar">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// =========================
// ACTUALIZAR ESTADÍSTICAS
// =========================
function actualizarStats() {
    const total = ordenesData.length;
    const pendientes = ordenesData.filter(o => o && o.estado === 'pendiente').length;
    const aprobadas = ordenesData.filter(o => o && o.estado === 'aprobado').length;
    
    const totalSpan = document.getElementById('totalActivas');
    const pendientesSpan = document.getElementById('totalPendientes');
    const aprobadasSpan = document.getElementById('totalAprobadas');
    
    if (totalSpan) totalSpan.innerText = total;
    if (pendientesSpan) pendientesSpan.innerText = pendientes;
    if (aprobadasSpan) aprobadasSpan.innerText = aprobadas;
}

// =========================
// APLICAR FILTROS
// =========================
function aplicarFiltros() {
    const estadoFiltro = document.getElementById('filtroEstado')?.value || 'todas';
    const proveedorFiltro = document.getElementById('filtroProveedor')?.value.toLowerCase() || '';
    const fechaDesde = document.getElementById('fechaDesde')?.value || '';
    const fechaHasta = document.getElementById('fechaHasta')?.value || '';
    const busqueda = document.getElementById('buscador')?.value.toLowerCase() || '';
    
    ordenesFiltradas = ordenesData.filter(orden => {
        if (!orden) return false;
        
        if (estadoFiltro !== 'todas' && orden.estado !== estadoFiltro) return false;
        
        const proveedorNombre = orden.proveedor || orden.razon_social || '';
        if (proveedorFiltro && !proveedorNombre.toLowerCase().includes(proveedorFiltro)) return false;
        
        const fechaOrden = orden.fecha_creacion || orden.fecha;
        if (fechaDesde && fechaOrden) {
            const fechaStr = fechaOrden.split(' ')[0] || fechaOrden;
            if (fechaStr < fechaDesde) return false;
        }
        if (fechaHasta && fechaOrden) {
            const fechaStr = fechaOrden.split(' ')[0] || fechaOrden;
            if (fechaStr > fechaHasta) return false;
        }
        
        if (busqueda) {
            const codigo = orden.numero_orden || orden.codigo_orden || '';
            const ruc = orden.proveedor_ruc || orden.ruc || '';
            const searchText = `${codigo} ${proveedorNombre} ${ruc}`.toLowerCase();
            return searchText.includes(busqueda);
        }
        
        return true;
    });
    
    renderTable();
}

// =========================
// VER DETALLE
// =========================
window.verDetalle = async function(id) {
    try {
        mostrarNotificacion('Cargando detalle...', 'info');
        
        const response = await fetch(`/api/orden_compra/${id}`);
        
        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                mostrarNotificacion('Su sesión ha expirado. Redirigiendo al login...', 'warning');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Datos inválidos');
        }
        
        const orden = result.data;
        const estado = estadoMap[orden.estado] || estadoMap.pendiente;
        const codigoMostrar = orden.numero_orden || orden.codigo_orden || '-';
        const fechaMostrar = orden.fecha_creacion || orden.fecha;
        
        const detalleBody = document.getElementById('detalleBody');
        if (!detalleBody) return;
        
        detalleBody.innerHTML = `
            <div class="p-3">
                <div class="row mb-3 pb-2 border-bottom">
                    <div class="col-6">
                        <small class="text-muted text-uppercase">N° Orden de Compra</small>
                        <h5 class="mb-0">${escapeHtml(codigoMostrar)}</h5>
                    </div>
                    <div class="col-6 text-end">
                        <small class="text-muted text-uppercase">Fecha y Hora</small>
                        <h5 class="mb-0">${formatFecha(fechaMostrar)} - ${formatHora(fechaMostrar)}</h5>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-12">
                        <small class="text-muted text-uppercase">Proveedor</small>
                        <p class="fw-bold mb-0">${escapeHtml(orden.proveedor || orden.razon_social || 'Sin proveedor')}</p>
                        ${orden.proveedor_ruc || orden.ruc ? `<p class="text-muted small mb-0">RUC: ${escapeHtml(orden.proveedor_ruc || orden.ruc)}</p>` : ''}
                        ${orden.proveedor_direccion || orden.direccion ? `<p class="text-muted small mb-0">${escapeHtml(orden.proveedor_direccion || orden.direccion)}</p>` : ''}
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-12">
                        <small class="text-muted text-uppercase">Comprador</small>
                        <p class="mb-0">${escapeHtml(orden.comprador || orden.nombre_completo || orden.usuario_nombre || 'No asignado')}</p>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-12">
                        <small class="text-muted text-uppercase">Productos / Servicios</small>
                        <div class="table-responsive mt-2">
                            <table class="table table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th class="text-center">Cantidad</th>
                                        <th class="text-end">Precio Unit</th>
                                        <th class="text-end">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(orden.detalle || []).map(p => `
                                        <tr>
                                            <td>${escapeHtml(p.codigo || '-')}</td>
                                            <td>${escapeHtml(p.descripcion || '-')}</td>
                                            <td class="text-center">${formatCantidad(p.cantidad || 0)}</td>
                                            <td class="text-end">S/ ${formatMonto(p.precio_venta_unitario || p.precio_unitario || 0)}</td>
                                            <td class="text-end">S/ ${formatMonto(p.subtotal_venta_con_descuento || p.subtotal || 0)}</td>
                                        </tr>
                                    `).join('')}
                                    ${(!orden.detalle || orden.detalle.length === 0) ? '<tr><td colspan="5" class="text-center">Sin productos</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-6">
                        <small class="text-muted text-uppercase">Estado</small>
                        <div><span class="badge-status ${estado.class}"><i class="bi ${estado.icon}"></i> ${estado.text}</span></div>
                    </div>
                    <div class="col-6 text-end">
                        <small class="text-muted text-uppercase">Monto Total</small>
                        <h4 class="text-success mb-0">S/ ${formatMonto(orden.total || 0)}</h4>
                    </div>
                </div>
                
                ${orden.condicion_pago ? `
                <div class="row mb-2">
                    <div class="col-4 text-muted small">Condición de Pago:</div>
                    <div class="col-8">${escapeHtml(orden.condicion_pago)}</div>
                </div>
                ` : ''}
                
                ${orden.tiempo_entrega ? `
                <div class="row mb-2">
                    <div class="col-4 text-muted small">Tiempo de Entrega:</div>
                    <div class="col-8">${escapeHtml(orden.tiempo_entrega)}</div>
                </div>
                ` : ''}
                
                ${orden.fecha_requerida ? `
                <div class="row mb-2">
                    <div class="col-4 text-muted small">Fecha Requerida:</div>
                    <div class="col-8">${escapeHtml(orden.fecha_requerida)}</div>
                </div>
                ` : ''}
                
                ${orden.lugar_entrega ? `
                <div class="row mb-2">
                    <div class="col-4 text-muted small">Lugar de Entrega:</div>
                    <div class="col-8">${escapeHtml(orden.lugar_entrega)}</div>
                </div>
                ` : ''}
                
                ${orden.num_cotizacion ? `
                <div class="row mb-2">
                    <div class="col-4 text-muted small">N° Cotización Proveedor:</div>
                    <div class="col-8">${escapeHtml(orden.num_cotizacion)}</div>
                </div>
                ` : ''}
                
                ${orden.nota_compra || orden.notas ? `
                <hr>
                <div class="row mt-3">
                    <div class="col-12">
                        <small class="text-muted text-uppercase">Nota / Observaciones</small>
                        <p class="mb-0">${escapeHtml(orden.nota_compra || orden.notas)}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
        modal.show();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar el detalle de la orden: ' + error.message, 'error');
    }
};

// =========================
// EDITAR ORDEN
// =========================
window.editarOrden = function(id) {
    window.location.href = `/editar_compra/${id}`;
};

// =========================
// GENERAR PDF
// =========================
window.generarPDF = async function(id) {
    mostrarNotificacion('Generando orden de compra en PDF...', 'info');
    try {
        window.open(`/api/orden_compra/pdf/${id}`, '_blank');
        setTimeout(() => {
            mostrarNotificacion('PDF generado exitosamente', 'success');
        }, 1000);
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al generar el PDF', 'error');
    }
};

// =========================
// ELIMINAR ORDEN
// =========================
window.eliminarOrden = function(id) {
    const orden = ordenesData.find(o => o && o.id === id);
    const codigo = orden ? (orden.numero_orden || orden.codigo_orden || 'N/A') : 'N/A';
    const proveedor = orden ? (orden.proveedor || orden.razon_social || '') : '';
    
    document.getElementById('eliminarInfo').innerHTML = `
        <strong>${escapeHtml(codigo)}</strong> - ${escapeHtml(proveedor)}
        <br><span class="text-muted small">Esta acción no se puede deshacer.</span>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modalEliminar'));
    modal.show();
    
    document.getElementById('btnConfirmarEliminar').onclick = async function() {
        try {
            const response = await fetch(`/api/ordenes_compra/${id}`, { method: 'DELETE' });
            
            if (!response.ok) {
                throw new Error('Error al eliminar');
            }
            
            await cargarOrdenes();
            mostrarNotificacion('Orden de compra eliminada correctamente', 'success');
            modal.hide();
            
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('Error al eliminar la orden', 'error');
        }
    };
};

// =========================
// FUNCIONES DE UTILIDAD
// =========================
function formatCantidad(cant) {
    if (cant === null || cant === undefined) return '0';
    let numero = parseFloat(cant);
    if (isNaN(numero)) return '0';
    if (numero % 1 === 0) return numero.toString();
    return numero.toFixed(3).replace(/\.?0+$/, '');
}

function formatFecha(fecha) {
    if (!fecha) return '--/--/----';
    try {
        const date = new Date(fecha);
        if (isNaN(date.getTime())) return '--/--/----';
        return date.toLocaleDateString('es-PE');
    } catch {
        return '--/--/----';
    }
}

function formatHora(fecha) {
    if (!fecha) return '--:--';
    try {
        const date = new Date(fecha);
        if (isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '--:--';
    }
}

function formatMonto(monto) {
    if (monto === null || monto === undefined) return '0.00';
    return parseFloat(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('notificacionesContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    const icon = tipo === 'success' ? 'bi-check-circle-fill' : 
                 tipo === 'error' ? 'bi-x-circle-fill' : 
                 tipo === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
    notification.innerHTML = `<i class="bi ${icon} fs-5"></i><span>${mensaje}</span>`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =========================
// REFRESCAR Y EXPORTAR
// =========================
function refrescarDatos() {
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroProveedor = document.getElementById('filtroProveedor');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const buscador = document.getElementById('buscador');
    
    if (filtroEstado) filtroEstado.value = 'todas';
    if (filtroProveedor) filtroProveedor.value = '';
    if (fechaDesde) fechaDesde.value = '';
    if (fechaHasta) fechaHasta.value = '';
    if (buscador) buscador.value = '';
    
    cargarOrdenes();
    mostrarNotificacion('Datos actualizados correctamente', 'success');
}

function exportarExcel() {
    mostrarNotificacion('Exportando datos...', 'info');
    
    // Crear CSV con todas las columnas
    const headers = [
        'Ítems', 'Fecha', 'Hora', 'Estado', 'N° Orden', 'RUC',
        'Código Proveedor', 'R. Comercial', 'R. Social', 'Descripción',
        'Monto Total', 'Nota Aclaratoria', 'Condición Pago'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    ordenesFiltradas.forEach(orden => {
        const totalItems = orden.total_items || (orden.detalle ? orden.detalle.length : 0);
        const fecha = orden.fecha_creacion || orden.fecha || '';
        const estado = orden.estado || '';
        const codigo = orden.numero_orden || orden.codigo_orden || '';
        
        const row = [
            totalItems,
            `"${formatFecha(fecha)}"`,
            `"${formatHora(fecha)}"`,
            `"${estado}"`,
            `"${codigo}"`,
            `"${orden.proveedor_ruc || orden.ruc || ''}"`,
            `"${orden.codigo_proveedor || ''}"`,
            `"${orden.nombre_comercial || ''}"`,
            `"${orden.proveedor || orden.razon_social || ''}"`,
            `"${orden.descripcion || ''}"`,
            parseFloat(orden.total || 0).toFixed(2),
            `"${orden.nota_aclaratoria || orden.nota_compra || orden.notas || ''}"`,
            `"${orden.condicion_pago || ''}"`
        ];
        csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ordenes_compra.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    
    mostrarNotificacion('Exportación completada exitosamente', 'success');
}

// =========================
// INICIALIZAR EVENTOS
// =========================
document.addEventListener('DOMContentLoaded', () => {
    cargarOrdenes();
    
    // Event listeners para filtros
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroProveedor = document.getElementById('filtroProveedor');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    const buscador = document.getElementById('buscador');
    const btnRefrescar = document.getElementById('btnRefrescar');
    const btnExportar = document.getElementById('btnExportar');
    
    if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
    if (filtroProveedor) filtroProveedor.addEventListener('input', aplicarFiltros);
    if (fechaDesde) fechaDesde.addEventListener('change', aplicarFiltros);
    if (fechaHasta) fechaHasta.addEventListener('change', aplicarFiltros);
    if (buscador) buscador.addEventListener('input', aplicarFiltros);
    
    if (btnRefrescar) btnRefrescar.addEventListener('click', refrescarDatos);
    if (btnExportar) btnExportar.addEventListener('click', exportarExcel);
});