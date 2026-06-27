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
        apiBase: '/maestros/api'
    },
    almacenes: {
        title: 'Almacenes',
        subtitle: 'Gestión de almacenes y ubicaciones',
        table: 'almacenes',
        fields: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Nombre', type: 'text' },
            { key: 'tipo', label: 'Tipo', type: 'text' },
            { key: 'responsable', label: 'Responsable', type: 'text' },
            { key: 'telefono', label: 'Teléfono', type: 'text' },
            { key: 'direccion', label: 'Dirección', type: 'text' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo', 'nombre', 'tipo', 'responsable', 'telefono', 'activo'],
        headers: ['Código', 'Nombre', 'Tipo', 'Responsable', 'Teléfono', 'Estado'],
        idField: 'id',
        codeField: 'codigo',
        apiBase: '/maestros/api'
    },
    categorias: {
        title: 'Categorías',
        subtitle: 'Clasificación de productos',
        table: 'categorias',
        fields: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Nombre', type: 'text' },
            { key: 'tipo', label: 'Categoría Principal', type: 'text' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo', 'nombre', 'tipo', 'activo'],
        headers: ['Código', 'Nombre', 'Categoría Principal', 'Estado'],
        idField: 'id',
        codeField: 'codigo',
        apiBase: '/maestros/api'
    },
    marcas: {
        title: 'Marcas',
        subtitle: 'Gestión de marcas y fabricantes',
        table: 'marcas',
        fields: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Marca', type: 'text' },
            { key: 'tipo', label: 'Tipo', type: 'text' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo', 'nombre', 'tipo', 'activo'],
        headers: ['Código', 'Marca', 'Tipo', 'Estado'],
        idField: 'id',
        codeField: 'codigo',
        apiBase: '/maestros/api'
    },
    um: {
        title: 'Unidades de Medida',
        subtitle: 'Define cómo compras, vendes e inventarias los productos',
        table: 'um',
        fields: [
            { key: 'codigo', label: 'Código', type: 'text' },
            { key: 'nombre', label: 'Unidad', type: 'text' },
            { key: 'abreviatura', label: 'Abreviatura', type: 'text' },
            { key: 'tipo', label: 'Tipo', type: 'text' },
            { key: 'decimales', label: 'Permite decimales', type: 'boolean' },
            { key: 'ambito', label: 'Ámbito', type: 'text' },
            { key: 'uso', label: 'Uso', type: 'number' },
            { key: 'activo', label: 'Estado', type: 'boolean' }
        ],
        displayFields: ['codigo', 'nombre', 'abreviatura', 'tipo', 'decimales', 'ambito', 'uso', 'activo'],
        headers: ['Código', 'Unidad', 'Abreviatura', 'Tipo', 'Decimales', 'Ámbito', 'Uso', 'Estado'],
        idField: 'id',
        codeField: 'codigo',
        apiBase: '/maestros/api'
    }
};

// ============================================================
// VARIABLES GLOBALES
// ============================================================
const MAESTROS = Object.keys(MODULE_CONFIG);
const DS = {};
const sheetMode = {};
let currentModule = 'clientes';

// ============================================================
// FUNCIONES API - CORREGIDAS PARA TU BACKEND
// ============================================================

function getApiBase(modulo) {
    const config = MODULE_CONFIG[modulo];
    return config?.apiBase || '/maestros/api';
}

async function fetchAPI(endpoint, options = {}) {
    console.log(`🌐 Fetching: ${endpoint}`);
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        console.log(`📡 Status: ${response.status}`);
        
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                console.error('❌ Detalle error:', errorData);
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log(`✅ Datos recibidos:`, data);
        return data;
    } catch (error) {
        console.error(`❌ Error en fetchAPI:`, error);
        throw error;
    }
}

async function fetchData(modulo) {
    try {
        const apiBase = getApiBase(modulo);
        // 🔥 CORREGIDO: usa el endpoint exacto de tu backend
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

async function saveData(modulo, data) {
    try {
        const apiBase = getApiBase(modulo);
        // 🔥 CORREGIDO: usa el endpoint exacto de tu backend
        const endpoint = `${apiBase}/${modulo}/guardar`;
        const method = 'POST';
        
        console.log(`💾 Guardando ${modulo}:`, { endpoint, method, data });
        
        const result = await fetchAPI(endpoint, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showToast(result.message || 'Datos guardados correctamente', 'success');
            await loadModuleData(modulo, true);
            renderModule(modulo);
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

async function toggleRecord(modulo, id) {
    try {
        const apiBase = getApiBase(modulo);
        // 🔥 CORREGIDO: usa el endpoint exacto de tu backend
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
// CARGAR DATOS CON CACHE
// ============================================================
const dataCache = {};

async function loadModuleData(modulo, force = false) {
    if (!force && dataCache[modulo] && dataCache[modulo].length > 0) {
        DS[modulo] = dataCache[modulo];
        console.log(`📦 Usando cache de ${modulo}: ${DS[modulo].length} registros`);
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
        const okQ = !q || JSON.stringify(r).toLowerCase().includes(q);
        
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
    
    let headersHtml = `<th style="width:50px;">#</th><th style="width:100px;">Ámbito</th>`;
    headers.forEach(h => { headersHtml += `<th>${h}</th>`; });
    headersHtml += `<th style="width:200px;">Acciones</th>`;
    
    const rows = list.map((r, i) => {
        let cells = `<td><b>${i + 1}</b></td><td>${bAmbito(r.ambito || 'COMPARTIDO')}</td>`;
        
        displayFields.forEach(f => {
            if (f === 'activo') {
                cells += `<td>${bEstado(r[f])}</td>`;
            } else if (f === 'decimales') {
                cells += `<td>${r[f] ? '✅ Sí' : '❌ No'}</td>`;
            } else if (f === 'email' || f === 'email_contacto') {
                const email = r[f];
                cells += `<td>${email ? `<a href="mailto:${esc(email)}" style="color:#3B82F6;text-decoration:none;">${esc(email)}</a>` : '-'}</td>`;
            } else if (f === 'uso') {
                cells += `<td style="text-align:center;">${r[f] || 0}</td>`;
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
        const container = document.getElementById(m);
        if (container) container.innerHTML = '<div class="panel"><p>Módulo no configurado</p></div>';
        return;
    }
    
    const list = filtered(m);
    const container = document.getElementById(m);
    if (!container) {
        console.warn(`⚠️ Contenedor para ${m} no encontrado`);
        return;
    }
    
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

    const renderFn = () => renderModule(m);
    bindFilters(m, renderFn);
    
    document.querySelectorAll(`[data-sheet^="${m}|"]`).forEach(btn => {
        btn.addEventListener('click', function(e) {
            const [mod, mode] = this.dataset.sheet.split('|');
            sheetMode[mod] = mode;
            renderModule(mod);
        });
    });
}

// ============================================================
// HANDLERS - CON FUNCIONALIDAD COMPLETA
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
    
    showToast(`⏳ Cambiando estado...`, 'info');
    
    try {
        const result = await toggleRecord(modulo, id);
        
        if (result.success) {
            r.activo = newState;
            showToast(`✅ Registro ${newStateLabel.toLowerCase()} correctamente`, 'success');
            await loadModuleData(modulo, true);
            renderModule(modulo);
        } else {
            showToast(`❌ Error: ${result.error || 'No se pudo actualizar'}`, 'error');
        }
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// ============================================================
// OPEN SCREEN - CORREGIDO
// ============================================================

async function openScreen(screen) {
    console.log('🔄 Abriendo pantalla:', screen);
    currentModule = screen;
    
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(screen);
    if (section) {
        section.classList.add('active');
    } else {
        console.warn(`⚠️ Sección ${screen} no encontrada`);
        // Crear la sección si no existe
        const mainPanel = document.querySelector('.main-inner');
        if (mainPanel) {
            const newSection = document.createElement('section');
            newSection.id = screen;
            newSection.className = 'section active';
            // Insertar después de dashboard
            const dashboard = document.getElementById('dashboard');
            if (dashboard && dashboard.parentNode) {
                dashboard.parentNode.insertBefore(newSection, dashboard.nextSibling);
            } else {
                mainPanel.appendChild(newSection);
            }
            console.log(`✅ Sección ${screen} creada`);
        }
    }
    
    // Actualizar tabs
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.tab-btn[data-tab="${screen}"]`).forEach(t => t.classList.add('active'));
    
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
// CREAR NUEVO REGISTRO
// ============================================================

function openCreateModal(modulo) {
    const config = MODULE_CONFIG[modulo];
    if (!config) {
        showToast('Módulo no configurado', 'error');
        return;
    }
    
    // Limpiar modal existente
    const existing = document.getElementById('modalCreate');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalCreate';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
    `;
    
    let fieldsHtml = '';
    config.fields.forEach(f => {
        if (f.key === 'id' || f.key === 'activo') return;
        const type = f.type === 'boolean' ? 'checkbox' : 'text';
        const checked = f.type === 'boolean' ? '' : '';
        const placeholder = f.key.includes('email') ? 'ejemplo@correo.com' : 
                           f.key.includes('telefono') ? '999-999-999' : 
                           f.key.includes('ruc') ? '12345678901' : 
                           '';
        fieldsHtml += `
            <div style="margin-bottom:12px;">
                <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">${f.label} ${f.key !== 'codigo' ? '<span style="color:#DC2626;">*</span>' : ''}</label>
                <input type="${type}" id="field_${f.key}" placeholder="${placeholder}" ${checked} style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;">
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div style="background:white;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <h2 style="margin:0;font-size:20px;">➕ Nuevo ${config.title.slice(0, -1)}</h2>
                <button onclick="closeCreateModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748B;">✕</button>
            </div>
            <form id="formCreate">
                ${fieldsHtml}
                <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid #e2e8f0;">
                    <button type="button" onclick="closeCreateModal()" style="padding:8px 20px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;">Cancelar</button>
                    <button type="submit" style="padding:8px 20px;border:none;border-radius:6px;background:#3B82F6;color:white;cursor:pointer;">💾 Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('formCreate').addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = {};
        config.fields.forEach(f => {
            if (f.key === 'id' || f.key === 'activo') return;
            const value = formData.get(`field_${f.key}`);
            if (f.type === 'boolean') {
                data[f.key] = !!value;
            } else {
                data[f.key] = value || '';
            }
        });
        data.activo = true;
        
        // Validar campos obligatorios
        let valid = true;
        config.fields.forEach(f => {
            if (f.key === 'id' || f.key === 'activo' || f.key === 'codigo') return;
            if (!data[f.key] || data[f.key].trim() === '') {
                const el = document.getElementById(`field_${f.key}`);
                if (el) {
                    el.style.borderColor = '#DC2626';
                    el.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
                }
                valid = false;
            }
        });
        
        if (!valid) {
            showToast('❌ Completa todos los campos obligatorios', 'error');
            return;
        }
        
        const result = await saveData(modulo, data);
        if (result.success) {
            closeCreateModal();
        }
    });
}

function closeCreateModal() {
    const modal = document.getElementById('modalCreate');
    if (modal) modal.remove();
}

// ============================================================
// VER DETALLE
// ============================================================

function openViewModal(modulo, id) {
    const r = DS[modulo]?.find(x => x.id === id);
    if (!r) {
        showToast('Registro no encontrado', 'error');
        return;
    }
    
    const config = MODULE_CONFIG[modulo];
    
    const existing = document.getElementById('modalView');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalView';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
    `;
    
    let detailsHtml = '';
    config.fields.forEach(f => {
        const value = r[f.key] !== undefined && r[f.key] !== null ? r[f.key] : '-';
        const displayValue = typeof value === 'boolean' ? (value ? '✅ Sí' : '❌ No') : value;
        detailsHtml += `
            <div style="display:flex;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-weight:600;width:150px;color:#64748B;">${f.label}</span>
                <span>${displayValue}</span>
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div style="background:white;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <h2 style="margin:0;font-size:20px;">👁️ Detalle de ${config.title.slice(0, -1)}</h2>
                <button onclick="closeViewModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748B;">✕</button>
            </div>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:16px;">
                <div style="font-size:13px;color:#64748B;">Código</div>
                <div style="font-size:18px;font-weight:700;">${getCode(r, modulo)}</div>
            </div>
            <div>
                ${detailsHtml}
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid #e2e8f0;">
                <button onclick="closeViewModal()" style="padding:8px 20px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeViewModal() {
    const modal = document.getElementById('modalView');
    if (modal) modal.remove();
}

// ============================================================
// EDITAR REGISTRO
// ============================================================

function openEditModal(modulo, id) {
    const r = DS[modulo]?.find(x => x.id === id);
    if (!r) {
        showToast('Registro no encontrado', 'error');
        return;
    }
    
    const config = MODULE_CONFIG[modulo];
    
    const existing = document.getElementById('modalEdit');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalEdit';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
    `;
    
    let fieldsHtml = '';
    config.fields.forEach(f => {
        if (f.key === 'id') return;
        const value = r[f.key] !== undefined && r[f.key] !== null ? r[f.key] : '';
        const type = f.type === 'boolean' ? 'checkbox' : 'text';
        const checked = f.type === 'boolean' && value ? 'checked' : '';
        const inputValue = typeof value === 'boolean' ? '' : value;
        fieldsHtml += `
            <div style="margin-bottom:12px;">
                <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">${f.label}</label>
                <input type="${type}" id="edit_${f.key}" value="${inputValue}" ${checked} style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;">
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div style="background:white;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                <h2 style="margin:0;font-size:20px;">✏️ Editar ${config.title.slice(0, -1)}</h2>
                <button onclick="closeEditModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748B;">✕</button>
            </div>
            <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
                <span style="font-size:13px;color:#64748B;">Código: </span>
                <span style="font-weight:700;">${getCode(r, modulo)}</span>
            </div>
            <form id="formEdit">
                ${fieldsHtml}
                <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid #e2e8f0;">
                    <button type="button" onclick="closeEditModal()" style="padding:8px 20px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;">Cancelar</button>
                    <button type="submit" style="padding:8px 20px;border:none;border-radius:6px;background:#3B82F6;color:white;cursor:pointer;">💾 Actualizar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('formEdit').addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = { id: r.id };
        config.fields.forEach(f => {
            if (f.key === 'id') return;
            const value = formData.get(`edit_${f.key}`);
            if (f.type === 'boolean') {
                data[f.key] = !!value;
            } else {
                data[f.key] = value || '';
            }
        });
        
        const result = await saveData(modulo, data);
        if (result.success) {
            closeEditModal();
        }
    });
}

function closeEditModal() {
    const modal = document.getElementById('modalEdit');
    if (modal) modal.remove();
}

// ============================================================
// EVENT DELEGATION
// ============================================================
document.addEventListener('click', function(e) {
    // Navegación de tabs
    const tabBtn = e.target.closest('.tab-btn[data-tab]');
    if (tabBtn) {
        e.preventDefault();
        const tab = tabBtn.dataset.tab;
        if (tab) openScreen(tab);
        return;
    }

    // Crear nuevo
    const newBtn = e.target.closest('[data-new]');
    if (newBtn) {
        e.preventDefault();
        const m = newBtn.dataset.new;
        openCreateModal(m);
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
        openViewModal(m, parseInt(id));
        return;
    }

    // Editar
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
        e.preventDefault();
        const [m, id] = editBtn.dataset.edit.split('|');
        openEditModal(m, parseInt(id));
        return;
    }
});

// ============================================================
// ESTILOS CSS INJECTADOS
// ============================================================
(function injectStyles() {
    const styles = `
        .section { display: none; }
        .section.active { display: block; }
        
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
        .panel {
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
})();

// ============================================================
// INIT - CORREGIDO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Maestros');
    console.log('📊 Módulos disponibles:', Object.keys(MODULE_CONFIG));
    console.log('📋 ENDPOINTS ESPERADOS:');
    console.log('   - GET  /maestros/api/clientes/listar');
    console.log('   - POST /maestros/api/clientes/guardar');
    console.log('   - PUT  /maestros/api/clientes/<id>/toggle');
    
    // Verificar contenedores
    const containers = Object.keys(MODULE_CONFIG);
    containers.forEach(m => {
        if (!document.getElementById(m)) {
            console.warn(`⚠️ No existe el contenedor #${m} en el HTML, creándolo...`);
            const mainPanel = document.querySelector('.main-inner');
            if (mainPanel) {
                const section = document.createElement('section');
                section.id = m;
                section.className = 'section';
                const dashboard = document.getElementById('dashboard');
                if (dashboard && dashboard.parentNode) {
                    dashboard.parentNode.insertBefore(section, dashboard.nextSibling);
                } else {
                    mainPanel.appendChild(section);
                }
                console.log(`✅ Contenedor #${m} creado`);
            }
        }
    });
    
    // Obtener módulo inicial
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const defaultModule = tabParam && MODULE_CONFIG[tabParam] ? tabParam : 'clientes';
    
    console.log(`🎯 Módulo inicial: ${defaultModule}`);
    
    setTimeout(() => {
        openScreen(defaultModule);
    }, 200);
});

console.log('✅ Maestros JS cargado correctamente');