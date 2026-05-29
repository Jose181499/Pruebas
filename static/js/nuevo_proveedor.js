// =========================================
// NUEVO PROVEEDOR ERP - Versión Mejorada
// =========================================

document.addEventListener('DOMContentLoaded', function () {

    // =====================================================
    // CONDICIÓN DE PAGO
    // =====================================================
    const condicionPago = document.getElementById('condicion_pago');
    const campoTiempoCredito = document.getElementById('campo_tiempo_credito');

    if (condicionPago) {
        condicionPago.addEventListener('change', function () {
            if (this.value === 'Credito') {
                campoTiempoCredito.style.display = 'block';
            } else {
                campoTiempoCredito.style.display = 'none';
                document.getElementById('tiempo_credito').value = '';
            }
        });
    }

    // =====================================================
    // DISTRITOS DE LIMA
    // =====================================================
    const distritos = [
        "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos",
        "Cieneguilla", "Comas", "El Agustino", "Independencia", "Jesús María", "La Molina",
        "La Victoria", "Lince", "Los Olivos", "Lurigancho", "Lurín", "Magdalena del Mar",
        "Miraflores", "Pachacámac", "Pucusana", "Pueblo Libre", "Puente Piedra", "Punta Hermosa",
        "Punta Negra", "Rímac", "San Bartolo", "San Borja", "San Isidro", "San Juan de Lurigancho",
        "San Juan de Miraflores", "San Luis", "San Martín de Porres", "San Miguel", "Santa Anita",
        "Santa María del Mar", "Santa Rosa", "Santiago de Surco", "Surquillo", "Villa El Salvador",
        "Villa María del Triunfo"
    ].sort();

    const tipoRecojo = document.getElementById('tipo_recojo');
    const bloqueLista = document.getElementById('bloque_lista_distritos');
    const bloqueManual = document.getElementById('bloque_manual');
    const buscador = document.getElementById('buscarDistrito');
    const selectDistrito = document.getElementById('lugar_recojo');

    // Cambio de tipo de recojo
    if (tipoRecojo) {
        tipoRecojo.addEventListener('change', function () {
            if (this.value === 'lista') {
                bloqueLista.style.display = 'block';
                bloqueManual.style.display = 'none';
                renderDistritos();
            } else if (this.value === 'manual') {
                bloqueLista.style.display = 'none';
                bloqueManual.style.display = 'block';
            } else {
                bloqueLista.style.display = 'none';
                bloqueManual.style.display = 'none';
            }
        });
    }

    // Renderizar distritos
    function renderDistritos(filtro = '') {
        if (!selectDistrito) return;
        selectDistrito.innerHTML = '';

        const filtrados = distritos.filter(d => 
            d.toLowerCase().includes(filtro.toLowerCase())
        );

        if (filtrados.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No se encontraron resultados';
            opt.disabled = true;
            selectDistrito.appendChild(opt);
            return;
        }

        filtrados.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            selectDistrito.appendChild(opt);
        });
    }

    // Buscador de distritos
    if (buscador) {
        buscador.addEventListener('input', () => renderDistritos(buscador.value));
        buscador.addEventListener('focus', () => renderDistritos(buscador.value));
    }

    if (selectDistrito) {
        selectDistrito.addEventListener('change', function () {
            if (buscador) buscador.value = this.value;
        });
    }

    // Validación RUC
    const rucInput = document.getElementById('ruc');
    if (rucInput) {
        rucInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 11);
        });
    }

    // Validación Teléfono
    const telefonoInput = document.getElementById('telefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^\d+]/g, '');
        });
    }

    // =====================================================
    // GUARDAR NUEVO PROVEEDOR (Versión Mejorada)
    // =====================================================
    const btnGuardar = document.getElementById('btnGuardarProveedor');

    if (btnGuardar) {
        btnGuardar.addEventListener('click', async function () {

            const btn = this;
            const textoOriginal = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

                // Determinar lugar de recojo
                let lugarRecojo = '';
                if (tipoRecojo?.value === 'lista') {
                    lugarRecojo = document.getElementById('lugar_recojo')?.value || '';
                } else if (tipoRecojo?.value === 'manual') {
                    lugarRecojo = document.getElementById('otro_distrito')?.value || '';
                }

                const razonSocial = document.getElementById('razon_social')?.value.trim() || '';
                const ruc = document.getElementById('ruc')?.value.trim() || '';
                const direccion = document.getElementById('direccion')?.value.trim() || '';
                const email = document.getElementById('email')?.value.trim() || '';

                // Validaciones
                if (!razonSocial) return mostrarNotificacion('La razón social es obligatoria', 'error');
                if (!ruc || ruc.length !== 11) return mostrarNotificacion('El RUC debe tener exactamente 11 dígitos', 'error');
                if (!direccion) return mostrarNotificacion('La dirección fiscal es obligatoria', 'error');
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return mostrarNotificacion('El correo electrónico no tiene un formato válido', 'error');
                }

                const data = {
                    razon_social: razonSocial,
                    razon_comercial: document.getElementById('razon_comercial')?.value.trim() || '',
                    direccion: direccion,
                    contacto: document.getElementById('contacto')?.value.trim() || '',
                    ruc: ruc,
                    telefono: document.getElementById('telefono')?.value.trim() || '',
                    email: email,
                    condicion_pago: document.getElementById('condicion_pago')?.value || '',
                    tiempo_credito: document.getElementById('tiempo_credito')?.value.trim() || '',
                    banco: document.getElementById('banco')?.value || '',
                    numero_cuenta: document.getElementById('numero_cuenta')?.value.trim() || '',
                    cci: document.getElementById('cci')?.value.trim() || '',
                    lugar_recojo: lugarRecojo
                };

                const response = await fetch('/api/proveedores/guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    mostrarNotificacion(`✅ Proveedor creado correctamente\nCódigo: ${result.data?.codigo_proveedor || 'N/A'}`, 'exito');

                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoProveedor'));
                        modal?.hide();

                        document.getElementById('formProveedor').reset();

                        // Limpiar estados
                        if (tipoRecojo) tipoRecojo.value = '';
                        if (bloqueLista) bloqueLista.style.display = 'none';
                        if (bloqueManual) bloqueManual.style.display = 'none';
                        if (campoTiempoCredito) campoTiempoCredito.style.display = 'none';

                        if (typeof cargarProveedores === 'function') cargarProveedores();
                    }, 1300);

                } else {
                    mostrarNotificacion(result.error || 'No se pudo guardar el proveedor', 'error');
                }

            } catch (error) {
                console.error(error);
                mostrarNotificacion('Error de conexión con el servidor', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = textoOriginal;
            }
        });
    }

// =====================================================
// MOSTRAR CONFIRMACIÓN
// =====================================================
function mostrarNotificacion(mensaje, tipo) {
    const body = document.getElementById('modalConfirmacionBody');
    const modalEl = document.getElementById('modalConfirmacionProveedor');

    if (!body || !modalEl) {
        alert(mensaje);
        return;
    }

    const icono = tipo === 'exito'
        ? `<i class="bi bi-check-circle-fill text-success fs-1"></i>`
        : `<i class="bi bi-x-circle-fill text-danger fs-1"></i>`;

    body.innerHTML = `
        <div class="text-center py-3">
            ${icono}
            <p class="mt-3 fw-bold" style="white-space: pre-line;">${mensaje}</p>
        </div>
    `;

    // Cerrar modal activo primero, luego abrir confirmación
    const modalActivo = document.querySelector('.modal.show');
    if (modalActivo) {
        const instancia = bootstrap.Modal.getInstance(modalActivo);
        instancia?.hide();
        modalActivo.addEventListener('hidden.bs.modal', () => {
            new bootstrap.Modal(modalEl).show();
        }, { once: true });
    } else {
        new bootstrap.Modal(modalEl).show();
    }
 }

});