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
// PLACEHOLDER DOCUMENTO
// =========================================
function actualizarPlaceholderDocumento() {
    const tipo = document.getElementById('tipo_documento').value;
    const input = document.getElementById('numero_documento');
    const label = document.getElementById('label_documento');

    if (tipo === 'RUC') {
        input.placeholder = '11 dígitos';
        if (label) label.innerHTML = 'RUC *:';
    } else if (tipo === 'DNI') {
        input.placeholder = '8 dígitos';
        if (label) label.innerHTML = 'DNI *:';
    } else {
        input.placeholder = 'Ingrese el número';
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
    }
    return true;
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

    function agregarContacto(data = {}) {
        contadorContactos++;
        const div = document.createElement('div');
        div.classList.add('item-agregable');
        div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
        div.innerHTML = `
            <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Nombre *</label><input type="text" class="form-control" data-field="nombre_contacto" value="${data.nombre_contacto || ''}" required></div>
                <div class="col-md-6 mb-3"><label>Cargo</label><input type="text" class="form-control" data-field="cargo" value="${data.cargo || ''}"></div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Email</label><input type="email" class="form-control" data-field="email" value="${data.email || ''}"></div>
                <div class="col-md-6 mb-3"><label>Teléfono</label><input type="text" class="form-control" data-field="telefono" value="${data.telefono || ''}"></div>
            </div>
            <div class="checkbox-group"><input type="checkbox" data-field="principal" ${data.principal ? 'checked' : ''}> <label>Principal</label></div>
        `;
        listaContactos.appendChild(div);
        actualizarContadores();
    }

    function agregarPunto(data = {}) {
        contadorPuntos++;
        const div = document.createElement('div');
        div.classList.add('item-agregable');
        div.style.cssText = `border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px;position:relative;background:#f9f9f9;`;
        div.innerHTML = `
            <button type="button" class="btn-eliminar" style="position:absolute;top:10px;right:10px;background:#ff4444;color:white;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;">🗑️</button>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Punto de Entrega *</label><input type="text" class="form-control" data-field="nombre_punto" value="${data.nombre_punto || ''}" required></div>
                <div class="col-md-6 mb-3"><label>Dirección *</label><input type="text" class="form-control" data-field="direccion" value="${data.direccion || ''}" required></div>
            </div>
            <div class="row">
                <div class="col-md-4 mb-3"><label>Departamento *</label><select class="form-select" data-field="departamento" required>
                    <option value="">Seleccione</option>
                    <option value="Amazonas">Amazonas</option><option value="Áncash">Áncash</option><option value="Apurímac">Apurímac</option>
                    <option value="Arequipa">Arequipa</option><option value="Ayacucho">Ayacucho</option><option value="Cajamarca">Cajamarca</option>
                    <option value="Callao">Callao</option><option value="Cusco">Cusco</option><option value="Huancavelica">Huancavelica</option>
                    <option value="Huánuco">Huánuco</option><option value="Ica">Ica</option><option value="Junín">Junín</option>
                    <option value="La Libertad">La Libertad</option><option value="Lambayeque">Lambayeque</option><option value="Lima">Lima</option>
                    <option value="Loreto">Loreto</option><option value="Madre de Dios">Madre de Dios</option><option value="Moquegua">Moquegua</option>
                    <option value="Pasco">Pasco</option><option value="Piura">Piura</option><option value="Puno">Puno</option>
                    <option value="San Martín">San Martín</option><option value="Tacna">Tacna</option><option value="Tumbes">Tumbes</option>
                    <option value="Ucayali">Ucayali</option>
                </select></div>
                <div class="col-md-4 mb-3"><label>Provincia *</label><input type="text" class="form-control" data-field="provincia" value="${data.provincia || ''}" required></div>
                <div class="col-md-4 mb-3"><label>Distrito *</label><input type="text" class="form-control" data-field="distrito" value="${data.distrito || ''}" required></div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label>Contacto de Entrega</label><input type="text" class="form-control" data-field="responsable" value="${data.responsable || ''}"></div>
                <div class="col-md-6 mb-3"><label>Teléfono</label><input type="text" class="form-control" data-field="telefono_punto" value="${data.telefono || ''}"></div>
            </div>
            <div class="col-md-6 mb-3"><label>Condición de Pago</label>
                <select data-field="condicion_pago" class="form-select select-condicion-pago">
                    <option value="">Seleccione</option>
                    <option value="Contado" ${data.condicion_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option value="Credito" ${data.condicion_pago === 'Credito' ? 'selected' : ''}>Crédito</option>
                </select>
            </div>
            <div class="form-group campo-credito" style="display:${data.condicion_pago === 'Credito' ? 'block' : 'none'};">
                <label>Tiempo de Crédito</label><input type="text" class="form-control" data-field="tiempo_credito" placeholder="Ej: 30 días" value="${data.tiempo_credito || ''}">
            </div>
            <div class="checkbox-group"><input type="checkbox" data-field="principal" ${data.principal ? 'checked' : ''}> <label>Principal</label></div>
        `;
        listaPuntos.appendChild(div);

        const selectCondicionPago = div.querySelector('.select-condicion-pago');
        const campoCredito = div.querySelector('.campo-credito');
        if (selectCondicionPago) {
            selectCondicionPago.addEventListener('change', function() {
                campoCredito.style.display = this.value === 'Credito' ? 'block' : 'none';
            });
        }
        actualizarContadores();
    }

    // Botones agregar
    const btnAgregarContacto = document.getElementById('btnAgregarContacto');
    if (btnAgregarContacto) btnAgregarContacto.addEventListener('click', () => agregarContacto());

    const btnAgregarPunto = document.getElementById('btnAgregarPunto');
    if (btnAgregarPunto) btnAgregarPunto.addEventListener('click', () => agregarPunto());

    // Eliminar items
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const item = e.target.closest('.item-agregable');
            const container = item.parentElement;
            item.remove();
            if (container === listaContactos) contadorContactos--;
            if (container === listaPuntos) contadorPuntos--;
            actualizarContadores();
            mostrarNotificacion('Elemento eliminado', 'info');
        }
    });

    // Solo 1 principal
    document.addEventListener('change', (e) => {
        if (e.target.dataset.field === 'principal') {
            const container = e.target.closest('#listaContactos') ? listaContactos : listaPuntos;
            const checkboxes = container.querySelectorAll('[data-field="principal"]');
            checkboxes.forEach(cb => { if (cb !== e.target) cb.checked = false; });
        }
    });

    function obtenerData() {
        const contactos = [];
        listaContactos.querySelectorAll('.item-agregable').forEach(item => {
            contactos.push({
                nombre_contacto: item.querySelector('[data-field="nombre_contacto"]')?.value.trim() || '',
                cargo: item.querySelector('[data-field="cargo"]')?.value.trim() || '',
                email: item.querySelector('[data-field="email"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        });

        const puntos = [];
        listaPuntos.querySelectorAll('.item-agregable').forEach(item => {
            puntos.push({
                nombre: item.querySelector('[data-field="nombre_punto"]')?.value.trim() || '',
                direccion: item.querySelector('[data-field="direccion"]')?.value.trim() || '',
                responsable: item.querySelector('[data-field="responsable"]')?.value.trim() || '',
                telefono: item.querySelector('[data-field="telefono_punto"]')?.value.trim() || '',
                condicion_pago: item.querySelector('[data-field="condicion_pago"]')?.value || '',
                tiempo_credito: item.querySelector('[data-field="tiempo_credito"]')?.value.trim() || '',
                principal: item.querySelector('[data-field="principal"]')?.checked || false
            });
        });
        return { contactos, puntos_entrega: puntos };
    }

    // Submit form - MODIFICADO: Ya no envía ID manual
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
            
            // NOTA: NO enviamos id, Supabase lo genera automáticamente con el trigger
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
                    // Mostrar notificación con el código generado
                    const codigoGenerado = json.data?.codigo_cliente || 'Generado automáticamente';
                    mostrarNotificacion(
                        `✅ CLIENTE CREADO EXITOSAMENTE\n\n` +
                        `Código: ${codigoGenerado}\n` +
                        `Razón Social: ${razonSocial}\n` +
                        `Documento: ${tipoDocumento}: ${numeroDocumento}\n` +
                        `Contactos: ${data.contactos.length}\n` +
                        `Puntos de Entrega: ${data.puntos_entrega.length}`,
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

    // Inicializar
    agregarContacto();
    agregarPunto();
    actualizarContadores();
});