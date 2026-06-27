// ============================================================
// MÓDULO MAESTROS - ERP Multiempresa (CONECTADO A BD)
// ============================================================

console.log('📦 Módulo Maestros cargando...');

// ============================================================
// VARIABLES GLOBALES
// ============================================================
const MAESTROS = ['clientes', 'proveedores', 'almacenes', 'categorias', 'marcas', 'um'];
const DS = {};
const sheetMode = {};
let currentModule = 'clientes';

// ============================================================
// FUNCIONES API - CONEXIÓN A LA BASE DE DATOS
// ============================================================

// Obtener datos de un módulo desde la API
async function fetchData(modulo) {
    try {
        const response = await fetch(`/api/${modulo}/listar`);
        const data = await response.json();
        if (data.success) {
            return data.data || [];
        } else {
            console.error(`❌ Error cargando ${modulo}:`, data.error);
            return [];
        }
    } catch (error) {
        console.error(`❌ Error en fetchData (${modulo}):`, error);
        return [];
    }
}

// Guardar datos de un módulo
async function saveData(modulo, data) {
    try {
        const response = await fetch(`/api/${modulo}/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`❌ Error guardando ${modulo}:`, error);
        return { success: false, error: error.message };
    }
}

// Eliminar/desactivar un registro
async function deleteData(modulo, id) {
    try {
        const response = await fetch(`/api/${modulo}/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`❌ Error eliminando ${modulo}:`, error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// CARGAR DATOS DESDE LA BD
// ============================================================

async function loadModuleData(modulo) {
    console.log(`🔄 Cargando datos de ${modulo}...`);
    DS[modulo] = await fetchData(modulo);
    console.log(`✅ ${DS[modulo].length} registros cargados de ${modulo}`);
    return DS[modulo];
}

// ============================================================
// INICIALIZAR
// ============================================================
function initData() {
    MAESTROS.forEach(m => {
        DS[m] = [];
        sheetMode[m] = 'principal';
    });
}

// ============================================================
// UTILIDADES
// ============================================================
function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[m]));
}

function sd(v) {
    return (v === undefined || v === null || String(v).trim() === '') ? '-' : esc(v);
}

function bEstado(v) {
    if (v === 'Activo' || v === 'activo') return '<span class="badge b-ok">Activo</span>';
    if (v === 'Observado' || v === 'observado') return '<span class="badge b-warn">Observado</span>';
    if (v === 'Bloqueado' || v === 'bloqueado') return '<span class="badge b-block">Bloqueado</span>';
    return '<span class="badge b-gray">Inactivo</span>';
}

function bAmbito(v) {
    if (v === 'KCF') return '<span class="badge b-kcf">Solo KCF</span>';
    if (v === 'AGD') return '<span class="badge b-agd">Solo AGD</span>';
    return '<span class="badge b-shared">Compartido</span>';
}

function fecha(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d)) return esc(v);
    return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
}

function visible(r) {
    const e = empresa();
    return r.ambito === 'COMPARTIDO' || r.ambito === e || !r.ambito;
}

function normalize(n, v) {
    let s = String(v ?? '').trim();
    if (['codigo', 'numero'].includes(n)) s = s.toUpperCase().replace(/\s+/g, '-');
    return s;
}

function clientCode(r) {
    return r.codigo_cliente || r.codigo || `CLI-${String(r.id || 0).padStart(6, '0')}`;
}

function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
}

// ============================================================
// FILTRADO
// ============================================================
function filtered(m) {
    const q = (document.getElementById('search_' + m)?.value || '').toLowerCase().trim();
    const st = document.getElementById('estado_' + m)?.value || 'TODOS';
    const am = document.getElementById('ambito_' + m)?.value || 'VISIBLE';
    return DS[m].filter(r => {
        const okQ = !q || JSON.stringify(r).toLowerCase().includes(q);
        const okSt = st === 'TODOS' || (r.estado || 'Activo') === st;
        const okAm = am === 'TODOS' || (am === 'VISIBLE' ? visible(r) : r.ambito === am);
        return okQ && okSt && okAm;
    });
}

function bindFilters(m, cb) {
    ['search_', 'estado_', 'ambito_'].forEach(p => {
        const el = document.getElementById(p + m);
        if (el) {
            el.addEventListener(p === 'search_' ? 'input' : 'change', cb);
        }
    });
}

// ============================================================
// RENDER CLIENTES
// ============================================================
async function renderClientes() {
    // Cargar datos desde la BD
    await loadModuleData('clientes');
    
    const list = filtered('clientes');
    const count = st => DS.clientes.filter(r => (r.estado || 'Activo') === st).length;

    document.getElementById('clientes').innerHTML = `
        <div class="client-status-board">
            <div class="client-status-card status-active">
                <div class="client-status-dot">A</div>
                <div><small>Activos</small><b>${count('Activo')}</b></div>
            </div>
            <div class="client-status-card status-observed">
                <div class="client-status-dot">!</div>
                <div><small>Observados</small><b>${count('Observado')}</b></div>
            </div>
            <div class="client-status-card status-blocked">
                <div class="client-status-dot">B</div>
                <div><small>Bloqueados</small><b>${count('Bloqueado')}</b></div>
            </div>
        </div>
        <div class="panel">
            <div class="clean-header">
                <div class="master-title-wrap">
                    <div class="master-title">Clientes</div>
                    <div class="master-subtitle">Base comercial de clientes y prospectos</div>
                </div>
                <div class="search-box">
                    <input type="text" id="search_clientes" placeholder="Buscar por código, razón social, RUC, contacto...">
                </div>
                <div class="clean-actions">
                    <select id="ambito_clientes">
                        <option value="VISIBLE">Empresa activa</option>
                        <option value="TODOS">Todos</option>
                        <option value="COMPARTIDO">Compartidos</option>
                        <option value="KCF">KCF</option>
                        <option value="AGD">AGD</option>
                    </select>
                    <select id="estado_clientes">
                        <option value="TODOS">Estados</option>
                        <option value="Activo">Activos</option>
                        <option value="Observado">Observados</option>
                        <option value="Bloqueado">Bloqueados</option>
                        <option value="Inactivo">Inactivos</option>
                    </select>
                    <button class="btn btn-secondary" data-bulk="clientes">Importar</button>
                    <button class="btn btn-primary btn-create" data-new="clientes">+ Crear cliente</button>
                </div>
            </div>
            <div class="security-note"><b>Seguridad:</b> la descarga de data queda bloqueada. Solo Gerencia/Administrador podrá autorizar exportaciones.</div>
            <div class="table-scroll">${renderClientTable(list)}</div>
            <div class="bottom-sheet">
                <div class="bottom-left">
                    <span class="bottom-label">Vista de datos</span>
                    <div class="page-group">
                        <button class="page-btn ${sheetMode.clientes === 'principal' ? 'active' : ''}" data-sheet="clientes|principal">
                            <span class="page-num">1</span>Principal
                        </button>
                        <button class="page-btn ${sheetMode.clientes === 'completa' ? 'active' : ''}" data-sheet="clientes|completa">
                            <span class="page-num">2</span>Completa
                        </button>
                    </div>
                </div>
                <div class="bottom-help">${sheetMode.clientes === 'principal' ? 'Datos comerciales clave para trabajar rápido.' : 'Todos los campos adicionales registrados en la ficha.'}</div>
            </div>
        </div>
    `;

    bindFilters('clientes', () => renderClientes());
}

// ============================================================
// RENDER TABLA CLIENTES
// ============================================================
function renderClientTable(list) {
    if (!list || !list.length) {
        return '<div style="padding:20px;text-align:center;color:#64748B;font-weight:800">No se encontraron clientes.</div>';
    }

    const rows = list.map((r, i) => {
        return `<tr>
            <td><b>${i + 1}</b></td>
            <td>${fecha(r.fecha_creacion || r.created_at)}</td>
            <td>${bAmbito(r.ambito || 'COMPARTIDO')}</td>
            <td><span class="code-pill">${clientCode(r)}</span></td>
            <td class="left"><b>${sd(r.razon_social || r.nombre)}</b></td>
            <td>${sd(r.numero_documento || r.ruc || r.numero)}</td>
            <td class="left">${sd(r.contacto || r.nombre_contacto)}</td>
            <td>${sd(r.telefono || r.telefono_contacto)}</td>
            <td class="left">${sd(r.email || r.email_contacto)}</td>
            <td>${sd(r.condicion_pago || r.condicion || 'Contado')}</td>
            <td>${bEstado(r.estado || 'Activo')}</td>
            <td>
                <div style="display:flex;gap:5px;justify-content:center">
                    <button class="action-btn action-view" data-view="clientes|${r.id}">Ver</button>
                    <button class="action-btn action-edit" data-edit="clientes|${r.id}">Editar</button>
                    <button class="action-btn action-delete" data-toggle="clientes|${r.id}">${r.estado === 'Inactivo' || r.estado === 'inactivo' ? 'Activar' : 'Inactivar'}</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    return `<table class="master-table">
        <thead>
            <tr>
                <th>Item</th>
                <th>Actualizado</th>
                <th>Ámbito</th>
                <th>Código</th>
                <th>Razón social</th>
                <th>RUC/DNI</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Condición</th>
                <th>Estado</th>
                <th style="min-width:200px;">Acciones</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
// RENDER PROVEEDORES
// ============================================================
async function renderProveedores() {
    await loadModuleData('proveedores');
    
    const list = filtered('proveedores');
    const count = st => DS.proveedores.filter(r => (r.estado || 'Activo') === st).length;

    document.getElementById('proveedores').innerHTML = `
        <div class="master-status-board">
            <div class="master-status-card"><div class="master-status-dot msd-active">A</div><div><small>Activos</small><b>${count('Activo')}</b></div></div>
            <div class="master-status-card"><div class="master-status-dot msd-observed">!</div><div><small>Observados</small><b>${count('Observado')}</b></div></div>
            <div class="master-status-card"><div class="master-status-dot msd-blocked">B</div><div><small>Bloqueados</small><b>${count('Bloqueado')}</b></div></div>
        </div>
        <div class="panel">
            <div class="clean-header">
                <div class="master-title-wrap">
                    <div class="master-title">Proveedores</div>
                    <div class="master-subtitle">Base de proveedores y servicios</div>
                </div>
                <div class="search-box">
                    <input type="text" id="search_proveedores" placeholder="Buscar...">
                </div>
                <div class="clean-actions">
                    <select id="ambito_proveedores">
                        <option value="VISIBLE">Empresa activa</option>
                        <option value="TODOS">Todos</option>
                        <option value="COMPARTIDO">Compartidos</option>
                        <option value="KCF">KCF</option>
                        <option value="AGD">AGD</option>
                    </select>
                    <select id="estado_proveedores">
                        <option value="TODOS">Estados</option>
                        <option value="Activo">Activos</option>
                        <option value="Observado">Observados</option>
                        <option value="Bloqueado">Bloqueados</option>
                        <option value="Inactivo">Inactivos</option>
                    </select>
                    <button class="btn btn-secondary" data-bulk="proveedores">Importar</button>
                    <button class="btn btn-primary btn-create" data-new="proveedores">+ Crear proveedor</button>
                </div>
            </div>
            <div class="security-note"><b>Seguridad:</b> descarga bloqueada. Solo Gerencia/Administrador puede autorizar exportaciones.</div>
            <div class="table-scroll">
                <table class="master-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Ámbito</th>
                            <th>Código</th>
                            <th>Razón social</th>
                            <th>RUC</th>
                            <th>Contacto</th>
                            <th>Teléfono</th>
                            <th>Condición</th>
                            <th>Estado</th>
                            <th style="min-width:200px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((r, i) => `
                            <tr>
                                <td><b>${i + 1}</b></td>
                                <td>${bAmbito(r.ambito || 'COMPARTIDO')}</td>
                                <td>${sd(r.codigo_proveedor || r.codigo)}</td>
                                <td class="left">${sd(r.razon_social || r.nombre)}</td>
                                <td>${sd(r.ruc || r.numero)}</td>
                                <td class="left">${sd(r.contacto)}</td>
                                <td>${sd(r.telefono)}</td>
                                <td>${sd(r.condicion_pago || r.condicion || 'Contado')}</td>
                                <td>${bEstado(r.estado || 'Activo')}</td>
                                <td>
                                    <div style="display:flex;gap:5px;justify-content:center">
                                        <button class="action-btn action-view" data-view="proveedores|${r.id}">Ver</button>
                                        <button class="action-btn action-edit" data-edit="proveedores|${r.id}">Editar</button>
                                        <button class="action-btn action-delete" data-toggle="proveedores|${r.id}">${r.estado === 'Inactivo' || r.estado === 'inactivo' ? 'Activar' : 'Inactivar'}</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bottom-sheet">
                <div class="bottom-left">
                    <span class="bottom-label">Vista de datos</span>
                    <div class="page-group">
                        <button class="page-btn ${sheetMode.proveedores === 'principal' ? 'active' : ''}" data-sheet="proveedores|principal"><span class="page-num">1</span>Principal</button>
                        <button class="page-btn ${sheetMode.proveedores === 'completa' ? 'active' : ''}" data-sheet="proveedores|completa"><span class="page-num">2</span>Completa</button>
                    </div>
                </div>
                <div class="bottom-help">${sheetMode.proveedores === 'principal' ? 'Datos clave para trabajar rápido.' : 'Datos completos registrados en la ficha.'}</div>
            </div>
        </div>
    `;

    bindFilters('proveedores', () => renderProveedores());
}

// ============================================================
// RENDER MAESTRO GENÉRICO (Almacenes, Categorías, Marcas, UM)
// ============================================================
async function renderMaestro(m) {
    await loadModuleData(m);
    
    const config = {
        almacenes: { title: 'Almacenes', subtitle: 'Gestión de almacenes y ubicaciones' },
        categorias: { title: 'Categorías', subtitle: 'Clasificación de productos' },
        marcas: { title: 'Marcas', subtitle: 'Gestión de marcas y fabricantes' },
        um: { title: 'Unidades de medida', subtitle: 'Gestión de unidades de medida' }
    };

    const cfg = config[m] || { title: m, subtitle: '' };
    const list = filtered(m);
    const count = st => DS[m].filter(r => (r.estado || 'Activo') === st).length;

    const columns = m === 'almacenes' ? ['Código', 'Nombre', 'Tipo', 'Responsable', 'Teléfono', 'Estado'] :
                    m === 'categorias' ? ['Código', 'Categoría', 'Subcategoría', 'Estado'] :
                    m === 'marcas' ? ['Código', 'Marca', 'Tipo', 'Estado'] :
                    ['Código', 'Símbolo', 'Nombre', 'Tipo', 'Decimal', 'Estado'];

    const fields = m === 'almacenes' ? ['codigo', 'nombre', 'tipo', 'responsable', 'telefono', 'estado'] :
                   m === 'categorias' ? ['codigo', 'nombre', 'tipo', 'estado'] :
                   m === 'marcas' ? ['codigo', 'nombre', 'tipo', 'estado'] :
                   ['codigo', 'simbolo', 'nombre', 'tipo', 'decimal', 'estado'];

    document.getElementById(m).innerHTML = `
        <div class="master-status-board">
            <div class="master-status-card"><div class="master-status-dot msd-active">A</div><div><small>Activos</small><b>${count('Activo')}</b></div></div>
            <div class="master-status-card"><div class="master-status-dot msd-observed">!</div><div><small>Observados</small><b>${count('Observado')}</b></div></div>
            <div class="master-status-card"><div class="master-status-dot msd-blocked">B</div><div><small>Bloqueados</small><b>${count('Bloqueado')}</b></div></div>
        </div>
        <div class="panel">
            <div class="clean-header">
                <div class="master-title-wrap">
                    <div class="master-title">${cfg.title}</div>
                    <div class="master-subtitle">${cfg.subtitle}</div>
                </div>
                <div class="search-box">
                    <input type="text" id="search_${m}" placeholder="Buscar...">
                </div>
                <div class="clean-actions">
                    <select id="ambito_${m}">
                        <option value="VISIBLE">Empresa activa</option>
                        <option value="TODOS">Todos</option>
                        <option value="COMPARTIDO">Compartidos</option>
                        <option value="KCF">KCF</option>
                        <option value="AGD">AGD</option>
                    </select>
                    <select id="estado_${m}">
                        <option value="TODOS">Estados</option>
                        <option value="Activo">Activos</option>
                        <option value="Observado">Observados</option>
                        <option value="Bloqueado">Bloqueados</option>
                        <option value="Inactivo">Inactivos</option>
                    </select>
                    <button class="btn btn-secondary" data-bulk="${m}">Importar</button>
                    <button class="btn btn-primary btn-create" data-new="${m}">+ Crear</button>
                </div>
            </div>
            <div class="security-note"><b>Seguridad:</b> descarga bloqueada. Solo Gerencia/Administrador puede autorizar exportaciones.</div>
            <div class="table-scroll">
                <table class="master-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            ${columns.map(c => `<th>${c}</th>`).join('')}
                            <th style="min-width:200px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((r, i) => `
                            <tr>
                                <td><b>${i + 1}</b></td>
                                ${fields.map(f => `<td>${f === 'estado' ? bEstado(r[f]) : sd(r[f])}</td>`).join('')}
                                <td>
                                    <div style="display:flex;gap:5px;justify-content:center">
                                        <button class="action-btn action-view" data-view="${m}|${r.id}">Ver</button>
                                        <button class="action-btn action-edit" data-edit="${m}|${r.id}">Editar</button>
                                        <button class="action-btn action-delete" data-toggle="${m}|${r.id}">${r.estado === 'Inactivo' || r.estado === 'inactivo' ? 'Activar' : 'Inactivar'}</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bottom-sheet">
                <div class="bottom-left">
                    <span class="bottom-label">Vista de datos</span>
                    <div class="page-group">
                        <button class="page-btn ${sheetMode[m] === 'principal' ? 'active' : ''}" data-sheet="${m}|principal"><span class="page-num">1</span>Principal</button>
                        <button class="page-btn ${sheetMode[m] === 'completa' ? 'active' : ''}" data-sheet="${m}|completa"><span class="page-num">2</span>Completa</button>
                    </div>
                </div>
                <div class="bottom-help">${sheetMode[m] === 'principal' ? 'Datos clave para trabajar rápido.' : 'Datos completos registrados en la ficha.'}</div>
            </div>
        </div>
    `;

    bindFilters(m, () => renderMaestro(m));
}

// ============================================================
// OPEN SCREEN
// ============================================================
async function openScreen(screen) {
    console.log('🔄 Abriendo pantalla:', screen);
    currentModule = screen;
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(screen)?.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.tab-btn[data-screen="${screen}"]`).forEach(t => t.classList.add('active'));

    // Renderizar según el módulo
    if (screen === 'clientes') {
        await renderClientes();
    } else if (screen === 'proveedores') {
        await renderProveedores();
    } else if (['almacenes', 'categorias', 'marcas', 'um'].includes(screen)) {
        await renderMaestro(screen);
    } else {
        const el = document.getElementById(screen);
        if (el) {
            el.innerHTML = `<div class="panel" style="padding:20px;text-align:center;color:#64748B;">
                <h3>${screen}</h3>
                <p>Módulo en construcción</p>
            </div>`;
        }
    }
}

// ============================================================
// TOGGLE ACTIVO / INACTIVO
// ============================================================
async function toggleRecord(m, id) {
    const r = DS[m]?.find(x => x.id === id);
    if (!r) return;
    
    const nuevoEstado = (r.estado === 'Inactivo' || r.estado === 'inactivo') ? 'Activo' : 'Inactivo';
    
    // Actualizar localmente
    r.estado = nuevoEstado;
    
    // Guardar en la BD
    const result = await saveData(m, { ...r, estado: nuevoEstado });
    
    if (result.success) {
        toast(`✅ Registro ${nuevoEstado.toLowerCase()}`);
        // Recargar la vista
        openScreen(currentModule);
    } else {
        toast(`❌ Error: ${result.error || 'No se pudo actualizar'}`);
        // Revertir cambio local
        r.estado = nuevoEstado === 'Activo' ? 'Inactivo' : 'Activo';
    }
}

// ============================================================
// EVENT DELEGATION
// ============================================================
document.addEventListener('click', function(e) {
    // Navegación de tabs
    const tabBtn = e.target.closest('.tab-btn[data-screen]');
    if (tabBtn) {
        openScreen(tabBtn.dataset.screen);
        return;
    }

    // Crear nuevo
    const newBtn = e.target.closest('[data-new]');
    if (newBtn) {
        const m = newBtn.dataset.new;
        alert(`Funcionalidad: Crear nuevo ${m} (próximamente)`);
        return;
    }

    // Cambiar vista (principal/completa)
    const sheetBtn = e.target.closest('[data-sheet]');
    if (sheetBtn) {
        const [m, mode] = sheetBtn.dataset.sheet.split('|');
        sheetMode[m] = mode;
        openScreen(m);
        return;
    }

    // Toggle (Activar/Inactivar)
    const togBtn = e.target.closest('[data-toggle]');
    if (togBtn) {
        const [m, id] = togBtn.dataset.toggle.split('|');
        toggleRecord(m, Number(id));
        return;
    }

    // Ver
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
        const [m, id] = viewBtn.dataset.view.split('|');
        const r = DS[m]?.find(x => x.id === Number(id));
        if (r) {
            alert(`📋 Detalle de ${m}\n\n` + JSON.stringify(r, null, 2));
        }
        return;
    }

    // Editar
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
        const [m, id] = editBtn.dataset.edit.split('|');
        alert(`✏️ Editar ${m} ID: ${id} (próximamente)`);
        return;
    }
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Maestros');
    initData();
    openScreen('clientes');
});

console.log('✅ Maestros JS cargado correctamente');