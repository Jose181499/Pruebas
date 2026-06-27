// ============================================================
// MÓDULO MAESTROS - ERP Multiempresa
// ============================================================

console.log('✅ Módulo Maestros cargado');

// ============================================================
// VARIABLES GLOBALES
// ============================================================
const MAESTROS = ['clientes', 'proveedores', 'almacenes', 'categorias', 'marcas', 'um'];
const DS = {};
const sheetMode = {};

// ============================================================
// DATOS DE EJEMPLO
// ============================================================
function initData() {
    MAESTROS.forEach(m => {
        DS[m] = [];
        sheetMode[m] = 'principal';
    });
    
    // Datos de ejemplo para clientes
    DS.clientes = [
        {
            id: 1,
            ambito: 'COMPARTIDO',
            tipoDoc: 'RUC',
            numero: '20100070970',
            nombre: 'KOMATSU-MITSUI MAQUINARIAS PERU S.A.',
            nombreComercial: 'KOMATSU-MITSUI',
            direccionFiscal: 'Av. Argentina 4453, Callao',
            contacto: 'Compras',
            telefono: '999 111 222',
            email: 'compras@cliente.com',
            condicion: 'Credito aprobado',
            diasCredito: '30',
            estado: 'Activo',
            obs: 'Cliente recurrente.',
            contactos: [{nombre: 'Compras', cargo: 'Jefe', telefono: '999 111 222', email: 'compras@cliente.com', principal: true}],
            puntos: [{punto: 'Principal', direccion: 'Av. Argentina 4453, Callao', principal: true}],
            creadoPor: 'Erika',
            creadoEn: '2026-06-24 09:00',
            actualizadoPor: 'Erika',
            actualizadoEn: '2026-06-24 09:00',
            uso: 8
        },
        {
            id: 2,
            ambito: 'KCF',
            tipoDoc: 'RUC',
            numero: '20600000000',
            nombre: 'CLIENTE INDUSTRIAL EJEMPLO S.A.C.',
            nombreComercial: 'CLIENTE INDUSTRIAL',
            direccionFiscal: 'Av. Javier Prado Oeste 1650',
            contacto: 'Operaciones',
            telefono: '988 222 333',
            email: 'operaciones@cliente.com',
            condicion: 'Contado',
            diasCredito: '0',
            estado: 'Activo',
            obs: '',
            contactos: [],
            puntos: [],
            creadoPor: 'Erika',
            creadoEn: '2026-06-24 09:10',
            actualizadoPor: 'Erika',
            actualizadoEn: '2026-06-24 09:10',
            uso: 2
        }
    ];
}

// ============================================================
// FUNCIONES DE UTILIDAD
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
    if (v === 'Activo') return '<span class="badge b-ok">Activo</span>';
    if (v === 'Observado') return '<span class="badge b-warn">Observado</span>';
    if (v === 'Bloqueado') return '<span class="badge b-block">Bloqueado</span>';
    return '<span class="badge b-gray">Inactivo</span>';
}

function bAmbito(v) {
    if (v === 'KCF') return '<span class="badge b-kcf">Solo KCF</span>';
    if (v === 'AGD') return '<span class="badge b-agd">Solo AGD</span>';
    return '<span class="badge b-shared">Compartido</span>';
}

function fecha(v) {
    if (!v) return '-';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}))?/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}${m[4] ? '<br>' + m[4] : ''}`;
    return esc(v);
}

function empresa() {
    return document.getElementById('empresaActiva')?.value || 'KCF';
}

function visible(r) {
    const e = empresa();
    return r.ambito === 'COMPARTIDO' || r.ambito === e || !r.ambito;
}

function primaryContact(r) {
    return (r.contactos?.length ? r.contactos.find(c => c.principal) || r.contactos[0] : null) || {
        nombre: r.contacto || '',
        telefono: r.telefono || '',
        email: r.email || ''
    };
}

function clientCode(r) {
    return r.codigoCliente || `CLI-${String(r.id || 0).padStart(6, '0')}`;
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

// ============================================================
// RENDER CLIENTES
// ============================================================
function renderClientes() {
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
                    <input type="text" id="search_clientes" placeholder="Buscar por codigo, razon social, RUC, contacto...">
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
            <div class="security-note"><b>Seguridad:</b> la descarga de data queda bloqueada. Solo Gerencia/Administrador podra autorizar exportaciones.</div>
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
                <div class="bottom-help">${sheetMode.clientes === 'principal' ? 'Datos comerciales clave para trabajar rapido.' : 'Todos los campos adicionales registrados en la ficha.'}</div>
            </div>
        </div>
    `;

    bindFilters('clientes', renderClientes);
}

// ============================================================
// RENDER TABLA CLIENTES
// ============================================================
function renderClientTable(list) {
    if (!list.length) return '<div style="padding:20px;text-align:center;color:#64748B;font-weight:800">No se encontraron clientes.</div>';

    const rows = list.map((r, i) => {
        const c = primaryContact(r);
        return `<tr class="${r.estado === 'Inactivo' ? 'disabled' : ''}">
            <td><b>${i + 1}</b></td>
            <td>${fecha(r.actualizadoEn || r.creadoEn)}</td>
            <td>${bAmbito(r.ambito)}</td>
            <td><span class="code-pill">${clientCode(r)}</span></td>
            <td class="left"><b>${sd(r.nombre || r.nombreComercial)}</b></td>
            <td>${r.numero ? sd(r.numero) : '<span class="badge b-gray">Pendiente</span>'}</td>
            <td class="left">${sd(c.nombre || r.contacto)}</td>
            <td>${sd(c.telefono || r.telefono)}</td>
            <td class="left">${sd(c.email || r.email)}</td>
            <td>${sd(r.condicion || 'Contado')}</td>
            <td>${bEstado(r.estado || 'Activo')}</td>
            <td>
                <div style="display:flex;gap:5px;justify-content:center">
                    <button class="action-btn action-view" data-view="clientes|${r.id}">Ver</button>
                    <button class="action-btn action-edit" data-edit="clientes|${r.id}">Editar</button>
                    <button class="action-btn action-delete" data-toggle="clientes|${r.id}">${r.estado === 'Inactivo' ? 'Activar' : 'Inactivar'}</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    return `<table class="master-table">
        <thead>
            <tr>
                <th>Item</th>
                <th>Actualizado</th>
                <th>Ambito</th>
                <th>Codigo</th>
                <th>Razon social</th>
                <th>RUC/DNI</th>
                <th>Contacto</th>
                <th>Telefono</th>
                <th>Correo</th>
                <th>Condicion</th>
                <th>Estado</th>
                <th style="min-width:200px;">Acciones</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
// BIND FILTERS
// ============================================================
function bindFilters(m, cb) {
    ['search_', 'estado_', 'ambito_'].forEach(p => {
        const el = document.getElementById(p + m);
        if (el) {
            el.addEventListener(p === 'search_' ? 'input' : 'change', cb);
        }
    });
}

// ============================================================
// RENDER GENERICO
// ============================================================
function renderMaestro(m) {
    const config = {
        clientes: { title: 'Clientes', subtitle: 'Base comercial de clientes y prospectos' },
        proveedores: { title: 'Proveedores', subtitle: 'Base de proveedores y servicios' },
        almacenes: { title: 'Almacenes', subtitle: 'Gestion de almacenes y ubicaciones' },
        categorias: { title: 'Categorias', subtitle: 'Clasificacion de productos' },
        marcas: { title: 'Marcas', subtitle: 'Gestion de marcas y fabricantes' },
        um: { title: 'Unidades de medida', subtitle: 'Gestion de unidades de medida' }
    };

    const cfg = config[m] || { title: m, subtitle: '' };
    const list = filtered(m);
    const count = st => DS[m].filter(r => (r.estado || 'Activo') === st).length;

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
                            <th>Ambito</th>
                            <th>Codigo</th>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Uso</th>
                            <th style="min-width:200px;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((r, i) => `
                            <tr class="${r.estado === 'Inactivo' ? 'disabled' : ''}">
                                <td><b>${i + 1}</b></td>
                                <td>${bAmbito(r.ambito || r.empresa)}</td>
                                <td>${sd(r.codigo || r.numero)}</td>
                                <td class="left">${sd(r.nombre)}</td>
                                <td>${bEstado(r.estado || 'Activo')}</td>
                                <td>${r.uso > 0 ? `<span class="badge b-warn">${r.uso}</span>` : '<span class="badge b-ok">0</span>'}</td>
                                <td>
                                    <div style="display:flex;gap:5px;justify-content:center">
                                        <button class="action-btn action-view" data-view="${m}|${r.id}">Ver</button>
                                        <button class="action-btn action-edit" data-edit="${m}|${r.id}">Editar</button>
                                        <button class="action-btn action-delete" data-toggle="${m}|${r.id}">${r.estado === 'Inactivo' ? 'Activar' : 'Inactivar'}</button>
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
                <div class="bottom-help">${sheetMode[m] === 'principal' ? 'Datos clave para trabajar rapido.' : 'Datos completos registrados en la ficha.'}</div>
            </div>
        </div>
    `;

    bindFilters(m, () => renderMaestro(m));
}

// ============================================================
// OPEN SCREEN
// ============================================================
function openScreen(screen) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(screen)?.classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.tab-btn[data-screen="${screen}"]`).forEach(t => t.classList.add('active'));

    if (screen === 'clientes') renderClientes();
    else renderMaestro(screen);
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
        alert(`Funcionalidad: Crear nuevo ${m}`);
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
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Módulo Maestros');
    initData();
    openScreen('clientes');
});