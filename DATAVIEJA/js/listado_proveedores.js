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
    const iconos  = { exito: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

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
        font-family: Arial, sans-serif;
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
// ESCAPAR HTML
// =========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// VARIABLES GLOBALES
// =========================================
let proveedoresCache = [];

// =========================================
// INICIALIZACIÓN — TODO dentro del DOMContentLoaded
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarProveedores();
    inicializarFiltros();
    inicializarModalEliminar();
    inicializarFormEditar();
});

// =========================================
// CARGAR PROVEEDORES
// =========================================
async function cargarProveedores(filtros = {}) {
    const tbody = document.getElementById("tbody-proveedores");
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">Cargando proveedores...</p>
            </td>
        </tr>`;

    try {
        let url = "/api/proveedores/listar";
        const params = new URLSearchParams();

        if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
        if (filtros.codigo)   params.append("codigo", filtros.codigo);

        if (params.toString()) url += "?" + params.toString();

        const res = await fetch(url);
        const json = await res.json();

        const proveedores = json.data || [];
        proveedoresCache = proveedores;
        tbody.innerHTML = "";

        if (proveedores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 2.5rem;"></i>
                        <p class="mt-3">No se encontraron proveedores</p>
                    </td>
                </tr>`;
            return;
        }

        proveedores.forEach(p => {
            const codigo = p.codigo_proveedor || '---';
            tbody.innerHTML += `
                <tr>
                    <td class="text-center">${p.id || '-'}</td>
                    <td class="text-center"><strong>${escapeHtml(codigo)}</strong></td>
                    <td>${escapeHtml(p.razon_social) || '-'}</td>
                    <td class="text-center">${p.ruc || p.numero_documento || '-'}</td>
                    <td>${escapeHtml(p.direccion) || '-'}</td>
                    <td>${p.telefono || '-'}</td>
                    <td>${escapeHtml(p.contacto) || '-'}</td>
                    <td>${p.email || '-'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-info me-1" onclick="abrirModalVerProveedor(${p.id})" title="Ver detalle">👁️</button>
                        <button class="btn btn-sm btn-warning me-1" onclick="abrirModalEditarProveedor(${p.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="abrirModalEliminarProveedor(${p.id})" title="Eliminar">🗑️</button>
                    </td>
                </tr>`;
        });

    } catch (error) {
        console.error("Error al cargar proveedores:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <p class="mt-2">Error al cargar los proveedores</p>
                </td>
            </tr>`;
    }
}

// =========================================
// FILTROS
// =========================================
function inicializarFiltros() {
    const filtroBusqueda = document.getElementById("filtro-busqueda");
    const searchCodigo = document.getElementById("search-codigo");

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    if (filtroBusqueda) filtroBusqueda.addEventListener("input", debounce(aplicarFiltros, 500));
    if (searchCodigo) searchCodigo.addEventListener("input", debounce(aplicarFiltros, 500));
}

// =========================================
// APLICAR FILTROS
// =========================================
function aplicarFiltros() {
    const busqueda = document.getElementById("filtro-busqueda")?.value.trim() || "";
    const codigo = document.getElementById("search-codigo")?.value.trim() || "";
    cargarProveedores({ busqueda, codigo });
}

// =========================================
// MODAL VER PROVEEDOR
// =========================================
window.abrirModalVerProveedor = async function(id) {
    const modalElement = document.getElementById('modalVerProveedor');
    const modalBody    = document.getElementById('modalVerBody');

    if (!modalElement || !modalBody) {
        mostrarNotificacion("Error: Modal de detalle no encontrado", 'error');
        return;
    }

    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Cargando detalle del proveedor...</p>
        </div>`;

    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true
    });
    modal.show();

    try {
        const res = await fetch(`/api/proveedores/${id}`);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json.success || !json.data) {
            throw new Error(json.error || "Proveedor no encontrado");
        }

        const p = json.data;

        const fila = (label, valor) => `
            <div class="col-md-4 mb-3">
                <small class="text-muted d-block fw-bold">${label}</small>
                <span>${escapeHtml(valor || '') || '<span class="text-muted">—</span>'}</span>
            </div>`;

        modalBody.innerHTML = `
            <div class="d-flex align-items-center gap-3 mb-4 p-3"
                 style="background: linear-gradient(135deg,#111827,#1f2937); border-radius:12px; color:white;">
                <div style="width:55px;height:55px;border-radius:12px;
                            background:linear-gradient(135deg,#d90429,#ef233c);
                            display:flex;align-items:center;justify-content:center;font-size:22px;">
                    🏢
                </div>
                <div>
                    <h5 class="mb-0">${escapeHtml(p.razon_social)}</h5>
                    <small style="color:#cbd5e1;">
                        ${escapeHtml(p.codigo_proveedor || '')} · RUC: ${p.ruc || '—'}
                    </small>
                </div>
            </div>

            <h6 class="fw-bold mb-3" style="border-bottom:2px solid #d90429; padding-bottom:6px;">
                📋 Información General
            </h6>
            <div class="row mb-4">
                ${fila('Razón Social', p.razon_social)}
                ${fila('Razón Comercial', p.razon_comercial)}
                ${fila('RUC', p.ruc)}
                ${fila('Dirección', p.direccion)}
                ${fila('Contacto', p.contacto)}
                ${fila('Teléfono', p.telefono)}
                ${fila('Email', p.email)}
                ${fila('Condición Pago', p.condicion_pago)}
                ${p.condicion_pago === 'Credito' ? fila('Tiempo Crédito', p.tiempo_credito) : ''}
            </div>

            <h6 class="fw-bold mb-3" style="border-bottom:2px solid #d90429; padding-bottom:6px;">
                🏦 Información Bancaria
            </h6>
            <div class="row mb-4">
                ${fila('Banco', p.banco)}
                ${fila('Nro. Cuenta', p.numero_cuenta)}
                ${fila('CCI', p.cci)}
            </div>

            <h6 class="fw-bold mb-3" style="border-bottom:2px solid #d90429; padding-bottom:6px;">
                🚚 Información Logística
            </h6>
            <div class="row">
                ${fila('Lugar de Recojo', p.lugar_recojo)}
            </div>`;
            
    } catch (error) {
        console.error("Error al cargar detalle:", error);
        modalBody.innerHTML = `
            <div class="text-center py-5 text-danger">
                <i class="bi bi-exclamation-triangle-fill fs-1"></i>
                <p class="mt-3">Error al cargar el detalle del proveedor</p>
                <small class="text-muted">ID: ${id} - ${error.message}</small>
            </div>`;
    }
};

// =========================================
// MODAL EDITAR — ABRIR
// =========================================
window.abrirModalEditarProveedor = async function(id) {
    const modalElement = document.getElementById('modalEditarProveedor');
    if (!modalElement) {
        mostrarNotificacion("Error: Modal de edición no encontrado", 'error');
        return;
    }

    try {
        const res  = await fetch(`/api/proveedores/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || "Error al cargar");

        const p = json.data;

        const setValue = (elId, value) => {
            const el = document.getElementById(elId);
            if (el) el.value = value || '';
        };

        setValue('edit_id_proveedor',             p.id);
        setValue('edit_razon_social_proveedor',   p.razon_social);
        setValue('edit_razon_comercial_proveedor', p.razon_comercial);
        setValue('edit_direccion_proveedor',       p.direccion);
        setValue('edit_ruc_proveedor',             p.ruc || p.numero_documento);
        setValue('edit_contacto_proveedor',        p.contacto);
        setValue('edit_telefono_proveedor',        p.telefono);
        setValue('edit_email_proveedor',           p.email);
        setValue('edit_condicion_pago_proveedor',  p.condicion_pago);
        setValue('edit_tiempo_credito_proveedor',  p.tiempo_credito);
        setValue('edit_banco_proveedor',           p.banco);
        setValue('edit_numero_cuenta_proveedor',   p.numero_cuenta);
        setValue('edit_cci_proveedor',             p.cci);
        setValue('edit_lugar_recojo_proveedor',    p.lugar_recojo);

        const editCampo = document.getElementById('edit_campo_tiempo_credito_proveedor');
        if (editCampo) {
            editCampo.style.display = p.condicion_pago === 'Credito' ? 'block' : 'none';
        }

        const modal = new bootstrap.Modal(modalElement);
        modal.show();

    } catch (error) {
        console.error("Error al cargar proveedor:", error);
        mostrarNotificacion("Error cargando proveedor: " + error.message, 'error');
    }
};

// =========================================
// MODAL EDITAR — GUARDAR
// =========================================
function inicializarFormEditar() {
    const formEditar = document.getElementById('formEditarProveedor');
    if (!formEditar) return;

    // Eliminar listeners anteriores
    const newForm = formEditar.cloneNode(true);
    formEditar.parentNode.replaceChild(newForm, formEditar);

    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const id = document.getElementById('edit_id_proveedor')?.value;
        if (!id) {
            mostrarNotificacion("ID de proveedor no encontrado", 'error');
            return;
        }

        const data = {
            razon_social:    document.getElementById('edit_razon_social_proveedor')?.value   || '',
            razon_comercial: document.getElementById('edit_razon_comercial_proveedor')?.value || '',
            direccion:       document.getElementById('edit_direccion_proveedor')?.value       || '',
            ruc:             document.getElementById('edit_ruc_proveedor')?.value             || '',
            contacto:        document.getElementById('edit_contacto_proveedor')?.value        || '',
            telefono:        document.getElementById('edit_telefono_proveedor')?.value        || '',
            email:           document.getElementById('edit_email_proveedor')?.value           || '',
            condicion_pago:  document.getElementById('edit_condicion_pago_proveedor')?.value  || '',
            tiempo_credito:  document.getElementById('edit_tiempo_credito_proveedor')?.value  || '',
            banco:           document.getElementById('edit_banco_proveedor')?.value           || '',
            numero_cuenta:   document.getElementById('edit_numero_cuenta_proveedor')?.value   || '',
            cci:             document.getElementById('edit_cci_proveedor')?.value             || '',
            lugar_recojo:    document.getElementById('edit_lugar_recojo_proveedor')?.value    || ''
        };

        // Deshabilitar botón
        const btnGuardar = document.querySelector('#formEditarProveedor button[type="submit"]');
        const textoOriginal = btnGuardar?.innerHTML;
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';
        }

        try {
            const res  = await fetch(`/api/proveedores/${id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(data)
            });

            const json = await res.json();

            if (json.success) {
                mostrarNotificacion('✅ Proveedor actualizado correctamente', 'exito');

                const modal = bootstrap.Modal.getInstance(
                    document.getElementById('modalEditarProveedor')
                );
                if (modal) modal.hide();

                await cargarProveedores();
            } else {
                mostrarNotificacion("❌ Error: " + (json.error || "No se pudo actualizar"), 'error');
            }

        } catch (error) {
            console.error("Error en actualización:", error);
            mostrarNotificacion("❌ Error al actualizar: " + error.message, 'error');
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = textoOriginal;
            }
        }
    });
}

// =========================================
// MODAL ELIMINAR — ABRIR (MEJORADO)
// =========================================
window.abrirModalEliminarProveedor = async function(id) {
    const deleteInput = document.getElementById('delete_id_proveedor');
    const modalElement = document.getElementById('modalEliminarProveedor');
    const proveedorInfoDiv = document.getElementById('proveedorAEliminarInfo');

    if (!deleteInput || !modalElement) {
        mostrarNotificacion("Error: Elemento no encontrado", 'error');
        return;
    }

    // Mostrar loading
    if (proveedorInfoDiv) {
        proveedorInfoDiv.innerHTML = `
            <div class="text-center py-2">
                <div class="spinner-border spinner-border-sm text-danger"></div>
                <span class="ms-2">Cargando información...</span>
            </div>
        `;
    }
    
    deleteInput.value = id;
    
    // Intentar obtener los datos del proveedor para mostrar su nombre
    try {
        const res = await fetch(`/api/proveedores/${id}`);
        const json = await res.json();
        
        if (json.success && json.data) {
            const p = json.data;
            const nombreProveedor = p.razon_social || `ID: ${id}`;
            const codigoProveedor = p.codigo_proveedor || '---';
            
            if (proveedorInfoDiv) {
                proveedorInfoDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-building fs-4 me-2"></i>
                        <strong>${escapeHtml(nombreProveedor)}</strong><br>
                        <small>Código: ${escapeHtml(codigoProveedor)} | RUC: ${p.ruc || '---'}</small>
                    </div>
                `;
            }
        } else {
            if (proveedorInfoDiv) {
                proveedorInfoDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        No se pudo cargar la información del proveedor ID: ${id}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error cargando proveedor:", error);
        if (proveedorInfoDiv) {
            proveedorInfoDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    Proveedor ID: ${id}
                </div>
            `;
        }
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
};

// =========================================
// MODAL ELIMINAR — CONFIRMAR (MEJORADO)
// =========================================
function inicializarModalEliminar() {
    const btnConfirmar = document.getElementById('btnConfirmarEliminarProveedor');
    if (!btnConfirmar) return;

    // Clonar para evitar duplicar listeners
    const newBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar);

    newBtn.addEventListener('click', async function() {
        const id = document.getElementById('delete_id_proveedor')?.value;
        if (!id) {
            mostrarNotificacion("ID de proveedor no encontrado", 'error');
            return;
        }

        // Guardar referencia del botón
        const btnOriginal = this;
        const textoOriginal = btnOriginal.innerHTML;
        
        // Deshabilitar botón y mostrar loading
        btnOriginal.disabled = true;
        btnOriginal.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Eliminando...';

        try {
            console.log(`🔍 Intentando eliminar proveedor ID: ${id}`);
            
            const res = await fetch(`/api/proveedores/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📡 Status code: ${res.status}`);
            
            let json;
            try {
                const textResponse = await res.text();
                console.log(`📄 Respuesta: ${textResponse}`);
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                json = { success: false, error: 'Error en la respuesta del servidor' };
            }

            if (res.ok && json.success) {
                mostrarNotificacion('✅ Proveedor eliminado correctamente', 'exito');

                const modal = bootstrap.Modal.getInstance(
                    document.getElementById('modalEliminarProveedor')
                );
                if (modal) modal.hide();

                await cargarProveedores();
            } else {
                const errorMsg = json.error || json.message || `Error HTTP ${res.status}`;
                mostrarNotificacion(`❌ Error: ${errorMsg}`, 'error');
                console.error('❌ Error detallado:', json);
            }

        } catch (error) {
            console.error("❌ Error en petición:", error);
            mostrarNotificacion(`❌ Error de conexión: ${error.message}`, 'error');
        } finally {
            btnOriginal.disabled = false;
            btnOriginal.innerHTML = textoOriginal;
        }
    });
}

// =========================================
// COMPATIBILIDAD LEGACY
// =========================================
function editarProveedor(id)   { abrirModalEditarProveedor(id); }
function eliminarProveedor(id) { abrirModalEliminarProveedor(id); }
function verProveedor(id)      { abrirModalVerProveedor(id); }