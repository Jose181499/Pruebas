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
// NUEVO PROVEEDOR ERP
// =========================================

document.addEventListener('DOMContentLoaded', function () {

    // =====================================================
    // SELECT2
    // =====================================================
    if (typeof $ !== 'undefined' && $('#condicion_pago').length) {
        $('#condicion_pago').select2({
            placeholder: "Buscar condición de pago...",
            allowClear: true,
            width: '100%',
            dropdownParent: $('#modalNuevoProveedor')
        });
    }

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
                const tiempoCredito = document.getElementById('tiempo_credito');
                if (tiempoCredito) {
                    tiempoCredito.value = '';
                }
            }
        });
    }

    // =====================================================
    // DISTRITOS
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
    ];
    distritos.sort();

    // =====================================================
    // ELEMENTOS
    // =====================================================
    const tipoRecojo = document.getElementById('tipo_recojo');
    const bloqueLista = document.getElementById('bloque_lista_distritos');
    const bloqueManual = document.getElementById('bloque_manual');
    const buscador = document.getElementById('buscarDistrito');
    const select = document.getElementById('lugar_recojo');

    // =====================================================
    // CAMBIO TIPO RECOJO
    // =====================================================
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

    // =====================================================
    // RENDER DISTRITOS
    // =====================================================
    function renderDistritos(filtro = '') {
        if (!select) return;
        select.innerHTML = '';
        const filtrados = distritos.filter(distrito =>
            distrito.toLowerCase().includes(filtro.toLowerCase())
        );
        if (filtrados.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No se encontraron resultados';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        filtrados.forEach(distrito => {
            const option = document.createElement('option');
            option.value = distrito;
            option.textContent = distrito;
            select.appendChild(option);
        });
    }

    // =====================================================
    // BUSCADOR DISTRITOS
    // =====================================================
    if (buscador) {
        buscador.addEventListener('focus', function () {
            renderDistritos(this.value);
        });
        buscador.addEventListener('input', function () {
            renderDistritos(this.value);
        });
    }

    // =====================================================
    // SELECCIONAR DISTRITO
    // =====================================================
    if (select) {
        select.addEventListener('change', function () {
            buscador.value = this.value;
        });
    }

    // =====================================================
    // VALIDACIÓN RUC
    // =====================================================
    const rucInput = document.getElementById('ruc');
    if (rucInput) {
        rucInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
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


    // ========================================
   // GUARDAR PROVEEDOR (MODIFICADO con notificación y sin ID manual)
   // ========================================
  const btnGuardarProveedor = document.getElementById('btnGuardarProveedor');

  if (btnGuardarProveedor) {
    btnGuardarProveedor.addEventListener('click', async function () {
        console.log("🔥 CLICK GUARDAR");

        try {
            let lugarRecojo = '';
            const tipoRecojo = document.getElementById('tipo_recojo');

            if (tipoRecojo && tipoRecojo.value === 'lista') {
                lugarRecojo = document.getElementById('lugar_recojo')?.value || '';
            } else if (tipoRecojo && tipoRecojo.value === 'manual') {
                lugarRecojo = document.getElementById('otro_distrito')?.value || '';
            }

            const razonSocial = document.getElementById('razon_social')?.value || '';
            const ruc = document.getElementById('ruc')?.value || '';
            const direccion = document.getElementById('direccion')?.value || '';

            // Validaciones
            if (!razonSocial) {
                mostrarNotificacion('La razón social es obligatoria', 'error');
                return;
            }
            if (!ruc || ruc.length !== 11) {
                mostrarNotificacion('El RUC debe tener 11 dígitos', 'error');
                return;
            }
            if (!direccion) {
                mostrarNotificacion('La dirección es obligatoria', 'error');
                return;
            }

            const data = {
                razon_social: razonSocial,
                razon_comercial: document.getElementById('razon_comercial')?.value || '',
                direccion: direccion,
                contacto: document.getElementById('contacto')?.value || '',
                ruc: ruc,
                telefono: document.getElementById('telefono')?.value || '',
                email: document.getElementById('email')?.value || '',
                condicion_pago: document.getElementById('condicion_pago')?.value || '',
                tiempo_credito: document.getElementById('tiempo_credito')?.value || '',
                banco: document.getElementById('banco')?.value || '',
                numero_cuenta: document.getElementById('numero_cuenta')?.value || '',
                cci: document.getElementById('cci')?.value || '',
                lugar_recojo: lugarRecojo
            };

            console.log("Enviando:", data);

            const response = await fetch('/api/proveedores/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                const codigoGenerado = result.data?.codigo_proveedor || 'Generado';
                mostrarNotificacion(
                    `✅ PROVEEDOR CREADO EXITOSAMENTE\n\n` +
                    `Código: ${codigoGenerado}\n` +
                    `Razón Social: ${razonSocial}\n` +
                    `RUC: ${ruc}`,
                    'exito'
                );
                setTimeout(() => {
                    if (confirm('¿Desea limpiar el formulario para registrar otro proveedor?')) {
                        location.reload();
                    } else {
                        window.location.href = '/gestion-proveedores.html';
                    }
                }, 2000);
            } else {
                mostrarNotificacion('❌ Error: ' + (result.error || 'Error al guardar'), 'error');
            }
        } catch (error) {
            console.log(error);
            mostrarNotificacion('❌ Error del servidor: ' + error.message, 'error');
        }
    });
  }
});