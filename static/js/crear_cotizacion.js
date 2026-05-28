document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // HELPERS
    // =========================
    const toNum = (v) => {
        const x = Number(String(v ?? '').replace(',', '.'));
        return Number.isFinite(x) ? x : 0;
    };

    // =========================
    // FORMATEAR CANTIDAD (elimina .000)
    // =========================
    function formatCantidad(cant) {
        if (cant === null || cant === undefined) return '0';
        let numero = parseFloat(cant);
        if (isNaN(numero)) return '0';
        // Si es entero, mostrar sin decimales
        if (numero % 1 === 0) {
            return numero.toString();
        }
        // Si tiene decimales, mostrarlos sin ceros innecesarios
        return numero.toFixed(3).replace(/\.?0+$/, '');
    }

    // =========================
    // GENERACIÓN DE CÓDIGOS PERSONALIZADOS
    // =========================
    let codigoCotizacionActual = '';
    let correlativoActual = 0;
    let usuarioActual = null;
    let esBorrador = true;

    // Obtener usuario actual
    async function obtenerUsuarioActual() {
        try {
            const response = await fetch('/api/usuarios/actual');
            const data = await response.json();
            if (data.success && data.data) {
                usuarioActual = data.data;
                
                const codigoVendedorSpan = document.getElementById('codigo_vendedor');
                if (codigoVendedorSpan && usuarioActual.codigo_vendedor) {
                    codigoVendedorSpan.textContent = usuarioActual.codigo_vendedor;
                }
                
                const asesorInput = document.getElementById('asesor_comercial');
                if (asesorInput && usuarioActual.nombre_completo) {
                    asesorInput.value = usuarioActual.nombre_completo;
                    const usuarioIdInput = document.getElementById('usuario_id');
                    const emailContacto = document.getElementById('email_contacto');
                    const telefonoUser = document.getElementById('telefono_contacto_user');
                    
                    if (usuarioIdInput) usuarioIdInput.value = usuarioActual.id;
                    if (emailContacto) emailContacto.value = usuarioActual.email || '';
                    if (telefonoUser) telefonoUser.value = usuarioActual.telefono || '';
                }
                
                return usuarioActual;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }

    // Obtener último correlativo del usuario
    async function obtenerUltimoCorrelativo(usuarioId) {
        try {
            const response = await fetch(`/api/cotizacion/ultimo-correlativo?usuario_id=${usuarioId}`);
            const data = await response.json();
            if (data.success) {
                correlativoActual = data.correlativo || 0;
                return correlativoActual;
            }
            return 0;
        } catch (error) {
            console.error('Error obteniendo correlativo:', error);
            return 0;
        }
    }

    // Verificar si un código ya existe en la base de datos
    async function verificarCodigoExiste(codigo) {
        try {
            const response = await fetch(`/api/cotizacion/verificar-codigo?codigo=${encodeURIComponent(codigo)}`);
            const data = await response.json();
            return data.exists === true;
        } catch (error) {
            console.error('Error verificando código:', error);
            return false;
        }
    }

    // Generar código temporal para borrador
    function generarCodigoTemporal() {
        const fecha = new Date();
        const timestamp = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;
        const codigoVendedor = usuarioActual?.codigo_vendedor || 'TMP';
        return `TMP-${codigoVendedor}-${timestamp}`;
    }

    // Actualizar número de cotización en UI
    function actualizarNumeroCotizacionUI(codigo, esBorradorActual = esBorrador) {
        const numeroDiv = document.getElementById('numero_cotizacion');
        const tipoDocSpan = document.getElementById('tipo_documento');
        
        if (numeroDiv && codigo) {
            if (esBorradorActual) {
                numeroDiv.innerHTML = `<span style="font-size: 1rem; color: #f59e0b;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #f59e0b;">⚠️ BORRADOR</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-warning">BORRADOR</span>';
            } else {
                numeroDiv.innerHTML = `<span style="font-size: 1.2rem; color: #10b981;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #6b7280;">Correlativo: ${correlativoActual}</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-success">OFICIAL</span>';
            }
            codigoCotizacionActual = codigo;
        }
        
        actualizarEstadoBotonPDF();
    }

    // Generar código oficial
    async function generarCodigoOficial() {
        if (!usuarioActual) {
            await obtenerUsuarioActual();
        }
        
        if (usuarioActual) {
            await obtenerUltimoCorrelativo(usuarioActual.id);
            let nuevoCorrelativo = correlativoActual + 1;
            let codigoGenerado = null;
            let intentos = 0;
            const maxIntentos = 10;
            
            while (!codigoGenerado && intentos < maxIntentos) {
                const codigoVendedor = usuarioActual.codigo_vendedor || `V${String(usuarioActual.id).padStart(3, '0')}`;
                const fecha = new Date();
                const año = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                
                const codigo = `COT-${codigoVendedor}-${año}${mes}${dia}-${String(nuevoCorrelativo).padStart(4, '0')}`;
                
                const existe = await verificarCodigoExiste(codigo);
                
                if (!existe) {
                    codigoGenerado = codigo;
                    correlativoActual = nuevoCorrelativo;
                } else {
                    nuevoCorrelativo++;
                }
                intentos++;
            }
            
            if (!codigoGenerado) {
                mostrarNotificacion('Error: No se pudo generar un código único.', 'danger');
                return null;
            }
            
            return codigoGenerado;
        }
        return null;
    }

    // Inicializar código
    async function inicializarCodigo() {
        await obtenerUsuarioActual();
        esBorrador = true;
        const codigoTemporal = generarCodigoTemporal();
        actualizarNumeroCotizacionUI(codigoTemporal, true);
        return codigoTemporal;
    }

    // =========================
    // HABILITAR/DESHABILITAR BOTÓN PDF
    // =========================
    function actualizarEstadoBotonPDF() {
        const btnPdf = document.getElementById('btnPdf');
        const cotizacionId = document.getElementById('cotizacion_id')?.value;
        
        if (btnPdf) {
            if (cotizacionId && cotizacionId !== '' && cotizacionId !== 'None' && esBorrador === false) {
                btnPdf.disabled = false;
                btnPdf.classList.remove('opacity-50');
            } else {
                btnPdf.disabled = true;
                btnPdf.classList.add('opacity-50');
            }
        }
    }

    // =========================
    // NOTIFICACIONES
    // =========================
    function mostrarNotificacion(mensaje, tipo) {
        const notificacion = document.createElement('div');
        notificacion.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3`;
        notificacion.style.zIndex = '9999';
        notificacion.style.minWidth = '300px';
        notificacion.style.animation = 'slideIn 0.3s ease';
        notificacion.innerHTML = `<i class="bi bi-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${mensaje}`;
        document.body.appendChild(notificacion);
        setTimeout(() => notificacion.remove(), 3000);
    }

    // =========================
    // CONSULTA A SUNAT
    // =========================
    async function consultarSunat(ruc) {
        try {
            mostrarNotificacion(`🔍 Consultando RUC ${ruc} en SUNAT...`, 'info');
            
            const response = await fetch(`https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`);
            
            if (!response.ok) {
                throw new Error('Error al consultar SUNAT');
            }
            
            const data = await response.json();
            
            if (data && data.razonSocial) {
                return {
                    success: true,
                    razon_social: data.razonSocial || '',
                    nombre_comercial: data.nombreComercial || '',
                    direccion: data.direccion || '',
                    estado: data.estado || ''
                };
            } else {
                return { success: false, error: 'No se encontraron datos' };
            }
        } catch (error) {
            console.error('Error consultando SUNAT:', error);
            
            try {
                const proxyResponse = await fetch(`/api/sunat/consulta?ruc=${ruc}`);
                const proxyData = await proxyResponse.json();
                if (proxyData.success) {
                    return proxyData;
                }
            } catch (e) {
                console.error('Error con proxy:', e);
            }
            
            return { success: false, error: error.message };
        }
    }

    async function autocompletarConSunat() {
        const tipoDocumento = document.getElementById('nuevo_tipo_documento')?.value;
        const numeroDocumento = document.getElementById('nuevo_numero_documento')?.value.trim();
        
        if (tipoDocumento !== 'RUC') {
            mostrarNotificacion('⚠️ La búsqueda en SUNAT solo está disponible para RUC', 'warning');
            return;
        }
        
        if (!numeroDocumento || numeroDocumento.length !== 11) {
            mostrarNotificacion('⚠️ Ingrese un RUC válido de 11 dígitos', 'warning');
            return;
        }
        
        const btnBuscar = document.getElementById('btnBuscarSunat');
        const textoOriginal = btnBuscar?.innerHTML;
        if (btnBuscar) {
            btnBuscar.innerHTML = '<i class="bi bi-hourglass-split"></i> Buscando...';
            btnBuscar.disabled = true;
        }
        
        try {
            const resultado = await consultarSunat(numeroDocumento);
            
            if (resultado.success) {
                document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                document.getElementById('nuevo_nombre_comercial').value = resultado.nombre_comercial || '';
                document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                
                mostrarNotificacion('✅ Datos cargados desde SUNAT correctamente', 'success');
            } else {
                mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error al consultar SUNAT', 'danger');
        } finally {
            if (btnBuscar) {
                btnBuscar.innerHTML = textoOriginal;
                btnBuscar.disabled = false;
            }
        }
    }

    // =========================
    // CONFIGURAR DIRECCIÓN DE ENTREGA
    // =========================
    function configurarDireccionEntrega() {
        const select = document.getElementById('direccion_entrega_select');
        const input = document.getElementById('direccion_entrega');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de dirección de entrega no encontrados');
            return;
        }
        
        select.addEventListener('change', function() {
            const valor = this.value;
            if (valor === 'personalizado') {
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Escriba la dirección completa...';
                input.focus();
            } else if (valor === '') {
                input.style.display = 'none';
                input.value = '';
            } else {
                input.style.display = 'none';
                input.value = valor;
            }
        });
        
        input.addEventListener('focus', function() {
            select.value = 'personalizado';
            this.style.display = 'block';
        });
        
        if (input.value && input.value.trim() !== '') {
            let encontrado = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === input.value) {
                    select.value = input.value;
                    input.style.display = 'none';
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado && input.value !== '') {
                select.value = 'personalizado';
                input.style.display = 'block';
            }
        }
    }

    // =========================
    // CONFIGURAR CONDICIÓN DE PAGO PERSONALIZADA
    // =========================
    function configurarCondicionPago() {
        const select = document.getElementById('condicion_pago_select');
        const input = document.getElementById('condicion_pago');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de condición de pago no encontrados');
            return;
        }
        
        select.addEventListener('change', function() {
            const valor = this.value;
            if (valor === 'personalizado') {
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Ej: Crédito 20 días, 50% adelanto, etc.';
                input.focus();
            } else if (valor === '') {
                input.style.display = 'none';
                input.value = '';
            } else {
                input.style.display = 'none';
                input.value = valor;
            }
        });
        
        input.addEventListener('focus', function() {
            select.value = 'personalizado';
            this.style.display = 'block';
        });
        
        if (input.value && input.value.trim() !== '') {
            let encontrado = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === input.value) {
                    select.value = input.value;
                    input.style.display = 'none';
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado && input.value !== '') {
                select.value = 'personalizado';
                input.style.display = 'block';
            }
        }
    }

    // =========================
    // CONFIGURAR VALIDEZ DE OFERTA PERSONALIZADA
    // =========================
    function configurarValidezOferta() {
        const select = document.getElementById('validez_oferta_select');
        const input = document.getElementById('validez_oferta');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de validez de oferta no encontrados');
            return;
        }
        
        select.addEventListener('change', function() {
            const valor = this.value;
            if (valor === 'personalizado') {
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Ej: 20 días, 1 mes, etc.';
                input.focus();
            } else if (valor === '') {
                input.style.display = 'none';
                input.value = '';
            } else {
                input.style.display = 'none';
                input.value = valor;
            }
        });
        
        input.addEventListener('focus', function() {
            select.value = 'personalizado';
            this.style.display = 'block';
        });
        
        if (input.value && input.value.trim() !== '') {
            let encontrado = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === input.value) {
                    select.value = input.value;
                    input.style.display = 'none';
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado && input.value !== '') {
                select.value = 'personalizado';
                input.style.display = 'block';
            }
        }
    }

    // =========================
    // CONFIGURAR DESCUENTO PERSONALIZABLE
    // =========================
    function configurarDescuentoPersonalizable() {
        const descuentoInput = document.getElementById('descuento_porcentaje_input');
        const descuentoTipo = document.getElementById('descuento_tipo');
        
        if (descuentoInput) {
            descuentoInput.addEventListener('input', function() {
                recalculateAll();
                datosModificados = true;
            });
        }
        
        if (descuentoTipo) {
            descuentoTipo.addEventListener('change', function() {
                if (descuentoInput) {
                    if (this.value === 'monto') {
                        descuentoInput.placeholder = '0.00';
                        descuentoInput.step = '0.01';
                        descuentoInput.max = '';
                    } else {
                        descuentoInput.placeholder = '0';
                        descuentoInput.step = '0.01';
                        descuentoInput.max = '100';
                    }
                }
                recalculateAll();
                datosModificados = true;
            });
        }
    }

    // =========================
    // CARGAR DIRECCIONES DEL CLIENTE
    // =========================
    async function cargarDireccionesCliente(clienteId) {
        const select = document.getElementById('direccion_entrega_select');
        if (!select) return;
        
        while (select.options.length > 2) {
            select.remove(2);
        }
        
        if (!clienteId || clienteId === '') return;
        
        try {
            const response = await fetch(`/api/clientes/${clienteId}/direcciones`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                result.data.forEach(dir => {
                    const option = document.createElement('option');
                    option.value = dir.direccion;
                    option.textContent = dir.direccion.length > 50 ? dir.direccion.substring(0, 47) + '...' : dir.direccion;
                    if (dir.principal) {
                        option.textContent += ' (Principal)';
                    }
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando direcciones:', error);
        }
    }

    // =========================
    // BOTÓN BUSCAR CLIENTE POR RUC
    // =========================
    const btnBuscarClientePorRuc = document.getElementById('btnBuscarClientePorRuc');
    const buscarRucInput = document.getElementById('buscar_ruc');
    const btnLimpiarCliente = document.getElementById('btnLimpiarCliente');

    if (btnBuscarClientePorRuc) {
        btnBuscarClientePorRuc.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const ruc = buscarRucInput?.value.trim();
            
            if (!ruc) {
                mostrarNotificacion('⚠️ Ingrese un RUC para buscar', 'warning');
                return;
            }
            
            if (ruc.length !== 11) {
                mostrarNotificacion('⚠️ El RUC debe tener 11 dígitos', 'warning');
                return;
            }
            
            mostrarNotificacion('🔍 Consultando SUNAT para RUC: ' + ruc, 'info');
            
            const textoOriginal = btnBuscarClientePorRuc.innerHTML;
            btnBuscarClientePorRuc.innerHTML = '<i class="bi bi-hourglass-split"></i> Consultando SUNAT...';
            btnBuscarClientePorRuc.disabled = true;
            
            try {
                const resultado = await consultarSunat(ruc);
                
                if (resultado.success) {
                    document.getElementById('cliente_razon_social').value = resultado.razon_social || '';
                    document.getElementById('cliente_doc').value = ruc;
                    document.getElementById('cliente_direccion').value = resultado.direccion || '';
                    
                    document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                    document.getElementById('nuevo_nombre_comercial').value = resultado.nombre_comercial || '';
                    document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                    document.getElementById('nuevo_numero_documento').value = ruc;
                    
                    mostrarNotificacion('✅ Datos cargados desde SUNAT correctamente', 'success');
                } else {
                    mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC en SUNAT'), 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion('❌ Error al consultar SUNAT: ' + error.message, 'danger');
            } finally {
                btnBuscarClientePorRuc.innerHTML = textoOriginal;
                btnBuscarClientePorRuc.disabled = false;
            }
        });
    }

    if (btnLimpiarCliente) {
        btnLimpiarCliente.addEventListener('click', function() {
            document.getElementById('cliente_id').value = '';
            document.getElementById('cliente_razon_social').value = '';
            document.getElementById('cliente_doc').value = '';
            document.getElementById('cliente_direccion').value = '';
            document.getElementById('telefono_contacto').value = '';
            document.getElementById('cliente_contacto').value = '';
            document.getElementById('email_contacto_cliente').value = '';
            document.getElementById('requerimiento').value = '';
            if (buscarRucInput) buscarRucInput.value = '';
            mostrarNotificacion('🧹 Cliente limpiado', 'info');
        });
    }

    // =========================
    // CONFIGURAR TIEMPO DE ENTREGA
    // =========================
    function configurarTiempoEntrega() {
        const select = document.getElementById('tiempo_entrega_select');
        const input = document.getElementById('tiempo_entrega');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de tiempo de entrega no encontrados');
            return;
        }
        
        select.addEventListener('change', function() {
            const valor = this.value;
            if (valor === 'personalizado') {
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Ej: 10 días hábiles, 2 semanas, etc.';
                input.focus();
            } else if (valor === '') {
                input.style.display = 'none';
                input.value = '';
            } else {
                input.style.display = 'none';
                input.value = valor;
            }
        });
        
        input.addEventListener('focus', function() {
            select.value = 'personalizado';
            this.style.display = 'block';
        });
        
        if (input.value && input.value.trim() !== '') {
            let encontrado = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === input.value) {
                    select.value = input.value;
                    input.style.display = 'none';
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado && input.value !== '') {
                select.value = 'personalizado';
                input.style.display = 'block';
            }
        }
    }

    // =========================
    // CREAR NUEVO CLIENTE
    // =========================
    async function guardarNuevoCliente() {
        const tipoDocumento = document.getElementById('nuevo_tipo_documento')?.value;
        const numeroDocumento = document.getElementById('nuevo_numero_documento')?.value.trim();
        const razonSocial = document.getElementById('nuevo_razon_social')?.value.trim();
        
        if (!numeroDocumento) {
            mostrarNotificacion('⚠️ Ingrese el número de documento', 'warning');
            return;
        }
        
        if (!razonSocial) {
            mostrarNotificacion('⚠️ Ingrese la razón social', 'warning');
            return;
        }
        
        const btnGuardar = document.getElementById('btnGuardarNuevoCliente');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
        btnGuardar.disabled = true;
        
        try {
            const payload = {
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento,
                razon_social: razonSocial,
                nombre_comercial: document.getElementById('nuevo_nombre_comercial')?.value.trim() || '',
                direccion_fiscal: document.getElementById('nuevo_direccion_fiscal')?.value.trim() || '',
                telefono_contacto: document.getElementById('nuevo_telefono')?.value.trim() || '',
                email_contacto: document.getElementById('nuevo_email')?.value.trim() || '',
                nombre_contacto: document.getElementById('nuevo_nombre_contacto')?.value.trim() || ''
                
            };
            
            const response = await fetch('/api/clientes/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('formNuevoCliente')?.reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoCliente'));
                modal.hide();
                mostrarNotificacion('✅ Cliente creado exitosamente', 'success');
                await cargarClienteEnCotizacion(result.data.id);
            } else {
                mostrarNotificacion('❌ Error: ' + (result.error || 'No se pudo crear el cliente'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error de conexión', 'danger');
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    }

    async function cargarClienteEnCotizacion(clienteId) {
        try {
            const response = await fetch(`/api/clientes/${clienteId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const cliente = result.data;
                
                document.getElementById('cliente_id').value = cliente.id;
                document.getElementById('cliente_razon_social').value = cliente.razon_social;
                document.getElementById('cliente_doc').value = cliente.numero_documento || '';
                document.getElementById('cliente_direccion').value = cliente.direccion_fiscal || '';
                document.getElementById('telefono_contacto').value = cliente.telefono_contacto || '';
                document.getElementById('cliente_contacto').value = cliente.nombre_contacto || '';
                document.getElementById('email_contacto_cliente').value = cliente.email_contacto || '';
                
                await cargarDireccionesCliente(cliente.id);
                
                mostrarNotificacion('✅ Cliente cargado correctamente', 'success');
            }
        } catch (error) {
            console.error('Error cargando cliente:', error);
        }
    }

    // =========================
    // MODAL DE CONFIRMACIÓN
    // =========================
    function mostrarModalConfirmacion(datos) {
        const modalBody = document.getElementById('modalConfirmacionBody');
        if (!modalBody) return;
        
        const telefonoActual = document.getElementById('telefono_contacto')?.value || '';
        const atencionActual = document.getElementById('cliente_contacto')?.value || '';
        const correoActual = document.getElementById('email_contacto_cliente')?.value || '';
        const requerimientoActual = document.getElementById('requerimiento')?.value || '';
        const direccionActual = document.getElementById('direccion_entrega')?.value || '';
        
        const ahora = new Date();
        const fechaActual = ahora.toLocaleDateString('es-PE');
        const horaActual = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        
        modalBody.innerHTML = `
            <div class="text-center mb-3"><i class="bi bi-check-circle-fill" style="font-size: 48px; color: #10b981;"></i></div>
            <div class="alert alert-success"><strong>✅ ¡Cotización guardada exitosamente!</strong></div>
            <div class="row">
                <div class="col-6"><strong>Número:</strong></div>
                <div class="col-6">${datos.numero || datos.codigo_cotizacion}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Tipo:</strong></div>
                <div class="col-6">${datos.tipo || (esBorrador ? 'BORRADOR' : 'OFICIAL')}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Asesor:</strong></div>
                <div class="col-6">${usuarioActual?.nombre_completo || 'No asignado'}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Fecha:</strong></div>
                <div class="col-6">${fechaActual}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Hora:</strong></div>
                <div class="col-6">${horaActual}</div>
            </div>
            <hr>
            <div class="text-muted small"><i class="bi bi-info-circle"></i> El código es único y quedará registrado.</div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
        modal.show();
        
        document.getElementById('btnDescargarPDFModal').onclick = () => {
            const cotId = document.getElementById('cotizacion_id')?.value;
            if (cotId && !esBorrador) {
                const params = new URLSearchParams({
                    telefono_contacto: telefonoActual,
                    cliente_contacto: atencionActual,
                    email_contacto_cliente: correoActual,
                    requerimiento: requerimientoActual,
                    direccion_entrega: direccionActual
                });
                const pdfUrl = `/api/cotizacion/pdf/${cotId}?${params.toString()}`;
                window.open(pdfUrl, '_blank');
            } else {
                mostrarNotificacion('⚠️ Debe convertir a oficial antes de generar PDF', 'warning');
            }
        };
        
        document.getElementById('btnNuevaCotizacionModal').onclick = () => {
            window.location.href = '/cotizacion/nueva';
        };
    }

    // =========================
    // ESTADO GLOBAL
    // =========================
    let estadoCotizacion = 'En Proceso';
    let cotizacionBloqueada = false;
    let datosModificados = false;
    let itemCounter = 0;
    let modoConsulta = false;

    const tableBody = document.getElementById('table-body');
    const portal = document.getElementById('portalSuggestions');

    function portalHide() {
        if (portal) {
            portal.style.display = 'none';
            portal.innerHTML = '';
        }
    }

    function portalShow(inputEl, html) {
        if (!portal) return;
        const rect = inputEl.getBoundingClientRect();
        portal.style.left = rect.left + 'px';
        portal.style.top = (rect.bottom + 4) + 'px';
        portal.style.minWidth = Math.max(rect.width, 280) + 'px';
        portal.innerHTML = html;
        portal.style.display = 'block';
    }

    // =========================
    // OBTENER LISTA DE PRODUCTOS
    // =========================
    function obtenerListaProductos() {
        const filas = document.querySelectorAll("#table-body tr");
        let listaProductos = [];

        filas.forEach(row => {
            const getInput = (selector) => {
                const el = row.querySelector(selector);
                return el ? el.value : 0;
            };

            const cantidad = Number(getInput('.cantidad')) || 0;
            const precio_venta_unitario = Number(getInput('.precio_venta_unitario')) || 0;
            const valor_venta_total = cantidad * precio_venta_unitario;

            const producto = {
                producto_id: Number(getInput('.producto_id')) || null,
                codigo: getInput('.codigo_producto') || '',
                descripcion: getInput('.descripcion') || '',
                modelo: getInput('.modelo') || '',
                marca: getInput('.marca') || '',
                unidad_medida: getInput('.unidad_medida') || '',
                cantidad: cantidad,
                precio_venta_unitario: precio_venta_unitario,
                subtotal_venta: valor_venta_total,
                costo_unitario: Number(getInput('.costo_unitario')) || 0,
                subtotal_costo: cantidad * (Number(getInput('.costo_unitario')) || 0),
                margen_porcentaje: 20,
                descuento_porcentaje: 0,
                precio_venta_con_descuento: precio_venta_unitario,
                subtotal_venta_con_descuento: valor_venta_total,
                descuento_total: 0,
                margen_final: 20
            };

            listaProductos.push(producto);
        });

        return listaProductos;
    }

    // =========================
    // FUNCIONES DE BÚSQUEDA
    // =========================
    async function buscarClientes(q) {
        try {
            const res = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            return json.data || [];
        } catch (error) {
            console.error('Error buscando clientes:', error);
            return [];
        }
    }

    async function buscarProductos(q) {
        try {
            console.log('🔎 Buscando productos con:', q);
            const res = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            console.log('📦 Productos encontrados:', json);
            return json.data || [];
        } catch (error) {
            console.error('Error buscando productos:', error);
            return [];
        }
    }

    async function buscarAsesores(q) {
        try {
            const res = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            if (!json.success) return [];
            return json.data || [];
        } catch (error) {
            console.error('Error buscando asesores:', error);
            return [];
        }
    }

    async function buscarContactos(clienteId, q) {
        if (!clienteId) return [];
        try {
            const res = await fetch(`/api/clientes/${clienteId}/contactos?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            return json.data || [];
        } catch (error) {
            console.error('Error buscando contactos:', error);
            return [];
        }
    }

    // =========================
    // GUARDAR COTIZACIÓN CON DESCUENTO PERSONALIZADO
    // =========================
   async function guardarCotizacion() {
    const cliente_id = Number(document.getElementById('cliente_id')?.value || 0);
    if (!cliente_id) { mostrarNotificacion("⚠️ Selecciona cliente", "warning"); return; }

    const listaProductos = obtenerListaProductos();
    if (listaProductos.length === 0) { mostrarNotificacion("⚠️ Agrega items", "warning"); return; }
    
    for (let i = 0; i < listaProductos.length; i++) {
        if (!listaProductos[i].producto_id) { mostrarNotificacion(`⚠️ Falta seleccionar producto en la fila ${i + 1}`, "warning"); return; }
    }
    
    const totalSinDescuento = Number(document.getElementById('total_valor_venta')?.textContent || 0);
    
    const descuentoInput = document.getElementById('descuento_porcentaje_input');
    const descuentoTipo = document.getElementById('descuento_tipo');
    let descuentoPorcentaje = 0;
    let descuentoMonto = 0;
    
    if (descuentoInput && descuentoInput.value) {
        const valorDescuento = parseFloat(descuentoInput.value) || 0;
        
        if (descuentoTipo && descuentoTipo.value === 'monto') {
            descuentoMonto = Math.min(valorDescuento, totalSinDescuento);
            descuentoPorcentaje = (descuentoMonto / totalSinDescuento) * 100;
        } else {
            descuentoPorcentaje = valorDescuento;
            descuentoMonto = totalSinDescuento * (descuentoPorcentaje / 100);
        }
    }
    
    const totalConDescuento = totalSinDescuento - descuentoMonto;
    const igv = totalConDescuento * 0.18;
    const subtotal = totalConDescuento - igv;
    
    // 🔥 OBTENER EL ID DE LA COTIZACIÓN (si existe)
    const cotizacion_id = document.getElementById('cotizacion_id')?.value;
    
   const payload = {
    id: cotizacion_id && cotizacion_id !== '' && cotizacion_id !== 'None' ? parseInt(cotizacion_id) : null,
    cliente_id: cliente_id,
    usuario_id: Number(document.getElementById("usuario_id")?.value || 0),
    estado: document.getElementById("estado")?.value || "En Proceso",
    subtotal: subtotal,
    igv: igv,
    total: totalConDescuento,
    condicion_pago: document.getElementById("condicion_pago")?.value || "",
    tiempo_entrega: document.getElementById("tiempo_entrega")?.value || "",
    validez_oferta: document.getElementById("validez_oferta")?.value || "",
    direccion_entrega: document.getElementById("direccion_entrega")?.value || "",
    requerimiento: document.getElementById("requerimiento")?.value || "",
    nota_cotizacion: document.getElementById("nota_cotizacion")?.value || "",
    notas: document.getElementById('notas')?.value || "",
    productos: listaProductos,
    codigo_cotizacion: codigoCotizacionActual,
    correlativo: esBorrador ? 0 : correlativoActual,
    es_borrador: esBorrador,
    descuento_porcentaje: descuentoPorcentaje,
    descuento_monto: descuentoMonto,
    descuento_tipo: descuentoTipo?.value || 'porcentaje',
    cliente_contacto: document.getElementById('cliente_contacto') ? document.getElementById('cliente_contacto').value : '',
    telefono_contacto: document.getElementById('telefono_contacto')?.value || '',
    email_contacto_cliente: document.getElementById('email_contacto_cliente')?.value || ''
};

        const btnGuardar = esBorrador ? document.getElementById('btnGuardarBorrador') : document.getElementById('btnGuardarOficial');
        const textoOriginal = btnGuardar?.innerHTML;
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
            btnGuardar.disabled = true;
        }
        
        try {
            const res = await fetch('/api/cotizacion/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (!json.success) { 
                mostrarNotificacion("❌ Error: " + (json.error || "Error desconocido"), "danger");
                return; 
            }
            
            document.getElementById('cotizacion_id').value = json.data.id;
            
            if (!esBorrador) {
                correlativoActual++;
            }
            
            if (!esBorrador) {
                actualizarEstadoBotonPDF();
            }
            
            mostrarModalConfirmacion({ 
                id: json.data.id, 
                numero: json.data.codigo_cotizacion, 
                tipo: esBorrador ? 'BORRADOR' : 'OFICIAL' 
            });
            
        } catch (err) { 
            console.error(err); 
            mostrarNotificacion("❌ Error de conexión con el servidor", "danger");
        } finally {
            if (btnGuardar) {
                btnGuardar.innerHTML = textoOriginal;
                btnGuardar.disabled = false;
            }
        }
    }

    // =========================
    // CONVERTIR A OFICIAL
    // =========================
    async function convertirAOficial() {
        if (!esBorrador) { 
            mostrarNotificacion("⚠️ Esta cotización ya es oficial", "warning"); 
            return; 
        }
        
        const cliente_id = Number(document.getElementById('cliente_id')?.value || 0);
        if (!cliente_id) {
            mostrarNotificacion("⚠️ Debe seleccionar un cliente antes de convertir a oficial", "warning");
            return;
        }
        
        const listaProductos = obtenerListaProductos();
        if (listaProductos.length === 0) {
            mostrarNotificacion("⚠️ Debe agregar al menos un producto antes de convertir a oficial", "warning");
            return;
        }
        
        for (let i = 0; i < listaProductos.length; i++) {
            if (!listaProductos[i].precio_venta_unitario || listaProductos[i].precio_venta_unitario <= 0) {
                mostrarNotificacion(`⚠️ El producto ${listaProductos[i].codigo || 'sin código'} no tiene precio de venta válido`, "warning");
                return;
            }
        }
        
        if (!confirm("¿Convertir este borrador a cotización oficial?\n\nEsta acción generará un código único y definitivo.")) return;
        
        const nuevoCodigo = await generarCodigoOficial();
        if (nuevoCodigo) {
            esBorrador = false;
            actualizarNumeroCotizacionUI(nuevoCodigo, false);
            document.getElementById('estado').value = 'Generada';
            await guardarCotizacion();
            mostrarNotificacion(`✅ Cotización convertida a OFICIAL\nNúmero: ${nuevoCodigo}`, "success");
        } else {
            mostrarNotificacion("❌ Error al generar código oficial. Intente nuevamente.", "danger");
        }
    }

    // =========================
    // GENERAR PDF
    // =========================
    function generatePdf() {
        const cotId = document.getElementById('cotizacion_id')?.value;
        
        if (!cotId || cotId === '' || cotId === 'None') {
            mostrarNotificacion("⚠️ Debe guardar la cotización primero", "warning");
            return;
        }
        
        if (esBorrador) {
            mostrarNotificacion("⚠️ Debe convertir la cotización a OFICIAL antes de generar PDF", "warning");
            return;
        }
        
        const telefono = document.getElementById('telefono_contacto')?.value || '';
        const atencion = document.getElementById('cliente_contacto')?.value || '';
        const correo = document.getElementById('email_contacto_cliente')?.value || '';
        const requerimiento = document.getElementById('requerimiento')?.value || '';
        const direccionEntrega = document.getElementById('direccion_entrega')?.value || '';
        
        console.log("📄 Generando PDF con datos:", {
            telefono, atencion, correo, requerimiento, direccionEntrega
        });
        
        const params = new URLSearchParams({
            telefono_contacto: telefono,
            cliente_contacto: atencion,
            email_contacto_cliente: correo,
            requerimiento: requerimiento,
            direccion_entrega: direccionEntrega
        });
        
        const pdfUrl = `/api/cotizacion/pdf/${cotId}?${params.toString()}`;
        
        try {
            mostrarNotificacion("📄 Generando PDF, espere...", "info");
            window.open(pdfUrl, '_blank');
        } catch (error) {
            console.error('Error al generar PDF:', error);
            mostrarNotificacion("❌ Error al generar el PDF", "danger");
        }
    }

    // =========================
    // SET PRODUCTO EN FILA
    // =========================
   // =========================
function setProductoEnFila(row, p) {  
    const productoIdInput = row.querySelector('.producto_id');
    const codigoInput = row.querySelector('.codigo_producto');
    const descripcionInput = row.querySelector('.descripcion');
    const modeloInput = row.querySelector('.modelo');
    const marcaInput = row.querySelector('.marca');
    const unidadMedidaInput = row.querySelector('.unidad_medida');
    const costoUnitarioInput = row.querySelector('.costo_unitario');
    const precioVentaInput = row.querySelector('.precio_venta_unitario');
    const stockActualInput = row.querySelector('.stock_actual');
    const stockBadge = row.querySelector('.stock-badge');
    const cantidadInput = row.querySelector('.cantidad');
    
    if (productoIdInput) productoIdInput.value = p.id;
    if (codigoInput) codigoInput.value = p.codigo || "";
    if (descripcionInput) descripcionInput.value = p.descripcion || "";
    if (modeloInput) modeloInput.value = p.modelo || "";
    if (marcaInput) marcaInput.value = p.marca || "";
    if (unidadMedidaInput) unidadMedidaInput.value = p.unidad_medida || "UNIDAD";
    if (costoUnitarioInput && p.costo_unitario) costoUnitarioInput.value = p.costo_unitario;
    if (precioVentaInput && p.precio_unitario) precioVentaInput.value = p.precio_unitario;
    
    // 🔥 CAMBIO 3: Mostrar stock en el badge
    const stock = p.stock || 0;
    if (stockActualInput) stockActualInput.value = stock;
    if (stockBadge) {
        stockBadge.textContent = stock;
        stockBadge.style.backgroundColor = stock < 5 ? '#fee2e2' : '#d1fae5';
        stockBadge.style.color = stock < 5 ? '#dc2626' : '#065f46';
    }
    
    // 🔥 CAMBIO 4: Validar stock con cantidad actual
    let cantidadActual = cantidadInput ? parseFloat(cantidadInput.value) || 1 : 1;
    if (cantidadActual > stock && stock > 0) {
        mostrarNotificacion(`⚠️ Stock insuficiente. Solo hay ${stock} unidades disponibles`, "warning");
        if (cantidadInput) cantidadInput.value = stock;
        setTimeout(() => recalculateAll(), 50);
    }
}
    // =========================
    // AUTOCOMPLETES
    // =========================
  function attachClienteAutocomplete(idInput) {
    const input = document.getElementById(idInput);
    if (!input) return;
    let timeoutId = null;

    input.addEventListener('input', async () => {
        const q = input.value.trim();
        if (timeoutId) clearTimeout(timeoutId);
        if (q.length < 2) { portalHide(); return; }
        
        timeoutId = setTimeout(async () => {
            const clientes = await buscarClientes(q);
            if (!clientes.length) { 
                portalShow(input, `<div class="empty">No encontrado</div>`); 
                return; 
            }

            // 🔥 Asegurar que todos los datos estén en el HTML
            const html = clientes.map(c => `<div class="item" 
                data-id="${c.id || ''}" 
                data-razon="${c.razon_social || ''}" 
                data-doc="${c.numero_documento || ''}" 
                data-direccion="${c.direccion_fiscal || ''}" 
                data-telefono="${c.telefono_contacto || ''}" 
                data-contacto="${c.nombre_contacto || ''}" 
                data-email="${c.email_contacto || ''}">
                    <strong>🏢 ${c.razon_social || ''}</strong>
                    <div class="meta">📄 ${c.numero_documento || 'Sin documento'}</div>
                    <div class="meta">📞 ${c.telefono_contacto || 'Sin teléfono'} • ✉️ ${c.email_contacto || 'Sin email'}</div>
                    <div class="meta">👤 Contacto: ${c.nombre_contacto || 'No especificado'}</div>
                </div>`).join('');
            portalShow(input, html);

            portal.querySelectorAll('.item').forEach(el => {
                el.addEventListener('click', async () => {
                    console.log("📦 Cliente seleccionado:", {
                        id: el.dataset.id,
                        razon: el.dataset.razon,
                        doc: el.dataset.doc,
                        direccion: el.dataset.direccion,
                        telefono: el.dataset.telefono,
                        contacto: el.dataset.contacto,
                        email: el.dataset.email
                    });
                    
                    // 🔥 ASIGNAR VALORES A TODOS LOS CAMPOS
                    const clienteIdInput = document.getElementById('cliente_id');
                    if (clienteIdInput) clienteIdInput.value = el.dataset.id || '';
                    
                    const razonSocialInput = document.getElementById('cliente_razon_social');
                    if (razonSocialInput) razonSocialInput.value = el.dataset.razon || '';
                    
                    const docInput = document.getElementById('cliente_doc');
                    if (docInput) docInput.value = el.dataset.doc || '';
                    
                    const direccionInput = document.getElementById('cliente_direccion');
                    if (direccionInput) direccionInput.value = el.dataset.direccion || '';
                    
                    const telefonoInput = document.getElementById('telefono_contacto');
                    if (telefonoInput) telefonoInput.value = el.dataset.telefono || '';
                    
                    const contactoInput = document.getElementById('cliente_contacto');
                    if (contactoInput) contactoInput.value = el.dataset.contacto || '';
                    
                    const emailInput = document.getElementById('email_contacto_cliente');
                    if (emailInput) emailInput.value = el.dataset.email || '';
                    
                    // Cargar direcciones guardadas
                    if (el.dataset.id) {
                        await cargarDireccionesCliente(el.dataset.id);
                    }
                    
                    portalHide();
                });
            });
        }, 300);
    });
}

  function attachProductoAutocomplete(row) {
    const input = row.querySelector('.codigo_producto');
    
    if (!input) {
        console.error('❌ No se encontró input .codigo_producto en la fila');
        return;
    }
    
    let timeoutId = null;

    input.addEventListener('input', async () => {
        const q = input.value.trim();
        
        if (timeoutId) clearTimeout(timeoutId);
        if (q.length < 2) { 
            portalHide(); 
            return; 
        }
        
        timeoutId = setTimeout(async () => {
            const productos = await buscarProductos(q);
            
            if (!productos.length) { 
                portalShow(input, `<div class="empty">❌ No se encontraron productos</div>`); 
                return; 
            }

            // 🔥 CAMBIO 1: Agregar data-stock en cada item
            const html = productos.map(p => `<div class="item" 
                data-id="${p.id}" 
                data-codigo="${p.codigo}" 
                data-descripcion="${p.descripcion}" 
                data-modelo="${p.modelo || ''}" 
                data-marca="${p.marca || ''}" 
                data-unidad="${p.unidad || 'UNIDAD'}" 
                data-costo="${p.costo_unitario || 0}" 
                data-precio="${p.precio_unitario || 0}"
                data-stock="${p.stock || 0}">
                    <strong>📦 ${p.codigo}</strong> - ${p.descripcion}
                    <div class="meta">${p.marca || ''} • Stock: ${p.stock || 0}</div>
                </div>`).join('');
            portalShow(input, html);

            portal.querySelectorAll('.item').forEach(el => {
                el.addEventListener('click', () => {
                    // 🔥 CAMBIO 2: Leer el stock del dataset
                    const stockValue = parseInt(el.dataset.stock) || 0;
                    
                    const productoData = {
                        id: el.dataset.id,
                        codigo: el.dataset.codigo,
                        descripcion: el.dataset.descripcion,
                        modelo: el.dataset.modelo,
                        marca: el.dataset.marca,
                        unidad_medida: el.dataset.unidad,
                        costo_unitario: parseFloat(el.dataset.costo) || 0,
                        precio_unitario: parseFloat(el.dataset.precio) || 0,
                        stock: stockValue  // 🔥 CLAVE: asignar el stock
                    };
                    setProductoEnFila(row, productoData);
                    portalHide();
                    recalculateAll();
                });
            });
        }, 300);
    });
}

    function attachAsesorAutocomplete() {
        const input = document.getElementById('asesor_comercial');
        if (!input) return;
        let timeoutId = null;

        input.addEventListener('input', async () => {
            const q = input.value.trim();
            if (timeoutId) clearTimeout(timeoutId);
            if (q.length < 2) { portalHide(); return; }
            
            timeoutId = setTimeout(async () => {
                const asesores = await buscarAsesores(q);
                if (!asesores.length) { portalShow(input, `<div class="empty">Asesor no encontrado</div>`); return; }

                const html = asesores.map(a => `<div class="item" data-id="${a.id}" data-nombre="${a.nombre_completo}" data-email="${a.email || ''}" data-telefono="${a.telefono || ''}">
                    <strong>👨‍💼 ${a.nombre_completo}</strong><div class="meta">${a.rol || 'Asesor'} • ${a.codigo_vendedor || ''}</div></div>`).join('');
                portalShow(input, html);

                portal.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', () => {
                        document.getElementById("usuario_id").value = el.dataset.id;
                        document.getElementById('asesor_comercial').value = el.dataset.nombre;
                        document.getElementById('email_contacto').value = el.dataset.email;
                        document.getElementById('telefono_contacto_user').value = el.dataset.telefono;
                        portalHide();
                    });
                });
            }, 300);
        });
    }

    function attachContactoAutocomplete() {
        const input = document.getElementById('cliente_contacto');
        if (!input) return;
        let timeoutId = null;
        
        input.addEventListener('input', async () => {
            const q = input.value.trim();
            const clienteId = document.getElementById('cliente_id')?.value;
            if (timeoutId) clearTimeout(timeoutId);
            
            if (!clienteId) {
                portalShow(input, `<div class="item" data-value="A tratar"><strong>📝 A tratar</strong><div class="meta">Contacto por definir</div></div>`);
                return;
            }
            
            timeoutId = setTimeout(async () => {
                const contactos = await buscarContactos(clienteId, q);
                let html = '';
                if (contactos.length > 0) {
                    html = contactos.map(c => `<div class="item" data-value="${c.nombre_contacto}"><strong>👤 ${c.nombre_contacto}</strong><div class="meta">${c.cargo || 'Contacto'} • ${c.telefono || ''}</div></div>`).join('');
                }
                html += `<div class="item" data-value="A tratar"><strong>📝 A tratar</strong><div class="meta">Negociación</div></div>`;
                portalShow(input, html);
                
                portal.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', () => { input.value = el.dataset.value; portalHide(); });
                });
            }, 300);
        });
    }

  // =========================
// RECALCULAR CON DESCUENTO PERSONALIZABLE Y VALIDACIÓN DE STOCK
// =========================
function recalculateAll() {
    const rows = document.querySelectorAll("#table-body tr");
    let totalValorVenta = 0;
    let hayErrorStock = false;

    rows.forEach(r => {
        const cantidad = Number(r.querySelector('.cantidad')?.value || 0);
        const precioVenta = Number(r.querySelector('.precio_venta_unitario')?.value || 0);
        
        // 🔥 CAMBIO 6: Obtener stock actual del badge
        const stockBadge = r.querySelector('.stock-badge');
        let stockActual = 0;
        if (stockBadge) {
            stockActual = parseInt(stockBadge.textContent) || 0;
        } else {
            const stockHidden = r.querySelector('.stock_actual');
            if (stockHidden) stockActual = parseInt(stockHidden.value) || 0;
        }
        
        const cantidadInput = r.querySelector('.cantidad');
        const codigoProducto = r.querySelector('.codigo_producto')?.value || 'producto';
        
        // 🔥 CAMBIO 7: Validar cantidad vs stock
        if (stockActual > 0 && cantidad > stockActual) {
            if (!hayErrorStock) {
                mostrarNotificacion(`⚠️ Stock insuficiente para "${codigoProducto}". Máximo disponible: ${stockActual}`, "warning");
                hayErrorStock = true;
            }
            if (cantidadInput) cantidadInput.value = stockActual;
            const cantidadCorregida = stockActual;
            const valorVentaTotalCorregido = cantidadCorregida * precioVenta;
            const valorVentaTotalElem = r.querySelector('.valor_venta_total');
            if (valorVentaTotalElem) valorVentaTotalElem.textContent = formatCantidad(valorVentaTotalCorregido);
            totalValorVenta += valorVentaTotalCorregido;
            return;
        }
        
        const valorVentaTotal = cantidad * precioVenta;
        const valorVentaTotalElem = r.querySelector('.valor_venta_total');
        if (valorVentaTotalElem) valorVentaTotalElem.textContent = formatCantidad(valorVentaTotal);
        totalValorVenta += valorVentaTotal;
    });

    // ... el resto de tu código de descuento y totales sigue igual
    const totalValorVentaElem = document.getElementById('total_valor_venta');
    if (totalValorVentaElem) totalValorVentaElem.textContent = formatCantidad(totalValorVenta);
    
    const summarySubtotal = document.getElementById('summary_subtotal_venta');
    if (summarySubtotal) summarySubtotal.textContent = formatCantidad(totalValorVenta);
    
    // ... resto del código de descuento (no cambia)
    const descuentoInput = document.getElementById('descuento_porcentaje_input');
    const descuentoTipo = document.getElementById('descuento_tipo');
    let descuentoValor = 0;
    let descuentoMonto = 0;
    
    if (descuentoInput && descuentoInput.value) {
        descuentoValor = parseFloat(descuentoInput.value) || 0;
        if (descuentoTipo && descuentoTipo.value === 'monto') {
            descuentoMonto = Math.min(descuentoValor, totalValorVenta);
        } else {
            descuentoMonto = totalValorVenta * (descuentoValor / 100);
        }
    }
    
    const subtotalConDescuento = totalValorVenta - descuentoMonto;
    const igv = subtotalConDescuento * 0.18;
    const totalVenta = subtotalConDescuento + igv;
    
    const summaryDescuento = document.getElementById('summary_descuento');
    if (summaryDescuento) summaryDescuento.textContent = formatCantidad(descuentoMonto);
    
    const summarySubtotalDescuento = document.getElementById('summary_subtotal_descuento');
    if (summarySubtotalDescuento) summarySubtotalDescuento.textContent = formatCantidad(subtotalConDescuento);
    
    const summaryIgv = document.getElementById('summary_igv');
    if (summaryIgv) summaryIgv.textContent = formatCantidad(igv);
    
    const summaryTotal = document.getElementById('summary_total_venta');
    if (summaryTotal) summaryTotal.textContent = formatCantidad(totalVenta);
    
    const descuentoHidden = document.getElementById('descuento_porcentaje');
    if (descuentoHidden) {
        if (descuentoTipo && descuentoTipo.value === 'monto') {
            descuentoHidden.value = descuentoValor;
        } else {
            descuentoHidden.value = descuentoValor;
        }
    }
}
    
   // =========================
// AGREGAR ITEMS (CON STOCK)
// =========================
function addItem() {
    if (cotizacionBloqueada) { 
        mostrarNotificacion("⚠️ La cotización está bloqueada.", "warning"); 
        return; 
    }
    itemCounter++;
    const row = document.createElement("tr");
    row.innerHTML = `
        <td class="col-item">${itemCounter}</td>
        <td class="col-codigo">
            <input type="text" class="codigo_producto" placeholder="Buscar producto..." style="width:100%; min-width:120px;">
            <input type="hidden" class="producto_id">
            <input type="hidden" class="costo_unitario" value="0">
            <input type="hidden" class="stock_actual" value="0">
        </td>
        <td class="col-desc"><input type="text" class="descripcion" readonly style="width:100%;"></td>
        <td class="col-modelo"><input type="text" class="modelo" readonly style="width:100%;"></td>
        <td class="col-marca"><input type="text" class="marca" readonly style="width:100%;"></td>
        <td class="col-unidad"><input type="text" class="unidad_medida" value="UNIDAD" style="width:100%;"></td>
        <td class="col-cantidad"><input type="number" class="cantidad" value="1" step="0.01" style="width:100%;"></td>
        <td class="col-precio"><input type="number" class="precio_venta_unitario" value="0" step="0.01" style="width:100%;"></td>
        <td class="valor_venta_total">0.00</td>
        <td class="col-eliminar"><button class="btn-del">🗑</button></td>
        <!-- 🔥 CAMBIO 5: Agregar badge de stock -->
        <td class="col-stock" style="text-align:center;">
            <span class="stock-badge" style="display:inline-block; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600;">0</span>
        </td>
    `;
    
    if (tableBody) tableBody.appendChild(row);
    
    attachProductoAutocomplete(row);
    
    const rec = () => { 
        if (!modoConsulta) { 
            recalculateAll(); 
            datosModificados = true; 
        } 
    };
    
    row.querySelector('.cantidad')?.addEventListener('input', rec);
    row.querySelector('.precio_venta_unitario')?.addEventListener('input', rec);
    row.querySelector('.btn-del')?.addEventListener('click', () => { 
        row.remove(); 
        recalculateAll(); 
    });
    
    setTimeout(recalculateAll, 50);
}

    // =========================
    // ESTADO VISUAL
    // =========================
    function actualizarEstadoVisual() {
        const estadoElement = document.getElementById('estado_fixed');
        const estadoTexto = document.getElementById('estado_texto');
        if (!estadoElement || !estadoTexto) return;
        estadoTexto.textContent = estadoCotizacion.toUpperCase();
        estadoElement.className = 'erp-status ';
        if (estadoCotizacion === 'En Proceso') estadoElement.classList.add('estado-en-proceso');
        else if (estadoCotizacion === 'Generada') estadoElement.classList.add('estado-generada');
        else if (estadoCotizacion === 'Aceptada por Cliente') estadoElement.classList.add('estado-aceptada');
        else if (estadoCotizacion === 'Rechazada') estadoElement.classList.add('estado-rechazada');
        else estadoElement.classList.add('estado-en-proceso');
        actualizarBotones();
    }

    function actualizarBotones() {
        const pdfBtn = document.getElementById('btnPdf');
        const guardarBorrador = document.getElementById('btnGuardarBorrador');
        const guardarOficial = document.getElementById('btnGuardarOficial');
        const agregarBtn = document.getElementById('btnAgregarItem');
        if (modoConsulta) {
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
            if (agregarBtn) agregarBtn.disabled = true;
            if (pdfBtn) pdfBtn.disabled = false;
            cotizacionBloqueada = true;
            return;
        }
        if (estadoCotizacion === 'En Proceso') {
            cotizacionBloqueada = false;
            if (guardarBorrador) guardarBorrador.disabled = false;
            if (guardarOficial) guardarOficial.disabled = false;
        } else {
            cotizacionBloqueada = true;
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
        }
    }

    function aplicarBloqueoUI() {
        const disabled = cotizacionBloqueada;
        document.querySelectorAll('#table-body input').forEach(i => i.disabled = disabled);
        ['cliente_razon_social', 'cliente_doc', 'telefono_contacto', 'cliente_contacto', 'email_contacto_cliente', 'requerimiento', 'direccion_entrega', 'estado'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        ['asesor_comercial', 'email_contacto', 'telefono_contacto_user', 'condicion_pago', 'tiempo_entrega', 'validez_oferta', 'nota_cotizacion', 'notas', 'descuento_porcentaje_input', 'descuento_tipo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        const btnAgregar = document.getElementById('btnAgregarItem');
        if (btnAgregar) btnAgregar.disabled = disabled;
        document.querySelectorAll('#table-body .btn-del').forEach(b => b.disabled = disabled);
    }

    function showModificarModal() {
        const modal = document.getElementById('modalModificar');
        if (modal) modal.style.display = 'block';
    }

    function showAceptadaModal() {
        if (estadoCotizacion !== 'Generada' && estadoCotizacion !== 'oficial') {
            mostrarNotificacion("⚠️ Solo cotizaciones oficiales pueden ser aceptadas", "warning");
            return;
        }
        const modal = document.getElementById('modalAceptada');
        if (modal) modal.style.display = 'block';
    }

    async function cargarCotizacion(id) {
        try {
            console.log("🔍 Cargando cotización ID:", id);
            const res = await fetch(`/api/cotizacion/${id}`);
            const json = await res.json();
            console.log("📦 Datos recibidos:", json);
            
            if (!json.success) { 
                mostrarNotificacion("Error al cargar cotización", "danger"); 
                return; 
            }
            
            const data = json.data;
            console.log("✅ Datos de cotización:", data);
            
            if (data.codigo_cotizacion) {
                codigoCotizacionActual = data.codigo_cotizacion;
                correlativoActual = data.correlativo || 0;
                esBorrador = data.codigo_cotizacion.startsWith('TMP-');
                actualizarNumeroCotizacionUI(data.codigo_cotizacion, esBorrador);
            }
            
            if (data.cliente_id) {
                document.getElementById('cliente_id').value = data.cliente_id;
            }
            document.getElementById('cliente_razon_social').value = data.cliente || data.razon_social || '';
            document.getElementById('cliente_doc').value = data.numero_documento || data.cliente_ruc || '';
            document.getElementById('cliente_direccion').value = data.direccion_fiscal || '';
        document.getElementById('cliente_contacto').value = data.cliente_contacto || '';
        document.getElementById('email_contacto_cliente').value = data.email_contacto_cliente || '';
        document.getElementById('telefono_contacto').value = data.telefono_contacto || '';
            
            document.getElementById('estado').value = data.estado || 'En Proceso';
            document.getElementById('notas').value = data.notas || '';
            document.getElementById('requerimiento').value = data.requerimiento || '';
            document.getElementById('condicion_pago').value = data.condicion_pago || 'Contado';
            document.getElementById('tiempo_entrega').value = data.tiempo_entrega || '';
            document.getElementById('validez_oferta').value = data.validez_oferta || '15 días';
            document.getElementById('direccion_entrega').value = data.direccion_entrega || '';
            document.getElementById('nota_cotizacion').value = data.nota_cotizacion || '';
            
            document.getElementById('usuario_id').value = data.usuario_id || '';
            document.getElementById('asesor_comercial').value = data.nombre_completo || '';
            document.getElementById('email_contacto').value = data.email || '';
            document.getElementById('telefono_contacto_user').value = data.telefono || '';
            
            // Cargar descuento si existe
            if (data.descuento_porcentaje !== undefined && data.descuento_porcentaje !== null) {
                const descuentoInput = document.getElementById('descuento_porcentaje_input');
                const descuentoTipo = document.getElementById('descuento_tipo');
                if (descuentoInput) descuentoInput.value = data.descuento_porcentaje;
                if (descuentoTipo && data.descuento_tipo) descuentoTipo.value = data.descuento_tipo;
            }
            
            const total = Number(data.total || 0);
            const totalValorVentaElem = document.getElementById('total_valor_venta');
            if (totalValorVentaElem) totalValorVentaElem.textContent = formatCantidad(total);
            
            const summarySubtotal = document.getElementById('summary_subtotal_venta');
            if (summarySubtotal) summarySubtotal.textContent = formatCantidad(total);
            
            const summaryIgv = document.getElementById('summary_igv');
            if (summaryIgv) summaryIgv.textContent = formatCantidad(Number(data.igv || 0));
            
            const summaryTotal = document.getElementById('summary_total_venta');
            if (summaryTotal) summaryTotal.textContent = formatCantidad(total);
            
            document.getElementById('table-body').innerHTML = '';
            itemCounter = 0;
            
            if (data.detalle && data.detalle.length > 0) {
            data.detalle.forEach(item => {
            addItem();
            const row = document.querySelector("#table-body tr:last-child");
            if (row) {
            row.querySelector('.producto_id').value = item.producto_id || '';
            row.querySelector('.cantidad').value = formatCantidad(item.cantidad || 0);
            row.querySelector('.precio_venta_unitario').value = item.precio_venta_unitario || 0;
            row.querySelector('.codigo_producto').value = item.codigo || '';
            row.querySelector('.descripcion').value = item.descripcion || '';
            row.querySelector('.modelo').value = item.modelo || '';
            row.querySelector('.marca').value = item.marca || '';
            row.querySelector('.unidad_medida').value = item.unidad_medida || 'UNIDAD';
            if (row.querySelector('.costo_unitario')) {
                row.querySelector('.costo_unitario').value = item.costo_unitario || 0;
            }
            // 🔥 AGREGAR ESTAS 4 LÍNEAS PARA RESTAURAR STOCK
            const stockBadge = row.querySelector('.stock-badge');
            if (stockBadge && item.stock !== undefined) {
                stockBadge.textContent = item.stock;
                stockBadge.style.backgroundColor = item.stock < 5 ? '#fee2e2' : '#d1fae5';
                stockBadge.style.color = item.stock < 5 ? '#dc2626' : '#065f46';
            }
        }
             });
                }
            
            recalculateAll();
            configurarTiempoEntrega();
            configurarDireccionEntrega();
            
            if (data.cliente_id) {
                await cargarDireccionesCliente(data.cliente_id);
            }
            
            actualizarEstadoBotonPDF();
            
        } catch (err) { 
            console.error("🔥 ERROR en cargarCotizacion:", err); 
            mostrarNotificacion("Error cargando cotización", "danger"); 
        }
    }

    // =========================
    // DIAGNÓSTICO
    // =========================
    function diagnosticar() {
        console.log('=== DIAGNÓSTICO ===');
        console.log('Estado cotización:', estadoCotizacion);
        console.log('Bloqueada:', cotizacionBloqueada);
        console.log('Modo consulta:', modoConsulta);
        console.log('Es borrador:', esBorrador);
        console.log('Item counter:', itemCounter);
        
        const filas = document.querySelectorAll("#table-body tr");
        console.log('Filas en tabla:', filas.length);
        
        filas.forEach((fila, idx) => {
            const codigoInput = fila.querySelector('.codigo_producto');
            console.log(`Fila ${idx + 1} - Input código:`, codigoInput ? '✅ Encontrado' : '❌ NO ENCONTRADO');
            if (codigoInput) {
                console.log(`  - Value: ${codigoInput.value}`);
                console.log(`  - Placeholder: ${codigoInput.placeholder}`);
            }
        });
        
        mostrarNotificacion('Diagnóstico completo. Revisa la consola (F12)', 'info');
    }
    
    // =========================
    // EVENTOS
    // =========================
    document.getElementById('btnGuardarBorrador')?.addEventListener('click', guardarCotizacion);
    document.getElementById('btnGuardarOficial')?.addEventListener('click', convertirAOficial);
    document.getElementById('btnPdf')?.addEventListener('click', generatePdf);
    document.getElementById('btnModificar')?.addEventListener('click', showModificarModal);
    document.getElementById('btnAceptada')?.addEventListener('click', showAceptadaModal);
    document.getElementById('btnAgregarItem')?.addEventListener('click', addItem);
    document.getElementById('btnDiagnostico')?.addEventListener('click', diagnosticar);
    document.getElementById('btnCrearCliente')?.addEventListener('click', () => {
        document.getElementById('formNuevoCliente')?.reset();
        new bootstrap.Modal(document.getElementById('modalNuevoCliente')).show();
    });
    document.getElementById('btnGuardarNuevoCliente')?.addEventListener('click', guardarNuevoCliente);
    
    const btnBuscarSunat = document.getElementById('btnBuscarSunat');
    if (btnBuscarSunat) {
        btnBuscarSunat.addEventListener('click', autocompletarConSunat);
    }

      // =========================
    // BOTÓN CONFIRMAR MODIFICAR
    // =========================
    document.getElementById('btn-confirmar-modificar')?.addEventListener('click', function() {
        const modalElement = document.getElementById('modalModificar');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        guardarCotizacion();
    });

    // =========================
    // CONFIGURACIONES
    // =========================
    configurarCondicionPago();
    configurarValidezOferta();
    configurarDescuentoPersonalizable();

    // =========================
    // INIT
    // =========================
    actualizarEstadoVisual();
    aplicarBloqueoUI();
    attachClienteAutocomplete('cliente_doc');
    attachClienteAutocomplete('cliente_razon_social');
    attachAsesorAutocomplete();
    attachContactoAutocomplete();
    configurarTiempoEntrega();
    configurarDireccionEntrega();
    addItem();
    inicializarCodigo();

    const cotId = document.getElementById('cotizacion_id')?.value;
    if (cotId && cotId !== 'None') { 
        cargarCotizacion(cotId); 
    } else { 
        esBorrador = true; 
        document.getElementById('estado').value = 'En Proceso'; 
    }
});