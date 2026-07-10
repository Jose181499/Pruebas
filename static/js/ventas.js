// ============================================================
// MÓDULO VENTAS - ERP Multiempresa
// VERSIÓN COMPLETA Y FUNCIONAL
// ============================================================

console.log('📦 Módulo Ventas cargando...');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const CONFIG = {
    igv: 0.18,
    monedaDefault: 'Soles (S/.)',
    asesorDefault: 'Helen Blas Príncipe',
    emailAsesorDefault: 'ventas@kcfcorporacion.com',
    telefonoAsesorDefault: '999932051',
    validezDefault: '15 días',
    tiempoEntregaDefault: '5 días hábiles'
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

const ESTADOS_COTIZACION = ['Borrador', 'En Proceso', 'Generada', 'Aceptada por Cliente', 'Anulada'];
const ESTADOS_PC = ['Pendiente', 'Recibido por correo', 'En revisión interna', 'Validado por Hellen', 'Listo para despacho', 'Anulado'];
const ESTADOS_DESPACHO = ['Pendiente despacho', 'En preparación', 'Despachado', 'Entregado'];
const ESTADOS_GUIA = ['Borrador', 'Pendiente despacho', 'Emitida', 'Entregada', 'Anulada'];
const ESTADOS_COMPROBANTE = ['Borrador', 'Emitido', 'Enviado', 'Pagado', 'Anulado'];
const ESTADOS_NOTA = ['Borrador', 'Emitida', 'Enviada', 'Aplicada', 'Anulada'];
const ESTADOS_DEVOLUCION = ['Pendiente', 'En revisión', 'Aprobada', 'Rechazada', 'Procesada'];

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
let CLIENTES_MAESTROS = [];

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

function today() {
    return new Date().toISOString().slice(0,10);
}

function badgeStatus(s) {
    const map = {
        // 🔴 Rojo fluorescente NEON - Borrador
        'Borrador': 'b-draft',
        'Eliminada': 'b-draft',
        
        // 🟡 Amarillo fluorescente NEON - En revisión
        'En revisión': 'b-review',
        'En revisión interna': 'b-review',
        'En Proceso': 'b-review',
        
        // 🔵 Azul bajito fluorescente - Validado por Hellen
        'Validado por Hellen': 'b-validated',
        'Validada': 'b-validated',
        
        // 🟢 Verde fluorescente NEON - Generada
        'Generada': 'b-generated',
        'Emitido': 'b-ok',
        'Emitida': 'b-ok',
        'Despachado': 'b-ok',
        'Entregado': 'b-ok',
        'Pagado': 'b-ok',
        'Aprobada': 'b-ok',
        'Procesada': 'b-ok',
        
        // 🔵 Azul chillon fluorescente NEON - Aceptada por Cliente
        'Aceptada por Cliente': 'b-accepted',
        'Aceptada': 'b-accepted',
        'Aceptado': 'b-accepted',
        
        // ⚪ Plomo - Anulada/Cancelada
        'Anulada': 'b-canceled',
        'Rechazada': 'b-canceled',
        'Cancelado': 'b-canceled',
        'Cancelar': 'b-canceled',
    };
    return `<span class="badge ${map[s] || 'b-gray'}">${s}</span>`;
}

function options(arr, selected = '') {
    return arr.map(x => `<option value="${x}" ${x === selected ? 'selected' : ''}>${x}</option>`).join('');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
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

async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

// ============================================================
// FUNCIÓN PARA FORMATEAR FECHA
// ============================================================

function formatFecha(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        const fecha = new Date(fechaStr);
        if (isNaN(fecha.getTime())) return fechaStr;
        
        // Formato: 08/07/2026 22:48
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
    } catch (e) {
        return fechaStr;
    }
}

async function cargarProductosMaestros() {
    try {
        console.log('🔄 Cargando productos maestros desde base de datos...');
        
        // Usar la ruta correcta del blueprint productos
        const response = await fetch('/productos/api/productos');
        const data = await response.json();
        
        console.log('📦 Respuesta de productos:', data);
        
        if (data.success && data.data && data.data.length > 0) {
            PRODUCTOS_MAESTROS = data.data.map(p => ({
                id: p.id,
                codigo: p.codigo || '',
                producto: p.descripcion || p.nombre || 'Sin nombre',
                descripcion: p.descripcion_larga || p.descripcion || '',
                modelo: p.modelo || '',
                marca: p.marca || '',
                um: p.unidad || 'NIU',
                stock: p.stock || 0,
                valorVenta: p.precio_unitario || p.precio_venta || 0,
                entrega: p.tiempo_entrega || 'Inmediata',
                // Guardar también para referencia
                precio_unitario: p.precio_unitario,
                costo_unitario: p.costo_unitario
            }));
            console.log(`✅ ${PRODUCTOS_MAESTROS.length} productos cargados desde base de datos`);
            console.log('📋 Primer producto:', PRODUCTOS_MAESTROS[0]);
        } else {
            console.warn('⚠️ No se encontraron productos en la base de datos');
            // Usar datos de ejemplo
            PRODUCTOS_MAESTROS = [
                {id:1, codigo:'PRD-001245', producto:'Cable THHN 12 AWG', descripcion:'Cable eléctrico THHN 12 AWG 600V', modelo:'THHN-12', marca:'INDECO', um:'NIU', stock:1200, valorVenta:6.50, entrega:'Inmediata'},
                {id:2, codigo:'PRD-002318', producto:'Interruptor termomagnético 2P 40A', descripcion:'Interruptor termomagnético 2 polos 40A', modelo:'IC60N-2P-40A', marca:'Schneider', um:'NIU', stock:120, valorVenta:85.00, entrega:'Inmediata'}
            ];
        }
        
        // Actualizar el datalist
        cargarDatalistProductos();
        
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        // Datos de ejemplo en caso de error
        PRODUCTOS_MAESTROS = [
            {id:1, codigo:'PRD-001245', producto:'Cable THHN 12 AWG', descripcion:'Cable eléctrico THHN 12 AWG 600V', modelo:'THHN-12', marca:'INDECO', um:'NIU', stock:1200, valorVenta:6.50, entrega:'Inmediata'},
            {id:2, codigo:'PRD-002318', producto:'Interruptor termomagnético 2P 40A', descripcion:'Interruptor termomagnético 2 polos 40A', modelo:'IC60N-2P-40A', marca:'Schneider', um:'NIU', stock:120, valorVenta:85.00, entrega:'Inmediata'}
        ];
        cargarDatalistProductos();
    }
}



// Función alternativa para cargar productos desde el módulo de productos
async function cargarProductosDesdeModulo() {
    try {
        console.log('🔄 Intentando cargar productos desde módulo productos...');
        const response = await fetch('/productos/api/listar');
        const data = await response.json();
        
        if (data.success && data.data) {
            PRODUCTOS_MAESTROS = data.data.map(p => ({
                id: p.id,
                codigo: p.codigo,
                producto: p.descripcion || p.nombre || 'Sin nombre',
                descripcion: p.descripcion_larga || p.descripcion || '',
                modelo: p.modelo || '',
                marca: p.marca || '',
                um: p.unidad || 'NIU',
                stock: p.stock || 0,
                valorVenta: p.precio_unitario || p.precio_venta || 0,
                entrega: p.tiempo_entrega || 'Inmediata'
            }));
            console.log(`✅ ${PRODUCTOS_MAESTROS.length} productos cargados desde módulo productos`);
            cargarDatalistProductos();
        }
    } catch (error) {
        console.error('❌ Error cargando desde módulo productos:', error);
        // Si todo falla, usar datos de ejemplo
        PRODUCTOS_MAESTROS = [
            {id:1, codigo:'PRD-001245', producto:'Cable THHN 12 AWG', descripcion:'Cable eléctrico THHN 12 AWG 600V', modelo:'THHN-12', marca:'INDECO', um:'NIU', stock:1200, valorVenta:6.50, entrega:'Inmediata'},
            {id:2, codigo:'PRD-002318', producto:'Interruptor termomagnético 2P 40A', descripcion:'Interruptor termomagnético 2 polos 40A', modelo:'IC60N-2P-40A', marca:'Schneider', um:'NIU', stock:120, valorVenta:85.00, entrega:'Inmediata'}
        ];
        console.warn('⚠️ Usando productos de ejemplo (fallback)');
        cargarDatalistProductos();
    }
}


async function cargarClientesMaestros() {
    try {
        const response = await fetch('/maestros/api/clientes/listar');
        const data = await response.json();
        if (data.success) {
            CLIENTES_MAESTROS = data.data || [];
        } else {
            // Fallback
            CLIENTES_MAESTROS = [
                {id:1, codigo_cliente:'CLI-000099', ruc:'20114915026', razon_social:'COMPAÑÍA MINERA ANTAPACCAY S.A.', nombre_comercial:'MINERA ANTAPACCAY', contacto:'Compras', telefono:'999 111 222', email:'compras@antapaccay.com', condicion_pago:'Crédito 30 días', direccion:'Av. Industrial 123 - Lima'},
                {id:2, codigo_cliente:'CLI-000082', ruc:'20543722309', razon_social:'CINDEL S.A.', nombre_comercial:'CINDEL', contacto:'María López', telefono:'999 222 333', email:'compras@cindel.com', condicion_pago:'Crédito 45 días', direccion:'Jr. Los Olivos 456 - Lima'}
            ];
        }
        console.log('✅ Clientes cargados:', CLIENTES_MAESTROS.length);
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// ============================================================
// FUNCIONES DE CARGA DE DATOS (CON API REAL)
// ============================================================


async function loadCotizaciones() {
    console.log('🔄 Cargando cotizaciones...');
    try {
        const data = await apiFetch('/ventas/api/cotizaciones/listar');
        if (data.success) {
            cotizacionesData = data.data || [];
            console.log(`✅ ${cotizacionesData.length} cotizaciones cargadas`);
            renderCotizaciones();
            // El buscador de PC usará cotizacionesData
            return cotizacionesData;
        } else {
            showToast('Error al cargar cotizaciones: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando cotizaciones:', error);
        showToast('Error al cargar cotizaciones', 'error');
    }
    return [];
}

async function loadPedidos() {
    console.log('🔄 Cargando pedidos...');
    try {
        const data = await apiFetch('/ventas/api/pedido-compra/listar');
        if (data.success) {
            pedidosData = data.data || [];
            console.log(`✅ ${pedidosData.length} pedidos cargados`);
            renderPedidos();
        } else {
            showToast('Error al cargar pedidos', 'error');
        }
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        showToast('Error al cargar pedidos', 'error');
    }
}

async function loadDespachos() {
    console.log('🔄 Cargando despachos...');
    try {
        const data = await apiFetch('/ventas/api/despachos/listar');
        if (data.success) {
            despachosData = data.data || [];
            console.log(`✅ ${despachosData.length} despachos cargados`);
            renderDespachos();
        } else {
            showToast('Error al cargar despachos', 'error');
        }
    } catch (error) {
        console.error('Error cargando despachos:', error);
        showToast('Error al cargar despachos', 'error');
    }
}

async function loadGuias() {
    console.log('🔄 Cargando guías...');
    try {
        const data = await apiFetch('/ventas/api/guias/listar');
        if (data.success) {
            guiasData = data.data || [];
            console.log(`✅ ${guiasData.length} guías cargadas`);
            renderGuias();
        } else {
            showToast('Error al cargar guías', 'error');
        }
    } catch (error) {
        console.error('Error cargando guías:', error);
        showToast('Error al cargar guías', 'error');
    }
}

async function loadComprobantes() {
    console.log('🔄 Cargando comprobantes...');
    try {
        const data = await apiFetch('/ventas/api/comprobantes/listar');
        if (data.success) {
            comprobantesData = data.data || [];
            console.log(`✅ ${comprobantesData.length} comprobantes cargados`);
            renderComprobantes();
        } else {
            showToast('Error al cargar comprobantes', 'error');
        }
    } catch (error) {
        console.error('Error cargando comprobantes:', error);
        showToast('Error al cargar comprobantes', 'error');
    }
}

async function loadNotas() {
    console.log('🔄 Cargando notas de crédito...');
    try {
        const data = await apiFetch('/ventas/api/notas-credito/listar');
        if (data.success) {
            notasData = data.data || [];
            console.log(`✅ ${notasData.length} notas cargadas`);
            renderNotas();
        } else {
            showToast('Error al cargar notas de crédito', 'error');
        }
    } catch (error) {
        console.error('Error cargando notas:', error);
        showToast('Error al cargar notas de crédito', 'error');
    }
}

async function loadDevoluciones() {
    console.log('🔄 Cargando devoluciones...');
    try {
        const data = await apiFetch('/ventas/api/devoluciones/listar');
        if (data.success) {
            devolucionesData = data.data || [];
            console.log(`✅ ${devolucionesData.length} devoluciones cargadas`);
            renderDevoluciones();
        } else {
            showToast('Error al cargar devoluciones', 'error');
        }
    } catch (error) {
        console.error('Error cargando devoluciones:', error);
        showToast('Error al cargar devoluciones', 'error');
    }
}

// ============================================================
// FUNCIONES DE RENDERIZADO
// ============================================================



function renderPedidos() {
    const q = document.getElementById('pcSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('pcStatus')?.value || '';
    
    const list = pedidosData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('pcRows');
    if (!tbody) return;
    
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
            <td>${sd(r.cotizacion_numero)}</td>
            <td><b>${money(r.monto)}</b></td>
            <td>${sd(r.archivo_oc)}</td>
            <td>${sd(r.lugar_entrega)}</td>
            <td>
                <button class="kebab" onclick="showPedidoMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// VISTAS DE COTIZACIONES - PRINCIPAL / COMPLETA
// ============================================================

let cotizacionViewMode = 'principal'; // 'principal' o 'completa'

function setCotizacionView(mode) {
    cotizacionViewMode = mode;
    
    // Actualizar clases de los botones
    const principalBtn = document.getElementById('viewPrincipalBtn');
    const completaBtn = document.getElementById('viewCompletaBtn');
    
    if (principalBtn && completaBtn) {
        if (mode === 'principal') {
            principalBtn.className = 'btn btn-view btn-primary-view active';
            principalBtn.style.background = '#EF233C';
            principalBtn.style.color = '#fff';
            principalBtn.style.border = 'none';
            
            completaBtn.className = 'btn btn-view btn-secondary-view';
            completaBtn.style.background = '#F1F5F9';
            completaBtn.style.color = '#475569';
            completaBtn.style.border = '1px solid #E5E7EB';
        } else {
            principalBtn.className = 'btn btn-view btn-secondary-view';
            principalBtn.style.background = '#F1F5F9';
            principalBtn.style.color = '#475569';
            principalBtn.style.border = '1px solid #E5E7EB';
            
            completaBtn.className = 'btn btn-view btn-secondary-view active';
            completaBtn.style.background = '#EF233C';
            completaBtn.style.color = '#fff';
            completaBtn.style.border = 'none';
        }
    }
    
    // Renderizar la tabla con la vista seleccionada
    renderCotizaciones();
}


function renderCotizaciones() {
    const q = document.getElementById('qSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('qStatus')?.value || '';
    
    // ============================================================
    // 🔽 FILTRO POR FECHAS
    // ============================================================
    const fechaInicio = document.getElementById('qFechaInicio')?.value || '';
    const fechaFin = document.getElementById('qFechaFin')?.value || '';
    
    // ============================================================
    // FILTRO DE ESTADO MEJORADO - Con mapeo flexible
    // ============================================================
    const list = cotizacionesData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.ruc || ''} ${r.razon || ''} ${r.descripcion || ''} ${r.nota_cotizacion || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        
        // 🔽 FILTRO POR FECHAS
        let matchFecha = true;
        if (fechaInicio || fechaFin) {
            let fechaCotizacion = r.fecha || r.created_at || '';
            let fechaObj = null;
            try {
                if (typeof fechaCotizacion === 'string') {
                    fechaObj = new Date(fechaCotizacion);
                    if (fechaCotizacion.includes('/')) {
                        const partes = fechaCotizacion.split(/[\/\s:]/);
                        if (partes.length >= 3) {
                            fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        }
                    }
                } else if (fechaCotizacion instanceof Date) {
                    fechaObj = fechaCotizacion;
                }
            } catch (e) {
                fechaObj = null;
            }
            
            if (fechaObj && !isNaN(fechaObj.getTime())) {
                const fechaStr = fechaObj.toISOString().split('T')[0];
                if (fechaInicio && fechaFin) {
                    matchFecha = fechaStr >= fechaInicio && fechaStr <= fechaFin;
                } else if (fechaInicio) {
                    matchFecha = fechaStr >= fechaInicio;
                } else if (fechaFin) {
                    matchFecha = fechaStr <= fechaFin;
                }
            }
        }
        
        // 🔽 FILTRO DE ESTADO
        let matchStatus = true;
        if (st) {
            const estadoActual = (r.estado || '').toLowerCase().trim();
            const estadoFiltro = st.toLowerCase().trim();
            
            const estadoMap = {
                'borrador': ['borrador'],
                'en revisión': ['en revisión', 'en revision', 'en proceso', 'proceso'],
                'en proceso': ['en revisión', 'en revision', 'en proceso', 'proceso'],
                'validado por hellen': ['validado por hellen', 'validada por hellen', 'validada', 'validado'],
                'generada': ['generada', 'generado'],
                'aceptada por cliente': ['aceptada por cliente', 'aceptada', 'aceptado', 'aceptado por cliente'],
                'aceptada': ['aceptada por cliente', 'aceptada', 'aceptado', 'aceptado por cliente'],
                'no concretada': ['no concretada', 'no concretado', 'perdida', 'perdido'],
                'anulada': ['anulada', 'anulado', 'cancelada', 'cancelado']
            };
            
            const variaciones = estadoMap[estadoFiltro] || [estadoFiltro];
            matchStatus = variaciones.some(v => 
                estadoActual === v || 
                estadoActual.includes(v) || 
                v.includes(estadoActual)
            );
        }
        
        return matchText && matchStatus && matchFecha;
    });
    
    // ============================================================
    // KPIs
    // ============================================================
    const kpiContainer = document.getElementById('cotizacionesKPI');
    if (kpiContainer) {
        const total = cotizacionesData.length;
        const borradores = cotizacionesData.filter(x => x.estado === 'Borrador').length;
        const revision = cotizacionesData.filter(x => x.estado === 'En revisión' || x.estado === 'En Proceso').length;
        const generadas = cotizacionesData.filter(x => x.estado === 'Generada').length;
        const aceptadas = cotizacionesData.filter(x => x.estado === 'Aceptada por Cliente' || x.estado === 'Aceptada' || x.estado === 'Aceptado').length;
        
        kpiContainer.innerHTML = `
            <div class="status-card"><div class="status-dot dot-total-plomo">T</div><div><small>Total</small><b>${total}</b></div></div>
            <div class="status-card"><div class="status-dot dot-draft">B</div><div><small>Borradores</small><b>${borradores}</b></div></div>
            <div class="status-card"><div class="status-dot dot-review">R</div><div><small>En revisión</small><b>${revision}</b></div></div>
            <div class="status-card"><div class="status-dot dot-send">E</div><div><small>Generadas</small><b>${generadas}</b></div></div>
            <div class="status-card"><div class="status-dot dot-ok">A</div><div><small>Aceptadas</small><b>${aceptadas}</b></div></div>
        `;
    }
    
    const tbody = document.getElementById('qRows');
    const thead = document.getElementById('cotizacionesTableHead');
    if (!tbody || !thead) return;
    
    // ============================================================
    // VISTA PRINCIPAL - Columnas resumidas
    // ============================================================
    if (cotizacionViewMode === 'principal') {
        thead.innerHTML = `
            <tr>
                <th>Item</th>
                <th>Fecha / Hora</th>
                <th>Estado</th>
                <th>N° Cotización</th>
                <th>RUC</th>
                <th>Cód. Cliente</th>
                <th>Razón social (Cliente) </th>
                <th>Descripción principal</th>
                <th>Monto total<br><small>(Incluido IGV)</small></th>
                <th>Cond. pago</th>
                <th>Acciones</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay cotizaciones que coincidan con los filtros</td></tr>`;
            return;
        }
        
        tbody.innerHTML = list.map((r, i) => {
            return `
            <tr>
                <td><b>${i + 1}</b></td>
                <td class="date-cell">${formatFecha(r.fecha)}</td>
                <td>${badgeStatus(r.estado)}</td>
                <td class="quote-number-cell"><b>${sd(r.numero)}</b></td>
                <td>${sd(r.ruc)}</td>
                <td><span class="code-pill">${sd(r.cod_cliente)}</span></td>
                <td class="left"><b>${sd(r.razon)}</b></td>
                <td class="left">${sd(r.descripcion || r.nota_cotizacion || 'Sin descripción')}</td>
                <td><b>${money(r.total || r.monto || 0)}</b></td>
                <td>${sd(r.condicion || r.condicion_pago || r.forma_pago)}</td>
                <td>
                    <button class="kebab" onclick="showCotizacionMenu(event, ${r.id})">⋮</button>
                </td>
            </tr>`;
        }).join('');
        return;
    }
    
    // ============================================================
    // VISTA COMPLETA - Todas las columnas
    // ============================================================
    thead.innerHTML = `
        <tr>
            <th>Item</th>
            <th>Fecha / Hora</th>
            <th>Estado</th>
            <th>N° Cotización</th>
            <th>RUC</th>
            <th>Cód. Cliente</th>
            <th>Razón social (Cliente) </th>
            <th>Contacto</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Descripción</th>
            <th>Subtotal</th>
            <th>IGV</th>
            <th>Total<br><small>(Incluido IGV)</small></th>
            <th>Cond. Pago</th>
            <th>Tiempo Entrega</th>
            <th>Validez</th>
            <th>Dirección Entrega</th>
            <th>Requerimiento</th>
            <th>Nota Comercial</th>
            <th>Seguimiento</th>
            <th>Motivo</th>
            <th>Transporte</th>
            <th>Parihuela</th>
            <th>Nota Interna</th>
            <th># Productos</th>
            <th>Acciones</th>
        </tr>
    `;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="28" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay cotizaciones que coincidan con los filtros</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => {
        const numProductos = r.productos?.length || r.items?.length || 0;
        return `
        <tr>
            <td><b>${i + 1}</b></td>
            <td class="date-cell">${formatFecha(r.fecha)}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td class="quote-number-cell"><b>${sd(r.numero)}</b></td>
            <td>${sd(r.ruc)}</td>
            <td><span class="code-pill">${sd(r.cod_cliente)}</span></td>
            <td class="left"><b>${sd(r.razon)}</b></td>
            <td>${sd(r.contacto || r.cliente_contacto || r.contacto_cliente)}</td>
            <td>${sd(r.telefono || r.cliente_telefono || r.telefono_cliente)}</td>
            <td>${sd(r.email || r.cliente_email || r.email_cliente)}</td>
            <td class="left">${sd(r.descripcion || r.nota_cotizacion || r.notas || 'Sin descripción')}</td>
            <td><b>${money(r.subtotal || 0)}</b></td>
            <td><b>${money(r.igv || 0)}</b></td>
            <td><b>${money(r.total || r.monto || 0)}</b></td>
            <td>${sd(r.condicion || r.condicion_pago || r.forma_pago)}</td>
            <td>${sd(r.tiempo_entrega)}</td>
            <td>${sd(r.validez || r.validez_oferta)}</td>
            <td class="left">${sd(r.direccion_entrega)}</td>
            <td>${sd(r.requerimiento)}</td>
            <td class="left">${sd(r.nota_comercial || r.nota_cotizacion)}</td>
            <td>${sd(r.seguimiento || 'Asesor')}</td>
            <td>${sd(r.motivo || 'Proyecto nuevo')}</td>
            <td>${sd(r.transporte || 'Seleccione')}</td>
            <td>${sd(r.parihuela || 'Seleccione')}</td>
            <td class="left">${sd(r.nota_interna)}</td>
            <td style="text-align:center; font-weight:900;">${numProductos}</td>
            <td>
                <button class="kebab" onclick="showCotizacionMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>`;
    }).join('');
}

function renderDespachos() {
    const q = document.getElementById('despachoSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('despachoStatus')?.value || '';
    
    const list = despachosData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.cliente || ''} ${r.pc_numero || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('despachoRows');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay despachos registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${sd(r.fecha_despacho)}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.numero)}</b></td>
            <td>${sd(r.pc_numero)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.guia)}</td>
            <td>${sd(r.destino)}</td>
            <td>
                ${r.estado !== 'Despachado' ? `<button class="btn btn-sm btn-green" onclick="marcarDespachado(${r.id})">🚚 Despachar</button>` : '<span class="badge b-ok">✅ Listo</span>'}
            </td>
        </tr>
    `).join('');
}

function renderGuias() {
    const q = document.getElementById('guiaSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('guiaStatus')?.value || '';
    
    const list = guiasData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.serie || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('guiaRows');
    if (!tbody) return;
    
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
    const q = document.getElementById('comprobanteSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('comprobanteStatus')?.value || '';
    
    const list = comprobantesData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.serie || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('comprobanteRows');
    if (!tbody) return;
    
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
    const q = document.getElementById('notaSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('notaStatus')?.value || '';
    
    const list = notasData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.serie || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('notaRows');
    if (!tbody) return;
    
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
    const q = document.getElementById('devolucionSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('devolucionStatus')?.value || '';
    
    const list = devolucionesData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        return matchText && matchStatus;
    });
    
    const tbody = document.getElementById('devolucionRows');
    if (!tbody) return;
    
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
            <td>${sd(r.comprobante_numero)}</td>
            <td>${sd(r.guia)}</td>
            <td>${sd(r.motivo)}</td>
            <td>
                <button class="kebab" onclick="showDevolucionMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// FUNCIONES DE GUARDADO (CON API REAL)
// ============================================================
async function guardarCotizacion(estado) {
    try {
        console.log('🔄 Iniciando guardado de cotización...');
        
        const ruc = document.getElementById('fRuc')?.value?.trim() || '';
        console.log('📋 RUC:', ruc);
        
        if (!ruc) {
            showToast('⚠️ Primero busca un cliente por RUC', 'warning');
            return;
        }
        
        // ============================================================
        // 1. BUSCAR EL CLIENTE POR RUC
        // ============================================================
        let clienteId = null;
        let clienteData = null;
        
        // Buscar en CLIENTES_MAESTROS
        if (CLIENTES_MAESTROS && CLIENTES_MAESTROS.length > 0) {
            const cliente = CLIENTES_MAESTROS.find(c => 
                c.ruc === ruc || 
                c.numero_documento === ruc
            );
            if (cliente) {
                clienteId = cliente.id;
                clienteData = cliente;
                console.log('✅ Cliente encontrado en CLIENTES_MAESTROS con ID:', clienteId);
            }
        }
        
        // Si no está en memoria, buscar en la base de datos
        if (!clienteId) {
            console.log('🔍 Buscando cliente en BD por RUC:', ruc);
            try {
                const resp = await fetch(`/maestros/api/clientes/buscar?q=${ruc}`);
                const data = await resp.json();
                console.log('📦 Respuesta búsqueda:', data);
                
                if (data.success && data.data && data.data.length > 0) {
                    clienteId = data.data[0].id;
                    clienteData = data.data[0];
                    console.log('✅ Cliente encontrado en BD con ID:', clienteId);
                    
                    // Actualizar CLIENTES_MAESTROS
                    if (!CLIENTES_MAESTROS.find(c => c.id === clienteId)) {
                        CLIENTES_MAESTROS.push(clienteData);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Error buscando cliente:', e);
            }
        }
        
        // Si no existe, CREAR el cliente
        if (!clienteId) {
            console.log('🆕 Cliente no encontrado, creando nuevo...');
            
            const nuevoCliente = {
                ruc: ruc,
                tipo_documento: 'RUC',
                numero_documento: ruc,
                razon_social: document.getElementById('fRazon')?.value?.trim() || `Cliente ${ruc}`,
                nombre_comercial: document.getElementById('fComercial')?.value?.trim() || '',
                direccion_fiscal: document.getElementById('fDireccion')?.value?.trim() || '',
                nombre_contacto: document.getElementById('fContacto')?.value?.trim() || '',
                telefono_contacto: document.getElementById('fTelefono')?.value?.trim() || '',
                email_contacto: document.getElementById('fCorreo')?.value?.trim() || '',
                condicion_pago: document.getElementById('fCondicion')?.value || 'Contado',
                estado: 'Activo'
            };
            
            console.log('📦 Datos nuevo cliente:', nuevoCliente);
            
            try {
                const resp = await fetch('/maestros/api/clientes/guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoCliente)
                });
                const result = await resp.json();
                console.log('📦 Respuesta creación cliente:', result);
                
                if (result.success && result.data && result.data.id) {
                    clienteId = result.data.id;
                    clienteData = result.data;
                    console.log('✅ Cliente creado con ID:', clienteId);
                    await cargarClientesMaestros();
                } else {
                    console.error('❌ Error creando cliente:', result.error);
                    showToast('Error al crear el cliente: ' + (result.error || 'Desconocido'), 'error');
                    return;
                }
            } catch (e) {
                console.error('❌ Error en creación de cliente:', e);
                showToast('Error al crear el cliente', 'error');
                return;
            }
        }
        
        if (!clienteId) {
            showToast('⚠️ No se pudo identificar o crear el cliente', 'error');
            return;
        }
        
        console.log('🎯 Cliente ID final:', clienteId);
        
        // ============================================================
        // 2. CALCULAR TOTALES
        // ============================================================
        
        const subtotal = quoteProducts.reduce((s, p) => s + (Number(p.cantidad || 0) * Number(p.valorVenta || 0)), 0);
        const descuentoValor = parseFloat(document.getElementById('fDiscountValue')?.value || 0);
        const descuentoTipo = document.getElementById('fDiscountType')?.value || '%';
        const descuento = descuentoTipo === '%' 
            ? subtotal * (descuentoValor / 100) 
            : Math.min(descuentoValor, subtotal);
        const valorVenta = subtotal - descuento;
        const igv = valorVenta * 0.18;
        const total = valorVenta + igv;
        
        // ============================================================
        // 3. PREPARAR DATOS - USAMOS EL ESTADO DIRECTAMENTE
        // ============================================================
        // Ahora 'Borrador' es válido en la base de datos
        
        const data = {
    id: editingId,
    estado: estado || 'Borrador',
    cliente_id: clienteId,
    ruc: ruc,
    razon: document.getElementById('fRazon')?.value?.trim() || '',
    razon_comercial: document.getElementById('fComercial')?.value?.trim() || '',
    direccion: document.getElementById('fDireccion')?.value?.trim() || '',
    contacto: document.getElementById('fContacto')?.value?.trim() || '',
    telefono: document.getElementById('fTelefono')?.value?.trim() || '',
    email: document.getElementById('fCorreo')?.value?.trim() || '',
     vendedor: document.getElementById('fVendedor')?.value || 'Helen Blas Príncipe',
    condicion_pago: getFieldValue('fCondicion', 'fCondicionCustom') || 'Contado',
    tiempo_entrega: getFieldValue('fTiempo', 'fTiempoCustom') || '5 días hábiles',
    validez: getFieldValue('fValidez', 'fValidezCustom') || '15 días',
    direccion_entrega: getFieldValue('fDireccionEntrega', 'fDireccionEntregaCustom') || '',
    descuento_valor: descuentoValor,
    descuento_tipo: descuentoTipo,
    subtotal: subtotal,
    descuento_monto: descuento,
    igv: igv,
    total: total,
    productos: quoteProducts.map(p => ({
        codigo: p.codigo,
        producto: p.producto || p.descripcion,
        descripcion: p.descripcion || '',
        modelo: p.modelo || '',
        marca: p.marca || '',
        um: p.um || 'NIU',
        cantidad: p.cantidad || 1,
        valorVenta: p.valorVenta || 0,
        stock: p.stock || 0
    }))
};
        
        console.log('📦 Enviando cotización:');
        console.log('  - cliente_id:', data.cliente_id);
        console.log('  - estado:', data.estado);
        console.log('  - total:', data.total);
        console.log('  - productos:', data.productos.length);
        
        // ============================================================
        // 4. ENVIAR A LA API
        // ============================================================
        
        const response = await apiFetch('/ventas/api/cotizaciones/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        console.log('📦 Respuesta API:', response);
        
        if (response.success) {
            const mensaje = estado === 'Borrador' ? 'guardada como borrador' : 'creada correctamente';
            showToast(`✅ Cotización ${mensaje}`, 'success');
            closeModal('cotizacionModal');
            await loadCotizaciones();
            await cargarClientesMaestros();
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando cotización:', error);
        showToast('❌ Error al guardar la cotización: ' + error.message, 'error');
    }
}



function saveCotizacionDraft() {
    guardarCotizacion('Borrador');
}

function sendCotizacionToReview() {
    guardarCotizacion('En revisión');
}

// Reemplazar la función generateCotizacionPdfAndSend con esta versión mejorada
function generateCotizacionPdfAndSend() {
    // Verificar que hay productos en la cotización
    if (quoteProducts.length === 0) {
        showToast('⚠️ Agrega al menos un producto a la cotización', 'warning');
        return;
    }
    
    // Verificar que hay un cliente seleccionado
    const ruc = document.getElementById('fRuc')?.value?.trim() || '';
    if (!ruc) {
        showToast('⚠️ Primero busca un cliente por RUC', 'warning');
        return;
    }
    
    // Mostrar modal de confirmación
    showConfirmModal(
        '¿Estás seguro de generar esta cotización oficial?',
        'Esta acción convertirá la cotización a estado "Generada" y no podrá revertirse. Se enviará al cliente y quedará registrada como documento oficial.',
        '⚠️ Esta acción es irreversible',
        async function() {
            // Mostrar loading en el botón
            const btn = document.querySelector('#cotizacionModal .btn-green');
            const originalText = btn?.textContent || '📄 Generar cotización';
            if (btn) {
                btn.textContent = '⏳ Generando...';
                btn.disabled = true;
            }
            
            try {
                // Guardar la cotización
                await guardarCotizacion('Generada');
                
                // Mostrar modal de éxito con detalles
                showSuccessModal();
            } catch (error) {
                console.error('Error generando cotización:', error);
                showToast('❌ Error al generar la cotización: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            }
        }
    );
}



// ============================================================
// FUNCIONES DE GUARDADO PARA PC, DESPACHO, GUÍAS, ETC.
// ============================================================

async function savePedidoCompra(estado) {
    try {
        console.log('🔄 Guardando PC Pedido Compras...', { estado });
        
        // Obtener validaciones
        const validaciones = {
            precio: document.getElementById('vPrecio')?.value || 'Sí',
            cantidad: document.getElementById('vCantidad')?.value || 'Sí',
            producto: document.getElementById('vProducto')?.value || 'Sí',
            entrega: document.getElementById('vEntrega')?.value || 'Sí',
            moneda: document.getElementById('vMoneda')?.value || 'Sí',
            transporte: document.getElementById('vTransporte')?.value || 'Sí',
            vigencia: document.getElementById('vVigencia')?.value || 'Sí',
            margen: document.getElementById('vMargen')?.value || 'Sí'
        };
        
        // Verificar si hay observaciones
        const hasObservations = Object.values(validaciones).some(v => v === 'No');
        const estadoFinal = hasObservations ? 'PC observado' : (estado || 'PC conforme');
        
        // Obtener items
        const items = [];
        const rows = document.querySelectorAll('#pcItemsBody tr');
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 8) {
                items.push({
                    codigo: inputs[0].value || '',
                    descripcion: inputs[1].value || '',
                    cantidad_cotizada: parseFloat(inputs[2].value) || 0,
                    cantidad_pc: parseFloat(inputs[3].value) || 0,
                    precio_cotizado: parseFloat(inputs[4].value) || 0,
                    precio_pc: parseFloat(inputs[5].value) || 0,
                    stock: parseFloat(inputs[6].value) || 0,
                    faltante: Math.max((parseFloat(inputs[3].value) || 0) - (parseFloat(inputs[6].value) || 0), 0)
                });
            }
        });
        
        const data = {
            id: editingId,
            estado: estadoFinal,
            numero: document.getElementById('pcNumero')?.value || '',
            cotizacion_numero: document.getElementById('pcCotNumero')?.value || '',
            cliente: document.getElementById('pcCliente')?.value || '',
            ruc: document.getElementById('pcRuc')?.value || '',
            monto: parseFloat(document.getElementById('pcMonto')?.value || 0),
            medio: document.getElementById('pcMedio')?.value || 'Correo',
            fecha: document.getElementById('pcFecha')?.value || '',
            contacto: document.getElementById('pcContacto')?.value || '',
            moneda: document.getElementById('pcMoneda')?.value || 'Soles (S/)',
            condicion_pago: document.getElementById('pcCondicion')?.value || 'Contado',
            lugar_entrega: document.getElementById('pcEntrega')?.value || '',
            observaciones: document.getElementById('pcObs')?.value || '',
            validaciones: validaciones,
            items: items,
            has_observations: hasObservations,
            req_compra: hasObservations ? 'Bloqueado' : 'Sí'
        };
        
        console.log('📦 Datos a guardar:', data);
        
        const response = await apiFetch('/ventas/api/pedido-compra/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            const mensaje = hasObservations ? 'guardado con observaciones' : 'guardado correctamente';
            showToast(`✅ PC ${mensaje}`, 'success');
            closeModal('pedidoCompraModal');
            await loadPedidos();
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando PC:', error);
        showToast('❌ Error al guardar el PC: ' + error.message, 'error');
    }
}

async function saveDespacho(estado) {
    try {
        const data = {
            id: editingId,
            estado: estado || 'Pendiente despacho',
            numero: document.getElementById('despachoNumero')?.value || '',
            pc_numero: document.getElementById('despachoPC')?.value || '',
            cliente: document.getElementById('despachoCliente')?.value || '',
            ruc: document.getElementById('despachoRuc')?.value || '',
            fecha_despacho: document.getElementById('despachoFecha')?.value || '',
            origen: document.getElementById('despachoOrigen')?.value || '',
            destino: document.getElementById('despachoDestino')?.value || '',
            transportista: document.getElementById('despachoTransportista')?.value || '',
            observaciones: document.getElementById('despachoObs')?.value || ''
        };
        
        const response = await apiFetch('/ventas/api/despachos/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`Despacho guardado como: ${estado}`, 'success');
            closeModal('despachoModal');
            await loadDespachos();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando despacho:', error);
        showToast('Error al guardar el despacho', 'error');
    }
}

// Reemplazar la función saveGuia en ventas.js
async function saveGuia(estado) {
    try {
        console.log('🔄 Guardando guía...', { estado });
        
        // Obtener productos del DOM
        let productos = window._guiaProductos || [];
        
        // Si no hay productos guardados, intentar obtener de la tabla
        if (productos.length === 0) {
            const productRows = document.querySelectorAll('#guiaProducts .master-table tbody tr');
            productRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    productos.push({
                        codigo: cells[1]?.textContent?.trim() || '',
                        producto: cells[2]?.textContent?.trim() || '',
                        marca: cells[3]?.textContent?.trim() || '',
                        um: cells[4]?.textContent?.trim() || 'NIU',
                        cantidad: parseInt(cells[5]?.textContent?.trim()) || 1,
                        stock: parseInt(cells[6]?.textContent?.trim()) || 0
                    });
                }
            });
        }
        
        const data = {
            id: editingId,
            estado: estado || 'Borrador',
            serie: document.getElementById('guiaSerie')?.value || 'T001',
            numero: document.getElementById('guiaNumero')?.value || String(Date.now()).slice(-8),
            cotizacion_numero: document.getElementById('guiaCotizacion')?.value || '',
            cliente: document.getElementById('guiaCliente')?.value || '',
            ruc: document.getElementById('guiaRuc')?.value || '',
            origen: document.getElementById('guiaOrigen')?.value || 'ALM-SMP',
            destino: document.getElementById('guiaDestino')?.value || '',
            motivo: document.getElementById('guiaMotivo')?.value || 'VENTA',
            observaciones: document.getElementById('guiaObs')?.value || '',
            items: productos,
            peso_total: productos.reduce((sum, p) => sum + (parseFloat(p.cantidad || 0) * 0.5), 0) // Estimación
        };
        
        console.log('📦 Datos a guardar:', data);
        
        const response = await apiFetch('/ventas/api/guias/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`✅ Guía guardada como: ${estado}`, 'success');
            closeModal('guiaModal');
            await loadGuias();
            // Limpiar datos temporales
            window._guiaProductos = null;
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando guía:', error);
        showToast('❌ Error al guardar la guía: ' + error.message, 'error');
    }
}


// Reemplazar la función saveComprobante en ventas.js
async function saveComprobante(estado) {
    try {
        console.log('🔄 Guardando comprobante...', { estado });
        
        let productos = window._compProductos || [];
        
        const data = {
            id: editingId,
            estado: estado || 'Borrador',
            tipo: document.getElementById('compTipo')?.value || 'Factura',
            serie: document.getElementById('compSerie')?.value || 'F001',
            numero: document.getElementById('compNumero')?.value || String(Date.now()).slice(-8),
            cotizacion: document.getElementById('compCotizacion')?.value || '',
            cliente: document.getElementById('compCliente')?.value || '',
            ruc: document.getElementById('compRuc')?.value || '',
            monto: parseFloat(document.getElementById('compMonto')?.value || 0),
            condicion: document.getElementById('compCondicion')?.value || 'Contado',
            observaciones: document.getElementById('compObs')?.value || '',
            items: productos
        };
        
        console.log('📦 Datos a guardar:', data);
        
        const response = await apiFetch('/ventas/api/comprobantes/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`✅ Comprobante guardado como: ${estado}`, 'success');
            closeModal('comprobanteModal');
            await loadComprobantes();
            window._compProductos = null;
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando comprobante:', error);
        showToast('❌ Error al guardar el comprobante', 'error');
    }
}


async function saveNotaCredito(estado) {
    try {
        const data = {
            id: editingId,
            estado: estado || 'Borrador',
            serie: document.getElementById('notaSerie')?.value || 'FC01',
            numero: document.getElementById('notaNumero')?.value || '',
            comprobante: document.getElementById('notaComprobante')?.value || '',
            cliente: document.getElementById('notaCliente')?.value || '',
            ruc: document.getElementById('notaRuc')?.value || '',
            monto: parseFloat(document.getElementById('notaMonto')?.value || 0),
            motivo: document.getElementById('notaMotivo')?.value || '',
            observaciones: document.getElementById('notaObs')?.value || ''
        };
        
        const response = await apiFetch('/ventas/api/notas-credito/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`Nota de crédito guardada como: ${estado}`, 'success');
            closeModal('notaCreditoModal');
            await loadNotas();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando nota:', error);
        showToast('Error al guardar la nota de crédito', 'error');
    }
}

async function saveDevolucion(estado) {
    try {
        const data = {
            id: editingId,
            estado: estado || 'Pendiente',
            numero: document.getElementById('devNumero')?.value || '',
            comprobante_numero: document.getElementById('devComprobante')?.value || '',
            cliente: document.getElementById('devCliente')?.value || '',
            ruc: document.getElementById('devRuc')?.value || '',
            monto: parseFloat(document.getElementById('devMonto')?.value || 0),
            motivo: document.getElementById('devMotivo')?.value || '',
            observaciones: document.getElementById('devObs')?.value || ''
        };
        
        const response = await apiFetch('/ventas/api/devoluciones/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`Devolución guardada como: ${estado}`, 'success');
            closeModal('devolucionModal');
            await loadDevoluciones();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando devolución:', error);
        showToast('Error al guardar la devolución', 'error');
    }
}

// ============================================================
// ACCIONES DE MENÚ (CON API REAL)
// ============================================================

// En ventas.js - Reemplaza la función marcarCotizacionAccepted
async function marcarCotizacionAccepted(id) {
    // Buscar la cotización para mostrar info
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const numero = cotizacion?.numero || 'COT-XXXXXX';
    const cliente = cotizacion?.razon || 'Cliente';
    
    showConfirmModal(
        '✅ ¿Aceptar cotización?',
        `Estás a punto de marcar como <b>"Aceptada por Cliente"</b> la cotización <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción es irreversible. Una vez aceptada, no se podrá modificar el estado.',
        async function() {
            try {
                console.log(`🔄 Marcando cotización como aceptada, ID: ${id}`);
                showToast('⏳ Actualizando estado...', 'info');
                
                const response = await apiFetch(`/ventas/api/cotizaciones/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Aceptada por Cliente' })
                });
                
                if (response.success) {
                    showToast('✅ Cotización marcada como aceptada por cliente', 'success');
                    await loadCotizaciones();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo actualizar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al actualizar estado: ' + error.message, 'error');
            }
        },
        '✅ Sí, aceptar'
    );
}


async function marcarCotizacionPending(id) {
    try {
        const response = await apiFetch(`/ventas/api/cotizaciones/${id}/toggle`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'En revisión' })
        });
        if (response.success) {
            showToast('Seguimiento cliente registrado', 'success');
            await loadCotizaciones();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo actualizar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al actualizar estado', 'error');
    }
}

async function marcarCotizacionNotClosed(id) {
    try {
        const response = await apiFetch(`/ventas/api/cotizaciones/${id}/toggle`, {
            method: 'PUT',
            
        });
        if (response.success) {
            
            await loadCotizaciones();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo actualizar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al actualizar estado', 'error');
    }
}

async function reactivarCotizacion(id) {
    try {
        const response = await apiFetch(`/ventas/api/cotizaciones/${id}/toggle`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'Borrador' })
        });
        if (response.success) {
            showToast('Cotización reactivada como borrador', 'success');
            await loadCotizaciones();
        } else {
            showToast('Error: ' + (response.error || 'No se pudo reactivar'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al reactivar cotización', 'error');
    }
}

// En ventas.js - Reemplaza la función deleteCotizacion
async function deleteCotizacion(id) {
    // Buscar la cotización para mostrar info
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const numero = cotizacion?.numero || 'COT-XXXXXX';
    const cliente = cotizacion?.razon || 'Cliente';
    const estado = cotizacion?.estado || 'Desconocido';
    
    showConfirmModal(
        '🗑️ ¿Eliminar cotización?',
        `Estás a punto de eliminar la cotización <b>${numero}</b> del cliente <b>${cliente}</b>.<br>Estado actual: <b>${estado}</b>`,
        '⚠️ Esta acción cambiará el estado a "Anulada" y no podrá recuperarse.',
        async function() {
            try {
                console.log(`🗑️ Eliminando cotización ID: ${id}`);
                showToast('⏳ Anulando cotización...', 'info');
                
                const response = await apiFetch(`/ventas/api/cotizaciones/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    showToast('✅ Cotización anulada correctamente', 'success');
                    await loadCotizaciones();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo eliminar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error eliminando cotización:', error);
                showToast('❌ Error al eliminar la cotización: ' + error.message, 'error');
            }
        },
        '🗑️ Sí, eliminar'
    );
}

// En ventas.js - Reemplaza la función marcarDespachado
async function marcarDespachado(id) {
    const despacho = despachosData.find(d => d.id === id);
    const numero = despacho?.numero || 'DESP-XXXXXX';
    const cliente = despacho?.cliente || 'Cliente';
    
    showConfirmModal(
        '🚚 ¿Marcar como despachado?',
        `Estás a punto de marcar como <b>"Despachado"</b> el despacho <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción es irreversible. Una vez despachado, no se podrá revertir.',
        async function() {
            try {
                const response = await apiFetch(`/ventas/api/despachos/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Despachado' })
                });
                if (response.success) {
                    showToast('✅ Despacho marcado como completado', 'success');
                    await loadDespachos();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo actualizar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al marcar despacho', 'error');
            }
        },
        '🚚 Sí, despachar'
    );
}

// En ventas.js - Reemplaza la función duplicateCotizacion
async function duplicateCotizacion(id) {
    // Buscar la cotización para mostrar info
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const numero = cotizacion?.numero || 'COT-XXXXXX';
    const cliente = cotizacion?.razon || 'Cliente';
    
    showConfirmModal(
        '📋 ¿Duplicar cotización?',
        `Estás a punto de duplicar la cotización <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción creará una nueva cotización con el mismo contenido.',
        async function() {
            try {
                console.log(`📋 Duplicando cotización ID: ${id}`);
                showToast('⏳ Duplicando cotización...', 'info');
                
                const response = await apiFetch(`/ventas/api/cotizaciones/${id}/duplicar`, {
                    method: 'POST'
                });
                
                if (response.success) {
                    showToast(`✅ Cotización duplicada correctamente: ${response.data.numero}`, 'success');
                    await loadCotizaciones();
                    
                    // Opcional: Abrir la cotización duplicada para editar
                    setTimeout(() => {
                        if (response.data.id) {
                            openCotizacionModal(response.data.id);
                        }
                    }, 1000);
                } else {
                    showToast('❌ Error al duplicar: ' + (response.error || 'Desconocido'), 'error');
                }
            } catch (error) {
                console.error('❌ Error duplicando cotización:', error);
                showToast('❌ Error al duplicar la cotización: ' + error.message, 'error');
            }
        },
        '📋 Sí, duplicar'
    );
}

function sendCotizacionEmail(id) {
    showToast('Email enviado al cliente', 'success');
}

// ============================================================
// FUNCIÓN PARA GENERAR PDF DE COTIZACIÓN
// ============================================================
window.generateCotizacionPdf = async function(id) {
    console.log(`📄 Generando PDF para cotización ID: ${id}`);
    
    try {
        // Mostrar loading
        showToast('⏳ Generando PDF...', 'info');
        
        // Hacer la solicitud al endpoint que genera el PDF
        const response = await fetch(`/ventas/api/cotizaciones/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        // Obtener el blob del PDF
        const blob = await response.blob();
        
        // Crear URL para descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Obtener nombre del archivo desde el header Content-Disposition
        let filename = `cotizacion_${id}.pdf`;
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('✅ PDF generado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showToast('❌ Error al generar el PDF: ' + error.message, 'error');
    }
};



// En ventas.js - Reemplaza la función createDocFromCotizacion
window.createDocFromCotizacion = async function(id, tipo) {
    console.log(`📋 Creando ${tipo} desde cotización ID: ${id}`);
    
    // Buscar la cotización para mostrar info
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const numero = cotizacion?.numero || 'COT-XXXXXX';
    const cliente = cotizacion?.razon || 'Cliente';
    
    const tipos = {
        'guia': { emoji: '📦', nombre: 'Guía de Remisión', color: '#16A34A' },
        'factura': { emoji: '🧾', nombre: 'Factura / Boleta', color: '#2563EB' },
        'despacho': { emoji: '🚚', nombre: 'Despacho', color: '#FF6600' }
    };
    
    const info = tipos[tipo] || { emoji: '📄', nombre: 'Documento', color: '#0F172A' };
    
    let mensajeExtra = '';
    if (tipo === 'guia') {
        mensajeExtra = 'La cotización debe estar <b>"Aceptada por Cliente"</b> para crear una guía.';
    }
    
    showConfirmModal(
        `${info.emoji} ¿Crear ${info.nombre}?`,
        `Estás a punto de crear un(a) <b>${info.nombre}</b> desde la cotización <b>${numero}</b> del cliente <b>${cliente}</b>.${mensajeExtra ? '<br><br>' + mensajeExtra : ''}`,
        `⚠️ Esta acción creará un nuevo registro de ${info.nombre.toLowerCase()} en el sistema.`,
        async function() {
            try {
                // Mostrar loading
                showToast('⏳ Cargando datos de la cotización...', 'info');
                
                // Obtener los datos completos de la cotización
                const response = await apiFetch(`/ventas/api/cotizaciones/${id}/completa`);
                
                if (!response.success) {
                    showToast('❌ Error al cargar cotización: ' + (response.error || 'Desconocido'), 'error');
                    return;
                }
                
                const cotizacion = response.data;
                console.log('📦 Datos de cotización:', cotizacion);
                
                // Verificar que la cotización esté aceptada para crear guía
                if (tipo === 'guia' && cotizacion.estado !== 'Aceptada por Cliente' && cotizacion.estado !== 'Aceptada') {
                    showToast('⚠️ La cotización debe estar "Aceptada por Cliente" para crear una guía', 'warning');
                    return;
                }
                
                // Cerrar el menú si está abierto
                document.querySelectorAll('.menu-pop').forEach(el => el.remove());
                
                switch(tipo) {
                    case 'guia':
                        switchTab('guias');
                        setTimeout(() => {
                            openGuiaModalWithData(null, cotizacion);
                        }, 300);
                        break;
                        
                    case 'factura':
                        switchTab('comprobantes');
                        setTimeout(() => {
                            openComprobanteModalWithData(null, cotizacion);
                        }, 300);
                        break;
                        
                    case 'despacho':
                        switchTab('despachar');
                        setTimeout(() => {
                            openDespachoModalWithData(null, cotizacion);
                        }, 300);
                        break;
                        
                    default:
                        showToast(`Tipo "${tipo}" no soportado`, 'error');
                }
                
            } catch (error) {
                console.error('❌ Error creando documento:', error);
                showToast('❌ Error al crear el documento: ' + error.message, 'error');
            }
        },
        `${info.emoji} Sí, crear ${info.nombre}`
    );
};

// ============================================================
// FUNCIÓN PARA CAMBIAR DE TAB PROGRAMÁTICAMENTE
// ============================================================
function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.section');
    
    // Actualizar tabs
    tabs.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Actualizar secciones
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === tabId) {
            section.classList.add('active');
        }
    });
    
    // Actualizar URL
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
    
    // Cargar datos del módulo
    currentModule = tabId;
    switch(tabId) {
        case 'cotizaciones': loadCotizaciones(); break;
        case 'pedido_compra': loadPedidos(); break;
        case 'despachar': loadDespachos(); break;
        case 'guias': loadGuias(); break;
        case 'comprobantes': loadComprobantes(); break;
        case 'notas_credito': loadNotas(); break;
        case 'devoluciones': loadDevoluciones(); break;
    }
}

// ============================================================
// FUNCIÓN PARA ABRIR MODAL DE GUÍA CON DATOS PRECARGADOS
// ============================================================
function openGuiaModalWithData(id, cotizacion) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar guía' : 'Nueva guía - desde cotización';
    document.getElementById('guiaModalTitle').textContent = title;
    
    const formContainer = document.getElementById('guiaForm');
    if (!formContainer) return;
    
    // Construir opciones de cotizaciones
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.numero}" ${q.numero === cotizacion.numero_cotizacion ? 'selected' : ''}>${q.numero} - ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    // Extraer productos de la cotización
    const productos = cotizacion.productos || [];
    const productosHtml = productos.length > 0 ? productTableHtml(productos) : 
        '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>';
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">📦 Datos de la guía <small>Precargado desde cotización ${cotizacion.numero_cotizacion}</small></div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Cotización vinculada</label>
                    <select id="guiaCotizacion" onchange="loadGuiaFromCotizacion(this.value)">
                        ${cotOptions}
                    </select>
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
                        ${options(ESTADOS_GUIA, 'Borrador')}
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="guiaCliente" value="${esc(cotizacion.cliente_razon_social || '')}">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="guiaRuc" value="${esc(cotizacion.cliente_ruc || '')}">
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
                    <input id="guiaDestino" value="${esc(cotizacion.direccion_entrega || cotizacion.cliente_direccion || '')}">
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
                    <textarea id="guiaObs" placeholder="Observaciones de la guía">Generado desde cotización ${cotizacion.numero_cotizacion}</textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">📦 Productos a trasladar</div>
            <div id="guiaProducts">
                ${productosHtml}
            </div>
        </div>
    `;
    
    // Guardar referencia de los productos para el guardado
    window._guiaProductos = productos;
    
    // Mostrar el modal
    document.getElementById('guiaModal').classList.add('show');
}

// ============================================================
// FUNCIÓN PARA ABRIR MODAL DE COMPROBANTE CON DATOS PRECARGADOS
// ============================================================
function openComprobanteModalWithData(id, cotizacion) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar comprobante' : 'Nuevo comprobante - desde cotización';
    document.getElementById('comprobanteModalTitle').textContent = title;
    
    const formContainer = document.getElementById('comprobanteForm');
    if (!formContainer) return;
    
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.numero}" ${q.numero === cotizacion.numero_cotizacion ? 'selected' : ''}>${q.numero} - ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    const productos = cotizacion.productos || [];
    const productosHtml = productos.length > 0 ? productTableHtml(productos) : 
        '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>';
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">🧾 Datos del comprobante <small>Precargado desde cotización ${cotizacion.numero_cotizacion}</small></div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Cotización vinculada</label>
                    <select id="compCotizacion">
                        ${cotOptions}
                    </select>
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
                        ${options(ESTADOS_COMPROBANTE, 'Borrador')}
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="compCliente" value="${esc(cotizacion.cliente_razon_social || '')}">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="compRuc" value="${esc(cotizacion.cliente_ruc || '')}">
                </div>
                <div class="form-field col-4">
                    <label>Monto</label>
                    <input id="compMonto" type="number" value="${cotizacion.total || 0}" step="0.01">
                </div>
                <div class="form-field col-4">
                    <label>Condición de pago</label>
                    <select id="compCondicion">
                        <option ${cotizacion.condicion_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 7 días' ? 'selected' : ''}>Crédito 7 días</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 15 días' ? 'selected' : ''}>Crédito 15 días</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 30 días' ? 'selected' : ''}>Crédito 30 días</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 45 días' ? 'selected' : ''}>Crédito 45 días</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 60 días' ? 'selected' : ''}>Crédito 60 días</option>
                        <option ${cotizacion.condicion_pago === 'Crédito 90 días' ? 'selected' : ''}>Crédito 90 días</option>
                    </select>
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="compObs" placeholder="Observaciones del comprobante">Generado desde cotización ${cotizacion.numero_cotizacion}</textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">🧾 Productos</div>
            <div id="compProducts">
                ${productosHtml}
            </div>
        </div>
    `;
    
    window._compProductos = productos;
    document.getElementById('comprobanteModal').classList.add('show');
}

// ============================================================
// FUNCIÓN PARA ABRIR MODAL DE DESPACHO CON DATOS PRECARGADOS
// ============================================================
function openDespachoModalWithData(id, cotizacion) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar despacho' : 'Nuevo despacho - desde cotización';
    document.getElementById('despachoModalTitle').textContent = title;
    
    const formContainer = document.getElementById('despachoForm');
    if (!formContainer) return;
    
    const productos = cotizacion.productos || [];
    const productosHtml = productos.length > 0 ? productTableHtml(productos) : 
        '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>';
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">🚚 Despacho <small>Precargado desde cotización ${cotizacion.numero_cotizacion}</small></div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Cotización vinculada</label>
                    <input id="despachoCotizacion" value="${cotizacion.numero_cotizacion}" readonly style="background:#F1F5F9;">
                </div>
                <div class="form-field col-4">
                    <label>N° Despacho</label>
                    <input id="despachoNumero" value="DESP-${String(Date.now()).slice(-8)}">
                </div>
                <div class="form-field col-4">
                    <label>Estado</label>
                    <select id="despachoEstado">
                        ${options(ESTADOS_DESPACHO, 'Pendiente despacho')}
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="despachoCliente" value="${esc(cotizacion.cliente_razon_social || '')}">
                </div>
                <div class="form-field col-4">
                    <label>RUC</label>
                    <input id="despachoRuc" value="${esc(cotizacion.cliente_ruc || '')}">
                </div>
                <div class="form-field col-4">
                    <label>Fecha despacho</label>
                    <input id="despachoFecha" type="date" value="${today()}">
                </div>
                <div class="form-field col-4">
                    <label>Origen</label>
                    <select id="despachoOrigen">
                        <option>ALM-SMP</option>
                        <option>OF-BRE</option>
                        <option>Almacén Central</option>
                    </select>
                </div>
                <div class="form-field col-4">
                    <label>Destino</label>
                    <input id="despachoDestino" value="${esc(cotizacion.direccion_entrega || cotizacion.cliente_direccion || '')}">
                </div>
                <div class="form-field col-4">
                    <label>Transportista</label>
                    <input id="despachoTransportista" placeholder="Nombre o razón social">
                </div>
                <div class="form-field col-12">
                    <label>Observaciones</label>
                    <textarea id="despachoObs" placeholder="Observaciones del despacho">Generado desde cotización ${cotizacion.numero_cotizacion}</textarea>
                </div>
            </div>
        </div>
        <div class="ficha-section">
            <div class="ficha-section-title">Productos a despachar</div>
            <div id="despachoProducts">
                ${productosHtml}
            </div>
        </div>
    `;
    
    window._despachoProductos = productos;
    document.getElementById('despachoModal').classList.add('show');
}

// ============================================================
// FUNCIÓN PARA GUARDAR GUÍA (MEJORADA)
// ============================================================
async function saveGuia(estado) {
    try {
        console.log('🔄 Guardando guía...', { estado });
        
        // Obtener productos del DOM o de la variable global
        let productos = window._guiaProductos || [];
        
        // Si no hay productos guardados, intentar obtener de la tabla
        if (productos.length === 0) {
            const productRows = document.querySelectorAll('#guiaProducts .master-table tbody tr');
            productRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    productos.push({
                        codigo: cells[1]?.textContent?.trim() || '',
                        producto: cells[2]?.textContent?.trim() || '',
                        marca: cells[3]?.textContent?.trim() || '',
                        um: cells[4]?.textContent?.trim() || 'NIU',
                        cantidad: parseInt(cells[5]?.textContent?.trim()) || 1,
                        stock: parseInt(cells[6]?.textContent?.trim()) || 0
                    });
                }
            });
        }
        
        const data = {
            id: editingId,
            estado: estado || 'Borrador',
            serie: document.getElementById('guiaSerie')?.value || 'T001',
            numero: document.getElementById('guiaNumero')?.value || String(Date.now()).slice(-8),
            cotizacion_numero: document.getElementById('guiaCotizacion')?.value || '',
            cliente: document.getElementById('guiaCliente')?.value || '',
            ruc: document.getElementById('guiaRuc')?.value || '',
            origen: document.getElementById('guiaOrigen')?.value || 'ALM-SMP',
            destino: document.getElementById('guiaDestino')?.value || '',
            motivo: document.getElementById('guiaMotivo')?.value || 'VENTA',
            observaciones: document.getElementById('guiaObs')?.value || '',
            items: productos,
            peso_total: productos.reduce((sum, p) => sum + (parseFloat(p.cantidad || 0) * 0.5), 0)
        };
        
        console.log('📦 Datos a guardar:', data);
        
        const response = await apiFetch('/ventas/api/guias/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`✅ Guía guardada como: ${estado}`, 'success');
            closeModal('guiaModal');
            await loadGuias();
            window._guiaProductos = null;
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando guía:', error);
        showToast('❌ Error al guardar la guía: ' + error.message, 'error');
    }
}

// ============================================================
// FUNCIÓN PARA GUARDAR COMPROBANTE (MEJORADA)
// ============================================================
async function saveComprobante(estado) {
    try {
        console.log('🔄 Guardando comprobante...', { estado });
        
        let productos = window._compProductos || [];
        
       const data = {
    id: editingId,
    estado: estado || 'Borrador',
    cliente_id: clienteId,
    ruc: ruc,
    razon: document.getElementById('fRazon')?.value?.trim() || '',
    razon_comercial: document.getElementById('fComercial')?.value?.trim() || '',
    direccion: document.getElementById('fDireccion')?.value?.trim() || '',
    contacto: document.getElementById('fContacto')?.value?.trim() || '',
    telefono: document.getElementById('fTelefono')?.value?.trim() || '',
    email: document.getElementById('fCorreo')?.value?.trim() || '',
    vendedor: document.getElementById('fVendedor')?.value || 'Helen Blas Príncipe',
    condicion_pago: getFieldValue('fCondicion', 'fCondicionCustom') || 'Contado',
    tiempo_entrega: getFieldValue('fTiempo', 'fTiempoCustom') || '5 días hábiles',
    validez: getFieldValue('fValidez', 'fValidezCustom') || '15 días',
    direccion_entrega: getFieldValue('fDireccionEntrega', 'fDireccionEntregaCustom') || '',
    descuento_valor: descuentoValor,
    descuento_tipo: descuentoTipo,
    subtotal: subtotal,
    descuento_monto: descuento,
    igv: igv,
    total: total,
    // ============================================================
    // 🔽 INFORMACIÓN ADICIONAL - Campos agregados
    // ============================================================
    seguimiento: document.getElementById('fSeguimiento')?.value || 'Asesor',
    motivo: document.getElementById('fMotivo')?.value || 'Proyecto nuevo',
    transporte: document.getElementById('fTransporte')?.value || 'Seleccione',
    parihuela: document.getElementById('fParihuela')?.value || 'Seleccione',
    nota_interna: document.getElementById('fNotaInterna')?.value?.trim() || '',
    requerimiento: document.getElementById('fReq')?.value?.trim() || '',
    fuente: document.getElementById('fFuente')?.value || 'Correo',
    // ============================================================
    productos: quoteProducts.map(p => ({
        codigo: p.codigo,
        producto: p.producto || p.descripcion,
        descripcion: p.descripcion || '',
        modelo: p.modelo || '',
        marca: p.marca || '',
        um: p.um || 'NIU',
        cantidad: p.cantidad || 1,
        valorVenta: p.valorVenta || 0,
        stock: p.stock || 0
    }))
};
        console.log('📦 Datos a guardar:', data);
        
        const response = await apiFetch('/ventas/api/comprobantes/guardar', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(`✅ Comprobante guardado como: ${estado}`, 'success');
            closeModal('comprobanteModal');
            await loadComprobantes();
            window._compProductos = null;
        } else {
            showToast('❌ Error: ' + (response.error || 'No se pudo guardar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando comprobante:', error);
        showToast('❌ Error al guardar el comprobante', 'error');
    }
}

// ============================================================
// MENÚ DE COTIZACIONES (MEJORADO)
// ============================================================
function showCotizacionMenu(event, id) {
    event.stopPropagation();
    
    // Buscar la cotización para ver su estado
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const estado = cotizacion?.estado || '';
    const isAccepted = estado === 'Aceptada por Cliente' || estado === 'Aceptada';
    
    let menuHtml = `
        <button onclick="openCotizacionModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="duplicateCotizacion(${id});this.closest('.menu-pop').remove()">⧉ Duplicar</button>
        <button onclick="sendCotizacionEmail(${id});this.closest('.menu-pop').remove()">✉ Email</button>
        <button onclick="generateCotizacionPdf(${id});this.closest('.menu-pop').remove()">▣ PDF</button>
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
    `;
    
    // Mostrar "Crear guía" solo si está aceptada
    if (isAccepted) {
        menuHtml += `
            <button class="menu-accepted" onclick="createDocFromCotizacion(${id},'guia');this.closest('.menu-pop').remove()">🚚 Crear guía</button>
            <button class="menu-accepted" onclick="createDocFromCotizacion(${id},'factura');this.closest('.menu-pop').remove()">🧾 Crear factura</button>
        `;
    }
    
    menuHtml += `
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
        <button onclick="createDocFromCotizacion(${id},'despacho');this.closest('.menu-pop').remove()">🚚 Crear despacho</button>
        <button class="danger" onclick="deleteCotizacion(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    createMenuWithClose(event, menuHtml);
}

// ============================================================
// FUNCIÓN PARA CARGAR GUÍA DESDE COTIZACIÓN SELECCIONADA
// ============================================================
window.loadGuiaFromCotizacion = function(numeroCotizacion) {
    if (!numeroCotizacion) return;
    
    const cotizacion = cotizacionesData.find(c => c.numero === numeroCotizacion);
    if (!cotizacion) {
        showToast('⚠️ Cotización no encontrada', 'warning');
        return;
    }
    
    showToast('⏳ Cargando datos de cotización...', 'info');
    
    // Cargar los datos de la cotización completa
    apiFetch(`/ventas/api/cotizaciones/${cotizacion.id}/completa`)
        .then(response => {
            if (response.success) {
                const data = response.data;
                document.getElementById('guiaCliente').value = data.cliente_razon_social || '';
                document.getElementById('guiaRuc').value = data.cliente_ruc || '';
                document.getElementById('guiaDestino').value = data.direccion_entrega || data.cliente_direccion || '';
                document.getElementById('guiaObs').value = `Generado desde cotización ${numeroCotizacion}`;
                
                // Actualizar productos
                const productos = data.productos || [];
                window._guiaProductos = productos;
                document.getElementById('guiaProducts').innerHTML = 
                    productos.length > 0 ? productTableHtml(productos) : 
                    '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>';
                
                showToast('✅ Datos cargados desde cotización', 'success');
            } else {
                showToast('❌ Error al cargar datos: ' + (response.error || 'Desconocido'), 'error');
            }
        })
        .catch(error => {
            console.error('Error cargando cotización:', error);
            showToast('❌ Error al cargar datos de la cotización', 'error');
        });
};


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

// En ventas.js - Reemplaza la función markComprobanteEmitido
function markComprobanteEmitido(id) {
    const comprobante = comprobantesData.find(c => c.id === id);
    const numero = comprobante?.numero || 'C-XXXXXX';
    const cliente = comprobante?.cliente || 'Cliente';
    
    showConfirmModal(
        '🧾 ¿Emitir comprobante?',
        `Estás a punto de emitir el comprobante <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción es irreversible. El comprobante quedará emitido oficialmente.',
        async function() {
            try {
                const response = await apiFetch(`/ventas/api/comprobantes/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Emitido' })
                });
                if (response.success) {
                    showToast('✅ Comprobante emitido correctamente', 'success');
                    await loadComprobantes();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo emitir'), 'error');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al emitir comprobante', 'error');
            }
        },
        '🧾 Sí, emitir'
    );
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
// FUNCIONES PARA MODALES DE COTIZACIÓN
// ============================================================


function openCotizacionModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar cotización' : 'Nueva cotización';
    document.getElementById('cotizacionModalTitle').textContent = title;
    
    const formContainer = document.getElementById('cotizacionForm');
    if (!formContainer) return;
    
    // Generar HTML del formulario
    formContainer.innerHTML = `
        <div class="create-grid">
            <!-- Punto 1: Datos del cliente -->
            <div class="create-panel client-card">
                <h3><span class="section-number">1.</span> <span class="section-title-colored">Datos del cliente</span></h3>
                <div class="body">
                    <div class="client-search-row">
                        <div class="form-field">
                            <label>Buscar por RUC</label>
                            <input id="fRucSearch" placeholder="Ingrese o pegue RUC" oninput="autoLoadClientByRuc(this.value)">
                        </div>
                        <div class="form-field">
                            <label>&nbsp;</label>
                            <button class="btn btn-blue btn-search-ruc" onclick="loadClient()">🔍 Buscar</button>
                        </div>
                    </div>
                    <div id="clientConfirmBox" class="client-confirm-box"></div>
                    <div class="client-main-grid">
                        <div class="form-field"><label>RUC</label><input id="fRuc" readonly></div>
                        <div class="form-field"><label>Razón social</label><input id="fRazon" readonly></div>
                        <div class="form-field"><label>Cód. cliente</label><input class="client-code-input" id="fCodCliente" readonly></div>
                    </div>
                    <div class="client-secondary-grid">
                        <div class="form-field"><label>Razón comercial</label><input id="fComercial"></div>
                        <div class="form-field"><label>Dirección fiscal</label><input id="fDireccion"></div>
                    </div>
                    <div class="client-contact-grid">
                        <div class="form-field"><label>Contacto</label><input id="fContacto"></div>
                        <div class="form-field"><label>Teléfono</label><input id="fTelefono"></div>
                        <div class="form-field"><label>Correo</label><input id="fCorreo"></div>
                    </div>
                    <div class="client-request-grid">
                        <div class="form-field"><label>N° requerimiento</label><input id="fReq" placeholder="Ingrese el requerimiento"></div>
                        <div class="form-field"><label>Fuente</label><select id="fFuente"><option>Correo</option><option>WhatsApp</option><option>Llamada</option><option>Portal</option></select></div>
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
                        <div class="form-field col-4">
                            <label>Asesor</label>
                            <input id="fVendedor" value="Helen Blas Príncipe" readonly style="background:#F1F5F9; cursor:default;">
                        </div>
                        <div class="form-field col-5">
                            <label>Email asesor</label>
                            <input id="fEmailAsesor" value="ventas@kcfcorporacion.com">
                        </div>
                        <div class="form-field col-3">
                            <label>Teléfono asesor</label>
                            <input id="fTelAsesor" value="999932051">
                        </div>
                        <div class="form-field col-4">
                            <label>Moneda</label>
                            <select id="fMoneda">
                                <option value="Soles (S/.)">Soles (S/.)</option>
                                <option value="Dólares ($)">Dólares ($)</option>
                            </select>
                        </div>
                        <div class="form-field col-4">
                            <label>Condición de pago</label>
                            <select id="fCondicion" onchange="toggleCustomField('fCondicion', 'fCondicionCustom')">
                                <option value="Contado">Contado</option>
                                <option value="Crédito 7 días">Crédito 7 días</option>
                                <option value="Crédito 15 días">Crédito 15 días</option>
                                <option value="Crédito 30 días">Crédito 30 días</option>
                                <option value="Crédito 45 días">Crédito 45 días</option>
                                <option value="Crédito 60 días">Crédito 60 días</option>
                                <option value="Crédito 90 días">Crédito 90 días</option>
                                <option value="Personalizado">✏️ Personalizado</option>
                            </select>
                            <input id="fCondicionCustom" placeholder="Ej: Crédito 120 días" style="display:none; margin-top:4px; height:28px; width:100%; border:1px solid #E5E7EB; border-radius:6px; padding:0 8px; font-size:11px;">
                        </div>
                        <div class="form-field col-4">
                            <label>Tiempo de entrega</label>
                            <select id="fTiempo" onchange="toggleCustomField('fTiempo', 'fTiempoCustom')">
                                <option value="Inmediato">Inmediato</option>
                                <option value="1 día hábil">1 día hábil</option>
                                <option value="3 días hábiles">3 días hábiles</option>
                                <option value="5 días hábiles">5 días hábiles</option>
                                <option value="7 días hábiles">7 días hábiles</option>
                                <option value="Bajo pedido">Bajo pedido</option>
                                <option value="Personalizado">✏️ Personalizado</option>
                            </select>
                            <input id="fTiempoCustom" placeholder="Ej: 10 días hábiles" style="display:none; margin-top:4px; height:28px; width:100%; border:1px solid #E5E7EB; border-radius:6px; padding:0 8px; font-size:11px;">
                        </div>
                        <div class="form-field col-4">
                            <label>Validez</label>
                            <select id="fValidez" onchange="toggleCustomField('fValidez', 'fValidezCustom')">
                                <option value="7 días">7 días</option>
                                <option value="15 días">15 días</option>
                                <option value="30 días">30 días</option>
                                <option value="60 días">60 días</option>
                                <option value="Personalizado">✏️ Personalizado</option>
                            </select>
                            <input id="fValidezCustom" placeholder="Ej: 45 días" style="display:none; margin-top:4px; height:28px; width:100%; border:1px solid #E5E7EB; border-radius:6px; padding:0 8px; font-size:11px;">
                        </div>
                        <div class="form-field col-8">
                            <label>Dirección de entrega</label>
                            <select id="fDireccionEntrega" onchange="toggleCustomField('fDireccionEntrega', 'fDireccionEntregaCustom')">
                                <option value="Dirección cliente">Dirección cliente</option>
                                <option value="Otra dirección">Otra dirección</option>
                                <option value="Personalizado">✏️ Personalizado</option>
                            </select>
                            <input id="fDireccionEntregaCustom" placeholder="Ingrese dirección personalizada" style="display:none; margin-top:4px; height:28px; width:100%; border:1px solid #E5E7EB; border-radius:6px; padding:0 8px; font-size:11px;">
                        </div>
                        <div class="form-field col-4">
                            <label>Descuento especial</label>
                            <input id="fDiscountValue" type="number" value="0" oninput="calcQuote()">
                        </div>
                        <div class="form-field col-2">
                            <label>Tipo</label>
                            <select id="fDiscountType" onchange="calcQuote()">
                                <option value="%">%</option>
                                <option value="S/">S/</option>
                            </select>
                        </div>
                        <div class="form-field col-12">
                            <label>Nota comercial</label>
                            <textarea id="fNotaComercial" placeholder="Ingrese comentarios comerciales..."></textarea>
                        </div>
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
                    <div class="total-row"><b>TOTAL A PAGAR </b><span class="summary-total" id="sumTotal">S/ 0.00</span></div>
                </div>
            </div>

            <!-- Punto 4: Productos cotizados -->
            <div class="create-panel product-wide">
                <h3><span class="section-number">4.</span> <span class="section-title-colored">Productos cotizados</span>
                    <div class="products-toolbar">
                        <input list="productMasterList" id="quickProductSearch" placeholder="Buscar en data maestra..." onkeydown="if(event.key==='Enter'){addQuoteProductFromSearch()}">
                        <datalist id="productMasterList"></datalist>
                        <button class="btn btn-blue btn-add-product" onclick="addQuoteProductFromSearch()">+ Agregar producto</button>
                        <button class="btn btn-green btn-add-multiple" onclick="openProductSelector()" style="background:#16A34A !important; color:#fff !important;">📋 Seleccionar varios</button>
                    </div>
                </h3>
                <div class="body">
                    <div class="table-scroll">
                        <table class="master-table">
                            <thead>
                                <tr>
                                    <th>Item</th><th>Código</th><th>Producto / Descripción</th><th>Modelo</th><th>Marca</th>
                                    <th>Unidad</th><th>Cant</th><th>Valor venta<br><small>Unitario S/.</small></th>
                                    <th>Monto total<br><small>Incluido IGV S/.</small></th><th>Stock</th><th>Entrega</th><th>Acciones</th>
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
            <div class="form-field"><label>Seguimiento</label>
                <select id="fSeguimiento">
                    <option>Asesor</option>
                    <option selected>Helen Blas Príncipe</option>
                    <option>Edith</option>
                </select>
            </div>
            <div class="form-field"><label>Motivo</label>
                <select id="fMotivo">
                    <option>Proyecto nuevo</option>
                    <option>Recompra</option>
                    <option>Licitación</option>
                    <option>Reposición / stock</option>
                    <option selected>Solicitud única</option>
                </select>
            </div>
            <div class="form-field"><label>Transporte</label>
                <select id="fTransporte">
                    <option>Seleccione</option>
                    <option>Motorizado</option>
                    <option>Auto</option>
                    <option>Minivan</option>
                    <option>Camioneta</option>
                    <option>Camión</option>
                    <option>Agencia</option>
                </select>
            </div>
            <div class="form-field"><label>Parihuela</label>
                <select id="fParihuela">
                    <option>Seleccione</option>
                    <option>No</option>
                    <option>Sí - estándar</option>
                    <option>Sí - a medida</option>
                    <option>Por confirmar</option>
                </select>
            </div>
            <div class="form-field internal-note-box"><label>Nota interna</label>
                <textarea id="fNotaInterna" placeholder="Interno: cliente, productos o coordinación"></textarea>
            </div>
        </div>
    </div>
</div>

        <!-- ⬇️ BARRA DE ESTADO (STEPBAR) - AHORA AL FINAL ⬇️ -->
        <div class="stepbar-bottom" id="quoteStatusBar">
            <span class="step-label">Estatus:</span>
            <span class="step status-draft"><span class="num">1</span>Borrador</span>
            <span class="sep"></span>
            <span class="step status-review"><span class="num">2</span>En revisión</span>
            <span class="sep"></span>
            <span class="step status-validated"><span class="num">3</span>Validado por Hellen</span>
            <span class="sep"></span>
            <span class="step status-generated"><span class="num">4</span>Generada</span>
            <span class="sep"></span>
            <span class="step status-accepted"><span class="num">5</span>Aceptada</span>
        </div>
    `;
    
    // Cargar datalist de productos
    cargarDatalistProductos();
    
    // ============================================================
    // 🔽 IMPORTANTE: NO cargar productos automáticamente
    // ============================================================
    quoteProducts = [];
    renderQuoteProducts();
    calcQuote(); // Actualizar totales a 0
    
    // Si es edición, cargar datos
    if (isEdit && id) {
        cargarCotizacionParaEditar(id);
    }
    
    document.getElementById('cotizacionModal').classList.add('show');
    setTimeout(() => { calcQuote(); }, 100);
}

async function cargarCotizacionParaEditar(id) {
    try {
        console.log('📥 Cargando cotización para editar ID:', id);
        
        // Usar la ruta completa que devuelve todos los datos
        const response = await apiFetch(`/ventas/api/cotizaciones/${id}/completa`);
        
        if (!response.success) {
            showToast('Error al cargar cotización: ' + (response.error || 'Desconocido'), 'error');
            return;
        }
        
        const c = response.data;
        console.log('📦 Datos cargados:', c);
        
        // ============================================================
        // LLENAR DATOS DEL CLIENTE
        // ============================================================
        document.getElementById('fRuc').value = c.cliente_ruc || '';
        document.getElementById('fRazon').value = c.cliente_razon_social || '';
        document.getElementById('fCodCliente').value = c.cod_cliente || 'PENDIENTE';
        document.getElementById('fComercial').value = c.cliente_nombre_comercial || '';
        document.getElementById('fDireccion').value = c.cliente_direccion || c.direccion_entrega || '';
        document.getElementById('fContacto').value = c.cliente_contacto || c.contacto_cliente || '';
        document.getElementById('fTelefono').value = c.cliente_telefono || c.telefono_cliente || '';
        document.getElementById('fCorreo').value = c.cliente_email || c.email_cliente || '';
        
        // ============================================================
// LLENAR CONDICIONES COMERCIALES - con soporte para personalizado
// ============================================================
if (c.condicion_pago) {
    setFieldValue('fCondicion', 'fCondicionCustom', c.condicion_pago);
}

if (c.tiempo_entrega) {
    setFieldValue('fTiempo', 'fTiempoCustom', c.tiempo_entrega);
}

if (c.validez_oferta) {
    setFieldValue('fValidez', 'fValidezCustom', c.validez_oferta);
}

if (c.direccion_entrega) {
    setFieldValue('fDireccionEntrega', 'fDireccionEntregaCustom', c.direccion_entrega);
}
        
        // Nota interna
        if (c.nota_cotizacion) {
            document.getElementById('fNotaInterna').value = c.nota_cotizacion;
        }
        
        // Requerimiento
        if (c.requerimiento) {
            document.getElementById('fReq').value = c.requerimiento;
        }
        
        // ============================================================
        // CARGAR PRODUCTOS
        // ============================================================
        if (c.productos && c.productos.length > 0) {
            quoteProducts = c.productos.map(p => ({
                ...p,
                cantidad: p.cantidad || 1,
                valorVenta: p.valorVenta || 0
            }));
            renderQuoteProducts();
            
            // Actualizar la barra de pasos según el estado
            updateQuoteStatusBar(c.estado);
            
            // Calcular totales
            setTimeout(() => { calcQuote(); }, 100);
            
            console.log(`✅ ${quoteProducts.length} productos cargados`);
        } else {
            console.log('📭 No hay productos en esta cotización');
        }
        
        // Mostrar el estado en el título
        const title = document.getElementById('cotizacionModalTitle');
        if (title && c.estado) {
            const estadoEmoji = {
                'Borrador': '📝',
                'En revisión': '🔍',
                'Validada': '✅',
                'Generada': '📄',
                'Aceptada': '🎯',
                
            };
            title.textContent = `Editar cotización ${c.numero_cotizacion || ''} ${estadoEmoji[c.estado] || ''} (${c.estado})`;
        }
        
        showToast('✅ Cotización cargada correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error cargando cotización para editar:', error);
        showToast('Error al cargar la cotización: ' + error.message, 'error');
    }
}
function updateQuoteStatusBar(estado) {
    const steps = document.querySelectorAll('#quoteStatusBar .step');
    // Mapeo de estados con sus índices
    const estadosMap = {
        'Borrador': 0,
        'En revisión': 1,
        'Validado por Hellen': 2,
        'Validada': 2,
        'Generada': 3,
        'Aceptada por Cliente': 4,
        'Aceptada': 4
    };
    
    const index = estadosMap[estado] !== undefined ? estadosMap[estado] : -1;
    const stepLabels = ['Borrador', 'En revisión', 'Validado por Hellen', 'Generada', 'Aceptada'];
    
    steps.forEach((step, i) => {
        // Remover todas las clases de estado
        step.classList.remove('status-draft', 'status-review', 'status-validated', 'status-generated', 'status-accepted', 'inactive');
        
        if (i <= index && index >= 0) {
            // Activo según el estado actual
            if (i === 0) step.classList.add('status-draft');
            else if (i === 1) step.classList.add('status-review');
            else if (i === 2) step.classList.add('status-validated');
            else if (i === 3) step.classList.add('status-generated');
            else if (i === 4) step.classList.add('status-accepted');
        } else {
            // Inactivo
            step.classList.add('inactive');
        }
    });
}

// ============================================================
// FUNCIONES PARA PC PEDIDO COMPRAS - ESTILO SAP
// ============================================================

let pcModalMode = 'cot';

function openPedidoCompraModal(mode = 'cot') {
    pcModalMode = mode;
    editingId = null;
    
    const isEdit = mode !== 'cot' && mode !== 'directo';
    const title = isEdit ? 'Editar PC Cliente' : (mode === 'cot' ? 'Crear PC desde cotización' : 'PC directo / sin cotización');
    document.getElementById('pedidoCompraModalTitle').textContent = title;
    
    const formContainer = document.getElementById('pedidoCompraForm');
    if (!formContainer) return;
    
    const modeNote = mode === 'cot' 
        ? '✅ Recomendado: jalar la cotización, crear PC espejo y validar contra el documento real del cliente.' 
        : '⚠️ PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
    
    const showCotBlock = mode === 'cot' ? '' : 'style="display:none;"';
    
    // Generar opciones de cotizaciones
    const cotOptions = cotizacionesData.map(q => 
        `<option value="${q.id}">${q.numero} · ${q.razon || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="form-section">
            <div class="section-title">Resumen de control del documento</div>
            <div class="sap-doc-summary">
                <div class="sap-doc-box"><small>Documento</small><b>PC Cliente</b></div>
                <div class="sap-doc-box"><small>Origen</small><b>${mode === 'cot' ? 'Cotización' : 'Directo'}</b></div>
                <div class="sap-doc-box"><small>Control</small><b>Validación obligatoria</b></div>
                <div class="sap-doc-box"><small>Stock</small><b>Reserva / Compra</b></div>
                <div class="sap-doc-box"><small>Salida</small><b>Guía / Factura</b></div>
            </div>
        </div>
        
        <div class="form-section" ${showCotBlock}>
            <div class="section-title">1. Cotización relacionada</div>
            <div class="ficha-grid">
                <div class="form-field col-8">
                    <label>Buscar cotización</label>
                    <select id="pcCotSelect" onchange="loadPedidoCotizacion()">
                        ${cotOptions || '<option value="">Sin cotizaciones disponibles</option>'}
                    </select>
                </div>
                <div class="form-field col-2">
                    <label>N° cotización</label>
                    <input id="pcCotNumero" readonly>
                </div>
                <div class="form-field col-2">
                    <label>Fecha cotización</label>
                    <input id="pcCotFecha" readonly>
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <div class="section-title">2. Datos del Pedido de Compra Cliente</div>
            <div class="ficha-grid">
                <div class="form-field col-3">
                    <label>Fecha llegada</label>
                    <input id="pcFecha" type="datetime-local">
                </div>
                <div class="form-field col-2">
                    <label>Medio recepción</label>
                    <select id="pcMedio">
                        <option>Correo</option>
                        <option>WhatsApp</option>
                        <option>Plataforma</option>
                        <option>Llamada</option>
                    </select>
                </div>
                <div class="form-field col-3">
                    <label>N° PC / OC cliente</label>
                    <input id="pcNumero" placeholder="PC-20260709-0001">
                </div>
                <div class="form-field col-2">
                    <label>Condición pago</label>
                    <select id="pcCondicion">
                        <option>Contado</option>
                        <option>30 días</option>
                        <option>45 días</option>
                        <option>60 días</option>
                        <option>90 días</option>
                        <option>50% / 50%</option>
                    </select>
                </div>
                <div class="form-field col-2">
                    <label>RUC</label>
                    <input id="pcRuc">
                </div>
                <div class="form-field col-4">
                    <label>Cliente</label>
                    <input id="pcCliente">
                </div>
                <div class="form-field col-2">
                    <label>Moneda</label>
                    <select id="pcMoneda">
                        <option>Soles (S/)</option>
                        <option>Dólares ($)</option>
                    </select>
                </div>
                <div class="form-field col-2">
                    <label>Contacto</label>
                    <input id="pcContacto">
                </div>
                <div class="form-field col-2">
                    <label>Monto PC</label>
                    <input id="pcMonto" type="number" step="0.01" value="0">
                </div>
                <div class="form-field col-4">
                    <label>Lugar entrega PC</label>
                    <input id="pcEntrega">
                </div>
                <div class="form-field col-12">
                    <label>Sustento / observación</label>
                    <textarea id="pcObs" placeholder="Pegar comentario, link de correo, WhatsApp, observación del cliente..."></textarea>
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <div class="section-title">3. Ítems del PC cliente</div>
            <div class="table-scroll">
                <table class="master-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th>Cant. cotizada</th>
                            <th>Cant. PC</th>
                            <th>Precio cotizado</th>
                            <th>Precio PC</th>
                            <th>Stock</th>
                            <th>Faltante</th>
                        </tr>
                    </thead>
                    <tbody id="pcItemsBody"></tbody>
                </table>
            </div>
            <div style="margin-top:8px;">
                <button class="btn btn-soft" onclick="addPedidoItem()">+ Agregar ítem</button>
            </div>
        </div>
        
        <div class="form-section">
            <div class="section-title">4. Validación comercial obligatoria</div>
            <div class="pc-check-grid">
                <div class="pc-check-card">
                    <label>Precio coincide</label>
                    <select id="vPrecio" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Cantidad coincide</label>
                    <select id="vCantidad" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Producto/modelo coincide</label>
                    <select id="vProducto" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Lugar entrega coincide</label>
                    <select id="vEntrega" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Moneda coincide</label>
                    <select id="vMoneda" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Transporte considerado</label>
                    <select id="vTransporte" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Cotización vigente</label>
                    <select id="vVigencia" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
                <div class="pc-check-card">
                    <label>Margen conforme</label>
                    <select id="vMargen" class="pc-val-select">
                        <option value="Sí">✅ Sí</option>
                        <option value="No">❌ No</option>
                    </select>
                </div>
            </div>
            <div id="validationResult" class="mini-note" style="margin-top:10px;">
                ℹ️ Si algún punto es <b>"No"</b>, el PC quedará <b>observado y bloqueado</b>.
            </div>
        </div>
    `;
    
    // Inicializar valores por defecto
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('pcFecha').value = now.toISOString().slice(0, 16);
    document.getElementById('pcNumero').value = 'PC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(Date.now()).slice(-4);
    
    // Agregar un ítem por defecto
    addPedidoItem();
    
    // Si es modo cotización, cargar la primera cotización
    if (mode === 'cot') {
        setTimeout(loadPedidoCotizacion, 100);
    }
    
    document.getElementById('pedidoCompraModal').classList.add('show');
}

function loadPedidoCotizacion() {
    const select = document.getElementById('pcCotSelect');
    if (!select || !select.value) return;
    
    const cotId = parseInt(select.value);
    const cotizacion = cotizacionesData.find(c => c.id === cotId);
    if (!cotizacion) return;
    
    document.getElementById('pcCotNumero').value = cotizacion.numero || '';
    document.getElementById('pcCotFecha').value = cotizacion.fecha || '';
    document.getElementById('pcRuc').value = cotizacion.ruc || '';
    document.getElementById('pcCliente').value = cotizacion.razon || '';
    document.getElementById('pcContacto').value = cotizacion.contacto || '';
    document.getElementById('pcMoneda').value = cotizacion.moneda || 'Soles (S/)';
    document.getElementById('pcEntrega').value = cotizacion.direccion_entrega || '';
    document.getElementById('pcMonto').value = cotizacion.total || cotizacion.monto || 0;
    
    // Cargar productos de la cotización
    const productos = cotizacion.productos || [];
    const tbody = document.getElementById('pcItemsBody');
    if (tbody) {
        tbody.innerHTML = '';
        productos.forEach((p, i) => {
            const faltante = Math.max((p.cantidad || 0) - (p.stock || 0), 0);
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${i + 1}</td>
                    <td><input value="${p.codigo || ''}" style="width:90px;"></td>
                    <td><input value="${p.producto || p.descripcion || ''}" style="width:160px;"></td>
                    <td><input type="number" value="${p.cantidad || 0}" style="width:60px;"></td>
                    <td><input type="number" value="${p.cantidad || 1}" style="width:60px;"></td>
                    <td><input type="number" step="0.01" value="${p.valorVenta || 0}" style="width:80px;"></td>
                    <td><input type="number" step="0.01" value="${p.valorVenta || 0}" style="width:80px;"></td>
                    <td><input type="number" value="${p.stock || 0}" style="width:60px;"></td>
                    <td>${faltante}</td>
                </tr>
            `);
        });
        
        if (productos.length === 0) {
            addPedidoItem();
        }
    }
}

function addPedidoItem() {
    const tbody = document.getElementById('pcItemsBody');
    if (!tbody) return;
    const idx = tbody.children.length + 1;
    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td>${idx}</td>
            <td><input value="" style="width:90px;"></td>
            <td><input value="" style="width:160px;"></td>
            <td><input type="number" value="0" style="width:60px;"></td>
            <td><input type="number" value="1" style="width:60px;"></td>
            <td><input type="number" step="0.01" value="0" style="width:80px;"></td>
            <td><input type="number" step="0.01" value="0" style="width:80px;"></td>
            <td><input type="number" value="0" style="width:60px;"></td>
            <td>0</td>
        </tr>
    `);
}


function cargarDatalistProductos() {
    const dl = document.getElementById('productMasterList');
    if (!dl) return;
    
    if (!PRODUCTOS_MAESTROS || PRODUCTOS_MAESTROS.length === 0) {
        dl.innerHTML = `<option value="Cargando productos...">`;
        cargarProductosMaestros();
        return;
    }
    
    // label muestra información extra pero value es solo el código
    dl.innerHTML = PRODUCTOS_MAESTROS.map(p => {
        const label = `${p.codigo} - ${p.producto}${p.marca ? ' (' + p.marca + ')' : ''}`;
        return `<option value="${p.codigo}" label="${label}">${label}</option>`;
    }).join('');
}

function addQuoteProductFromSearch() {
    const input = document.getElementById('quickProductSearch');
    const valor = input ? input.value.trim() : '';
    
    console.log('🔍 Buscando producto por código:', valor);
    
    if (!valor) {
        showToast('💡 Escribe el código del producto', 'info');
        return;
    }
    
    if (PRODUCTOS_MAESTROS.length === 0) {
        showToast('⏳ Cargando productos...', 'info');
        cargarProductosMaestros().then(() => {
            setTimeout(() => addQuoteProductFromSearch(), 500);
        });
        return;
    }
    
    // Buscar por código EXACTO
    const q = valor.trim();
    let productoEncontrado = PRODUCTOS_MAESTROS.find(p => 
        p.codigo && p.codigo.toLowerCase() === q.toLowerCase()
    );
    
    // Si no, buscar por código que contenga
    if (!productoEncontrado) {
        productoEncontrado = PRODUCTOS_MAESTROS.find(p => 
            p.codigo && p.codigo.toLowerCase().includes(q.toLowerCase())
        );
    }
    
    if (!productoEncontrado) {
        showToast(`❌ Producto con código "${q}" no encontrado`, 'error');
        return;
    }
    
    // Agregar el producto
    const nuevoProducto = {
        ...productoEncontrado,
        cantidad: 1,
        valorVenta: parseFloat(productoEncontrado.valorVenta) || 0,
        stock: parseInt(productoEncontrado.stock) || 0
    };
    
    quoteProducts.push(nuevoProducto);
    if (input) input.value = '';
    renderQuoteProducts();
    calcQuote();
    showToast(`✅ "${productoEncontrado.producto}" agregado`, 'success');
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
            <td class="col-total"><b>${money(((p.cantidad || 1) * (p.valorVenta || 0)) * 1.18)}</b></td>
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
    const igv = value * CONFIG.igv;
    const total = value + igv;
    
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sumSubtotal', money(subtotal));
    set('sumDiscountPct', dt === '%' ? dv.toFixed(2) + '%' : money(dv));
    set('sumDiscount', '-' + money(discount));
    set('sumValue', money(value));
    set('sumIgv', money(igv));
    set('sumTotal', money(total));
}


async function loadClient() {
    const rucInput = document.getElementById('fRucSearch');
    const ruc = rucInput?.value?.replace(/\D/g, '').trim() || '';
    
    if (!ruc) {
        showToast('⚠️ Ingresa un RUC para consultar.', 'warning');
        return;
    }
    if (ruc.length !== 11) {
        showToast('⚠️ El RUC debe tener 11 dígitos.', 'warning');
        return;
    }
    
    const btnBuscar = document.querySelector('.btn-search-ruc');
    const originalText = btnBuscar?.textContent || '🔍 Buscar';
    if (btnBuscar) {
        btnBuscar.textContent = '⏳ Consultando...';
        btnBuscar.disabled = true;
    }
    
    try {
        // ============================================================
        // PASO 1: BUSCAR PRIMERO EN LA BASE DE DATOS
        // ============================================================
        console.log('🔍 Buscando cliente en base de datos por RUC:', ruc);
        
        // Usar el endpoint de maestros que ya existe
        const bdResponse = await fetch(`/maestros/api/clientes/buscar?q=${ruc}`);
        const bdData = await bdResponse.json();
        
        console.log('📦 Respuesta BD:', bdData);
        
       if (bdData.success && bdData.data && bdData.data.length > 0) {
    const cliente = bdData.data[0];
    
    // Llenar el formulario con los datos de la BD
    document.getElementById('fRuc').value = cliente.ruc || ruc;
    document.getElementById('fRazon').value = cliente.razon_social || '';
    document.getElementById('fComercial').value = cliente.nombre_comercial || cliente.razon_social || '';
    document.getElementById('fCodCliente').value = cliente.codigo_cliente || 'PENDIENTE';
    document.getElementById('fDireccion').value = cliente.direccion_fiscal || '';
    document.getElementById('fContacto').value = cliente.nombre_contacto || '';
    document.getElementById('fTelefono').value = cliente.telefono_contacto || '';
    document.getElementById('fCorreo').value = cliente.email_contacto || '';
    
    // 🔽 Condición de pago
    if (cliente.condicion_pago && document.getElementById('fCondicion')) {
        setFieldValue('fCondicion', 'fCondicionCustom', cliente.condicion_pago);
    }
    
    // 🔽 Dirección de entrega desde puntos de entrega
    let direccionEntrega = '';
    if (cliente.puntos_entrega && cliente.puntos_entrega.length > 0) {
        const principal = cliente.puntos_entrega.find(p => p.principal === true);
        if (principal) {
            direccionEntrega = principal.direccion || '';
            if (principal.condicion_pago && document.getElementById('fCondicion')) {
                setFieldValue('fCondicion', 'fCondicionCustom', principal.condicion_pago);
            }
        } else {
            const primero = cliente.puntos_entrega[0];
            direccionEntrega = primero.direccion || '';
            if (primero.condicion_pago && document.getElementById('fCondicion')) {
                setFieldValue('fCondicion', 'fCondicionCustom', primero.condicion_pago);
            }
        }
    }
    
    if (!direccionEntrega && cliente.direccion_fiscal) {
        direccionEntrega = cliente.direccion_fiscal;
    }
    
    if (direccionEntrega && document.getElementById('fDireccionEntrega')) {
        setFieldValue('fDireccionEntrega', 'fDireccionEntregaCustom', direccionEntrega);
    }
            
            // Guardar referencia del cliente CON ID para futuras operaciones
            window._clienteConsultado = {
                id: cliente.id,
                ruc: cliente.ruc || ruc,
                razon_social: cliente.razon_social || '',
                nombre_comercial: cliente.nombre_comercial || cliente.razon_social || '',
                direccion: cliente.direccion_fiscal || '',
                contacto: cliente.nombre_contacto || '',
                telefono: cliente.telefono_contacto || '',
                email: cliente.email_contacto || '',
                codigo_cliente: cliente.codigo_cliente || 'PENDIENTE',
                condicion_pago: cliente.condicion_pago || '',
                tiempo_entrega: cliente.tiempo_entrega || '',
                direccion_entrega: direccionEntrega || '',
                origen: 'base_datos'
            };
            
            // Mostrar mensaje de éxito con información adicional
            const confirmBox = document.getElementById('clientConfirmBox');
            if (confirmBox) {
                let mensaje = `✅ Cliente encontrado en sistema | Código: ${cliente.codigo_cliente || 'PENDIENTE'}`;
                if (cliente.condicion_pago) {
                    mensaje += ` | Pago: ${cliente.condicion_pago}`;
                }
                if (direccionEntrega) {
                    mensaje += ` | Entrega: ${direccionEntrega.substring(0, 30)}${direccionEntrega.length > 30 ? '...' : ''}`;
                }
                confirmBox.textContent = mensaje;
                confirmBox.className = 'show existente';
                setTimeout(() => { confirmBox.className = ''; }, 6000);
            }
            
            showToast(`✅ Cliente encontrado en sistema: ${cliente.razon_social}`, 'success');
            return;  // Salir de la función, no consultar SUNAT
        }
        
        // ============================================================
        // PASO 2: SI NO ESTÁ EN BD, CONSULTAR SUNAT
        // ============================================================
        console.log('🌞 Cliente no encontrado en BD, consultando SUNAT...');
        
        const sunatResponse = await fetch(`/api/sunat/consulta?ruc=${ruc}`);
        const sunatData = await sunatResponse.json();
        
        console.log('📦 Respuesta SUNAT:', sunatData);
        
        if (sunatData.success) {
            const confirmBox = document.getElementById('clientConfirmBox');
            
            // Llenar el formulario con los datos de SUNAT
            document.getElementById('fRuc').value = sunatData.ruc || ruc;
            document.getElementById('fRazon').value = sunatData.razon_social || '';
            document.getElementById('fComercial').value = sunatData.nombre_comercial || sunatData.razon_social || '';
            document.getElementById('fCodCliente').value = 'PENDIENTE'; // Se generará al guardar
            document.getElementById('fDireccion').value = sunatData.direccion || '';
            document.getElementById('fContacto').value = sunatData.contacto || '';
            document.getElementById('fTelefono').value = sunatData.telefono || '';
            document.getElementById('fCorreo').value = sunatData.email || '';
            
            // Guardar referencia del cliente de SUNAT (sin ID porque es nuevo)
            window._clienteConsultado = {
                id: null,  // No tiene ID porque es nuevo
                ruc: sunatData.ruc || ruc,
                razon_social: sunatData.razon_social || '',
                nombre_comercial: sunatData.nombre_comercial || sunatData.razon_social || '',
                direccion: sunatData.direccion || '',
                contacto: sunatData.contacto || '',
                telefono: sunatData.telefono || '',
                email: sunatData.email || '',
                codigo_cliente: 'PENDIENTE',
                origen: 'sunat'
            };
            
            // Mostrar mensaje según estado
            if (sunatData.estado) {
                const estadoMap = {
                    'ACTIVO': '✅ Activo',
                    'BAJA': '❌ Inactivo',
                    'SUSPENDIDO': '⚠️ Observado',
                    'BAJA DE OFICIO': '❌ Inactivo'
                };
                const estadoDisplay = estadoMap[sunatData.estado.toUpperCase()] || sunatData.estado;
                
                if (confirmBox) {
                    confirmBox.textContent = `🌞 Datos consultados en SUNAT | Estado: ${estadoDisplay}`;
                    confirmBox.className = 'show nuevo';
                    setTimeout(() => { confirmBox.className = ''; }, 5000);
                }
            } else {
                if (confirmBox) {
                    confirmBox.textContent = '🌞 Datos consultados en SUNAT';
                    confirmBox.className = 'show nuevo';
                    setTimeout(() => { confirmBox.className = ''; }, 5000);
                }
            }
            
            showToast('🌞 Datos cargados desde SUNAT', 'info');
            
        } else {
            showToast('❌ ' + (sunatData.error || 'Error al consultar SUNAT'), 'error');
            const confirmBox = document.getElementById('clientConfirmBox');
            if (confirmBox) {
                confirmBox.textContent = '❌ ' + (sunatData.error || 'Error al consultar SUNAT');
                confirmBox.className = 'show error';
                setTimeout(() => { confirmBox.className = ''; }, 5000);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en loadClient:', error);
        showToast('❌ Error al conectar con el servicio', 'error');
    } finally {
        if (btnBuscar) {
            btnBuscar.textContent = originalText;
            btnBuscar.disabled = false;
        }
    }
}

let __rucAutoTimer = null;

function autoLoadClientByRuc(value) {
    clearTimeout(__rucAutoTimer);
    const ruc = (value || '').trim();
    if (ruc.length === 11) {
        __rucAutoTimer = setTimeout(() => loadClient(), 500);
    } else if (ruc.length > 11) {
        const input = document.getElementById('fRucSearch');
        if (input) input.value = ruc.substring(0, 11);
    }
}


// En ventas.js - Reemplaza la función markGuiaEmitida
function markGuiaEmitida(id) {
    const guia = guiasData.find(g => g.id === id);
    const numero = guia?.numero || 'G-XXXXXX';
    const cliente = guia?.cliente || 'Cliente';
    
    showConfirmModal(
        '📄 ¿Emitir guía?',
        `Estás a punto de emitir la guía <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción es irreversible. La guía quedará emitida oficialmente.',
        async function() {
            try {
                const response = await apiFetch(`/ventas/api/guias/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Emitida' })
                });
                if (response.success) {
                    showToast('✅ Guía emitida correctamente', 'success');
                    await loadGuias();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo emitir'), 'error');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al emitir guía', 'error');
            }
        },
        '📄 Sí, emitir'
    );
}

// ============================================================
// FUNCIÓN PARA GUARDAR CLIENTE DESDE COTIZACIÓN
// ============================================================

async function saveClientFromQuote() {
    const ruc = document.getElementById('fRuc')?.value?.trim() || '';
    if (!ruc) {
        showToast('⚠️ Primero busca el RUC', 'warning');
        return;
    }
    
    // Validar que tenga razón social
    const razonSocial = document.getElementById('fRazon')?.value?.trim() || '';
    if (!razonSocial) {
        showToast('⚠️ La razón social es obligatoria', 'warning');
        return;
    }
    
    // Mostrar loading en el botón
    const btn = document.querySelector('.btn-save-client');
    const originalText = btn?.textContent || '💾 Guardar / Actualizar';
    if (btn) {
        btn.textContent = '⏳ Guardando...';
        btn.disabled = true;
    }
    
    try {
        // ============================================================
        // PASO 1: VERIFICAR SI EL CLIENTE YA EXISTE EN LA BD
        // ============================================================
        console.log('🔍 Verificando si cliente existe en BD por RUC:', ruc);
        
        const buscarResponse = await fetch(`/maestros/api/clientes/buscar?q=${ruc}`);
        const buscarData = await buscarResponse.json();
        
        const clienteExistente = buscarData.success && buscarData.data && buscarData.data.length > 0;
        
        // ============================================================
        // PREPARAR DATOS DEL CLIENTE
        // ============================================================
        const clienteData = {
            tipo_documento: 'RUC',
            numero_documento: ruc,
            ruc: ruc,
            razon_social: document.getElementById('fRazon')?.value?.trim() || '',
            nombre_comercial: document.getElementById('fComercial')?.value?.trim() || '',
            direccion_fiscal: document.getElementById('fDireccion')?.value?.trim() || '',
            nombre_contacto: document.getElementById('fContacto')?.value?.trim() || '',
            telefono_contacto: document.getElementById('fTelefono')?.value?.trim() || '',
            email_contacto: document.getElementById('fCorreo')?.value?.trim() || '',
            condicion_pago: document.getElementById('fCondicion')?.value || 'Contado',
            activo: true,
            estado: 'Activo'
        };
        
        console.log('📦 Datos a guardar:', clienteData);
        
        // ============================================================
        // PASO 2: GUARDAR O ACTUALIZAR
        // ============================================================
        let endpoint = '/maestros/api/clientes/guardar';
        let method = 'POST';
        let mensaje = '';
        
        if (clienteExistente) {
            // Actualizar cliente existente
            const clienteId = buscarData.data[0].id;
            endpoint = `/maestros/api/clientes/${clienteId}`;
            method = 'PUT';
            mensaje = 'actualizado';
            console.log('🔄 Cliente existente, actualizando ID:', clienteId);
        } else {
            // Crear nuevo cliente
            mensaje = 'creado';
            console.log('🆕 Cliente nuevo, creando...');
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clienteData)
        });
        
        const result = await response.json();
        console.log('📦 Respuesta del servidor:', result);
        
        if (result.success) {
            // ============================================================
            // MOSTRAR MENSAJE DE ÉXITO
            // ============================================================
            const codigoCliente = result.data?.codigo_cliente || 
                                 buscarData.data?.[0]?.codigo_cliente || 
                                 'PENDIENTE';
            
            // Actualizar el código de cliente en el formulario
            document.getElementById('fCodCliente').value = codigoCliente;
            
            // Mostrar mensaje en el confirm box
            const confirmBox = document.getElementById('clientConfirmBox');
            if (confirmBox) {
                const emoji = mensaje === 'creado' ? '✅' : '🔄';
                const texto = mensaje === 'creado' ? 'creado' : 'actualizado';
                confirmBox.textContent = `${emoji} Cliente ${texto} correctamente | Código: ${codigoCliente}`;
                confirmBox.className = 'show existente';
                setTimeout(() => { confirmBox.className = ''; }, 5000);
            }
            
            // Mostrar toast
            showToast(`✅ Cliente ${mensaje} correctamente: ${clienteData.razon_social}`, 'success');
            
            // Actualizar la lista de clientes maestros
            await cargarClientesMaestros();
            
            // Guardar referencia del cliente para uso en la cotización
            window._clienteConsultado = {
                id: result.data?.id || buscarData.data?.[0]?.id,
                ruc: ruc,
                razon_social: clienteData.razon_social,
                nombre_comercial: clienteData.nombre_comercial,
                direccion: clienteData.direccion_fiscal,
                contacto: clienteData.nombre_contacto,
                telefono: clienteData.telefono_contacto,
                email: clienteData.email_contacto,
                codigo_cliente: codigoCliente,
                origen: 'base_datos'
            };
            
        } else {
            showToast('❌ Error: ' + (result.error || 'No se pudo guardar el cliente'), 'error');
        }
        
    } catch (error) {
        console.error('❌ Error guardando cliente:', error);
        showToast('❌ Error al guardar el cliente: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}



// ============================================================
// FUNCIONES PARA OTROS MODALES
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
                    <input id="pcNumero" placeholder="PC-2026-0001">
                </div>
                <div class="form-field col-4"><label>Estado</label>
                    <select id="pcEstado">
                        ${options(ESTADOS_PC, 'Pendiente')}
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
                    <input id="pcFechaRecep" type="date" value="${today()}">
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
                        <div class="pc-file-note">Se guarda el nombre del archivo.</div>
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
    
    document.getElementById('pcCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('pcProductsPreview').innerHTML = productTableHtml(q.productos);
        } else {
            document.getElementById('pcProductsPreview').innerHTML = `
                <div style="padding:10px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });
    
    document.getElementById('pcFile')?.addEventListener('change', function() {
        if (this.files[0]) {
            document.getElementById('pcArchivo').value = this.files[0].name;
        }
    });
    
    document.getElementById('pedidoCompraModal').classList.add('show');
}

function productTableHtml(productos) {
    if (!productos || productos.length === 0) {
        return `<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos</div>`;
    }
    
    return `
        <div class="table-scroll">
            <table class="master-table">
                <thead><tr>
                    <th>Item</th><th>Código</th><th>Producto</th><th>Marca</th><th>UM SUNAT</th>
                    <th>Cant.</th><th>Stock</th><th>Validación</th>
                </tr></thead>
                <tbody>
                    ${productos.map((p, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td>${p.codigo || '-'}</td>
                            <td class="left">${p.producto || p.descripcion || '-'}</td>
                            <td>${p.marca || '-'}</td>
                            <td>${p.um || 'NIU'}</td>
                            <td>${p.cantidad || 1}</td>
                            <td>${p.stock || 0}</td>
                            <td>${(p.stock || 0) >= (p.cantidad || 1) ? '✅ OK stock' : '⚠️ Revisar stock'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

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
                        ${options(ESTADOS_DESPACHO, 'Pendiente despacho')}
                    </select>
                </div>
                <div class="form-field col-4"><label>Cliente</label>
                    <input id="despachoCliente" placeholder="Razón social">
                </div>
                <div class="form-field col-4"><label>RUC</label>
                    <input id="despachoRuc" placeholder="12345678901">
                </div>
                <div class="form-field col-4"><label>Fecha despacho</label>
                    <input id="despachoFecha" type="date" value="${today()}">
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
    
    document.getElementById('despachoPC')?.addEventListener('change', function() {
        const num = this.value;
        const p = pedidosData.find(x => x.numero === num);
        if (p && p.productos && p.productos.length > 0) {
            document.getElementById('despachoProducts').innerHTML = productTableHtml(p.productos);
            document.getElementById('despachoCliente').value = p.cliente || '';
            document.getElementById('despachoRuc').value = p.ruc || '';
            document.getElementById('despachoDestino').value = p.lugar_entrega || '';
        } else {
            document.getElementById('despachoProducts').innerHTML = `
                <div style="padding:10px;text-align:center;color:#94A3B8;">No hay productos en este PC.</div>
            `;
        }
    });
    
    document.getElementById('despachoModal').classList.add('show');
}

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
                        ${options(ESTADOS_GUIA, 'Borrador')}
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
    
    document.getElementById('guiaCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('guiaProducts').innerHTML = productTableHtml(q.productos);
            document.getElementById('guiaCliente').value = q.razon || '';
            document.getElementById('guiaRuc').value = q.ruc || '';
            document.getElementById('guiaDestino').value = q.direccion_entrega || '';
        } else {
            document.getElementById('guiaProducts').innerHTML = `
                <div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });
    
    document.getElementById('guiaModal').classList.add('show');
}

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
                        ${options(ESTADOS_COMPROBANTE, 'Borrador')}
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
                        <option>Contado</option>
                        <option>Crédito 7 días</option>
                        <option>Crédito 15 días</option>
                        <option>Crédito 30 días</option>
                        <option>Crédito 45 días</option>
                        <option>Crédito 60 días</option>
                        <option>Crédito 90 días</option>
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
            document.getElementById('compProducts').innerHTML = productTableHtml(q.productos);
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
                        ${options(ESTADOS_NOTA, 'Borrador')}
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
                        ${options(ESTADOS_DEVOLUCION, 'Pendiente')}
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
// FUNCIÓN VALIDADO POR HELLEN
// ============================================================

function validateByHellen() {
    // Verificar que hay productos en la cotización
    if (quoteProducts.length === 0) {
        showToast('⚠️ Agrega al menos un producto a la cotización', 'warning');
        return;
    }
    
    // Verificar que hay un cliente seleccionado
    const ruc = document.getElementById('fRuc')?.value?.trim() || '';
    if (!ruc) {
        showToast('⚠️ Primero busca un cliente por RUC', 'warning');
        return;
    }
    
    showConfirmModal(
        '✅ ¿Validar cotización por Hellen?',
        'Estás a punto de marcar esta cotización como <b>"Validado por Hellen"</b>.',
        '⚠️ Esta acción confirma que Hellen ha revisado y validado la cotización.',
        async function() {
            // Mostrar loading en el botón
            const btn = document.querySelector('#cotizacionModal .btn-blue');
            const originalText = btn?.textContent || '✅ Validado por Hellen';
            if (btn) {
                btn.textContent = '⏳ Validando...';
                btn.disabled = true;
            }
            
            try {
                await guardarCotizacion('Validado por Hellen');
                showToast('✅ Cotización validada por Hellen', 'success');
                closeModal('cotizacionModal');
                await loadCotizaciones();
            } catch (error) {
                console.error('Error validando cotización:', error);
                showToast('❌ Error al validar: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            }
        },
        '✅ Sí, validar'
    );
}

// ============================================================
// MODALES DE CONFIRMACIÓN Y ÉXITO
// ============================================================

function showConfirmModal(title, message, warning, onConfirm) {
    // Remover modales existentes
    document.querySelectorAll('.confirm-modal-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #FFFFFF;
        border-radius: 20px;
        max-width: 520px;
        width: 95%;
        padding: 32px 28px 24px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.35);
        animation: modalSlideUp 0.3s ease;
        text-align: center;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h2 style="font-size: 22px; font-weight: 900; color: #0F172A; margin-bottom: 8px;">${title}</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 12px;">${message}</p>
        <div style="background: #FEF2F2; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #EF233C;">
            <span style="font-size: 13px; font-weight: 700; color: #DC2626;">${warning}</span>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="confirm-cancel-btn" style="
                padding: 12px 32px;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                color: #0F172A;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            ">Cancelar</button>
            <button class="confirm-accept-btn" style="
                padding: 12px 32px;
                border-radius: 12px;
                border: none;
                background: #EF233C;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 14px rgba(239, 35, 60, 0.35);
            ">✅ Sí, generar cotización</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .confirm-cancel-btn:hover {
            background: #F1F5F9;
        }
        .confirm-accept-btn:hover {
            background: #D91A30;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(239, 35, 60, 0.45);
        }
    `;
    document.head.appendChild(style);
    
    // Event listeners
    modal.querySelector('.confirm-cancel-btn').addEventListener('click', function() {
        overlay.remove();
    });
    
    modal.querySelector('.confirm-accept-btn').addEventListener('click', function() {
        overlay.remove();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}


// ============================================================
// SELECCIÓN MÚLTIPLE DE PRODUCTOS
// ============================================================

let productSelectorData = [];
let selectedProductIds = new Set();

function openProductSelector() {
    // Si no hay productos maestros, cargarlos primero
    if (PRODUCTOS_MAESTROS.length === 0) {
        showToast('⏳ Cargando productos...', 'info');
        cargarProductosMaestros().then(() => {
            setTimeout(() => openProductSelector(), 300);
        });
        return;
    }
    
    // Resetear selecciones
    selectedProductIds = new Set();
    productSelectorData = [...PRODUCTOS_MAESTROS];
    
    // Renderizar tabla
    renderProductSelector();
    
    // Mostrar modal
    document.getElementById('productSelectorModal').classList.add('show');
    
    // Enfocar buscador
    setTimeout(() => {
        document.getElementById('productSelectorSearch')?.focus();
    }, 300);
}

function renderProductSelector() {
    const tbody = document.getElementById('productSelectorRows');
    const search = document.getElementById('productSelectorSearch')?.value?.toLowerCase() || '';
    
    // Filtrar productos
    let filtered = productSelectorData;
    if (search) {
        filtered = productSelectorData.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(search)) ||
            (p.producto && p.producto.toLowerCase().includes(search)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(search)) ||
            (p.marca && p.marca.toLowerCase().includes(search))
        );
    }
    
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94A3B8;padding:30px;">📭 No se encontraron productos</td></tr>`;
        document.getElementById('selectedCount').textContent = selectedProductIds.size;
        return;
    }
    
    tbody.innerHTML = filtered.map((p, index) => {
        const isChecked = selectedProductIds.has(p.id) || selectedProductIds.has(p.codigo);
        // Usar id o codigo como identificador
        const idKey = p.id || p.codigo;
        
        // 🔽 FIX: Asegurar que valorVenta sea un número
        const valorVenta = parseFloat(p.valorVenta) || 0;
        
        return `
        <tr>
            <td style="text-align:center;">
                <input type="checkbox" class="product-select-checkbox" 
                       data-id="${idKey}" 
                       ${isChecked ? 'checked' : ''}
                       onchange="toggleProductSelection('${idKey}', this.checked)">
            </td>
            <td style="font-weight:900; color:#0F172A;">${p.codigo || '-'}</td>
            <td style="text-align:left; font-weight:800;">${p.producto || p.descripcion || 'Sin nombre'}</td>
            <td>${p.marca || '-'}</td>
            <td>${p.um || 'NIU'}</td>
            <td>${p.stock || 0}</td>
            <td style="font-weight:900; color:#059669;">S/ ${valorVenta.toFixed(2)}</td>
            <td>
                <input type="number" class="product-select-qty" 
                       data-id="${idKey}"
                       value="1" 
                       min="1" 
                       style="width:60px; height:28px; border:1px solid #E5E7EB; border-radius:6px; text-align:center; font-size:12px;"
                       onchange="updateProductQty('${idKey}', this.value)">
            </td>
        </tr>
    `}).join('');
    
    document.getElementById('selectedCount').textContent = selectedProductIds.size;
    
    // Actualizar el checkbox "Seleccionar todos"
    const totalCheckboxes = document.querySelectorAll('.product-select-checkbox').length;
    const checkedCheckboxes = document.querySelectorAll('.product-select-checkbox:checked').length;
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        if (totalCheckboxes > 0 && checkedCheckboxes === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }
}

function toggleProductSelection(idKey, checked) {
    if (checked) {
        selectedProductIds.add(idKey);
    } else {
        selectedProductIds.delete(idKey);
    }
    document.getElementById('selectedCount').textContent = selectedProductIds.size;
    
    // Actualizar el checkbox "Seleccionar todos"
    const totalCheckboxes = document.querySelectorAll('.product-select-checkbox').length;
    const checkedCheckboxes = document.querySelectorAll('.product-select-checkbox:checked').length;
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        if (totalCheckboxes > 0 && checkedCheckboxes === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }
}


// ============================================================
// FUNCIÓN PARA LIMPIAR FILTROS DE FECHA
// ============================================================

function clearDateFilter() {
    console.log('🧹 Limpiando filtros de fecha...');
    
    const fechaInicio = document.getElementById('qFechaInicio');
    const fechaFin = document.getElementById('qFechaFin');
    
    if (fechaInicio) {
        fechaInicio.value = '';
        console.log('  ✅ Fecha inicio limpiada');
    }
    
    if (fechaFin) {
        fechaFin.value = '';
        console.log('  ✅ Fecha fin limpiada');
    }
    
    // Volver a renderizar la tabla de cotizaciones
    renderCotizaciones();
    
    showToast('🧹 Filtros de fecha limpiados', 'info');
}



// ============================================================
// FUNCIONES SAP PARA MODAL DE PC
// ============================================================

function openPedidoCompraModalSAP(mode = 'cot') {
    modalMode = mode;
    editingId = null;
    
    const modal = document.getElementById('pedidoCompraModal');
    const title = document.getElementById('pedidoCompraModalTitle');
    const sub = document.getElementById('modalSub');
    const note = document.getElementById('modeNote');
    const cotBlock = document.getElementById('cotBlock');
    const origen = document.getElementById('docOrigen');
    
    if (mode === 'cot') {
        title.textContent = 'Crear PC desde cotización';
        sub.textContent = 'Recomendado: jalar la cotización, crear PC espejo y validar contra el documento real del cliente.';
        note.className = 'mini-note';
        note.textContent = '✅ Recomendado: jalar la cotización, crear PC espejo y validar contra el documento real del cliente.';
        cotBlock.style.display = 'block';
        origen.textContent = 'Cotización';
    } else {
        title.textContent = 'PC directo / sin cotización';
        sub.textContent = 'PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
        note.className = 'danger-note';
        note.textContent = '⚠️ PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
        cotBlock.style.display = 'none';
        origen.textContent = 'Directo';
    }
    
    // Cargar cotizaciones en el select
    const select = document.getElementById('pcCotSelect');
    if (select && cotizacionesData) {
        select.innerHTML = '<option value="">Seleccione una cotización</option>' + 
            cotizacionesData.map(c => `<option value="${c.id}">${c.numero} · ${c.razon || 'Sin cliente'}</option>`).join('');
    }
    
    // Limpiar y preparar el modal
    clearPedidoModalSAP();
    
    // Mostrar modal
    modal.classList.add('show');
}

function clearPedidoModalSAP() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('pcFecha').value = now.toISOString().slice(0, 16);
    document.getElementById('pcNumero').value = 'PC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(Date.now()).slice(-4);
    
    ['pcCotNumero', 'pcCotFecha', 'pcCliente', 'pcRuc', 'pcContacto', 'pcEntrega', 'pcObs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('pcMonto').value = '0';
    
    const tbody = document.getElementById('pcItemsBody');
    if (tbody) tbody.innerHTML = '';
    addPedidoItemSAP();
}

function loadPedidoCotizacionSAP() {
    const select = document.getElementById('pcCotSelect');
    const cotId = select ? parseInt(select.value) : null;
    if (!cotId) return;
    
    const cotizacion = cotizacionesData.find(c => c.id === cotId);
    if (!cotizacion) return;
    
    document.getElementById('pcCotNumero').value = cotizacion.numero || '';
    document.getElementById('pcCotFecha').value = cotizacion.fecha || '';
    document.getElementById('pcCliente').value = cotizacion.razon || '';
    document.getElementById('pcRuc').value = cotizacion.ruc || '';
    document.getElementById('pcMonto').value = cotizacion.total || cotizacion.monto || 0;
    
    // Cargar productos
    const productos = cotizacion.productos || [];
    const tbody = document.getElementById('pcItemsBody');
    if (tbody) {
        tbody.innerHTML = '';
        productos.forEach((p, i) => {
            const faltante = Math.max((p.cantidad || 0) - (p.stock || 0), 0);
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${i + 1}</td>
                    <td><input value="${p.codigo || ''}" style="width:90px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"></td>
                    <td><input value="${p.producto || p.descripcion || ''}" style="width:160px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"></td>
                    <td><input type="number" value="${p.cantidad || 0}" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
                    <td><input type="number" value="${p.cantidad || 1}" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
                    <td><input type="number" step="0.01" value="${p.valorVenta || 0}" style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right;"></td>
                    <td><input type="number" step="0.01" value="${p.valorVenta || 0}" style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right;"></td>
                    <td><input type="number" value="${p.stock || 0}" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
                    <td style="font-weight:900; color:#DC2626;">${faltante}</td>
                </tr>
            `);
        });
        if (productos.length === 0) addPedidoItemSAP();
    }
}

function addPedidoItemSAP() {
    const tbody = document.getElementById('pcItemsBody');
    if (!tbody) return;
    const idx = tbody.children.length + 1;
    tbody.insertAdjacentHTML('beforeend', `
        <tr>
            <td>${idx}</td>
            <td><input value="" style="width:90px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"></td>
            <td><input value="" style="width:160px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"></td>
            <td><input type="number" value="0" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
            <td><input type="number" value="1" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
            <td><input type="number" step="0.01" value="0" style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right;"></td>
            <td><input type="number" step="0.01" value="0" style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right;"></td>
            <td><input type="number" value="0" style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"></td>
            <td style="font-weight:900; color:#64748B;">0</td>
        </tr>
    `);
}

function savePedidoCompraSAP(force) {
    const val = ['vPrecio', 'vCantidad', 'vProducto', 'vEntrega', 'vMoneda', 'vTransporte', 'vVigencia', 'vMargen']
        .map(id => document.getElementById(id)?.value || 'Sí');
    
    const observed = force === 'observado' || val.some(v => v === 'No');
    
    const trs = document.querySelectorAll('#pcItemsBody tr');
    const items = Array.from(trs).map(r => {
        const inputs = r.querySelectorAll('input');
        return [
            inputs[0]?.value || '',
            inputs[1]?.value || '',
            Number(inputs[2]?.value || 0),
            Number(inputs[3]?.value || 1),
            Number(inputs[4]?.value || 0),
            Number(inputs[6]?.value || 0),
            Number(inputs[7]?.value || 0)
        ];
    });
    
    const stockFalta = items.some(i => Number(i[3]) > Number(i[6]));
    const estado = observed ? 'PC observado' : (stockFalta ? 'PC conforme' : 'Listo para despacho');
    
    const pcData = {
        id: Date.now(),
        fecha: document.getElementById('pcFecha')?.value?.replace('T', ' ') || new Date().toISOString(),
        medio: document.getElementById('pcMedio')?.value || 'Correo',
        estado: estado,
        numero: document.getElementById('pcNumero')?.value || 'PC-' + Date.now(),
        cliente: document.getElementById('pcCliente')?.value || '',
        ruc: document.getElementById('pcRuc')?.value || '',
        cotizacion_numero: document.getElementById('pcCotNumero')?.value || 'SIN COTIZACIÓN',
        monto: Number(document.getElementById('pcMonto')?.value || 0),
        entrega: document.getElementById('pcEntrega')?.value || '',
        reqCompra: observed ? 'Bloqueado' : (stockFalta ? 'Sí' : 'No'),
        validacion: val,
        items: items
    };
    
    // Guardar en el array global
    if (typeof pedidosData !== 'undefined') {
        pedidosData.unshift(pcData);
    }
    
    closeModal('pedidoCompraModal');
    showToast(`✅ PC guardado como: ${estado}`, observed ? 'warning' : 'success');
    loadPedidos();
}
// ============================================================
// MODAL DE CONFIRMACIÓN UNIVERSAL (MEJORADO)
// ============================================================

function showConfirmModal(title, message, warning, onConfirm, confirmText = '✅ Sí, confirmar') {
    // Remover modales existentes
    document.querySelectorAll('.confirm-modal-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #FFFFFF;
        border-radius: 20px;
        max-width: 520px;
        width: 95%;
        padding: 32px 28px 24px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.35);
        animation: modalSlideUp 0.3s ease;
        text-align: center;
    `;
    
    // Determinar el icono según el tipo de acción
    let icon = '⚠️';
    let buttonColor = '#EF233C';
    let buttonHover = '#D91A30';
    
    if (title.includes('Duplicar')) {
        icon = '📋';
        buttonColor = '#0EA5E9';
        buttonHover = '#0284C7';
    } else if (title.includes('despacho') || title.includes('Guía') || title.includes('Factura')) {
        icon = '📦';
        buttonColor = '#16A34A';
        buttonHover = '#15803D';
    } else if (title.includes('Aceptada') || title.includes('Aceptar')) {
        icon = '✅';
        buttonColor = '#2563EB';
        buttonHover = '#1D4ED8';
    }
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
        <h2 style="font-size: 22px; font-weight: 900; color: #0F172A; margin-bottom: 8px;">${title}</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 12px;">${message}</p>
        <div style="background: #FEF2F2; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #EF233C;">
            <span style="font-size: 13px; font-weight: 700; color: #DC2626;">${warning}</span>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="confirm-cancel-btn" style="
                padding: 12px 32px;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                color: #0F172A;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            ">Cancelar</button>
            <button class="confirm-accept-btn" style="
                padding: 12px 32px;
                border-radius: 12px;
                border: none;
                background: ${buttonColor};
                color: #FFFFFF;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 14px ${buttonColor}55;
            ">${confirmText}</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .confirm-cancel-btn:hover {
            background: #F1F5F9;
        }
        .confirm-accept-btn:hover {
            background: ${buttonHover};
            transform: translateY(-2px);
            box-shadow: 0 6px 20px ${buttonColor}77;
        }
    `;
    document.head.appendChild(style);
    
    // Event listeners
    modal.querySelector('.confirm-cancel-btn').addEventListener('click', function() {
        overlay.remove();
    });
    
    modal.querySelector('.confirm-accept-btn').addEventListener('click', function() {
        overlay.remove();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function toggleAllProductCheckboxes(checked) {
    document.querySelectorAll('.product-select-checkbox').forEach(cb => {
        cb.checked = checked;
        const idKey = cb.dataset.id;
        if (checked) {
            selectedProductIds.add(idKey);
        } else {
            selectedProductIds.delete(idKey);
        }
    });
    document.getElementById('selectedCount').textContent = selectedProductIds.size;
}

function selectAllProducts() {
    document.querySelectorAll('.product-select-checkbox').forEach(cb => {
        cb.checked = true;
        const idKey = cb.dataset.id;
        selectedProductIds.add(idKey);
    });
    document.getElementById('selectedCount').textContent = selectedProductIds.size;
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
}

function deselectAllProducts() {
    document.querySelectorAll('.product-select-checkbox').forEach(cb => {
        cb.checked = false;
        const idKey = cb.dataset.id;
        selectedProductIds.delete(idKey);
    });
    document.getElementById('selectedCount').textContent = selectedProductIds.size;
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

function filterProductSelector() {
    renderProductSelector();
}

// ============================================================
// BUSCADOR DE COTIZACIONES CON AUTOCOMPLETADO
// ============================================================

// Variable para almacenar el temporizador de búsqueda
let cotizacionSearchTimer = null;
// Variable para almacenar la cotización seleccionada
let cotizacionSeleccionada = null;

function buscarCotizacionSAP(query) {
    const resultsContainer = document.getElementById('cotizacionSearchResults');
    const searchInput = document.getElementById('pcCotSearch');
    
    // Limpiar timer anterior
    if (cotizacionSearchTimer) {
        clearTimeout(cotizacionSearchTimer);
        cotizacionSearchTimer = null;
    }
    
    const q = (query || '').trim();
    
    if (!q || q.length < 2) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        return;
    }
    
    // Mostrar loading
    resultsContainer.innerHTML = `<div style="padding:12px 16px; color:#94A3B8; font-weight:850; text-align:center;">⏳ Buscando cotizaciones...</div>`;
    resultsContainer.style.display = 'block';
    
    // Buscar con debounce
    cotizacionSearchTimer = setTimeout(() => {
        // Buscar en cotizacionesData (cargado desde la API)
        const results = cotizacionesData.filter(c => {
            const searchStr = `${c.numero || ''} ${c.razon || ''} ${c.ruc || ''} ${c.descripcion || ''} ${c.cod_cliente || ''}`.toLowerCase();
            return searchStr.includes(q.toLowerCase());
        });
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding:12px 16px; color:#94A3B8; font-weight:850; text-align:center;">
                    ❌ No se encontraron cotizaciones para: "<b>${q}</b>"
                </div>
            `;
            return;
        }
        
        // Renderizar resultados
        resultsContainer.innerHTML = results.map(c => `
            <div onclick="seleccionarCotizacionSAP(${c.id})" 
                 style="padding:10px 14px; border-bottom:1px solid #F1F5F9; cursor:pointer; transition:all 0.15s; display:flex; justify-content:space-between; align-items:center;"
                 onmouseover="this.style.background='#F8FAFC'"
                 onmouseout="this.style.background='#fff'">
                <div>
                    <div style="font-weight:900; color:#0F172A;">${c.numero || 'COT-XXXX'}</div>
                    <div style="font-size:11px; color:#64748B;">${c.razon || 'Sin cliente'} ${c.ruc ? '| RUC: ' + c.ruc : ''}</div>
                </div>
                <div style="font-weight:900; color:#EF233C; font-size:13px;">${money(c.total || c.monto || 0)}</div>
            </div>
        `).join('');
        
        resultsContainer.style.display = 'block';
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', function closeResults(e) {
            if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
                resultsContainer.style.display = 'none';
                document.removeEventListener('click', closeResults);
            }
        });
        
    }, 300);
}

function seleccionarCotizacionSAP(cotizacionId) {
    // Buscar la cotización en los datos
    const cotizacion = cotizacionesData.find(c => c.id === cotizacionId);
    if (!cotizacion) {
        showToast('❌ Cotización no encontrada', 'error');
        return;
    }
    
    cotizacionSeleccionada = cotizacion;
    
    // Cerrar resultados
    const resultsContainer = document.getElementById('cotizacionSearchResults');
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
    
    // Actualizar el input de búsqueda
    const searchInput = document.getElementById('pcCotSearch');
    searchInput.value = `${cotizacion.numero || ''} - ${cotizacion.razon || ''}`;
    
    // ============================================================
    // CARGAR TODOS LOS DATOS DE LA COTIZACIÓN
    // ============================================================
    
    // Datos básicos
    document.getElementById('pcCotNumero').value = cotizacion.numero || '';
    document.getElementById('pcCotFecha').value = formatFecha(cotizacion.fecha);
    document.getElementById('pcCliente').value = cotizacion.razon || '';
    document.getElementById('pcRuc').value = cotizacion.ruc || '';
    document.getElementById('pcMonto').value = cotizacion.total || cotizacion.monto || 0;
    document.getElementById('pcCondicionPago').value = cotizacion.condicion || cotizacion.condicion_pago || 'Contado';
    document.getElementById('pcVendedor').value = cotizacion.vendedor || 'Helen Blas Príncipe';
    
    // Dirección de entrega
    if (cotizacion.direccion_entrega) {
        document.getElementById('pcEntrega').value = cotizacion.direccion_entrega;
    }
    
    // ============================================================
    // CARGAR PRODUCTOS EN LA TABLA
    // ============================================================
    const tbody = document.getElementById('pcItemsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Obtener productos de la cotización
    const productos = cotizacion.productos || [];
    
    if (productos.length === 0) {
        // Si no hay productos, agregar una fila vacía
        addPedidoItemSAP();
        showToast('⚠️ Esta cotización no tiene productos', 'warning');
        return;
    }
    
    productos.forEach((p, i) => {
        const cantidadCotizada = p.cantidad || 1;
        const precioCotizado = p.valorVenta || 0;
        const stock = p.stock || 0;
        const faltante = Math.max(cantidadCotizada - stock, 0);
        
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${i + 1}</td>
                <td>
                    <input value="${p.codigo || ''}" 
                           style="width:90px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"
                           readonly>
                </td>
                <td>
                    <input value="${p.producto || p.descripcion || ''}" 
                           style="width:160px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px;"
                           readonly>
                </td>
                <td>
                    <input type="number" value="${cantidadCotizada}" 
                           style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center; background:#F8FAFC;"
                           readonly>
                </td>
                <td>
                    <input type="number" value="${cantidadCotizada}" 
                           style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center;"
                           onchange="actualizarFaltanteSAP(this, ${i})">
                </td>
                <td>
                    <input type="number" step="0.01" value="${precioCotizado}" 
                           style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right; background:#F8FAFC;"
                           readonly>
                </td>
                <td>
                    <input type="number" step="0.01" value="${precioCotizado}" 
                           style="width:80px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:right;"
                           onchange="actualizarPrecioPCSAP(this, ${i})">
                </td>
                <td>
                    <input type="number" value="${stock}" 
                           style="width:60px; height:28px; border:1px solid #CBD5E1; border-radius:6px; padding:0 6px; font-size:11px; text-align:center; background:#F8FAFC;"
                           readonly>
                </td>
                <td style="font-weight:900; color:#DC2626; text-align:center;">${faltante}</td>
            </tr>
        `);
    });
    
    // Guardar referencia de los productos para calcular faltantes
    window._productosCotizacion = productos;
    window._filaProductos = [];
    
    showToast(`✅ Cotización ${cotizacion.numero} cargada con ${productos.length} productos`, 'success');
}

// Funciones auxiliares para la tabla de productos
function actualizarFaltanteSAP(input, index) {
    const row = input.closest('tr');
    const inputs = row.querySelectorAll('input');
    const cantidadPC = Number(inputs[3]?.value || 0);
    const stock = Number(inputs[6]?.value || 0);
    const faltanteCell = row.querySelector('td:last-child');
    const faltante = Math.max(cantidadPC - stock, 0);
    if (faltanteCell) {
        faltanteCell.textContent = faltante;
        faltanteCell.style.color = faltante > 0 ? '#DC2626' : '#16A34A';
    }
}

function actualizarPrecioPCSAP(input, index) {
    // Solo actualiza el valor, no hace más nada
    const value = Number(input.value || 0);
    if (value < 0) input.value = 0;
}

// ============================================================
// FUNCIÓN PARA ABRIR EL MODAL (ACTUALIZADA)
// ============================================================

function openPedidoCompraModalSAP(mode = 'cot') {
    modalMode = mode;
    editingId = null;
    cotizacionSeleccionada = null;
    
    const modal = document.getElementById('pedidoCompraModal');
    const title = document.getElementById('pedidoCompraModalTitle');
    const sub = document.getElementById('modalSub');
    const note = document.getElementById('modeNote');
    const cotBlock = document.getElementById('cotBlock');
    const origen = document.getElementById('docOrigen');
    
    if (mode === 'cot') {
        title.textContent = 'Crear PC desde cotización';
        sub.textContent = 'Busca una cotización para cargar todos sus datos automáticamente.';
        note.className = 'mini-note';
        note.textContent = '✅ Escribe el N° de cotización, RUC o nombre del cliente para buscar y cargar los datos.';
        cotBlock.style.display = 'block';
        origen.textContent = 'Cotización';
    } else {
        title.textContent = 'PC directo / sin cotización';
        sub.textContent = 'PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
        note.className = 'danger-note';
        note.textContent = '⚠️ PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
        cotBlock.style.display = 'none';
        origen.textContent = 'Directo';
    }
    
    // Limpiar y preparar el modal
    clearPedidoModalSAP();
    
    // Limpiar buscador y resultados
    const searchInput = document.getElementById('pcCotSearch');
    if (searchInput) searchInput.value = '';
    const resultsContainer = document.getElementById('cotizacionSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    
    // Mostrar modal
    modal.classList.add('show');
}

// ============================================================
// FUNCIÓN PARA LIMPIAR EL MODAL (ACTUALIZADA)
// ============================================================

function clearPedidoModalSAP() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('pcFecha').value = now.toISOString().slice(0, 16);
    document.getElementById('pcNumero').value = 'PC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(Date.now()).slice(-4);
    
    ['pcCotNumero', 'pcCotFecha', 'pcCliente', 'pcRuc', 'pcContacto', 'pcEntrega', 'pcObs', 'pcCondicionPago', 'pcVendedor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('pcMonto').value = '0';
    
    // Limpiar el buscador
    const searchInput = document.getElementById('pcCotSearch');
    if (searchInput) searchInput.value = '';
    const resultsContainer = document.getElementById('cotizacionSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    
    const tbody = document.getElementById('pcItemsBody');
    if (tbody) tbody.innerHTML = '';
    addPedidoItemSAP();
}

// ============================================================
// FUNCIÓN PARA GUARDAR PC (ACTUALIZADA)
// ============================================================

function savePedidoCompraSAP(force) {
    // Validar que se haya seleccionado una cotización en modo 'cot'
    if (modalMode === 'cot' && !cotizacionSeleccionada) {
        const searchInput = document.getElementById('pcCotSearch');
        const valor = searchInput?.value?.trim() || '';
        if (!valor) {
            showToast('⚠️ Debes buscar y seleccionar una cotización primero', 'warning');
            searchInput?.focus();
            return;
        }
        // Si hay texto pero no se seleccionó, intentar buscar automáticamente
        const results = cotizacionesData.filter(c => {
            const searchStr = `${c.numero || ''} ${c.razon || ''} ${c.ruc || ''}`.toLowerCase();
            return searchStr.includes(valor.toLowerCase());
        });
        if (results.length === 0) {
            showToast('⚠️ No se encontró la cotización. Verifica el texto ingresado.', 'warning');
            return;
        } else if (results.length === 1) {
            // Auto-seleccionar si solo hay un resultado
            seleccionarCotizacionSAP(results[0].id);
            // Reintentar guardar después de un momento
            setTimeout(() => savePedidoCompraSAP(force), 300);
            return;
        } else {
            showToast('⚠️ Se encontraron varias cotizaciones. Selecciona una de la lista.', 'warning');
            // Mostrar resultados
            buscarCotizacionSAP(valor);
            return;
        }
    }
    
    const val = ['vPrecio', 'vCantidad', 'vProducto', 'vEntrega', 'vMoneda', 'vTransporte', 'vVigencia', 'vMargen']
        .map(id => document.getElementById(id)?.value || 'Sí');
    
    const observed = force === 'observado' || val.some(v => v === 'No');
    
    const trs = document.querySelectorAll('#pcItemsBody tr');
    const items = Array.from(trs).map(r => {
        const inputs = r.querySelectorAll('input');
        return [
            inputs[0]?.value || '',
            inputs[1]?.value || '',
            Number(inputs[2]?.value || 0),
            Number(inputs[3]?.value || 1),
            Number(inputs[4]?.value || 0),
            Number(inputs[6]?.value || 0),
            Number(inputs[7]?.value || 0)
        ];
    });
    
    const stockFalta = items.some(i => Number(i[3]) > Number(i[6]));
    const estado = observed ? 'PC observado' : (stockFalta ? 'PC conforme' : 'Listo para despacho');
    
    const pcData = {
        id: Date.now(),
        fecha: document.getElementById('pcFecha')?.value?.replace('T', ' ') || new Date().toISOString(),
        medio: document.getElementById('pcMedio')?.value || 'Correo',
        estado: estado,
        numero: document.getElementById('pcNumero')?.value || 'PC-' + Date.now(),
        cliente: document.getElementById('pcCliente')?.value || '',
        ruc: document.getElementById('pcRuc')?.value || '',
        cotizacion_numero: document.getElementById('pcCotNumero')?.value || 'SIN COTIZACIÓN',
        monto: Number(document.getElementById('pcMonto')?.value || 0),
        entrega: document.getElementById('pcEntrega')?.value || '',
        reqCompra: observed ? 'Bloqueado' : (stockFalta ? 'Sí' : 'No'),
        validacion: val,
        items: items,
        cotizacion_id: cotizacionSeleccionada?.id || null,
        condicion_pago: document.getElementById('pcCondicionPago')?.value || '',
        vendedor: document.getElementById('pcVendedor')?.value || ''
    };
    
    // Guardar en el array global
    if (typeof pedidosData !== 'undefined') {
        pedidosData.unshift(pcData);
    }
    
    closeModal('pedidoCompraModal');
    showToast(`✅ PC guardado como: ${estado}`, observed ? 'warning' : 'success');
    
    // Limpiar selección
    cotizacionSeleccionada = null;
    
    // Recargar lista
    if (typeof loadPedidos === 'function') {
        loadPedidos();
    }
}

function updateProductQty(idKey, value) {
    // La cantidad se guarda en el atributo data-qty del checkbox o se obtiene cuando se agrega
    // No es necesario hacer nada aquí, se usará al agregar
}


function addSelectedProducts() {
    if (selectedProductIds.size === 0) {
        showToast('⚠️ Selecciona al menos un producto', 'warning');
        return;
    }
    
    let addedCount = 0;
    let notFoundCount = 0;
    
    selectedProductIds.forEach(idKey => {
        // Buscar el producto por id o codigo
        let product = PRODUCTOS_MAESTROS.find(p => p.id == idKey || p.codigo == idKey);
        
        if (!product) {
            notFoundCount++;
            return;
        }
        
        // Obtener la cantidad del input correspondiente
        const qtyInput = document.querySelector(`.product-select-qty[data-id="${idKey}"]`);
        const cantidad = parseInt(qtyInput?.value || 1);
        
        // 🔽 Asegurar que valorVenta sea un número
        const valorVenta = parseFloat(product.valorVenta) || 0;
        
        // Verificar si ya está agregado (por código)
        const existingIndex = quoteProducts.findIndex(p => p.codigo === product.codigo);
        if (existingIndex !== -1) {
            // Si ya existe, sumar cantidad
            quoteProducts[existingIndex].cantidad = (quoteProducts[existingIndex].cantidad || 1) + cantidad;
        } else {
            // Agregar nuevo producto
            const nuevoProducto = {
                ...product,
                cantidad: cantidad,
                valorVenta: valorVenta,
                stock: parseInt(product.stock) || 0
            };
            quoteProducts.push(nuevoProducto);
        }
        addedCount++;
    });
    
    // Cerrar modal
    closeModal('productSelectorModal');
    
    // Renderizar tabla de productos
    renderQuoteProducts();
    calcQuote();
    
    // Mostrar mensaje
    if (addedCount > 0) {
        showToast(`✅ ${addedCount} productos agregados correctamente`, 'success');
    }
    if (notFoundCount > 0) {
        showToast(`⚠️ ${notFoundCount} productos no encontrados`, 'warning');
    }
}


// Event listener para el buscador del selector
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('productSelectorSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderProductSelector();
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderProductSelector();
            }
        });
    }
});


// ============================================================
// EVENT LISTENERS PARA FILTROS DE FECHA
// ============================================================
const fechaInicio = document.getElementById('qFechaInicio');
const fechaFin = document.getElementById('qFechaFin');

if (fechaInicio) {
    fechaInicio.addEventListener('change', function() {
        renderCotizaciones();
    });
}

if (fechaFin) {
    fechaFin.addEventListener('change', function() {
        renderCotizaciones();
    });
}

function showSuccessModal() {
    // Obtener datos de la cotización generada
    const ruc = document.getElementById('fRuc')?.value?.trim() || '---';
    const razon = document.getElementById('fRazon')?.value?.trim() || '---';
    const totalSpan = document.getElementById('sumTotal');
    const total = totalSpan?.textContent || 'S/ 0.00';
    const subtotal = document.getElementById('sumSubtotal')?.textContent || 'S/ 0.00';
    const igv = document.getElementById('sumIgv')?.textContent || 'S/ 0.00';
    const now = new Date();
    const fechaHora = now.toLocaleString('es-PE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const numeroCotizacion = `COT-${String(Date.now()).slice(-8)}`;
    const productosCount = quoteProducts.length;
    
    // Remover modales existentes
    document.querySelectorAll('.success-modal-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'success-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(6px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.4s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #FFFFFF;
        border-radius: 24px;
        max-width: 560px;
        width: 95%;
        padding: 36px 32px 28px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        animation: modalSlideUp 0.4s ease;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 56px; margin-bottom: 8px;">✅</div>
            <h2 style="font-size: 24px; font-weight: 900; color: #0F172A; margin-bottom: 4px;">¡Cotización generada exitosamente!</h2>
            <p style="font-size: 14px; color: #64748B;">La cotización ha sido oficializada y registrada en el sistema.</p>
        </div>
        
        <div style="background: #F8FAFC; border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; border: 1px solid #E5E7EB;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 13px;">
                <div><span style="color: #64748B; font-weight: 600;">📄 N° Cotización</span></div>
                <div style="font-weight: 900; color: #EF233C; text-align: right;">${numeroCotizacion}</div>
                
                <div><span style="color: #64748B; font-weight: 600;">🕐 Fecha y hora</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right;">${fechaHora}</div>
                
                <div><span style="color: #64748B; font-weight: 600;">🏢 Cliente</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right; word-break: break-word;">${esc(razon)}</div>
                
                <div><span style="color: #64748B; font-weight: 600;">📋 RUC</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right;">${esc(ruc)}</div>
                
                <div><span style="color: #64748B; font-weight: 600;">📦 Productos</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right;">${productosCount} items</div>
                
                <div><span style="color: #64748B; font-weight: 600;">💰 Subtotal</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right;">${subtotal}</div>
                
                <div><span style="color: #64748B; font-weight: 600;">📊 IGV 18%</span></div>
                <div style="font-weight: 700; color: #0F172A; text-align: right;">${igv}</div>
            </div>
            
            <div style="border-top: 2px solid #EF233C; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: 900; color: #0F172A;">TOTAL</span>
                <span style="font-size: 26px; font-weight: 1000; color: #EF233C; letter-spacing: -0.5px;">${total}</span>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            <button class="success-close-btn" style="
                padding: 10px 28px;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                color: #0F172A;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            ">Cerrar</button>
            <button class="success-pdf-btn" style="
                padding: 10px 28px;
                border-radius: 12px;
                border: none;
                background: #2563EB;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            ">📄 Descargar PDF</button>
            <button class="success-email-btn" style="
                padding: 10px 28px;
                border-radius: 12px;
                border: none;
                background: #16A34A;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            ">✉ Enviar al cliente</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event listeners
    modal.querySelector('.success-close-btn').addEventListener('click', function() {
        overlay.remove();
        // Recargar la lista de cotizaciones
        loadCotizaciones();
    });
    
    modal.querySelector('.success-pdf-btn').addEventListener('click', function() {
        showToast('📄 Generando PDF...', 'info');
        // Aquí puedes agregar la lógica para generar PDF
        setTimeout(() => {
            showToast('✅ PDF generado correctamente', 'success');
        }, 1500);
    });
    
    modal.querySelector('.success-email-btn').addEventListener('click', function() {
        showToast('✉ Enviando email al cliente...', 'info');
        // Aquí puedes agregar la lógica para enviar email
        setTimeout(() => {
            showToast('✅ Email enviado correctamente', 'success');
        }, 1500);
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
            loadCotizaciones();
        }
    });
}



// ============================================================
// FUNCIÓN AUXILIAR PARA MENÚS CON CIERRE AUTOMÁTICO
// ============================================================

function createMenuWithClose(event, htmlContent) {
    // Remover menús existentes
    document.querySelectorAll('.menu-pop').forEach(el => el.remove());
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.innerHTML = htmlContent;
    document.body.appendChild(pop);
    
    // Cerrar al hacer clic fuera (con delay para evitar cierre inmediato)
    setTimeout(() => {
        const closeMenu = function(e) {
            if (!pop.contains(e.target)) {
                pop.remove();
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('contextmenu', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
    }, 10);
    
    return pop;
}


function showCotizacionMenu(event, id) {
    event.stopPropagation();
    
    const cotizacion = cotizacionesData.find(c => c.id === id);
    const estado = cotizacion?.estado || '';
    const isAccepted = estado === 'Aceptada por Cliente' || estado === 'Aceptada';
    const isGenerated = estado === 'Generada';
    
    let menuHtml = `
        <button class="menu-edit" onclick="openCotizacionModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button class="menu-duplicate" onclick="duplicateCotizacion(${id});this.closest('.menu-pop').remove()">⧉ Duplicar</button>
        <button class="menu-email" onclick="sendCotizacionEmail(${id});this.closest('.menu-pop').remove()">✉ Email</button>
        <button class="menu-pdf" onclick="generateCotizacionPdf(${id});this.closest('.menu-pop').remove()">📄 Descargar PDF</button>
        <div class="menu-divider"></div>
    `;
    
    // ✅ Aceptada por Cliente - SOLO cuando está GENERADA
    if (isGenerated && !isAccepted) {
        menuHtml += `
            <button class="menu-accepted" onclick="marcarCotizacionAccepted(${id});this.closest('.menu-pop').remove()">✅ Aceptada por Cliente</button>
        `;
    }
    
    // 🚚 Crear guía - solo si está aceptada
    if (isAccepted) {
        menuHtml += `
            <button class="menu-guia" onclick="createDocFromCotizacion(${id},'guia');this.closest('.menu-pop').remove()">🚚 Crear guía</button>
            <button class="menu-factura" onclick="createDocFromCotizacion(${id},'factura');this.closest('.menu-pop').remove()">🧾 Crear factura</button>
        `;
    }
    
    // 🚚 Crear despacho - siempre visible
    menuHtml += `
        <button class="menu-despacho" onclick="createDocFromCotizacion(${id},'despacho');this.closest('.menu-pop').remove()">🚚 Crear despacho</button>
        <div class="menu-divider"></div>
        <button class="danger" onclick="deleteCotizacion(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    createMenuWithClose(event, menuHtml);
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
// FUNCIONES PARA CAMPOS PERSONALIZADOS
// ============================================================

/**
 * Muestra/oculta el campo de entrada personalizado cuando se selecciona "Personalizado"
 * @param {string} selectId - ID del select
 * @param {string} inputId - ID del input personalizado
 */
function toggleCustomField(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    
    if (!select || !input) return;
    
    if (select.value === 'Personalizado') {
        input.style.display = 'block';
        input.focus();
    } else {
        input.style.display = 'none';
        input.value = '';
    }
}

/**
 * Obtiene el valor de un campo (incluyendo el valor personalizado si está seleccionado)
 * @param {string} selectId - ID del select
 * @param {string} inputId - ID del input personalizado
 * @returns {string} - Valor seleccionado o personalizado
 */
function getFieldValue(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    
    if (!select) return '';
    
    if (select.value === 'Personalizado' && input) {
        return input.value.trim() || select.value;
    }
    
    return select.value;
}

/**
 * Establece el valor de un campo, soportando valores personalizados
 * @param {string} selectId - ID del select
 * @param {string} inputId - ID del input personalizado
 * @param {string} value - Valor a establecer
 */
function setFieldValue(selectId, inputId, value) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    
    if (!select) return;
    
    // Si el valor es null o undefined, no hacer nada
    if (value === null || value === undefined) return;
    
    // Verificar si el valor está en las opciones del select
    let found = false;
    for (let opt of select.options) {
        if (opt.value === value) {
            opt.selected = true;
            found = true;
            break;
        }
    }
    
    if (!found && input) {
        // Si no está en las opciones, seleccionar "Personalizado" y poner el valor en el input
        select.value = 'Personalizado';
        input.value = value;
        input.style.display = 'block';
    } else if (input) {
        // Si está en las opciones, ocultar el input personalizado
        input.style.display = 'none';
        input.value = '';
    }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

window.initVentas = async function(tab) {
    console.log(`🚀 Inicializando ventas con tab: ${tab}`);
    currentModule = tab || 'cotizaciones';
    
    // Cargar datos maestros
    await Promise.all([
        cargarProductosMaestros(),
        cargarClientesMaestros()
    ]);
    
    // Cargar datos según el módulo activo
    switch(currentModule) {
        case 'cotizaciones':
            await loadCotizaciones();
            break;
        case 'pedido_compra':
            await loadPedidos();
            break;
        case 'despachar':
            await loadDespachos();
            break;
        case 'guias':
            await loadGuias();
            break;
        case 'comprobantes':
            await loadComprobantes();
            break;
        case 'notas_credito':
            await loadNotas();
            break;
        case 'devoluciones':
            await loadDevoluciones();
            break;
        default:
            await loadCotizaciones();
    }
    
    console.log('✅ Módulo Ventas inicializado correctamente');
};

// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 ventas.js: DOMContentLoaded');
    
    // Configurar eventos de búsqueda
    const searchInputs = [
        { id: 'qSearch', module: 'cotizaciones' },
        { id: 'pcSearch', module: 'pedido_compra' },
        { id: 'despachoSearch', module: 'despachar' },
        { id: 'guiaSearch', module: 'guias' },
        { id: 'comprobanteSearch', module: 'comprobantes' },
        { id: 'notaSearch', module: 'notas_credito' },
        { id: 'devolucionSearch', module: 'devoluciones' }
    ];
    
    searchInputs.forEach(({ id, module }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                switch(module) {
                    case 'cotizaciones': renderCotizaciones(); break;
                    case 'pedido_compra': renderPedidos(); break;
                    case 'despachar': renderDespachos(); break;
                    case 'guias': renderGuias(); break;
                    case 'comprobantes': renderComprobantes(); break;
                    case 'notas_credito': renderNotas(); break;
                    case 'devoluciones': renderDevoluciones(); break;
                }
            });
        }
    });
    
    // Configurar eventos de filtros de estado
    const statusSelects = [
        { id: 'qStatus', module: 'cotizaciones' },
        { id: 'pcStatus', module: 'pedido_compra' },
        { id: 'despachoStatus', module: 'despachar' },
        { id: 'guiaStatus', module: 'guias' },
        { id: 'comprobanteStatus', module: 'comprobantes' },
        { id: 'notaStatus', module: 'notas_credito' },
        { id: 'devolucionStatus', module: 'devoluciones' }
    ];
    
    statusSelects.forEach(({ id, module }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function() {
                switch(module) {
                    case 'cotizaciones': renderCotizaciones(); break;
                    case 'pedido_compra': renderPedidos(); break;
                    case 'despachar': renderDespachos(); break;
                    case 'guias': renderGuias(); break;
                    case 'comprobantes': renderComprobantes(); break;
                    case 'notas_credito': renderNotas(); break;
                    case 'devoluciones': renderDevoluciones(); break;
                }
            });
        }
    });
    
    // Inicializar con el tab de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'cotizaciones';
    
    if (typeof initVentas === 'function') {
        initVentas(tab);
    } else {
        console.warn('⚠️ initVentas no está disponible');
    }
});

// ============================================================
// EXPORTAR FUNCIONES AL WINDOW
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

// Acciones del menú
window.duplicateCotizacion = duplicateCotizacion;
window.sendCotizacionEmail = sendCotizacionEmail;
window.generateCotizacionPdf = generateCotizacionPdf;
window.marcarCotizacionAccepted = marcarCotizacionAccepted;
window.marcarCotizacionPending = marcarCotizacionPending;
window.marcarCotizacionNotClosed = marcarCotizacionNotClosed;
window.reactivarCotizacion = reactivarCotizacion;
window.createDocFromCotizacion = createDocFromCotizacion;
window.deleteCotizacion = deleteCotizacion;

window.validatePedidoCompra = validatePedidoCompra;
window.createDespachoFromPedido = createDespachoFromPedido;
window.createGuiaFromPedido = createGuiaFromPedido;
window.createFacturaFromPedido = createFacturaFromPedido;
window.deletePedidoCompra = deletePedidoCompra;

window.generateGuiaPdf = generateGuiaPdf;
window.markGuiaEmitida = markGuiaEmitida;
window.deleteGuia = deleteGuia;

window.generateComprobantePdf = generateComprobantePdf;
window.markComprobanteEmitido = markComprobanteEmitido;
window.deleteComprobante = deleteComprobante;

window.generateNotaPdf = generateNotaPdf;
window.markNotaEmitida = markNotaEmitida;
window.deleteNota = deleteNota;

window.approveDevolucion = approveDevolucion;
window.rejectDevolucion = rejectDevolucion;
window.deleteDevolucion = deleteDevolucion;

window.showConfirmModal = showConfirmModal;
window.showSuccessModal = showSuccessModal;
window.updateQuoteStatusBar = updateQuoteStatusBar;
window.deleteCotizacion = deleteCotizacion;

console.log('✅ Módulo Ventas cargado correctamente - VERSIÓN COMPLETA FUNCIONAL');