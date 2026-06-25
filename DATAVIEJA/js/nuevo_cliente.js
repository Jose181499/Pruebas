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
// FUNCIONES DE ESCAPE
// =========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// PLACEHOLDER DOCUMENTO
// =========================================
function actualizarPlaceholderDocumento() {
    const tipo = document.getElementById('tipo_documento').value;
    const input = document.getElementById('numero_documento');
    const label = document.getElementById('label_documento');

    if (tipo === 'RUC') {
        input.placeholder = '11 dígitos';
        input.maxLength = 11;
        if (label) label.innerHTML = 'RUC *:';
    } else if (tipo === 'DNI') {
        input.placeholder = '8 dígitos';
        input.maxLength = 8;
        if (label) label.innerHTML = 'DNI *:';
    } else if (tipo === 'CE') {
        input.placeholder = '9 dígitos';
        input.maxLength = 9;
        if (label) label.innerHTML = 'CE *:';
    } else {
        input.placeholder = 'Ingrese el número';
        input.maxLength = 20;
        if (label) label.innerHTML = 'Número de Documento *:';
    }
}

// =========================================
// VALIDAR DOCUMENTO
// =========================================
function validarDocumento(tipo, numero) {
    if (tipo === 'RUC') {
        return /^\d{11}$/.test(numero);
    } else if (tipo === 'DNI') {
        return /^\d{8}$/.test(numero);
    } else if (tipo === 'CE') {
        return /^\d{9}$/.test(numero);
    }
    return true;
}

// =========================================
// CONSULTAR SUNAT
// =========================================
async function consultarSunat() {
    const tipoDoc = document.getElementById('tipo_documento').value;
    const numDoc = document.getElementById('numero_documento').value;
    const resultadoSpan = document.getElementById('sunat-resultado');
    
    if (tipoDoc !== 'RUC') {
        mostrarNotificacion(`⚠️ La consulta a Sunat solo está disponible para RUC`, 'warning');
        return;
    }
    
    if (!numDoc || numDoc.length !== 11) {
        mostrarNotificacion(`Ingrese un RUC válido de 11 dígitos`, 'warning');
        return;
    }
    
    const btn = document.getElementById('btnConsultarSunat');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Consultando...';
    btn.disabled = true;
    
    if (resultadoSpan) {
        resultadoSpan.innerHTML = '<i class="bi bi-hourglass-split text-info"></i> Consultando Sunat...';
    }
    
    try {
        const url = `/api/sunat/consulta?ruc=${numDoc}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            if (data.razon_social) {
                document.getElementById('razon_social').value = data.razon_social;
            }
            if (data.nombre_comercial) {
                document.getElementById('nombre_comercial').value = data.nombre_comercial;
            }
            if (data.direccion) {
                document.getElementById('direccion_fiscal').value = data.direccion;
            }
            
            if (resultadoSpan) {
                resultadoSpan.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> ✅ Datos cargados desde Sunat`;
                setTimeout(() => { if (resultadoSpan) resultadoSpan.innerHTML = ''; }, 5000);
            }
            mostrarNotificacion(`✅ Datos cargados desde Sunat: ${data.razon_social}`, 'exito');
        } else {
            const errorMsg = data.error || 'No se encontraron datos para este RUC';
            if (resultadoSpan) {
                resultadoSpan.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger"></i> ❌ ${errorMsg}`;
                setTimeout(() => { if (resultadoSpan) resultadoSpan.innerHTML = ''; }, 5000);
            }
            mostrarNotificacion(`❌ ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('Error consultando Sunat:', error);
        if (resultadoSpan) {
            resultadoSpan.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger"></i> Error de conexión`;
            setTimeout(() => { if (resultadoSpan) resultadoSpan.innerHTML = ''; }, 5000);
        }
        mostrarNotificacion(`❌ Error al consultar Sunat`, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let contadorContactos = 0;
    let contadorPuntos = 0;

    const listaContactos = document.getElementById('listaContactos');
    const listaPuntos = document.getElementById('listaPuntos');

    function actualizarContadores() {
        const contactosCount = document.getElementById('contactosCount');
        const puntosCount = document.getElementById('puntosCount');
        if (contactosCount) contactosCount.textContent = contadorContactos;
        if (puntosCount) puntosCount.textContent = contadorPuntos;
    }

    // =========================================
    // AGREGAR CONTACTO - VERSIÓN TARJETA MODERNA
    // =========================================
    function agregarContacto(data = {}) {
        contadorContactos++;
        const div = document.createElement('div');
        div.className = 'col-md-6';
        div.innerHTML = `
            <div class="item-agregable h-100" style="border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;position:relative;background:#ffffff;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <button type="button" class="btn-eliminar" style="position:absolute;top:12px;right:12px;background:#fee2e2;color:#dc2626;border:none;border-radius:50px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    <i class="bi bi-trash3"></i> Eliminar
                </button>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label fw-semibold small text-muted">Nombre Completo <span class="text-danger">*</span></label>
                        <input type="text" class="form-control custom-input" data-field="nombre_contacto" value="${escapeHtml(data.nombre_contacto || '')}" placeholder="Ej: Juan Pérez" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-12">
                        <label class="form-label fw-semibold small text-muted">Cargo</label>
                        <input type="text" class="form-control custom-input" data-field="cargo" value="${escapeHtml(data.cargo || '')}" placeholder="Ej: Gerente de Compras" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Email</label>
                        <input type="email" class="form-control custom-input" data-field="email" value="${escapeHtml(data.email || '')}" placeholder="correo@empresa.com" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Teléfono</label>
                        <input type="text" class="form-control custom-input" data-field="telefono" value="${escapeHtml(data.telefono || '')}" placeholder="Ej: 987654321" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-12">
                        <div class="checkbox-group d-flex align-items-center gap-2 pt-2 border-top" style="border-top:1px solid #f0f0f0;">
                            <input class="form-check-input" type="checkbox" data-field="principal" ${data.principal ? 'checked' : ''} id="principal_${Date.now()}" style="width:18px;height:18px;">
                            <label class="form-check-label small" style="color:#374151;">⭐ Marcar como contacto principal</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        listaContactos.appendChild(div);
        actualizarContadores();
    }

    // =========================================
    // AGREGAR PUNTO DE ENTREGA - VERSIÓN TARJETA MODERNA
    // =========================================
    function agregarPunto(data = {}) {
        contadorPuntos++;
        const div = document.createElement('div');
        div.className = 'col-md-6';
        div.innerHTML = `
            <div class="item-agregable h-100" style="border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;position:relative;background:#ffffff;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <button type="button" class="btn-eliminar" style="position:absolute;top:12px;right:12px;background:#fee2e2;color:#dc2626;border:none;border-radius:50px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    <i class="bi bi-trash3"></i> Eliminar
                </button>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label fw-semibold small text-muted">Nombre del Punto <span class="text-danger">*</span></label>
                        <input type="text" class="form-control custom-input" data-field="nombre_punto" value="${escapeHtml(data.nombre_punto || '')}" placeholder="Ej: Oficina Principal" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-12">
                        <label class="form-label fw-semibold small text-muted">Dirección Completa</label>
                        <input type="text" class="form-control custom-input" data-field="direccion" value="${escapeHtml(data.direccion || '')}" placeholder="Calle, número, urbanización" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Contacto de Entrega</label>
                        <input type="text" class="form-control custom-input" data-field="responsable" value="${escapeHtml(data.responsable || '')}" placeholder="Nombre del responsable" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Teléfono de Contacto</label>
                        <input type="text" class="form-control custom-input" data-field="telefono_punto" value="${escapeHtml(data.telefono_punto || data.telefono || '')}" placeholder="Teléfono del punto" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Condición de Pago</label>
                        <select data-field="condicion_pago" class="form-select custom-input select-condicion-pago" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                            <option value="">-- Seleccione --</option>
                            <option value="Contado" ${data.condicion_pago === 'Contado' ? 'selected' : ''}>💵 Contado</option>
                            <option value="Crédito 7 días" ${data.condicion_pago === 'Crédito 7 días' ? 'selected' : ''}>📆 Crédito 7 días</option>
                            <option value="Crédito 15 días" ${data.condicion_pago === 'Crédito 15 días' ? 'selected' : ''}>📆 Crédito 15 días</option>
                            <option value="Crédito 30 días" ${data.condicion_pago === 'Crédito 30 días' ? 'selected' : ''}>📆 Crédito 30 días</option>
                            <option value="Crédito 45 días" ${data.condicion_pago === 'Crédito 45 días' ? 'selected' : ''}>📆 Crédito 45 días</option>
                            <option value="Crédito 60 días" ${data.condicion_pago === 'Crédito 60 días' ? 'selected' : ''}>📆 Crédito 60 días</option>
                            <option value="Crédito 90 días" ${data.condicion_pago === 'Crédito 90 días' ? 'selected' : ''}>📆 Crédito 90 días</option>
                            <option value="Personalizado" ${data.condicion_pago === 'Personalizado' ? 'selected' : ''}>✏️ Personalizado</option>
                        </select>
                    </div>
                    <div class="col-md-12 campo-credito-personalizado" style="display:${data.condicion_pago === 'Personalizado' ? 'block' : 'none'};">
                        <label class="form-label fw-semibold small text-muted">Condición Personalizada</label>
                        <input type="text" class="form-control custom-input" data-field="tiempo_credito" value="${escapeHtml(data.tiempo_credito || '')}" placeholder="Ej: Crédito 20 días, 50% adelanto" style="border-radius:10px;border:1.5px solid #e5e7eb;">
                    </div>
                    <div class="col-12">
                        <div class="checkbox-group d-flex align-items-center gap-2 pt-2 border-top" style="border-top:1px solid #f0f0f0;">
                            <input class="form-check-input" type="checkbox" data-field="principal_punto" ${data.principal ? 'checked' : ''} id="punto_principal_${Date.now()}" style="width:18px;height:18px;">
                            <label class="form-check-label small" style="color:#374151;">⭐ Marcar como punto de entrega principal</label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        listaPuntos.appendChild(div);

        const selectCondicionPago = div.querySelector('.select-condicion-pago');
        const campoPersonalizado = div.querySelector('.campo-credito-personalizado');
        if (selectCondicionPago && campoPersonalizado) {
            selectCondicionPago.addEventListener('change', function() {
                campoPersonalizado.style.display = this.value === 'Personalizado' ? 'block' : 'none';
            });
        }
        actualizarContadores();
    }

    // Botones agregar
    const btnAgregarContacto = document.getElementById('btnAgregarContacto');
    if (btnAgregarContacto) btnAgregarContacto.addEventListener('click', () => agregarContacto());

    const btnAgregarPunto = document.getElementById('btnAgregarPunto');
    if (btnAgregarPunto) btnAgregarPunto.addEventListener('click', () => agregarPunto());

    // Botón consultar Sunat
    const btnConsultarSunat = document.getElementById('btnConsultarSunat');
    if (btnConsultarSunat) btnConsultarSunat.addEventListener('click', consultarSunat);

    // Eliminar items
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar') || e.target.closest('.btn-eliminar')) {
            const btn = e.target.closest('.btn-eliminar');
            if (btn) {
                const tarjeta = btn.closest('.col-md-6');
                if (tarjeta) {
                    const container = tarjeta.parentElement;
                    tarjeta.remove();
                    if (container === listaContactos) contadorContactos--;
                    if (container === listaPuntos) contadorPuntos--;
                    actualizarContadores();
                    mostrarNotificacion('Elemento eliminado', 'info');
                }
            }
        }
    });

    // Solo 1 principal (contactos)
    document.addEventListener('change', (e) => {
        if (e.target.dataset.field === 'principal') {
            const checkboxes = listaContactos.querySelectorAll('[data-field="principal"]');
            checkboxes.forEach(cb => { if (cb !== e.target) cb.checked = false; });
        }
        if (e.target.dataset.field === 'principal_punto') {
            const checkboxes = listaPuntos.querySelectorAll('[data-field="principal_punto"]');
            checkboxes.forEach(cb => { if (cb !== e.target) cb.checked = false; });
        }
    });

    function obtenerData() {
        const contactos = [];
        listaContactos.querySelectorAll('.col-md-6').forEach(tarjeta => {
            const item = tarjeta.querySelector('.item-agregable');
            if (item) {
                const nombre = item.querySelector('[data-field="nombre_contacto"]')?.value.trim();
                if (nombre) {
                    contactos.push({
                        nombre_contacto: nombre,
                        cargo: item.querySelector('[data-field="cargo"]')?.value.trim() || '',
                        email: item.querySelector('[data-field="email"]')?.value.trim() || '',
                        telefono: item.querySelector('[data-field="telefono"]')?.value.trim() || '',
                        principal: item.querySelector('[data-field="principal"]')?.checked || false
                    });
                }
            }
        });

        const puntos = [];
        listaPuntos.querySelectorAll('.col-md-6').forEach(tarjeta => {
            const item = tarjeta.querySelector('.item-agregable');
            if (item) {
                const nombre = item.querySelector('[data-field="nombre_punto"]')?.value.trim();
                if (nombre) {
                    const condicionPago = item.querySelector('[data-field="condicion_pago"]')?.value || '';
                    const tiempoCredito = item.querySelector('[data-field="tiempo_credito"]')?.value.trim() || '';
                    puntos.push({
                        nombre_punto: nombre,
                        direccion: item.querySelector('[data-field="direccion"]')?.value.trim() || '',
                        responsable: item.querySelector('[data-field="responsable"]')?.value.trim() || '',
                        telefono: item.querySelector('[data-field="telefono_punto"]')?.value.trim() || '',
                        condicion_pago: condicionPago === 'Personalizado' ? tiempoCredito : condicionPago,
                        tiempo_credito: condicionPago === 'Personalizado' ? '' : tiempoCredito,
                        principal: item.querySelector('[data-field="principal_punto"]')?.checked || false
                    });
                }
            }
        });
        return { contactos, puntos_entrega: puntos };
    }

    // Submit form
    const formCliente = document.getElementById('formCliente');
    if (formCliente) {
        formCliente.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const razonSocial = document.getElementById('razon_social').value.trim();
            const numeroDocumento = document.getElementById('numero_documento').value.trim();
            const tipoDocumento = document.getElementById('tipo_documento').value;
            const nombreComercial = document.getElementById('nombre_comercial').value.trim();
            const direccionFiscal = document.getElementById('direccion_fiscal').value.trim();
            
            if (!razonSocial) {
                mostrarNotificacion('La razón social es obligatoria', 'error');
                return;
            }
            if (!numeroDocumento) {
                mostrarNotificacion('El número de documento es obligatorio', 'error');
                return;
            }
            if (!validarDocumento(tipoDocumento, numeroDocumento)) {
                mostrarNotificacion(`El ${tipoDocumento} no es válido`, 'error');
                return;
            }
            
            const data = obtenerData();
            if (data.contactos.length === 0) {
                mostrarNotificacion('Agrega al menos un contacto', 'error');
                return;
            }
            if (data.puntos_entrega.length === 0) {
                mostrarNotificacion('Agrega al menos un punto de entrega', 'error');
                return;
            }
            
            const clienteCompleto = {
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento,
                razon_social: razonSocial,
                nombre_comercial: nombreComercial,
                direccion_fiscal: direccionFiscal,
                ...data
            };
            
            console.log("Enviando cliente:", clienteCompleto);
            
            try {
                const res = await fetch('/api/clientes/guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteCompleto)
                });
                const json = await res.json();
                
                if (json.success) {
                    const codigoGenerado = json.data?.codigo_cliente || 'Generado automáticamente';
                    mostrarNotificacion(
                        `✅ CLIENTE CREADO EXITOSAMENTE\n\n` +
                        `Código: ${codigoGenerado}\n` +
                        `Razón Social: ${razonSocial}\n` +
                        `Documento: ${tipoDocumento}: ${numeroDocumento}`,
                        'exito'
                    );
                    setTimeout(() => {
                        if (confirm('¿Desea limpiar el formulario para registrar otro cliente?')) {
                            location.reload();
                        } else {
                            window.location.href = '/gestion-clientes.html';
                        }
                    }, 2000);
                } else {
                    mostrarNotificacion(json.error || 'Error al guardar el cliente', 'error');
                }
            } catch (err) {
                console.error(err);
                mostrarNotificacion('Error del servidor. Intente nuevamente', 'error');
            }
        });
    }

    // Placeholder
    const tipoDocumento = document.getElementById('tipo_documento');
    if (tipoDocumento) tipoDocumento.addEventListener('change', actualizarPlaceholderDocumento);
    actualizarPlaceholderDocumento();

    // Inicializar con un contacto y un punto por defecto
    setTimeout(() => {
        if (listaContactos && listaContactos.children.length === 0) {
            agregarContacto();
        }
        if (listaPuntos && listaPuntos.children.length === 0) {
            agregarPunto();
        }
    }, 100);
});