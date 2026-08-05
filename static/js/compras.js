// ============================================================
// COMPRAS - Módulo Principal
// ============================================================

// ============================================================
// DATOS DE EJEMPLO
// ============================================================

// Solicitudes de compra
let solicitudesData = [
    {
        id: 1,
        numero: 'SOL-20260713-0001',
        fecha: '2026-07-13',
        estado: 'Pendiente',
        producto: 'Laptop HP ProBook 450 G10',
        cantidad: 5,
        unidad: 'UND',
        area: 'Ventas',
        solicitante: 'Carlos Pérez',
        urgencia: 'Alta',
        justificacion: 'Equipamiento para nuevo personal de ventas'
    },
    {
        id: 2,
        numero: 'SOL-20260713-0002',
        fecha: '2026-07-14',
        estado: 'Aprobada',
        producto: 'Toner HP 110A negro',
        cantidad: 20,
        unidad: 'UND',
        area: 'Administración',
        solicitante: 'María López',
        urgencia: 'Media',
        justificacion: 'Reposición de insumos de impresión'
    }
];

// Comparativos de proveedores
let comparativosData = [
    {
        id: 1,
        numero: 'CMP-20260713-0001',
        fecha: '2026-07-15',
        estado: 'En evaluación',
        producto: 'Laptop HP ProBook 450 G10',
        proveedores: [
            { nombre: 'TecnoStore S.A.C.', ruc: '20512345678', precio: 2500, plazo: '5 días', condPago: 'Contado' },
            { nombre: 'Digital Solutions EIRL', ruc: '20698765432', precio: 2450, plazo: '7 días', condPago: 'Crédito 15 días' },
            { nombre: 'CompuMarket S.A.', ruc: '20456789123', precio: 2550, plazo: '3 días', condPago: 'Contado' }
        ]
    }
];

// Órdenes de compra
let ordenesData = [
    {
        id: 1,
        numero: 'OC-20260713-0001',
        fecha: '2026-07-16',
        estado: 'Emitida',
        proveedor: 'TecnoStore S.A.C.',
        ruc: '20512345678',
        condPago: 'Contado',
        moneda: 'Soles (S/)',
        items: [
            { producto: 'Laptop HP ProBook 450 G10', cantidad: 5, precioUnitario: 2500, total: 12500 }
        ],
        subtotal: 12500,
        igv: 2250,
        total: 14750
    }
];

// Comprobantes de proveedor
let comprobantesProveedorData = [
    {
        id: 1,
        tipo: 'Factura',
        numero: 'F001-00000001',
        fecha: '2026-07-17',
        monto: 14750,
        ruc: '20512345678',
        proveedor: 'TecnoStore S.A.C.',
        orden: 'OC-20260713-0001',
        estado: 'Pendiente',
        obs: ''
    }
];

// Recepciones de mercadería
let recepcionesData = [
    {
        id: 1,
        numero: 'REC-20260713-0001',
        fecha: '2026-07-18',
        estado: 'Pendiente',
        orden: 'OC-20260713-0001',
        proveedor: 'TecnoStore S.A.C.',
        producto: 'Laptop HP ProBook 450 G10',
        cantidad: 5,
        unidad: 'UND',
        estadoMercaderia: 'Buen estado',
        obs: ''
    }
];

// ============================================================
// FUNCIONES DE RENDERIZADO
// ============================================================

function renderSolicitudes() {
    const tbody = document.getElementById('solicitudRows');
    if (!tbody) return;
    
    const search = document.getElementById('solicitudSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('solicitudStatus')?.value || '';
    
    let filtered = solicitudesData.filter(s => {
        const matchSearch = s.numero.toLowerCase().includes(search) ||
                           s.producto.toLowerCase().includes(search) ||
                           s.solicitante.toLowerCase().includes(search);
        const matchStatus = statusFilter === '' || s.estado === statusFilter;
        return matchSearch && matchStatus;
    });
    
    // Actualizar contador
    const countEl = document.getElementById('solicitudCount');
    if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${solicitudesData.length} solicitudes`;
    
    // Actualizar KPIs
    renderSolicitudKPI();
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94A3B8;">No hay solicitudes</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map((s, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="date-cell">${s.fecha}</td>
            <td><span class="badge ${getEstadoClass(s.estado)}">${s.estado}</span></td>
            <td><span class="code-pill">${s.numero}</span></td>
            <td class="left">${s.producto}</td>
            <td>${s.cantidad} ${s.unidad}</td>
            <td>${s.area} / ${s.solicitante}</td>
            <td><span class="badge ${s.urgencia === 'Alta' || s.urgencia === 'Urgente' ? 'b-pending' : 'b-ok'}">${s.urgencia}</span></td>
            <td>
                <button class="kebab" onclick="toggleMenu(event, 'solicitud-${s.id}')">⋯</button>
                <div class="menu-pop" id="menu-solicitud-${s.id}" style="display:none;">
                    <button onclick="editSolicitud(${s.id})">✏️ Editar</button>
                    <button class="menu-approve" onclick="approveSolicitud(${s.id})">✅ Aprobar</button>
                    <button onclick="createOrdenFromSolicitud(${s.id})">📄 Crear orden</button>
                    <div class="menu-divider"></div>
                    <button class="danger" onclick="deleteSolicitud(${s.id})">🗑 Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderComparativos() {
    const tbody = document.getElementById('comparativoRows');
    if (!tbody) return;
    
    const search = document.getElementById('comparativoSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('comparativoStatus')?.value || '';
    
    let filtered = comparativosData.filter(c => {
        const matchSearch = c.numero.toLowerCase().includes(search) ||
                           c.producto.toLowerCase().includes(search) ||
                           c.proveedores.some(p => p.nombre.toLowerCase().includes(search));
        const matchStatus = statusFilter === '' || c.estado === statusFilter;
        return matchSearch && matchStatus;
    });
    
    // Actualizar contador
    const countEl = document.getElementById('comparativoCount');
    if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${comparativosData.length} comparativos`;
    
    // Actualizar KPIs
    renderComparativoKPI();
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94A3B8;">No hay comparativos</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map((c, index) => {
        const mejorPrecio = c.proveedores.reduce((min, p) => p.precio < min.precio ? p : min);
        return `
        <tr>
            <td>${index + 1}</td>
            <td class="date-cell">${c.fecha}</td>
            <td><span class="badge ${getEstadoClass(c.estado)}">${c.estado}</span></td>
            <td><span class="code-pill">${c.numero}</span></td>
            <td class="left">${c.producto}</td>
            <td class="left">${mejorPrecio.nombre}</td>
            <td><b>S/${mejorPrecio.precio.toFixed(2)}</b></td>
            <td>${mejorPrecio.plazo}</td>
            <td>
                <button class="kebab" onclick="toggleMenu(event, 'comparativo-${c.id}')">⋯</button>
                <div class="menu-pop" id="menu-comparativo-${c.id}" style="display:none;">
                    <button onclick="editComparativo(${c.id})">✏️ Editar</button>
                    <button onclick="selectProveedor(${c.id})">✅ Seleccionar proveedor</button>
                    <div class="menu-divider"></div>
                    <button class="danger" onclick="deleteComparativo(${c.id})">🗑 Eliminar</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function renderOrdenes() {
    const tbody = document.getElementById('ordenRows');
    if (!tbody) return;
    
    const search = document.getElementById('ordenSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('ordenStatus')?.value || '';
    
    let filtered = ordenesData.filter(o => {
        const matchSearch = o.numero.toLowerCase().includes(search) ||
                           o.proveedor.toLowerCase().includes(search) ||
                           o.ruc.includes(search);
        const matchStatus = statusFilter === '' || o.estado === statusFilter;
        return matchSearch && matchStatus;
    });
    
    // Actualizar contador
    const countEl = document.getElementById('ordenCount');
    if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${ordenesData.length} órdenes`;
    
    // Actualizar KPIs
    renderOrdenKPI();
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;color:#94A3B8;">No hay órdenes de compra</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map((o, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="date-cell">${o.fecha}</td>
            <td><span class="badge ${getEstadoClass(o.estado)}">${o.estado}</span></td>
            <td><span class="code-pill">${o.numero}</span></td>
            <td class="left">${o.proveedor}</td>
            <td>${o.ruc}</td>
            <td class="left">${o.items.map(i => i.producto).join(', ')}</td>
            <td><b>${o.moneda} ${o.total.toFixed(2)}</b></td>
            <td>${o.condPago}</td>
            <td>
                <button class="kebab" onclick="toggleMenu(event, 'orden-${o.id}')">⋯</button>
                <div class="menu-pop" id="menu-orden-${o.id}" style="display:none;">
                    <button onclick="editOrden(${o.id})">✏️ Editar</button>
                    <button class="menu-order" onclick="sendOrden(${o.id})">📤 Enviar a proveedor</button>
                    <button class="menu-receive" onclick="createRecepcionFromOrden(${o.id})">📦 Recibir mercadería</button>
                    <div class="menu-divider"></div>
                    <button class="danger" onclick="deleteOrden(${o.id})">🗑 Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderComprobantesProveedor() {
    const tbody = document.getElementById('compProvRows');
    if (!tbody) return;
    
    const search = document.getElementById('compProvSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('compProvStatus')?.value || '';
    
    let filtered = comprobantesProveedorData.filter(c => {
        const matchSearch = c.numero.toLowerCase().includes(search) ||
                           c.proveedor.toLowerCase().includes(search) ||
                           c.ruc.includes(search);
        const matchStatus = statusFilter === '' || c.estado === statusFilter;
        return matchSearch && matchStatus;
    });
    
    // Actualizar contador
    const countEl = document.getElementById('compProvCount');
    if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${comprobantesProveedorData.length} comprobantes`;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94A3B8;">No hay comprobantes de proveedor</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map((c, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="date-cell">${c.fecha}</td>
            <td><span class="badge ${getEstadoClass(c.estado)}">${c.estado}</span></td>
            <td>${c.tipo}</td>
            <td><span class="code-pill">${c.numero}</span></td>
            <td>${c.ruc}</td>
            <td class="left">${c.proveedor}</td>
            <td><b>S/${c.monto.toFixed(2)}</b></td>
            <td>
                <button class="kebab" onclick="toggleMenu(event, 'comp-prov-${c.id}')">⋯</button>
                <div class="menu-pop" id="menu-comp-prov-${c.id}" style="display:none;">
                    <button onclick="editComprobanteProveedor(${c.id})">✏️ Editar</button>
                    <button onclick="payComprobanteProveedor(${c.id})">💰 Marcar pagado</button>
                    <div class="menu-divider"></div>
                    <button class="danger" onclick="deleteComprobanteProveedor(${c.id})">🗑 Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRecepciones() {
    const tbody = document.getElementById('recepcionRows');
    if (!tbody) return;
    
    const search = document.getElementById('recepcionSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('recepcionStatus')?.value || '';
    
    let filtered = recepcionesData.filter(r => {
        const matchSearch = r.numero.toLowerCase().includes(search) ||
                           r.proveedor.toLowerCase().includes(search) ||
                           r.producto.toLowerCase().includes(search);
        const matchStatus = statusFilter === '' || r.estado === statusFilter;
        return matchSearch && matchStatus;
    });
    
    // Actualizar contador
    const countEl = document.getElementById('recepcionCount');
    if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${recepcionesData.length} recepciones`;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#94A3B8;">No hay recepciones</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map((r, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="date-cell">${r.fecha}</td>
            <td><span class="badge ${getEstadoClass(r.estado)}">${r.estado}</span></td>
            <td><span class="code-pill">${r.numero}</span></td>
            <td><span class="code-pill">${r.orden}</span></td>
            <td class="left">${r.proveedor}</td>
            <td class="left">${r.producto}</td>
            <td>${r.cantidad} ${r.unidad}</td>
            <td>
                <button class="kebab" onclick="toggleMenu(event, 'recepcion-${r.id}')">⋯</button>
                <div class="menu-pop" id="menu-recepcion-${r.id}" style="display:none;">
                    <button onclick="editRecepcion(${r.id})">✏️ Editar</button>
                    <button class="menu-approve" onclick="approveRecepcion(${r.id})">✅ Aprobar recepción</button>
                    <button onclick="storeRecepcion(${r.id})">📦 Almacenar</button>
                    <div class="menu-divider"></div>
                    <button class="danger" onclick="deleteRecepcion(${r.id})">🗑 Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// FUNCIONES DE KPI
// ============================================================

function renderSolicitudKPI() {
    const container = document.getElementById('solicitudKPI');
    if (!container) return;
    
    const total = solicitudesData.length;
    const pendientes = solicitudesData.filter(s => s.estado === 'Pendiente').length;
    const aprobadas = solicitudesData.filter(s => s.estado === 'Aprobada').length;
    const rechazadas = solicitudesData.filter(s => s.estado === 'Rechazada').length;
    const ordenadas = solicitudesData.filter(s => s.estado === 'Ordenada').length;
    
    container.innerHTML = `
        <div class="status-card">
            <div class="status-dot dot-total">${total}</div>
            <div><small>Total</small><b>${total}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-pending">${pendientes}</div>
            <div><small>Pendientes</small><b>${pendientes}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-approved">${aprobadas}</div>
            <div><small>Aprobadas</small><b>${aprobadas}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot" style="background:#F59E0B;color:#fff;">${rechazadas}</div>
            <div><small>Rechazadas</small><b>${rechazadas}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-ordered">${ordenadas}</div>
            <div><small>Ordenadas</small><b>${ordenadas}</b></div>
        </div>
    `;
}

function renderComparativoKPI() {
    const container = document.getElementById('comparativoKPI');
    if (!container) return;
    
    const total = comparativosData.length;
    const evaluacion = comparativosData.filter(c => c.estado === 'En evaluación').length;
    const seleccionados = comparativosData.filter(c => c.estado === 'Seleccionado').length;
    const rechazados = comparativosData.filter(c => c.estado === 'Rechazado').length;
    
    container.innerHTML = `
        <div class="status-card">
            <div class="status-dot dot-total">${total}</div>
            <div><small>Total</small><b>${total}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-pending">${evaluacion}</div>
            <div><small>En evaluación</small><b>${evaluacion}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-approved">${seleccionados}</div>
            <div><small>Seleccionados</small><b>${seleccionados}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot" style="background:#F59E0B;color:#fff;">${rechazados}</div>
            <div><small>Rechazados</small><b>${rechazados}</b></div>
        </div>
    `;
}

function renderOrdenKPI() {
    const container = document.getElementById('ordenKPI');
    if (!container) return;
    
    const total = ordenesData.length;
    const emitidas = ordenesData.filter(o => o.estado === 'Emitida').length;
    const enviadas = ordenesData.filter(o => o.estado === 'Enviada').length;
    const confirmadas = ordenesData.filter(o => o.estado === 'Confirmada').length;
    const anuladas = ordenesData.filter(o => o.estado === 'Anulada').length;
    
    container.innerHTML = `
        <div class="status-card">
            <div class="status-dot dot-total">${total}</div>
            <div><small>Total</small><b>${total}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot" style="background:#3B82F6;color:#fff;">${emitidas}</div>
            <div><small>Emitidas</small><b>${emitidas}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot" style="background:#8B5CF6;color:#fff;">${enviadas}</div>
            <div><small>Enviadas</small><b>${enviadas}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot dot-approved">${confirmadas}</div>
            <div><small>Confirmadas</small><b>${confirmadas}</b></div>
        </div>
        <div class="status-card">
            <div class="status-dot" style="background:#EF4444;color:#fff;">${anuladas}</div>
            <div><small>Anuladas</small><b>${anuladas}</b></div>
        </div>
    `;
}

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

function getEstadoClass(estado) {
    const map = {
        'Borrador': 'b-draft',
        'Pendiente': 'b-pending',
        'Aprobada': 'b-approved',
        'Aceptada': 'b-approved',
        'Ordenada': 'b-ordered',
        'Rechazada': 'b-canceled',
        'En evaluación': 'b-pending',
        'Seleccionado': 'b-approved',
        'Emitida': 'b-ok',
        'Enviada': 'b-sent',
        'Confirmada': 'b-approved',
        'Anulada': 'b-canceled',
        'Registrado': 'b-ok',
        'Pagado': 'b-approved',
        'En inspección': 'b-pending',
        'Almacenada': 'b-ok'
    };
    return map[estado] || 'b-gray';
}

function toggleMenu(event, menuId) {
    event.stopPropagation();
    document.querySelectorAll('.menu-pop').forEach(el => el.style.display = 'none');
    const menu = document.getElementById(`menu-${menuId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        menu.style.left = `${event.clientX - 180}px`;
        menu.style.top = `${event.clientY - 10}px`;
    }
}

document.addEventListener('click', function() {
    document.querySelectorAll('.menu-pop').forEach(el => el.style.display = 'none');
});

// ============================================================
// FUNCIONES DE ACCIONES
// ============================================================

function approveSolicitud(id) {
    const solicitud = solicitudesData.find(s => s.id === id);
    if (solicitud) {
        solicitud.estado = 'Aprobada';
        renderSolicitudes();
        showToast(`✅ Solicitud ${solicitud.numero} aprobada`, 'success');
    }
}

function deleteSolicitud(id) {
    if (confirm('¿Eliminar esta solicitud?')) {
        solicitudesData = solicitudesData.filter(s => s.id !== id);
        renderSolicitudes();
        showToast('🗑 Solicitud eliminada', 'info');
    }
}

function createOrdenFromSolicitud(id) {
    const solicitud = solicitudesData.find(s => s.id === id);
    if (solicitud) {
        const nuevaOrden = {
            id: ordenesData.length + 1,
            numero: `OC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(ordenesData.length + 1).padStart(4,'0')}`,
            fecha: new Date().toISOString().slice(0,10),
            estado: 'Borrador',
            proveedor: 'Por definir',
            ruc: 'Por definir',
            condPago: 'Contado',
            moneda: 'Soles (S/)',
            items: [{ producto: solicitud.producto, cantidad: solicitud.cantidad, precioUnitario: 0, total: 0 }],
            subtotal: 0,
            igv: 0,
            total: 0
        };
        ordenesData.push(nuevaOrden);
        renderOrdenes();
        showToast(`📄 Orden de compra creada desde solicitud ${solicitud.numero}`, 'success');
        // Cambiar a tab de órdenes
        switchTab('orden_compra');
    }
}

function deleteOrden(id) {
    if (confirm('¿Eliminar esta orden de compra?')) {
        ordenesData = ordenesData.filter(o => o.id !== id);
        renderOrdenes();
        showToast('🗑 Orden eliminada', 'info');
    }
}

function sendOrden(id) {
    const orden = ordenesData.find(o => o.id === id);
    if (orden) {
        orden.estado = 'Enviada';
        renderOrdenes();
        showToast(`📤 Orden ${orden.numero} enviada al proveedor`, 'success');
    }
}

function createRecepcionFromOrden(id) {
    const orden = ordenesData.find(o => o.id === id);
    if (orden) {
        const nuevaRecepcion = {
            id: recepcionesData.length + 1,
            numero: `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(recepcionesData.length + 1).padStart(4,'0')}`,
            fecha: new Date().toISOString().slice(0,10),
            estado: 'Pendiente',
            orden: orden.numero,
            proveedor: orden.proveedor,
            producto: orden.items.map(i => i.producto).join(', '),
            cantidad: orden.items.reduce((sum, i) => sum + i.cantidad, 0),
            unidad: 'UND',
            estadoMercaderia: 'Buen estado',
            obs: ''
        };
        recepcionesData.push(nuevaRecepcion);
        renderRecepciones();
        showToast(`📦 Recepción creada desde orden ${orden.numero}`, 'success');
        // Cambiar a tab de recepciones
        switchTab('recepcion');
    }
}

function approveRecepcion(id) {
    const recepcion = recepcionesData.find(r => r.id === id);
    if (recepcion) {
        recepcion.estado = 'Aprobada';
        renderRecepciones();
        showToast(`✅ Recepción ${recepcion.numero} aprobada`, 'success');
    }
}

function deleteRecepcion(id) {
    if (confirm('¿Eliminar esta recepción?')) {
        recepcionesData = recepcionesData.filter(r => r.id !== id);
        renderRecepciones();
        showToast('🗑 Recepción eliminada', 'info');
    }
}

// ============================================================
// FUNCIONES DE MODALES
// ============================================================

function openSolicitudModal() {
    document.getElementById('solicitudModal').classList.add('show');
    document.getElementById('solFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('solNumero').value = `SOL-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(solicitudesData.length + 1).padStart(4,'0')}`;
}

function saveSolicitud(estado) {
    const data = {
        id: solicitudesData.length + 1,
        numero: document.getElementById('solNumero').value,
        fecha: document.getElementById('solFecha').value,
        estado: estado,
        producto: document.getElementById('solProducto').value,
        cantidad: parseInt(document.getElementById('solCantidad').value) || 1,
        unidad: document.getElementById('solUnidad').value,
        area: document.getElementById('solArea').value,
        solicitante: document.getElementById('solSolicitante').value,
        urgencia: document.getElementById('solUrgencia').value,
        justificacion: document.getElementById('solJustificacion').value
    };
    
    solicitudesData.push(data);
    closeModal('solicitudModal');
    renderSolicitudes();
    showToast(`✅ Solicitud ${data.numero} guardada como "${estado}"`, 'success');
}

// ============================================================
// FUNCIONES DE EXPORTACIÓN
// ============================================================

function exportData(tipo) {
    let data = [];
    let filename = '';
    
    switch(tipo) {
        case 'solicitud_compra':
            data = solicitudesData;
            filename = `solicitudes_compra_${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'comparativo':
            data = comparativosData;
            filename = `comparativos_${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'orden_compra':
            data = ordenesData;
            filename = `ordenes_compra_${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'comprobante_proveedor':
            data = comprobantesProveedorData;
            filename = `comprobantes_proveedor_${new Date().toISOString().slice(0,10)}.json`;
            break;
        case 'recepcion':
            data = recepcionesData;
            filename = `recepciones_${new Date().toISOString().slice(0,10)}.json`;
            break;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast('📥 Datos exportados correctamente', 'success');
}

// ============================================================
// FUNCIONES DE MODALES DE COMPARATIVO
// ============================================================

function openComparativoModal() {
    document.getElementById('comparativoModal').classList.add('show');
    document.getElementById('compFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('compNumero').value = `CMP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(comparativosData.length + 1).padStart(4,'0')}`;
}

function addComparativoRow() {
    const tbody = document.getElementById('comparativoItemsBody');
    const count = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${count}</td>
        <td><input style="width:100%;border:none;background:transparent;padding:4px;" placeholder="Nombre proveedor"></td>
        <td><input style="width:100%;border:none;background:transparent;padding:4px;" placeholder="RUC"></td>
        <td><input type="number" step="0.01" style="width:100%;border:none;background:transparent;padding:4px;text-align:right;" placeholder="0.00"></td>
        <td><input style="width:100%;border:none;background:transparent;padding:4px;" placeholder="días"></td>
        <td><input style="width:100%;border:none;background:transparent;padding:4px;" placeholder="Contado/Crédito"></td>
        <td><button onclick="this.closest('tr').remove();" style="background:transparent;border:none;color:#DC2626;cursor:pointer;font-size:16px;">✕</button></td>
    `;
    tbody.appendChild(tr);
}

function saveComparativo(estado) {
    const proveedores = [];
    document.querySelectorAll('#comparativoItemsBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 4) {
            proveedores.push({
                nombre: inputs[0].value || 'Sin nombre',
                ruc: inputs[1].value || 'Sin RUC',
                precio: parseFloat(inputs[2].value) || 0,
                plazo: inputs[3].value || 'N/A',
                condPago: inputs[4]?.value || 'Contado'
            });
        }
    });
    
    const data = {
        id: comparativosData.length + 1,
        numero: document.getElementById('compNumero').value,
        fecha: document.getElementById('compFecha').value,
        estado: estado,
        producto: document.getElementById('compProducto').value,
        proveedores: proveedores
    };
    
    comparativosData.push(data);
    closeModal('comparativoModal');
    renderComparativos();
    showToast(`✅ Comparativo ${data.numero} guardado como "${estado}"`, 'success');
}

// ============================================================
// FUNCIONES DE MODALES DE ORDEN DE COMPRA
// ============================================================

function openOrdenCompraModal() {
    document.getElementById('ordenCompraModal').classList.add('show');
    document.getElementById('ordFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('ordNumero').value = `OC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(ordenesData.length + 1).padStart(4,'0')}`;
}

function addOrdenItemRow() {
    const tbody = document.getElementById('ordenItemsBody');
    const count = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${count}</td>
        <td><input style="width:100%;border:none;background:transparent;padding:4px;" placeholder="Descripción del producto"></td>
        <td><input type="number" style="width:70px;border:none;background:transparent;padding:4px;text-align:center;" value="1" onchange="calcularTotalOrden(this)"></td>
        <td><input type="number" step="0.01" style="width:100px;border:none;background:transparent;padding:4px;text-align:right;" value="0" onchange="calcularTotalOrden(this)"></td>
        <td style="font-weight:900;">S/ 0.00</td>
        <td><button onclick="this.closest('tr').remove();calcularTotalOrdenGeneral();" style="background:transparent;border:none;color:#DC2626;cursor:pointer;font-size:16px;">✕</button></td>
    `;
    tbody.appendChild(tr);
}

function calcularTotalOrden(input) {
    const row = input.closest('tr');
    const cantidad = parseFloat(row.querySelectorAll('input')[0]?.value) || 0;
    const precio = parseFloat(row.querySelectorAll('input')[1]?.value) || 0;
    const total = cantidad * precio;
    row.querySelectorAll('td')[4].textContent = `S/ ${total.toFixed(2)}`;
    calcularTotalOrdenGeneral();
}

function calcularTotalOrdenGeneral() {
    let subtotal = 0;
    document.querySelectorAll('#ordenItemsBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const cantidad = parseFloat(inputs[0].value) || 0;
            const precio = parseFloat(inputs[1].value) || 0;
            subtotal += cantidad * precio;
        }
    });
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    document.getElementById('ordSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('ordIgv').textContent = igv.toFixed(2);
    document.getElementById('ordTotal').textContent = total.toFixed(2);
}

function saveOrdenCompra(estado) {
    const items = [];
    document.querySelectorAll('#ordenItemsBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const producto = inputs[0].value || 'Sin producto';
            const cantidad = parseFloat(inputs[1].value) || 0;
            const precioUnitario = parseFloat(inputs[2].value) || 0;
            items.push({ producto, cantidad, precioUnitario, total: cantidad * precioUnitario });
        }
    });
    
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    const data = {
        id: ordenesData.length + 1,
        numero: document.getElementById('ordNumero').value,
        fecha: document.getElementById('ordFecha').value,
        estado: estado,
        proveedor: document.getElementById('ordProveedor').value,
        ruc: document.getElementById('ordRuc').value,
        condPago: document.getElementById('ordCondPago').value,
        moneda: document.getElementById('ordMoneda').value,
        items: items,
        subtotal: subtotal,
        igv: igv,
        total: total
    };
    
    ordenesData.push(data);
    closeModal('ordenCompraModal');
    renderOrdenes();
    showToast(`✅ Orden ${data.numero} guardada como "${estado}"`, 'success');
}

// ============================================================
// FUNCIONES DE MODALES DE COMPROBANTE PROVEEDOR
// ============================================================

function openComprobanteProveedorModal() {
    document.getElementById('comprobanteProveedorModal').classList.add('show');
    document.getElementById('cpFecha').value = new Date().toISOString().slice(0,10);
}

function saveComprobanteProveedor(estado) {
    const data = {
        id: comprobantesProveedorData.length + 1,
        tipo: document.getElementById('cpTipo').value,
        numero: document.getElementById('cpNumero').value,
        fecha: document.getElementById('cpFecha').value,
        monto: parseFloat(document.getElementById('cpMonto').value) || 0,
        ruc: document.getElementById('cpRuc').value,
        proveedor: document.getElementById('cpProveedor').value,
        orden: document.getElementById('cpOrden').value,
        estado: estado,
        obs: document.getElementById('cpObs').value
    };
    
    comprobantesProveedorData.push(data);
    closeModal('comprobanteProveedorModal');
    renderComprobantesProveedor();
    showToast(`✅ Comprobante ${data.numero} guardado como "${estado}"`, 'success');
}

// ============================================================
// FUNCIONES DE MODALES DE RECEPCIÓN
// ============================================================

function openRecepcionModal() {
    document.getElementById('recepcionModal').classList.add('show');
    document.getElementById('recFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('recNumero').value = `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(recepcionesData.length + 1).padStart(4,'0')}`;
}

function saveRecepcion(estado) {
    const data = {
        id: recepcionesData.length + 1,
        numero: document.getElementById('recNumero').value,
        fecha: document.getElementById('recFecha').value,
        estado: estado,
        orden: document.getElementById('recOrden').value,
        proveedor: document.getElementById('recProveedor').value,
        producto: document.getElementById('recProducto').value,
        cantidad: parseInt(document.getElementById('recCantidad').value) || 1,
        unidad: document.getElementById('recUnidad').value,
        estadoMercaderia: document.getElementById('recEstadoMercaderia').value,
        obs: document.getElementById('recObs').value
    };
    
    recepcionesData.push(data);
    closeModal('recepcionModal');
    renderRecepciones();
    showToast(`✅ Recepción ${data.numero} guardada como "${estado}"`, 'success');
}

// ============================================================
// FUNCIONES DE INICIALIZACIÓN Y NAVEGACIÓN
// ============================================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-custom');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// FUNCIÓN DE INICIALIZACIÓN PRINCIPAL
// ============================================================

function initCompras(tabId) {
    console.log(`🔄 initCompras llamado con tab: ${tabId}`);
    
    // Renderizar según el tab activo
    switch(tabId) {
        case 'solicitud_compra':
            renderSolicitudes();
            break;
        case 'comparativo':
            renderComparativos();
            break;
        case 'orden_compra':
            renderOrdenes();
            break;
        case 'comprobante_proveedor':
            renderComprobantesProveedor();
            break;
        case 'recepcion':
            renderRecepciones();
            break;
        default:
            renderSolicitudes();
    }
}

// Exponer funciones globalmente
window.initCompras = initCompras;
window.renderSolicitudes = renderSolicitudes;
window.renderComparativos = renderComparativos;
window.renderOrdenes = renderOrdenes;
window.renderComprobantesProveedor = renderComprobantesProveedor;
window.renderRecepciones = renderRecepciones;

window.openSolicitudModal = openSolicitudModal;
window.openComparativoModal = openComparativoModal;
window.openOrdenCompraModal = openOrdenCompraModal;
window.openComprobanteProveedorModal = openComprobanteProveedorModal;
window.openRecepcionModal = openRecepcionModal;

window.saveSolicitud = saveSolicitud;
window.saveComparativo = saveComparativo;
window.saveOrdenCompra = saveOrdenCompra;
window.saveComprobanteProveedor = saveComprobanteProveedor;
window.saveRecepcion = saveRecepcion;

window.closeModal = closeModal;
window.openModal = openModal;
window.showToast = showToast;
window.exportData = exportData;
window.toggleMenu = toggleMenu;
window.addComparativoRow = addComparativoRow;
window.addOrdenItemRow = addOrdenItemRow;
window.calcularTotalOrden = calcularTotalOrden;
window.calcularTotalOrdenGeneral = calcularTotalOrdenGeneral;

// Funciones de acciones
window.approveSolicitud = approveSolicitud;
window.deleteSolicitud = deleteSolicitud;
window.createOrdenFromSolicitud = createOrdenFromSolicitud;
window.deleteOrden = deleteOrden;
window.sendOrden = sendOrden;
window.createRecepcionFromOrden = createRecepcionFromOrden;
window.approveRecepcion = approveRecepcion;
window.deleteRecepcion = deleteRecepcion;

console.log('✅ Módulo de Compras cargado correctamente');