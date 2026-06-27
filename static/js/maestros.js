// ============================================================
// MÓDULO MAESTROS - ERP Multiempresa (CONECTADO A SUPABASE)
// ============================================================

console.log('📦 Módulo Maestros cargando...');

// ============================================================
// CONFIGURACIÓN DE MÓDULOS - BASADO EN TABLAS REALES
// ============================================================
const MODULE_CONFIG = {
    clientes: {
        title: 'Clientes',
        subtitle: 'Base comercial de clientes y prospectos',
        table: 'clientes',
        fields: [
            { key: 'codigo_cliente', label: 'Código', type: 'text' },
            { key: 'razon_social', label: 'Razón Social', type: 'text' },
            { key: 'numero_documento', label: 'RUC/DNI', type: 'text' },
            { key: 'nombre_comercial', label: 'Nombre Comercial', type: 'text' },
            { key: 'nombre_contacto', label: 'Contacto', type: 'text' },
            { key: 'telefono_contacto', label: 'Teléfono', type: 'text' },
            { key: 'email_contacto', label: 'Email', type: 'text' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo_cliente', 'razon_social', 'numero_documento', 'nombre_comercial', 'nombre_contacto', 'telefono_contacto', 'email_contacto', 'activo'],
        headers: ['Código', 'Razón Social', 'RUC/DNI', 'Nombre Comercial', 'Contacto', 'Teléfono', 'Email', 'Estado'],
        idField: 'id',
        codeField: 'codigo_cliente',
        // 🔥 NUEVO: Configuración de rutas API
        apiBase: '/maestros/api'
    },
    proveedores: {
        title: 'Proveedores',
        subtitle: 'Base de proveedores y servicios',
        table: 'proveedores',
        fields: [
            { key: 'codigo_proveedor', label: 'Código', type: 'text' },
            { key: 'razon_social', label: 'Razón Social', type: 'text' },
            { key: 'ruc', label: 'RUC', type: 'text' },
            { key: 'razon_comercial', label: 'Razón Comercial', type: 'text' },
            { key: 'contacto', label: 'Contacto', type: 'text' },
            { key: 'telefono', label: 'Teléfono', type: 'text' },
            { key: 'email', label: 'Email', type: 'text' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo_proveedor', 'razon_social', 'ruc', 'razon_comercial', 'contacto', 'telefono', 'email', 'activo'],
        headers: ['Código', 'Razón Social', 'RUC', 'Razón Comercial', 'Contacto', 'Teléfono', 'Email', 'Estado'],
        idField: 'id',
        codeField: 'codigo_proveedor',
        // 🔥 NUEVO: Configuración de rutas API
        apiBase: '/maestros/api'
    }
};

// ============================================================
// VARIABLES GLOBALES
// ============================================================
const MAESTROS = ['clientes', 'proveedores'];
const DS = {};
const sheetMode = {};
let currentModule = 'clientes';

// ============================================================
// FUNCIONES API - CORREGIDAS
// ============================================================

/**
 * Obtiene la URL base de la API para un módulo
 */
function getApiBase(modulo) {
    const config = MODULE_CONFIG[modulo];
    return config?.apiBase || '/maestros/api';
}

/**
 * Realiza una petición API con manejo de errores mejorado
 */
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
            // Intentar obtener mensaje de error del backend
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Error en fetchAPI:`, error);
        throw error;
    }
}

/**
 * Obtiene datos de un módulo
 */
async function fetchData(modulo) {
    try {
        const apiBase = getApiBase(modulo);
        const data = await fetchAPI(`${apiBase}/${modulo}/listar`);
        if (data.success) {
            return data.data || [];
        }
        console.error(`❌ Error cargando ${modulo}:`, data.error);
        return [];
    } catch (error) {
        console.error(`❌ Error en fetchData (${modulo}):`, error);
        showToast(`Error al cargar ${modulo}: ${error.message}`, 'error');
        return [];
    }
}

/**
 * Guarda datos de un módulo (CREAR o ACTUALIZAR)
 */
async function saveData(modulo, data) {
    try {
        const apiBase = getApiBase(modulo);
        // Determinar si es crear o actualizar
        const id = data.id;
        const endpoint = id ? `${apiBase}/${modulo}/${id}` : `${apiBase}/${modulo}/guardar`;
        const method = id ? 'PUT' : 'POST';
        
        const result = await fetchAPI(endpoint, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showToast(result.message || 'Datos guardados correctamente', 'success');
        } else {
            showToast(result.error || 'Error al guardar', 'error');
        }
        return result;
    } catch (error) {
        console.error(`❌ Error guardando ${modulo}:`, error);
        showToast(`Error al guardar: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Activa/Inactiva un registro (TOGGLE)
 */
async function toggleRecord(modulo, id) {
    try {
        const apiBase = getApiBase(modulo);
        const result = await fetchAPI(`${apiBase}/${modulo}/${id}/toggle`, {
            method: 'PUT'
        });
        return result;
    } catch (error) {
        console.error(`❌ Error togglando ${modulo}:`, error);
        showToast(`Error al cambiar estado: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// ============================================================
// TOAST NOTIFICATIONS - MEJORADAS
// ============================================================
function showToast(message, type = 'info') {
    // Eliminar toasts anteriores
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
// CARGAR DATOS CON CACHE
// ============================================================
const dataCache = {};

async function loadModuleData(modulo, force = false) {
    if (!force && dataCache[modulo]) {
        DS[modulo] = dataCache[modulo];
        return DS[modulo];
    }
    
    console.log(`🔄 Cargando datos de ${modulo}...`);
    DS[modulo] = await fetchData(modulo);
    dataCache[modulo] = DS[modulo];
    console.log(`✅ ${DS[modulo].length} registros cargados de ${modulo}`);
    return DS[modulo];
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

function getEstado(valor) {
    if (typeof valor === 'boolean') {
        return valor ? 'Activo' : 'Inactivo';
    }
    if (typeof valor === 'string') {
        const v = valor.toLowerCase();
        if (v === 'true' || v === 'activo' || v === '1') return 'Activo';
        if (v === 'false' || v === 'inactivo' || v === '0') return 'Inactivo';
        // Capitalizar
        return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
    }
    return 'Inactivo';
}

function bEstado(valor) {
    const estado = getEstado(valor);
    const badges = {
        'Activo': '<span class="badge b-ok">● Activo</span>',
        'Inactivo': '<span class="badge b-gray">● Inactivo</span>'
    };
    return badges[estado] || `<span class="badge b-gray">${estado}</span>`;
}

function bAmbito(v) {
    const ambitos = {
        'KCF': '<span class="badge b-kcf">KCF</span>',
        'AGD': '<span class="badge b-agd">AGD</span>',
        'COMPARTIDO': '<span class="badge b-shared">Compartido</span>'
    };
    return ambitos[v] || '<span class="badge b-shared">Compartido</span>';
}

function fecha(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d)) return esc(v);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function getCode(r, modulo) {
    const config = MODULE_CONFIG[modulo];
    return r[config.codeField] || `${modulo.toUpperCase()}-${String(r.id || 0).padStart(6, '0')}`;
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
}

// ============================================================
// FILTRADO MEJORADO
// ============================================================
function filtered(m) {
    const q = (document.getElementById(`search_${m}`)?.value || '').toLowerCase().trim();
    const st = document.getElementById(`estado_${m}`)?.value || 'TODOS';
    
    return (DS[m] || []).filter(r => {
        // Búsqueda en todos los campos
        const okQ = !q || JSON.stringify(r).toLowerCase().includes(q);
        
        // Filtro estado
        let okSt = true;
        if (st !== 'TODOS') {
            const estado = getEstado(r.activo);
            if (st === 'Activos') okSt = estado === 'Activo';
            else if (st === 'Inactivos') okSt = estado === 'Inactivo';
        }
        
        return okQ && okSt;
    });
}

function bindFilters(m, cb) {
    ['search_', 'estado_'].forEach(prefix => {
        const el = document.getElementById(prefix + m);
        if (el) {
            const event = prefix === 'search_' ? 'input' : 'change';
            el.removeEventListener(event, cb);
            el.addEventListener(event, cb);
        }
    });
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderStatusBoard(m) {
    const data = DS[m] || [];
    const activos = data.filter(r => getEstado(r.activo) === 'Activo').length;
    const inactivos = data.filter(r => getEstado(r.activo) === 'Inactivo').length;
    
    return `
        <div class="master-status-board">
            <div class="master-status-card">
                <div class="master-status-dot msd-active">●</div>
                <div><small>Activos</small><b>${activos}</b></div>
            </div>
            <div class="master-status-card">
                <div class="master-status-dot msd-inactive">●</div>
                <div><small>Inactivos</small><b>${inactivos}</b></div>
            </div>
            <div class="master-status-card">
                <div class="master-status-dot msd-total">●</div>
                <div><small>Total</small><b>${data.length}</b></div>
            </div>
        </div>
    `;
}

function renderTable(m, list) {
    if (!list || !list.length) {
        return `<div class="empty-state">
            <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
            <p style="color: #64748B; font-weight: 500;">No se encontraron registros</p>
            <p style="color: #94A3B8; font-size: 14px;">Prueba con otros filtros o crea un nuevo registro</p>
        </div>`;
    }
    
    const config = MODULE_CONFIG[m];
    const headers = config.headers;
    const displayFields = config.displayFields;
    
    // Cabeceras
    let headersHtml = `<th style="width:50px;">#</th><th style="width:100px;">Ámbito</th>`;
    headers.forEach(h => {
        headersHtml += `<th>${h}</th>`;
    });
    headersHtml += `<th style="width:200px;">Acciones</th>`;
    
    // Filas
    const rows = list.map((r, i) => {
        let cells = `<td><b>${i + 1}</b></td><td>${bAmbito('COMPARTIDO')}</td>`;
        
        displayFields.forEach(f => {
            if (f === 'activo') {
                cells += `<td>${bEstado(r[f])}</td>`;
            } else if (f === 'email' || f === 'email_contacto') {
                const email = r[f];
                cells += `<td>${email ? `<a href="mailto:${esc(email)}" style="color:#3B82F6;text-decoration:none;">${esc(email)}</a>` : '-'}</td>`;
            } else {
                cells += `<td class="left">${sd(r[f])}</td>`;
            }
        });
        
        const isActive = getEstado(r.activo) === 'Activo';
        const estadoDisplay = isActive ? 'Inactivar' : 'Activar';
        const estadoClass = isActive ? 'action-delete' : 'action-activate';
        
        cells += `
            <td>
                <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;">
                    <button class="action-btn action-view" data-view="${m}|${r.id}" title="Ver detalle">👁️</button>
                    <button class="action-btn action-edit" data-edit="${m}|${r.id}" title="Editar">✏️</button>
                    <button class="action-btn ${estadoClass}" data-toggle="${m}|${r.id}" title="${estadoDisplay}">${estadoDisplay}</button>
                </div>
            </td>
        `;
        
        return `<tr>${cells}</tr>`;
    }).join('');
    
    return `<table class="master-table"><thead><tr>${headersHtml}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderModule(m) {
    const config = MODULE_CONFIG[m];
    if (!config) {
        document.getElementById(m).innerHTML = '<div class="panel"><p>Módulo no configurado</p></div>';
        return;
    }
    
    const list = filtered(m);
    const container = document.getElementById(m);
    if (!container) return;
    
    container.innerHTML = `
        ${renderStatusBoard(m)}
        <div class="panel">
            <div class="clean-header">
                <div class="master-title-wrap">
                    <div class="master-title">${config.title}</div>
                    <div class="master-subtitle">${config.subtitle} (${list.length} registros)</div>
                </div>
                <div class="search-box">
                    <input type="text" id="search_${m}" placeholder="Buscar..." class="search-input">
                </div>
                <div class="clean-actions">
                    <select id="estado_${m}" class="status-filter">
                        <option value="TODOS">Todos los estados</option>
                        <option value="Activos">✅ Activos</option>
                        <option value="Inactivos">⛔ Inactivos</option>
                    </select>
                    <button class="btn btn-secondary" data-bulk="${m}">📥 Importar</button>
                    <button class="btn btn-primary btn-create" data-new="${m}">+ Crear ${config.title.slice(0, -1)}</button>
                </div>
            </div>
            <div class="security-note">
                <b>🔒 Seguridad:</b> la descarga de data queda bloqueada. Solo Gerencia/Administrador podrá autorizar exportaciones.
            </div>
            <div class="table-scroll">
                ${renderTable(m, list)}
            </div>
            <div class="bottom-sheet">
                <div class="bottom-left">
                    <span class="bottom-label">📊 Vista de datos</span>
                    <div class="page-group">
                        <button class="page-btn ${sheetMode[m] === 'principal' ? 'active' : ''}" data-sheet="${m}|principal">
                            <span class="page-num">1</span>Principal
                        </button>
                        <button class="page-btn ${sheetMode[m] === 'completa' ? 'active' : ''}" data-sheet="${m}|completa">
                            <span class="page-num">2</span>Completa
                        </button>
                    </div>
                </div>
                <div class="bottom-help">
                    ${sheetMode[m] === 'principal' ? '💡 Datos clave para trabajar rápido.' : '📋 Todos los campos registrados.'}
                </div>
            </div>
        </div>
    `;

    // Bind de eventos
    const renderFn = () => renderModule(m);
    bindFilters(m, renderFn);
    
    // Eventos para botones de cambio de vista
    document.querySelectorAll(`[data-sheet^="${m}|"]`).forEach(btn => {
        btn.addEventListener('click', function(e) {
            const [mod, mode] = this.dataset.sheet.split('|');
            sheetMode[mod] = mode;
            renderModule(mod);
        });
    });
}

// ============================================================
// HANDLERS
// ============================================================

async function toggleRecordHandler(modulo, id) {
    const r = DS[modulo]?.find(x => x.id === id);
    if (!r) {
        showToast('Registro no encontrado', 'error');
        return;
    }
    
    const currentState = getEstado(r.activo);
    const newState = currentState === 'Activo' ? false : true;
    const newStateLabel = newState ? 'Activo' : 'Inactivo';
    
    // Mostrar loading
    showToast(`⏳ Cambiando estado...`, 'info');
    
    try {
        // Llamar al API toggle
        const result = await toggleRecord(modulo, id);
        
        if (result.success) {
            // Actualizar localmente
            r.activo = newState;
            showToast(`✅ Registro ${newStateLabel.toLowerCase()} correctamente`, 'success');
            // Recargar la vista
            renderModule(modulo);
        } else {
            showToast(`❌ Error: ${result.error || 'No se pudo actualizar'}`, 'error');
        }
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// ============================================================
// OPEN SCREEN
// ============================================================
async function openScreen(screen) {
    console.log('🔄 Abriendo pantalla:', screen);
    currentModule = screen;
    
    // Cambiar tabs
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(screen);
    if (section) section.classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.tab-btn[data-screen="${screen}"]`).forEach(t => t.classList.add('active'));
    
    // Renderizar módulo
    if (MODULE_CONFIG[screen]) {
        await loadModuleData(screen);
        renderModule(screen);
    } else {
        const el = document.getElementById(screen);
        if (el) {
            el.innerHTML = `<div class="panel" style="padding:40px;text-align:center;color:#64748B;">
                <div style="font-size:48px;margin-bottom:10px;">🚧</div>
                <h3>${screen}</h3>
                <p>Módulo en construcción</p>
            </div>`;
        }
    }
}

// ============================================================
// EVENT DELEGATION
// ============================================================
document.addEventListener('click', function(e) {
    // Navegación de tabs
    const tabBtn = e.target.closest('.tab-btn[data-screen]');
    if (tabBtn) {
        e.preventDefault();
        openScreen(tabBtn.dataset.screen);
        return;
    }

    // Crear nuevo
    const newBtn = e.target.closest('[data-new]');
    if (newBtn) {
        e.preventDefault();
        const m = newBtn.dataset.new;
        showToast(`📝 Funcionalidad: Crear nuevo ${m} (próximamente)`, 'info');
        return;
    }

    // Toggle (Activar/Inactivar)
    const togBtn = e.target.closest('[data-toggle]');
    if (togBtn) {
        e.preventDefault();
        const [m, id] = togBtn.dataset.toggle.split('|');
        toggleRecordHandler(m, parseInt(id));
        return;
    }

    // Ver detalle
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
        e.preventDefault();
        const [m, id] = viewBtn.dataset.view.split('|');
        const r = DS[m]?.find(x => x.id === parseInt(id));
        if (r) {
            // Mostrar detalle en un modal o alert
            const details = Object.entries(r)
                .filter(([key]) => !key.startsWith('_'))
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            alert(`📋 Detalle de ${m}\n\n${details}`);
        } else {
            showToast('Registro no encontrado', 'error');
        }
        return;
    }

    // Editar
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
        e.preventDefault();
        const [m, id] = editBtn.dataset.edit.split('|');
        showToast(`✏️ Editar ${m} ID: ${id} (próximamente)`, 'info');
        return;
    }
});

// ============================================================
// ESTILOS CSS INJECTADOS (SOLO POR SI FALTA ALGUNO)
// ============================================================
(function injectStyles() {
    const styles = `
        .master-status-board {
            display: flex;
            gap: 15px;
            padding: 15px 20px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
        }
        .master-status-card {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
        }
        .master-status-card b {
            font-size: 18px;
            margin-left: 4px;
        }
        .master-status-dot {
            font-size: 16px;
            color: #94A3B8;
        }
        .msd-active { color: #10B981; }
        .msd-inactive { color: #94A3B8; }
        .msd-total { color: #3B82F6; }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .b-ok { background: #D1FAE5; color: #065F46; }
        .b-gray { background: #F1F5F9; color: #475569; }
        .b-kcf { background: #DBEAFE; color: #1E40AF; }
        .b-agd { background: #FEF3C7; color: #92400E; }
        .b-shared { background: #E0E7FF; color: #3730A3; }
        
        .clean-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 15px;
            padding: 15px 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .master-title-wrap {
            flex: 1;
            min-width: 150px;
        }
        .master-title {
            font-size: 20px;
            font-weight: 700;
            color: #0F172A;
        }
        .master-subtitle {
            font-size: 13px;
            color: #64748B;
        }
        .search-box {
            flex: 1;
            min-width: 180px;
        }
        .search-input {
            width: 100%;
            padding: 8px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }
        .search-input:focus {
            outline: none;
            border-color: #3B82F6;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .clean-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .status-filter {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: white;
            font-size: 13px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #3B82F6;
            color: white;
        }
        .btn-primary:hover {
            background: #2563EB;
        }
        .btn-secondary {
            background: #F1F5F9;
            color: #475569;
        }
        .btn-secondary:hover {
            background: #E2E8F0;
        }
        
        .security-note {
            padding: 10px 20px;
            background: #FEFCE8;
            border-bottom: 1px solid #FDE68A;
            font-size: 12px;
            color: #713F12;
        }
        .table-scroll {
            overflow-x: auto;
            padding: 10px;
        }
        .master-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .master-table th {
            background: #F8FAFC;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #E2E8F0;
            white-space: nowrap;
        }
        .master-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #F1F5F9;
            vertical-align: middle;
        }
        .master-table .left { text-align: left; }
        .master-table tr:hover {
            background: #F8FAFC;
        }
        
        .action-btn {
            padding: 4px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .action-view {
            background: #E0E7FF;
            color: #3730A3;
        }
        .action-view:hover {
            background: #C7D2FE;
        }
        .action-edit {
            background: #DBEAFE;
            color: #1E40AF;
        }
        .action-edit:hover {
            background: #BFDBFE;
        }
        .action-delete {
            background: #FEE2E2;
            color: #991B1B;
        }
        .action-delete:hover {
            background: #FECACA;
        }
        .action-activate {
            background: #D1FAE5;
            color: #065F46;
        }
        .action-activate:hover {
            background: #A7F3D0;
        }
        
        .bottom-sheet {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            border-top: 1px solid #E2E8F0;
            background: #F8FAFC;
            flex-wrap: wrap;
            gap: 10px;
        }
        .bottom-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .bottom-label {
            font-size: 12px;
            color: #64748B;
            font-weight: 500;
        }
        .page-group {
            display: flex;
            gap: 5px;
        }
        .page-btn {
            padding: 5px 12px;
            border: 1px solid #E2E8F0;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s;
        }
        .page-btn:hover {
            background: #F1F5F9;
        }
        .page-btn.active {
            background: #3B82F6;
            color: white;
            border-color: #3B82F6;
        }
        .page-btn.active .page-num {
            background: rgba(255,255,255,0.2);
        }
        .page-num {
            display: inline-block;
            width: 18px;
            height: 18px;
            line-height: 18px;
            text-align: center;
            border-radius: 50%;
            background: #F1F5F9;
            font-size: 10px;
            font-weight: 700;
        }
        .bottom-help {
            font-size: 12px;
            color: #94A3B8;
        }
        .empty-state {
            padding: 40px;
            text-align: center;
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
})();

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Maestros');
    console.log('📊 Módulos disponibles:', Object.keys(MODULE_CONFIG));
    
    // Solo mostrar módulos que existen en la BD
    const availableModules = Object.keys(MODULE_CONFIG);
    MAESTROS.length = 0;
    MAESTROS.push(...availableModules);
    
    // Iniciar con clientes
    openScreen('clientes');
});

console.log('✅ Maestros JS cargado correctamente');