// =========================================
// NUEVO PROVEEDOR ERP
// =========================================

document.addEventListener('DOMContentLoaded', function () {

    // =====================================================
    // CONDICIÓN DE PAGO
    // =====================================================
    const condicionPago     = document.getElementById('condicion_pago');
    const campoTiempoCredito = document.getElementById('campo_tiempo_credito');

    if (condicionPago) {
        condicionPago.addEventListener('change', function () {
            if (this.value === 'Credito') {
                campoTiempoCredito.style.display = 'block';
            } else {
                campoTiempoCredito.style.display = 'none';
                const tiempoCredito = document.getElementById('tiempo_credito');
                if (tiempoCredito) tiempoCredito.value = '';
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

    const tipoRecojo  = document.getElementById('tipo_recojo');
    const bloqueLista = document.getElementById('bloque_lista_distritos');
    const bloqueManual = document.getElementById('bloque_manual');
    const buscador    = document.getElementById('buscarDistrito');
    const selectDistrito = document.getElementById('lugar_recojo');

    // =====================================================
    // CAMBIO TIPO RECOJO
    // =====================================================
    if (tipoRecojo) {
        tipoRecojo.addEventListener('change', function () {
            if (this.value === 'lista') {
                bloqueLista.style.display  = 'block';
                bloqueManual.style.display = 'none';
                renderDistritos();
            } else if (this.value === 'manual') {
                bloqueLista.style.display  = 'none';
                bloqueManual.style.display = 'block';
            } else {
                bloqueLista.style.display  = 'none';
                bloqueManual.style.display = 'none';
            }
        });
    }

    // =====================================================
    // RENDER LISTA DE DISTRITOS
    // =====================================================
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

    // =====================================================
    // BUSCADOR DISTRITOS
    // =====================================================
    if (buscador) {
        buscador.addEventListener('focus', function () { renderDistritos(this.value); });
        buscador.addEventListener('input', function () { renderDistritos(this.value); });
    }

    if (selectDistrito) {
        selectDistrito.addEventListener('change', function () {
            if (buscador) buscador.value = this.value;
        });
    }

    // =====================================================
    // VALIDACIÓN RUC — solo dígitos, máx 11
    // =====================================================
    const rucInput = document.getElementById('ruc');
    if (rucInput) {
        rucInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 11);
        });
    }

    // =====================================================
    // VALIDACIÓN TELÉFONO
    // =====================================================
    const telefonoInput = document.getElementById('telefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^\d+]/g, '');
        });
    }

    // =====================================================
    // GUARDAR NUEVO PROVEEDOR  ✅ CORREGIDO: dentro del DOMContentLoaded
    // =====================================================
    const btnGuardarProveedor = document.getElementById('btnGuardarProveedor');

    if (btnGuardarProveedor) {
        btnGuardarProveedor.addEventListener('click', async function () {

            try {
                // Determinar lugar de recojo según tipo seleccionado
                let lugarRecojo = '';
                if (tipoRecojo?.value === 'lista') {
                    lugarRecojo = document.getElementById('lugar_recojo')?.value || '';
                } else if (tipoRecojo?.value === 'manual') {
                    lugarRecojo = document.getElementById('otro_distrito')?.value || '';
                }

                const razonSocial = document.getElementById('razon_social')?.value.trim() || '';
                const ruc         = document.getElementById('ruc')?.value.trim()          || '';
                const direccion   = document.getElementById('direccion')?.value.trim()    || '';

                // ── Validaciones ──────────────────────────────────
                if (!razonSocial) {
                    mostrarNotificacion('La razón social es obligatoria', 'error');
                    return;
                }
                if (!ruc || ruc.length !== 11) {
                    mostrarNotificacion('El RUC debe tener exactamente 11 dígitos', 'error');
                    return;
                }
                if (!direccion) {
                    mostrarNotificacion('La dirección es obligatoria', 'error');
                    return;
                }

                const data = {
                    razon_social:    razonSocial,
                    razon_comercial: document.getElementById('razon_comercial')?.value  || '',
                    direccion:       direccion,
                    contacto:        document.getElementById('contacto')?.value         || '',
                    ruc:             ruc,
                    telefono:        document.getElementById('telefono')?.value         || '',
                    email:           document.getElementById('email')?.value            || '',
                    condicion_pago:  document.getElementById('condicion_pago')?.value  || '',
                    tiempo_credito:  document.getElementById('tiempo_credito')?.value  || '',
                    banco:           document.getElementById('banco')?.value            || '',  // ✅ CORREGIDO: getElementById
                    numero_cuenta:   document.getElementById('numero_cuenta')?.value   || '',
                    cci:             document.getElementById('cci')?.value              || '',
                    lugar_recojo:    lugarRecojo
                };

                const response = await fetch('/api/proveedores/guardar', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    const codigoGenerado = result.data?.codigo_proveedor || 'Generado';

                    mostrarNotificacion(
                        `PROVEEDOR CREADO EXITOSAMENTE\n\n` +
                        `Código: ${codigoGenerado}\n` +
                        `Razón Social: ${razonSocial}\n` +
                        `RUC: ${ruc}`,
                        'exito'
                    );

                    // ✅ CORREGIDO: cerrar modal y recargar tabla en vez de confirm() + redirect raro
                    setTimeout(() => {
                        const modalEl = document.getElementById('modalNuevoProveedor');
                        const modal   = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();

                        document.getElementById('formProveedor')?.reset();

                        // Limpiar campos que reset() no limpia completamente
                        if (tipoRecojo)   tipoRecojo.value = '';
                        if (bloqueLista)  bloqueLista.style.display  = 'none';
                        if (bloqueManual) bloqueManual.style.display = 'none';
                        if (campoTiempoCredito) campoTiempoCredito.style.display = 'none';

                        // Recargar la tabla
                        if (typeof cargarProveedores === 'function') cargarProveedores();

                    }, 1500);

                } else {
                    mostrarNotificacion('Error: ' + (result.error || 'No se pudo guardar'), 'error');
                }

            } catch (error) {
                console.error("Error al guardar proveedor:", error);
                mostrarNotificacion('Error del servidor: ' + error.message, 'error');
            }
        });
    }

}); // fin DOMContentLoaded