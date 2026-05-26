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
// ESCAPAR HTML
// =========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarProveedores();
    inicializarFiltros();
    inicializarEventosCondicionPago();
    inicializarModalEliminar();
});

// =========================================
// VARIABLES GLOBALES
// =========================================
let proveedoresCache = [];

// =========================================
// LISTAR PROVEEDORES
// =========================================
async function cargarProveedores(filtros = {}) {
    const tbody = document.getElementById("tbody-proveedores");
    
    if (!tbody) return;
    
    try {
        let url = "/api/proveedores/listar";
        const params = new URLSearchParams();
        
        if (filtros.tipo) params.append("tipo_documento", filtros.tipo);
        if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
        
        if (params.toString()) {
            url += "?" + params.toString();
        }
        
        const res = await fetch(url);
        const json = await res.json();
        
        const proveedores = json.data || [];
        proveedoresCache = proveedores;

        tbody.innerHTML = "";

        if (proveedores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No hay proveedores registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        proveedores.forEach(p => {
            const codigoProveedor = p.codigo_proveedor || '---';
            
            // 9 columnas: ID, Código, Razón Social, RUC, Dirección, Teléfono, Contacto, Email, Acciones
            const fila = `
                <tr>
                    <td class="text-center">${p.id || '-'}</td>
                    <td class="text-center"><strong>${escapeHtml(codigoProveedor)}</strong></td>
                    <td>${escapeHtml(p.razon_social) || '-'}</td>
                    <td class="text-center">${p.ruc || p.numero_documento || '-'}</td>
                    <td>${escapeHtml(p.direccion) || '-'}</td>
                    <td>${p.telefono || '-'}</td>
                    <td>${escapeHtml(p.contacto) || '-'}</td>
                    <td>${p.email || '-'}</td>
                    <td class="text-center">
                        <button class="btn-action btn-edit" 
                            onclick="abrirModalEditarProveedor(${p.id})" 
                            title="Editar proveedor">
                            ✏️
                        </button>
                        <button class="btn-action btn-delete" 
                            onclick="abrirModalEliminarProveedor(${p.id})" 
                            title="Eliminar proveedor">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });

    } catch (error) {
        console.error("Error al cargar proveedores:", error);
        const tbody = document.getElementById("tbody-proveedores");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5 text-danger">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <p class="mt-2">Error al cargar los proveedores</p>
                    </td>
                </tr>
            `;
        }
    }
}

// =========================================
// INICIALIZAR FILTROS
// =========================================
function inicializarFiltros() {
    const filtroTipo = document.getElementById("filtro-tipo");
    const filtroBusqueda = document.getElementById("filtro-busqueda");
    
    if (filtroTipo) {
        filtroTipo.addEventListener("change", () => {
            aplicarFiltros();
        });
    }
    
    if (filtroBusqueda) {
        let timeout;
        filtroBusqueda.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                aplicarFiltros();
            }, 500);
        });
    }
}

function aplicarFiltros() {
    const tipo = document.getElementById("filtro-tipo")?.value || "";
    const busqueda = document.getElementById("filtro-busqueda")?.value || "";
    
    cargarProveedores({
        tipo: tipo,
        busqueda: busqueda
    });
}

// =========================================
// INICIALIZAR EVENTOS CONDICIÓN DE PAGO
// =========================================
function inicializarEventosCondicionPago() {
    // Para el formulario nuevo
    const condicionPago = document.getElementById('condicion_pago');
    const campoTiempo = document.getElementById('campo_tiempo_credito');
    
    if (condicionPago && campoTiempo) {
        condicionPago.addEventListener('change', function() {
            campoTiempo.style.display = this.value === 'Credito' ? 'block' : 'none';
        });
    }
    
    // Para el formulario de edición
    const editCondicionPago = document.getElementById('edit_condicion_pago_proveedor');
    const editCampoTiempo = document.getElementById('edit_campo_tiempo_credito_proveedor');
    
    if (editCondicionPago && editCampoTiempo) {
        editCondicionPago.addEventListener('change', function() {
            editCampoTiempo.style.display = this.value === 'Credito' ? 'block' : 'none';
        });
    }
}

// =========================================
// ABRIR MODAL EDITAR
// =========================================
window.abrirModalEditarProveedor = async function(id) {
    console.log("Editando proveedor ID:", id);
    
    // Verificar que el modal existe
    const modalElement = document.getElementById('modalEditarProveedor');
    if (!modalElement) {
        console.error("No se encontró el modal de edición");
        mostrarNotificacion("Error: Modal de edición no encontrado", 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/proveedores/${id}`);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        
        if (!json.success || !json.data) {
            throw new Error(json.error || "Error al cargar los datos");
        }
        
        const p = json.data;
        
        // Función helper para setear valor verificando que el elemento existe
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value || '';
            } else {
                console.warn(`Elemento no encontrado: ${id}`);
            }
        };
        
        // Llenar los campos del formulario de edición
        setValue('edit_id_proveedor', p.id);
        setValue('edit_razon_social_proveedor', p.razon_social);
        setValue('edit_razon_comercial_proveedor', p.razon_comercial);
        setValue('edit_direccion_proveedor', p.direccion);
        setValue('edit_ruc_proveedor', p.ruc || p.numero_documento);
        setValue('edit_contacto_proveedor', p.contacto);
        setValue('edit_telefono_proveedor', p.telefono);
        setValue('edit_email_proveedor', p.email);
        setValue('edit_condicion_pago_proveedor', p.condicion_pago);
        setValue('edit_tiempo_credito_proveedor', p.tiempo_credito);
        setValue('edit_banco_proveedor', p.banco);
        setValue('edit_numero_cuenta_cci_proveedor', p.numero_cuenta_cci);
        setValue('edit_lugar_recojo_proveedor', p.lugar_recojo);
        
        // Mostrar/ocultar campo tiempo crédito según la condición
        const editCampoTiempo = document.getElementById('edit_campo_tiempo_credito_proveedor');
        if (editCampoTiempo) {
            editCampoTiempo.style.display = p.condicion_pago === 'Credito' ? 'block' : 'none';
        }
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error("Error al cargar proveedor:", error);
        mostrarNotificacion("Error cargando proveedor: " + error.message, 'error');
    }
}

// =========================================
// GUARDAR EDICIÓN
// =========================================
const formEditar = document.getElementById('formEditarProveedor');
if (formEditar) {
    formEditar.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit_id_proveedor')?.value;
        
        if (!id) {
            mostrarNotificacion("ID de proveedor no encontrado", 'error');
            return;
        }
        
        const data = {
            razon_social: document.getElementById('edit_razon_social_proveedor')?.value || '',
            razon_comercial: document.getElementById('edit_razon_comercial_proveedor')?.value || '',
            direccion: document.getElementById('edit_direccion_proveedor')?.value || '',
            numero_documento: document.getElementById('edit_ruc_proveedor')?.value || '',
            contacto: document.getElementById('edit_contacto_proveedor')?.value || '',
            telefono: document.getElementById('edit_telefono_proveedor')?.value || '',
            email: document.getElementById('edit_email_proveedor')?.value || '',
            condicion_pago: document.getElementById('edit_condicion_pago_proveedor')?.value || '',
            tiempo_credito: document.getElementById('edit_tiempo_credito_proveedor')?.value || '',
            banco: document.getElementById('edit_banco_proveedor')?.value || '',
            numero_cuenta_cci: document.getElementById('edit_numero_cuenta_cci_proveedor')?.value || '',
            lugar_recojo: document.getElementById('edit_lugar_recojo_proveedor')?.value || ''
        };
        
        console.log("Enviando datos de actualización:", data);
        
        try {
            const res = await fetch(`/api/proveedores/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const json = await res.json();
            
            if (json.success) {
                mostrarNotificacion(`✅ Proveedor actualizado correctamente`, 'exito');
                
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(
                    document.getElementById('modalEditarProveedor')
                );
                if (modal) modal.hide();
                
                // Recargar tabla
                await cargarProveedores();
                
            } else {
                mostrarNotificacion("❌ Error: " + (json.error || "No se pudo actualizar"), 'error');
            }
            
        } catch (error) {
            console.error("Error en actualización:", error);
            mostrarNotificacion("Error al actualizar proveedor: " + error.message, 'error');
        }
    });
}

// =========================================
// ABRIR MODAL ELIMINAR
// =========================================
window.abrirModalEliminarProveedor = function(id) {
    console.log("Eliminando proveedor ID:", id);
    
    const deleteInput = document.getElementById('delete_id_proveedor');
    const modalElement = document.getElementById('modalEliminarProveedor');
    
    if (!deleteInput) {
        console.error("No se encontró el input delete_id_proveedor");
        mostrarNotificacion("Error: Elemento no encontrado", 'error');
        return;
    }
    
    if (!modalElement) {
        console.error("No se encontró el modal de eliminar");
        mostrarNotificacion("Error: Modal no encontrado", 'error');
        return;
    }
    
    deleteInput.value = id;
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// =========================================
// INICIALIZAR MODAL ELIMINAR
// =========================================
function inicializarModalEliminar() {
    const btnConfirmar = document.getElementById('btnConfirmarEliminarProveedor');
    if (btnConfirmar) {
        // Remover event listeners anteriores para evitar duplicados
        const newBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar);
        
        newBtn.addEventListener('click', async function() {
            const id = document.getElementById('delete_id_proveedor')?.value;
            console.log("Confirmando eliminación de ID:", id);
            
            if (!id) {
                mostrarNotificacion("ID de proveedor no encontrado", 'error');
                return;
            }
            
            try {
                const res = await fetch(`/api/proveedores/${id}`, {
                    method: 'DELETE'
                });
                
                const json = await res.json();
                
                if (json.success) {
                    mostrarNotificacion(`✅ Proveedor eliminado correctamente`, 'exito');
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminarProveedor'));
                    if (modal) modal.hide();
                    
                    // Recargar tabla
                    await cargarProveedores();
                } else {
                    mostrarNotificacion("❌ Error: " + (json.error || "No se pudo eliminar"), 'error');
                }
            } catch (error) {
                console.error("Error eliminando:", error);
                mostrarNotificacion("Error al eliminar proveedor: " + error.message, 'error');
            }
        });
    } else {
        console.warn("No se encontró el botón btnConfirmarEliminarProveedor");
    }
}

// =========================================
// FUNCIONES LEGACY PARA COMPATIBILIDAD
// =========================================
function editarProveedor(id) {
    abrirModalEditarProveedor(id);
}

function eliminarProveedor(id) {
    abrirModalEliminarProveedor(id);
}