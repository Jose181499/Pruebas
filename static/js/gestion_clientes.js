// =========================================
// SISTEMA DE NOTIFICACIONES
// =========================================
function mostrarNotificacion(mensaje, tipo = 'exito') {
    let container = document.getElementById('notificacionesContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificacionesContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const colores = { exito: '#4CAF50', error: '#f44336', info: '#2196F3', warning: '#ff9800' };
    const iconos = { exito: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
        background: ${colores[tipo] || colores.exito};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        min-width: 300px;
        max-width: 500px;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
    `;
    
    notificacion.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">${iconos[tipo] || iconos.exito}</span>
            <span style="white-space: pre-line;">${mensaje}</span>
        </div>
        <button style="background:none;border:none;color:white;font-size:20px;cursor:pointer;font-weight:bold;">&times;</button>
    `;
    
    container.appendChild(notificacion);
    
    if (!document.querySelector('#notificacionesStyles')) {
        const styles = document.createElement('style');
        styles.id = 'notificacionesStyles';
        styles.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(styles);
    }
    
    const cerrarBtn = notificacion.querySelector('button');
    cerrarBtn.onclick = () => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    };
    
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notificacion.remove(), 300);
        }
    }, 4000);
}

// =========================================
// FUNCIONES DE ESCAPE Y VALIDACIÓN
// =========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function actualizarPlaceholderDocumento(prefix = '') {
    const tipo = document.getElementById(`${prefix}tipo_documento`);
    if (!tipo) return;
    const input = document.getElementById(`${prefix}numero_documento`);
    const label = document.getElementById(`${prefix}label_documento`);
    if (!input) return;

    if (tipo.value === 'RUC') {
        input.placeholder = '11 dígitos';
        input.maxLength = 11;
        if (label) label.innerHTML = 'RUC *:';
    } else if (tipo.value === 'DNI') {
        input.placeholder = '8 dígitos';
        input.maxLength = 8;
        if (label) label.innerHTML = 'DNI *:';
    } else if (tipo.value === 'CE') {
        input.placeholder = '9 dígitos';
        input.maxLength = 9;
        if (label) label.innerHTML = 'CE *:';
    } else {
        input.placeholder = 'Ingrese el número';
        input.maxLength = 20;
        if (label) label.innerHTML = 'Número de Documento *:';
    }
}

function validarNumeroDocumento(input, prefix = '') {
    const tipo = document.getElementById(`${prefix}tipo_documento`);
    if (!tipo) return;
    const limites = { RUC: 11, DNI: 8, CE: 9 };
    const max = limites[tipo.value];
    input.value = input.value.replace(/\D/g, '');
    if (max && input.value.length > max) {
        input.value = input.value.slice(0, max);
        mostrarNotificacion(`El ${tipo.value} solo permite ${max} dígitos como máximo.`, 'warning');
    }
}

// =========================================
// FORMATO DE FECHA Y HORA
// =========================================
function formatearFechaHora(fechaISO) {
    if (!fechaISO) return 'No registrada';
    try {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'Fecha inválida';
    }
}

// =========================================
// INICIALIZAR EVENTOS DE PUNTO
// =========================================
function inicializarEventosPunto(div, data = {}) {
    const selectDepartamento = div.querySelector('[data-field="departamento"], [data-field="edit_departamento"]');
    const selectProvincia = div.querySelector('[data-field="provincia"], [data-field="edit_provincia"]');
    const selectDistrito = div.querySelector('[data-field="distrito"], [data-field="edit_distrito"]');
    const buscarDepartamento = div.querySelector('.buscar-departamento');
    const buscarProvincia = div.querySelector('.buscar-provincia');
    const buscarDistrito = div.querySelector('.buscar-distrito');

    if (buscarDepartamento && selectDepartamento) {
        buscarDepartamento.addEventListener('input', function() {
            const filtro = this.value.toLowerCase();
            Array.from(selectDepartamento.options).forEach(opt => {
                if (opt.value === '') return;
                opt.style.display = opt.text.toLowerCase().includes(filtro) ? '' : 'none';
            });
        });
    }

    if (buscarProvincia && selectProvincia) {
        buscarProvincia.addEventListener('input', function() {
            const filtro = this.value.toLowerCase();
            Array.from(selectProvincia.options).forEach(opt => {
                if (opt.value === '') return;
                opt.style.display = opt.text.toLowerCase().includes(filtro) ? '' : 'none';
            });
        });
    }

    if (buscarDistrito && selectDistrito) {
        buscarDistrito.addEventListener('input', function() {
            const filtro = this.value.toLowerCase();
            Array.from(selectDistrito.options).forEach(opt => {
                if (opt.value === '') return;
                opt.style.display = opt.text.toLowerCase().includes(filtro) ? '' : 'none';
            });
        });
    }

    if (selectDepartamento) {
        selectDepartamento.addEventListener('change', function() {
            const departamento = this.value;
            if (selectProvincia) selectProvincia.innerHTML = '<option value="">Seleccione</option>';
            if (selectDistrito) selectDistrito.innerHTML = '<option value="">Seleccione</option>';
            if (!ubigeo[departamento]) return;
            Object.keys(ubigeo[departamento]).forEach(provincia => {
                if (selectProvincia) selectProvincia.innerHTML += `<option value="${provincia}">${provincia}</option>`;
            });
        });
        if (!data.departamento) {
            selectDepartamento.dispatchEvent(new Event('change'));
        }
    }

    if (selectProvincia) {
        selectProvincia.addEventListener('change', function() {
            const departamento = selectDepartamento ? selectDepartamento.value : '';
            const provincia = this.value;
            if (selectDistrito) selectDistrito.innerHTML = '<option value="">Seleccione</option>';
            if (!ubigeo[departamento] || !ubigeo[departamento][provincia]) return;
            ubigeo[departamento][provincia].forEach(distrito => {
                if (selectDistrito) selectDistrito.innerHTML += `<option value="${distrito}">${distrito}</option>`;
            });
        });
    }
}

// =========================================
// AGREGAR CONTACTO - NUEVO CLIENTE
// =========================================
function agregarContactoNuevo(data = {}) {
    const container = document.getElementById('listaContactos');
    if (!container) return;
    
    const div = document.createElement('div');
    div.classList.add('item-agregable');
    div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
    div.innerHTML = `
        <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Nombre</label><input class="form-control" data-field="nombre_contacto" value="${escapeHtml(data.nombre_contacto || '')}"></div>
            <div class="col-md-6 mb-3"><label>Cargo</label><input class="form-control" data-field="cargo" value="${escapeHtml(data.cargo || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Email</label><input class="form-control" data-field="email" value="${escapeHtml(data.email || '')}"></div>
            <div class="col-md-6 mb-3"><label>Teléfono</label><input class="form-control" data-field="telefono" value="${escapeHtml(data.telefono || '')}"></div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal" ${data.principal ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);
}

// =========================================
// AGREGAR PUNTO - NUEVO CLIENTE (CON SELECT MEJORADO)
// =========================================
function agregarPuntoNuevo(data = {}) {
    const container = document.getElementById('listaPuntos');
    if (!container) return;
    
    const div = document.createElement('div');
    div.classList.add('item-agregable');
    div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
    div.innerHTML = `
        <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Punto de Entrega</label><input class="form-control" data-field="nombre_punto" value="${escapeHtml(data.nombre_punto || '')}"></div>
            <div class="col-md-6 mb-3"><label>Dirección</label><input class="form-control" data-field="direccion" value="${escapeHtml(data.direccion || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Contacto de Entrega</label><input class="form-control" data-field="responsable" value="${escapeHtml(data.responsable || '')}"></div>
            <div class="col-md-6 mb-3"><label>Teléfono</label><input class="form-control" data-field="telefono_punto" value="${escapeHtml(data.telefono_punto || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Condición de Pago</label>
                <select data-field="condicion_pago" class="form-select select-condicion-pago">
                    <option value="">Seleccione</option>
                    <option value="Contado" ${data.condicion_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option value="Crédito 7 días" ${data.condicion_pago === 'Crédito 7 días' ? 'selected' : ''}>Crédito 7 días</option>
                    <option value="Crédito 15 días" ${data.condicion_pago === 'Crédito 15 días' ? 'selected' : ''}>Crédito 15 días</option>
                    <option value="Crédito 30 días" ${data.condicion_pago === 'Crédito 30 días' ? 'selected' : ''}>Crédito 30 días</option>
                    <option value="Crédito 45 días" ${data.condicion_pago === 'Crédito 45 días' ? 'selected' : ''}>Crédito 45 días</option>
                    <option value="Crédito 60 días" ${data.condicion_pago === 'Crédito 60 días' ? 'selected' : ''}>Crédito 60 días</option>
                    <option value="Crédito 90 días" ${data.condicion_pago === 'Crédito 90 días' ? 'selected' : ''}>Crédito 90 días</option>
                    <option value="Personalizado" ${data.condicion_pago === 'Personalizado' ? 'selected' : ''}>Personalizado (escribir)</option>
                </select>
            </div>
            <div class="col-md-6 mb-3 campo-credito-personalizado" style="display:${data.condicion_pago === 'Personalizado' ? 'block' : 'none'}">
                <label>Escribir condición</label>
                <input type="text" class="form-control" data-field="tiempo_credito" placeholder="Ej: Crédito 20 días, 50% adelanto..." value="${escapeHtml(data.tiempo_credito || '')}">
            </div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal_punto" ${data.principal_punto ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);
    
    inicializarEventosPunto(div, data);
    
    const selectCondicion = div.querySelector('.select-condicion-pago');
    const campoPersonalizado = div.querySelector('.campo-credito-personalizado');
    if (selectCondicion && campoPersonalizado) {
        selectCondicion.addEventListener('change', function() {
            campoPersonalizado.style.display = this.value === 'Personalizado' ? 'block' : 'none';
        });
    }
}

// =========================================
// AGREGAR CONTACTO - EDITAR CLIENTE
// =========================================
function agregarContactoEdicion(data = {}) {
    const container = document.getElementById('edit_listaContactos');
    if (!container) return;
    
    const div = document.createElement('div');
    div.classList.add('item-agregable');
    div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
    div.innerHTML = `
        <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Nombre</label><input class="form-control" data-field="edit_nombre_contacto" value="${escapeHtml(data.nombre_contacto || '')}"></div>
            <div class="col-md-6 mb-3"><label>Cargo</label><input class="form-control" data-field="edit_cargo" value="${escapeHtml(data.cargo || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Email</label><input class="form-control" data-field="edit_email" value="${escapeHtml(data.email || '')}"></div>
            <div class="col-md-6 mb-3"><label>Teléfono</label><input class="form-control" data-field="edit_telefono" value="${escapeHtml(data.telefono || '')}"></div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal" ${data.principal ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);
}

// =========================================
// AGREGAR PUNTO - EDITAR CLIENTE (CON SELECT MEJORADO)
// =========================================
function agregarPuntoEdicion(data = {}) {
    const container = document.getElementById('edit_listaPuntos');
    if (!container) return;
    
    const div = document.createElement('div');
    div.classList.add('item-agregable');
    div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
    div.innerHTML = `
        <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Punto de Entrega</label><input class="form-control" data-field="edit_nombre_punto" value="${escapeHtml(data.nombre_punto || '')}"></div>
            <div class="col-md-6 mb-3"><label>Dirección</label><input class="form-control" data-field="edit_direccion" value="${escapeHtml(data.direccion || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Contacto de Entrega</label><input class="form-control" data-field="edit_responsable" value="${escapeHtml(data.responsable || '')}"></div>
            <div class="col-md-6 mb-3"><label>Teléfono</label><input class="form-control" data-field="edit_telefono_punto" value="${escapeHtml(data.telefono_punto || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Condición de Pago</label>
                <select data-field="edit_condicion_pago" class="form-select select-condicion-pago">
                    <option value="">Seleccione</option>
                    <option value="Contado" ${data.condicion_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option value="Crédito 7 días" ${data.condicion_pago === 'Crédito 7 días' ? 'selected' : ''}>Crédito 7 días</option>
                    <option value="Crédito 15 días" ${data.condicion_pago === 'Crédito 15 días' ? 'selected' : ''}>Crédito 15 días</option>
                    <option value="Crédito 30 días" ${data.condicion_pago === 'Crédito 30 días' ? 'selected' : ''}>Crédito 30 días</option>
                    <option value="Crédito 45 días" ${data.condicion_pago === 'Crédito 45 días' ? 'selected' : ''}>Crédito 45 días</option>
                    <option value="Crédito 60 días" ${data.condicion_pago === 'Crédito 60 días' ? 'selected' : ''}>Crédito 60 días</option>
                    <option value="Crédito 90 días" ${data.condicion_pago === 'Crédito 90 días' ? 'selected' : ''}>Crédito 90 días</option>
                    <option value="Personalizado" ${data.condicion_pago === 'Personalizado' ? 'selected' : ''}>Personalizado (escribir)</option>
                </select>
            </div>
            <div class="col-md-6 mb-3 campo-credito-personalizado" style="display:${data.condicion_pago === 'Personalizado' ? 'block' : 'none'}">
                <label>Escribir condición</label>
                <input type="text" class="form-control" data-field="edit_tiempo_credito" placeholder="Ej: Crédito 20 días, 50% adelanto..." value="${escapeHtml(data.tiempo_credito || '')}">
            </div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal_punto" ${data.principal_punto ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);
    
    inicializarEventosPunto(div, data);
    
    const selectCondicion = div.querySelector('.select-condicion-pago');
    const campoPersonalizado = div.querySelector('.campo-credito-personalizado');
    if (selectCondicion && campoPersonalizado) {
        selectCondicion.addEventListener('change', function() {
            campoPersonalizado.style.display = this.value === 'Personalizado' ? 'block' : 'none';
        });
    }

    // Cargar provincia y distrito si ya existen
    if (data.departamento) {
        const selDep = div.querySelector('[data-field="edit_departamento"]');
        const selProv = div.querySelector('[data-field="edit_provincia"]');
        const selDist = div.querySelector('[data-field="edit_distrito"]');

        if (selDep) selDep.value = data.departamento;
        if (ubigeo[data.departamento] && selProv) {
            selProv.innerHTML = '<option value="">Seleccione</option>';
            Object.keys(ubigeo[data.departamento]).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                if (p === data.provincia) opt.selected = true;
                selProv.appendChild(opt);
            });
        }
        if (data.provincia && ubigeo[data.departamento]?.[data.provincia] && selDist) {
            selDist.innerHTML = '<option value="">Seleccione</option>';
            ubigeo[data.departamento][data.provincia].forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                if (d === data.distrito) opt.selected = true;
                selDist.appendChild(opt);
            });
        }
    }
}

// =========================================
// ABRIR MODAL VER CLIENTE
// =========================================
window.abrirModalVer = async function(id) {
    if (!id) {
        mostrarNotificacion("ID de cliente no válido", 'error');
        return;
    }
    
    const modalBody = document.getElementById('modalVerBody');
    if (!modalBody) {
        mostrarNotificacion("Modal de visualización no encontrado", 'error');
        return;
    }
    
    modalBody.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Cargando datos del cliente...</p></div>`;
    
    try {
        const res = await fetch(`/api/clientes/${id}`);
        const json = await res.json();
        
        if (!json.success || !json.data) {
            throw new Error(json.error || "Error al cargar los datos");
        }
        
        const c = json.data;
        const fechaRegistro = formatearFechaHora(c.created_at || c.fecha_registro);
        
        let html = `
            <div class="fecha-registro-box">
                <i class="bi bi-calendar-clock-fill"></i>
                <div class="mt-2">
                    <small class="text-muted">FECHA Y HORA DE REGISTRO</small>
                    <h5 class="mb-0 fw-bold" style="color: #667eea;">${fechaRegistro}</h5>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">CÓDIGO DE CLIENTE</div>
                        <div class="info-value-ver"><strong class="text-primary">${escapeHtml(c.codigo_cliente || '---')}</strong></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">TIPO DOCUMENTO</div>
                        <div class="info-value-ver">${escapeHtml(c.tipo_documento || '-')}</div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">NÚMERO DE DOCUMENTO</div>
                        <div class="info-value-ver"><strong>${escapeHtml(c.numero_documento || '-')}</strong></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">RAZÓN SOCIAL</div>
                        <div class="info-value-ver">${escapeHtml(c.razon_social || '-')}</div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">NOMBRE COMERCIAL</div>
                        <div class="info-value-ver">${escapeHtml(c.nombre_comercial || '-')}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="info-row-ver">
                        <div class="info-label-ver">DIRECCIÓN FISCAL</div>
                        <div class="info-value-ver">${escapeHtml(c.direccion_fiscal || '-')}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Contactos
        html += `<div class="erp-section-title mt-3"><i class="bi bi-person-badge"></i> Contactos Asociados</div>`;
        if (c.contactos && c.contactos.length > 0) {
            c.contactos.forEach(contacto => {
                html += `
                    <div class="contact-card-ver">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${escapeHtml(contacto.nombre_contacto || 'Sin nombre')}</strong>
                                ${contacto.principal ? '<span class="badge-principal ms-2"><i class="bi bi-star-fill"></i> Principal</span>' : ''}
                                <div class="small text-muted mt-1">
                                    ${contacto.cargo ? `<i class="bi bi-briefcase"></i> ${escapeHtml(contacto.cargo)}<br>` : ''}
                                    ${contacto.email ? `<i class="bi bi-envelope"></i> ${escapeHtml(contacto.email)}<br>` : ''}
                                    ${contacto.telefono ? `<i class="bi bi-telephone"></i> ${escapeHtml(contacto.telefono)}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p class="text-muted">No hay contactos registrados</p>`;
        }
        
        // Puntos de entrega
        html += `<div class="erp-section-title mt-3"><i class="bi bi-geo-alt-fill"></i> Puntos de Entrega</div>`;
        if (c.puntos_entrega && c.puntos_entrega.length > 0) {
            c.puntos_entrega.forEach(punto => {
                html += `
                    <div class="punto-card-ver">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${escapeHtml(punto.nombre_punto || 'Sin nombre')}</strong>
                                ${punto.principal_punto ? '<span class="badge-principal ms-2"><i class="bi bi-star-fill"></i> Principal</span>' : ''}
                                <div class="small text-muted mt-1">
                                    ${punto.direccion ? `<i class="bi bi-pin-map"></i> ${escapeHtml(punto.direccion)}<br>` : ''}
                                    ${punto.responsable ? `<i class="bi bi-person"></i> Contacto: ${escapeHtml(punto.responsable)}<br>` : ''}
                                    ${punto.telefono_punto ? `<i class="bi bi-telephone"></i> ${escapeHtml(punto.telefono_punto)}<br>` : ''}
                                    ${punto.condicion_pago ? `<i class="bi bi-credit-card"></i> Condición: <strong>${escapeHtml(punto.condicion_pago)}</strong>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p class="text-muted">No hay puntos de entrega registrados</p>`;
        }
        
        modalBody.innerHTML = html;
        const modalElement = document.getElementById('modalVerCliente');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error("Error al cargar cliente:", error);
        modalBody.innerHTML = `<div class="text-center py-5 text-danger">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
            <p class="mt-2">Error al cargar los datos: ${error.message}</p>
        </div>`;
        mostrarNotificacion("Error cargando cliente: " + error.message, 'error');
    }
};

// =========================================
// INICIALIZAR CONTACTOS Y PUNTOS
// =========================================
function inicializarContactosPuntos() {
    const btnAgregarContacto = document.getElementById('btnAgregarContacto');
    if (btnAgregarContacto) {
        btnAgregarContacto.addEventListener('click', () => agregarContactoNuevo());
    }
    
    const btnAgregarPunto = document.getElementById('btnAgregarPunto');
    if (btnAgregarPunto) {
        btnAgregarPunto.addEventListener('click', () => agregarPuntoNuevo());
    }
    
    const btnAgregarContactoEdit = document.getElementById('btnAgregarContactoEdit');
    if (btnAgregarContactoEdit) {
        btnAgregarContactoEdit.addEventListener('click', () => agregarContactoEdicion());
    }
    
    const btnAgregarPuntoEdit = document.getElementById('btnAgregarPuntoEdit');
    if (btnAgregarPuntoEdit) {
        btnAgregarPuntoEdit.addEventListener('click', () => agregarPuntoEdicion());
    }
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            e.target.closest('.item-agregable').remove();
        }
    });
    
    document.addEventListener('change', (e) => {
        if (e.target.dataset.field === 'principal' || e.target.dataset.field === 'principal_punto') {
            const container = e.target.closest('#listaContactos, #edit_listaContactos, #listaPuntos, #edit_listaPuntos');
            if (container) {
                const checkboxes = container.querySelectorAll('[data-field="principal"], [data-field="principal_punto"]');
                checkboxes.forEach(cb => {
                    if (cb !== e.target) cb.checked = false;
                });
            }
        }
    });
}

// =========================================
// CARGAR CLIENTES (VERSIÓN CORREGIDA CON 3 BOTONES)
// =========================================
let timeoutBusqueda = null;

async function cargarClientes(filtros = {}) {
    const tbody = document.getElementById("tbody-clientes");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <br>Cargando clientes...
     </td>`;

    try {
        let url = "/api/clientes/buscar";
        const params = new URLSearchParams();

        if (filtros.tipo) params.append("tipo_documento", filtros.tipo);
        if (filtros.busqueda && filtros.busqueda.trim()) {
            params.append("busqueda", filtros.busqueda.trim());
        }

        if (params.toString()) url += "?" + params.toString();

        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
            throw new Error(json.error || "Error al cargar clientes");
        }

        const clientes = json.data || [];

        tbody.innerHTML = "";

        if (clientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">
                <i class="bi bi-search" style="font-size: 3rem;"></i><br>
                No se encontraron resultados
              </div></tr>`;
            return;
        }

        clientes.forEach(c => {
            const contactos = (c.contactos?.length) 
                ? c.contactos.map(ct => `📞 ${escapeHtml(ct.nombre_contacto || '')}`).join('<br>') 
                : '<em class="text-muted">Sin contactos</em>';

            const puntos = (c.puntos_entrega?.length) 
                ? c.puntos_entrega.map(p => `📦 ${escapeHtml(p.nombre_punto || '')}`).join('<br>') 
                : '<em class="text-muted">Sin puntos</em>';

            const condicionPago = c.puntos_entrega?.[0]?.condicion_pago || '-';
            const codigoCliente = c.codigo_cliente || `---`;

            // ⭐ AHORA CON 3 BOTONES VISIBLES CON BOOTSTRAP ⭐
            tbody.innerHTML += `
                <tr>
                    <td class="text-center">${c.id || '-'}</td>
                    <td class="text-center"><span class="badge bg-secondary">${escapeHtml(codigoCliente)}</span></td>
                    <td><strong>${escapeHtml(c.nombre_comercial) || '-'}</strong></td>
                    <td>${escapeHtml(c.razon_social) || '-'}</td>
                    <td class="text-center"><span class="badge bg-info">${c.numero_documento || '-'}</span></td>
                    <td>${escapeHtml(c.direccion_fiscal) || '-'}</td>
                    <td class="text-center">${condicionPago}</td>
                    <td>${contactos}</td>
                    <td>${puntos}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary me-1" onclick="abrirModalVer(${c.id})" title="Ver cliente">
                            <i class="bi bi-eye-fill"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-warning me-1" onclick="abrirModalEditar(${c.id})" title="Editar cliente">
                            <i class="bi bi-pencil-fill"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="abrirModalEliminar(${c.id})" title="Eliminar cliente">
                            <i class="bi bi-trash-fill"></i> Eliminar
                        </button>
                    </div>
                </tr>
            `;
        });

    } catch (e) {
        console.error("Error:", e);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-danger">
            Error al cargar clientes: ${e.message}
        </div></tr>`;
    }
}

// =========================================
// INICIALIZAR FILTROS
// =========================================
function inicializarFiltros() {
    const filtroTipo = document.getElementById("filtro-tipo");
    const filtroBusqueda = document.getElementById("filtro-busqueda");

    if (filtroTipo) {
        filtroTipo.addEventListener("change", () => aplicarFiltros());
    }

    if (filtroBusqueda) {
        filtroBusqueda.addEventListener("input", () => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(aplicarFiltros, 500);
        });

        filtroBusqueda.addEventListener("keypress", (e) => {
            if (e.key === "Enter") aplicarFiltros();
        });
    }
}

function aplicarFiltros() {
    const tipo = document.getElementById("filtro-tipo")?.value || "";
    const busqueda = document.getElementById("filtro-busqueda")?.value || "";
    cargarClientes({ tipo, busqueda });
}

// =========================================
// ABRIR MODAL EDITAR
// =========================================
window.abrirModalEditar = async function(id) {
    if (!id) {
        mostrarNotificacion("ID de cliente no válido", 'error');
        return;
    }
    
    try {
        mostrarNotificacion("Cargando datos del cliente...", 'info');
        
        const res = await fetch(`/api/clientes/${id}`);
        const json = await res.json();
        
        if (!json.success || !json.data) {
            throw new Error(json.error || "Error al cargar los datos");
        }
        
        const c = json.data;
        
        document.getElementById('edit_listaContactos').innerHTML = '';
        document.getElementById('edit_listaPuntos').innerHTML = '';
        
        document.getElementById('edit_id').value = c.id;
        document.getElementById('edit_tipo_documento').value = c.tipo_documento || '';
        document.getElementById('edit_numero_documento').value = c.numero_documento || '';
        document.getElementById('edit_razon_social').value = c.razon_social || '';
        document.getElementById('edit_nombre_comercial').value = c.nombre_comercial || '';
        document.getElementById('edit_direccion_fiscal').value = c.direccion_fiscal || '';
        actualizarPlaceholderDocumento('edit_');
        
        if (c.contactos && c.contactos.length > 0) {
            c.contactos.forEach(contacto => agregarContactoEdicion(contacto));
        } else {
            agregarContactoEdicion();
        }
        
        if (c.puntos_entrega && c.puntos_entrega.length > 0) {
            c.puntos_entrega.forEach(punto => agregarPuntoEdicion(punto));
        } else {
            agregarPuntoEdicion();
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
        modal.show();
        
    } catch (error) {
        console.error("Error al cargar cliente para editar:", error);
        mostrarNotificacion("Error cargando cliente: " + error.message, 'error');
    }
};

// =========================================
// GUARDAR EDICIÓN
// =========================================
document.getElementById('formEditarCliente')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit_id').value;
    if (!id) {
        mostrarNotificacion("ID no encontrado", 'error');
        return;
    }
    
    const tipoDoc = document.getElementById('edit_tipo_documento').value;
    const numDoc = document.getElementById('edit_numero_documento').value;
    const razonSocial = document.getElementById('edit_razon_social').value;
    
    if (!tipoDoc) {
        mostrarNotificacion("Seleccione el tipo de documento", 'error');
        return;
    }
    if (!numDoc) {
        mostrarNotificacion("Ingrese el número de documento", 'error');
        return;
    }
    if (!razonSocial) {
        mostrarNotificacion("Ingrese la razón social", 'error');
        return;
    }
    
    const data = {
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        razon_social: razonSocial,
        nombre_comercial: document.getElementById('edit_nombre_comercial').value,
        direccion_fiscal: document.getElementById('edit_direccion_fiscal').value,
        contactos: [],
        puntos_entrega: []
    };
    
    document.querySelectorAll('#edit_listaContactos .item-agregable').forEach(item => {
        const nombreContacto = item.querySelector('[data-field="edit_nombre_contacto"]')?.value.trim();
        if (nombreContacto) {
            data.contactos.push({
                nombre_contacto: nombreContacto,
                cargo: item.querySelector('[data-field="edit_cargo"]')?.value.trim() || '',
                email: item.querySelector('[data-field="edit_email"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="edit_telefono"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        }
    });
    
    document.querySelectorAll('#edit_listaPuntos .item-agregable').forEach(item => {
        const nombrePunto = item.querySelector('[data-field="edit_nombre_punto"]')?.value.trim();
        if (nombrePunto) {
            const condicionPago = item.querySelector('[data-field="edit_condicion_pago"]')?.value || '';
            const tiempoCredito = item.querySelector('[data-field="edit_tiempo_credito"]')?.value.trim() || '';
            data.puntos_entrega.push({
                nombre_punto: nombrePunto,
                direccion: item.querySelector('[data-field="edit_direccion"]')?.value.trim() || '',
                responsable: item.querySelector('[data-field="edit_responsable"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="edit_telefono_punto"]')?.value.trim() || '',
                condicion_pago: condicionPago === 'Personalizado' ? tiempoCredito : condicionPago,
                tiempo_credito: condicionPago === 'Personalizado' ? '' : tiempoCredito,
                principal: item.querySelector('[data-field="principal_punto"]')?.checked || false
            });
        }
    });
    
    try {
        const res = await fetch(`/api/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        
        if (json.success) {
    bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente'))?.hide();
    await cargarClientes();
    mostrarModalConfirmacionEdicion(data); // ✅ línea nueva
    }
        
        else {
            mostrarNotificacion("❌ Error: " + json.error, 'error');
        }
    } catch (error) {
        console.error("Error al actualizar:", error);
        mostrarNotificacion("Error al actualizar: " + error.message, 'error');
    }
});

// =========================================
// GUARDAR NUEVO CLIENTE
// =========================================
document.getElementById('formCliente')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tipoDoc = document.getElementById('tipo_documento').value;
    const numDoc = document.getElementById('numero_documento').value;
    const razonSocial = document.getElementById('razon_social').value;
    
    if (!tipoDoc) {
        mostrarNotificacion("Seleccione el tipo de documento", 'error');
        return;
    }
    if (!numDoc) {
        mostrarNotificacion("Ingrese el número de documento", 'error');
        return;
    }
    if (!razonSocial) {
        mostrarNotificacion("Ingrese la razón social", 'error');
        return;
    }
    
    const data = {
        tipo_documento: tipoDoc,
        numero_documento: numDoc,
        razon_social: razonSocial,
        nombre_comercial: document.getElementById('nombre_comercial').value,
        direccion_fiscal: document.getElementById('direccion_fiscal').value,
        contactos: [],
        puntos_entrega: []
    };
    
    document.querySelectorAll('#listaContactos .item-agregable').forEach(item => {
        const nombreContacto = item.querySelector('[data-field="nombre_contacto"]')?.value.trim();
        if (nombreContacto) {
            data.contactos.push({
                nombre_contacto: nombreContacto,
                cargo: item.querySelector('[data-field="cargo"]')?.value.trim() || '',
                email: item.querySelector('[data-field="email"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        }
    });
    
    document.querySelectorAll('#listaPuntos .item-agregable').forEach(item => {
        const nombrePunto = item.querySelector('[data-field="nombre_punto"]')?.value.trim();
        if (nombrePunto) {
            const condicionPago = item.querySelector('[data-field="condicion_pago"]')?.value || '';
            const tiempoCredito = item.querySelector('[data-field="tiempo_credito"]')?.value.trim() || '';
            data.puntos_entrega.push({
                nombre_punto: nombrePunto,
                direccion: item.querySelector('[data-field="direccion"]')?.value.trim() || '',
                responsable: item.querySelector('[data-field="responsable"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono_punto"]')?.value.trim() || '',
                condicion_pago: condicionPago === 'Personalizado' ? tiempoCredito : condicionPago,
                tiempo_credito: condicionPago === 'Personalizado' ? '' : tiempoCredito,
                principal: item.querySelector('[data-field="principal_punto"]')?.checked || false
            });
        }
    });
    
    try {
        const res = await fetch('/api/clientes/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        
        if (json.success) {
    bootstrap.Modal.getInstance(document.getElementById('modalCliente'))?.hide();
    document.getElementById('formCliente').reset();
    document.getElementById('listaContactos').innerHTML = '';
    document.getElementById('listaPuntos').innerHTML = '';
    agregarContactoNuevo();
    agregarPuntoNuevo();
    await cargarClientes();
    mostrarModalConfirmacionCliente(json, data); // ✅ línea nueva
    }
        else {
            mostrarNotificacion("❌ Error: " + json.error, 'error');
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        mostrarNotificacion("Error al guardar: " + error.message, 'error');
    }
});

// =========================================
// MODAL DE CONFIRMACIÓN - NUEVO CLIENTE
// =========================================
function mostrarModalConfirmacionCliente(json, data) {
    const modalBody = document.getElementById('modalConfirmacionBody');
    if (!modalBody) return;

    const ahora      = new Date();
    const fecha      = ahora.toLocaleDateString('es-PE');
    const hora       = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const codigoCliente  = json.data?.codigo_cliente || '-';
    const contactoPpal   = data.contactos?.find(c => c.principal) || data.contactos?.[0];
    const puntoPpal      = data.puntos_entrega?.find(p => p.principal) || data.puntos_entrega?.[0];

    modalBody.innerHTML = `
        <div class="text-center mb-3">
            <i class="bi bi-person-check-fill" style="font-size: 48px; color: #10b981;"></i>
        </div>

        <div class="alert alert-success text-center mb-3">
            <strong>✅ ¡Cliente registrado exitosamente!</strong>
        </div>

        <div class="row"><div class="col-6"><strong>Código:</strong></div>
            <div class="col-6"><span class="badge bg-secondary">${escapeHtml(codigoCliente)}</span></div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Tipo Documento:</strong></div>
            <div class="col-6">${escapeHtml(data.tipo_documento)}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>RUC / DNI:</strong></div>
            <div class="col-6"><span class="badge bg-info text-dark">${escapeHtml(data.numero_documento)}</span></div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Razón Social:</strong></div>
            <div class="col-6">${escapeHtml(data.razon_social)}</div>
        </div>
        ${data.nombre_comercial ? `
        <div class="row mt-2"><div class="col-6"><strong>Nombre Comercial:</strong></div>
            <div class="col-6">${escapeHtml(data.nombre_comercial)}</div>
        </div>` : ''}
        ${data.direccion_fiscal ? `
        <div class="row mt-2"><div class="col-6"><strong>Dirección Fiscal:</strong></div>
            <div class="col-6">${escapeHtml(data.direccion_fiscal)}</div>
        </div>` : ''}

        <hr>

        ${contactoPpal ? `
        <div class="row mt-2"><div class="col-6"><strong>Contacto Principal:</strong></div>
            <div class="col-6">${escapeHtml(contactoPpal.nombre_contacto)}
                ${contactoPpal.telefono ? `<br><small class="text-muted"><i class="bi bi-telephone"></i> ${escapeHtml(contactoPpal.telefono)}</small>` : ''}
            </div>
        </div>` : ''}
        ${puntoPpal ? `
        <div class="row mt-2"><div class="col-6"><strong>Punto de Entrega:</strong></div>
            <div class="col-6">${escapeHtml(puntoPpal.nombre_punto)}
                ${puntoPpal.condicion_pago ? `<br><small class="text-muted"><i class="bi bi-credit-card"></i> ${escapeHtml(puntoPpal.condicion_pago)}</small>` : ''}
            </div>
        </div>` : ''}

        <hr>

        <div class="row mt-2"><div class="col-6"><strong>Registrado por:</strong></div>
            <div class="col-6">${escapeHtml(usuarioActual?.nombre_completo || 'No asignado')}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Fecha:</strong></div>
            <div class="col-6">${fecha}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Hora:</strong></div>
            <div class="col-6">${hora}</div>
        </div>

        <hr>
        <div class="text-muted small">
            <i class="bi bi-info-circle"></i>
            El código <strong>${escapeHtml(codigoCliente)}</strong> es único y quedará registrado en el sistema.
        </div>
    `;

    const modalEl = document.getElementById('modalConfirmacionCliente');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

// =========================================
// MODAL DE CONFIRMACIÓN - EDITAR CLIENTE
// =========================================
function mostrarModalConfirmacionEdicion(data) {
    const modalBody = document.getElementById('modalConfirmacionBody');
    if (!modalBody) return;

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-PE');
    const hora  = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const contactoPpal = data.contactos?.find(c => c.principal) || data.contactos?.[0];
    const puntoPpal    = data.puntos_entrega?.find(p => p.principal) || data.puntos_entrega?.[0];

    modalBody.innerHTML = `
        <div class="text-center mb-3">
            <i class="bi bi-pencil-square" style="font-size: 48px; color: #f59e0b;"></i>
        </div>

        <div class="alert alert-warning text-center mb-3">
            <strong>✏️ ¡Cliente actualizado exitosamente!</strong>
        </div>

        <div class="row mt-2"><div class="col-6"><strong>Tipo Documento:</strong></div>
            <div class="col-6">${escapeHtml(data.tipo_documento)}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>RUC / DNI:</strong></div>
            <div class="col-6"><span class="badge bg-info text-dark">${escapeHtml(data.numero_documento)}</span></div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Razón Social:</strong></div>
            <div class="col-6">${escapeHtml(data.razon_social)}</div>
        </div>
        ${data.nombre_comercial ? `
        <div class="row mt-2"><div class="col-6"><strong>Nombre Comercial:</strong></div>
            <div class="col-6">${escapeHtml(data.nombre_comercial)}</div>
        </div>` : ''}
        ${data.direccion_fiscal ? `
        <div class="row mt-2"><div class="col-6"><strong>Dirección Fiscal:</strong></div>
            <div class="col-6">${escapeHtml(data.direccion_fiscal)}</div>
        </div>` : ''}

        <hr>

        ${contactoPpal ? `
        <div class="row mt-2"><div class="col-6"><strong>Contacto Principal:</strong></div>
            <div class="col-6">${escapeHtml(contactoPpal.nombre_contacto)}
                ${contactoPpal.telefono ? `<br><small class="text-muted"><i class="bi bi-telephone"></i> ${escapeHtml(contactoPpal.telefono)}</small>` : ''}
            </div>
        </div>` : ''}
        ${puntoPpal ? `
        <div class="row mt-2"><div class="col-6"><strong>Punto de Entrega:</strong></div>
            <div class="col-6">${escapeHtml(puntoPpal.nombre_punto)}
                ${puntoPpal.condicion_pago ? `<br><small class="text-muted"><i class="bi bi-credit-card"></i> ${escapeHtml(puntoPpal.condicion_pago)}</small>` : ''}
            </div>
        </div>` : ''}

        <hr>

        <div class="row mt-2"><div class="col-6"><strong>Actualizado por:</strong></div>
            <div class="col-6">${escapeHtml(usuarioActual?.nombre_completo || 'No asignado')}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Fecha:</strong></div>
            <div class="col-6">${fecha}</div>
        </div>
        <div class="row mt-2"><div class="col-6"><strong>Hora:</strong></div>
            <div class="col-6">${hora}</div>
        </div>
    `;

    const modalEl = document.getElementById('modalConfirmacionCliente');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

// =========================================
// ELIMINAR CLIENTE
// =========================================
window.abrirModalEliminar = function(id) {
    if (!id) return;
    document.getElementById('delete_id').value = id;
    const modal = new bootstrap.Modal(document.getElementById('modalEliminarCliente'));
    modal.show();
};

document.getElementById('btnConfirmarEliminar')?.addEventListener('click', async function() {
    const id = document.getElementById('delete_id').value;
    if (!id) return;
    
    try {
        const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        const json = await res.json();
        
        if (json.success) {
            mostrarNotificacion(`✅ Cliente eliminado exitosamente`, 'exito');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminarCliente'));
            if (modal) modal.hide();
            await cargarClientes();
        } else {
            mostrarNotificacion("❌ Error: " + json.error, 'error');
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
        mostrarNotificacion("Error al eliminar: " + error.message, 'error');
    }
});

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando sistema de gestión de clientes...");
    cargarClientes();
    inicializarFiltros();
    inicializarContactosPuntos();
    
    const tipoDocumento = document.getElementById('tipo_documento');
    if (tipoDocumento) {
        tipoDocumento.addEventListener('change', () => actualizarPlaceholderDocumento(''));
        actualizarPlaceholderDocumento('');
    }
    
    const editTipoDocumento = document.getElementById('edit_tipo_documento');
    if (editTipoDocumento) {
        editTipoDocumento.addEventListener('change', () => actualizarPlaceholderDocumento('edit_'));
        actualizarPlaceholderDocumento('edit_');
    }
});

// Inicializar items por defecto
setTimeout(() => {
    if (document.getElementById('listaContactos') && document.getElementById('listaContactos').children.length === 0) {
        agregarContactoNuevo();
    }
    if (document.getElementById('listaPuntos') && document.getElementById('listaPuntos').children.length === 0) {
        agregarPuntoNuevo();
    }
}, 100);