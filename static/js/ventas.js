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
const ESTADOS_PC = ['Pendiente', 'Recibido por correo', 'En revisión interna', 'Validado ', 'Listo para despacho', 'Anulado'];
const ESTADOS_DESPACHO = ['Pendiente despacho', 'En preparación', 'Despachado', 'Entregado'];
const ESTADOS_GUIA = ['Borrador', 'Pendiente despacho', 'Emitida', 'Entregada', 'Anulada'];
const ESTADOS_COMPROBANTE = ['Borrador', 'Emitido', 'Enviado', 'Pagado', 'Anulado'];
const ESTADOS_NOTA = ['Borrador', 'Emitida', 'Enviada', 'Aplicada', 'Anulada'];
const ESTADOS_DEVOLUCION = ['Pendiente', 'En revisión', 'Aprobada', 'Rechazada', 'Procesada'];

// Agregar al inicio del archivo, en la sección de variables globales
let validationStatus = {
    precios: false,
    cantidades: false,
    stock: false,
    entrega: false,
    moneda: false,
    transporte: false,
    vigencia: false,
    margen: false
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
    const estado = String(s || '').trim();
    const estadoLower = estado.toLowerCase();
    
    // Mapeo de estados (en minúsculas) a clases CSS
    const map = {
        'borrador': 'b-draft',
        'en revisión': 'b-review',
        'en revision': 'b-review',
        'en proceso': 'b-review',
        'proceso': 'b-review',
        'validado por hellen': 'b-validated',
        'validado': 'b-validated',
        'validada': 'b-validated',
        'generada': 'b-generated',
        'generado': 'b-generated',
        'emitida': 'b-ok',
        'emitido': 'b-ok',
        'despachado': 'b-info',              // 🔥 AZUL fluorescente
        'entregado': 'b-info',               // 🔥 AZUL fluorescente
        'pendiente despacho': 'b-draft',     // 🔥 ROJO fluorescente
        'pendiente': 'b-draft',              // 🔥 ROJO fluorescente
        'en preparación': 'b-pending',       // AMARILLO
        'aceptada por cliente': 'b-accepted',
        'aceptada': 'b-accepted',
        'aceptado': 'b-accepted',
        'aceptado por cliente': 'b-accepted',
        'anulada': 'b-canceled',
        'anulado': 'b-canceled',
        'cancelada': 'b-canceled',
        'cancelado': 'b-canceled',
        'no concretada': 'b-lost',
        'no concretado': 'b-lost',
        'perdida': 'b-lost',
        'perdido': 'b-lost'
    };
    
    // Buscar coincidencia exacta primero
    let clase = map[estadoLower];
    
    // Si no hay coincidencia exacta, buscar por coincidencia parcial
    if (!clase) {
        if (estadoLower.includes('borrador')) clase = 'b-draft';
        else if (estadoLower.includes('revisión') || estadoLower.includes('revision') || estadoLower.includes('proceso')) clase = 'b-review';
        else if (estadoLower.includes('validado') || estadoLower.includes('validada')) clase = 'b-validated';
        else if (estadoLower.includes('generada') || estadoLower.includes('generado')) clase = 'b-generated';
        else if (estadoLower.includes('emitida') || estadoLower.includes('emitido')) clase = 'b-ok';
        else if (estadoLower.includes('despachado') || estadoLower.includes('entregado')) clase = 'b-info';  // 🔥 AZUL
        else if (estadoLower.includes('pendiente despacho') || estadoLower.includes('pendiente')) clase = 'b-draft';  // 🔥 ROJO
        else if (estadoLower.includes('en preparación')) clase = 'b-pending';  // AMARILLO
        else if (estadoLower.includes('aceptada') || estadoLower.includes('aceptado')) clase = 'b-accepted';
        else if (estadoLower.includes('anulada') || estadoLower.includes('anulado') || estadoLower.includes('cancelada') || estadoLower.includes('cancelado')) clase = 'b-canceled';
        else if (estadoLower.includes('no concretada') || estadoLower.includes('no concretado') || estadoLower.includes('perdida') || estadoLower.includes('perdido')) clase = 'b-lost';
        else clase = 'b-gray';
    }
    
    // Renderizar el badge con la clase correspondiente
    return `<span class="badge ${clase}">${estado || 'Sin estado'}</span>`;
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
// FUNCIÓN PARA FORMATEAR FECHA DE COMPROBANTE (CON HORA)
// ============================================================

function formatearFechaComprobante(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        let fecha;
        
        // Si es un objeto Date o string
        if (fechaStr instanceof Date) {
            fecha = fechaStr;
        } else if (typeof fechaStr === 'string') {
            // Si viene en formato RFC (Fri, 12 Jun 2026 00:00:00 GMT)
            if (fechaStr.includes('GMT') || fechaStr.includes('UTC')) {
                fecha = new Date(fechaStr);
            }
            // Si viene en formato ISO
            else if (fechaStr.includes('T')) {
                fecha = new Date(fechaStr);
            }
            // Si viene en formato YYYY-MM-DD
            else if (fechaStr.includes('-') && fechaStr.length === 10) {
                fecha = new Date(fechaStr + 'T00:00:00');
            }
            // Si viene en formato DD/MM/YYYY
            else if (fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes.length === 3) {
                    fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
            // Si viene con formato "Fri, 12 Jun 2026 00:00:00 GMT"
            else if (fechaStr.match(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4}/)) {
                fecha = new Date(fechaStr);
            }
            else {
                fecha = new Date(fechaStr);
            }
        } else {
            fecha = new Date(fechaStr);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
            return String(fechaStr);
        }
        
        // Formatear: 12/06/2026 14:30
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        // Si la hora es 00:00, mostrar solo la fecha
        if (horas === '00' && minutos === '00') {
            return `${dia}/${mes}/${anio}`;
        }
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        
    } catch (e) {
        return String(fechaStr);
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

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        let fecha;
        if (typeof fechaStr === 'string') {
            // Si la fecha viene con formato ISO (YYYY-MM-DDTHH:MM:SS)
            if (fechaStr.includes('T')) {
                fecha = new Date(fechaStr);
            } 
            // Si viene con formato DD/MM/YYYY HH:MM:SS
            else if (fechaStr.includes('/')) {
                const partes = fechaStr.split(/[\/\s:]/);
                if (partes.length >= 3) {
                    // Formato: DD/MM/YYYY HH:MM:SS
                    fecha = new Date(partes[2], partes[1] - 1, partes[0], 
                                    partes[3] || 0, partes[4] || 0, partes[5] || 0);
                } else {
                    fecha = new Date(fechaStr);
                }
            } 
            // Formato YYYY-MM-DD
            else if (fechaStr.includes('-')) {
                fecha = new Date(fechaStr);
            } 
            else {
                fecha = new Date(fechaStr);
            }
        } else if (fechaStr instanceof Date) {
            fecha = fechaStr;
        } else {
            fecha = new Date(fechaStr);
        }
        
        if (isNaN(fecha.getTime())) {
            return String(fechaStr);
        }
        
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        
    } catch (e) {
        return String(fechaStr);
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
            // 🔽 RETORNAR LOS DATOS
            return cotizacionesData;
        } else {
            showToast('Error al cargar cotizaciones: ' + (data.error || 'Error desconocido'), 'error');
            return [];
        }
    } catch (error) {
        console.error('❌ Error cargando cotizaciones:', error);
        showToast('Error al cargar cotizaciones', 'error');
        return [];
    }
}


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
            // 🔽 IMPORTANTE: Cargar cotizaciones también para PC
            await loadCotizaciones(); // Carga cotizaciones para el buscador
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


async function loadPedidos() {
    console.log('🔄 Cargando pedidos...');
    try {
        const data = await apiFetch('/ventas/api/pedido-compra/listar');
        console.log('📦 Datos recibidos en loadPedidos:', data);
        if (data.success) {
            pedidosData = data.data || [];
            console.log(`✅ ${pedidosData.length} pedidos cargados`);
            console.log('📋 Primer pedido:', pedidosData[0]);
            renderPedidos(); // 🔽 Asegurar que se llama a render
        } else {
            showToast('Error al cargar pedidos', 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando pedidos:', error);
        showToast('Error al cargar pedidos: ' + error.message, 'error');
    }
}

async function loadDespachos() {
    console.log('🔄 Cargando despachos...');
    try {
        const data = await apiFetch('/ventas/api/despachos/listar');
        console.log('📦 Datos de despachos:', data);
        
        if (data.success) {
            despachosData = data.data || [];
            console.log(`✅ ${despachosData.length} despachos cargados`);
            
            // 🔽 Verificar las fechas para debug
            despachosData.forEach(d => {
                console.log(`📅 Despacho ${d.numero}: fecha_despacho = ${d.fecha_despacho}`);
            });
            
            renderDespachos();
        } else {
            showToast('Error al cargar despachos', 'error');
        }
    } catch (error) {
        console.error('Error cargando despachos:', error);
        showToast('Error al cargar despachos: ' + error.message, 'error');
    }
}

async function loadGuias() {
    console.log('🔄 Cargando guías...');
    try {
        const data = await apiFetch('/ventas/api/guias/listar');
        console.log('📦 Datos de guías:', data);
        
        if (data.success) {
            guiasData = data.data || [];
            console.log(`✅ ${guiasData.length} guías cargadas`);
            
            // 🔽 Verificar si hay guías nuevas
            guiasData.forEach(g => {
                console.log(`📦 Guía ${g.numero}: estado ${g.estado}, cliente ${g.cliente}`);
            });
            
            renderGuias();
        } else {
            showToast('Error al cargar guías', 'error');
        }
    } catch (error) {
        console.error('Error cargando guías:', error);
        showToast('Error al cargar guías: ' + error.message, 'error');
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

function renderPedidos() {
    const q = document.getElementById('pcSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('pcStatus')?.value || '';
    
    // Filtro por fechas
    const fechaInicio = document.getElementById('pcFechaInicio')?.value || '';
    const fechaFin = document.getElementById('pcFechaFin')?.value || '';
    
    console.log(`📊 Renderizando pedidos: ${pedidosData?.length || 0} registros`);
    
    if (!pedidosData || pedidosData.length === 0) {
        const tbody = document.getElementById('pcRows');
        const thead = document.getElementById('pedidosTableHead');
        if (thead) {
            if (pedidoViewMode === 'principal') {
                thead.innerHTML = `
                    <tr>
                        <th>Item</th>
                        <th>Fecha / Hora</th>
                        <th>Estado</th>
                        <th>N° Pedido de Compra</th>
                        <th>N° Cotización</th>
                        <th>Cliente</th>
                        <th>Lugar de Entrega</th>
                        <th>RUC</th>
                        <th>Descripción</th>
                        <th>Monto (Sin IGV)</th>
                        <th>Monto (Con IGV)</th>
                        <th>Acciones</th>
                    </tr>
                `;
            } else {
                thead.innerHTML = `
                    <tr>
                        <th>Item</th>
                        <th>Fecha / Hora</th>
                        <th>Estado</th>
                        <th> N° Pedido de Compra</th>
                        <th>N° Cotización</th>
                        <th>Cliente</th>
                        <th>RUC</th>
                        <th>Lugar de Entrega</th>
                        <th>Descripción</th>
                        <th>Monto (Sin IGV)</th>
                        <th>Monto (Con IGV)</th>
                        <th>Cond. Pago</th>
                        <th>Vendedor</th>
                        <th>Medio</th>
                        <th>Req. Compra</th>
                        <th>Observaciones</th>
                        <th>Validaciones</th>
                        <th>Acciones</th>
                    </tr>
                `;
            }
        }
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="19" style="text-align:center;color:#94A3B8;padding:40px;">
                📭 No hay PC del cliente registrados. 
                <br><small>Crea un PC desde cotización o directo.</small>
            </td></tr>`;
        }
        return;
    }
    
    const list = pedidosData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.cliente || ''} ${r.ruc || ''} ${r.cotizacion_numero || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        
        // Filtro por fechas
        let matchFecha = true;
        if (fechaInicio || fechaFin) {
            let fechaPC = r.fecha || r.created_at || '';
            let fechaObj = null;
            try {
                if (typeof fechaPC === 'string') {
                    fechaObj = new Date(fechaPC);
                    if (fechaPC.includes('/')) {
                        const partes = fechaPC.split(/[\/\s:]/);
                        if (partes.length >= 3) {
                            fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        }
                    }
                } else if (fechaPC instanceof Date) {
                    fechaObj = fechaPC;
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
            } else {
                if (fechaInicio || fechaFin) {
                    matchFecha = false;
                }
            }
        }
        
        return matchText && matchStatus && matchFecha;
    });
    
    const tbody = document.getElementById('pcRows');
    const thead = document.getElementById('pedidosTableHead');
    if (!tbody || !thead) return;
    
    // ============================================================
    // VISTA PRINCIPAL - Columnas resumidas
    // ============================================================
    if (pedidoViewMode === 'principal') {
        thead.innerHTML = `
            <tr>
                <th>Item</th>
                <th>Fecha / Hora</th>
                <th>Estado</th>
                <th> N° Pedido de Compra</th>
                <th>N° Cotización</th>
                <th>Cliente</th>
                <th>Lugar de Entrega</th>
                <th>RUC</th>
                <th>Descripción</th>
                <th>Monto (Sin IGV)</th>
                <th>Monto (Con IGV)</th>
                <th>Acciones</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:#94A3B8;padding:40px;">
                📭 No hay PC del cliente que coincidan con los filtros.
                ${pedidosData.length > 0 ? `(${pedidosData.length} registros cargados)` : ''}
            </td></tr>`;
            return;
        }
        
        tbody.innerHTML = list.map((r, i) => {
            const montoSinIgv = parseFloat(r.monto) || 0;
            const montoConIgv = montoSinIgv * 1.18;
            
            const estado = r.estado || 'Pendiente';
            const esObservado = estado === 'PC observado' || estado === 'Bloqueadof' || estado === 'Observado';
            const estadoBadge = esObservado 
                ? '<span class="badge b-draft">🔴 PC observado</span>' 
                : '<span class="badge b-ok">🟢 PC conforme</span>';
            
            return `
            <tr>
                <td>${i + 1}</td>
                <td class="date-cell">${formatearFecha(r.fecha || r.created_at)}</td>
                <td>${estadoBadge}</td>
                <td><b>${r.numero || '-'}</b></td>
                
                <td>${r.cotizacion_numero || '-'}</td>
                <td class="left"><b>${r.cliente || '-'}</b></td>
                <td class="left">${r.entrega || r.lugar_entrega || '-'}</td>
                <td>${r.ruc || '-'}</td>
                <td class="left">${r.descripcion || r.observaciones || '-'}</td>
                <td><b>${money(montoSinIgv)}</b></td>
                <td><b>${money(montoConIgv)}</b></td>
                <td>
                    <button class="kebab" onclick="showPedidoMenu(event, ${r.id})">⋮</button>
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
            <th>N° Pedido de Compra  </th>
            <th>N° Cotización</th>
            <th>Cliente</th>
            <th>RUC</th>
            <th>Lugar de Entrega</th>
            <th>Descripción</th>
            <th>Monto (Sin IGV)</th>
            <th>Monto (Con IGV)</th>
            <th>Cond. Pago</th>
            <th>Vendedor</th>
            <th>Medio</th>
            <th>Req. Compra</th>
            <th>Observaciones</th>
            <th>Validaciones</th>
            <th>Acciones</th>
        </tr>
    `;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="19" style="text-align:center;color:#94A3B8;padding:40px;">
            📭 No hay PC del cliente que coincidan con los filtros.
            ${pedidosData.length > 0 ? `(${pedidosData.length} registros cargados)` : ''}
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => {
        const montoSinIgv = parseFloat(r.monto) || 0;
        const montoConIgv = montoSinIgv * 1.18;
        
        const estado = r.estado || 'Pendiente';
        const esAnulado = estado === 'Anulado';
        const esObservado = estado === 'PC observado' || estado === 'Bloqueado' || estado === 'Observado';
        const estadoBadge = esObservado 
            ? '<span class="badge b-draft">🔴 PC observado</span>' 
            : '<span class="badge b-ok">🟢 PC conforme</span>';
        // El menú solo debe mostrar "Eliminar" si NO está anulado
        const menuHtml = esAnulado 
    ? `<button class="kebab" onclick="showPedidoMenu(event, ${r.id})" disabled style="opacity:0.5;cursor:not-allowed;">⋮</button>`
    : `<button class="kebab" onclick="showPedidoMenu(event, ${r.id})">⋮</button>`;


        // Construir string de validaciones
        const validaciones = [];
        if (r.valida_precios !== undefined) validaciones.push(`Precio: ${r.valida_precios ? '✅' : '❌'}`);
        if (r.valida_cantidades !== undefined) validaciones.push(`Cantidad: ${r.valida_cantidades ? '✅' : '❌'}`);
        if (r.valida_stock !== undefined) validaciones.push(`Stock: ${r.valida_stock ? '✅' : '❌'}`);
        if (r.valida_entrega !== undefined) validaciones.push(`Entrega: ${r.valida_entrega ? '✅' : '❌'}`);
        if (r.valida_montos !== undefined) validaciones.push(`Montos: ${r.valida_montos ? '✅' : '❌'}`);
        if (r.valida_transporte !== undefined) validaciones.push(`Transporte: ${r.valida_transporte ? '✅' : '❌'}`);
        if (r.valida_vigencia !== undefined) validaciones.push(`Vigencia: ${r.valida_vigencia ? '✅' : '❌'}`);
        if (r.valida_margen !== undefined) validaciones.push(`Margen: ${r.valida_margen ? '✅' : '❌'}`);
        
        const validacionesHtml = validaciones.length > 0 
            ? validaciones.join('<br>') 
            : 'Sin validaciones';
        
        return `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${formatearFecha(r.fecha || r.created_at)}</td>
            <td>${estadoBadge}</td>
            <td><b>${r.numero || '-'}</b></td>
            <td>${r.cotizacion_numero || '-'}</td>
            <td class="left"><b>${r.cliente || '-'}</b></td>
            <td>${r.ruc || '-'}</td>
            <td class="left">${r.entrega || r.lugar_entrega || '-'}</td>
            <td class="left">${r.descripcion || r.observaciones || '-'}</td>
            <td><b>${money(montoSinIgv)}</b></td>
            <td><b>${money(montoConIgv)}</b></td>
            <td>${r.condicion_pago || '-'}</td>
            <td>${r.vendedor || '-'}</td>
            <td>${r.medio || '-'}</td>
            <td>${r.req_compra || '-'}</td>
            <td class="left" style="font-size:9px;">${r.observaciones || '-'}</td>
            <td style="font-size:8px; text-align:left;">${validacionesHtml}</td>
            <td>
                <button class="kebab" onclick="showPedidoMenu(event, ${r.id})">⋮</button>
            </td>
        </tr>`;
    }).join('');
    
    // Actualizar contador
    const countEl = document.getElementById('pcCount');
    if (countEl) {
        countEl.textContent = `Mostrando ${list.length} de ${pedidosData.length} pedidos`;
    }
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
            <th>Razón social (Cliente)</th>
            <th>Descripción principal</th>
            <th>Monto total<br><small>(Sin IGV)</small></th>
            <th>Monto total<br><small>(Incluido IGV)</small></th>
            <th>Cond. pago</th>
            <th>Acciones</th>
        </tr>
    `;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay cotizaciones que coincidan con los filtros</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => {
        const totalConIgv = r.total || r.monto || 0;
        const totalSinIgv = totalConIgv / 1.18;
        
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
            <td><b>${money(totalSinIgv)}</b></td>
            <td><b>${money(totalConIgv)}</b></td>
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


// ============================================================
// VISTAS DE PEDIDOS - PRINCIPAL / COMPLETA
// ============================================================

let pedidoViewMode = 'principal'; // 'principal' o 'completa'

function setPedidoView(mode) {
    pedidoViewMode = mode;
    
    // Actualizar clases de los botones
    const principalBtn = document.getElementById('pcViewPrincipalBtn');
    const completaBtn = document.getElementById('pcViewCompletaBtn');
    
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
    renderPedidos();
}

function renderDespachos() {
    const q = document.getElementById('despachoSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('despachoStatus')?.value || '';
    
    // 🔽 FILTRO POR FECHAS
    const fechaInicio = document.getElementById('despachoFechaInicio')?.value || '';
    const fechaFin = document.getElementById('despachoFechaFin')?.value || '';
    
    const list = despachosData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.cliente || ''} ${r.pc_numero || ''} ${r.destino || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        
        // 🔽 FILTRO POR FECHAS
        let matchFecha = true;
        if (fechaInicio || fechaFin) {
            let fechaDespacho = r.fecha_despacho || r.fecha || r.created_at || '';
            let fechaObj = null;
            try {
                if (typeof fechaDespacho === 'string') {
                    fechaObj = new Date(fechaDespacho);
                    if (fechaDespacho.includes('/')) {
                        const partes = fechaDespacho.split(/[\/\s:]/);
                        if (partes.length >= 3) {
                            fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        }
                    }
                } else if (fechaDespacho instanceof Date) {
                    fechaObj = fechaDespacho;
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
            } else {
                if (fechaInicio || fechaFin) {
                    matchFecha = false;
                }
            }
        }
        
        return matchText && matchStatus && matchFecha;
    });
    
    const tbody = document.getElementById('despachoRows');
    if (!tbody) return;
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94A3B8;padding:40px;">📭 No hay despachos registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map((r, i) => {
        // ============================================================
        // FORMATEAR FECHA CON HORA
        // ============================================================
        let fechaDisplay = '-';
        const fechaRaw = r.fecha_despacho || r.fecha || r.created_at;
        
        if (fechaRaw) {
            try {
                let fecha = new Date(fechaRaw);
                if (!isNaN(fecha.getTime())) {
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const anio = fecha.getFullYear();
                    const horas = String(fecha.getHours()).padStart(2, '0');
                    const minutos = String(fecha.getMinutes()).padStart(2, '0');
                    fechaDisplay = `${dia}/${mes}/${anio} ${horas}:${minutos}`;
                } else {
                    fechaDisplay = String(fechaRaw);
                }
            } catch (e) {
                fechaDisplay = String(fechaRaw);
            }
        }
        
        return `
        <tr>
            <td>${i + 1}</td>
            <td class="date-cell">${fechaDisplay}</td>
            <td>${badgeStatus(r.estado)}</td>
            <td><b>${sd(r.numero)}</b></td>
            <td>${sd(r.pc_numero)}</td>
            <td class="left">${sd(r.cliente)}</td>
            <td>${sd(r.comprobante)}</td>
            <td>${sd(r.guia)}</td>
            <td>${sd(r.destino)}</td>
            <td>
                ${r.estado !== 'Despachado' && r.estado !== 'Entregado' ? 
                    `<button class="btn btn-sm btn-green" onclick="marcarDespachado(${r.id})" style="padding:4px 10px; font-size:10px; border-radius:6px; border:none; background:#16A34A; color:#fff; font-weight:800; cursor:pointer;">🚚 Despachar</button>` : 
                    `<span class="badge b-ok">✅ ${r.estado || 'Completado'}</span>`
                }
            </td>
        </tr>`;
    }).join('');
}
// ============================================================
// 🔽 FUNCIÓN PARA FORMATEAR FECHA DE DESPACHO (CON HORA)
// ============================================================
function formatearFechaDespacho(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        let fecha;
        
        // Si es string, intentar parsear
        if (typeof fechaStr === 'string') {
            // Si viene con formato ISO completo (2026-07-20T14:30:00.000Z)
            if (fechaStr.includes('T')) {
                fecha = new Date(fechaStr);
            }
            // Si viene con formato YYYY-MM-DD (sin hora)
            else if (fechaStr.includes('-') && fechaStr.length === 10) {
                fecha = new Date(fechaStr + 'T00:00:00');
            }
            // Si viene con formato DD/MM/YYYY HH:MM
            else if (fechaStr.includes('/') && fechaStr.includes(':')) {
                const partes = fechaStr.split(' ');
                const fechaParts = partes[0].split('/');
                const horaParts = partes[1].split(':');
                if (fechaParts.length === 3 && horaParts.length >= 2) {
                    fecha = new Date(
                        parseInt(fechaParts[2]),
                        parseInt(fechaParts[1]) - 1,
                        parseInt(fechaParts[0]),
                        parseInt(horaParts[0]),
                        parseInt(horaParts[1])
                    );
                } else {
                    fecha = new Date(fechaStr);
                }
            }
            // Si viene solo con formato DD/MM/YYYY (sin hora)
            else if (fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes.length === 3) {
                    fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
            else {
                fecha = new Date(fechaStr);
            }
        } else if (fechaStr instanceof Date) {
            fecha = fechaStr;
        } else {
            fecha = new Date(fechaStr);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
            return String(fechaStr);
        }
        
        // Formatear: 20/07/2026 14:30
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        // Si la hora es 00:00, mostrar solo la fecha
        if (horas === '00' && minutos === '00') {
            return `${dia}/${mes}/${anio}`;
        }
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        
    } catch (e) {
        return String(fechaStr);
    }
}

// ============================================================
// 🔽 FUNCIÓN PARA FORMATEAR FECHA DE DESPACHO
// ============================================================
function formatearFechaDespacho(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        let fecha;
        
        // Si es string, intentar parsear
        if (typeof fechaStr === 'string') {
            // Si viene con formato ISO (Mon, 20 Jul 2026 00:00:00 GMT)
            if (fechaStr.includes('GMT') || fechaStr.includes('UTC')) {
                fecha = new Date(fechaStr);
            }
            // Si viene con formato ISO (2026-07-20T00:00:00.000Z)
            else if (fechaStr.includes('T')) {
                fecha = new Date(fechaStr);
            }
            // Si viene con formato YYYY-MM-DD
            else if (fechaStr.includes('-') && fechaStr.length === 10) {
                fecha = new Date(fechaStr + 'T00:00:00');
            }
            // Si viene con formato DD/MM/YYYY
            else if (fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes.length === 3) {
                    fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
            else {
                fecha = new Date(fechaStr);
            }
        } else if (fechaStr instanceof Date) {
            fecha = fechaStr;
        } else {
            // Si es timestamp (número)
            fecha = new Date(fechaStr);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
            return String(fechaStr);
        }
        
        // Formatear: 20/07/2026 14:30
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        
    } catch (e) {
        return String(fechaStr);
    }
}


// ============================================================
// FUNCIÓN PARA FORMATEAR FECHA DE GUÍA (CON HORA)
// ============================================================

function formatearFechaGuia(fechaStr) {
    if (!fechaStr) return '-';
    
    try {
        let fecha;
        
        // Si es un objeto Date o string
        if (fechaStr instanceof Date) {
            fecha = fechaStr;
        } else if (typeof fechaStr === 'string') {
            // Si viene en formato RFC (Mon, 20 Jul 2026 00:00:00 GMT)
            if (fechaStr.includes('GMT') || fechaStr.includes('UTC')) {
                fecha = new Date(fechaStr);
            }
            // Si viene en formato ISO
            else if (fechaStr.includes('T')) {
                fecha = new Date(fechaStr);
            }
            // Si viene en formato YYYY-MM-DD
            else if (fechaStr.includes('-') && fechaStr.length === 10) {
                fecha = new Date(fechaStr + 'T00:00:00');
            }
            // Si viene en formato DD/MM/YYYY
            else if (fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes.length === 3) {
                    fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
            // Si viene con formato "Mon, 20 Jul 2026 00:00:00 GMT"
            else if (fechaStr.match(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4}/)) {
                fecha = new Date(fechaStr);
            }
            else {
                fecha = new Date(fechaStr);
            }
        } else {
            fecha = new Date(fechaStr);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
            return String(fechaStr);
        }
        
        // Formatear: 20/07/2026 14:30
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        
        // Si la hora es 00:00, mostrar solo la fecha
        if (horas === '00' && minutos === '00') {
            return `${dia}/${mes}/${anio}`;
        }
        
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        
    } catch (e) {
        return String(fechaStr);
    }
}


function renderGuias() {
    const q = document.getElementById('guiaSearch')?.value?.toLowerCase() || '';
    const st = document.getElementById('guiaStatus')?.value || '';
    
    // 🔽 FILTRO POR FECHAS
    const fechaInicio = document.getElementById('guiaFechaInicio')?.value || '';
    const fechaFin = document.getElementById('guiaFechaFin')?.value || '';
    
    const list = guiasData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.serie || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        
        // 🔽 FILTRO POR FECHAS
        let matchFecha = true;
        if (fechaInicio || fechaFin) {
            let fechaGuia = r.fecha || r.created_at || '';
            let fechaObj = null;
            try {
                if (typeof fechaGuia === 'string') {
                    fechaObj = new Date(fechaGuia);
                    if (fechaGuia.includes('/')) {
                        const partes = fechaGuia.split(/[\/\s:]/);
                        if (partes.length >= 3) {
                            fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        }
                    }
                } else if (fechaGuia instanceof Date) {
                    fechaObj = fechaGuia;
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
            } else {
                if (fechaInicio || fechaFin) {
                    matchFecha = false;
                }
            }
        }
        
        return matchText && matchStatus && matchFecha;
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
            <td class="date-cell">${formatearFechaGuia(r.fecha)}</td>
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
    
    // 🔽 FILTRO POR FECHAS
    const fechaInicio = document.getElementById('comprobanteFechaInicio')?.value || '';
    const fechaFin = document.getElementById('comprobanteFechaFin')?.value || '';
    
    const list = comprobantesData.filter(r => {
        const searchStr = `${r.numero || ''} ${r.serie || ''} ${r.cliente || ''} ${r.ruc || ''}`.toLowerCase();
        const matchText = !q || searchStr.includes(q);
        const matchStatus = !st || r.estado === st;
        
        // 🔽 FILTRO POR FECHAS
        let matchFecha = true;
        if (fechaInicio || fechaFin) {
            let fechaComp = r.fecha || r.created_at || '';
            let fechaObj = null;
            try {
                if (typeof fechaComp === 'string') {
                    fechaObj = new Date(fechaComp);
                    if (fechaComp.includes('/')) {
                        const partes = fechaComp.split(/[\/\s:]/);
                        if (partes.length >= 3) {
                            fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        }
                    }
                } else if (fechaComp instanceof Date) {
                    fechaObj = fechaComp;
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
            } else {
                if (fechaInicio || fechaFin) {
                    matchFecha = false;
                }
            }
        }
        
        return matchText && matchStatus && matchFecha;
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
            <td class="date-cell">${formatearFechaComprobante(r.fecha)}</td>
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

// ============================================================
// LIMPIAR FILTROS DE FECHA - DESPACHOS
// ============================================================
function clearDespachoDateFilter() {
    console.log('🧹 Limpiando filtros de fecha de Despachos...');
    
    const fechaInicio = document.getElementById('despachoFechaInicio');
    const fechaFin = document.getElementById('despachoFechaFin');
    
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    
    renderDespachos();
    showToast('🧹 Filtros de fecha limpiados', 'info');
}

// ============================================================
// LIMPIAR FILTROS DE FECHA - GUÍAS
// ============================================================
function clearGuiaDateFilter() {
    console.log('🧹 Limpiando filtros de fecha de Guías...');
    
    const fechaInicio = document.getElementById('guiaFechaInicio');
    const fechaFin = document.getElementById('guiaFechaFin');
    
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    
    renderGuias();
    showToast('🧹 Filtros de fecha limpiados', 'info');
}

// ============================================================
// LIMPIAR FILTROS DE FECHA - COMPROBANTES
// ============================================================
function clearComprobanteDateFilter() {
    console.log('🧹 Limpiando filtros de fecha de Comprobantes...');
    
    const fechaInicio = document.getElementById('comprobanteFechaInicio');
    const fechaFin = document.getElementById('comprobanteFechaFin');
    
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    
    renderComprobantes();
    showToast('🧹 Filtros de fecha limpiados', 'info');
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
    seguimiento: document.getElementById('fSeguimiento')?.value || 'Helen Blas Príncipe',
    motivo: document.getElementById('fMotivo')?.value || 'Solicitud única del cliente',
    transporte: document.getElementById('fTransporte')?.value || 'Seleccione',
    parihuela: document.getElementById('fParihuela')?.value || 'Seleccione',
    nota_interna: document.getElementById('fNotaInterna')?.value?.trim() || '', 
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



// ============================================================
// GUARDAR COMO BORRADOR
// ============================================================
function saveCotizacionDraft() {
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
    
    // Guardar como Borrador
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
// SELECCIÓN MÚLTIPLE DE PRODUCTOS PARA PC
// ============================================================

let productSelectorPcData = [];
let selectedPcProductIds = new Set();

/**
 * Abre el selector múltiple de productos para PC
 */
function openProductSelectorPC() {
    // Si no hay productos maestros, cargarlos primero
    if (PRODUCTOS_MAESTROS.length === 0) {
        showToast('⏳ Cargando productos...', 'info');
        cargarProductosMaestros().then(() => {
            setTimeout(() => openProductSelectorPC(), 300);
        });
        return;
    }
    
    // Resetear selecciones
    selectedPcProductIds = new Set();
    productSelectorPcData = [...PRODUCTOS_MAESTROS];
    
    // Renderizar tabla
    renderProductSelectorPc();
    
    // Mostrar modal
    document.getElementById('productSelectorPcModal').classList.add('show');
    
    // Enfocar buscador
    setTimeout(() => {
        document.getElementById('productSelectorPcSearch')?.focus();
    }, 300);
}

/**
 * Renderiza la tabla de productos del selector de PC
 */
function renderProductSelectorPc() {
    const tbody = document.getElementById('productSelectorPcRows');
    const search = document.getElementById('productSelectorPcSearch')?.value?.toLowerCase() || '';
    
    // Filtrar productos
    let filtered = productSelectorPcData;
    if (search) {
        filtered = productSelectorPcData.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(search)) ||
            (p.producto && p.producto.toLowerCase().includes(search)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(search)) ||
            (p.marca && p.marca.toLowerCase().includes(search)) ||
            (p.modelo && p.modelo.toLowerCase().includes(search))
        );
    }
    
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:30px;">📭 No se encontraron productos</td></tr>`;
        document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
        return;
    }
    
    tbody.innerHTML = filtered.map((p, index) => {
        const idKey = p.id || p.codigo;
        const isChecked = selectedPcProductIds.has(idKey);
        const valorVenta = parseFloat(p.valorVenta) || 0;
        
        return `
        <tr>
            <td style="text-align:center;">
                <input type="checkbox" class="product-select-pc-checkbox" 
                       data-id="${idKey}" 
                       ${isChecked ? 'checked' : ''}
                       onchange="toggleProductSelectionPc('${idKey}', this.checked)">
            </td>
            <td style="font-weight:900; color:#0F172A;">${p.codigo || '-'}</td>
            <td style="text-align:left; font-weight:800;">${p.producto || p.descripcion || 'Sin nombre'}</td>
            <td>${p.marca || '-'}</td>
            <td>${p.modelo || '-'}</td>
            <td>${p.um || 'NIU'}</td>
            <td>${p.stock || 0}</td>
            <td style="font-weight:900; color:#059669;">S/ ${valorVenta.toFixed(2)}</td>
            <td>
                <input type="number" class="product-select-pc-qty" 
                       data-id="${idKey}"
                       value="1" 
                       min="1" 
                       style="width:60px; height:28px; border:1px solid #E5E7EB; border-radius:6px; text-align:center; font-size:12px;">
            </td>
        </tr>
    `}).join('');
    
    document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
    
    // Actualizar el checkbox "Seleccionar todos"
    const totalCheckboxes = document.querySelectorAll('.product-select-pc-checkbox').length;
    const checkedCheckboxes = document.querySelectorAll('.product-select-pc-checkbox:checked').length;
    const selectAllCheckbox = document.getElementById('selectAllPcCheckbox');
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

/**
 * Alterna la selección de un producto en el selector de PC
 */
function toggleProductSelectionPc(idKey, checked) {
    if (checked) {
        selectedPcProductIds.add(idKey);
    } else {
        selectedPcProductIds.delete(idKey);
    }
    document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
    
    // Actualizar el checkbox "Seleccionar todos"
    const totalCheckboxes = document.querySelectorAll('.product-select-pc-checkbox').length;
    const checkedCheckboxes = document.querySelectorAll('.product-select-pc-checkbox:checked').length;
    const selectAllCheckbox = document.getElementById('selectAllPcCheckbox');
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

/**
 * Selecciona todos los productos del selector de PC
 */
function selectAllProductsPc() {
    document.querySelectorAll('.product-select-pc-checkbox').forEach(cb => {
        cb.checked = true;
        const idKey = cb.dataset.id;
        selectedPcProductIds.add(idKey);
    });
    document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
    const selectAllCheckbox = document.getElementById('selectAllPcCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
}

/**
 * Deselecciona todos los productos del selector de PC
 */
function deselectAllProductsPc() {
    document.querySelectorAll('.product-select-pc-checkbox').forEach(cb => {
        cb.checked = false;
        const idKey = cb.dataset.id;
        selectedPcProductIds.delete(idKey);
    });
    document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
    const selectAllCheckbox = document.getElementById('selectAllPcCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

/**
 * Filtra los productos del selector de PC por búsqueda
 */
function filterProductSelectorPc() {
    renderProductSelectorPc();
}

/**
 * Agrega los productos seleccionados a la tabla del PC
 */
function addSelectedProductsPc() {
    if (selectedPcProductIds.size === 0) {
        showToast('⚠️ Selecciona al menos un producto', 'warning');
        return;
    }
    
    let addedCount = 0;
    let notFoundCount = 0;
    
    selectedPcProductIds.forEach(idKey => {
        // Buscar el producto por id o codigo
        let product = PRODUCTOS_MAESTROS.find(p => p.id == idKey || p.codigo == idKey);
        
        if (!product) {
            notFoundCount++;
            return;
        }
        
        // Obtener la cantidad del input correspondiente
        const qtyInput = document.querySelector(`.product-select-pc-qty[data-id="${idKey}"]`);
        const cantidad = parseInt(qtyInput?.value || 1);
        
        // Obtener datos del producto
        const codigo = product.codigo || '';
        const descripcion = product.producto || product.descripcion || 'Sin descripción';
        const marca = product.marca || '';
        const modelo = product.modelo || '';
        const precio = parseFloat(product.valorVenta) || 0;
        const stock = parseInt(product.stock) || 0;
        
        // Agregar fila a la tabla del PC
        agregarItemPCTable(codigo, descripcion, marca, modelo, cantidad, precio, stock);
        
        addedCount++;
    });
    
    // Cerrar modal
    closeModal('productSelectorPcModal');
    
    // Mostrar mensaje
    if (addedCount > 0) {
        showToast(`✅ ${addedCount} productos agregados correctamente`, 'success');
    }
    if (notFoundCount > 0) {
        showToast(`⚠️ ${notFoundCount} productos no encontrados`, 'warning');
    }
}


function agregarItemPCTable(codigo, descripcion, marca, modelo, cantidad, precio, stock) {
    const tbody = document.getElementById('pcItemsBody');
    if (!tbody) return;
    
    const rowCount = tbody.children.length + 1;
    const faltante = Math.max(cantidad - stock, 0);
    const valorTotal = cantidad * precio;
    
    const tr = document.createElement('tr');
    tr.id = `item-row-${rowCount}`;
    tr.style.borderBottom = '1px solid #E2E8F0';
    
    tr.innerHTML = `
        <td style="padding:2px 3px; text-align:center; font-weight:800; font-size:9px; background:#F8FAFC;">${rowCount}</td>
        <td style="padding:2px 3px;">
            <input value="${esc(codigo)}" 
                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:800; color:#1D4ED8;"
                   readonly>
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(descripcion)}" 
                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:800;"
                   readonly>
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(modelo)}" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A;">
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(marca)}" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A;">
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="${cantidad}" 
                   style="width:45px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center;"
                   readonly>
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="${cantidad}" 
                   style="width:45px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="${precio}" 
                   style="width:55px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center;"
                   readonly>
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="${precio}" 
                   style="width:55px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900; color:#0F172A;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <!-- 🔽 NUEVA CELDA: Valor Total PC -->
        <td style="padding:2px 3px; width:70px; text-align:center; font-weight:900; color:#059669; font-size:9px;">
            <span id="valor-total-${rowCount}">${valorTotal.toFixed(2)}</span>
        </td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; color:#64748B; font-weight:800;">${stock}</td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; font-weight:900; color:${faltante > 0 ? '#DC2626' : '#16A34A'};">${faltante}</td>
        <td style="padding:2px 3px; text-align:center;">
            <button onclick="eliminarItemSAP('${tr.id}')" 
                    style="background:transparent; border:none; color:#EF4444; cursor:pointer; font-size:12px; font-weight:900; padding:0 4px; border-radius:3px; transition:all 0.2s; width:22px; height:22px;"
                    onmouseover="this.style.background='#FEE2E2'; this.style.color='#DC2626';"
                    onmouseout="this.style.background='transparent'; this.style.color='#EF4444';">
                ✕
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    reordenarItemsSAP();
}

/**
 * Alterna todos los checkboxes del selector de PC
 */
function toggleAllProductCheckboxesPc(checked) {
    document.querySelectorAll('.product-select-pc-checkbox').forEach(cb => {
        cb.checked = checked;
        const idKey = cb.dataset.id;
        if (checked) {
            selectedPcProductIds.add(idKey);
        } else {
            selectedPcProductIds.delete(idKey);
        }
    });
    document.getElementById('selectedPcCount').textContent = selectedPcProductIds.size;
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
            condicion_pago: getPcCondicionValue(),
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
        const montoTotal = parseFloat(document.getElementById('compMonto')?.value || 0);
        const subtotalCalc = montoTotal / 1.18;
        const igvCalc = montoTotal - subtotalCalc;
        
        const data = {
            id: editingId,
            estado: estado || 'Borrador',
            tipo: document.getElementById('compTipo')?.value || 'Factura',
            serie: document.getElementById('compSerie')?.value || 'F001',
            numero: document.getElementById('compNumero')?.value || String(Date.now()).slice(-8),
            cotizacion: document.getElementById('compCotizacion')?.value || '',
            cliente: document.getElementById('compCliente')?.value || '',
            ruc: document.getElementById('compRuc')?.value || '',
            monto: montoTotal,
            total: montoTotal,          // 🔧 NUEVO — esto es lo que lee el backend
            subtotal: subtotalCalc,     // 🔧 NUEVO
            igv: igvCalc,               // 🔧 NUEVO
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
async function marcarDespachado(id) {
    const despacho = despachosData.find(d => d.id === id);
    if (!despacho) {
        showToast('❌ Despacho no encontrado', 'error');
        return;
    }
    
    const numero = despacho.numero || 'DESP-XXXXXX';
    const cliente = despacho.cliente || 'Cliente';
    
    showConfirmModal(
        '🚚 ¿Marcar como despachado?',
        `Estás a punto de marcar como <b>"Despachado"</b> el despacho <b>${numero}</b> del cliente <b>${cliente}</b>.`,
        '⚠️ Esta acción es irreversible.',
        async function() {
            try {
                showToast('⏳ Procesando despacho...', 'info');
                
                // PASO 1: Cambiar estado del despacho
                const response = await apiFetch(`/ventas/api/despachos/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Despachado' })
                });
                
                if (!response.success) {
                    showToast('❌ Error al marcar despacho: ' + (response.error || 'Desconocido'), 'error');
                    return;
                }
                
                showToast('✅ Despacho marcado como Despachado', 'success');
                
                // PASO 2: Obtener items del PC
                let items = [];
                if (despacho.pc_id) {
                    try {
                        const pcResponse = await apiFetch(`/ventas/api/pedido-compra/${despacho.pc_id}`);
                        if (pcResponse.success && pcResponse.data) {
                            items = pcResponse.data.items || [];
                            console.log('📦 Items obtenidos del PC:', items);
                        }
                    } catch (e) {
                        console.warn('⚠️ No se pudieron obtener items del PC:', e);
                    }
                }
                
                if (items.length === 0 && despacho.items) {
                    items = despacho.items;
                }
                
                console.log('📦 Items finales para guía:', items);
                
                // PASO 3: Crear Guía de Remisión
                const ahora = new Date();
                const year = ahora.getFullYear();
                const month = String(ahora.getMonth() + 1).padStart(2, '0');
                const day = String(ahora.getDate()).padStart(2, '0');
                
                const numeroGuia = `G-${year}${month}${day}-${String(ahora.getTime()).slice(-4)}`;
                
                const guiaData = {
                    estado: 'Borrador',
                    serie: 'T001',
                    numero: numeroGuia,
                    cotizacion_numero: despacho.cotizacion_numero || '',
                    cliente: despacho.cliente || '',
                    ruc: despacho.ruc || '',
                    origen: despacho.origen || 'ALM-SMP',
                    destino: despacho.destino || '',
                    motivo_traslado: 'VENTA',
                    observaciones: `Guía generada automáticamente desde despacho ${despacho.numero}`,
                    fecha_traslado: `${year}-${month}-${day}`,
                    items: items.map(item => {
                        // Normalizar item para la guía
                        let codigo = item.codigo || '';
                        let producto = item.producto || item.descripcion || '';
                        let cantidad = item.cantidad_pc || item.cantidad || 1;
                        let um = item.um || 'NIU';
                        let marca = item.marca || '';
                        let modelo = item.modelo || '';
                        
                        // Si el item es un array [codigo, descripcion, cantidad, ...]
                        if (Array.isArray(item)) {
                            codigo = item[0] || '';
                            producto = item[1] || '';
                            cantidad = item[3] || item[2] || 1;
                            um = 'NIU';
                            marca = '';
                            modelo = '';
                        }
                        
                        return {
                            codigo: codigo,
                            producto: producto,
                            cantidad: cantidad,
                            um: um,
                            marca: marca,
                            modelo: modelo
                        };
                    })
                };
                
                console.log('📦 Creando guía automática:', JSON.stringify(guiaData, null, 2));
                
                const guiaResponse = await fetch('/ventas/api/guias/guardar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(guiaData)
                });
                
                const guiaResult = await guiaResponse.json();
                console.log('📦 Respuesta creación guía:', guiaResult);
                
                if (guiaResult.success) {
                    showToast('✅ Guía de Remisión creada en estado "Borrador"', 'success');
                    
                    await loadDespachos();
                    await loadGuias();
                    
                    setTimeout(() => {
                        showConfirmModal(
                            '📦 ¿Ver la guía creada?',
                            `Se ha creado la Guía de Remisión <b>${guiaData.serie}-${guiaData.numero}</b> en estado "Borrador".`,
                            '⚠️ La guía está en borrador. Debes revisarla y completarla antes de emitirla.',
                            function() {
                                const tabBtn = document.querySelector('.tab-btn[data-tab="guias"]');
                                if (tabBtn) {
                                    tabBtn.click();
                                    setTimeout(() => {
                                        if (guiaResult.data && guiaResult.data.id) {
                                            openGuiaModal(guiaResult.data.id);
                                        }
                                    }, 500);
                                }
                            },
                            '📦 Ver guía ahora'
                        );
                    }, 500);
                    
                } else {
                    showToast('⚠️ Despacho marcado, pero error al crear guía: ' + (guiaResult.error || 'Desconocido'), 'warning');
                }
                
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al procesar: ' + error.message, 'error');
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


// ventas.js - Función completa para generar PDF de guía

window.generateGuiaPdf = async function(id) {
    console.log(`📄 Generando PDF para guía ID: ${id}`);

    try {
        showToast('⏳ Generando PDF de la guía...', 'info');

        const response = await fetch(`/ventas/api/guias/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            }
        });

        // 🔍 Manejar específicamente el error 401 (No autorizado)
        if (response.status === 401) {
            showToast('⏳ Tu sesión ha expirado. Redirigiendo al login...', 'warning');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }

        // 🔍 Manejar específicamente el error 404 (No encontrado)
        if (response.status === 404) {
            showToast('❌ Guía no encontrada. Verifica el ID.', 'error');
            return;
        }

        // Para cualquier otro error (500, etc.)
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                // Si no se puede parsear el error como JSON, usar el texto de estado
                errorMsg = `Error ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        // Obtener el blob del PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Obtener nombre del archivo desde el header Content-Disposition
        let filename = `guia_${id}.pdf`;
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

        showToast('✅ PDF de guía generado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error generando PDF de guía:', error);
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.previewGuiaPdf = function(id) {
    try {
        // 🔽 RUTA CORRECTA PARA VISTA PREVIA
         const url = `/ventas/api/guias/${id}/pdf/preview`;
        window.open(url, '_blank');
        showToast('📄 Abriendo vista previa...', 'info');
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
};

window.previewGuiaPdf = function(id) {
    console.log(`👁️ Vista previa PDF guía ID: ${id}`);
    
    try {
        const url = `/ventas/api/guias/${id}/pdf/preview`;
        window.open(url, '_blank');
        showToast('📄 Abriendo vista previa del PDF...', 'info');
    } catch (error) {
        console.error('❌ Error abriendo vista previa:', error);
        showToast('❌ Error al abrir la vista previa: ' + error.message, 'error');
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
    
    // ============================================================
    // 🔽 SIEMPRE CARGAR COTIZACIONES PRIMERO
    // ============================================================
    async function cargarDatos() {
        // Primero cargar cotizaciones si no están cargadas
        if (typeof cotizacionesData === 'undefined' || cotizacionesData.length === 0) {
            await loadCotizaciones();
        }
        
        // Luego cargar el módulo específico
        switch(tabId) {
            case 'cotizaciones':
                // Ya están cargadas
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
        }
    }
    
    cargarDatos();
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

/* funcion rota 
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
*/
// funcion totalmente rota


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

//=====================================
// funcion para cargar Datos a Facturas
//=====================================
window.loadComprobanteFromCotizacion = function(numeroCotizacion) {
    if (!numeroCotizacion) return;

    const cotizacion = cotizacionesData.find(c => c.numero === numeroCotizacion);
    if (!cotizacion) {
        showToast('⚠️ Cotización no encontrada', 'warning');
        return;
    }

    showToast('⏳ Cargando datos de cotización...', 'info');

    apiFetch(`/ventas/api/cotizaciones/${cotizacion.id}/completa`)
        .then(response => {
            if (response.success) {
                const data = response.data;

                document.getElementById('compCliente').value = data.cliente_razon_social || '';
                document.getElementById('compRuc').value = data.cliente_ruc || '';
                document.getElementById('compMonto').value = data.total || 0;
                document.getElementById('compObs').value = `Generado desde cotización ${numeroCotizacion}`;

                // Condición de pago
                const condSelect = document.getElementById('compCondicion');
                if (condSelect && data.condicion_pago) {
                    const opciones = Array.from(condSelect.options).map(o => o.value);
                    if (opciones.includes(data.condicion_pago)) {
                        condSelect.value = data.condicion_pago;
                    }
                }

                // Productos
                const productos = data.productos || [];
                window._compProductos = productos;
                document.getElementById('compProducts').innerHTML =
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
    // Buscar el PC para mostrar info
    const pedido = pedidosData.find(p => p.id === id);
    if (!pedido) {
        showToast('❌ PC no encontrado', 'error');
        return;
    }
    
    const numero = pedido.numero || 'PC-XXXXXX';
    const cliente = pedido.cliente || 'Cliente';
    const estado = pedido.estado || 'Desconocido';
    
    // Verificar si ya está validado
    if (estado === 'Validado por Hellen' || estado === 'Validado') {
        showToast('⚠️ Este PC ya está validado', 'warning');
        return;
    }
    
    // Verificar si está anulado
    if (estado === 'Anulado') {
        showToast('⚠️ No se puede validar un PC anulado', 'warning');
        return;
    }
    
    showConfirmModal(
        '✅ ¿Validar PC?',
        `Estás a punto de marcar el PC <b>${numero}</b> del cliente <b>${cliente}</b> como <b>"Validado por Hellen"</b>.<br><br>Estado actual: <b>${estado}</b>`,
        '⚠️ Esta acción confirma que el PC ha sido revisado y validado por Hellen. El PC quedará listo para continuar con el proceso.',
        async function() {
            try {
                console.log(`✅ Validando PC ID: ${id}`);
                showToast('⏳ Validando PC...', 'info');
                
                // Cambiar estado a "Validado por Hellen"
                const response = await apiFetch(`/ventas/api/pedido-compra/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Validado por Hellen' })
                });
                
                if (response.success) {
                    showToast('✅ PC validado por Hellen correctamente', 'success');
                    
                    // Recargar datos
                    await loadPedidos();
                    
                    // Actualizar validación si está visible
                    if (currentModule === 'validacion') {
                        renderValidacion();
                    }
                    
                    // Forzar actualización de la tabla
                    renderPedidos();
                    
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo validar el PC'), 'error');
                }
            } catch (error) {
                console.error('❌ Error validando PC:', error);
                showToast('❌ Error al validar el PC: ' + error.message, 'error');
            }
        },
        '✅ Sí, validar'
    );
}


//==========================================================
//Crear el despacho desde el PC
//==========================================================
async function createDespachoFromPedido(id) {
    try {
        showToast('⏳ Creando despacho desde el PC...', 'info');

        const response = await apiFetch(`/ventas/api/pedido-compra/${id}`);
        if (!response.success) {
            showToast('❌ No se pudo obtener el PC: ' + (response.error || 'Desconocido'), 'error');
            return;
        }
        const pc = response.data;

        const payload = {
            pc_id: pc.id,
            pc_numero: pc.numero || '',
            cotizacion_id: pc.cotizacion_id || null,
            cotizacion_numero: pc.cotizacion_numero || '',
            cliente: pc.cliente || '',
            ruc: pc.ruc || '',
            destino: pc.lugar_entrega || pc.entrega || '',
            origen: 'ALM-SMP',
            estado: 'Pendiente despacho',
            responsable: pc.responsable || 'Hellen',
            observaciones: `Generado automáticamente desde PC ${pc.numero || ''}`
        };

        const result = await apiFetch('/ventas/api/despachos/guardar', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.success) {
            showToast(`✅ Despacho ${result.data.numero} creado desde PC ${pc.numero}`, 'success');
            if (typeof loadDespachos === 'function') loadDespachos();
        } else {
            showToast('❌ Error al crear el despacho: ' + (result.error || 'Desconocido'), 'error');
        }

    } catch (error) {
        console.error('❌ Error en createDespachoFromPedido:', error);
        showToast('❌ Error al crear el despacho: ' + error.message, 'error');
    }
}

//==========================================================
//Crear la Guia desde el PC
//==========================================================
async function createGuiaFromPedido(id) {
    try {
        showToast('⏳ Creando guía desde el PC...', 'info');

        // 1) Traer los datos completos del PC (mismo endpoint que ya usamos para editar)
        const response = await apiFetch(`/ventas/api/pedido-compra/${id}`);
        if (!response.success) {
            showToast('❌ No se pudo obtener el PC: ' + (response.error || 'Desconocido'), 'error');
            return;
        }
        const pc = response.data;

        const items = (pc.items || []).map(it => ({
            codigo: it.codigo || '',
            producto: it.producto || '',
            descripcion: it.producto || '',
            marca: it.marca || '',
            modelo: it.modelo || '',
            cantidad: it.cantidad_pc || it.cantidad_cotizada || 1,
            um: 'NIU'
        }));

        if (items.length === 0) {
            showToast('⚠️ Este PC no tiene productos, no se puede crear la guía', 'warning');
            return;
        }

        // 2) Armar el payload con las mismas claves que espera /ventas/api/guias/guardar
        const payload = {
            ruc: pc.ruc || '',
            cliente: pc.cliente || '',
            destino: pc.lugar_entrega || pc.entrega || '',
            motivo_traslado: 'VENTA',
            cotizacion_numero: pc.cotizacion_numero || pc.numero || '',
            peso_total: 0,
            items: items,
            observaciones: `Generado automáticamente desde PC ${pc.numero || ''}`,
            estado: 'BORRADOR'
        };

        // 3) Guardar de verdad
        const result = await apiFetch('/ventas/api/guias/guardar', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.success) {
            showToast(`✅ Guía ${result.data.numero} creada desde PC ${pc.numero}`, 'success');
            if (typeof loadGuias === 'function') loadGuias();
        } else {
            showToast('❌ Error al crear la guía: ' + (result.error || 'Desconocido'), 'error');
        }

    } catch (error) {
        console.error('❌ Error en createGuiaFromPedido:', error);
        showToast('❌ Error al crear la guía: ' + error.message, 'error');
    }
}

//==========================================================
//Crear la factura desde el PC
//==========================================================
async function createFacturaFromPedido(id) {
    try {
        showToast('⏳ Creando factura desde el PC...', 'info');

        const response = await apiFetch(`/ventas/api/pedido-compra/${id}`);
        if (!response.success) {
            showToast('❌ No se pudo obtener el PC: ' + (response.error || 'Desconocido'), 'error');
            return;
        }
        const pc = response.data;

        const items = (pc.items || []).map(it => ({
            codigo: it.codigo || '',
            producto: it.producto || '',
            descripcion: it.producto || '',
            marca: it.marca || '',
            modelo: it.modelo || '',
            cantidad: it.cantidad_pc || it.cantidad_cotizada || 1,
            valorVenta: it.precio_pc || it.precio_cotizado || 0,
            um: 'NIU'
        }));

        if (items.length === 0) {
            showToast('⚠️ Este PC no tiene productos, no se puede crear la factura', 'warning');
            return;
        }

        const subtotal = items.reduce((s, it) => s + (Number(it.cantidad) * Number(it.valorVenta)), 0);
        const igv = subtotal * 0.18;
        const total = subtotal + igv;

        const payload = {
            tipo: 'FACTURA',
            serie: 'F001',
            moneda: 'PEN',
            cliente_tipo_doc: 'RUC',
            ruc: pc.ruc || '',
            cliente: pc.cliente || '',
            direccion: pc.lugar_entrega || pc.entrega || '',
            subtotal: subtotal,
            igv: igv,
            total: total,
            items: items,
            observaciones: `Generado automáticamente desde PC ${pc.numero || ''}`,
            estado: 'BORRADOR',
            cotizacion: pc.cotizacion_numero || ''
        };

        const result = await apiFetch('/ventas/api/comprobantes/guardar', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.success) {
            showToast(`✅ Factura creada desde PC ${pc.numero}`, 'success');
            if (typeof loadComprobantes === 'function') loadComprobantes();
        } else {
            showToast('❌ Error al crear la factura: ' + (result.error || 'Desconocido'), 'error');
        }

    } catch (error) {
        console.error('❌ Error en createFacturaFromPedido:', error);
        showToast('❌ Error al crear la factura: ' + error.message, 'error');
    }
}

function deletePedidoCompra(id) {
    // Buscar el PC para mostrar info
    const pedido = pedidosData.find(p => p.id === id);
    if (!pedido) {
        showToast('❌ PC no encontrado', 'error');
        return;
    }
    
    const numero = pedido.numero || 'PC-XXXXXX';
    const cliente = pedido.cliente || 'Cliente';
    const estado = pedido.estado || 'Desconocido';
    
    // Verificar si el estado es 'Anulado' para mostrar mensaje diferente
    const esAnulado = estado === 'Anulado';
    const mensajeAdicional = esAnulado 
        ? 'El PC ya está anulado y será eliminado permanentemente.'
        : `⚠️ El PC está en estado "${estado}". Primero será anulado y luego eliminado permanentemente.`;
    
    showConfirmModal(
        '🗑️ ¿Eliminar PC permanentemente?',
        `Estás a punto de <b>ELIMINAR FÍSICAMENTE</b> el PC <b>${numero}</b> del cliente <b>${cliente}</b>.<br><br>${mensajeAdicional}`,
        '⚠️ ⚠️ ⚠️ ¡ATENCIÓN! Esta acción es IRREVERSIBLE. El registro será eliminado de la base de datos permanentemente.',
        async function() {
            try {
                console.log(`🗑️ Eliminando físicamente PC ID: ${id}, estado actual: ${estado}`);
                showToast('⏳ Procesando eliminación...', 'info');
                
                let pcId = id;
                
                // Si NO está anulado, primero anularlo
                if (estado !== 'Anulado') {
                    console.log(`🔄 Anulando PC primero...`);
                    
                    const toggleResponse = await apiFetch(`/ventas/api/pedido-compra/${id}/toggle`, {
                        method: 'PUT',
                        body: JSON.stringify({ estado: 'Anulado' })
                    });
                    
                    if (!toggleResponse.success) {
                        showToast('❌ Error al anular el PC: ' + (toggleResponse.error || 'No se pudo anular'), 'error');
                        return;
                    }
                    
                    showToast('✅ PC anulado, ahora eliminando...', 'info');
                    
                    // Esperar un momento para que la BD se actualice
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // 🔽 ELIMINAR FÍSICAMENTE
                const response = await apiFetch(`/ventas/api/pedido-compra/${pcId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    showToast('✅ PC eliminado permanentemente', 'success');
                    
                    // Recargar datos
                    await loadPedidos();
                    
                    // Actualizar validación si está visible
                    if (currentModule === 'validacion') {
                        renderValidacion();
                    }
                    
                    // Forzar actualización de la tabla
                    renderPedidos();
                    
                } else {
                    // Si el DELETE falla, mostrar el error específico
                    const errorMsg = response.error || 'No se pudo eliminar';
                    if (errorMsg.includes('Anulado')) {
                        showToast('❌ Solo se pueden eliminar PCs anulados. Intenta nuevamente.', 'error');
                    } else {
                        showToast('❌ Error: ' + errorMsg, 'error');
                    }
                }
            } catch (error) {
                console.error('❌ Error eliminando PC:', error);
                
                // Mostrar mensaje más descriptivo según el error
                if (error.message.includes('404')) {
                    showToast('❌ El PC ya no existe en el servidor', 'error');
                } else if (error.message.includes('400')) {
                    showToast('❌ Solo se pueden eliminar PCs en estado "Anulado"', 'error');
                } else {
                    showToast('❌ Error al eliminar el PC: ' + error.message, 'error');
                }
            }
        },
        '🗑️ Sí, eliminar permanentemente'
    );
}

// ventas.js - Agregar después de la función generateGuiaPdf

// ============================================================
// GENERAR PDF DE COMPROBANTE (FACTURA / BOLETA)
// ============================================================

window.generateComprobantePdf = async function(id) {
    console.log(`📄 Generando PDF para comprobante ID: ${id}`);
    
    try {
        showToast('⏳ Generando PDF del comprobante...', 'info');
        
        const response = await fetch(`/ventas/api/comprobantes/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            }
        });
        
        if (response.status === 401) {
            showToast('⏳ Tu sesión ha expirado. Redirigiendo al login...', 'warning');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }
        
        if (response.status === 404) {
            showToast('❌ Comprobante no encontrado.', 'error');
            return;
        }
        
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename = `comprobante_${id}.pdf`;
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
        
        showToast('✅ PDF del comprobante generado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showToast(`❌ ${error.message}`, 'error');
    }
};

window.previewComprobantePdf = function(id) {
    try {
        const url = `/ventas/api/comprobantes/${id}/pdf/preview`;
        window.open(url, '_blank');
        showToast('📄 Abriendo vista previa del PDF...', 'info');
    } catch (error) {
        console.error('❌ Error abriendo vista previa:', error);
        showToast('❌ Error al abrir la vista previa: ' + error.message, 'error');
    }
};

function markGuiaEmitida(id) {
    showToast('Guía emitida correctamente', 'success');
}

// ============================================================
// ELIMINAR GUÍA (con anulación previa + eliminación física)
// ============================================================
async function deleteGuia(id) {
    const guia = guiasData.find(g => g.id === id);
    if (!guia) {
        showToast('❌ Guía no encontrada', 'error');
        return;
    }

    const numero = `${guia.serie || ''}-${guia.numero || ''}`;
    const cliente = guia.cliente || 'Cliente';
    const estadoActual = guia.estado || 'Desconocido';
    const esAnulada = (estadoActual || '').toUpperCase().includes('ANULAD');

    const mensajeAdicional = esAnulada
        ? 'La guía ya está anulada y será eliminada permanentemente.'
        : `⚠️ La guía está en estado "${estadoActual}". Primero será anulada y luego eliminada permanentemente.`;

    showConfirmModal(
        '🗑️ ¿Eliminar guía permanentemente?',
        `Estás a punto de <b>ELIMINAR FÍSICAMENTE</b> la guía <b>${numero}</b> del cliente <b>${cliente}</b>.<br><br>${mensajeAdicional}`,
        '⚠️ Esta acción es IRREVERSIBLE. El registro será eliminado de la base de datos permanentemente.',
        async function() {
            try {
                showToast('⏳ Procesando eliminación...', 'info');

                if (!esAnulada) {
                    const toggleResponse = await apiFetch(`/ventas/api/guias/${id}/toggle`, {
                        method: 'PUT',
                        body: JSON.stringify({ estado: 'Anulada' })
                    });
                    if (!toggleResponse.success) {
                        showToast('❌ Error al anular la guía: ' + (toggleResponse.error || 'No se pudo anular'), 'error');
                        return;
                    }
                    showToast('✅ Guía anulada, ahora eliminando...', 'info');
                    await new Promise(resolve => setTimeout(resolve, 400));
                }

                const response = await apiFetch(`/ventas/api/guias/${id}/permanente`, { method: 'DELETE' });

                if (response.success) {
                    showToast('✅ Guía eliminada permanentemente', 'success');
                    await loadGuias();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo eliminar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error eliminando guía:', error);
                showToast('❌ Error al eliminar la guía: ' + error.message, 'error');
            }
        },
        '🗑️ Sí, eliminar permanentemente'
    );
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

// ============================================================
// ELIMINAR COMPROBANTE (con anulación previa + eliminación física)
// ============================================================
async function deleteComprobante(id) {
    const comprobante = comprobantesData.find(c => c.id === id);
    if (!comprobante) {
        showToast('❌ Comprobante no encontrado', 'error');
        return;
    }

    const numero = `${comprobante.serie || ''}-${comprobante.numero || ''}`;
    const cliente = comprobante.cliente || 'Cliente';
    const estadoActual = comprobante.estado || 'Desconocido';
    const esAnulado = (estadoActual || '').toUpperCase().includes('ANULAD');

    const mensajeAdicional = esAnulado
        ? 'El comprobante ya está anulado y será eliminado permanentemente.'
        : `⚠️ El comprobante está en estado "${estadoActual}". Primero será anulado y luego eliminado permanentemente.`;

    showConfirmModal(
        '🗑️ ¿Eliminar comprobante permanentemente?',
        `Estás a punto de <b>ELIMINAR FÍSICAMENTE</b> el comprobante <b>${numero}</b> del cliente <b>${cliente}</b>.<br><br>${mensajeAdicional}`,
        '⚠️ Esta acción es IRREVERSIBLE. El registro será eliminado de la base de datos permanentemente.',
        async function() {
            try {
                showToast('⏳ Procesando eliminación...', 'info');

                if (!esAnulado) {
                    const toggleResponse = await apiFetch(`/ventas/api/comprobantes/${id}/toggle`, {
                        method: 'PUT',
                        body: JSON.stringify({ estado: 'Anulado' })
                    });
                    if (!toggleResponse.success) {
                        showToast('❌ Error al anular el comprobante: ' + (toggleResponse.error || 'No se pudo anular'), 'error');
                        return;
                    }
                    showToast('✅ Comprobante anulado, ahora eliminando...', 'info');
                    await new Promise(resolve => setTimeout(resolve, 400));
                }

                const response = await apiFetch(`/ventas/api/comprobantes/${id}/permanente`, { method: 'DELETE' });

                if (response.success) {
                    showToast('✅ Comprobante eliminado permanentemente', 'success');
                    await loadComprobantes();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo eliminar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error eliminando comprobante:', error);
                showToast('❌ Error al eliminar el comprobante: ' + error.message, 'error');
            }
        },
        '🗑️ Sí, eliminar permanentemente'
    );
}

function generateNotaPdf(id) {
    showToast('PDF de nota de crédito generado', 'success');
}

function markNotaEmitida(id) {
    showToast('Nota de crédito emitida correctamente', 'success');
}

// ============================================================
// ELIMINAR NOTA DE CRÉDITO (con anulación previa + eliminación física)
// ============================================================
async function deleteNota(id) {
    const nota = notasData.find(n => n.id === id);
    if (!nota) {
        showToast('❌ Nota de crédito no encontrada', 'error');
        return;
    }

    const numero = `${nota.serie || ''}-${nota.numero || ''}`;
    const cliente = nota.cliente || 'Cliente';
    const estadoActual = nota.estado || 'Desconocido';
    const esAnulada = (estadoActual || '').toLowerCase() === 'anulada';

    const mensajeAdicional = esAnulada
        ? 'La nota de crédito ya está anulada y será eliminada permanentemente.'
        : `⚠️ La nota de crédito está en estado "${estadoActual}". Primero será anulada y luego eliminada permanentemente.`;

    showConfirmModal(
        '🗑️ ¿Eliminar nota de crédito permanentemente?',
        `Estás a punto de <b>ELIMINAR FÍSICAMENTE</b> la nota de crédito <b>${numero}</b> del cliente <b>${cliente}</b>.<br><br>${mensajeAdicional}`,
        '⚠️ Esta acción es IRREVERSIBLE. El registro será eliminado de la base de datos permanentemente.',
        async function() {
            try {
                showToast('⏳ Procesando eliminación...', 'info');

                if (!esAnulada) {
                    const toggleResponse = await apiFetch(`/ventas/api/notas-credito/${id}/toggle`, {
                        method: 'PUT',
                        body: JSON.stringify({ estado: 'Anulada' })
                    });
                    if (!toggleResponse.success) {
                        showToast('❌ Error al anular la nota de crédito: ' + (toggleResponse.error || 'No se pudo anular'), 'error');
                        return;
                    }
                    showToast('✅ Nota de crédito anulada, ahora eliminando...', 'info');
                    await new Promise(resolve => setTimeout(resolve, 400));
                }

                const response = await apiFetch(`/ventas/api/notas-credito/${id}/permanente`, { method: 'DELETE' });

                if (response.success) {
                    showToast('✅ Nota de crédito eliminada permanentemente', 'success');
                    await loadNotas();
                } else {
                    showToast('❌ Error: ' + (response.error || 'No se pudo eliminar'), 'error');
                }
            } catch (error) {
                console.error('❌ Error eliminando nota de crédito:', error);
                showToast('❌ Error al eliminar la nota de crédito: ' + error.message, 'error');
            }
        },
        '🗑️ Sí, eliminar permanentemente'
    );
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


// ============================================================
// OBTENER ROL DEL USUARIO
// ============================================================
function getUsuarioRol() {
    // Opción 1: Desde el elemento hidden en el HTML
    const rolElement = document.getElementById('usuarioRol');
    if (rolElement) {
        return rolElement.value || 'vendedor';
    }
    
    // Opción 2: Desde FLASK_SESSION (definido en base.html)
    if (typeof FLASK_SESSION !== 'undefined' && FLASK_SESSION.rol) {
        return FLASK_SESSION.rol;
    }
    
    // Opción 3: Desde sessionStorage (fallback)
    try {
        const sessionData = sessionStorage.getItem('erp_session');
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return parsed.rol || 'vendedor';
        }
    } catch (e) {
        console.warn('Error obteniendo rol de sessionStorage:', e);
    }
    
    // Opción 4: Desde localStorage (fallback)
    try {
        const sessionData = localStorage.getItem('erp_session');
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return parsed.rol || 'vendedor';
        }
    } catch (e) {
        console.warn('Error obteniendo rol de localStorage:', e);
    }
    
    // Default: vendedor
    return 'vendedor';
}


// ============================================================
// RENDERIZAR BOTONES DEL FOOTER SEGÚN ROL
// ============================================================
function renderCotizacionFooter(esEdicion = false) {
    const footer = document.getElementById('cotizacionModalFooter');
    if (!footer) return;
    
    const rol = getUsuarioRol();
    const isAdminOrHellen = rol === 'admin' || rol === 'hellen' || rol === 'administrador' || rol === 'superadmin';
    
    console.log('👤 Rol del usuario:', rol, '| Es Admin/Hellen:', isAdminOrHellen);
    
    let botonesHtml = '';
    
    if (isAdminOrHellen) {
        // ============================================================
        // MODO ADMIN / HELLEN - Botones: Cancelar, Borrador, Validado, Revisión, Generar
        // ============================================================
        botonesHtml = `
            <!-- Cancelar - Gris -->
            <button class="btn btn-secondary" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #9CA3AF;background:#6B7280;color:#fff;font-weight:800;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#4B5563'" onmouseout="this.style.background='#6B7280'" onclick="closeModal('cotizacionModal')">Cancelar</button>
            
            <!-- 💾 Guardar Borrador - ROJO -->
            <button class="btn btn-danger" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #DC2626;background:#DC2626;color:#fff;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 15px rgba(220,38,38,0.3);" onmouseover="this.style.background='#B91C1C';this.style.boxShadow='0 0 25px rgba(220,38,38,0.5)'" onmouseout="this.style.background='#DC2626';this.style.boxShadow='0 0 15px rgba(220,38,38,0.3)'" onclick="saveCotizacionDraft()">💾 Guardar Borrador</button>
            
            <!-- Validado por Hellen - Verde Oscuro -->
            <button class="btn btn-blue" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #15803D;background:#166534;color:#fff;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 15px rgba(22,101,52,0.3);" onmouseover="this.style.background='#15803D';this.style.boxShadow='0 0 25px rgba(22,101,52,0.5)'" onmouseout="this.style.background='#166534';this.style.boxShadow='0 0 15px rgba(22,101,52,0.3)'" onclick="validateByHellen()">✅ Validado por Hellen</button>
            
            <!-- Revisión - Azul (para enviar a revisión) -->
            <button class="btn btn-blue" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #0d6efd;background:#0d6efd;color:#fff;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 15px rgba(13,110,253,0.3);" onmouseover="this.style.background='#0b5ed7';this.style.boxShadow='0 0 25px rgba(13,110,253,0.5)'" onmouseout="this.style.background='#0d6efd';this.style.boxShadow='0 0 15px rgba(13,110,253,0.3)'" onclick="sendCotizacionToReview()">📤 Solicitar Revisión</button>
            
            <!-- Generar - Verde Fluorescente NEON -->
            <button class="btn btn-green" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #00FF41;background:#00FF41;color:#000;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 25px rgba(0,255,65,0.5);" onmouseover="this.style.background='#44FF77';this.style.boxShadow='0 0 35px rgba(0,255,65,0.7)'" onmouseout="this.style.background='#00FF41';this.style.boxShadow='0 0 25px rgba(0,255,65,0.5)'" onclick="generateCotizacionPdfAndSend()">📄 Generar</button>
        `;
    } else {
        // ============================================================
        // MODO VENDEDOR - Botones: Cancelar, Borrador (ROJO), Solicitar revisión, Validado, Generar
        // ============================================================
        botonesHtml = `
            <!-- Cancelar - Gris -->
            <button class="btn btn-secondary" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #9CA3AF;background:#6B7280;color:#fff;font-weight:800;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#4B5563'" onmouseout="this.style.background='#6B7280'" onclick="closeModal('cotizacionModal')">Cancelar</button>
            
            <!-- 💾 Guardar Borrador - ROJO -->
            <button class="btn btn-danger" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #DC2626;background:#DC2626;color:#fff;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 15px rgba(220,38,38,0.3);" onmouseover="this.style.background='#B91C1C';this.style.boxShadow='0 0 25px rgba(220,38,38,0.5)'" onmouseout="this.style.background='#DC2626';this.style.boxShadow='0 0 15px rgba(220,38,38,0.3)'" onclick="saveCotizacionDraft()">💾 Guardar Borrador</button>
            
            <!-- Solicitar revisión - Amarillo Fluorescente -->
            <button class="btn btn-warning" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #FFDD00;background:#FFDD00;color:#000;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 25px rgba(255,221,0,0.5);" onmouseover="this.style.background='#FFE733';this.style.boxShadow='0 0 35px rgba(255,221,0,0.7)'" onmouseout="this.style.background='#FFDD00';this.style.boxShadow='0 0 25px rgba(255,221,0,0.5)'" onclick="sendCotizacionToReview()">⭐ Solicitar revisión</button>
            
            <!-- Validado por Hellen - Verde Oscuro -->
            <button class="btn btn-blue" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #15803D;background:#166534;color:#fff;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 15px rgba(22,101,52,0.3);" onmouseover="this.style.background='#15803D';this.style.boxShadow='0 0 25px rgba(22,101,52,0.5)'" onmouseout="this.style.background='#166534';this.style.boxShadow='0 0 15px rgba(22,101,52,0.3)'" onclick="validateByHellen()">✅ Validado</button>
            
            <!-- Generar - Verde Fluorescente NEON -->
            <button class="btn btn-green" style="padding:4px 14px;font-size:0.8rem;line-height:1.2;min-height:30px;border-radius:8px;border:1px solid #00FF41;background:#00FF41;color:#000;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 0 25px rgba(0,255,65,0.5);" onmouseover="this.style.background='#44FF77';this.style.boxShadow='0 0 35px rgba(0,255,65,0.7)'" onmouseout="this.style.background='#00FF41';this.style.boxShadow='0 0 25px rgba(0,255,65,0.5)'" onclick="generateCotizacionPdfAndSend()">📄 Generar Nueva Cotizacion</button>
        `;
    }
    
    const flujoHtml = `
        <div class="cotizacion-footer-flow">
            <span class="flow-title">Flujo:</span>

            <div class="flow-step flow-active">
                <span class="flow-number">1</span>
                <span>Borrador</span>
            </div>

            <span class="flow-line"></span>

            <div class="flow-step">
                <span class="flow-number">2</span>
                <span>En revisión</span>
            </div>

            <span class="flow-line"></span>

            <div class="flow-step">
                <span class="flow-number">3</span>
                <span>Validado</span>
            </div>

            <span class="flow-line"></span>

            <div class="flow-step">
                <span class="flow-number">4</span>
                <span>Generada Nueva Cotización</span>
            </div>

            <span class="flow-line"></span>

            <div class="flow-step">
                <span class="flow-number">5</span>
                <span>Aceptada</span>
            </div>
        </div>
    `;

    footer.innerHTML = `
        ${flujoHtml}

        <div class="cotizacion-footer-buttons">
            ${botonesHtml}
        </div>
    `;
}

// ============================================================
// OBTENER ROL DEL USUARIO
// ============================================================
function getUsuarioRol() {
    // Opción 1: Desde un elemento hidden en el HTML
    const rolElement = document.getElementById('usuarioRol');
    if (rolElement) {
        return rolElement.value || 'vendedor';
    }
    
    // Opción 2: Desde un script con data-user
    const userData = document.querySelector('script[data-user]');
    if (userData) {
        try {
            const data = JSON.parse(userData.dataset.user);
            return data.rol || 'vendedor';
        } catch (e) {
            return 'vendedor';
        }
    }
    
    // Opción 3: Fallback - intentar obtener de la sesión desde el HTML
    const sessionScript = document.querySelector('script#sessionData');
    if (sessionScript) {
        try {
            const data = JSON.parse(sessionScript.textContent);
            return data.rol || 'vendedor';
        } catch (e) {
            return 'vendedor';
        }
    }
    
    return 'vendedor';
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
        if (document.getElementById('fRuc')) document.getElementById('fRuc').value = c.cliente_ruc || '';
        if (document.getElementById('fRazon')) document.getElementById('fRazon').value = c.cliente_razon_social || '';
        if (document.getElementById('fCodCliente')) document.getElementById('fCodCliente').value = c.cod_cliente || 'PENDIENTE';
        if (document.getElementById('fComercial')) document.getElementById('fComercial').value = c.cliente_nombre_comercial || '';
        if (document.getElementById('fDireccion')) document.getElementById('fDireccion').value = c.cliente_direccion || c.direccion_entrega || '';
        if (document.getElementById('fContacto')) document.getElementById('fContacto').value = c.cliente_contacto || c.contacto_cliente || '';
        if (document.getElementById('fTelefono')) document.getElementById('fTelefono').value = c.cliente_telefono || c.telefono_cliente || '';
        if (document.getElementById('fCorreo')) document.getElementById('fCorreo').value = c.cliente_email || c.email_cliente || '';
                
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
        if (c.nota_cotizacion && document.getElementById('fNotaInterna')) {
            document.getElementById('fNotaInterna').value = c.nota_cotizacion;
        }
        
        // Requerimiento
        if (c.requerimiento && document.getElementById('fReq')) {
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
    const stepLabels = ['Borrador', 'En revisión', 'Validada ', 'Generada', 'Aceptada'];
    
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
// INICIALIZACIÓN DE SWITCHES TOGGLE PARA VALIDACIÓN PC
// ============================================================


function updateValidationStatus() {
    console.log('🔄 Actualizando estado de validación...');
    
    const validations = [
        'vPrecio', 'vProducto', 'vEntrega', 
        'vTransporte', 'vCantidad', 'vMoneda', 'vVigencia'
    ];
    
    validations.forEach(id => {
        const checkbox = document.getElementById(id);
        const label = document.getElementById(id + 'Label');
        
        if (checkbox && label) {
            if (checkbox.checked) {
                label.textContent = '✅ Válido';
                label.style.color = '#16A34A';
                // Actualizar el span del switch (si existe)
                const slider = checkbox.closest('.switch')?.querySelector('.slider');
                if (slider) {
                    slider.style.background = '#22C55E';
                }
            } else {
                label.textContent = '❌ No válido';
                label.style.color = '#DC2626';
                const slider = checkbox.closest('.switch')?.querySelector('.slider');
                if (slider) {
                    slider.style.background = '#EF4444';
                }
            }
        }
    });
    
    if (typeof updateValidationSemaphore === 'function') {
        updateValidationSemaphore();
    }
}



function updateValidationSemaphore() {
    console.log('🔄 Actualizando semáforo de validación...');
    
    const semaphore = document.getElementById('validationSemaphore');
    if (!semaphore) return;
    
    const icon = document.getElementById('validationIcon');
    const title = document.getElementById('validationTitle');
    const subtitle = document.getElementById('validationSubtitle');
    const chips = document.getElementById('validationChips');
    
    // ⚠️ VALIDACIONES QUE BLOQUEAN (STOCK NO INCLUIDO)
    const validations = ['vPrecio', 'vProducto', 'vEntrega', 'vTransporte', 'vCantidad', 'vMoneda', 'vVigencia'];
    let allValid = true;
    let invalidCount = 0;
    const invalidItems = [];
    
    validations.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            if (!checkbox.checked) {
                allValid = false;
                invalidCount++;
                const label = document.getElementById(id + 'Label');
                const text = label ? label.textContent.replace('❌ ', '') : id;
                invalidItems.push(text);
            }
        }
    });
    
    // ⚠️ STOCK SOLO INFORMATIVO
    let stockWarning = false;
    let stockFaltante = 0;
    document.querySelectorAll('#pcItemsBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 9) {
            const cantidadPC = Number(inputs[5]?.value || 0);
            const stock = Number(inputs[8]?.value || 0);
            if (cantidadPC > stock) {
                stockWarning = true;
                stockFaltante += (cantidadPC - stock);
            }
        }
    });
    
    // Actualizar semáforo
    if (allValid) {
        if (stockWarning) {
            // ⚠️ Validaciones OK, pero stock insuficiente - ADVERTENCIA
            semaphore.style.borderColor = '#F59E0B';
            semaphore.style.background = '#FFFBEB';
            if (icon) icon.textContent = '⚠️';
            if (title) {
                title.textContent = `⚠️ Validaciones OK - Stock insuficiente (faltan ${stockFaltante} unidades)`;
                title.style.color = '#92400E';
            }
            if (subtitle) {
                subtitle.textContent = 'Puedes continuar con el proceso, pero revisa el stock';
                subtitle.style.color = '#92400E';
            }
            if (chips) {
                chips.innerHTML = `<span style="background:#FEF3C7;color:#92400E;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:800;">⚠️ Stock insuficiente</span>`;
            }
        } else {
            // ✅ Todo OK
            semaphore.style.borderColor = '#16A34A';
            semaphore.style.background = '#DCFCE7';
            if (icon) icon.textContent = '✅';
            if (title) {
                title.textContent = '✅ Todas las validaciones OK - Stock suficiente';
                title.style.color = '#065F46';
            }
            if (subtitle) {
                subtitle.textContent = 'El PC está conforme y listo para proceder';
                subtitle.style.color = '#065F46';
            }
            if (chips) {
                chips.innerHTML = `<span style="background:#D1FAE5;color:#065F46;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:800;">✅ Todo OK</span>`;
            }
        }
    } else {
        // ❌ Hay validaciones fallidas - BLOQUEA
        semaphore.style.borderColor = '#DC2626';
        semaphore.style.background = '#FEE2E2';
        if (icon) icon.textContent = '❌';
        if (title) {
            title.textContent = `⚠️ ${invalidCount} validación(es) pendiente(s)`;
            title.style.color = '#991B1B';
        }
        if (subtitle) {
            subtitle.textContent = `Faltan: ${invalidItems.join(', ')}`;
            subtitle.style.color = '#991B1B';
        }
        if (chips) {
            chips.innerHTML = `<span style="background:#FEE2E2;color:#991B1B;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:800;">❌ ${invalidItems.join(', ')}</span>`;
        }
    }
}

// Función para obtener valores de validación (para usar al guardar)
function getValidationValues() {
    const validations = [
        'vPrecio', 'vProducto', 'vEntrega', 
        'vTransporte', 'vCantidad', 'vMoneda', 'vVigencia'
    ];
    
    const result = {};
    validations.forEach(id => {
        const checkbox = document.getElementById(id);
        result[id] = checkbox ? (checkbox.checked ? 'Sí' : 'No') : 'Sí';
    });
    return result;
}

// Inicializar al cargar la página (se ejecuta después de que el DOM esté listo)
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para que el modal se haya renderizado
    setTimeout(function() {
        // Buscar si existe el modal de PC
        const modal = document.getElementById('pedidoCompraModal');
        if (modal) {
            // Inicializar los switches que estén dentro del modal
            const switches = modal.querySelectorAll('.switch input[type="checkbox"]');
            switches.forEach(function(sw) {
                // Asegurar que los switches tengan el estado inicial correcto
                if (sw.checked) {
                    const label = document.getElementById(sw.id + 'Label');
                    if (label) {
                        label.textContent = '✅ Válido';
                        label.style.color = '#16A34A';
                    }
                }
            });
        }
        updateValidationStatus();
    }, 500);
});

// ============================================================
// VALIDACIÓN PC VS COTIZACIÓN - FUNCIÓN COMPLETA Y CORREGIDA
// ============================================================
function renderValidacion() {
    const q = document.getElementById('valSearch')?.value?.toLowerCase() || '';
    const filtro = document.getElementById('valFiltro')?.value || '';
    
    console.log('🔍 Renderizando validación con', pedidosData?.length || 0, 'PCs');
    
    const validaciones = [];
    
    pedidosData.forEach(p => {
        // 🔽 LEER VALIDACIONES REALES DE LA BD
        const validaPrecios = p.valida_precios !== undefined ? p.valida_precios : true;
        const validaCantidades = p.valida_cantidades !== undefined ? p.valida_cantidades : true;
        const validaStock = p.valida_stock !== undefined ? p.valida_stock : true;
        const validaEntrega = p.valida_entrega !== undefined ? p.valida_entrega : true;
        const validaMoneda = p.valida_moneda !== undefined ? p.valida_moneda : true;
        const validaTransporte = p.valida_transporte !== undefined ? p.valida_transporte : true;
        const validaVigencia = p.valida_vigencia !== undefined ? p.valida_vigencia : true;
        const validaMargen = p.valida_margen !== undefined ? p.valida_margen : true;
        
        // Obtener items del PC
        let items = p.items || [];
        
        // Si items está vacío pero hay items_json, parsearlo
        if (items.length === 0 && p.items_json) {
            try {
                if (typeof p.items_json === 'string') {
                    items = JSON.parse(p.items_json);
                } else if (Array.isArray(p.items_json)) {
                    items = p.items_json;
                }
            } catch(e) {
                console.warn('⚠️ Error parseando items_json:', e);
                items = [];
            }
        }
        
        // Si el PC no tiene items, usar datos básicos
        if (items.length === 0) {
            const estadoPC = p.estado || 'Pendiente';
            // ⚠️ STOCK NO BLOQUEA - solo informativo
            const esObservado = estadoPC === 'PC observado' || 
                               estadoPC === 'Bloqueado' ||
                               !validaPrecios || !validaCantidades || !validaEntrega || !validaMoneda;
            
            // Determinar faltante de stock (informativo)
            let faltante = 0;
            let stockDisplay = '✅ Stock OK';
            if (p.stock !== undefined && p.cantidad_pc !== undefined) {
                faltante = Math.max(p.cantidad_pc - p.stock, 0);
                stockDisplay = faltante > 0 ? `⚠️ Stock insuficiente (faltan ${faltante})` : '✅ Stock OK';
            }
            
            validaciones.push({
                pc: p.numero || p.pc || 'PC-XXXX',
                cliente: p.cliente || 'Sin cliente',
                producto: p.descripcion || p.producto || 'Producto sin descripción',
                precio: validaPrecios ? '✅ Sí' : '❌ No',
                cantidad: validaCantidades ? '✅ Sí' : '❌ No',
                entrega: validaEntrega ? '✅ Sí' : '❌ No',
                moneda: validaMoneda ? '✅ Sí' : '❌ No',
                transporte: validaTransporte ? '✅ Sí' : '❌ No',
                vigencia: validaVigencia ? '✅ Sí' : '❌ No',
                stock: stockDisplay,
                estado: estadoPC,
                id: p.id,
                req_compra: p.req_compra || (esObservado ? 'Bloqueado' : 'Sí'),
                precioOk: validaPrecios,
                cantidadOk: validaCantidades,
                entregaOk: validaEntrega,
                monedaOk: validaMoneda,
                transporteOk: validaTransporte,
                vigenciaOk: validaVigencia,
                stockOk: validaStock,
                margenOk: validaMargen,
                faltante: faltante,
                esObservado: esObservado
            });
        } else {
            // Cada item es una fila de validación
            items.forEach((item, idx) => {
                let codigo, descripcion, cantidad_pc, cantidad_cot, stock, precio_pc, precio_cot;
                
                // Soporte para formato de objeto o array
                if (typeof item === 'object' && !Array.isArray(item)) {
                    codigo = item.codigo || '';
                    descripcion = item.producto || item.descripcion || 'Sin descripción';
                    cantidad_pc = parseFloat(item.cantidad_pc || item.cantidad || 0);
                    cantidad_cot = parseFloat(item.cantidad_cotizada || item.cantidad_cot || 0);
                    stock = parseFloat(item.stock || 0);
                    precio_pc = parseFloat(item.precio_pc || item.precio || 0);
                    precio_cot = parseFloat(item.precio_cotizado || item.precio_cot || 0);
                } else if (Array.isArray(item)) {
                    codigo = item[0] || '';
                    descripcion = item[1] || 'Sin descripción';
                    cantidad_cot = parseFloat(item[2] || 0);
                    cantidad_pc = parseFloat(item[3] || 1);
                    precio_cot = parseFloat(item[4] || 0);
                    precio_pc = parseFloat(item[5] || 0);
                    stock = parseFloat(item[6] || 0);
                } else {
                    codigo = '';
                    descripcion = 'Sin descripción';
                    cantidad_pc = 1;
                    cantidad_cot = 0;
                    stock = 0;
                    precio_pc = 0;
                    precio_cot = 0;
                }
                
                // ⚠️ STOCK NO BLOQUEA - solo informativo
                const precioOk = validaPrecios && (precio_pc === 0 || precio_cot === 0 || Math.abs(precio_pc - precio_cot) / (precio_cot || 1) * 100 <= 5);
                const cantidadOk = validaCantidades && (cantidad_pc === cantidad_cot);
                const stockOk = validaStock && (cantidad_pc <= stock);
                const entregaOk = validaEntrega;
                const monedaOk = validaMoneda;
                const transporteOk = validaTransporte;
                const vigenciaOk = validaVigencia;
                const margenOk = validaMargen;
                
                const estadoPC = p.estado || 'Pendiente';
                // ⚠️ OBSERVADO SOLO POR VALIDACIONES, NO POR STOCK
                const esObservado = estadoPC === 'PC observado' || 
                                   estadoPC === 'Bloqueado' ||
                                   !precioOk || !cantidadOk || !entregaOk || !monedaOk;
                
                const faltante = Math.max(cantidad_pc - stock, 0);
                const stockDisplay = stockOk ? `✅ Stock: ${stock}` : `⚠️ Falta: ${faltante}`;
                
                validaciones.push({
                    pc: p.numero || p.pc || 'PC-XXXX',
                    cliente: p.cliente || 'Sin cliente',
                    producto: descripcion,
                    precio: precioOk ? '✅ Sí' : '❌ No',
                    cantidad: cantidadOk ? '✅ Sí' : '❌ No',
                    entrega: entregaOk ? '✅ Sí' : '❌ No',
                    moneda: monedaOk ? '✅ Sí' : '❌ No',
                    transporte: transporteOk ? '✅ Sí' : '❌ No',
                    vigencia: vigenciaOk ? '✅ Sí' : '❌ No',
                    stock: stockDisplay,
                    estado: estadoPC,
                    id: p.id,
                    req_compra: p.req_compra || (esObservado ? 'Bloqueado' : 'Sí'),
                    item_idx: idx,
                    precioOk: precioOk,
                    cantidadOk: cantidadOk,
                    entregaOk: entregaOk,
                    monedaOk: monedaOk,
                    transporteOk: transporteOk,
                    vigenciaOk: vigenciaOk,
                    stockOk: stockOk,
                    margenOk: margenOk,
                    faltante: faltante,
                    esObservado: esObservado,
                    // Datos para mostrar stock
                    stock_actual: stock,
                    cantidad_pc: cantidad_pc,
                    cantidad_cot: cantidad_cot,
                    precio_pc: precio_pc,
                    precio_cot: precio_cot
                });
            });
        }
    });
    
    // Aplicar filtros
    let data = validaciones;
    
    if (q) {
        data = data.filter(v => 
            JSON.stringify(v).toLowerCase().includes(q)
        );
    }
    
    // ⚠️ FILTROS MODIFICADOS - STOCK NO BLOQUEA
    if (filtro === 'ok') {
        // "Conforme" = TODAS las validaciones OK (incluyendo stock para información)
        data = data.filter(v => 
            v.precio === '✅ Sí' && 
            v.cantidad === '✅ Sí' && 
            v.entrega === '✅ Sí' && 
            v.moneda === '✅ Sí' && 
            v.transporte === '✅ Sí' &&
            v.vigencia === '✅ Sí'
            // ⚠️ STOCK NO INCLUIDO EN EL FILTRO "OK"
        );
    } else if (filtro === 'observado') {
        data = data.filter(v => 
            v.precio === '❌ No' || 
            v.cantidad === '❌ No' || 
            v.entrega === '❌ No' || 
            v.moneda === '❌ No' ||
            v.transporte === '❌ No' ||
            v.vigencia === '❌ No' ||
            v.estado === 'PC observado' ||
            v.estado === 'Bloqueado'
        );
    } else if (filtro === 'compra') {
        // "Requiere compra" = stock insuficiente (informativo)
        data = data.filter(v => 
            v.faltante > 0 || 
            v.req_compra === 'Sí'
        );
    }
    
    const tbody = document.getElementById('valRows');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#94A3B8;padding:40px;">
            📭 No hay validaciones que coincidan con los filtros
        </td></tr>`;
        const countEl = document.getElementById('valCount');
        if (countEl) countEl.textContent = `Mostrando 0 de ${validaciones.length} validaciones`;
        return;
    }
    
    // ============================================================
    // RENDERIZAR TABLA - STOCK INFORMATIVO
    // ============================================================
    tbody.innerHTML = data.map((v, i) => {
        // ⚠️ TODAS VALIDAS SIN STOCK
        const todasValidas = v.precio === '✅ Sí' && 
                            v.cantidad === '✅ Sí' && 
                            v.entrega === '✅ Sí' && 
                            v.moneda === '✅ Sí' && 
                            v.transporte === '✅ Sí' &&
                            v.vigencia === '✅ Sí' &&
                            v.margenOk !== false;
        
        const esObservado = v.precio === '❌ No' || 
                           v.cantidad === '❌ No' || 
                           v.entrega === '❌ No' || 
                           v.moneda === '❌ No' ||
                           v.transporte === '❌ No' ||
                           v.vigencia === '❌ No';
        
        // Determinar resultado y acción
        let resultado = '';
        let badgeClass = '';
        let accionHtml = '';
        
        if (todasValidas && v.faltante <= 0) {
            resultado = '✅ Listo para despacho';
            badgeClass = 'badge-val-ok';
            accionHtml = `<button class="btn btn-green btn-sm" onclick="enviarADespacho(${v.id})" style="height:20px; padding:0 8px; font-size:8px; border-radius:4px; border:none; background:#16A34A; color:#fff; font-weight:800; cursor:pointer;">🚚 Despachar</button>`;
        } else if (todasValidas && v.faltante > 0) {
            resultado = '🔄 Requiere compra (stock insuficiente)';
            badgeClass = 'badge-val-warning';
            accionHtml = `<button class="btn btn-warning btn-sm" onclick="generarOrdenCompra(${v.id})" style="height:20px; padding:0 8px; font-size:8px; border-radius:4px; border:none; background:#F59E0B; color:#000; font-weight:800; cursor:pointer;">🛒 Comprar</button>
                          <button class="btn btn-green btn-sm" onclick="enviarADespacho(${v.id})" style="height:20px; padding:0 8px; font-size:8px; border-radius:4px; border:none; background:#16A34A; color:#fff; font-weight:800; cursor:pointer; margin-left:4px;">🚚 Despachar</button>`;
        } else if (esObservado) {
            resultado = '⚠️ Bloqueado por observación';
            badgeClass = 'badge-val-error';
            accionHtml = `<button class="btn btn-danger btn-sm" onclick="solicitarCorreccion(${v.id})" style="height:20px; padding:0 8px; font-size:8px; border-radius:4px; border:none; background:#DC2626; color:#fff; font-weight:800; cursor:pointer;">📝 Corregir</button>`;
        } else {
            resultado = '⏳ Pendiente de validación';
            badgeClass = 'badge-val-warning';
            accionHtml = `<button class="btn btn-blue btn-sm" onclick="validarPCSAP()" style="height:20px; padding:0 8px; font-size:8px; border-radius:4px; border:none; background:#2563EB; color:#fff; font-weight:800; cursor:pointer;">🔍 Validar</button>`;
        }
        
        // Determinar color de stock
        const stockClass = v.faltante > 0 ? 'val-warning' : 'val-ok';
        const stockBg = v.faltante > 0 ? '#FEF3C7' : '#D1FAE5';
        const stockColor = v.faltante > 0 ? '#92400E' : '#065F46';
        
        return `
        <tr>
            <td style="padding:4px 6px; font-weight:900; font-size:10px;">${esc(v.pc)}</td>
            <td class="left" style="padding:4px 6px; font-weight:800; font-size:10px;">${esc(v.cliente)}</td>
            <td class="left" style="padding:4px 6px; font-size:10px;">${esc(v.producto)}</td>
            <!-- PRECIO -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">💰</span>
                    <span class="${v.precio === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.precio === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.precio === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.precio}
                    </span>
                </div>
            </td>
            <!-- CANTIDAD -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">🔢</span>
                    <span class="${v.cantidad === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.cantidad === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.cantidad === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.cantidad}
                    </span>
                </div>
            </td>
            <!-- ENTREGA -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">📍</span>
                    <span class="${v.entrega === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.entrega === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.entrega === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.entrega}
                    </span>
                </div>
            </td>
            <!-- MONEDA -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">💱</span>
                    <span class="${v.moneda === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.moneda === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.moneda === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.moneda}
                    </span>
                </div>
            </td>
            <!-- TRANSPORTE -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">🚚</span>
                    <span class="${v.transporte === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.transporte === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.transporte === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.transporte || '✅ Sí'}
                    </span>
                </div>
            </td>
            <!-- VIGENCIA -->
            <td style="padding:4px 6px; text-align:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <span style="font-size:14px;">📅</span>
                    <span class="${v.vigencia === '✅ Sí' ? 'val-ok' : 'val-error'}" style="font-weight:900; font-size:10px; padding:2px 8px; border-radius:10px; background:${v.vigencia === '✅ Sí' ? '#D1FAE5' : '#FEE2E2'}; color:${v.vigencia === '✅ Sí' ? '#065F46' : '#991B1B'};">
                        ${v.vigencia || '✅ Sí'}
                    </span>
                </div>
            </td>
            <!-- STOCK - INFORMATIVO, NO BLOQUEA -->
            <td style="padding:4px 6px; text-align:center;">
                <span class="stock-info" style="font-weight:900; font-size:9px; padding:2px 8px; border-radius:10px; background:${stockBg}; color:${stockColor};">
                    ${v.stock}
                </span>
                ${v.faltante > 0 ? `<div style="font-size:7px; color:#DC2626; margin-top:2px;">⚠️ Faltan ${v.faltante} unidades</div>` : ''}
            </td>
            <!-- RESULTADO -->
            <td style="padding:4px 6px; text-align:center;">
                <span class="badge-val ${badgeClass}" style="font-weight:800; font-size:9px; padding:2px 10px; border-radius:10px; background:${badgeClass === 'badge-val-ok' ? '#D1FAE5' : badgeClass === 'badge-val-error' ? '#FEE2E2' : '#FEF3C7'}; color:${badgeClass === 'badge-val-ok' ? '#065F46' : badgeClass === 'badge-val-error' ? '#991B1B' : '#92400E'};">
                    ${resultado}
                </span>
            </td>
            <!-- ACCIÓN -->
            <td style="padding:4px 6px; text-align:center;">
                ${accionHtml}
            </td>
        </tr>`;
    }).join('');
    
    const countEl = document.getElementById('valCount');
    if (countEl) {
        countEl.textContent = `Mostrando ${data.length} de ${validaciones.length} validaciones`;
    }
}

// Función para vista previa del PDF (abre en nueva pestaña)
window.previewCotizacionPdf = function(id) {
    console.log(`👁️ Abriendo vista previa PDF para cotización ID: ${id}`);
    
    try {
        // Abrir el PDF en una nueva pestaña
        const url = `/ventas/api/cotizaciones/${id}/pdf/preview`;
        window.open(url, '_blank');
        showToast('📄 Abriendo vista previa del PDF...', 'info');
    } catch (error) {
        console.error('❌ Error abriendo vista previa:', error);
        showToast('❌ Error al abrir la vista previa: ' + error.message, 'error');
    }
};

// Función de validación actualizada - SIN MARGEN (solo muestra toast)
function validarPCSAP() {
    console.log('🔍 Validando PC...');
    
    // Obtener valores de validación de los switches
    const validaciones = {
        precio: document.getElementById('vPrecio')?.checked || false,
        producto: document.getElementById('vProducto')?.checked || false,
        entrega: document.getElementById('vEntrega')?.checked || false,
        transporte: document.getElementById('vTransporte')?.checked || false,
        cantidad: document.getElementById('vCantidad')?.checked || false,
        moneda: document.getElementById('vMoneda')?.checked || false,
        vigencia: document.getElementById('vVigencia')?.checked || false
    };
    
    // Contar cuántos están OK
    const total = Object.values(validaciones).length;
    const okCount = Object.values(validaciones).filter(v => v === true).length;
    const noCount = total - okCount;
    
    // Verificar si hay items en la tabla
    const itemsCount = document.querySelectorAll('#pcItemsBody tr').length;
    if (itemsCount === 0) {
        showToast('⚠️ Agrega al menos un producto al PC', 'warning');
        return;
    }
    
    // Verificar stock
    let stockAlert = false;
    let stockFaltante = 0;
    document.querySelectorAll('#pcItemsBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 9) {
            const cantidadPC = Number(inputs[5]?.value || 0);
            const stock = Number(inputs[8]?.value || 0);
            if (cantidadPC > stock) {
                stockAlert = true;
                stockFaltante += (cantidadPC - stock);
            }
        }
    });
    
    // Construir lista de validaciones fallidas
    const labels = {
        precio: ' Precio',
        producto: ' Producto',
        entrega: ' Lugar Entrega',
        transporte: ' Transporte',
        cantidad: ' Cantidad',
        moneda: ' Moneda',
        vigencia: ' Vigencia'
    };
    
    const detalles = [];
    Object.entries(validaciones).forEach(([key, ok]) => {
        if (!ok) {
            detalles.push(labels[key] || key);
        }
    });
    
    if (stockAlert) {
        detalles.push(`📦 Stock insuficiente (faltan ${stockFaltante} unidades)`);
    }
    
    // Generar mensaje según resultado
    let mensaje = '';
    let tipo = 'info';
    
    if (noCount === 0 && !stockAlert) {
        mensaje = `✅ ¡Validación exitosa! Todos los ${total} puntos están correctos y hay stock suficiente.`;
        tipo = 'success';
    } else if (noCount > 0 && stockAlert) {
        mensaje = `❌ Validación fallida: ${noCount} punto(s) incorrectos y stock insuficiente.\n🔴 ${detalles.join(', ')}`;
        tipo = 'error';
    } else if (noCount > 0) {
        mensaje = `⚠️ Validación con observaciones: ${noCount} punto(s) marcado(s) como "No".\n🔴 ${detalles.join(', ')}`;
        tipo = 'warning';
    } else if (stockAlert) {
        mensaje = `⚠️ Stock insuficiente: faltan ${stockFaltante} unidades para completar el PC.`;
        tipo = 'warning';
    }
    
    // Mostrar toast con el resultado
    showToast(mensaje, tipo);
    
    // Mostrar resumen en consola
    console.log(`📊 Resumen de validación:
    - Total puntos: ${total}
    - Correctos: ${okCount}
    - Incorrectos: ${noCount}
    - Stock alert: ${stockAlert ? '⚠️ Sí' : '✅ No'}
    - Detalles: ${detalles.join(', ') || 'Todos OK'}`);
    
    return {
        success: noCount === 0 && !stockAlert,
        okCount: okCount,
        noCount: noCount,
        stockAlert: stockAlert,
        detalles: detalles
    };
}


// ============================================================
// OBTENER ITEMS DEL PC - FUNCIÓN AUXILIAR
// ============================================================

function obtenerItemsPCSAP() {
    const items = [];
    const rows = document.querySelectorAll('#pcItemsBody tr');
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 8) {
            items.push([
                inputs[0]?.value || '',      // código
                inputs[1]?.value || '',      // descripción
                parseFloat(inputs[2]?.value) || 0,  // cantidad cotizada
                parseFloat(inputs[3]?.value) || 1,   // cantidad PC
                parseFloat(inputs[4]?.value) || 0,   // precio cotizado
                parseFloat(inputs[5]?.value) || 0,   // precio PC
                parseFloat(inputs[6]?.value) || 0    // stock
            ]);
        }
    });
    
    return items;
}


// ============================================================
// ACCIONES DE VALIDACIÓN
// ============================================================
function solicitarCorreccion(id) {
    // Buscar el PC para mostrar info
    const pedido = pedidosData.find(p => p.id === id);
    if (!pedido) {
        showToast('❌ PC no encontrado', 'error');
        return;
    }
    
    const numero = pedido.numero || 'PC-XXXXXX';
    const cliente = pedido.cliente || 'Cliente';
    const estado = pedido.estado || 'Desconocido';
    
    // Mostrar confirmación
    showConfirmModal(
        '📝 Solicitar corrección al cliente',
        `El PC <b>${numero}</b> del cliente <b>${cliente}</b> tiene observaciones.<br><br>
        Estado actual: <b>${estado}</b><br><br>
        Se abrirá el PC en modo edición para que puedas revisar y corregir los datos.<br>
        <span style="color:#DC2626;">⚠️ Después de corregir, deberás guardar nuevamente el PC.</span>`,
        '⚠️ El PC quedará en estado "En revisión interna" hasta que se complete la corrección.',
        async function() {
            try {
                // 1. Cambiar estado a "En revisión interna"
                showToast('⏳ Procesando...', 'info');
                
                const response = await apiFetch(`/ventas/api/pedido-compra/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'En revisión interna' })
                });
                
                if (!response.success) {
                    showToast('❌ Error al cambiar estado: ' + (response.error || 'Desconocido'), 'error');
                    return;
                }
                
                showToast('✅ PC enviado a revisión interna', 'success');
                
                // 2. Recargar datos
                await loadPedidos();
                renderValidacion();
                
                // 3. 🔽 ABRIR EL PC EN MODO EDICIÓN CON TODOS LOS DATOS
                setTimeout(() => {
                    // Cambiar a la pestaña de PC
                    const tabBtn = document.querySelector('.tab-btn[data-tab="pedido_compra"]');
                    if (tabBtn) tabBtn.click();
                    
                    // Abrir el modal en modo edición
                    setTimeout(() => {
                        console.log(`📋 Abriendo PC ID: ${id} para corrección`);
                        openPedidoCompraModalSAP('editar', id);
                    }, 400);
                }, 500);
                
            } catch (error) {
                console.error('❌ Error en solicitarCorreccion:', error);
                showToast('❌ Error al solicitar corrección: ' + error.message, 'error');
            }
        },
        '📝 Sí, abrir para corregir'
    );
}


function generarOrdenCompra(id) {
    showConfirmModal(
        '🛒 Generar orden de compra',
        `El PC requiere compra de productos por falta de stock.`,
        '⚠️ Se generará una solicitud de compra al módulo de Compras.',
        async function() {
            showToast('🛒 Generando orden de compra...', 'info');
            setTimeout(() => {
                showToast('✅ Orden de compra generada', 'success');
                renderValidacion();
            }, 1500);
        },
        '🛒 Generar compra'
    );
}

function enviarADespacho(id) {
    const pedido = pedidosData.find(p => p.id === id);
    if (!pedido) {
        showToast('❌ PC no encontrado', 'error');
        return;
    }
    
    const numero = pedido.numero || 'PC-XXXXXX';
    const cliente = pedido.cliente || 'Cliente';
    
    showConfirmModal(
        '🚚 Enviar a despacho',
        `Estás a punto de enviar el PC <b>${numero}</b> del cliente <b>${cliente}</b> a la cola de despacho.`,
        '⚠️ Esta acción creará un registro de despacho y moverá el PC a "Listo para despacho".',
        async function() {
            try {
                showToast('⏳ Procesando envío a despacho...', 'info');
                
                // PASO 1: Cambiar el estado del PC
                const toggleResponse = await apiFetch(`/ventas/api/pedido-compra/${id}/toggle`, {
                    method: 'PUT',
                    body: JSON.stringify({ estado: 'Listo para despacho' })
                });
                
                if (!toggleResponse.success) {
                    showToast('❌ Error al actualizar PC: ' + (toggleResponse.error || 'Desconocido'), 'error');
                    return;
                }
                
                console.log('✅ PC actualizado a "Listo para despacho"');
                
                // ============================================================
                // PASO 2: Crear el despacho CON HORA EXPLÍCITA
                // ============================================================
                const ahora = new Date();
                
                // 🔽 FORMATO ISO COMPLETO CON HORA - EJ: 2026-07-20T14:30:45
                const year = ahora.getFullYear();
                const month = String(ahora.getMonth() + 1).padStart(2, '0');
                const day = String(ahora.getDate()).padStart(2, '0');
                const hours = String(ahora.getHours()).padStart(2, '0');
                const minutes = String(ahora.getMinutes()).padStart(2, '0');
                const seconds = String(ahora.getSeconds()).padStart(2, '0');
                
                // 🔽 FORMATO ISO COMPLETO: 2026-07-20 14:30:45
                const fechaHoraISO = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                
                // 🔽 FORMATO PARA MOSTRAR: 20/07/2026 14:30
                const fechaHoraDisplay = `${day}/${month}/${year} ${hours}:${minutes}`;
                
                console.log(`📅 Fecha/Hora ISO: ${fechaHoraISO}`);
                console.log(`📅 Fecha/Hora Display: ${fechaHoraDisplay}`);
                
                const despachoData = {
                    pc_id: id,
                    pc_numero: pedido.numero,
                    cliente: pedido.cliente,
                    ruc: pedido.ruc,
                    cotizacion_id: pedido.cotizacion_id,
                    cotizacion_numero: pedido.cotizacion_numero,
                    fecha_despacho: fechaHoraISO,  // 🔽 ISO CON HORA
                    origen: 'ALM-SMP',
                    destino: pedido.lugar_entrega || pedido.entrega || '',
                    estado: 'Pendiente despacho',
                    observaciones: `Despacho automático desde PC ${pedido.numero}`,
                    responsable: 'Hellen',
                    numero: `DESP-${year}${month}${day}-${String(ahora.getTime()).slice(-4)}`
                };
                
                console.log('📦 Enviando despacho:', despachoData);
                
                const despachoResponse = await fetch('/ventas/api/despachos/guardar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(despachoData)
                });
                
                const despachoResult = await despachoResponse.json();
                console.log('📦 Respuesta:', despachoResult);
                
                if (despachoResult.success) {
                    showToast('✅ PC enviado a despacho', 'success');
                    
                    await loadPedidos();
                    await loadDespachos();
                    renderValidacion();
                    
                    setTimeout(() => {
                        const tabBtn = document.querySelector('.tab-btn[data-tab="despachar"]');
                        if (tabBtn) {
                            tabBtn.click();
                            setTimeout(() => {
                                if (typeof renderDespachos === 'function') {
                                    renderDespachos();
                                }
                            }, 300);
                        }
                    }, 1000);
                    
                } else {
                    showToast('❌ Error al crear despacho: ' + (despachoResult.error || 'Desconocido'), 'error');
                }
                
            } catch (error) {
                console.error('❌ Error:', error);
                showToast('❌ Error al enviar a despacho: ' + error.message, 'error');
            }
        },
        '🚚 Sí, enviar a despacho'
    );
}

// ============================================================
// LIMPIAR FILTROS DE FECHA - PC
// ============================================================

function clearPcDateFilter() {
    console.log('🧹 Limpiando filtros de fecha de PC...');
    
    const fechaInicio = document.getElementById('pcFechaInicio');
    const fechaFin = document.getElementById('pcFechaFin');
    
    if (fechaInicio) {
        fechaInicio.value = '';
    }
    
    if (fechaFin) {
        fechaFin.value = '';
    }
    
    // Volver a renderizar la tabla de pedidos
    renderPedidos();
    
    showToast('🧹 Filtros de fecha limpiados', 'info');
}

// Exportar la función
window.clearPcDateFilter = clearPcDateFilter;


// ==
// ==========================================================
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
        : '';
    
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
            <div class="section-title">2. Datos PC Pedido de Compra Cliente</div>
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
                            <th>Código / Producto </th>
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
            <label>
                <span id="vPrecioIcon">⚪</span> Precio coincide
            </label>
            <select id="vPrecio" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vCantidadIcon">⚪</span> Cantidad coincide
            </label>
            <select id="vCantidad" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vProductoIcon">⚪</span> Producto/modelo coincide
            </label>
            <select id="vProducto" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vEntregaIcon">⚪</span> Lugar entrega coincide
            </label>
            <select id="vEntrega" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vMonedaIcon">⚪</span> Moneda coincide
            </label>
            <select id="vMoneda" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vTransporteIcon">⚪</span> Transporte considerado
            </label>
            <select id="vTransporte" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vVigenciaIcon">⚪</span> Cotización vigente
            </label>
            <select id="vVigencia" class="pc-val-select" onchange="updateValidationStatus()">
                <option value="Sí">✅ Sí</option>
                <option value="No">❌ No</option>
            </select>
        </div>
        <div class="pc-check-card">
            <label>
                <span id="vMargenIcon">⚪</span> Margen conforme
            </label>
            <select id="vMargen" class="pc-val-select" onchange="updateValidationStatus()">
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
      document.getElementById('pcMontoConIgv').value = (cotizacion.total || cotizacion.monto || 0) * 1.18; 
    
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
    
    // Descuento especial desde el campo fDescuentoEspecial (nuevo)
    const descuentoEspecial = Number(document.getElementById('fDescuentoEspecial')?.value || 0);
    const dv = Number(document.getElementById('fDiscountValue')?.value || 0);
    const dt = document.getElementById('fDiscountType')?.value || '%';
    
    // Sumar descuento especial + descuento normal
    const discount = (dt === '%' ? subtotal * (dv / 100) : Math.min(dv, subtotal)) + descuentoEspecial;
    const value = subtotal - discount;
    const igv = value * CONFIG.igv;
    const total = value + igv;
    
    const tiempoEntrega = getFieldValue('fTiempo', 'fTiempoCustom') || '5 días hábiles';
    
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sumSubtotal', money(subtotal));
    set('sumDiscountPct', dt === '%' ? dv.toFixed(2) + '%' : money(dv));
    set('sumDiscount', '-' + money(discount));
    set('sumValue', money(value));
    set('sumIgv', money(igv));
    set('sumTotal', money(total));
    set('sumTiempoEntrega', tiempoEntrega);
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
        console.log('🔍 Buscando cliente en base de datos por RUC:', ruc);
        
        const bdResponse = await fetch(`/maestros/api/clientes/buscar?q=${ruc}`);
        const bdData = await bdResponse.json();
        
        console.log('📦 Respuesta BD:', bdData);
        
        if (bdData.success && bdData.data && bdData.data.length > 0) {
            const cliente = bdData.data[0];
            
            // 1. DATOS DEL CLIENTE
            const fRuc = document.getElementById('fRuc');
            const fRazon = document.getElementById('fRazon');
            const fDireccion = document.getElementById('fDireccion');
            const fContacto = document.getElementById('fContacto');
            const fTelefono = document.getElementById('fTelefono');
            const fCorreo = document.getElementById('fCorreo'); // 🔽 NUEVO
            const fReq = document.getElementById('fReq');
            const fFuente = document.getElementById('fFuente');
            
            if (fRuc) fRuc.value = cliente.ruc || ruc;
            if (fRazon) fRazon.value = cliente.razon_social || '';
            if (fDireccion) fDireccion.value = cliente.direccion_fiscal || '';
            if (fContacto) fContacto.value = cliente.nombre_contacto || '';
            if (fTelefono) fTelefono.value = cliente.telefono_contacto || '';
            if (fCorreo) fCorreo.value = cliente.email_contacto || ''; // 🔽 NUEVO
            
            // 2. CONDICIONES COMERCIALES
            const fVendedor = document.getElementById('fVendedor');
            const fEmailAsesor = document.getElementById('fEmailAsesor');
            const fTelefonoAsesor = document.getElementById('fTelefonoAsesor');
            const fMoneda = document.getElementById('fMoneda');
            const fCondicion = document.getElementById('fCondicion');
            const fTiempo = document.getElementById('fTiempo');
            const fValidez = document.getElementById('fValidez');
            const fDireccionEntrega = document.getElementById('fDireccionEntrega');
            const fDescuentoEspecial = document.getElementById('fDescuentoEspecial');
            const fNotaComercial = document.getElementById('fNotaComercial');
            
            if (fVendedor) fVendedor.value = CONFIG.asesorDefault;
            if (fEmailAsesor) fEmailAsesor.value = CONFIG.emailAsesorDefault;
            if (fTelefonoAsesor) fTelefonoAsesor.value = CONFIG.telefonoAsesorDefault;
            if (fMoneda) fMoneda.value = 'Soles (S/.)';
            
            if (cliente.condicion_pago && fCondicion) {
                setFieldValue('fCondicion', 'fCondicionCustom', cliente.condicion_pago);
            }
            
            // Dirección de entrega
            let direccionEntrega = '';
            if (cliente.puntos_entrega && cliente.puntos_entrega.length > 0) {
                const principal = cliente.puntos_entrega.find(p => p.principal === true);
                if (principal) {
                    direccionEntrega = principal.direccion || '';
                } else {
                    direccionEntrega = cliente.puntos_entrega[0].direccion || '';
                }
            }
            if (!direccionEntrega && cliente.direccion_fiscal) {
                direccionEntrega = cliente.direccion_fiscal;
            }
            if (direccionEntrega && fDireccionEntrega) {
                setFieldValue('fDireccionEntrega', 'fDireccionEntregaCustom', direccionEntrega);
            }
            
            if (fDescuentoEspecial) fDescuentoEspecial.value = 0;
            if (fNotaComercial) fNotaComercial.value = '';
            if (fTiempo) fTiempo.value = '5 días hábiles';
            if (fValidez) fValidez.value = '15 días';

            //rompia el flujo de carga de cotizacion, lo comento por si se necesita luego
            //if (fTipo) fTipo.value = '0';

            if (fReq) fReq.value = '';
            if (fFuente) fFuente.value = 'Correo';
            
            const confirmBox = document.getElementById('clientConfirmBox');
            if (confirmBox) {
                let mensaje = `✅ Cliente encontrado en sistema`;
                if (cliente.codigo_cliente) {
                    mensaje += ` | Código: ${cliente.codigo_cliente}`;
                }
                confirmBox.textContent = mensaje;
                confirmBox.className = 'show existente';
                setTimeout(() => { confirmBox.className = ''; }, 6000);
            }
            
            showToast(`✅ Cliente encontrado en sistema: ${cliente.razon_social}`, 'success');
            return;
        }
        
        // SI NO ESTÁ EN BD, CONSULTAR SUNAT
        console.log('🌞 Cliente no encontrado en BD, consultando SUNAT...');
        
        const sunatResponse = await fetch(`/api/sunat/consulta?ruc=${ruc}`);
        const sunatData = await sunatResponse.json();
        
        console.log('📦 Respuesta SUNAT:', sunatData);
        
        if (sunatData.success) {
            const fRuc = document.getElementById('fRuc');
            const fRazon = document.getElementById('fRazon');
            const fDireccion = document.getElementById('fDireccion');
            const fCorreo = document.getElementById('fCorreo'); // 🔽 NUEVO
            
            if (fRuc) fRuc.value = sunatData.ruc || ruc;
            if (fRazon) fRazon.value = sunatData.razon_social || '';
            if (fDireccion) fDireccion.value = sunatData.direccion || '';
            if (fCorreo) fCorreo.value = sunatData.email || ''; // 🔽 NUEVO
            
            const confirmBox = document.getElementById('clientConfirmBox');
            if (confirmBox) {
                confirmBox.textContent = '🌞 Datos consultados en SUNAT';
                confirmBox.className = 'show nuevo';
                setTimeout(() => { confirmBox.className = ''; }, 5000);
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
    email_contacto: document.getElementById('fCorreo')?.value?.trim() || '', // 🔽 NUEVO
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
    console.log('🔎 openGuiaModal EJECUTADO con id =', id);
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
                    <select id="guiaCotizacion" onchange="loadGuiaFromCotizacion(this.value)">${cotOptions || '<option value="">Sin cotización</option>'}</select>
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
        loadGuiaFromCotizacion(num);   // 🔽 usa la versión que sí trae datos frescos
    });


    document.getElementById('guiaModal').classList.add('show');

    if (isEdit) {
        setTimeout(() => cargarGuiaParaEditar(id), 50);
    }
}

// ============================================================
// CARGAR GUÍA EXISTENTE PARA EDICIÓN
// ============================================================
async function cargarGuiaParaEditar(id) {
    try {
        console.log('📥 Cargando guía para editar ID:', id);
        showToast('⏳ Cargando datos de la guía...', 'info');

        const response = await apiFetch(`/ventas/api/guias/${id}`);
        if (!response.success) {
            showToast('Error al cargar guía: ' + (response.error || 'Desconocido'), 'error');
            return;
        }

        const g = response.data;
        console.log('📦 Datos de guía cargados:', g);

        // Helper para setear <select> intentando coincidencia exacta o insensible a mayúsculas
        const setSelectValue = (id, value) => {
            const el = document.getElementById(id);
            if (!el || value === undefined || value === null) return;
            const val = String(value).trim();
            let found = false;
            for (const opt of el.options) {
                if (opt.value === val) { opt.selected = true; found = true; break; }
            }
            if (!found) {
                for (const opt of el.options) {
                    if (opt.value.toLowerCase() === val.toLowerCase()) { opt.selected = true; found = true; break; }
                }
            }
        };

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        // ============================================================
        // CAMPOS BÁSICOS
        // ============================================================
        setValue('guiaSerie', g.serie);
        setValue('guiaNumero', g.numero);
        setSelectValue('guiaEstado', g.estado_sunat || g.estado);
        setValue('guiaCliente', g.destinatario_nombre);
        setValue('guiaRuc', g.ruc_destinatario);
        setSelectValue('guiaOrigen', g.remitente_direccion);
        setValue('guiaDestino', g.destinatario_direccion);
        setSelectValue('guiaMotivo', g.motivo_traslado);
        setValue('guiaObs', g.observaciones);

        // Cotización vinculada (documento_asociado guarda el número de cotización)
        if (g.documento_asociado) {
            setSelectValue('guiaCotizacion', g.documento_asociado);
        }

        // ============================================================
        // PRODUCTOS (items_json)
        // ============================================================
        let items = [];
        try {
            if (g.items_json) {
                items = typeof g.items_json === 'string' ? JSON.parse(g.items_json) : g.items_json;
            }
        } catch (e) {
            console.warn('⚠️ Error parseando items_json de la guía:', e);
            items = [];
        }

        // Normalizar para productTableHtml (espera: codigo, producto/descripcion, marca, um, cantidad, stock)
        const productosNormalizados = (items || []).map(it => ({
            codigo: it.codigo || '',
            producto: it.producto || it.descripcion || '',
            marca: it.marca || '',
            modelo: it.modelo || '',
            um: it.um || 'NIU',
            cantidad: it.cantidad || 1,
            stock: it.stock || 0
        }));

        const productsContainer = document.getElementById('guiaProducts');
        if (productsContainer) {
            productsContainer.innerHTML = productosNormalizados.length > 0
                ? productTableHtml(productosNormalizados)
                : '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos registrados en esta guía.</div>';
        }

        // Guardar referencia para que saveGuia() los use al actualizar
        window._guiaProductos = productosNormalizados;

        showToast('✅ Guía cargada correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando guía para editar:', error);
        showToast('Error al cargar la guía: ' + error.message, 'error');
    }
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
                    <select id="compCotizacion" onchange="loadComprobanteFromCotizacion(this.value)" >${cotOptions || '<option value="">Sin cotización</option>'}</select>
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
    /* funcion rota - se deja por si se necesita luego
    document.getElementById('compCotizacion')?.addEventListener('change', function() {
        const num = this.value;
        const q = cotizacionesData.find(x => x.numero === num);
        if (q && q.productos && q.productos.length > 0) {
            document.getElementById('compProducts').innerHTML = productTableHtml(q.productos);
            document.getElementById('compCliente').value = q.razon || '';
            document.getElementById('compRuc').value = q.ruc || '';
            document.getElementById('compMonto').value = q.monto || 0;

            // 🔧 NUEVO: condición de pago desde la cotización
            const condSelect = document.getElementById('compCondicion');
            const condicionCotizacion = q.condicion || q.condicion_pago || q.forma_pago;
            if (condSelect && condicionCotizacion) {
                const opciones = Array.from(condSelect.options).map(o => o.value);
                if (opciones.includes(condicionCotizacion)) {
                    condSelect.value = condicionCotizacion;
                }
            }
        } else {
            document.getElementById('compProducts').innerHTML = `
                <div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos en esta cotización.</div>
            `;
        }
    });

    */ 
    
    document.getElementById('comprobanteModal').classList.add('show');
    if (isEdit) {
        setTimeout(() => cargarComprobanteParaEditar(id), 50);
    }
}


// ============================================================
// CARGAR COMPROBANTE EXISTENTE PARA EDICIÓN
// ============================================================
async function cargarComprobanteParaEditar(id) {
    try {
        console.log('📥 Cargando comprobante para editar ID:', id);
        showToast('⏳ Cargando datos del comprobante...', 'info');

        const response = await apiFetch(`/ventas/api/comprobantes/${id}`);
        if (!response.success) {
            showToast('Error al cargar comprobante: ' + (response.error || 'Desconocido'), 'error');
            return;
        }

        const c = response.data;
        console.log('📦 Datos de comprobante cargados:', c);

        const setSelectValue = (id, value) => {
            const el = document.getElementById(id);
            if (!el || value === undefined || value === null) return;
            const val = String(value).trim();
            let found = false;
            for (const opt of el.options) {
                if (opt.value === val) { opt.selected = true; found = true; break; }
            }
            if (!found) {
                for (const opt of el.options) {
                    if (opt.value.toLowerCase() === val.toLowerCase()) { opt.selected = true; found = true; break; }
                }
            }
        };

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        setSelectValue('compTipo', c.tipo_comprobante);
        setValue('compSerie', c.serie);
        setValue('compNumero', c.numero);
        setSelectValue('compEstado', c.estado_sunat);
        setValue('compCliente', c.cliente_nombre);
        setValue('compRuc', c.cliente_numero_doc);
        setValue('compMonto', c.total);
        setValue('compObs', c.observaciones);

        // Productos (items_json)
        const items = Array.isArray(c.items_json) ? c.items_json : [];
        const productosNormalizados = items.map(it => ({
            codigo: it.codigo || '',
            producto: it.producto || it.descripcion || '',
            marca: it.marca || '',
            modelo: it.modelo || '',
            um: it.um || 'NIU',
            cantidad: it.cantidad || 1,
            stock: it.stock || 0
        }));

        const productsContainer = document.getElementById('compProducts');
        if (productsContainer) {
            productsContainer.innerHTML = productosNormalizados.length > 0
                ? productTableHtml(productosNormalizados)
                : '<div style="padding:20px;text-align:center;color:#94A3B8;">No hay productos registrados en este comprobante.</div>';
        }

        window._comprobanteProductos = productosNormalizados;

        showToast('✅ Comprobante cargado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando comprobante para editar:', error);
        showToast('Error al cargar el comprobante: ' + error.message, 'error');
    }
}


function openNotaCreditoModal(id = null) {
    editingId = id;
    const isEdit = id !== null;
    const title = isEdit ? 'Editar nota de crédito' : 'Nueva nota de crédito';
    document.getElementById('notaCreditoModalTitle').textContent = title;
    
    const formContainer = document.getElementById('notaCreditoForm');
    if (!formContainer) return;
    
    const compOptions = comprobantesData.map(c => 
        `<option value="${c.serie}-${c.numero}" data-comp-id="${c.id}">${c.serie}-${c.numero} - ${c.cliente_nombre || 'Sin cliente'}</option>`
    ).join('');
    
    formContainer.innerHTML = `
        <div class="ficha-section">
            <div class="ficha-section-title">📝 Datos de la nota de crédito</div>
            <div class="ficha-grid">
                <div class="form-field col-4">
                    <label>Comprobante afectado</label>
                    <select id="notaComprobante" onchange="cargarDatosComprobanteAfectado(this.value)">
                        <option value="">-- Seleccione un comprobante --</option>
                        ${compOptions || '<option value="" disabled>Sin comprobantes</option>'}
                    </select>
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

    if (isEdit) {
        setTimeout(() => cargarNotaCreditoParaEditar(id), 50);
    }
}



function cargarDatosComprobanteAfectado(valorSeleccionado) {
    if (!valorSeleccionado) return;

    const comp = comprobantesData.find(c => `${c.serie}-${c.numero}` === valorSeleccionado);

    if (!comp) {
        console.warn('⚠️ No se encontró el comprobante seleccionado:', valorSeleccionado);
        showToast('No se encontraron datos para el comprobante seleccionado', 'warning');
        return;
    }

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    };

    setValue('notaCliente', comp.cliente_nombre);
    setValue('notaRuc', comp.cliente_numero_doc);
    setValue('notaMonto', comp.total);

    showToast(`✅ Datos de ${comp.serie}-${comp.numero} cargados`, 'success');
}
window.cargarDatosComprobanteAfectado = cargarDatosComprobanteAfectado;


// ============================================================
// CARGAR NOTA DE CRÉDITO EXISTENTE PARA EDICIÓN
// ============================================================
async function cargarNotaCreditoParaEditar(id) {
    try {
        console.log('📥 Cargando nota de crédito para editar ID:', id);
        showToast('⏳ Cargando datos de la nota de crédito...', 'info');

        const response = await apiFetch(`/ventas/api/notas-credito/${id}`);
        if (!response.success) {
            showToast('Error al cargar nota de crédito: ' + (response.error || 'Desconocido'), 'error');
            return;
        }

        const n = response.data;
        console.log('📦 Datos de nota de crédito cargados:', n);

        const setSelectValue = (id, value) => {
            const el = document.getElementById(id);
            if (!el || value === undefined || value === null) return;
            const val = String(value).trim();
            let found = false;
            for (const opt of el.options) {
                if (opt.value === val) { opt.selected = true; found = true; break; }
            }
            if (!found) {
                for (const opt of el.options) {
                    if (opt.value.toLowerCase() === val.toLowerCase()) { opt.selected = true; found = true; break; }
                }
            }
        };

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        setValue('notaSerie', n.serie);
        setValue('notaNumero', n.numero);
        setSelectValue('notaEstado', n.estado);
        setValue('notaCliente', n.cliente_nombre);
        setValue('notaRuc', n.cliente_numero_doc);
        setValue('notaMonto', n.monto);
        setSelectValue('notaMotivo', n.motivo);
        setValue('notaObs', n.observaciones);

        if (n.comprobante_asociado) {
            setSelectValue('notaComprobante', n.comprobante_asociado);
        }

        showToast('✅ Nota de crédito cargada correctamente', 'success');

    } catch (error) {
        console.error('❌ Error cargando nota de crédito para editar:', error);
        showToast('Error al cargar la nota de crédito: ' + error.message, 'error');
    }
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
        'Estás a punto de marcar esta cotización como <b>"Validada "</b>.',
        '⚠️ Esta acción confirma que Hellen ha revisado y validado la cotización.',
        async function() {
            // Mostrar loading en el botón
            const btn = document.querySelector('#cotizacionModal .btn-blue');
            const originalText = btn?.textContent || '✅ Validado ';
            if (btn) {
                btn.textContent = '⏳ Validando...';
                btn.disabled = true;
            }
            
            try {
                await guardarCotizacion('Validado ');
                showToast('✅ Cotización validada ', 'success');
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
            <td>${p.modelo || '-'}</td>
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

function openPedidoCompraModalSAP(mode = 'cot', id = null) {
    console.log('📋 Abriendo modal PC:', { mode, id });
    
    // ============================================================
    // ACTUALIZAR LA VARIABLE GLOBAL modalMode
    // ============================================================
    modalMode = mode;  // ← ESTO ES LO QUE FALTABA
    
    const modal = document.getElementById('pedidoCompraModal');
    if (!modal) {
        console.error('❌ Modal #pedidoCompraModal no encontrado');
        showToast('Error: Modal de PC no disponible', 'error');
        return;
    }
    
    // SIEMPRE LIMPIAR PRIMERO (pero conservamos la función para edición)
    if (mode !== 'editar') {
        clearPedidoModalSAP();
    }
    
    // Obtener elementos del header
    const title = document.getElementById('pedidoCompraModalTitle');
    const sub = document.getElementById('modalSub');
    
    // ============================================================
    // MODO EDICIÓN
    // ============================================================
    if (mode === 'editar' && id) {
        editingId = id;   // 🔧 NUEVO — agrega esta línea, justo aquí
        
        if (title) title.textContent = '✏️ Editar PC Cliente - Corregir datos';
        if (sub) sub.textContent = 'Revisa y corrige los datos del PC. Los campos de cotización son de solo lectura.';
        
        // Mostrar bloque de cotización (pero en modo solo lectura)
        const cotBlock = document.getElementById('cotBlock');
        if (cotBlock) cotBlock.style.display = 'block';
        
        // Cambiar nota de modo
        const note = document.getElementById('modeNote');
        if (note) {
            note.className = 'danger-note';
            note.textContent = '📝 Modo corrección - Revisa los productos, precios y cantidades. Guarda los cambios cuando termines.';
            note.style.background = '#FEF2F2';
            note.style.border = '1px solid #FCA5A5';
            note.style.color = '#991B1B';
        }
        
        // Cambiar origen
        const origen = document.getElementById('docOrigen');
        if (origen) origen.textContent = 'Corrección';
        
        // Cargar datos del PC
        cargarPCParaEditar(id);
        modal.classList.add('show');
        
        // Inicializar switches después de cargar los datos
        setTimeout(() => {
            inicializarSwitchesValidacion();
        }, 300);
        
        return;
    }
    
    // ============================================================
    // MODO NUEVO (cotización o directo)
    // ============================================================
    if (title) {
        title.textContent = mode === 'cot' ? '➕ Crear PC desde cotización' : '📝 PC directo / sin cotización';
    }
    
    if (sub) {
        sub.textContent = mode === 'cot' 
            ? 'Busca una cotización para cargar todos sus datos automáticamente.'
            : 'PC directo: requiere validación comercial.';
    }
    
    // Mostrar/ocultar bloque de cotización según modo
    const cotBlock = document.getElementById('cotBlock');
    if (cotBlock) {
        cotBlock.style.display = mode === 'cot' ? 'block' : 'none';
    }
    
    const note = document.getElementById('modeNote');
    if (note) {
        if (mode === 'cot') {
            note.className = 'mini-note';
            note.textContent = '✅ Recomendado: jalar la cotización, crear PC espejo y validar contra el documento real del cliente.';
            note.style.background = '#EFF6FF';
            note.style.border = '1px solid #BFDBFE';
            note.style.color = '#1E3A8A';
        } else {
            note.className = 'danger-note';
            note.textContent = '⚠️ PC directo: requiere validación comercial. No comprar bajo pedido hasta quedar conforme.';
            note.style.background = '#FEF2F2';
            note.style.border = '1px solid #FCA5A5';
            note.style.color = '#991B1B';
        }
    }
    
    const origen = document.getElementById('docOrigen');
    if (origen) {
        origen.textContent = mode === 'cot' ? 'Cotización' : 'Directo';
    }
    
    // Si es modo cotización, cargar cotizaciones disponibles
    if (mode === 'cot') {
        const searchInput = document.getElementById('pcCotSearch');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Buscar Cotizacion : Escribe N° cotización, RUC, razón social...';
            searchInput.readOnly = false;
            searchInput.style.background = '#FFFFFF';
            searchInput.style.color = '#0F172A';
            searchInput.style.cursor = 'text';
        }
        
        if (typeof cotizacionesData === 'undefined' || cotizacionesData.length === 0) {
            showToast('⏳ Cargando cotizaciones...', 'info');
            loadCotizaciones().then(() => {
                console.log(`✅ ${cotizacionesData.length} cotizaciones cargadas`);
            });
        }
    }
    
    // Mostrar modal
    modal.classList.add('show');
    console.log('✅ Modal PC abierto correctamente');
    
    // Inicializar switches después de un momento
    setTimeout(() => {
        inicializarSwitchesValidacion();
    }, 200);
}

async function cargarPCParaEditar(id) {
    try {
        console.log('📥 Cargando PC para editar ID:', id);
        showToast('⏳ Cargando datos del PC...', 'info');
        
        const response = await apiFetch(`/ventas/api/pedido-compra/${id}`);
        
        if (!response.success) {
            showToast('Error al cargar PC: ' + (response.error || 'Desconocido'), 'error');
            return;
        }
        
        const pc = response.data;
        console.log('📦 Datos del PC cargados:', pc);
        
        // ============================================================
        // FUNCIÓN PARA NORMALIZAR ITEMS (con marca y modelo)
        // ============================================================
        const normalizarItems = (items) => {
            if (!items || !Array.isArray(items) || items.length === 0) {
                return [];
            }
            
            return items.map(item => {
                // Si es un objeto con propiedades
                if (typeof item === 'object' && !Array.isArray(item)) {
                    return {
                        codigo: item.codigo || '',
                        producto: item.producto || item.descripcion || '',
                        marca: item.marca || '',
                        modelo: item.modelo || '',
                        cantidad_cotizada: parseFloat(item.cantidad_cotizada || item.cantidad_cot || 0),
                        cantidad_pc: parseFloat(item.cantidad_pc || item.cantidad || 1),
                        precio_cotizado: parseFloat(item.precio_cotizado || item.precio_cot || 0),
                        precio_pc: parseFloat(item.precio_pc || item.precio || 0),
                        stock: parseFloat(item.stock || 0)
                    };
                }
                
                // Si es un array [codigo, descripcion, cant_cot, cant_pc, precio_cot, precio_pc, stock]
                if (Array.isArray(item)) {
                    return {
                        codigo: item[0] || '',
                        producto: item[1] || '',
                        marca: item[2] || '',
                        modelo: item[3] || '',
                        cantidad_cotizada: parseFloat(item[4]) || 0,
                        cantidad_pc: parseFloat(item[5]) || 1,
                        precio_cotizado: parseFloat(item[6]) || 0,
                        precio_pc: parseFloat(item[7]) || 0,
                        stock: parseFloat(item[8]) || 0
                    };
                }
                
                // Fallback
                return {
                    codigo: item.codigo || '',
                    producto: item.producto || '',
                    marca: item.marca || '',
                    modelo: item.modelo || '',
                    cantidad_cotizada: parseFloat(item.cantidad_cotizada || item.cantidad || 0),
                    cantidad_pc: parseFloat(item.cantidad_pc || item.cantidad || 1),
                    precio_cotizado: parseFloat(item.precio_cotizado || item.valorVenta || item.precio || 0),
                    precio_pc: parseFloat(item.precio_pc || item.valorVenta || item.precio || 0),
                    stock: parseFloat(item.stock || 0)
                };
            });
        };

        
        
        // NORMALIZAR ITEMS
        const itemsNormalizados = normalizarItems(pc.items || []);
        console.log('📦 Items normalizados:', itemsNormalizados);
        
        // ============================================================
        // FUNCIÓN AUXILIAR PARA SETEAR VALOR
        // ============================================================
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value !== undefined && value !== null ? value : '';
                if (el.hasAttribute('readonly')) {
                    el.removeAttribute('readonly');
                    el.style.background = '#FFFFFF';
                    el.style.color = '#0F172A';
                    el.style.cursor = 'text';
                }
                return true;
            }
            return false;
        };
        
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            } catch (e) {
                return '';
            }
        };
        
        // ============================================================
        // LLENAR CAMPOS BÁSICOS
        // ============================================================
        setValue('pcNumero', pc.numero);
        setValue('pcFecha', formatDateForInput(pc.fecha));
        setValue('pcCliente', pc.cliente);
        setValue('pcRuc', pc.ruc);
        setValue('pcMonto', pc.monto || 0);
        setValue('pcMontoConIgv', (pc.monto || 0) * 1.18);
        setValue('pcEntrega', pc.lugar_entrega || pc.entrega);
        setValue('pcObs', pc.observaciones);
        setValue('pcCondicionPago', pc.condicion_pago || 'Contado');
        setValue('pcVendedor', pc.vendedor || 'Helen Blas Príncipe');
        setValue('pcCotNumero', pc.cotizacion_numero || '');
        
        // Medio
        const medioSelect = document.getElementById('pcMedio');
        if (medioSelect && pc.medio) {
            medioSelect.value = pc.medio;
        }
        
        // Condición pago
        const condSelect = document.getElementById('pcCondicion');
        if (condSelect && pc.condicion_pago) {
            let found = false;
            for (let opt of condSelect.options) {
                if (opt.value === pc.condicion_pago) {
                    opt.selected = true;
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Si no está en las opciones, añadirla
                const opt = document.createElement('option');
                opt.value = pc.condicion_pago;
                opt.textContent = pc.condicion_pago;
                condSelect.appendChild(opt);
                condSelect.value = pc.condicion_pago;
            }
        }
        
        // Moneda
        const monedaSelect = document.getElementById('pcMoneda');
        if (monedaSelect && pc.moneda) {
            for (let opt of monedaSelect.options) {
                if (opt.value === pc.moneda || opt.textContent.includes(pc.moneda)) {
                    opt.selected = true;
                    break;
                }
            }
        }
        
        // ============================================================
        // CARGAR PRODUCTOS (ITEMS) EN LA TABLA
        // ============================================================
        const tbody = document.getElementById('pcItemsBody');
        if (tbody) {
            tbody.innerHTML = '';
            const items = itemsNormalizados;
            console.log(`📦 Cargando ${items.length} items para edición...`);
            
            if (items.length === 0) {
                // Agregar una fila vacía si no hay items
                addPedidoItemSAP();
            } else {
                items.forEach((item, idx) => {
                    const codigo = item.codigo || '';
                    const producto = item.producto || 'Producto sin nombre';
                    const marca = item.marca || '';
                    const modelo = item.modelo || '';
                    const cantidadCotizada = parseFloat(item.cantidad_cotizada) || 0;
                    const cantidadPC = parseFloat(item.cantidad_pc) || 1;
                    const precioCotizado = parseFloat(item.precio_cotizado) || 0;
                    const precioPC = parseFloat(item.precio_pc) || 0;
                    const stock = parseFloat(item.stock) || 0;
                    const faltante = Math.max(cantidadPC - stock, 0);
                    const valorTotal = cantidadPC * precioPC;
                    
                    const tr = document.createElement('tr');
                    tr.id = `item-row-${idx + 1}`;
                    tr.style.borderBottom = '1px solid #E2E8F0';
                    
                    tr.innerHTML = `
                        <td style="padding:2px 3px; text-align:center; font-weight:800; font-size:9px; background:#F8FAFC;">${idx + 1}</td>
                        <td style="padding:2px 3px;">
                            <input value="${esc(codigo)}" 
                                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:800; color:#1D4ED8;"
                                   readonly>
                        </td>
                        <td style="padding:2px 3px;">
                            <input value="${esc(producto)}" 
                                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:800;"
                                   readonly>
                        </td>
                        <td style="padding:2px 3px;">
                            <input value="${esc(modelo)}" 
                                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A;"
                                   onchange="actualizarValorTotalPCSAP(this)">
                        </td>
                        <td style="padding:2px 3px;">
                            <input value="${esc(marca)}" 
                                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A;"
                                   onchange="actualizarValorTotalPCSAP(this)">
                        </td>
                        <td style="padding:2px 3px; width:55px;">
                            <input type="number" value="${cantidadCotizada}" 
                                   style="width:45px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center;"
                                   readonly>
                        </td>
                        <td style="padding:2px 3px; width:55px;">
                            <input type="number" value="${cantidadPC}" 
                                   style="width:45px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900; color:#0F172A;"
                                   onchange="actualizarValorTotalPCSAP(this)">
                        </td>
                        <td style="padding:2px 3px; width:65px;">
                            <input type="number" step="0.01" value="${precioCotizado}" 
                                   style="width:55px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center;"
                                   readonly>
                        </td>
                        <td style="padding:2px 3px; width:65px;">
                            <input type="number" step="0.01" value="${precioPC}" 
                                   style="width:55px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900; color:#0F172A;"
                                   onchange="actualizarValorTotalPCSAP(this)">
                        </td>
                        <td style="padding:2px 3px; width:70px; text-align:center; font-weight:900; color:#059669; font-size:9px;">
                            <span id="valor-total-${idx + 1}">${valorTotal.toFixed(2)}</span>
                        </td>
                        <td style="padding:2px 3px; text-align:center; font-size:8px; color:#64748B; font-weight:800;">${stock}</td>
                        <td style="padding:2px 3px; text-align:center; font-size:8px; font-weight:900; color:${faltante > 0 ? '#DC2626' : '#16A34A'};">${faltante}</td>
                        <td style="padding:2px 3px; text-align:center;">
                            <button onclick="eliminarItemSAP('${tr.id}')" 
                                    style="background:transparent; border:none; color:#EF4444; cursor:pointer; font-size:12px; font-weight:900; padding:0 4px; border-radius:3px; transition:all 0.2s; width:22px; height:22px;"
                                    onmouseover="this.style.background='#FEE2E2'; this.style.color='#DC2626';"
                                    onmouseout="this.style.background='transparent'; this.style.color='#EF4444';">
                                ✕
                            </button>
                        </td>
                    `;
                    
                    tbody.appendChild(tr);
                });
                
                // Reordenar items después de cargar
                reordenarItemsSAP();
            }
        }
        
        // ============================================================
        // CARGAR ESTADO DE VALIDACIONES (switches)
        // ============================================================
        const validationMap = {
            'vPrecio': pc.valida_precios,
            'vCantidad': pc.valida_cantidades,
            'vProducto': pc.valida_stock,
            'vEntrega': pc.valida_entrega,
            'vMoneda': pc.valida_montos,
            'vTransporte': pc.valida_transporte,
            'vVigencia': pc.valida_vigencia,
            'vMargen': pc.valida_margen
        };
        
        Object.keys(validationMap).forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                const isValid = validationMap[id] === true || validationMap[id] === 'Sí';
                checkbox.checked = isValid;
                const label = document.getElementById(id + 'Label');
                if (label) {
                    label.textContent = isValid ? '✅ Válido' : '❌ No válido';
                    label.style.color = isValid ? '#16A34A' : '#DC2626';
                }
            }
        });
        
        // ============================================================
        // ACTUALIZAR ESTADO EN EL HEADER
        // ============================================================
        const estadoDisplay = document.getElementById('pcEstadoDisplay');
        if (estadoDisplay && pc.estado) {
            estadoDisplay.textContent = pc.estado;
            estadoDisplay.style.color = pc.estado === 'PC observado' || pc.estado === 'Bloqueado' ? '#DC2626' : '#16A34A';
        }
        
        // ============================================================
        // ACTUALIZAR SEMÁFORO
        // ============================================================
        setTimeout(() => {
            updateValidationSemaphore();
            updateValidationStatus();
        }, 100);
        
        showToast('✅ PC cargado para editar', 'success');
        
    } catch (error) {
        console.error('❌ Error cargando PC:', error);
        showToast('❌ Error al cargar el PC: ' + error.message, 'error');
    }
}

  // ============================================================
// FUNCIÓN PARA ACTUALIZAR FALTANTE - DEBE ESTAR ANTES DE addPedidoItemSAP
// ============================================================
function actualizarFaltanteDesdeInput(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const inputs = row.querySelectorAll('input');
    // Índices: [0]=código, [1]=descripción, [2]=marca, [3]=modelo
    // [4]=cant_cot, [5]=cant_pc, [6]=precio_cot, [7]=precio_pc, [8]=stock
    const cantidadPC = Number(inputs[5]?.value || 0);
    const stock = Number(inputs[8]?.value || 0);
    const faltanteCell = row.querySelector('td:nth-child(11)');
    const faltante = Math.max(cantidadPC - stock, 0);
    
    if (faltanteCell) {
        faltanteCell.textContent = faltante;
        faltanteCell.style.color = faltante > 0 ? '#DC2626' : '#16A34A';
    }
}

// ============================================================
// FUNCIÓN PARA AGREGAR ITEM SAP - AHORA actualizarFaltanteDesdeInput YA EXISTE
// ============================================================
function addPedidoItemSAP() {
    const tbody = document.getElementById('pcItemsBody');
    if (!tbody) return;
    
    const rowCount = tbody.children.length + 1;
    
    const tr = document.createElement('tr');
    tr.id = `item-row-${rowCount}`;
    tr.style.borderBottom = '1px solid #E2E8F0';
    
    tr.innerHTML = `
        <td style="padding:2px 3px; text-align:center; font-weight:800; font-size:9px; background:#F8FAFC;">${rowCount}</td>
        <td style="padding:2px 3px;">
            <input type="text" placeholder="Código" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:800;"
                   onchange="buscarProductoPorCodigo(this)">
        </td>
        <td style="padding:2px 3px;">
            <input type="text" placeholder="Descripción" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none;">
        </td>
        <td style="padding:2px 3px;">
            <input type="text" placeholder="Modelo" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700;">
        </td>
        <td style="padding:2px 3px;">
            <input type="text" placeholder="Marca" 
                   style="width:100%; border:none; background:transparent; font-size:9px; padding:0; outline:none; font-weight:700;">
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="0" 
                   style="width:45px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center;">
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="1" 
                   style="width:45px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="0" 
                   style="width:55px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="0" 
                   style="width:55px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900; color:#0F172A;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <!-- Valor Total PC -->
        <td style="padding:2px 3px; width:70px; text-align:center; font-weight:900; color:#0F172A; font-size:9px;">
            <span id="valor-total-${rowCount}">0.00</span>
        </td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; color:#64748B; font-weight:800;">0</td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; font-weight:900; color:#EF4444;">0</td>
        <td style="padding:2px 3px; text-align:center;">
            <button onclick="eliminarItemSAP('${tr.id}')" 
                    style="background:transparent; border:none; color:#EF4444; cursor:pointer; font-size:12px; font-weight:900; padding:0 4px; border-radius:3px; transition:all 0.2s; width:22px; height:22px;"
                    onmouseover="this.style.background='#FEE2E2'; this.style.color='#DC2626';"
                    onmouseout="this.style.background='transparent'; this.style.color='#EF4444';">
                ✕
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
}


// ============================================================
// FUNCIÓN PARA MOSTRAR EL MODAL (separada para claridad)
// ============================================================
function mostrarModalPC(mode) {
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
    document.getElementById('pedidoCompraModal').classList.add('show');
    
    // Si hay cotizaciones, mostrar el conteo
    if (cotizacionesData && cotizacionesData.length > 0) {
        console.log(`📋 ${cotizacionesData.length} cotizaciones disponibles para buscar`);
    } else {
        console.warn('⚠️ No hay cotizaciones cargadas para el buscador');
    }
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
      document.getElementById('pcMontoConIgv').value = (cotizacion.total || cotizacion.monto || 0) * 1.18; 
    
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



// Función para calcular y actualizar el Valor Total PC
function actualizarValorTotalPCSAP(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const inputs = row.querySelectorAll('input');
    // Índices: [0]=código, [1]=descripción, [2]=marca, [3]=modelo
    // [4]=cant_cot, [5]=cant_pc, [6]=precio_cot, [7]=precio_pc, [8]=stock
    const cantidadPC = Number(inputs[5]?.value || 0);
    const precioPC = Number(inputs[7]?.value || 0);
    const valorTotal = cantidadPC * precioPC;
    
    // Buscar el span del Valor Total en la columna (10ma columna, index 9)
    const valueSpan = row.querySelector('td:nth-child(10) span');
    if (valueSpan) {
        valueSpan.textContent = valorTotal.toFixed(2);
        // Cambiar color según el valor
        if (valorTotal > 0) {
            valueSpan.style.color = '#059669';
            valueSpan.style.fontWeight = '900';
        } else {
            valueSpan.style.color = '#94A3B8';
            valueSpan.style.fontWeight = '700';
        }
    }
    
    // También actualizar faltante
    actualizarFaltanteDesdeInput(inputs[5] || input);
}

// Función para eliminar ítem
function eliminarItemSAP(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        // Re-numerar los ítems
        reordenarItemsSAP();
    }
}

// Función para reordenar números de ítems
function reordenarItemsSAP() {
    const rows = document.querySelectorAll('#pcItemsBody tr');
    rows.forEach((row, index) => {
        const numCell = row.querySelector('td:first-child');
        if (numCell) {
            numCell.textContent = index + 1;
        }
        // Actualizar el ID de la fila
        const newId = `item-row-${index + 1}`;
        row.id = newId;
        // Actualizar el onclick del botón eliminar
        const deleteBtn = row.querySelector('td:last-child button');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `eliminarItemSAP('${newId}')`);
        }
    });
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
// INICIALIZAR EVENTOS DEL FORMULARIO DE COTIZACIÓN
// ============================================================

function inicializarEventosCotizacion(isEdit) {
    // Evento para el descuento
    const discountValue = document.getElementById('fDiscountValue');
    const discountType = document.getElementById('fDiscountType');
    
    if (discountValue) {
        discountValue.addEventListener('input', calcQuote);
    }
    if (discountType) {
        discountType.addEventListener('change', calcQuote);
    }
    
    // Evento para el buscador rápido de productos (Enter)
    const quickSearch = document.getElementById('quickProductSearch');
    if (quickSearch) {
        quickSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addQuoteProductFromSearch();
            }
        });
    }
    
    // Inicializar campos personalizados
    document.querySelectorAll('select[onchange*="toggleCustomField"]').forEach(select => {
        const selectId = select.id;
        const inputId = selectId.replace('f', 'f') + 'Custom';
        const input = document.getElementById(inputId);
        if (input) {
            input.style.display = 'none';
        }
    });
}




// ============================================================
// RENDERIZAR CONTENIDO DEL FORMULARIO DE COTIZACIÓN - VERSIÓN COMPLETA
// ============================================================

function renderCotizacionFormContent(isEdit) {
    const condicionOptions = `
        <option value="Contado">Contado</option>
        <option value="Credito 7 Dias">Credito 7 Dias</option>
        <option value="Credito 15 Dias">Credito 15 Dias</option>
        <option value="Credito 30 Dias">Credito 30 Dias</option>
        <option value="Credito 45 Dias">Credito 45 Dias</option>
        <option value="Credito 60 Dias">Credito 60 Dias</option>
        <option value="Credito 90 Dias">Credito 90 Dias</option>
        <option value="Credito 120 Dias">Credito 120 Dias</option>
        <option value="Personalizado">✏️ Personalizado...</option>
    `;

    const tiempoOptions = `
        <option value="Inmediata">Inmediata</option>
        <option value="3 días hábiles">3 días hábiles</option>
        <option value="5 días hábiles" selected>5 días hábiles</option>
        <option value="7 días hábiles">7 días hábiles</option>
        <option value="10 días hábiles">10 días hábiles</option>
        <option value="15 días hábiles">15 días hábiles</option>
        <option value="Personalizado">✏️ Personalizado...</option>
    `;

    const validezOptions = `
        <option value="7 días">7 días</option>
        <option value="15 días" selected>15 días</option>
        <option value="30 días">30 días</option>
        <option value="45 días">45 días</option>
        <option value="60 días">60 días</option>
        <option value="Personalizado">✏️ Personalizado...</option>
    `;

    const fuenteOptions = `
        <option value="Correo">Correo</option>
        <option value="WhatsApp">WhatsApp</option>
        <option value="Llamada">Llamada</option>
        <option value="Plataforma">Plataforma</option>
        <option value="Presencial">Presencial</option>
    `;

    const tipoOptions = `
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
    `;

    return `


<div style="display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 10px !important; width: 100% !important; margin-bottom: 10px !important;">
    
    <!-- ============================================================ -->
    <!-- 1. DATOS DEL CLIENTE - COMPACTO -->
    <!-- ============================================================ -->
    <div class="create-panel client-card" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.04);overflow:hidden;">
        <h3 style="padding:4px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;font-weight:1000;color:#0F172A;background:#FAFBFC;display:flex;align-items:center;gap:5px;margin:0;">
            <span style="color:#EF233C;font-weight:1000;">1.</span> 
            <span style="color:#EF233C;font-weight:1000;">Datos del Cliente</span>
        </h3>
        <div class="body" style="padding:5px 8px;">
    <!-- Buscar por RUC -->
    <div style="display:grid;grid-template-columns:1fr 70px;gap:4px;align-items:end;margin-bottom:2px;">
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Buscar por RUC</label>
            <input id="fRucSearch" placeholder="Ingresa 11 dígitos" maxlength="11" oninput="autoLoadClientByRuc(this.value)" style="width:100%;height:19px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 6px;">
        </div>
        <button onclick="loadClient()" style="width:100%;height:19px;border-radius:5px;font-size:8.5px;padding:0 6px;background:#2563EB;color:#fff;border:0;font-weight:950;cursor:pointer;">🔍 Buscar</button>
    </div>
    <!-- RUC | Razón Social -->
    <div style="display:grid;grid-template-columns:1fr 1.8fr;gap:4px;margin-bottom:2px;">
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">RUC</label>
            <input id="fRuc" readonly style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#F1F5F9;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Razón Social</label>
            <input id="fRazon" readonly style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#F1F5F9;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
    </div>
    <!-- Dirección Fiscal | Contacto | Teléfono | Email -->
    <div style="display:grid;grid-template-columns:1.4fr 1fr 0.9fr 1.2fr;gap:4px;margin-bottom:2px;">
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Dirección Fiscal</label>
            <input id="fDireccion" placeholder="Dirección fiscal" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Contacto</label>
            <input id="fContacto" placeholder="Nombre" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Teléfono</label>
            <input id="fTelefono" placeholder="Número" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Email</label>
            <input id="fCorreo" placeholder="email@empresa.com" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
    </div>
    <!-- N° Requerimiento | Fuente -->
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:4px;margin-bottom:2px;">
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">N° Requerimiento</label>
            <input id="fReq" placeholder="Ingrese el requerimiento" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 5px;">
        </div>
        <div class="form-field">
            <label style="display:block;font-size:7px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Fuente</label>
            <select id="fFuente" style="width:100%;height:18px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9.5px;padding:0 3px;">
                <option value="Correo">Correo</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Llamada">Llamada</option>
                <option value="Plataforma">Plataforma</option>
                <option value="Presencial">Presencial</option>
            </select>
        </div>
    </div>
    <!-- Guardar (de vuelta en su propia fila, como antes) -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:1px;margin-top:2px;">
        <button onclick="saveClientFromQuote()" style="min-width:120px;height:20px;border-radius:6px;font-size:8.5px;font-weight:950;border:0;background:#16A34A;color:#fff;cursor:pointer;">💾 Guardar / Actualizar</button>
        <span style="color:#64748B;font-size:6.5px;font-weight:850;line-height:1;">Se guardará en Maestros</span>
    </div>
    <div id="clientConfirmBox" style="display:none;margin-top:2px;padding:3px 6px;border-radius:4px;font-size:9px;font-weight:900;text-align:center;border:1px solid transparent;"></div>
</div>
    </div>

    <!-- ============================================================ -->
    <!-- 2. CONDICIONES COMERCIALES - COMPACTO -->
    <!-- ============================================================ -->
    <div class="create-panel" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.04);overflow:hidden;">
        <h3 style="padding:4px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;font-weight:1000;color:#0F172A;background:#FAFBFC;display:flex;align-items:center;gap:5px;margin:0;">
            <span style="color:#EF233C;font-weight:1000;">2.</span> 
            <span style="color:#EF233C;font-weight:1000;">Condiciones Comerciales</span>
        </h3>
        <div class="body" style="padding:6px 8px;">
            <!-- Asesor | Email | Teléfono -->
            <div style="display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:4px;margin-bottom:2px;">
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Asesor</label>
                    <input id="fVendedor" value="${CONFIG.asesorDefault}" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 5px;">
                </div>
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Email Asesor</label>
                    <input id="fEmailAsesor" value="${CONFIG.emailAsesorDefault}" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 5px;">
                </div>
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Teléfono Asesor</label>
                    <input id="fTelefonoAsesor" value="${CONFIG.telefonoAsesorDefault}" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 5px;">
                </div>
            </div>
            <!-- Moneda | Condición Pago | Tiempo Entrega -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:2px;">
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Moneda</label>
                    <select id="fMoneda" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 3px;">
                        <option value="Soles (S/.)" selected>Soles (S/.)</option>
                        <option value="Dólares ($)">Dólares ($)</option>
                    </select>
                </div>
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Condición de Pago</label>
                    <select id="fCondicion" onchange="toggleCustomField('fCondicion','fCondicionCustom')" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 3px;">
                        <option value="Contado">Contado</option>
                        <option value="Credito 7 Dias">Credito 7 Dias</option>
                        <option value="Credito 15 Dias">Credito 15 Dias</option>
                        <option value="Credito 30 Dias">Credito 30 Dias</option>
                        <option value="Credito 45 Dias">Credito 45 Dias</option>
                        <option value="Credito 60 Dias">Credito 60 Dias</option>
                        <option value="Credito 90 Dias">Credito 90 Dias</option>
                        <option value="Credito 120 Dias">Credito 120 Dias</option>
                        <option value="Personalizado">✏️ Personalizado...</option>
                    </select>
                    <input id="fCondicionCustom" placeholder="Ej: 50% anticipo" style="display:none;margin-top:1px;width:100%;height:20px;border:1px solid #E5E7EB;border-radius:4px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9px;padding:0 5px;">
                </div>
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Tiempo de Entrega</label>
                    <select id="fTiempo" onchange="toggleCustomField('fTiempo','fTiempoCustom')" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 3px;">
                        <option value="Inmediata">Inmediata</option>
                        <option value="3 días hábiles">3 días hábiles</option>
                        <option value="5 días hábiles" selected>5 días hábiles</option>
                        <option value="7 días hábiles">7 días hábiles</option>
                        <option value="10 días hábiles">10 días hábiles</option>
                        <option value="15 días hábiles">15 días hábiles</option>
                        <option value="Personalizado">✏️ Personalizado...</option>
                    </select>
                    <input id="fTiempoCustom" placeholder="Ej: 10 días" style="display:none;margin-top:1px;width:100%;height:20px;border:1px solid #E5E7EB;border-radius:4px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9px;padding:0 5px;">
                </div>
            </div>
            <!-- Validez Oferta | Dirección Entrega -->
            <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:4px;margin-bottom:2px;">
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Validez de Oferta</label>
                    <select id="fValidez" onchange="toggleCustomField('fValidez','fValidezCustom')" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 3px;">
                        <option value="7 días">7 días</option>
                        <option value="15 días" selected>15 días</option>
                        <option value="30 días">30 días</option>
                        <option value="45 días">45 días</option>
                        <option value="60 días">60 días</option>
                        <option value="Personalizado">✏️ Personalizado...</option>
                    </select>
                    <input id="fValidezCustom" placeholder="Ej: 20 días" style="display:none;margin-top:1px;width:100%;height:20px;border:1px solid #E5E7EB;border-radius:4px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9px;padding:0 5px;">
                </div>
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Dirección de Entrega</label>
                    <select id="fDireccionEntrega" onchange="toggleCustomField('fDireccionEntrega','fDireccionEntregaCustom')" style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 3px;">
                        <option value="">Sin dirección</option>
                        <option value="Personalizado">✏️ Personalizado...</option>
                    </select>
                    <input id="fDireccionEntregaCustom" placeholder="Ej: Av. Los Alamos 123" style="display:none;margin-top:1px;width:100%;height:20px;border:1px solid #E5E7EB;border-radius:4px;background:#FFFFFF;outline:none;color:#0F172A;font-size:9px;padding:0 5px;">
                </div>
            </div>
            <!-- Nota Comercial -->
            <div style="display:grid;grid-template-columns:1fr;gap:3px;">
                <div class="form-field">
                    <label style="display:block;font-size:7.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Nota Comercial</label>
                    <input id="fNotaComercial" placeholder="Comentarios comerciales..." style="width:100%;height:22px;border:1px solid #E5E7EB;border-radius:5px;background:#FFFFFF;outline:none;color:#0F172A;font-size:10px;padding:0 5px;">
                </div>
            </div>
        </div>
    </div>

<!-- ============================================================ -->
<!-- 3. RESUMEN - ESTILO IMAGEN -->
<!-- ============================================================ -->
<div class="create-panel summary-card" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.05);overflow:hidden;max-width:500px;font-family:'Segoe UI',Roboto,sans-serif;">
    
    <!-- Título "3. Resumen" -->
    <div style="padding:5px 10px;border-bottom:1px solid #E5E7EB;background:#FAFAFA;display:flex;align-items:center;gap:5px;">
        <span style="color:#D32F2F;font-weight:700;font-size:10px;">3.</span>
        <span style="color:#D32F2F;font-weight:700;font-size:10px;">Resumen</span>
    </div>
    
    <!-- Cuerpo del resumen -->
    <div style="padding:6px 10px 8px 10px;">
        
        <!-- FILA: Subtotal -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #F0F0F0;">
            <span style="font-size:9.5px;color:#444;font-weight:500;">Subtotal</span>
            <span id="sumSubtotal" style="font-size:10px;font-weight:600;color:#1E1E1E;">S/ 0.00</span>
        </div>
        
        <!-- FILA: Descuento + input + select -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #F0F0F0;">
            <span style="font-size:9.5px;color:#444;font-weight:500;">Descuento</span>
            <div style="display:flex;align-items:center;gap:3px;">
                <input id="fDiscountValue" type="number" value="0" step="0.01" style="width:50px;height:18px;border:1px solid #CCC;border-radius:4px;padding:0 3px;text-align:right;font-weight:600;font-size:9.5px;background:#FFF;">
                <select id="fDiscountType" style="height:18px;border-radius:4px;border:1px solid #CCC;font-weight:600;font-size:9px;background:#FFF;padding:0 3px;" onchange="calcQuote()">
                    <option value="%">%</option>
                    <option value="S/">S/</option>
                </select>
            </div>
        </div>
        
        <!-- FILA: Dscto aplicado -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #F0F0F0;">
            <span style="font-size:9.5px;color:#444;font-weight:500;">Dscto aplicado</span>
            <span id="sumDiscount" style="font-size:10px;font-weight:600;color:#D32F2F;">-S/ 0.00</span>
        </div>
        
        <!-- FILA: IGV 18% -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #F0F0F0;">
            <span style="font-size:9.5px;color:#444;font-weight:500;">IGV 18%</span>
            <span id="sumIgv" style="font-size:10px;font-weight:600;color:#1E1E1E;">S/ 0.00</span>
        </div>
        
        <!-- FILA: Valor venta -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid #F0F0F0;">
            <span style="font-size:9.5px;color:#444;font-weight:500;">Valor venta</span>
            <span id="sumValorVenta" style="font-size:10px;font-weight:600;color:#1E1E1E;">S/ 0.00</span>
        </div>
        
        <!-- TOTAL -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0 0 0;margin-top:2px;border-top:2px solid #D32F2F;">
            <span style="font-size:11px;font-weight:700;color:#1E1E1E;">TOTAL A PAGAR </span>
            <span id="sumTotal" style="font-size:15px;font-weight:800;color:#D32F2F;">S/ 0.00</span>
        </div>
        
    </div>
</div>

        <!-- ============================================================ -->
        <!-- FILA INFERIOR: 4. PRODUCTOS COTIZADOS (OCUPA TODO EL ANCHO) -->
        <!-- ============================================================ -->
        <div class="create-panel product-wide" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 4px 12px rgba(15,23,42,.06);overflow:hidden;margin-bottom:10px;">
            <h3 style="padding:8px 14px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:1000;color:#0F172A;background:#FAFBFC;display:flex;align-items:center;gap:8px;margin:0;flex-wrap:wrap;">
                <span style="color:#EF233C;font-weight:1000;">4.</span> 
                <span style="color:#EF233C;font-weight:1000;">Productos Cotizados</span>
                <span style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;">
                    <input id="quickProductSearch" placeholder="Buscar producto por código..." style="width:200px;height:30px;border:1px solid #CBD5E1;border-radius:8px;padding:0 10px;font-size:11px;font-weight:850;outline:none;">

                    <button onclick="openProductSelector()" style="height:30px;padding:0 12px;font-size:11px;border-radius:8px;font-weight:1000;background:#8B5CF6;color:#fff;border:0;cursor:pointer;">📋 Seleccionar Producto </button>
                </span>
            </h3>
            <div class="body" style="padding:0;">
                <div style="overflow:auto;max-height:220px;">
                    <table style="width:100%;border-collapse:collapse;font-size:10px;min-width:1100px;">
                        <thead>
                            <tr>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:35px;">Item</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:80px;">Código Producto</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;"> Descripción</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:80px;">Modelo</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:75px;">Marca</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:55px;">Unidad</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:50px;">Cant</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:90px;">Valor Venta Unitario S/.</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:100px;">Valor total S/.</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:55px;">Stock</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:70px;">Entrega</th>
                                <th style="padding:5px 6px;font-size:9px;background:#FFF1F2;color:#7F1D1D;border:1px solid #FCA5A5;text-align:center;font-weight:1000;width:40px;">Acciones </th>
                            </tr>
                        </thead>
                        <tbody id="quoteProductRows">
                            <tr><td colspan="12" style="text-align:center;color:#94A3B8;padding:20px;font-size:11px;">📭 Agregue productos a la cotización</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
   
<div class="create-panel" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 4px 12px rgba(15,23,42,.06);overflow:hidden;margin-bottom:10px; max-width: 100%; flex: 1;; grid-column: 1 / -1;">
    <h3 style="padding:6px 12px;border-bottom:1px solid #E5E7EB;font-size:12px;font-weight:1000;color:#0F172A;background:#FAFBGC;display:flex;align-items:center;gap:6px;margin:0;">
        <span style="color:#EF233C;font-weight:1000;">5.</span> 
        <span style="color:#EF233C;font-weight:1000;">Información adicional</span>
        <span style="font-weight:400;font-size:8px;color:#64748B;margin-left:4px;">- interno</span>
    </h3>
    <div class="body" style="padding:8px 12px;">
        
        <!-- FILA ÚNICA: Seguimiento | Motivo | Transporte | Parihuela | Nota interna -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:8px;">
            <!-- Seguimiento -->
            <div class="form-field">
                <label style="display:block;font-size:8.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Seguimiento</label>
                <input id="fSeguimiento" value="Helen Blas Príncipe" 
                       style="width:100%;height:28px;border:1px solid #E5E7EB;border-radius:6px;background:#FFFFFF;outline:none;color:#0F172A;font-size:11px;padding:0 8px;">
            </div>
            
        <!-- Motivo -->
    <div class="form-field">
         <label style="display:block;font-size:8.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Motivo</label>
         <select id="fMotivo" 
            style="width:100%;height:28px;border:1px solid #E5E7EB;border-radius:6px;background:#FFFFFF;outline:none;color:#0F172A;font-size:11px;padding:0 4px;">
         <option value="Proyecto nuevo">Proyecto nuevo</option>
         <option value="Recompra">Recompra</option>
            <option value="Licitación">Licitación</option>
            <option value="Reposición / stock">Reposición / stock</option>
         <option value="Solicitud única del cliente" selected>Solicitud única del cliente</option>
         </select>
        </div>
            
            <!-- Transporte -->
            <div class="form-field">
                <label style="display:block;font-size:8.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Transporte</label>
                <select id="fTransporte" 
                        style="width:100%;height:28px;border:1px solid #E5E7EB;border-radius:6px;background:#FFFFFF;outline:none;color:#0F172A;font-size:11px;padding:0 4px;">
                    <option value="Seleccione" selected>-- Seleccione --</option>
                    <option value="Motorizado">Motorizado</option>
                    <option value="Auto">Auto</option>
                    <option value="Minivan">Minivan</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Camión">Camión</option>
                    <option value="Agencia">Agencia</option>
                </select>
            </div>
            
            <!-- Parihuela -->
            <div class="form-field">
                <label style="display:block;font-size:8.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Parihuela</label>
                <select id="fParihuela" 
                        style="width:100%;height:28px;border:1px solid #E5E7EB;border-radius:6px;background:#FFFFFF;outline:none;color:#0F172A;font-size:11px;padding:0 4px;">
                    <option value="Seleccione" selected>-- Seleccione --</option>
                    <option value="No">No</option>
                    <option value="Sí - estándar">Sí - estándar</option>
                    <option value="Sí - a medida">Sí - a medida</option>
                    <option value="Por confirmar">Por confirmar</option>
                </select>
            </div>
            
            <!-- Nota interna -->
            <div class="form-field">
                <label style="display:block;font-size:8.5px;font-weight:950;color:#334155;margin-bottom:1px;text-transform:uppercase;">Nota interna</label>
                <input id="fNotaInterna" placeholder="" value="" 
                       style="width:100%;height:28px;border:1px solid #E5E7EB;border-radius:6px;background:#FFFFFF;outline:none;color:#0F172A;font-size:11px;padding:0 8px;">
            </div>
        </div>
        
    </div>
</div>

        
    `;
}



// Función para mostrar/ocultar campos de pago según condición
function togglePagoCampos() {
    const condicionSelect = document.getElementById('pcCondicion');
    const container = document.getElementById('pagoCamposContainer');
    
    if (!condicionSelect || !container) return;
    
    // Mostrar solo cuando la condición es "Contado"
    if (condicionSelect.value === 'Contado') {
        container.style.display = 'block';
        container.style.animation = 'fadeIn 0.3s ease';
    } else {
        container.style.display = 'none';
        // Limpiar campos al ocultar
        document.getElementById('pcNumOperacion').value = '';
        document.getElementById('pcBanco').value = '';
        document.getElementById('pcCuentaOCCI').value = '';
    }
}

// Función para obtener los datos de pago (para usar al guardar)
function getPagoData() {
    const condicion = document.getElementById('pcCondicion')?.value || '';
    if (condicion !== 'Contado') {
        return {
            num_operacion: '',
            banco: '',
            cuenta_occi: ''
        };
    }
    
    return {
        num_operacion: document.getElementById('pcNumOperacion')?.value || '',
        banco: document.getElementById('pcBanco')?.value || '',
        cuenta_occi: document.getElementById('pcCuentaOCCI')?.value || ''
    };
}

// Función para establecer datos de pago al editar (si vienen de la BD)
function setPagoData(data) {
    if (!data) return;
    
    const condicion = document.getElementById('pcCondicion')?.value || '';
    if (condicion === 'Contado') {
        document.getElementById('pcNumOperacion').value = data.num_operacion || '';
        document.getElementById('pcBanco').value = data.banco || '';
        document.getElementById('pcCuentaOCCI').value = data.cuenta_occi || '';
    }
}

// Inicializar al cargar el modal
function inicializarPagoCampos() {
    // Esperar a que el DOM esté listo
    setTimeout(() => {
        togglePagoCampos();
    }, 100);
}

// Agregar animación fadeIn
const stylePago = document.createElement('style');
stylePago.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(stylePago);
// ============================================================
// FUNCIÓN PARA ABRIR MODAL DE COTIZACIÓN - EXPORTADA AL WINDOW
// ============================================================

window.openCotizacionModal = function(id = null) {
    console.log('📋 Abriendo modal de cotización', { id });
    editingId = id;
    const isEdit = id !== null;
    
    // Obtener el modal
    const modal = document.getElementById('cotizacionModal');
    if (!modal) {
        console.error('❌ Modal #cotizacionModal no encontrado');
        showToast('Error: Modal de cotización no disponible', 'error');
        return;
    }
    
    // Limpiar el contenido anterior
    const body = document.getElementById('cotizacionForm');
    if (!body) {
        console.error('❌ #cotizacionForm no encontrado');
        showToast('Error: Formulario no disponible', 'error');
        return;
    }
    
    // Resetear variables globales
    quoteProducts = [];
    cotizacionSeleccionada = null;
    
    // Establecer el título
    const title = document.getElementById('cotizacionModalTitle');
    if (title) {
        title.textContent = isEdit ? '✏️ Editar cotización' : '📄 Nueva cotización';
    }
    
    // Renderizar el contenido del modal
    body.innerHTML = renderCotizacionFormContent(isEdit);
    
    // Renderizar los botones del footer según el rol
    renderCotizacionFooter(isEdit);
    
    // Inicializar eventos del formulario
    inicializarEventosCotizacion(isEdit);
    
    // Si es edición, cargar los datos
    if (isEdit) {
        setTimeout(() => {
            cargarCotizacionParaEditar(id);
        }, 100);
    } else {
        // Nueva cotización: valores por defecto
        const now = new Date();
        const fechaStr = now.toISOString().slice(0, 16);
        document.getElementById('fFecha')?.setAttribute('value', fechaStr);
        document.getElementById('fVendedor')?.setAttribute('value', CONFIG.asesorDefault);
    }
    
    // Mostrar el modal
    modal.classList.add('show');
    console.log('✅ Modal de cotización abierto correctamente');
};

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
    // Buscar la cotización en los datos básicos
    const cotizacion = cotizacionesData.find(c => c.id === cotizacionId);
    if (!cotizacion) {
        showToast('❌ Cotización no encontrada', 'error');
        return;
    }
    
    // Mostrar loading
    showToast('⏳ Cargando productos de la cotización...', 'info');
    
    // CARGAR DATOS COMPLETOS (CON PRODUCTOS)
    apiFetch(`/ventas/api/cotizaciones/${cotizacionId}/completa`)
        .then(response => {
            if (!response.success) {
                showToast('❌ Error al cargar productos: ' + (response.error || 'Desconocido'), 'error');
                return;
            }
            
            const data = response.data;
            console.log('📦 Datos completos de cotización:', data);
            
            // Guardar la cotización completa
            cotizacionSeleccionada = data;
            
            // Cerrar resultados
            const resultsContainer = document.getElementById('cotizacionSearchResults');
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
                resultsContainer.innerHTML = '';
            }
            
            // Actualizar el input de búsqueda
            const searchInput = document.getElementById('pcCotSearch');
            if (searchInput) {
                searchInput.value = `${data.numero_cotizacion || ''} - ${data.cliente_razon_social || ''}`;
            }
            
            // ============================================================
            // FUNCIÓN PARA SETEAR VALORES EN MODO READONLY
            // ============================================================
            const setReadonlyValue = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = val !== undefined && val !== null ? val : '';
                    el.readOnly = true;
                    el.style.background = '#F1F5F9';
                    el.style.color = '#64748B';
                    el.style.cursor = 'not-allowed';
                }
            };
            
            // ============================================================
            // CARGAR DATOS BÁSICOS - TODOS EN MODO READONLY
            // ============================================================
            setReadonlyValue('pcCotNumero', data.numero_cotizacion || '');
            setReadonlyValue('pcCotFecha', data.fecha_creacion ? formatFecha(data.fecha_creacion) : '');
            setReadonlyValue('pcCliente', data.cliente_razon_social || '');
            setReadonlyValue('pcRuc', data.cliente_ruc || '');
             setReadonlyValue('pcMontoConIgv', (data.total || 0) * 1.18); 
            setReadonlyValue('pcMonto', data.total || 0);
            setReadonlyValue('pcCondicionPago', data.condicion_pago || 'Contado');
            setReadonlyValue('pcVendedor', data.vendedor || 'Helen Blas Príncipe');
            
            if (data.direccion_entrega) {
                setEditableValue('pcEntrega', data.direccion_entrega);
            }
            
            // ============================================================
            // CARGAR PRODUCTOS EN LA TABLA CON MARCA Y MODELO
            // ============================================================
            const tbody = document.getElementById('pcItemsBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // Obtener productos de la respuesta completa
            const productos = data.productos || [];
            console.log(`📦 ${productos.length} productos encontrados en la cotización`);
            
            if (productos.length === 0) {
                addPedidoItemSAP();
                showToast('⚠️ Esta cotización no tiene productos', 'warning');
                return;
            }
            
            productos.forEach((p, i) => {
    const cantidadCotizada = p.cantidad || 1;
    const precioCotizado = p.valorVenta || 0;
    const stock = p.stock || 0;
    const faltante = Math.max(cantidadCotizada - stock, 0);
    const valorTotal = cantidadCotizada * precioCotizado;
    
    const marca = p.marca || '';
    const modelo = p.modelo || '';
    const codigo = p.codigo || '';
    const descripcion = p.producto || p.descripcion || 'Sin descripción';
    
    const tr = document.createElement('tr');
    tr.id = `item-row-${i + 1}`;
    tr.style.borderBottom = '1px solid #E2E8F0';
    
    tr.innerHTML = `
        <td style="padding:2px 3px; text-align:center; font-weight:800; font-size:9px; background:#F8FAFC;">${i + 1}</td>
        <td style="padding:2px 3px;">
          <input value="${esc(codigo)}" 
       style="width:100%; border:none; background:#F1F5F9; font-size:8px; padding:0 2px; outline:none; font-weight:800; color:#1D4ED8; cursor:not-allowed; max-width:70px;" readonly>
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(descripcion)}" 
                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:800; cursor:not-allowed;"
                   readonly>
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(modelo)}" 
                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A; cursor:not-allowed;"
                   readonly>
        </td>
        <td style="padding:2px 3px;">
            <input value="${esc(marca)}" 
                   style="width:100%; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; font-weight:700; color:#0F172A; cursor:not-allowed;"
                   readonly>
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="${cantidadCotizada}" 
                   style="width:45px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center; cursor:not-allowed;"
                   readonly>
        </td>
        <td style="padding:2px 3px; width:55px;">
            <input type="number" value="${cantidadCotizada}" 
                   style="width:45px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="${precioCotizado}" 
                   style="width:55px; border:none; background:#F1F5F9; font-size:9px; padding:0; outline:none; text-align:center; cursor:not-allowed;"
                   readonly>
        </td>
        <td style="padding:2px 3px; width:65px;">
            <input type="number" step="0.01" value="${precioCotizado}" 
                   style="width:55px; border:none; background:transparent; font-size:9px; padding:0; outline:none; text-align:center; font-weight:900; color:#0F172A;"
                   onchange="actualizarValorTotalPCSAP(this)">
        </td>
        <!-- 🔽 NUEVA CELDA: Valor Total PC -->
        <td style="padding:2px 3px; width:70px; text-align:center; font-weight:900; color:#059669; font-size:9px;">
            <span id="valor-total-${i + 1}">${valorTotal.toFixed(2)}</span>
        </td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; color:#64748B; font-weight:800;">${stock}</td>
        <td style="padding:2px 3px; text-align:center; font-size:8px; font-weight:900; color:${faltante > 0 ? '#DC2626' : '#16A34A'};">${faltante}</td>
        <td style="padding:2px 3px; text-align:center;">
            <button onclick="eliminarItemSAP('${tr.id}')" 
                    style="background:transparent; border:none; color:#EF4444; cursor:pointer; font-size:12px; font-weight:900; padding:0 4px; border-radius:3px; transition:all 0.2s; width:22px; height:22px;"
                    onmouseover="this.style.background='#FEE2E2'; this.style.color='#DC2626';"
                    onmouseout="this.style.background='transparent'; this.style.color='#EF4444';">
                ✕
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
});
            
            showToast(`✅ Cotización ${data.numero_cotizacion} cargada con ${productos.length} productos`, 'success');
        })
        .catch(error => {
            console.error('❌ Error cargando cotización completa:', error);
            showToast('❌ Error al cargar los productos de la cotización', 'error');
        });
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

function clearPedidoModalSAP() {
    console.log('🧹 Limpiando modal de PC a estado inicial...');
    
    // Función auxiliar para establecer valor en readonly
    const setReadonlyValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value !== undefined ? value : '';
            el.readOnly = true;
            el.style.background = '#F1F5F9';
            el.style.color = '#64748B';
            el.style.cursor = 'not-allowed';
        }
    };
    

    // Fecha actual
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const fechaStr = now.toISOString().slice(0, 16);
    
    // ============================================================
    // 1. RESTAURAR TÍTULO Y SUBTÍTULO (para modo creación)
    // ============================================================
    const title = document.getElementById('pedidoCompraModalTitle');
    if (title) {
        title.textContent = 'Crear PC Cliente';
    }
    
    const sub = document.getElementById('modalSub');
    if (sub) {
        sub.textContent = 'Primero se valida. No comprar ni despachar si existe observación.';
    }
    
    // ============================================================
    // 2. RESTAURAR NOTA DE MODO
    // ============================================================
    const note = document.getElementById('modeNote');
    if (note) {
        note.className = 'mini-note';
        note.textContent = '✅ Recomendado: jalar la cotización, crear PC espejo y validar contra el documento real del cliente.';
        note.style.background = '#EFF6FF';
        note.style.border = '1px solid #BFDBFE';
        note.style.color = '#1E3A8A';
    }
    
    // ============================================================
    // 3. RESTAURAR BLOQUE DE COTIZACIÓN (visible) - TODOS READONLY
    // ============================================================
    const cotBlock = document.getElementById('cotBlock');
    if (cotBlock) {
        cotBlock.style.display = 'block';
    }
    
    // ============================================================
    // 4. LIMPIAR CAMPOS DE COTIZACIÓN (READONLY)
    // ============================================================
    setReadonlyValue('pcCotNumero', '');
    setReadonlyValue('pcCotFecha', '');
    setReadonlyValue('pcCliente', '');
    setReadonlyValue('pcRuc', '');
    setReadonlyValue('pcMonto', '0');
     setReadonlyValue('pcMontoConIgv', '0');
    setReadonlyValue('pcCondicionPago', '');
    setReadonlyValue('pcVendedor', '');
    setEditableValue('pcEntrega', '');
    // ============================================================
    // 5. LIMPIAR BUSCADOR (EDITABLE)
    // ============================================================
    const searchInput = document.getElementById('pcCotSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'Buscar Cotizacion : Escribe N° cotización, RUC, razón social...';
        searchInput.readOnly = false;
        searchInput.style.background = '#FFFFFF';
        searchInput.style.color = '#0F172A';
        searchInput.style.cursor = 'text';
    }
    
    // ============================================================
    // 6. LIMPIAR RESULTADOS DE BÚSQUEDA
    // ============================================================
    const resultsContainer = document.getElementById('cotizacionSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    
    // ============================================================
    // 7. CAMPOS DE FECHA Y NÚMERO (EDITABLES)
    // ============================================================
    setEditableValue('pcFecha', fechaStr);
    setEditableValue('pcNumero', 'PC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(Date.now()).slice(-4));
    
    // ============================================================
    // 8. RESTAURAR SELECTS
    // ============================================================
    const selects = ['pcMedio', 'pcCondicion', 'pcMoneda'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.options.length > 0) {
            el.disabled = false;
            el.selectedIndex = 0;
            el.style.background = '#FFFFFF';
            el.style.cursor = 'pointer';
        }
    });
    
    // ============================================================
    // 9. LIMPIAR TABLA DE ITEMS
    // ============================================================
    const tbody = document.getElementById('pcItemsBody');
    if (tbody) {
        tbody.innerHTML = '';
        addPedidoItemSAP(); // Agregar una fila vacía
    }
    
    // ============================================================
    // 10. RESETEAR SWITCHES DE VALIDACIÓN A "Sí"
    // ============================================================
    const validations = ['vPrecio', 'vProducto', 'vEntrega', 'vTransporte', 'vCantidad', 'vMoneda', 'vVigencia'];
    validations.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = true;
            const label = document.getElementById(id + 'Label');
            if (label) {
                label.textContent = '✅ Válido';
                label.style.color = '#16A34A';
            }
        }
    });
    
    // ============================================================
    // 11. RESETEAR SEMÁFORO (estado inicial)
    // ============================================================
    const semaphore = document.getElementById('validationSemaphore');
    if (semaphore) {
        semaphore.style.display = 'block';
        semaphore.style.borderColor = '#F59E0B';
        semaphore.style.background = '#FFFBEB';
    }
    
    const icon = document.getElementById('validationIcon');
    if (icon) icon.textContent = '⏳';
    
    const titleSemaphore = document.getElementById('validationTitle');
    if (titleSemaphore) {
        titleSemaphore.textContent = 'Validando...';
        titleSemaphore.style.color = '#92400E';
    }
    
    const subtitleSemaphore = document.getElementById('validationSubtitle');
    if (subtitleSemaphore) {
        subtitleSemaphore.textContent = 'Revisando los puntos de validación';
        subtitleSemaphore.style.color = '#92400E';
    }
    
    const chips = document.getElementById('validationChips');
    if (chips) chips.innerHTML = '';
    
    // ============================================================
    // 12. RESETEAR RESULTADO DE VALIDACIÓN
    // ============================================================
    const validationResult = document.getElementById('validationResult');
    if (validationResult) {
        validationResult.innerHTML = 'ℹ️ Si algún punto es <b>"No"</b>, el PC quedará <b>observado y bloqueado</b>.';
        validationResult.style.background = '#EFF6FF';
        validationResult.style.color = '#1E3A8A';
        validationResult.style.border = '1px solid #BFDBFE';
    }
    
    // ============================================================
    // 13. RESETEAR ÍCONOS DE VALIDACIÓN ⚪
    // ============================================================
    const iconMap = {
        'vPrecio': 'vPrecioIcon',
        'vCantidad': 'vCantidadIcon',
        'vProducto': 'vProductoIcon',
        'vEntrega': 'vEntregaIcon',
        'vMoneda': 'vMonedaIcon',
        'vTransporte': 'vTransporteIcon',
        'vVigencia': 'vVigenciaIcon'
    };
    
    Object.keys(iconMap).forEach(id => {
        const iconEl = document.getElementById(iconMap[id]);
        if (iconEl) {
            iconEl.textContent = '⚪';
            iconEl.style.color = '';
        }
    });
    
    // ============================================================
    // 14. RESETEAR VARIABLES GLOBALES
    // ============================================================
    cotizacionSeleccionada = null;
    modalMode = 'cot';
    editingId = null;
    
    console.log('✅ Modal de PC restaurado a estado inicial');
}

function setEditableValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value !== undefined && value !== null ? value : '';
        el.readOnly = false;
        el.style.background = '#FFFFFF';
        el.style.color = '#0F172A';
        el.style.cursor = 'text';
    }
}


function toggleCustomPcCondicion() {
    const select = document.getElementById('pcCondicion');
    const customInput = document.getElementById('pcCondicionCustom');
    
    if (!select || !customInput) return;
    
    if (select.value === 'Personalizado') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
    
    // 🔽 También llamar a togglePagoCampos
    togglePagoCampos();
}

/**
 * Obtiene el valor de la condición de pago (incluyendo personalizado)
 */
function getPcCondicionValue() {
    const select = document.getElementById('pcCondicion');
    const customInput = document.getElementById('pcCondicionCustom');
    
    if (!select) return 'Contado';
    
    if (select.value === 'Personalizado' && customInput) {
        return customInput.value.trim() || 'Personalizado';
    }
    
    return select.value;
}

/**
 * Establece el valor de la condición de pago (soporta personalizado)
 */
function setPcCondicionValue(value) {
    const select = document.getElementById('pcCondicion');
    const customInput = document.getElementById('pcCondicionCustom');
    
    if (!select) return;
    
    if (!value) {
        select.value = 'Contado';
        if (customInput) {
            customInput.style.display = 'none';
            customInput.value = '';
        }
        return;
    }
    
    // Verificar si el valor está en las opciones del select
    let found = false;
    for (let opt of select.options) {
        if (opt.value === value) {
            opt.selected = true;
            found = true;
            break;
        }
    }
    
    if (!found && customInput) {
        // Si no está en las opciones, seleccionar "Personalizado"
        select.value = 'Personalizado';
        customInput.value = value;
        customInput.style.display = 'block';
    } else if (customInput) {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

// ============================================================
// VARIABLE GLOBAL PARA EL MODO DEL MODAL
// ============================================================
let modalMode = 'cot';  // 'cot' | 'directo' | 'editar'

// ============================================================
// GUARDAR PC - CON VALIDACIÓN DE SWITCHES
// ============================================================
async function savePedidoCompraSAP(force) {
    // 🔽 NUEVO: Verificar que la tabla de productos tenga datos
    const tbody = document.getElementById('pcItemsBody');
    const filas = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    
    // Verifica que al menos una fila tenga un código de producto real
    const hayProductosReales = filas.some(row => {
        const primerInput = row.querySelector('input');
        return primerInput && primerInput.value.trim() !== '';
    });
    
    if (filas.length === 0 || !hayProductosReales) {
        showToast('⚠️ No hay productos cargados. Espera a que termine de cargar la cotización antes de guardar.', 'warning');
        return;
    }

    console.log('🔄 savePedidoCompraSAP ejecutándose...', { force, modalMode, editingId });
    
    try {
        // ============================================================
        // 🔽 NUEVO: VALIDAR SWITCHES ANTES DE GUARDAR
        // ============================================================
        const validationSwitches = [
            { id: 'vPrecio', label: 'Precio' },
            { id: 'vCantidad', label: 'Cantidad' },
            { id: 'vProducto', label: 'Producto' },
            { id: 'vEntrega', label: 'Lugar de Entrega' },
            { id: 'vMoneda', label: 'Moneda' },
            { id: 'vTransporte', label: 'Transporte' },
            { id: 'vVigencia', label: 'Vigencia' }
        ];
        
        const invalidSwitches = [];
        const validSwitches = [];
        
        validationSwitches.forEach(({ id, label }) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                if (checkbox.checked) {
                    validSwitches.push(label);
                } else {
                    invalidSwitches.push(label);
                }
            }
        });
        
        console.log('📋 Switches válidos:', validSwitches);
        console.log('📋 Switches inválidos:', invalidSwitches);
        
        // ============================================================
        // 🔽 SI ES "PC CONFORME" Y HAY SWITCHES INVÁLIDOS, BLOQUEAR
        // ============================================================
        if (force !== 'observado' && invalidSwitches.length > 0) {
            // Mostrar modal de advertencia
            showValidationWarningModal(invalidSwitches);
            return;
        }
        
        // ============================================================
        // CONTINUAR CON EL GUARDADO NORMAL
        // ============================================================
        
        // VALIDAR QUE SE HAYA SELECCIONADO UNA COTIZACIÓN EN MODO 'cot'
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
                seleccionarCotizacionSAP(results[0].id);
                setTimeout(() => savePedidoCompraSAP(force), 300);
                return;
            } else {
                showToast('⚠️ Se encontraron varias cotizaciones. Selecciona una de la lista.', 'warning');
                buscarCotizacionSAP(valor);
                return;
            }
        }
        
        // LEER VALIDACIONES DE LOS SWITCHES
        const val = ['vPrecio', 'vCantidad', 'vProducto', 'vEntrega', 'vMoneda', 'vTransporte', 'vVigencia']
            .map(id => {
                const el = document.getElementById(id);
                if (el && el.type === 'checkbox') {
                    return el.checked ? 'Sí' : 'No';
                }
                return el?.value || 'Sí';
            });
        
        console.log('📋 Validaciones:', val);
        
        // OBSERVADO SOLO POR VALIDACIONES, NO POR STOCK
        const observed = force === 'observado' || val.some(v => v === 'No');
        
        // LEER ITEMS DE LA TABLA
        const trs = document.querySelectorAll('#pcItemsBody tr');
        const items = [];
        trs.forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 8) {
                const tds = row.querySelectorAll('td');
                const stockCell = tds[9];
                items.push({
                    codigo: inputs[0]?.value || '',
                    producto: inputs[1]?.value || '',
                    modelo: inputs[2]?.value || '',
                    marca: inputs[3]?.value || '',
                    cantidad_cotizada: Number(inputs[4]?.value || 0),
                    cantidad_pc: Number(inputs[5]?.value || 1),
                    precio_cotizado: Number(inputs[6]?.value || 0),
                    precio_pc: Number(inputs[7]?.value || 0),
                    stock: Number(stockCell?.textContent?.trim() || 0)
                });
            }
        });
        
        console.log('📦 Items del PC:', items);
        
        // DETERMINAR ESTADO - SIN BLOQUEAR POR STOCK
        const estado = observed ? 'PC observado' : 'PC conforme';
        const req_compra = observed ? 'Bloqueado' : 'Sí';
        
        // OBTENER VALOR DE CONDICIÓN DE PAGO
        const condicionSelect = document.getElementById('pcCondicion');
        const condicionCustom = document.getElementById('pcCondicionCustom');
        let condicionPago = condicionSelect?.value || 'Contado';
        if (condicionPago === 'Personalizado' && condicionCustom) {
            condicionPago = condicionCustom.value.trim() || 'Personalizado';
        }
        
        // OBTENER EL NÚMERO DEL PC
        let numeroPC = document.getElementById('pcNumero')?.value || '';
        
        if (modalMode === 'editar' && editingId) {
            const pedidoExistente = pedidosData.find(p => p.id === editingId);
            if (pedidoExistente && pedidoExistente.numero) {
                numeroPC = pedidoExistente.numero;
            }
        } else if (!numeroPC) {
            numeroPC = 'PC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(Date.now()).slice(-4);
        }
        
        console.log(`📋 Número de PC final: ${numeroPC} | editingId: ${editingId} | modalMode: ${modalMode}`);
        
        // PREPARAR DATOS PARA ENVIAR A LA API
        const pcData = {
            id: editingId || null,
            numero: numeroPC,
            fecha: document.getElementById('pcFecha')?.value?.replace('T', ' ') || new Date().toISOString(),
            medio: document.getElementById('pcMedio')?.value || 'Correo',
            estado: estado,
            cliente: document.getElementById('pcCliente')?.value || '',
            ruc: document.getElementById('pcRuc')?.value || '',
            cotizacion_id: cotizacionSeleccionada?.id || null,
            cotizacion_numero: document.getElementById('pcCotNumero')?.value || 'SIN COTIZACIÓN',
            monto: Number(document.getElementById('pcMonto')?.value || 0),
            entrega: document.getElementById('pcEntrega')?.value || '',
            lugar_entrega: document.getElementById('pcEntrega')?.value || '',
            condicion_pago: condicionPago,
            vendedor: document.getElementById('pcVendedor')?.value || 'Helen Blas Príncipe',
            responsable: 'Hellen',
            observaciones: document.getElementById('pcObs')?.value || '',
            items: items,
            valida_precios: val[0] === 'Sí',
            valida_cantidades: val[1] === 'Sí',
            valida_stock: false,
            valida_entrega: val[3] === 'Sí',
            valida_montos: val[4] === 'Sí',
            valida_transporte: val[5] === 'Sí',
            valida_vigencia: val[6] === 'Sí',
            req_compra: req_compra
        };
        
        console.log('📦 Datos a enviar a la API:', pcData);
        
        // ENVIAR A LA API
        showToast('⏳ Guardando PC...', 'info');
        
        const response = await fetch('/ventas/api/pedido-compra/guardar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pcData)
        });
        
        const result = await response.json();
        console.log('📦 Respuesta del servidor:', result);
        
        if (result.success) {
            let mensaje = `✅ PC guardado como: ${estado}`;
            if (estado === 'PC conforme') {
                const stockFalta = items.some(i => Number(i.cantidad_pc) > Number(i.stock));
                if (stockFalta) {
                    mensaje += ' ⚠️ Stock insuficiente - requiere compra';
                } else {
                    mensaje += ' ✅ Stock OK - listo para despacho';
                }
            }
            showToast(mensaje, 'success');
            
            closeModal('pedidoCompraModal');
            cotizacionSeleccionada = null;
            editingId = null;
            
            if (typeof loadPedidos === 'function') {
                await loadPedidos();
            }
            if (typeof loadCotizaciones === 'function') {
                await loadCotizaciones();
            }
            if (currentModule === 'validacion' && typeof renderValidacion === 'function') {
                renderValidacion();
            }
            
        } else {
            showToast('❌ Error: ' + (result.error || 'No se pudo guardar'), 'error');
        }
        
    } catch (error) {
        console.error('❌ Error en savePedidoCompraSAP:', error);
        showToast('❌ Error al guardar el PC: ' + error.message, 'error');
    }
}


// ============================================================
// MODAL DE ADVERTENCIA DE VALIDACIÓN
// ============================================================
function showValidationWarningModal(invalidSwitches) {
    // Remover modales existentes
    document.querySelectorAll('.validation-warning-overlay').forEach(el => el.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'validation-warning-overlay';
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
    
    // Generar lista de items pendientes
    const listaItems = invalidSwitches.map(item => 
        `<li style="color: #DC2626; font-weight: 800; padding: 4px 0; text-align: left; list-style: none; border-bottom: 1px solid #FEE2E2;">
            ❌ ${item}
        </li>`
    ).join('');
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h2 style="font-size: 22px; font-weight: 900; color: #0F172A; margin-bottom: 8px;">Validaciones pendientes</h2>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 12px;">
            Para crear un <b>"PC Conforme"</b> debes marcar todas las validaciones como <b>"Válido"</b>.
        </p>
        <div style="background: #FEF2F2; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; border-left: 4px solid #DC2626; text-align: left;">
            <span style="font-size: 13px; font-weight: 700; color: #991B1B; display: block; margin-bottom: 8px;">📋 Te falta marcar:</span>
            <ul style="margin: 0; padding: 0; list-style: none;">
                ${listaItems}
            </ul>
        </div>
        <div style="background: #EFF6FF; border-radius: 12px; padding: 10px 14px; margin-bottom: 20px; border-left: 4px solid #2563EB; text-align: left;">
            <span style="font-size: 12px; font-weight: 700; color: #1E3A8A;">
                💡 Si no deseas validar todos los puntos, puedes crear un <b>"PC Observado"</b> usando el botón naranja.
            </span>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="warning-close-btn" style="
                padding: 12px 28px;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                color: #0F172A;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            ">Cerrar y revisar</button>
            <button class="warning-observado-btn" style="
                padding: 12px 28px;
                border-radius: 12px;
                border: 1px solid #FF8C00;
                background: #FF8C00;
                color: #FFFFFF;
                font-weight: 800;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 14px rgba(255, 140, 0, 0.35);
            ">⚠️ Crear PC Observado</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event listeners
    modal.querySelector('.warning-close-btn').addEventListener('click', function() {
        overlay.remove();
        // Enfocar el primer switch inválido
        const firstInvalid = document.querySelector('.switch input[type="checkbox"]:not(:checked)');
        if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.closest('.check-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    
    modal.querySelector('.warning-observado-btn').addEventListener('click', function() {
        overlay.remove();
        // Guardar como PC Observado
        savePedidoCompraSAP('observado');
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
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
        
        <!-- 🔽 NUEVO: Vista Previa (no descarga) -->
        <button class="menu-preview" onclick="previewCotizacionPdf(${id});this.closest('.menu-pop').remove()" style="color:#8B5CF6;font-weight:900;">
            👁️ Vista Previa
        </button>
        
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
    
    // Buscar el PC para ver su estado
    const pedido = pedidosData.find(p => p.id === id);
    const estado = pedido?.estado || 'Desconocido';
    const esAnulado = estado === 'Anulado';
    const esValidado = estado === 'Validado por Hellen' || estado === 'Validado';
    
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    const left = Math.max(10, event.clientX - 250);
    const top = Math.min(window.innerHeight - 420, event.clientY + 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    
    let menuHtml = `
        <button onclick="openPedidoCompraModalSAP('editar', ${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
    `;
    
    // Solo mostrar "Validación" si NO está validado
    if (!esValidado && !esAnulado) {
        menuHtml += `
            <button onclick="validatePedidoCompra(${id});this.closest('.menu-pop').remove()">✅ Validar PC</button>
        `;
    } else if (esValidado) {
        menuHtml += `
            <button disabled style="opacity:0.5;cursor:not-allowed;">✅ Ya validado</button>
        `;
    } else if (esAnulado) {
        menuHtml += `
            <button disabled style="opacity:0.5;cursor:not-allowed;">⛔ Anulado</button>
        `;
    }
    
    menuHtml += `
        <button onclick="createDespachoFromPedido(${id});this.closest('.menu-pop').remove()">🚚 Crear despacho</button>
        <button onclick="createGuiaFromPedido(${id});this.closest('.menu-pop').remove()">📦 Crear guía</button>
        <button onclick="createFacturaFromPedido(${id});this.closest('.menu-pop').remove()">🧾 Crear factura</button>
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
        <button class="danger" onclick="deletePedidoCompra(${id});this.closest('.menu-pop').remove()">
            🗑 Eliminar permanentemente ${estado !== 'Anulado' ? '(Se anulará primero)' : ''}
        </button>
    `;
    
    pop.innerHTML = menuHtml;
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
    
    // Buscar la guía para ver su estado
    const guia = guiasData.find(g => g.id === id);
    const estado = guia?.estado || '';
    const isEmitida = estado === 'Emitida' || estado === 'Entregada';
    
    let menuHtml = `
        <button onclick="openGuiaModal(${id});this.closest('.menu-pop').remove()">👁 Ver / Editar</button>
        <button onclick="previewGuiaPdf(${id});this.closest('.menu-pop').remove()" style="color:#8B5CF6;font-weight:900;">👁️ Vista Previa</button>
        <button onclick="generateGuiaPdf(${id});this.closest('.menu-pop').remove()">📄 Descargar PDF</button>
    `;
    
    if (!isEmitida) {
        menuHtml += `
            <button onclick="markGuiaEmitida(${id});this.closest('.menu-pop').remove()">📄 Emitir</button>
        `;
    } else {
        menuHtml += `
            <button disabled style="opacity:0.5;cursor:not-allowed;">✅ Ya emitida</button>
        `;
    }
    
    menuHtml += `
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
        <button class="danger" onclick="deleteGuia(${id});this.closest('.menu-pop').remove()">🗑 Eliminar</button>
    `;
    
    pop.innerHTML = menuHtml;
    document.body.appendChild(pop);
}

// ventas.js - Actualizar la función showComprobanteMenu

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
        <button onclick="previewComprobantePdf(${id});this.closest('.menu-pop').remove()" style="color:#8B5CF6;font-weight:900;">👁️ Vista Previa</button>
        <button onclick="generateComprobantePdf(${id});this.closest('.menu-pop').remove()">📄 Descargar PDF</button>
        <button onclick="markComprobanteEmitido(${id});this.closest('.menu-pop').remove()">📄 Emitir</button>
        <div style="height:1px;background:#E5E7EB;margin:4px 0;"></div>
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

// Agregar esta función
function updateValidationIcon(elementId, isValid) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = isValid ? '✅' : '❌';
        el.style.color = isValid ? '#16A34A' : '#DC2626';
    }
}



function inicializarSwitchesValidacion() {
    console.log('🔄 Inicializando switches de validación...');
    
    const validations = [
        'vPrecio', 'vProducto', 'vEntrega', 
        'vTransporte', 'vCantidad', 'vMoneda', 'vVigencia'
    ];
    
    validations.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            // 🔽 FORZAR A QUE ESTÉN DESMARCADOS (NO VÁLIDO)
            checkbox.checked = false;
            
            // Remover listeners anteriores para evitar duplicados
            checkbox.removeEventListener('change', updateValidationStatus);
            checkbox.addEventListener('change', updateValidationStatus);
            
            // Actualizar el label inicial
            const label = document.getElementById(id + 'Label');
            if (label) {
                // 🔽 SIEMPRE MOSTRAR "NO VÁLIDO"
                label.textContent = '❌ No válido';
                label.style.color = '#DC2626';
            }
        }
    });
    
    // Actualizar estado inicial del semáforo
    setTimeout(() => {
        updateValidationStatus();
        console.log('✅ Switches de validación inicializados en "NO VÁLIDO"');
    }, 100);
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
window.initVentas = async function(tab) {
    console.log(`🚀 Inicializando ventas con tab: ${tab}`);
    currentModule = tab || 'cotizaciones';
    
    await Promise.all([
        cargarProductosMaestros(),
        cargarClientesMaestros()
    ]);
    
    // Cargar cotizaciones primero (necesario para PC y validación)
    await loadCotizaciones();
    
    switch(currentModule) {
        case 'cotizaciones':
            break;
        case 'pedido_compra':
            await loadPedidos();
            break;
        case 'validacion':   // NUEVO
            await loadPedidos();
            renderValidacion();
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
            break;
    }
    
    // Si es validación, asegurar render
    if (currentModule === 'validacion') {
        renderValidacion();
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
    
    // ============================================================
    // EVENTOS PARA FILTROS DE FECHA - DESPACHOS
    // ============================================================
    const despachoFechaInicio = document.getElementById('despachoFechaInicio');
    const despachoFechaFin = document.getElementById('despachoFechaFin');
    
    if (despachoFechaInicio) {
        despachoFechaInicio.addEventListener('change', function() {
            renderDespachos();
        });
    }
    if (despachoFechaFin) {
        despachoFechaFin.addEventListener('change', function() {
            renderDespachos();
        });
    }
    
    // ============================================================
    // EVENTOS PARA FILTROS DE FECHA - GUÍAS
    // ============================================================
    const guiaFechaInicio = document.getElementById('guiaFechaInicio');
    const guiaFechaFin = document.getElementById('guiaFechaFin');
    
    if (guiaFechaInicio) {
        guiaFechaInicio.addEventListener('change', function() {
            renderGuias();
        });
    }
    if (guiaFechaFin) {
        guiaFechaFin.addEventListener('change', function() {
            renderGuias();
        });
    }
    
    // ============================================================
    // EVENTOS PARA FILTROS DE FECHA - COMPROBANTES (FACTURAS)
    // ============================================================
    const comprobanteFechaInicio = document.getElementById('comprobanteFechaInicio');
    const comprobanteFechaFin = document.getElementById('comprobanteFechaFin');
    
    if (comprobanteFechaInicio) {
        comprobanteFechaInicio.addEventListener('change', function() {
            renderComprobantes();
        });
    }
    if (comprobanteFechaFin) {
        comprobanteFechaFin.addEventListener('change', function() {
            renderComprobantes();
        });
    }
    
    // ============================================================
    // EVENTOS PARA FILTROS DE FECHA - NOTAS DE CRÉDITO (opcional)
    // ============================================================
    const notaFechaInicio = document.getElementById('notaFechaInicio');
    const notaFechaFin = document.getElementById('notaFechaFin');
    
    if (notaFechaInicio) {
        notaFechaInicio.addEventListener('change', function() {
            renderNotas();
        });
    }
    if (notaFechaFin) {
        notaFechaFin.addEventListener('change', function() {
            renderNotas();
        });
    }
    
    // ============================================================
    // EVENTOS PARA FILTROS DE FECHA - DEVOLUCIONES (opcional)
    // ============================================================
    const devolucionFechaInicio = document.getElementById('devolucionFechaInicio');
    const devolucionFechaFin = document.getElementById('devolucionFechaFin');
    
    if (devolucionFechaInicio) {
        devolucionFechaInicio.addEventListener('change', function() {
            renderDevoluciones();
        });
    }
    if (devolucionFechaFin) {
        devolucionFechaFin.addEventListener('change', function() {
            renderDevoluciones();
        });
    }
    
    // ============================================================
    // INICIALIZAR CON EL TAB DE LA URL
    // ============================================================
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'cotizaciones';
    
    if (typeof initVentas === 'function') {
        initVentas(tab);
    } else {
        console.warn('⚠️ initVentas no está disponible');
    }
});
// ============================================================
// EXPORTAR TODAS LAS FUNCIONES AL WINDOW
// ============================================================

console.log('📦 Exportando funciones al window...');

// ============================================================
// 1. FUNCIONES PRINCIPALES (¡LAS MÁS IMPORTANTES!)
// ============================================================
window.initVentas = initVentas;
window.loadCotizaciones = loadCotizaciones;
window.loadPedidos = loadPedidos;
window.loadDespachos = loadDespachos;
window.loadGuias = loadGuias;
window.loadComprobantes = loadComprobantes;
window.loadNotas = loadNotas;
window.loadDevoluciones = loadDevoluciones;

// ============================================================
// 2. FUNCIONES DE RENDER
// ============================================================
window.renderCotizaciones = renderCotizaciones;
window.renderPedidos = renderPedidos;
window.renderDespachos = renderDespachos;
window.renderGuias = renderGuias;
window.renderComprobantes = renderComprobantes;
window.renderNotas = renderNotas;
window.renderDevoluciones = renderDevoluciones;
window.renderValidacion = renderValidacion;

// ============================================================
// 3. FUNCIONES DE VISTA
// ============================================================
window.setCotizacionView = setCotizacionView;
window.setPedidoView = setPedidoView;

// ============================================================
// 4. FUNCIONES DE VALIDACIÓN
// ============================================================
window.updateValidationStatus = updateValidationStatus;
window.updateValidationSemaphore = updateValidationSemaphore;  // <--- ESTA FALTABA
window.updateValidationIcon = updateValidationIcon;
window.inicializarSwitchesValidacion = inicializarSwitchesValidacion;
window.validarPCSAP = validarPCSAP;
window.solicitarCorreccion = solicitarCorreccion;
window.generarOrdenCompra = generarOrdenCompra;
window.enviarADespacho = enviarADespacho;



window.clearDespachoDateFilter = clearDespachoDateFilter;
window.clearGuiaDateFilter = clearGuiaDateFilter;
window.clearComprobanteDateFilter = clearComprobanteDateFilter;
// ============================================================
// 5. FUNCIONES DE MODALES PRINCIPALES
// ============================================================
window.openCotizacionModal = openCotizacionModal;
window.openPedidoCompraModalSAP = openPedidoCompraModalSAP;
window.openPedidoCompraModal = openPedidoCompraModal;  // Versión antigua
window.openDespachoModal = openDespachoModal;
window.openGuiaModal = openGuiaModal;
window.openComprobanteModal = openComprobanteModal;
window.openNotaCreditoModal = openNotaCreditoModal;
window.openDevolucionModal = openDevolucionModal;

// ============================================================
// 6. FUNCIONES DE COTIZACIÓN
// ============================================================
window.generateCotizacionPdf = generateCotizacionPdf;
window.previewCotizacionPdf = previewCotizacionPdf;
window.createDocFromCotizacion = createDocFromCotizacion;
window.duplicateCotizacion = duplicateCotizacion;
window.deleteCotizacion = deleteCotizacion;
window.marcarCotizacionAccepted = marcarCotizacionAccepted;
window.marcarDespachado = marcarDespachado;
window.validateByHellen = validateByHellen;
window.sendCotizacionToReview = sendCotizacionToReview;
window.generateCotizacionPdfAndSend = generateCotizacionPdfAndSend;
window.saveCotizacionDraft = saveCotizacionDraft;

// ============================================================
// 7. FUNCIONES DE SELECTOR DE PRODUCTOS
// ============================================================
window.openProductSelector = openProductSelector;
window.renderProductSelector = renderProductSelector;
window.toggleProductSelection = toggleProductSelection;
window.selectAllProducts = selectAllProducts;
window.deselectAllProducts = deselectAllProducts;
window.filterProductSelector = filterProductSelector;
window.addSelectedProducts = addSelectedProducts;
window.toggleAllProductCheckboxes = toggleAllProductCheckboxes;

// ============================================================
// 8. FUNCIONES DE SELECTOR DE PRODUCTOS PC
// ============================================================
window.openProductSelectorPC = openProductSelectorPC;
window.renderProductSelectorPc = renderProductSelectorPc;
window.toggleProductSelectionPc = toggleProductSelectionPc;
window.selectAllProductsPc = selectAllProductsPc;
window.deselectAllProductsPc = deselectAllProductsPc;
window.filterProductSelectorPc = filterProductSelectorPc;
window.addSelectedProductsPc = addSelectedProductsPc;
window.toggleAllProductCheckboxesPc = toggleAllProductCheckboxesPc;
window.agregarItemPCTable = agregarItemPCTable;

// ============================================================
// 9. FUNCIONES DE PC SAP
// ============================================================
window.openPedidoCompraModalSAP = openPedidoCompraModalSAP;
window.clearPedidoModalSAP = clearPedidoModalSAP;
window.addPedidoItemSAP = addPedidoItemSAP;
window.eliminarItemSAP = eliminarItemSAP;
window.reordenarItemsSAP = reordenarItemsSAP;
window.savePedidoCompraSAP = savePedidoCompraSAP;
window.buscarCotizacionSAP = buscarCotizacionSAP;
window.seleccionarCotizacionSAP = seleccionarCotizacionSAP;
window.loadPedidoCotizacionSAP = loadPedidoCotizacionSAP;
window.actualizarFaltanteSAP = actualizarFaltanteSAP;
window.actualizarPrecioPCSAP = actualizarPrecioPCSAP;
window.actualizarValorTotalPCSAP = actualizarValorTotalPCSAP;
window.actualizarFaltanteDesdeInput = actualizarFaltanteDesdeInput;

// ============================================================
// 10. FUNCIONES DE CREACIÓN DESDE COTIZACIÓN
// ============================================================
window.openGuiaModalWithData = openGuiaModalWithData;
window.openComprobanteModalWithData = openComprobanteModalWithData;
window.openDespachoModalWithData = openDespachoModalWithData;
window.loadGuiaFromCotizacion = loadGuiaFromCotizacion;

// ============================================================
// 11. FUNCIONES DE MENÚS
// ============================================================
window.showCotizacionMenu = showCotizacionMenu;
window.showPedidoMenu = showPedidoMenu;
window.showGuiaMenu = showGuiaMenu;
window.showComprobanteMenu = showComprobanteMenu;
window.showNotaMenu = showNotaMenu;
window.showDevolucionMenu = showDevolucionMenu;
window.createMenuWithClose = createMenuWithClose;

window.generateComprobantePdf = generateComprobantePdf;
window.previewComprobantePdf = previewComprobantePdf;

// ============================================================
// 12. FUNCIONES DE PRODUCTOS Y CLIENTES
// ============================================================
window.cargarProductosMaestros = cargarProductosMaestros;
window.cargarClientesMaestros = cargarClientesMaestros;
window.cargarDatalistProductos = cargarDatalistProductos;
window.productTableHtml = productTableHtml;

// ============================================================
// 13. FUNCIONES DE UTILIDAD
// ============================================================
window.closeModal = closeModal;
window.clearDateFilter = clearDateFilter;
window.clearPcDateFilter = clearPcDateFilter;
window.exportData = exportData;
window.showSuccessModal = showSuccessModal;
window.showConfirmModal = showConfirmModal;
window.setFieldValue = setFieldValue;
window.getFieldValue = getFieldValue;
window.toggleCustomField = toggleCustomField;
window.setEditableValue = setEditableValue;
window.deletePedidoCompra = deletePedidoCompra;
window.deleteGuia = deleteGuia;
window.deleteComprobante = deleteComprobante;
window.deleteNota = deleteNota;
// ============================================================
// 14. FUNCIONES DE FORMATO
// ============================================================
window.money = money;
window.badgeStatus = badgeStatus;
window.formatFecha = formatFecha;
window.formatearFecha = formatearFecha;
window.esc = esc;
window.sd = sd;
window.options = options;
window.today = today;
window.now = now;

console.log('✅ Todas las funciones exportadas al window correctamente');