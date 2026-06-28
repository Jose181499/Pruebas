// ============================================================
// MÓDULO VENTAS - ERP Multiempresa (CONECTADO A BACKEND)
// ============================================================

console.log('📦 Módulo Ventas cargando...');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const VENTAS_CONFIG = {
    cotizaciones: {
        title: 'Cotizaciones',
        subtitle: 'Gestión de cotizaciones comerciales',
        apiBase: '/ventas/api/cotizaciones'
    },
    pedido_compra: {
        title: 'PC Pedido Compras',
        subtitle: 'Aceptación formal del cliente',
        apiBase: '/ventas/api/pedido-compra'
    },
    despachar: {
        title: 'Despachar',
        subtitle: 'Pendientes de despacho e historial',
        apiBase: '/ventas/api/despachos'
    },
    guias: {
        title: 'Guías de remisión',
        subtitle: 'Documentos de traslado de mercadería',
        apiBase: '/ventas/api/guias'
    },
    comprobantes: {
        title: 'Facturas y Boletas',
        subtitle: 'Comprobantes emitidos a clientes',
        apiBase: '/ventas/api/comprobantes'
    },
    notas_credito: {
        title: 'Notas de Crédito',
        subtitle: 'Ajustes y anulaciones de comprobantes',
        apiBase: '/ventas/api/notas-credito'
    },
    devoluciones: {
        title: 'Devoluciones',
        subtitle: 'Gestión de devoluciones de productos',
        apiBase: '/ventas/api/devoluciones'
    }
};

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let cotizacionesData = [];
let pedidosData = [];
let despachosData = [];
let guiasData = [];
let comprobantesData = [];
let notasData = [];
let devolucionesData = [];
let currentModule = 'cotizaciones';
let editingId = null;
let cotizacionProductos = [];

// ============================================================
// FUNCIONES API
// ============================================================

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Error en fetchAPI:`, error);
        throw error;
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const oldToasts = document.querySelectorAll('.toast-custom');
    oldToasts.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };
    
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span>${icons[type] || 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 99999;
        animation: slideIn 0.3s ease-out;
        max-width: 450px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        background: ${colors[type] || colors.info};
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// UTILIDADES
// ============================================================
function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;'
    }[m]));
}

function sd(v) {
    return (v === undefined || v === null || String(v).trim() === '') ? '-' : esc(v);
}

function money(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function now() {
    return new Date().toLocaleString('es-PE', { hour12: false });
}

function getEstado(valor) {
    if (typeof valor === 'boolean') {
        return valor ? 'Activo' : 'Inactivo';
    }
    return String(valor || '');
}

function badgeStatus(s) {
    const map = {
        'Borrador': 'b-draft',
        'En revisión': 'b-review',
        'En revisión interna': 'b-review',
        'Validada': 'b-valid',
        'Validado por Hellen': 'b-valid',
        'Generada': 'b-sent',
        'Aceptada': 'b-accepted',
        'No concretada': 'b-rejected',
        'Anulada': 'b-rejected',
        'Anulado': 'b-rejected',
        'Emitido': 'b-ok',
        'Emitida': 'b-ok',
        'Pendiente': 'b-draft',
        'Pendiente despacho': 'b-draft',
        'Recibido por correo': 'b-info',
        'Listo para despacho': 'b-ok',
        'Despachado': 'b-ok',
        'Entregado': 'b-ok',
        'En preparación': 'b-review'
    };
    return `<span class="badge ${map[s] || 'b-gray'}">${s}</span>`;
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
}

// ============================================================
// FUNCIONES DE CARGA DE DATOS
// ============================================================

async function loadCotizaciones() {
    try {
        const data = await fetchAPI('/ventas/api/cotizaciones/listar');
        if (data.success) {
            cotizacionesData = data.data || [];
            renderCotizaciones();
        }
    } catch (error) {
        console.error('Error cargando cotizaciones:', error);
        showToast('Error al cargar cotizaciones', 'error');
    }
}

async function loadPedidos() {
    try {
        const data = await fetchAPI('/ventas/api/pedido-compra/listar');
        if (data.success) {
            pedidosData = data.data || [];
            renderPedidos();
        }
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        showToast('Error al cargar pedidos', 'error');
    }
}

async function loadDespachos() {
    try {
        const data = await fetchAPI('/ventas/api/despachos/listar');
        if (data.success) {
            despachosData = data.data || [];
            renderDespachos();
        }
    } catch (error) {
        console.error('Error cargando despachos:', error);
        showToast('Error al cargar despachos', 'error');
    }
}

async function loadGuias() {
    try {
        const data = await fetchAPI('/ventas/api/guias/listar');
        if (data.success) {
            guiasData = data.data || [];
            renderGuias();
        }
    } catch (error) {
        console.error('Error cargando guías:', error);
        showToast('Error al cargar guías', 'error');
    }
}

async function loadComprobantes() {
    try {
        const data = await fetchAPI('/ventas/api/comprobantes/listar');
        if (data.success) {
            comprobantesData = data.data || [];
            renderComprobantes();
        }
    } catch (error) {
        console.error('Error cargando comprobantes:', error);
        showToast('Error al cargar comprobantes', 'error');
    }
}

async function loadNotas() {
    try {
        const data = await fetchAPI('/ventas/api/notas-credito/listar');
        if (data.success) {
            notasData = data.data || [];
            renderNotas();
        }
    } catch (error) {
        console.error('Error cargando notas:', error);
        showToast('Error al cargar notas de crédito', 'error');
    }
}

async function loadDevoluciones() {
    try {
        const data = await fetchAPI('/ventas/api/devoluciones/listar');
        if (data.success) {
            devolucionesData = data.data || [];
            renderDevoluciones();
        }
    } catch (error) {
        console.error('Error cargando devoluciones:', error);
        showToast('Error al cargar devoluciones', 'error');
    }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderCotizaciones() {
    const container = document.getElementById('cotizacionesContent');
    if (!container) {
        // Si estamos en la página principal, el contenido ya está
        return;
    }
    
    const q = document.getElementById('qSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('qStatus')?.value || '';
    
    const list = cotizacionesData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    // Actualizar KPIs
    const kpiContainer = document.getElementById('cotizacionesKPI');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="status-card"><div class="status-dot dot-total">Σ</div><div><small>Total</small><b>${cotizacionesData.length}</b></div></div>
            <div class="status-card"><div class="status-dot dot-draft">B</div><div><small>Borradores</small><b>${cotizacionesData.filter(x => x.estado === 'Borrador').length}</b></div></div>
            <div class="status-card"><div class="status-dot dot-review">R</div><div><small>En revisión</small><b>${cotizacionesData.filter(x => x.estado === 'En revisión').length}</b></div></div>
            <div class="status-card"><div class="status-dot dot-send">E</div><div><small>Enviadas</small><b>${cotizacionesData.filter(x => x.estado === 'Generada').length}</b></div></div>
            <div class="status-card"><div class="status-dot dot-ok">A</div><div><small>Aceptadas</small><b>${cotizacionesData.filter(x => x.estado === 'Aceptada').length}</b></div></div>
        `;
    }
    
    const tbody = document.getElementById('qRows');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay cotizaciones que coincidan con los filtros</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td><b>${i + 1}</b></td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td class="quote-number-cell"><b>${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td><span class="code-pill">${sd(r.codCliente)}</span></td>
            <td class="left"><b>${sd(r.razon)}</b></td>
            <td class="left">${sd(r.descripcion)}</td>
            <td><b>${money(r.monto)}</b></td>
            <td>${sd(r.condicion)}</td>
            <td>
                <button class="kebab" onclick="showCotizacionMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

function renderPedidos() {
    const tbody = document.getElementById('pcRows');
    if (!tbody) return;
    
    const q = document.getElementById('pcSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('pcStatus')?.value || '';
    
    const list = pedidosData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay PC del cliente registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.numero)}</b></td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.cotizacion)}</td>
            <td><b>${money(r.monto)}</b></td>
            <td>${sd(r.archivoOC)}</td>
            <td>${sd(r.lugarEntrega)}</td>
            <td>
                <button class="kebab" onclick="showPedidoMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

function renderDespachos() {
    const tbody = document.getElementById('despachoRows');
    if (!tbody) return;
    
    const q = document.getElementById('despachoSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('despachoStatus')?.value || '';
    
    const list = despachosData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay despachos registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${sd(r.fechaDespacho)}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.numero)}</b></td>
            <td>${sd(r.pc)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.guia)}</td>
            <td>${sd(r.destino)}</td>
            <td>
                <button class="btn btn-sm btn-green" onclick="marcarDespachado(${r.id})">🚚 Despachar</button>
            </td>
        </tr>
    `).join('');
}

function renderGuias() {
    const tbody = document.getElementById('guiaRows');
    if (!tbody) return;
    
    const q = document.getElementById('guiaSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('guiaStatus')?.value || '';
    
    const list = guiasData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay guías registradas</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.serie)}-${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.cotizacion)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.origen)}</td>
            <td>${sd(r.destino)}</td>
            <td>
                <button class="kebab" onclick="showGuiaMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

function renderComprobantes() {
    const tbody = document.getElementById('comprobanteRows');
    if (!tbody) return;
    
    const q = document.getElementById('comprobanteSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('comprobanteStatus')?.value || '';
    
    const list = comprobantesData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay comprobantes registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td>${sd(r.tipo)}</td>
            <td><b>${sd(r.serie)}-${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.cotizacion)}</td>
            <td><b>${money(r.monto)}</b></td>
            <td>${sd(r.condicion)}</td>
            <td>
                <button class="kebab" onclick="showComprobanteMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

function renderNotas() {
    const tbody = document.getElementById('notaRows');
    if (!tbody) return;
    
    const q = document.getElementById('notaSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('notaStatus')?.value || '';
    
    const list = notasData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay notas de crédito registradas</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td>${sd(r.tipo)}</td>
            <td><b>${sd(r.serie)}-${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.motivo)}</td>
            <td><b>${money(r.monto)}</b></td>
            <td>
                <button class="kebab" onclick="showNotaMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

function renderDevoluciones() {
    const tbody = document.getElementById('devolucionRows');
    if (!tbody) return;
    
    const q = document.getElementById('devolucionSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('devolucionStatus')?.value || '';
    
    const list = devolucionesData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay devoluciones registradas</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${String(r.fecha || '').replace(' ', '<br>')}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.guia)}</td>
            <td>${sd(r.motivo)}</td>
            <td>
                <button class="kebab" onclick="showDevolucionMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// MODALES - COTIZACIONES
// ============================================================

function openCotizacionModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar cotización' : 'Nueva cotización';
    document.getElementById('cotizacionModalTitle').textContent = title;
    
    // Aquí iría la lógica para cargar datos si es edición
    // y construir el formulario
    
    document.getElementById('cotizacionModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function saveCotizacionDraft() {
    showToast('Borrador guardado correctamente', 'success');
    closeModal('cotizacionModal');
}

function sendCotizacionToReview() {
    showToast('Cotización enviada a revisión', 'success');
    closeModal('cotizacionModal');
}

function generateCotizacionPdfAndSend() {
    showToast('PDF generado y enviado al cliente', 'success');
    closeModal('cotizacionModal');
}

// ============================================================
// MODALES - PEDIDO COMPRA
// ============================================================

function openPedidoCompraModal(id = null) {
    editingId = id;
    document.getElementById('pedidoCompraModalTitle').textContent = id ? 'Editar PC Pedido Compras' : 'Nuevo PC Pedido Compras';
    document.getElementById('pedidoCompraModal').classList.add('show');
}

function savePedidoCompra(estado) {
    showToast(`PC guardado como: ${estado}`, 'success');
    closeModal('pedidoCompraModal');
}

// ============================================================
// MODALES - DESPACHO
// ============================================================

function openDespachoModal(id = null) {
    editingId = id;
    document.getElementById('despachoModalTitle').textContent = id ? 'Editar despacho' : 'Nuevo despacho';
    document.getElementById('despachoModal').classList.add('show');
}

function saveDespacho(estado) {
    showToast(`Despacho guardado como: ${estado}`, 'success');
    closeModal('despachoModal');
}

function marcarDespachado(id) {
    showToast('Despacho marcado como completado', 'success');
}

// ============================================================
// MODALES - GUÍAS
// ============================================================

function openGuiaModal(id = null) {
    editingId = id;
    document.getElementById('guiaModalTitle').textContent = id ? 'Editar guía' : 'Nueva guía';
    document.getElementById('guiaModal').classList.add('show');
}

function saveGuia(estado) {
    showToast(`Guía guardada como: ${estado}`, 'success');
    closeModal('guiaModal');
}

// ============================================================
// MODALES - COMPROBANTES
// ============================================================

function openComprobanteModal(id = null) {
    editingId = id;
    document.getElementById('comprobanteModalTitle').textContent = id ? 'Editar comprobante' : 'Nuevo comprobante';
    document.getElementById('comprobanteModal').classList.add('show');
}

function saveComprobante(estado) {
    showToast(`Comprobante guardado como: ${estado}`, 'success');
    closeModal('comprobanteModal');
}

// ============================================================
// MODALES - NOTAS DE CRÉDITO
// ============================================================

function openNotaCreditoModal(id = null) {
    editingId = id;
    document.getElementById('notaCreditoModalTitle').textContent = id ? 'Editar nota de crédito' : 'Nueva nota de crédito';
    document.getElementById('notaCreditoModal').classList.add('show');
}

function saveNotaCredito(estado) {
    showToast(`Nota de crédito guardada como: ${estado}`, 'success');
    closeModal('notaCreditoModal');
}

// ============================================================
// MODALES - DEVOLUCIONES
// ============================================================

function openDevolucionModal(id = null) {
    editingId = id;
    document.getElementById('devolucionModalTitle').textContent = id ? 'Editar devolución' : 'Nueva devolución';
    document.getElementById('devolucionModal').classList.add('show');
}

function saveDevolucion(estado) {
    showToast(`Devolución guardada como: ${estado}`, 'success');
    closeModal('devolucionModal');
}

// ============================================================
// MENÚS DE ACCIONES
// ============================================================

function showCotizacionMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openCotizacionModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="duplicateCotizacion(${id});this.closest('.menu-pop').remove()">⧉ Duplicar</button>
        <button onclick="sendCotizacionEmail(${id});this.closest('.menu-pop').remove()">✉ Email</button>
        <button onclick="generateCotizacionPdf(${id});this.closest('.menu-pop').remove()">▣ PDF</button>
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
        <button class="menu-accepted" onclick="markCotizacionAccepted(${id});this.closest('.menu-pop').remove()">🟢 Aceptada por cliente</button>
        <button class="menu-pending" onclick="markCotizacionPending(${id});this.closest('.menu-pop').remove()">🟠 Seguimiento cliente</button>
        <button class="menu-lost" onclick="markCotizacionNotClosed(${id});this.closest('.menu-pop').remove()">⚪ No concretada</button>
        <button class="menu-reactivate" onclick="reactivateCotizacion(${id});this.closest('.menu-pop').remove()">🔄 Reactivar</button>
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
        <button onclick="createDocFromCotizacion(${id},'guia');this.closest('.menu-pop').remove()">🚚 Crear guía</button>
        <button onclick="createDocFromCotizacion(${id},'factura');this.closest('.menu-pop').remove()">🧾 Crear factura</button>
        <button class="danger" onclick="deleteCotizacion(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

function showPedidoMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openPedidoCompraModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="validatePedidoCompra(${id});this.closest('.menu-pop').remove()">✅ Validar Hellen</button>
        <button onclick="createDespachoFromPedido(${id});this.closest('.menu-pop').remove()">🚚 Crear despacho</button>
        <button onclick="createGuiaFromPedido(${id});this.closest('.menu-pop').remove()">📦 Crear guía</button>
        <button onclick="createFacturaFromPedido(${id});this.closest('.menu-pop').remove()">🧾 Crear factura</button>
        <button class="danger" onclick="deletePedidoCompra(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

function showGuiaMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openGuiaModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="generateGuiaPdf(${id});this.closest('.menu-pop').remove()">▣ PDF</button>
        <button onclick="markGuiaEmitida(${id});this.closest('.menu-pop').remove()">📄 Emitir</button>
        <button class="danger" onclick="deleteGuia(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

function showComprobanteMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openComprobanteModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="generateComprobantePdf(${id});this.closest('.menu-pop').remove()">▣ PDF</button>
        <button onclick="markComprobanteEmitido(${id});this.closest('.menu-pop').remove()">📄 Emitir</button>
        <button class="danger" onclick="deleteComprobante(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

function showNotaMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openNotaCreditoModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="generateNotaPdf(${id});this.closest('.menu-pop').remove()">▣ PDF</button>
        <button onclick="markNotaEmitida(${id});this.closest('.menu-pop').remove()">📄 Emitir</button>
        <button class="danger" onclick="deleteNota(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

function showDevolucionMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.style.left = Math.max(10, event.clientX - 250) + 'px';
    pop.style.top = Math.min(window.innerHeight - 420, event.clientY + 8) + 'px';
    
    pop.innerHTML = `
        <button onclick="openDevolucionModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="approveDevolucion(${id});this.closest('.menu-pop').remove()">✅ Aprobar</button>
        <button onclick="rejectDevolucion(${id});this.closest('.menu-pop').remove()">❌ Rechazar</button>
        <button class="danger" onclick="deleteDevolucion(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    document.body.appendChild(pop);
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-pop') && !e.target.closest('.kebab')) {
        document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    }
});

// ============================================================
// ACCIONES DE COTIZACIONES
// ============================================================

function duplicateCotizacion(id) {
    showToast('Cotización duplicada correctamente', 'success');
}

function sendCotizacionEmail(id) {
    showToast('Email enviado al cliente', 'success');
}

function generateCotizacionPdf(id) {
    showToast('PDF generado correctamente', 'success');
}

function markCotizacionAccepted(id) {
    showToast('Cotización marcada como aceptada por cliente', 'success');
}

function markCotizacionPending(id) {
    showToast('Seguimiento cliente registrado', 'success');
}

function markCotizacionNotClosed(id) {
    showToast('Cotización marcada como no concretada', 'success');
}

function reactivateCotizacion(id) {
    showToast('Cotización reactivada como borrador', 'success');
}

function createDocFromCotizacion(id, tipo) {
    showToast(`Documento "${tipo}" creado desde cotización`, 'success');
}

function deleteCotizacion(id) {
    if (confirm('¿Estás seguro de eliminar esta cotización?')) {
        showToast('Cotización eliminada', 'success');
    }
}

// ============================================================
// ACCIONES DE PEDIDOS
// ============================================================

function validatePedidoCompra(id) {
    showToast('PC validado por Hellen', 'success');
}

function createDespachoFromPedido(id) {
    showToast('Despacho creado desde PC', 'success');
}

function createGuiaFromPedido(id) {
    showToast('Guía creada desde PC', 'success');
}

function createFacturaFromPedido(id) {
    showToast('Factura creada desde PC', 'success');
}

function deletePedidoCompra(id) {
    if (confirm('¿Estás seguro de eliminar este PC?')) {
        showToast('PC eliminado', 'success');
    }
}

// ============================================================
// ACCIONES DE GUÍAS
// ============================================================

function generateGuiaPdf(id) {
    showToast('PDF de guía generado', 'success');
}

function markGuiaEmitida(id) {
    showToast('Guía emitida correctamente', 'success');
}

function deleteGuia(id) {
    if (confirm('¿Estás seguro de eliminar esta guía?')) {
        showToast('Guía eliminada', 'success');
    }
}

// ============================================================
// ACCIONES DE COMPROBANTES
// ============================================================

function generateComprobantePdf(id) {
    showToast('PDF de comprobante generado', 'success');
}

function markComprobanteEmitido(id) {
    showToast('Comprobante emitido correctamente', 'success');
}

function deleteComprobante(id) {
    if (confirm('¿Estás seguro de eliminar este comprobante?')) {
        showToast('Comprobante eliminado', 'success');
    }
}

// ============================================================
// ACCIONES DE NOTAS
// ============================================================

function generateNotaPdf(id) {
    showToast('PDF de nota de crédito generado', 'success');
}

function markNotaEmitida(id) {
    showToast('Nota de crédito emitida correctamente', 'success');
}

function deleteNota(id) {
    if (confirm('¿Estás seguro de eliminar esta nota de crédito?')) {
        showToast('Nota de crédito eliminada', 'success');
    }
}

// ============================================================
// ACCIONES DE DEVOLUCIONES
// ============================================================

function approveDevolucion(id) {
    showToast('Devolución aprobada', 'success');
}

function rejectDevolucion(id) {
    showToast('Devolución rechazada', 'success');
}

function deleteDevolucion(id) {
    if (confirm('¿Estás seguro de eliminar esta devolución?')) {
        showToast('Devolución eliminada', 'success');
    }
}

// ============================================================
// EXPORTAR DATOS
// ============================================================

function exportData(module) {
    showToast(`Exportando datos de ${module}...`, 'info');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Ventas');
    
    // Determinar qué módulo cargar según la URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'cotizaciones';
    
    // Cargar datos según el módulo activo
    switch(tab) {
        case 'cotizaciones':
            loadCotizaciones();
            break;
        case 'pedido_compra':
            loadPedidos();
            break;
        case 'despachar':
            loadDespachos();
            break;
        case 'guias':
            loadGuias();
            break;
        case 'comprobantes':
            loadComprobantes();
            break;
        case 'notas_credito':
            loadNotas();
            break;
        case 'devoluciones':
            loadDevoluciones();
            break;
        default:
            loadCotizaciones();
    }
});

// Asignar funciones a window para uso global
window.loadCotizaciones = loadCotizaciones;
window.loadPedidos = loadPedidos;
window.loadDespachos = loadDespachos;
window.loadGuias = loadGuias;
window.loadComprobantes = loadComprobantes;
window.loadNotas = loadNotas;
window.loadDevoluciones = loadDevoluciones;
window.openCotizacionModal = openCotizacionModal;
window.openPedidoCompraModal = openPedidoCompraModal;
window.openDespachoModal = openDespachoModal;
window.openGuiaModal = openGuiaModal;
window.openComprobanteModal = openComprobanteModal;
window.openNotaCreditoModal = openNotaCreditoModal;
window.openDevolucionModal = openDevolucionModal;
window.saveCotizacionDraft = saveCotizacionDraft;
window.sendCotizacionToReview = sendCotizacionToReview;
window.generateCotizacionPdfAndSend = generateCotizacionPdfAndSend;
window.savePedidoCompra = savePedidoCompra;
window.saveDespacho = saveDespacho;
window.saveGuia = saveGuia;
window.saveComprobante = saveComprobante;
window.saveNotaCredito = saveNotaCredito;
window.saveDevolucion = saveDevolucion;
window.showCotizacionMenu = showCotizacionMenu;
window.showPedidoMenu = showPedidoMenu;
window.showGuiaMenu = showGuiaMenu;
window.showComprobanteMenu = showComprobanteMenu;
window.showNotaMenu = showNotaMenu;
window.showDevolucionMenu = showDevolucionMenu;
window.exportData = exportData;
window.marcarDespachado = marcarDespachado;
window.closeModal = closeModal;

console.log('✅ Módulo Ventas cargado correctamente');