// ============================================================
// MÓDULO VENTAS - ERP Multiempresa
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
// DATOS MAESTROS (para modales)
// ============================================================
const MAESTROS_VENTAS = {
    clientes: [
        {codigo:'CLI-000099',ruc:'20114915026',razon:'COMPAÑÍA MINERA ANTAPACCAY S.A.',razonComercial:'MINERA ANTAPACCAY',contacto:'Compras',telefono:'999 111 222',correo:'compras@antapaccay.com',condicion:'Crédito 30 días',direccion:'Av. Industrial 123 - Lima',estado:'Activo'},
        {codigo:'CLI-000082',ruc:'20543722309',razon:'CINDEL S.A.',razonComercial:'CINDEL',contacto:'María López',telefono:'999 222 333',correo:'compras@cindel.com',condicion:'Crédito 45 días',direccion:'Jr. Los Olivos 456 - Lima',estado:'Activo'},
        {codigo:'CLI-000091',ruc:'45421212121',razon:'PROMOTORES ELECTRICOS S A',razonComercial:'PROMOTORES ELECTRICOS',contacto:'Carlos Ramírez',telefono:'999 333 444',correo:'ventas@promotores.com',condicion:'Crédito 30 días',direccion:'Av. Electricidad 100 - Lima',estado:'Activo'}
    ],
    condicionesPago: ['Contado', 'Crédito 7 días', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días', 'Crédito 60 días', 'Crédito 90 días'],
    tiempoEntrega: ['Inmediato', '1 día hábil', '3 días hábiles', '5 días hábiles', '7 días hábiles', 'Bajo pedido', 'Personalizado'],
    validez: ['7 días', '15 días', '30 días', '60 días', 'Personalizado'],
    transporte: ['Seleccione', 'Motorizado', 'Auto', 'Minivan', 'Camioneta', 'Camión', 'Agencia'],
    parihuela: ['Seleccione', 'No', 'Sí - estándar', 'Sí - a medida', 'Por confirmar'],
    fuenteRequerimiento: ['Correo', 'WhatsApp', 'Llamada', 'Portal del cliente', 'Licitación pública', 'Manual', 'Otro'],
    motivoCotizacion: ['Proyecto nuevo', 'Recompra', 'Licitación', 'Reposición / stock', 'Solicitud única del cliente']
};

const SUNAT_UNIDADES = [
    {codigo:'NIU',nombre:'Unidad'},
    {codigo:'MTR',nombre:'Metro'},
    {codigo:'KGM',nombre:'Kilogramo'},
    {codigo:'LTR',nombre:'Litro'},
    {codigo:'CJA',nombre:'Caja'},
    {codigo:'PK',nombre:'Paquete'},
    {codigo:'RO',nombre:'Rollo'},
    {codigo:'SET',nombre:'Juego / Set'},
    {codigo:'PAR',nombre:'Par'},
    {codigo:'DZN',nombre:'Docena'}
];

const CONFIG_VENTAS = {
    igv: 0.18,
    monedaDefault: 'Soles (S/.)',
    asesorDefault: 'Helen Blas Príncipe',
    emailAsesorDefault: 'ventas@kcfcorporacion.com',
    telefonoAsesorDefault: '999932051',
    validezDefault: '15 días',
    tiempoEntregaDefault: '5 días hábiles'
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
let quoteProducts = [];
let PRODUCTOS_MAESTROS = [];

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

function options(arr, selected = '') {
    return arr.map(x => `<option ${x === selected ? 'selected' : ''}>${x}</option>`).join('');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
}

// ============================================================
// CARGA DE PRODUCTOS MAESTROS
// ============================================================
async function cargarProductosMaestros() {
    try {
        const response = await fetch('/productos/api/productos');
        const data = await response.json();
        if (data.success) {
            PRODUCTOS_MAESTROS = data.data || [];
            console.log('✅ Productos cargados:', PRODUCTOS_MAESTROS.length);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        PRODUCTOS_MAESTROS = [
            {codigo:'PRD-001245',producto:'Cable THHN 12 AWG',descripcion:'Cable eléctrico THHN 12 AWG 600V',modelo:'THHN-12',marca:'INDECO',um:'NIU',stock:1200,valorVenta:6.50,entrega:'Inmediata'},
            {codigo:'PRD-002318',producto:'Interruptor termomagnético 2P 40A',descripcion:'Interruptor termomagnético 2 polos 40A',modelo:'IC60N-2P-40A',marca:'Schneider',um:'NIU',stock:120,valorVenta:85.00,entrega:'Inmediata'},
            {codigo:'PRD-003567',producto:'Tablero metálico empotrado 24 polos',descripcion:'Tablero metálico empotrado 24 polos',modelo:'TM-24',marca:'Eaton',um:'NIU',stock:15,valorVenta:1250.00,entrega:'5 días'},
            {codigo:'PRD-004890',producto:'Tubería EMT 3/4',descripcion:'Tubería EMT 3/4" x 3m',modelo:'EMT-3/4',marca:'Conduit',um:'NIU',stock:300,valorVenta:18.00,entrega:'Inmediata'},
            {codigo:'PRD-005678',producto:'Caja octogonal galvanizada',descripcion:'Caja octogonal galvanizada 4"',modelo:'COG-4',marca:'Conduit',um:'NIU',stock:500,valorVenta:4.80,entrega:'Inmediata'}
        ];
    }
}

// ============================================================
// FUNCIONES DE CARGA DE DATOS
// ============================================================
// ============================================================
// LOAD COTIZACIONES - CON LOGS
// ============================================================
async function loadCotizaciones() {
    console.log('🔄 Cargando cotizaciones...');
    try {
        const response = await fetch('/ventas/api/cotizaciones/listar');
        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        if (data.success) {
            cotizacionesData = data.data || [];
            console.log(`✅ ${cotizacionesData.length} cotizaciones cargadas`);
            console.log('📋 Primer elemento:', cotizacionesData[0]);
            renderCotizaciones();
        } else {
            console.error('❌ Error:', data.error);
            showToast('Error al cargar cotizaciones', 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando cotizaciones:', error);
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
// FUNCIONES DE RENDERIZADO
// ============================================================
// ============================================================
// RENDER COTIZACIONES - CORREGIDA
// ============================================================
function renderCotizaciones() {
    console.log('🔄 Renderizando cotizaciones...');
    console.log('📊 Datos:', cotizacionesData);
    
    // Obtener filtros
    const q = document.getElementById('qSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('qStatus')?.value || '';
    
    // Filtrar datos
    const list = cotizacionesData.filter(r => {
        const matchText = (!q || JSON.stringify(r).toLowerCase().includes(q));
        const matchStatus = (!st || r.estado === st);
        return matchText && matchStatus;
    });
    
    console.log(`📋 Mostrando ${list.length} de ${cotizacionesData.length} cotizaciones`);
    
    // Actualizar KPIs
    const kpiContainer = document.getElementById('cotizacionesKPI');
    if (kpiContainer) {
        const total = cotizacionesData.length;
        const borradores = cotizacionesData.filter(x => x.estado === 'Borrador').length;
        const revision = cotizacionesData.filter(x => x.estado === 'En revisión').length;
        const enviadas = cotizacionesData.filter(x => x.estado === 'Generada').length;
        const aceptadas = cotizacionesData.filter(x => x.estado === 'Aceptada').length;
        
        kpiContainer.innerHTML = `
            <div class="status-card"><div class="status-dot dot-total">Σ</div><div><small>Total</small><b>${total}</b></div></div>
            <div class="status-card"><div class="status-dot dot-draft">B</div><div><small>Borradores</small><b>${borradores}</b></div></div>
            <div class="status-card"><div class="status-dot dot-review">R</div><div><small>En revisión</small><b>${revision}</b></div></div>
            <div class="status-card"><div class="status-dot dot-send">E</div><div><small>Enviadas</small><b>${enviadas}</b></div></div>
            <div class="status-card"><div class="status-dot dot-ok">A</div><div><small>Aceptadas</small><b>${aceptadas}</b></div></div>
        `;
        console.log('✅ KPIs actualizados');
    } else {
        console.warn('⚠️ No se encontró #cotizacionesKPI');
    }
    
    // Actualizar tabla - DIRECTAMENTE en qRows
    const tbody = document.getElementById('qRows');
    if (!tbody) {
        console.error('❌ No se encontró el elemento qRows');
        return;
    }
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay cotizaciones que coincidan con los filtros</td></tr>`;
        console.log('📭 No hay cotizaciones para mostrar');
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => {
        const fecha = r.fecha || '';
        const fechaDisplay = fecha.replace(' ', '<br>');
        
        return `
        <tr>
            <td><b>${i + 1}</b></td>
            <td class="date-cell">${fechaDisplay}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td class="quote-number-cell"><b>${r.numero || '-'}</b></td>
            <td>${r.ruc || '-'}</td>
            <td><span class="code-pill">${r.cod_cliente || '-'}</span></td>
            <td class="left"><b>${r.razon || '-'}</b></td>
            <td class="left">${r.descripcion || '-'}</td>
            <td><b>${money(r.monto || 0)}</b></td>
            <td>${r.condicion || '-'}</td>
            <td>
                <button class="kebab" onclick="showCotizacionMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>`;
    }).join('');
    
    console.log(`✅ ${list.length} cotizaciones renderizadas en la tabla`);
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
// MODAL COTIZACIÓN - GENERA CONTENIDO DINÁMICO
// ============================================================
function openCotizacionModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar cotización' : 'Nueva cotización';
    document.getElementById('cotizacionModalTitle').textContent = title;
    
    const formContainer = document.getElementById('cotizacionForm');
    if (!formContainer) return;
    
    const client = MAESTROS_VENTAS.clientes[0] || {ruc:'', razon:'', codigo:''};
    
    // Generar HTML del formulario
    formContainer.innerHTML = `
        <div class="stepbar" id="quoteStatusBar">
            <span class="step-label">Estatus:</span>
            <span class="step status-draft"><span class="num">1</span>Borrador</span>
            <span class="sep"></span>
            <span class="step status-review"><span class="num">2</span>En revisión</span>
            <span class="sep"></span>
            <span class="step status-validated"><span class="num">3</span>Validada</span>
            <span class="sep"></span>
            <span class="step status-generated"><span class="num">4</span>Generada</span>
            <span class="sep"></span>
            <span class="step status-accepted"><span class="num">5</span>Aceptada</span>
        </div>
        
        <div class="create-grid">
            <!-- Punto 1: Datos del cliente -->
            <div class="create-panel client-card">
                <h3><span class="section-number">1.</span> <span class="section-title-colored">Datos del cliente</span></h3>
                <div class="body">
                    <div class="client-search-row">
                        <div class="form-field">
                            <label>Buscar por RUC</label>
                            <input id="fRucSearch" placeholder="Ingrese o pegue RUC" value="${client.ruc}" oninput="autoLoadClientByRuc(this.value)">
                        </div>
                        <div class="form-field">
                            <label>&nbsp;</label>
                            <button class="btn btn-blue btn-search-ruc" onclick="loadClient()">🔍 Buscar</button>
                        </div>
                    </div>
                    <div class="client-main-grid">
                        <div class="form-field"><label>RUC</label><input id="fRuc" value="${client.ruc}" readonly></div>
                        <div class="form-field"><label>Razón social</label><input id="fRazon" value="${client.razon}" readonly></div>
                        <div class="form-field"><label>Cód. cliente</label><input class="client-code-input" id="fCodCliente" value="${client.codigo}" readonly></div>
                    </div>
                    <div class="client-secondary-grid">
                        <div class="form-field"><label>Razón comercial</label><input id="fComercial" value="${client.razonComercial || client.razon}"></div>
                        <div class="form-field"><label>Dirección fiscal</label><input id="fDireccion" value="${client.direccion || ''}"></div>
                    </div>
                    <div class="client-contact-grid">
                        <div class="form-field"><label>Contacto</label><input id="fContacto" value="${client.contacto || ''}"></div>
                        <div class="form-field"><label>Teléfono</label><input id="fTelefono" value="${client.telefono || ''}"></div>
                        <div class="form-field"><label>Correo</label><input id="fCorreo" value="${client.correo || ''}"></div>
                    </div>
                    <div class="client-request-grid">
                        <div class="form-field"><label>N° requerimiento</label><input id="fReq" placeholder="Ingrese el requerimiento"></div>
                        <div class="form-field"><label>Fuente</label><select id="fFuente">${options(MAESTROS_VENTAS.fuenteRequerimiento, 'Correo')}</select></div>
                    </div>
                    <div class="client-save-zone">
                        <button class="btn btn-green btn-save-client" onclick="saveClientFromQuote()">💾 Guardar / Actualizar</button>
                        <div class="save-help">Se guardará en Maestros para futuras cotizaciones.</div>
                    </div>
                </div>
            </div>

            <!-- Punto 2: Condiciones comerciales -->
            <div class="create-panel">
                <h3><span class="section-number">2.</span> <span class="section-title-colored">Condiciones comerciales</span></h3>
                <div class="body">
                    <div class="form-grid">
                        <div class="form-field col-4"><label>Asesor</label><select id="fVendedor">${options([CONFIG_VENTAS.asesorDefault, 'Edith', 'Ana Gómez'], CONFIG_VENTAS.asesorDefault)}</select></div>
                        <div class="form-field col-5"><label>Email asesor</label><input id="fEmailAsesor" value="${CONFIG_VENTAS.emailAsesorDefault}"></div>
                        <div class="form-field col-3"><label>Teléfono asesor</label><input id="fTelAsesor" value="${CONFIG_VENTAS.telefonoAsesorDefault}"></div>
                        <div class="form-field col-4"><label>Moneda</label><select id="fMoneda">${options(['Soles (S/.)', 'Dólares ($)'], CONFIG_VENTAS.monedaDefault)}</select></div>
                        <div class="form-field col-4"><label>Condición de pago</label><select id="fCondicion">${options(MAESTROS_VENTAS.condicionesPago, client.condicion || 'Contado')}</select></div>
                        <div class="form-field col-4"><label>Tiempo de entrega</label><select id="fTiempo">${options(MAESTROS_VENTAS.tiempoEntrega, CONFIG_VENTAS.tiempoEntregaDefault)}</select></div>
                        <div class="form-field col-4"><label>Validez</label><select id="fValidez">${options(MAESTROS_VENTAS.validez, CONFIG_VENTAS.validezDefault)}</select></div>
                        <div class="form-field col-8"><label>Dirección de entrega</label><select id="fDireccionEntrega"><option>${client.direccion || 'Dirección cliente'}</option><option>Otra dirección</option></select></div>
                        <div class="form-field col-4"><label>Descuento especial</label><input id="fDiscountValue" type="number" value="0" oninput="calcQuote()"></div>
                        <div class="form-field col-2"><label>Tipo</label><select id="fDiscountType" onchange="calcQuote()"><option value="%">%</option><option value="S/">S/</option></select></div>
                        <div class="form-field col-12"><label>Nota comercial</label><textarea placeholder="Ingrese comentarios comerciales..."></textarea></div>
                    </div>
                </div>
            </div>

            <!-- Punto 3: Resumen -->
            <div class="create-panel summary-card">
                <h3><span class="section-number">3.</span> <span class="section-title-colored">Resumen</span></h3>
                <div class="body">
                    <div class="side-row"><b>Subtotal</b><span id="sumSubtotal">S/ 0.00</span></div>
                    <div class="side-row"><b>Descuento</b><span id="sumDiscountPct">0.00%</span></div>
                    <div class="side-row"><b>Dscto aplicado</b><span id="sumDiscount">S/ 0.00</span></div>
                    <div class="side-row value-sale-row"><b>Valor venta</b><span id="sumValue">S/ 0.00</span></div>
                    <div class="side-row"><b>IGV 18%</b><span id="sumIgv">S/ 0.00</span></div>
                    <div class="summary-sep"></div>
                    <div class="total-row"><b>TOTAL</b><span class="summary-total" id="sumTotal">S/ 0.00</span></div>
                </div>
            </div>

            <!-- Punto 4: Productos -->
            <div class="create-panel product-wide">
                <h3><span class="section-number">4.</span> <span class="section-title-colored">Productos cotizados</span>
                    <div class="products-toolbar">
                        <input list="productMasterList" id="quickProductSearch" placeholder="Buscar en data maestra: código, producto, marca o modelo..." onkeydown="if(event.key==='Enter'){addQuoteProductFromSearch()}">
                        <datalist id="productMasterList"></datalist>
                        <button class="btn btn-blue btn-add-product" onclick="addQuoteProductFromSearch()">+ Agregar producto</button>
                    </div>
                </h3>
                <div class="body">
                    <div class="table-scroll">
                        <table class="master-table">
                            <thead>
                                <tr>
                                    <th>Item</th><th>Código</th><th>Producto / Descripción</th><th>Modelo</th><th>Marca</th>
                                    <th>Unidad</th><th>Cant</th><th>Valor venta<br><small>Unitario S/.</small></th>
                                    <th>Valor total<br><small>Tabla S/.</small></th><th>Stock</th><th>Entrega</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="quoteProductRows"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Punto 5: Información adicional -->
            <div class="create-panel product-wide compact-bottom">
                <h3><span class="section-number">5.</span> <span class="section-title-colored">Información adicional</span></h3>
                <div class="body">
                    <div class="form-grid">
                        <div class="form-field"><label>Seguimiento</label><select id="fSeguimiento"><option>Asesor</option><option>${CONFIG_VENTAS.asesorDefault}</option><option>Edith</option></select></div>
                        <div class="form-field"><label>Motivo</label><select id="fMotivo">${options(MAESTROS_VENTAS.motivoCotizacion, 'Proyecto nuevo')}</select></div>
                        <div class="form-field"><label>Transporte</label><select id="fTransporte">${options(MAESTROS_VENTAS.transporte, 'Seleccione')}</select></div>
                        <div class="form-field"><label>Parihuela</label><select id="fParihuela">${options(MAESTROS_VENTAS.parihuela, 'Seleccione')}</select></div>
                        <div class="form-field internal-note-box"><label>Nota interna</label><textarea id="fNotaInterna" placeholder="Interno: cliente, productos o coordinación"></textarea></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datalist de productos
    cargarDatalistProductos();
    
    // Inicializar productos de ejemplo
    if (PRODUCTOS_MAESTROS.length > 0) {
        quoteProducts = PRODUCTOS_MAESTROS.slice(0, 2).map(p => ({...p, cantidad: 1}));
        renderQuoteProducts();
    }
    
    document.getElementById('cotizacionModal').classList.add('show');
    setTimeout(() => { calcQuote(); }, 100);
}

function cargarDatalistProductos() {
    const dl = document.getElementById('productMasterList');
    if (!dl) return;
    
    const list = PRODUCTOS_MAESTROS.length > 0 ? PRODUCTOS_MAESTROS : [
        {codigo:'PRD-001245',producto:'Cable THHN 12 AWG',marca:'INDECO',modelo:'THHN-12'},
        {codigo:'PRD-002318',producto:'Interruptor termomagnético',marca:'Schneider',modelo:'IC60N-2P-40A'}
    ];
    
    dl.innerHTML = list.map(p => {
        const valor = `${p.codigo} | ${p.producto} | ${p.marca || ''} | ${p.modelo || ''}`;
        return `<option value="${valor}"></option>`;
    }).join('');
}

function addQuoteProductFromSearch() {
    const input = document.getElementById('quickProductSearch');
    const valor = input ? input.value : '';
    
    if (!valor) {
        const p = PRODUCTOS_MAESTROS[quoteProducts.length % PRODUCTOS_MAESTROS.length];
        if (p) {
            quoteProducts.push({...p, cantidad: 1});
            renderQuoteProducts();
            calcQuote();
            showToast('Producto agregado al detalle', 'success');
        }
        return;
    }
    
    const q = valor.toLowerCase().trim();
    const p = PRODUCTOS_MAESTROS.find(x =>
        String(x.codigo).toLowerCase().includes(q) ||
        String(x.producto).toLowerCase().includes(q) ||
        String(x.descripcion || '').toLowerCase().includes(q) ||
        String(x.marca || '').toLowerCase().includes(q) ||
        String(x.modelo || '').toLowerCase().includes(q)
    );
    
    if (!p) {
        showToast('No se encontró el producto. Revise código, marca o modelo.', 'error');
        return;
    }
    
    quoteProducts.push({...p, cantidad: 1});
    if (input) input.value = '';
    renderQuoteProducts();
    calcQuote();
    showToast('Producto agregado al detalle', 'success');
}

function renderQuoteProducts() {
    const tbody = document.getElementById('quoteProductRows');
    if (!tbody) return;
    
    if (quoteProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#94A3B8;padding:20px;">📭 Agregue productos a la cotización</td></tr>`;
        return;
    }
    
    tbody.innerHTML = quoteProducts.map((p, i) => `
        <tr>
            <td class="col-item">${i + 1}</td>
            <td class="col-code">${p.codigo || '-'}</td>
            <td class="left">
                <div class="product-name">${p.producto || p.descripcion || 'Sin nombre'}</div>
                <div class="product-desc">${p.descripcion || ''}</div>
            </td>
            <td class="col-model">${p.modelo || '-'}</td>
            <td class="col-brand">${p.marca || '-'}</td>
            <td class="col-unit">
                <select class="um-select" onchange="quoteProducts[${i}].um=this.value">
                    ${SUNAT_UNIDADES.map(u => `<option value="${u.codigo}" ${p.um === u.codigo || p.um === u.nombre ? 'selected' : ''}>${u.codigo}</option>`).join('')}
                </select>
            </td>
            <td class="col-qty"><input style="width:70px;text-align:right" value="${p.cantidad || 1}" type="number" min="1" onchange="quoteProducts[${i}].cantidad=Number(this.value);calcQuote();"></td>
            <td class="col-price"><input style="width:90px;text-align:right" value="${p.valorVenta || 0}" type="number" step="0.01" onchange="quoteProducts[${i}].valorVenta=Number(this.value);calcQuote();"></td>
            <td class="col-total"><b>${money((p.cantidad || 1) * (p.valorVenta || 0))}</b></td>
            <td class="col-stock">${p.stock || 0}</td>
            <td class="col-delivery">${p.entrega === 'Inmediata' ? '<span class="badge b-ok">Inmediata</span>' : '<span class="badge b-draft">' + (p.entrega || 'Por confirmar') + '</span>'}</td>
            <td class="col-actions">
                <button class="btn btn-sm btn-danger" onclick="quoteProducts.splice(${i},1);renderQuoteProducts();calcQuote();">✕</button>
            </td>
        </tr>
    `).join('');
}

function calcQuote() {
    const subtotal = quoteProducts.reduce((s, p) => s + (Number(p.cantidad || 0) * Number(p.valorVenta || 0)), 0);
    const dv = Number(document.getElementById('fDiscountValue')?.value || 0);
    const dt = document.getElementById('fDiscountType')?.value || '%';
    const discount = dt === '%' ? subtotal * (dv / 100) : Math.min(dv, subtotal);
    const value = subtotal - discount;
    const igv = value * (CONFIG_VENTAS.igv || 0.18);
    const total = value + igv;
    
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sumSubtotal', money(subtotal));
    set('sumDiscountPct', dt === '%' ? dv.toFixed(2) + '%' : money(dv));
    set('sumDiscount', '-' + money(discount));
    set('sumValue', money(value));
    set('sumIgv', money(igv));
    set('sumTotal', money(total));
}

// ============================================================
// LOAD CLIENT - BUSCAR EN BD Y SUNAT
// ============================================================
async function loadClient() {
    const rucInput = document.getElementById('fRucSearch');
    const ruc = rucInput?.value?.trim() || '';
    
    if (!ruc) {
        showToast('⚠️ Ingrese un RUC para consultar', 'warning');
        return;
    }
    
    if (ruc.length !== 11) {
        showToast('⚠️ El RUC debe tener 11 dígitos', 'warning');
        return;
    }
    
    // Mostrar loading
    const btnBuscar = document.querySelector('.btn-search-ruc');
    const originalText = btnBuscar?.textContent || '🔍 Buscar';
    if (btnBuscar) {
        btnBuscar.textContent = '⏳ Consultando...';
        btnBuscar.disabled = true;
    }
    
    try {
        const response = await fetch(`/ventas/api/sunat/consulta?ruc=${ruc}`);
        const result = await response.json();
        
        console.log('📦 Resultado consulta:', result);
        
        if (result.success) {
            const data = result.data;
            
            // Mostrar mensaje según origen
            if (result.origen === 'base_datos') {
                showToast(result.mensaje, 'success');
                // Mostrar badge de cliente existente
                const confirmBox = document.getElementById('clientConfirmBox');
                if (confirmBox) {
                    confirmBox.textContent = '✅ Cliente encontrado en sistema';
                    confirmBox.style.background = '#DCFCE7';
                    confirmBox.style.color = '#166534';
                    confirmBox.style.borderColor = '#86EFAC';
                    confirmBox.classList.add('show');
                    setTimeout(() => confirmBox.classList.remove('show'), 4000);
                }
            } else {
                showToast(result.mensaje, 'info');
                // Mostrar badge de cliente nuevo
                const confirmBox = document.getElementById('clientConfirmBox');
                if (confirmBox) {
                    confirmBox.textContent = '🌞 Cliente consultado en SUNAT - datos cargados';
                    confirmBox.style.background = '#DBEAFE';
                    confirmBox.style.color = '#1D4ED8';
                    confirmBox.style.borderColor = '#93C5FD';
                    confirmBox.classList.add('show');
                    setTimeout(() => confirmBox.classList.remove('show'), 4000);
                }
            }
            
            // Llenar formulario con los datos
            document.getElementById('fRuc').value = data.ruc || '';
            document.getElementById('fRazon').value = data.razon_social || '';
            document.getElementById('fComercial').value = data.nombre_comercial || data.razon_social || '';
            document.getElementById('fCodCliente').value = data.codigo_cliente || 'PENDIENTE';
            document.getElementById('fDireccion').value = data.direccion || '';
            document.getElementById('fContacto').value = data.contacto || '';
            document.getElementById('fTelefono').value = data.telefono || '';
            document.getElementById('fCorreo').value = data.email || '';
            
            if (document.getElementById('fCondicion')) {
                document.getElementById('fCondicion').value = data.condicion_pago || 'Contado';
            }
            
            // Guardar en variable global el origen
            window.clienteOrigen = result.origen;
            
        } else {
            showToast('❌ ' + (result.error || 'Error al consultar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ Error al consultar el RUC', 'error');
    } finally {
        // Restaurar botón
        if (btnBuscar) {
            btnBuscar.textContent = originalText;
            btnBuscar.disabled = false;
        }
    }
}

// ============================================================
// AUTO LOAD CLIENT BY RUC
// ============================================================
let __rucAutoTimer = null;

function autoLoadClientByRuc(value) {
    clearTimeout(__rucAutoTimer);
    const ruc = (value || '').trim();
    
    // Solo buscar si tiene 11 dígitos
    if (ruc.length === 11) {
        __rucAutoTimer = setTimeout(() => {
            loadClient();
        }, 500);
    } else if (ruc.length > 11) {
        // Si pegaron más de 11 dígitos, limpiar
        const input = document.getElementById('fRucSearch');
        if (input) {
            input.value = ruc.substring(0, 11);
        }
    }
}

// ============================================================
// SAVE CLIENT FROM QUOTE
// ============================================================
function saveClientFromQuote() {
    const ruc = document.getElementById('fRuc')?.value?.trim() || '';
    if (!ruc) {
        showToast('⚠️ Primero busca el RUC', 'warning');
        return;
    }
    
    const cliente = {
        ruc: ruc,
        razon_social: document.getElementById('fRazon')?.value || '',
        nombre_comercial: document.getElementById('fComercial')?.value || '',
        direccion_fiscal: document.getElementById('fDireccion')?.value || '',
        nombre_contacto: document.getElementById('fContacto')?.value || '',
        telefono_contacto: document.getElementById('fTelefono')?.value || '',
        email_contacto: document.getElementById('fCorreo')?.value || '',
        condicion_pago: document.getElementById('fCondicion')?.value || 'Contado',
        tipo_documento: 'RUC'
    };
    
    // Verificar si ya existe en MAESTROS_VENTAS
    const existing = MAESTROS_VENTAS.clientes.findIndex(x => x.ruc === ruc);
    
    if (existing >= 0) {
        // Actualizar
        MAESTROS_VENTAS.clientes[existing] = {
            ...MAESTROS_VENTAS.clientes[existing],
            ...cliente,
            codigo: MAESTROS_VENTAS.clientes[existing].codigo || 'CLI-' + String(existing + 1).padStart(6, '0')
        };
        showToast('✅ Cliente actualizado en Maestros', 'success');
    } else {
        // Crear nuevo
        const nuevoCodigo = 'CLI-' + String(MAESTROS_VENTAS.clientes.length + 1).padStart(6, '0');
        MAESTROS_VENTAS.clientes.push({
            ...cliente,
            codigo: nuevoCodigo,
            estado: 'Activo'
        });
        document.getElementById('fCodCliente').value = nuevoCodigo;
        showToast('✅ Cliente nuevo guardado en Maestros', 'success');
    }
    
    // Mostrar confirmación
    const confirmBox = document.getElementById('clientConfirmBox');
    if (confirmBox) {
        confirmBox.textContent = '💾 Cliente guardado en Maestros correctamente';
        confirmBox.className = 'client-confirm-box show';
        confirmBox.style.background = '#DCFCE7';
        confirmBox.style.color = '#166534';
        confirmBox.style.borderColor = '#86EFAC';
        setTimeout(() => confirmBox.classList.remove('show'), 3000);
    }
}


// ============================================================
// MODAL PEDIDO COMPRA - GENERA CONTENIDO DINÁMICO
// ============================================================
function openPedidoCompraModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar PC Pedido Compras' : 'Nuevo PC Pedido Compras';
    document.getElementById('pedidoCompraModalTitle').textContent = title;
    
    const formContainer = document.getElementById('pedidoCompraForm');
    if (!formContainer) return;
    
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.numero}">${q.numero} - ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="pc-alert">
            <b>📋 PC Pedido Compras = aceptación formal del cliente.</b> 
            Llega por correo como OC/Pedido. Aquí se sube el PDF/archivo y se valida precio, cantidad, stock, lugar de entrega y monto antes de atender.
        </div>
        
        <div class="ficha-section">
            <div class="ficha-section-title">1. Aceptación del cliente <small>correo + PC/OC recibido</small></div>
            <div class="ficha-grid">
                <div class="form-field col-4"><label>Cotización vinculada</label>
                    <select id="pcCotizacion">${cotOptions || '<option value="">Sin cotizaciones</option>'}</select>
                </div>
                <div class="form-field col-4"><label>N° PC / OC Cliente</label>
                    <input id="pcNumero" placeholder="PC-2026-0001" value="${isEdit ? 'PC-2026-0001' : ''}">
                </div>
                <div class="form-field col-4"><label>Estado</label>
                    <select id="pcEstado">
                        <option>Pendiente</option>
                        <option>Recibido por correo</option>
                        <option>En revisión interna</option>
                        <option>Validado por Hellen</option>
                        <option>Listo para despacho</option>
                        <option>Anulado</option>
                    </select>
                </div>
                <div class="form-field col-4"><label>Cliente</label>
                    <input id="pcCliente" placeholder="Razón social del cliente">
                </div>
                <div class="form-field col-4"><label>RUC</label>
                    <input id="pcRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4"><label>Monto PC / OC</label>
                    <input id="pcMonto" type="number" value="0">
                </div>
                <div class="form-field col-4"><label>Correo origen</label>
                    <input id="pcCorreo" placeholder="correo@cliente.com">
                </div>
                <div class="form-field col-4"><label>Fecha recepción</label>
                    <input id="pcFechaRecep" type="date" value="${new Date().toISOString().slice(0,10)}">
                </div>
                <div class="form-field col-4"><label>Fecha requerida despacho</label>
                    <input id="pcFechaDesp" type="date">
                </div>
            </div>
        </div>
        
        <div class="ficha-section">
            <div class="ficha-section-title">2. Subir sustento del cliente <small>PDF / correo / archivo OC</small></div>
            <div class="ficha-grid">
                <div class="form-field col-6">
                    <label>Subir PDF / archivo recibido</label>
                    <div class="pc-file-box">
                        <input id="pcFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">
                        <div class="pc-file-note">Se guarda el nombre del archivo. Luego se conecta a Supabase Storage.</div>
                    </div>
                </div>
                <div class="form-field col-6">
                    <label>Archivo registrado</label>
                    <input id="pcArchivo" placeholder="archivo.pdf" readonly>
                </div>
                <div class="form-field col-12">
                    <label>Observación</label>
                    <textarea id="pcObs" placeholder="Observaciones del PC recibido"></textarea>
                </div>
            </div>
        </div>
        
        <div class="ficha-section">
            <div class="ficha-section-title">3. Validación interna antes de atender <small>obligatorio para Hellen</small></div>
            <div class="pc-check-grid">
                <div class="pc-check-card">
                    <label><input id="pcValPrecios" type="checkbox"> Precios</label>
                    <small>PC vs cotización.</small>
                </div>
                <div class="pc-check-card">
                    <label><input id="pcValCant" type="checkbox"> Cantidades</label>
                    <small>Cantidades solicitadas.</small>
                </div>
                <div class="pc-check-card">
                    <label><input id="pcValStock" type="checkbox"> Stock</label>
                    <small>Disponibilidad real.</small>
                </div>
                <div class="pc-check-card">
                    <label><input id="pcValEntrega" type="checkbox"> Lugar entrega</label>
                    <small>Dirección y sede.</small>
                </div>
                <div class="pc-check-card">
                    <label><input id="pcValMonto" type="checkbox"> Montos</label>
                    <small>Total, IGV y moneda.</small>
                </div>
            </div>
            <div class="ficha-grid">
                <div class="form-field col-4"><label>Valida internamente</label>
                    <input id="pcResp" value="Hellen">
                </div>
                <div class="form-field col-4"><label>Lugar de entrega</label>
                    <input id="pcLugar" placeholder="Dirección de entrega">
                </div>
                <div class="form-field col-4"><label>Condición de atención</label>
                    <select id="pcCondicion">
                        <option>Atender completo</option>
                        <option>Atender parcial</option>
                        <option>Esperar stock</option>
                        <option>Revisar diferencia</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="ficha-section">
            <div class="ficha-section-title">4. Productos vinculados <small>desde cotización</small></div>
            <div id="pcProductsPreview">
                <div style="padding:10px;text-align:center;color:#94A3B8;">Seleccione una cotización para ver los productos.</div>
            </div>
        </div>
    `;
    
    // Evento para cargar productos al seleccionar cotización
    document.getElementById('pcCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('pcProductsPreview').innerHTML = productTable(q.productos);
        } else {
            document.getElementById('pcProductsPreview').innerHTML = `
                <div style="padding:10px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });
    
    // Evento para archivo
    document.getElementById('pcFile')?.addEventListener('change', function() {
        if (this.files[0]) {
            document.getElementById('pcArchivo').value = this.files[0].name;
        }
    });
    
    document.getElementById('pedidoCompraModal').classList.add('show');
}
function productTable(productos) {
    if (!productos || productos.length === 0) {
        return `<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos</div>`;
    }
    
    return `
        <div class="table-scroll">
            <table class="master-table">
                <thead><tr>
                    <th>Item</th><th>Código</th><th>Producto</th><th>Marca</th><th>UM SUNAT</th>
                    <th>Cant.</th><th>Stock</th><th>Almacén</th><th>Validación</th>
                </tr></thead>
                <tbody>
                    ${productos.map((p, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td>${p.codigo || '-'}</td>
                            <td class="left">${p.producto || p.descripcion || '-'}</td>
                            <td>${p.marca || '-'}</td>
                            <td>${p.um === 'UND' ? 'NIU' : (p.um || 'NIU')}</td>
                            <td>${p.cantidad || 1}</td>
                            <td>${p.stock || 0}</td>
                            <td>${p.almacen || 'ALM-SMP'}</td>
                            <td>${(p.stock || 0) >= (p.cantidad || 1) ? '✅ OK stock' : '⚠️ Revisar stock'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
// ============================================================
// MODAL DESPACHO - GENERA CONTENIDO DINÁMICO
// ============================================================
function openDespachoModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar despacho' : 'Nuevo despacho';
    document.getElementById('despachoModalTitle').textContent = title;
    
    const formContainer = document.getElementById('despachoForm');
    if (!formContainer) return;
    
    const pcOptions = pedidosData.map(p => 
        `<option value="${p.numero}">${p.numero} - ${p.cliente || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-grid">
                <div class="form-field col-4"><label>PC vinculado</label>
                    <select id="despachoPC">${pcOptions || '<option value="">Sin PC</option>'}</select>
                </div>
                <div class="form-field col-4"><label>N° Despacho</label>
                    <input id="despachoNumero" value="DESP-${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-4"><label>Estado</label>
                    <select id="despachoEstado">
                        <option>Pendiente despacho</option>
                        <option>En preparación</option>
                        <option>Despachado</option>
                        <option>Entregado</option>
                    </select>
                </div>
                <div class="form-field col-4"><label>Cliente</label>
                    <input id="despachoCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4"><label>RUC</label>
                    <input id="despachoRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4"><label>Fecha despacho</label>
                    <input id="despachoFecha" type="date" value="${new Date().toISOString().slice(0,10)}">
                </div>
                <div class="form-field col-4"><label>Origen</label>
                    <select id="despachoOrigen">
                        <option>ALM-SMP</option>
                        <option>OF-BRE</option>
                        <option>Almacén Central</option>
                    </select>
                </div>
                <div class="form-field col-4"><label>Destino</label>
                    <input id="despachoDestino" placeholder="Dirección de entrega">
                </div>
                <div class="form-field col-4"><label>Transportista</label>
                    <input id="despachoTransportista" placeholder="Nombre o razón social">
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="despachoObs" placeholder="Observaciones del despacho"></textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">Productos a despachar</div>
            <div id="despachoProducts">
                <div style="padding:10px;text-align:center;color:#94A3B8;">Seleccione un PC para ver los productos.</div>
            </div>
        </div>
    `;
    
    // Evento para cargar productos al seleccionar PC
    document.getElementById('despachoPC')?.addEventListener('change', function() {
        const num = this.value;
        const p = pedidosData.find(x => x.numero === num);
        if (p && p.productos && p.productos.length > 0) {
            document.getElementById('despachoProducts').innerHTML = productTable(p.productos);
            document.getElementById('despachoCliente').value = p.cliente || '';
            document.getElementById('despachoRuc').value = p.ruc || '';
            document.getElementById('despachoDestino').value = p.lugarEntrega || '';
        } else {
            document.getElementById('despachoProducts').innerHTML = `
                <div style="padding:10px;text-align:center;color:#94A3B8;">No hay productos en este PC.</div>
            `;
        }
    });
    
    document.getElementById('despachoModal').classList.add('show');
}

// ============================================================
// MODAL GUÍA - GENERA CONTENIDO DINÁMICO
// ============================================================
function openGuiaModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar guía' : 'Nueva guía';
    document.getElementById('guiaModalTitle').textContent = title;
    
    const formContainer = document.getElementById('guiaForm');
    if (!formContainer) return;
    
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.numero}">${q.numero} - ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">📦 Datos de la guía</div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Cotización vinculada</label>
                    <select id="guiaCotizacion">${cotOptions || '<option value="">Sin cotización</option>'}</select>
                </div>
                <div class="form-field col-4">
                    <label>Serie</label>
                    <input id="guiaSerie" value="T001">
                </div>
                <div class="form-field col-4">
                    <label>Número</label>
                    <input id="guiaNumero" value="${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-4">
                    <label>Estado</label>
                    <select id="guiaEstado">
                        <option>Borrador</option>
                        <option>Pendiente despacho</option>
                        <option>Emitida</option>
                        <option>Entregada</option>
                        <option>Anulada</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="guiaCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="guiaRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4">
                    <label>Origen</label>
                    <select id="guiaOrigen">
                        <option>ALM-SMP</option>
                        <option>OF-BRE</option>
                        <option>Almacén Central</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Destino</label>
                    <input id="guiaDestino" placeholder="Dirección de entrega">
                </div>
                <div class="form-field col-4">
                    <label>Motivo traslado</label>
                    <select id="guiaMotivo">
                        <option>Venta</option>
                        <option>Compra</option>
                        <option>Traslado interno</option>
                        <option>Devolución</option>
                    </select>
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="guiaObs" placeholder="Observaciones de la guía"></textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">📦 Productos</div>
            <div id="guiaProducts">
                <div style="padding:20px;text-align:center;color:#94A3B8;">Seleccione una cotización para ver los productos.</div>
            </div>
        </div>
    `;
    
    // Evento para cargar productos al seleccionar cotización
    document.getElementById('guiaCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('guiaProducts').innerHTML = productTable(q.productos);
            document.getElementById('guiaCliente').value = q.razon || '';
            document.getElementById('guiaRuc').value = q.ruc || '';
            document.getElementById('guiaDestino').value = q.direccion || '';
        } else {
            document.getElementById('guiaProducts').innerHTML = `
                <div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });
    
    document.getElementById('guiaModal').classList.add('show');
}

// ============================================================
// MODAL FACTURA - GENERA CONTENIDO DINÁMICO
function openComprobanteModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar comprobante' : 'Nuevo comprobante';
    document.getElementById('comprobanteModalTitle').textContent = title;
    
    const formContainer = document.getElementById('comprobanteForm');
    if (!formContainer) return;
    
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.numero}">${q.numero} - ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">🧾 Datos del comprobante</div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Cotización vinculada</label>
                    <select id="compCotizacion">${cotOptions || '<option value="">Sin cotización</option>'}</select>
                </div>
                <div class="form-field col-3">
                    <label>Tipo</label>
                    <select id="compTipo">
                        <option>Factura</option>
                        <option>Boleta</option>
                    </select>
                </div>
                <div class="form-field col-3">
                    <label>Serie</label>
                    <input id="compSerie" value="F001">
                </div>
                <div class="form-field col-3">
                    <label>Número</label>
                    <input id="compNumero" value="${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-3">
                    <label>Estado</label>
                    <select id="compEstado">
                        <option>Borrador</option>
                        <option>Emitido</option>
                        <option>Enviado</option>
                        <option>Pagado</option>
                        <option>Anulado</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="compCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="compRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4">
                    <label>Monto</label>
                    <input id="compMonto" type="number" value="0" step="0.01">
                </div>
                <div class="form-field col-4">
                    <label>Condición de pago</label>
                    <select id="compCondicion">
                        ${options(MAESTROS_VENTAS.condicionesPago, 'Contado')}
                    </select>
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="compObs" placeholder="Observaciones del comprobante"></textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">🧾 Productos</div>
            <div id="compProducts">
                <div style="padding:20px;text-align:center;color:#94A3B8;">Seleccione una cotización para ver los productos.</div>
            </div>
        </div>
    `;
    
    document.getElementById('compCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('compProducts').innerHTML = productTable(q.productos);
            document.getElementById('compCliente').value = q.razon || '';
            document.getElementById('compRuc').value = q.ruc || '';
            document.getElementById('compMonto').value = q.monto || 0;
        } else {
            document.getElementById('compProducts').innerHTML = `
                <div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });
    
    document.getElementById('comprobanteModal').classList.add('show');
}

// ============================================================
// MODAL NOTA DE CRÉDITO - GENERA CONTENIDO DINÁMICO
// ============================================================
function openNotaCreditoModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar nota de crédito' : 'Nueva nota de crédito';
    document.getElementById('notaCreditoModalTitle').textContent = title;
    
    const formContainer = document.getElementById('notaCreditoForm');
    if (!formContainer) return;
    
    const compOptions = comprobantesData.map(c => 
        `<option value="${c.serie}-${c.numero}">${c.serie}-${c.numero} - ${c.cliente || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">📝 Datos de la nota de crédito</div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Comprobante afectado</label>
                    <select id="notaComprobante">${compOptions || '<option value="">Sin comprobantes</option>'}</select>
                </div>
                <div class="form-field col-3">
                    <label>Serie</label>
                    <input id="notaSerie" value="FC01">
                </div>
                <div class="form-field col-3">
                    <label>Número</label>
                    <input id="notaNumero" value="${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-3">
                    <label>Estado</label>
                    <select id="notaEstado">
                        <option>Borrador</option>
                        <option>Emitida</option>
                        <option>Enviada</option>
                        <option>Aplicada</option>
                        <option>Anulada</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="notaCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="notaRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4">
                    <label>Monto</label>
                    <input id="notaMonto" type="number" value="0" step="0.01">
                </div>
                <div class="form-field col-6">
                    <label>Motivo</label>
                    <select id="notaMotivo">
                        <option>Anulación de operación</option>
                        <option>Devolución</option>
                        <option>Descuento posterior</option>
                        <option>Error en descripción</option>
                        <option>Ajuste comercial</option>
                    </select>
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="notaObs" placeholder="Observaciones de la nota de crédito"></textarea>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('notaCreditoModal').classList.add('show');
}
// ============================================================
// MODAL DEVOLUCIÓN - GENERA CONTENIDO DINÁMICO
// ============================================================
function openDevolucionModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar devolución' : 'Nueva devolución';
    document.getElementById('devolucionModalTitle').textContent = title;
    
    const formContainer = document.getElementById('devolucionForm');
    if (!formContainer) return;
    
    const compOptions = comprobantesData.map(c => 
        `<option value="${c.serie}-${c.numero}">${c.serie}-${c.numero} - ${c.cliente || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">🔄 Datos de la devolución</div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Comprobante vinculado</label>
                    <select id="devComprobante">${compOptions || '<option value="">Sin comprobantes</option>'}</select>
                </div>
                <div class="form-field col-4">
                    <label>N° Devolución</label>
                    <input id="devNumero" value="DEV-${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-4">
                    <label>Estado</label>
                    <select id="devEstado">
                        <option>Pendiente</option>
                        <option>En revisión</option>
                        <option>Aprobada</option>
                        <option>Rechazada</option>
                        <option>Procesada</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="devCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="devRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4">
                    <label>Monto</label>
                    <input id="devMonto" type="number" value="0" step="0.01">
                </div>
                <div class="form-field col-6">
                    <label>Motivo</label>
                    <select id="devMotivo">
                        <option>Producto defectuoso</option>
                        <option>Producto incorrecto</option>
                        <option>Exceso de cantidad</option>
                        <option>Daño en transporte</option>
                        <option>Otro</option>
                    </select>
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="devObs" placeholder="Observaciones de la devolución"></textarea>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('devolucionModal').classList.add('show');
}

// ============================================================
// FUNCIONES DE GUARDADO (SIMPLE POR AHORA)
// ============================================================
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

function savePedidoCompra(estado) {
    showToast(`PC guardado como: ${estado}`, 'success');
    closeModal('pedidoCompraModal');
}

function saveDespacho(estado) {
    showToast(`Despacho guardado como: ${estado}`, 'success');
    closeModal('despachoModal');
}

function saveGuia(estado) {
    showToast(`Guía guardada como: ${estado}`, 'success');
    closeModal('guiaModal');
}

function saveComprobante(estado) {
    showToast(`Comprobante guardado como: ${estado}`, 'success');
    closeModal('comprobanteModal');
}

function saveNotaCredito(estado) {
    showToast(`Nota de crédito guardada como: ${estado}`, 'success');
    closeModal('notaCreditoModal');
}

function saveDevolucion(estado) {
    showToast(`Devolución guardada como: ${estado}`, 'success');
    closeModal('devolucionModal');
}

function marcarDespachado(id) {
    showToast('Despacho marcado como completado', 'success');
}

// ============================================================
// MENÚS DE ACCIONES
// ============================================================
function showCotizacionMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
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
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
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
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
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
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
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
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
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
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
    pop.innerHTML = `
        <button onclick="openDevolucionModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="approveDevolucion(${id});this.closest('.menu-pop').remove()">✅ Aprobar</button>
        <button onclick="rejectDevolucion(${id});this.closest('.menu-pop').remove()">❌ Rechazar</button>
        <button class="danger" onclick="deleteDevolucion(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    document.body.appendChild(pop);
}

// ============================================================
// ACCIONES
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

function exportData(module) {
    showToast(`Exportando datos de ${module}...`, 'info');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
window.initVentas = function(tab) {
    console.log(`🚀 Inicializando ventas con tab: ${tab}`);
    currentModule = tab;
    
    // Cargar productos maestros primero
    cargarProductosMaestros().then(() => {
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
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 ventas.js: DOMContentLoaded');
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'cotizaciones';
    
    if (typeof initVentas === 'function') {
        initVentas(tab);
    }
});

// ============================================================
// ASIGNAR FUNCIONES A WINDOW
// ============================================================
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
window.addQuoteProductFromSearch = addQuoteProductFromSearch;
window.calcQuote = calcQuote;
window.loadClient = loadClient;
window.autoLoadClientByRuc = autoLoadClientByRuc;
window.saveClientFromQuote = saveClientFromQuote;
window.renderQuoteProducts = renderQuoteProducts;

console.log('✅ Módulo Ventas cargado correctamente');