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
    
    const colores = {
        exito: '#4CAF50',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };
    
    const iconos = {
        exito: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
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
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
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
// UBIGEO PERÚ COMPLETO
// =========================================
const ubigeo = {
    Lima: {
        Lima: ['Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pueblo Libre', 'Puente Piedra', 'Rímac', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'],
        Huaura: ['Huacho', 'Hualmay', 'Vegueta'],
        Huaral: ['Huaral', 'Chancay', 'Aucallama']
    },
    Arequipa: {
        Arequipa: ['Cerro Colorado', 'Yanahuara', 'Cayma', 'Miraflores', 'Socabaya', 'José Luis Bustamante y Rivero']
    },
    Cusco: {
        Cusco: ['Wanchaq', 'Santiago', 'San Sebastián', 'San Jerónimo']
    },
    LaLibertad: {
        Trujillo: ['Trujillo', 'Víctor Larco', 'Moche', 'Huanchaco']
    },
    Piura: {
        Piura: ['Piura', 'Castilla', 'Catacaos']
    }
};

// =========================================
// FUNCIONES DE ESCAPE
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
        input.maxLength = 11;          // ← AGREGA
        if (label) label.innerHTML = 'RUC *:';
    } else if (tipo.value === 'DNI') {
        input.placeholder = '8 dígitos';
        input.maxLength = 8;           // ← AGREGA
        if (label) label.innerHTML = 'DNI *:';
    } else {
        input.placeholder = 'Ingrese el número';
        input.maxLength = 20;          // ← AGREGA
        if (label) label.innerHTML = 'Número de Documento *:';
    }
}

function validarNumeroDocumento(input, prefix = '') {
    const tipo = document.getElementById(`${prefix}tipo_documento`);
    if (!tipo) return;

    const limites = { RUC: 11, DNI: 8 ,CE: 9};
    const max = limites[tipo.value];

    // Solo permite números
    input.value = input.value.replace(/\D/g, '');

    if (max && input.value.length > max) {
        input.value = input.value.slice(0, max);
        mostrarNotificacion(`El ${tipo.value} solo permite ${max} dígitos como máximo.`, 'warning');
    }
}

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener("DOMContentLoaded", () => {
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
// AGREGAR PUNTO - NUEVO CLIENTE
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
            <div class="col-md-4 mb-3"><label>Departamento</label>
                <input type="text" class="form-control buscar-departamento" placeholder="Buscar departamento...">
                <select class="form-select mt-2" data-field="departamento">
                    <option value="">Seleccione</option>
                    <option value="Lima">Lima</option>
                    <option value="Arequipa">Arequipa</option>
                    <option value="Cusco">Cusco</option>
                    <option value="LaLibertad">La Libertad</option>
                    <option value="Piura">Piura</option>
                </select>
            </div>
            <div class="col-md-4 mb-3"><label>Provincia</label>
                <input type="text" class="form-control buscar-provincia" placeholder="Buscar provincia...">
                <select class="form-select mt-2" data-field="provincia"><option value="">Seleccione</option></select>
            </div>
            <div class="col-md-4 mb-3"><label>Distrito</label>
                <input type="text" class="form-control buscar-distrito" placeholder="Buscar distrito...">
                <select class="form-select mt-2" data-field="distrito"><option value="">Seleccione</option></select>
            </div>
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
                    <option value="Credito" ${data.condicion_pago === 'Credito' ? 'selected' : ''}>Crédito</option>
                </select>
            </div>
            <div class="col-md-6 mb-3 campo-credito" style="display:${data.condicion_pago === 'Credito' ? 'block' : 'none'}">
                <label>Tiempo de Crédito</label><input type="text" class="form-control" data-field="tiempo_credito" placeholder="Ej: 30 días" value="${escapeHtml(data.tiempo_credito || '')}">
            </div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal_punto" ${data.principal_punto ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);
    inicializarEventosPunto(div, data);
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
// AGREGAR PUNTO - EDITAR CLIENTE
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
            <div class="col-md-4 mb-3"><label>Departamento</label>
                <input type="text" class="form-control buscar-departamento" placeholder="Buscar departamento...">
                <select class="form-select mt-2" data-field="edit_departamento">
                    <option value="">Seleccione</option>
                    <option value="Lima">Lima</option>
                    <option value="Arequipa">Arequipa</option>
                    <option value="Cusco">Cusco</option>
                    <option value="LaLibertad">La Libertad</option>
                    <option value="Piura">Piura</option>
                </select>
            </div>
            <div class="col-md-4 mb-3"><label>Provincia</label>
                <input type="text" class="form-control buscar-provincia" placeholder="Buscar provincia...">
                <select class="form-select mt-2" data-field="edit_provincia"><option value="">Seleccione</option></select>
            </div>
            <div class="col-md-4 mb-3"><label>Distrito</label>
                <input type="text" class="form-control buscar-distrito" placeholder="Buscar distrito...">
                <select class="form-select mt-2" data-field="edit_distrito"><option value="">Seleccione</option></select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Contacto de Entrega</label><input class="form-control" data-field="edit_responsable" value="${escapeHtml(data.responsable || '')}"></div>
            <div class="col-md-6 mb-3"><label>Teléfono</label><input class="form-control" data-field="edit_telefono_punto" value="${escapeHtml(data.telefono_contacto || '')}"></div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3"><label>Condición de Pago</label>
                <select data-field="edit_condicion_pago" class="form-select select-condicion-pago">
                    <option value="">Seleccione</option>
                    <option value="Contado" ${data.condicion_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option value="Credito" ${data.condicion_pago === 'Credito' ? 'selected' : ''}>Crédito</option>
                </select>
            </div>
            <div class="col-md-6 mb-3 campo-credito" style="display:${data.condicion_pago === 'Credito' ? 'block' : 'none'}">
                <label>Tiempo de Crédito</label><input type="text" class="form-control" data-field="edit_tiempo_credito" placeholder="Ej: 30 días" value="${escapeHtml(data.tiempo_credito || '')}">
            </div>
        </div>
        <div class="checkbox-group"><input type="checkbox" data-field="principal_punto" ${data.principal_punto ? 'checked' : ''}> <label>Principal</label></div>
    `;
    container.appendChild(div);

    // Inicializar eventos pasando data para evitar que dispatchEvent pise los valores
    inicializarEventosPunto(div, data);

    // ─── CARGAR PROVINCIA Y DISTRITO SI YA EXISTEN ───
    if (data.departamento) {
        const selDep  = div.querySelector('[data-field="edit_departamento"]');
        const selProv = div.querySelector('[data-field="edit_provincia"]');
        const selDist = div.querySelector('[data-field="edit_distrito"]');

        selDep.value = data.departamento;

        if (ubigeo[data.departamento]) {
            selProv.innerHTML = '<option value="">Seleccione</option>';
            Object.keys(ubigeo[data.departamento]).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                if (p === data.provincia) opt.selected = true;
                selProv.appendChild(opt);
            });
        }

        if (data.provincia && ubigeo[data.departamento]?.[data.provincia]) {
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
// INICIALIZAR EVENTOS DE PUNTO
// =========================================
function inicializarEventosPunto(div, data = {}) {
    const selectDepartamento  = div.querySelector('[data-field="departamento"], [data-field="edit_departamento"]');
    const selectProvincia     = div.querySelector('[data-field="provincia"], [data-field="edit_provincia"]');
    const selectDistrito      = div.querySelector('[data-field="distrito"], [data-field="edit_distrito"]');
    const buscarDepartamento  = div.querySelector('.buscar-departamento');
    const buscarProvincia     = div.querySelector('.buscar-provincia');
    const buscarDistrito      = div.querySelector('.buscar-distrito');
    const selectCondicionPago = div.querySelector('.select-condicion-pago');
    const campoCredito        = div.querySelector('.campo-credito');

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
            if (selectDistrito)  selectDistrito.innerHTML  = '<option value="">Seleccione</option>';
            if (!ubigeo[departamento]) return;
            Object.keys(ubigeo[departamento]).forEach(provincia => {
                if (selectProvincia) selectProvincia.innerHTML += `<option value="${provincia}">${provincia}</option>`;
            });
        });

        // ✅ Solo disparar si NO hay datos precargados
        if (!data.departamento) {
            selectDepartamento.dispatchEvent(new Event('change'));
        }
    }

    if (selectProvincia) {
        selectProvincia.addEventListener('change', function() {
            const departamento = selectDepartamento ? selectDepartamento.value : '';
            const provincia    = this.value;
            if (selectDistrito) selectDistrito.innerHTML = '<option value="">Seleccione</option>';
            if (!ubigeo[departamento] || !ubigeo[departamento][provincia]) return;
            ubigeo[departamento][provincia].forEach(distrito => {
                if (selectDistrito) selectDistrito.innerHTML += `<option value="${distrito}">${distrito}</option>`;
            });
        });
    }

    if (selectCondicionPago && campoCredito) {
        selectCondicionPago.addEventListener('change', function() {
            campoCredito.style.display = this.value === 'Credito' ? 'block' : 'none';
        });
    }
}

// =========================================
// FILTROS Y BÚSQUEDA DE CLIENTES (VERSIÓN LIMPIA)
// =========================================

let timeoutBusqueda = null;

// Cargar clientes (principal)
async function cargarClientes(filtros = {}) {
    const tbody = document.getElementById("tbody-clientes");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <br>Cargando clientes...
    </td></tr>`;

    try {
        let url = "/api/clientes/buscar";
        const params = new URLSearchParams();

        if (filtros.tipo) params.append("tipo_documento", filtros.tipo);
        if (filtros.busqueda && filtros.busqueda.trim()) {
            params.append("busqueda", filtros.busqueda.trim());
        }

        if (params.toString()) url += "?" + params.toString();

        console.log("🔍 Buscando →", url);

        const res = await fetch(url);
        const json = await res.json();

        console.log("📥 Respuesta:", json);

        if (!json.success) {
            throw new Error(json.error || "Error al cargar clientes");
        }

        const clientes = json.data || [];

        tbody.innerHTML = "";

        if (clientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">
                <i class="bi bi-search" style="font-size: 3rem;"></i><br>
                No se encontraron resultados
            </td></tr>`;
            return;
        }

        // Rellenar tabla
        clientes.forEach(c => {
            const contactos = (c.contactos?.length) 
                ? c.contactos.map(ct => `📞 ${escapeHtml(ct.nombre_contacto || '')}`).join('<br>') 
                : '<em class="text-muted">Sin contactos</em>';

            const puntos = (c.puntos_entrega?.length) 
                ? c.puntos_entrega.map(p => `📦 ${escapeHtml(p.nombre_punto || '')}`).join('<br>') 
                : '<em class="text-muted">Sin puntos</em>';

            const condicionPago = c.puntos_entrega?.[0]?.condicion_pago || '-';
            const codigoCliente = c.codigo_cliente || `---`;

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
                        <button class="btn-action btn-edit" onclick="abrirModalEditar(${c.id})" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="abrirModalEliminar(${c.id})" title="Eliminar">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (e) {
        console.error("Error:", e);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-danger">
            Error al cargar clientes: ${e.message}
        </td></tr>`;
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

    // Carga inicial
    cargarClientes();
}

// =========================================
// APLICAR FILTROS
// =========================================
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
        
        // Limpiar contenedores
        document.getElementById('edit_listaContactos').innerHTML = '';
        document.getElementById('edit_listaPuntos').innerHTML = '';
        
        // Llenar datos básicos
        document.getElementById('edit_id').value = c.id;
        document.getElementById('edit_tipo_documento').value = c.tipo_documento || '';
        document.getElementById('edit_numero_documento').value = c.numero_documento || '';
        document.getElementById('edit_razon_social').value = c.razon_social || '';
        document.getElementById('edit_nombre_comercial').value = c.nombre_comercial || '';
        document.getElementById('edit_direccion_fiscal').value = c.direccion_fiscal || '';
        actualizarPlaceholderDocumento('edit_');
        
        // Cargar contactos
        if (c.contactos && c.contactos.length > 0) {
            c.contactos.forEach(contacto => agregarContactoEdicion(contacto));
        } else {
            agregarContactoEdicion(); // Agregar uno vacío por defecto
        }
        
        // Cargar puntos de entrega
        if (c.puntos_entrega && c.puntos_entrega.length > 0) {
            c.puntos_entrega.forEach(punto => agregarPuntoEdicion(punto));
        } else {
            agregarPuntoEdicion(); // Agregar uno vacío por defecto
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
    
    // Validar campos requeridos
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
    
    // Recoger contactos
    document.querySelectorAll('#edit_listaContactos .item-agregable').forEach(item => {
        const nombreContacto = item.querySelector('[data-field="edit_nombre_contacto"]')?.value.trim();
        if (nombreContacto) { // Solo agregar si tiene nombre
            data.contactos.push({
                nombre_contacto: nombreContacto,
                cargo: item.querySelector('[data-field="edit_cargo"]')?.value.trim() || '',
                email: item.querySelector('[data-field="edit_email"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="edit_telefono"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        }
    });
    
    // Recoger puntos de entrega
    document.querySelectorAll('#edit_listaPuntos .item-agregable').forEach(item => {
        const nombrePunto = item.querySelector('[data-field="edit_nombre_punto"]')?.value.trim();
        if (nombrePunto) { // Solo agregar si tiene nombre
            data.puntos_entrega.push({
                nombre_punto: nombrePunto,
                direccion: item.querySelector('[data-field="edit_direccion"]')?.value.trim() || '',
                departamento: item.querySelector('[data-field="edit_departamento"]')?.value || '',
                provincia: item.querySelector('[data-field="edit_provincia"]')?.value || '',
                distrito: item.querySelector('[data-field="edit_distrito"]')?.value || '',
                responsable: item.querySelector('[data-field="edit_responsable"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="edit_telefono_punto"]')?.value.trim() || '',
                condicion_pago: item.querySelector('[data-field="edit_condicion_pago"]')?.value || '',
                tiempo_credito: item.querySelector('[data-field="edit_tiempo_credito"]')?.value.trim() || '',
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
            mostrarNotificacion(`✅ Cliente actualizado exitosamente`, 'exito');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente'));
            if (modal) modal.hide();
            await cargarClientes();
        } else {
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
    
    // Validar campos requeridos
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
    
    // Recoger contactos
    document.querySelectorAll('#listaContactos .item-agregable').forEach(item => {
        const nombreContacto = item.querySelector('[data-field="nombre_contacto"]')?.value.trim();
        if (nombreContacto) { // Solo agregar si tiene nombre
            data.contactos.push({
                nombre_contacto: nombreContacto,
                cargo: item.querySelector('[data-field="cargo"]')?.value.trim() || '',
                email: item.querySelector('[data-field="email"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        }
    });
    
    // Recoger puntos de entrega
    document.querySelectorAll('#listaPuntos .item-agregable').forEach(item => {
        const nombrePunto = item.querySelector('[data-field="nombre_punto"]')?.value.trim();
        if (nombrePunto) { // Solo agregar si tiene nombre
            data.puntos_entrega.push({
                nombre_punto: nombrePunto,
                direccion: item.querySelector('[data-field="direccion"]')?.value.trim() || '',
                departamento: item.querySelector('[data-field="departamento"]')?.value || '',
                provincia: item.querySelector('[data-field="provincia"]')?.value || '',
                distrito: item.querySelector('[data-field="distrito"]')?.value || '',
                responsable: item.querySelector('[data-field="responsable"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono_punto"]')?.value.trim() || '',
                condicion_pago: item.querySelector('[data-field="condicion_pago"]')?.value || '',
                tiempo_credito: item.querySelector('[data-field="tiempo_credito"]')?.value.trim() || '',
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
            const codigoGenerado = json.data?.codigo_cliente || 'Generado';
            mostrarNotificacion(`✅ Cliente guardado exitosamente\nCódigo: ${codigoGenerado}\nRazón Social: ${data.razon_social}\nDocumento: ${data.tipo_documento}: ${data.numero_documento}`, 'exito');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalCliente'));
            if (modal) modal.hide();
            
            // Limpiar formulario
            document.getElementById('formCliente').reset();
            document.getElementById('listaContactos').innerHTML = '';
            document.getElementById('listaPuntos').innerHTML = '';
            
            // Agregar items por defecto
            agregarContactoNuevo();
            agregarPuntoNuevo();
            
            // Recargar tabla
            await cargarClientes();
        } else {
            mostrarNotificacion("❌ Error: " + json.error, 'error');
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        mostrarNotificacion("Error al guardar: " + error.message, 'error');
    }
});

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

// Inicializar items por defecto en los modales
setTimeout(() => {
    if (document.getElementById('listaContactos') && document.getElementById('listaContactos').children.length === 0) {
        agregarContactoNuevo();
    }
    if (document.getElementById('listaPuntos') && document.getElementById('listaPuntos').children.length === 0) {
        agregarPuntoNuevo();
    }
    if (document.getElementById('edit_listaContactos') && document.getElementById('edit_listaContactos').children.length === 0) {
        // No inicializar aquí para no interferir con la carga de datos
    }
}, 100);
// =========================================
// INICIALIZAR AL CARGAR LA PÁGINA
// =========================================
document.addEventListener("DOMContentLoaded", inicializarFiltros);