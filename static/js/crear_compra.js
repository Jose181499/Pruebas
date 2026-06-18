// crear_compra.js - COMPLETO Y FUNCIONAL PARA COMPRAS

document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // HELPERS
    // =========================
    const toNum = (v) => {
        const x = Number(String(v ?? '').replace(',', '.'));
        return Number.isFinite(x) ? x : 0;
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatCantidad(cant) {
        if (cant === null || cant === undefined) return '0';
        let numero = parseFloat(cant);
        if (isNaN(numero)) return '0';
        if (numero % 1 === 0) return numero.toString();
        return numero.toFixed(3).replace(/\.?0+$/, '');
    }

    // =========================
    // FUNCIÓN PARA ASEGURAR QUE NOMBRE_COMERCIAL SIEMPRE TENGA VALOR
    // =========================
    function asegurarNombreComercial(proveedor) {
        // Si el proveedor tiene nombre_comercial, usarlo
        if (proveedor.nombre_comercial && proveedor.nombre_comercial.trim() !== '') {
            return proveedor.nombre_comercial.trim();
        }
        // Si no tiene nombre_comercial, usar razon_social
        if (proveedor.razon_social && proveedor.razon_social.trim() !== '') {
            return proveedor.razon_social.trim();
        }
        // Si no tiene nada, usar un valor por defecto
        return proveedor.razon_social || 'SIN RAZON SOCIAL';
    }

    // =========================
    // GENERACIÓN DE CÓDIGOS PERSONALIZADOS PARA COMPRAS
    // =========================
    let codigoOrdenActual = '';
    let correlativoActual = 0;
    let usuarioActual = null;
    let esBorrador = true;

    async function obtenerUsuarioActual() {
        try {
            const response = await fetch('/api/usuarios/actual');
            const data = await response.json();
            if (data.success && data.data) {
                usuarioActual = data.data;
                
                const codigoCompradorSpan = document.getElementById('codigo_comprador');
                if (codigoCompradorSpan && usuarioActual.codigo_vendedor) {
                    codigoCompradorSpan.textContent = usuarioActual.codigo_vendedor;
                }
                
                const compradorInput = document.getElementById('comprador_responsable');
                if (compradorInput && usuarioActual.nombre_completo) {
                    compradorInput.value = usuarioActual.nombre_completo;
                    const usuarioIdInput = document.getElementById('usuario_id');
                    const emailContacto = document.getElementById('email_contacto_user');
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

    async function obtenerUltimoCorrelativoCompra(usuarioId) {
        try {
            const response = await fetch(`/api/orden_compra/ultimo-correlativo?usuario_id=${usuarioId}`);
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

    async function verificarCodigoExiste(codigo) {
        try {
            const response = await fetch(`/api/orden_compra/verificar-codigo?codigo=${encodeURIComponent(codigo)}`);
            const data = await response.json();
            return data.exists === true;
        } catch (error) {
            console.error('Error verificando código:', error);
            return false;
        }
    }

    function generarCodigoTemporal() {
        const fecha = new Date();
        const timestamp = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2, '0')}${String(fecha.getMinutes()).padStart(2, '0')}${String(fecha.getSeconds()).padStart(2, '0')}`;
        const codigoComprador = usuarioActual?.codigo_vendedor || 'TMP';
        return `TMP-COMPRA-${codigoComprador}-${timestamp}`;
    }

    async function generarCodigoOficial() {
        if (!usuarioActual) {
            await obtenerUsuarioActual();
        }
        
        if (usuarioActual) {
            await obtenerUltimoCorrelativoCompra(usuarioActual.id);
            let nuevoCorrelativo = correlativoActual + 1;
            let codigoGenerado = null;
            let intentos = 0;
            const maxIntentos = 10;
            
            while (!codigoGenerado && intentos < maxIntentos) {
                const codigoComprador = usuarioActual.codigo_vendedor || `C${String(usuarioActual.id).padStart(3, '0')}`;
                const fecha = new Date();
                const año = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                
                const codigo = `OC-${codigoComprador}-${año}${mes}${dia}-${String(nuevoCorrelativo).padStart(4, '0')}`;
                
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

    function actualizarNumeroOrdenUI(codigo, esBorradorActual = esBorrador) {
        const numeroDiv = document.getElementById('numero_orden');
        const tipoDocSpan = document.getElementById('tipo_documento');
        
        if (numeroDiv && codigo) {
            if (esBorradorActual) {
                numeroDiv.innerHTML = `<span style="font-size: 1rem; color: #f59e0b;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #f59e0b;">⚠️ BORRADOR</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-warning"><i class="bi bi-pencil"></i> BORRADOR</span>';
            } else {
                numeroDiv.innerHTML = `<span style="font-size: 1.2rem; color: #10b981;">${codigo}</span><small style="display: block; font-size: 0.7rem; color: #6b7280;">Correlativo: ${correlativoActual}</small>`;
                if (tipoDocSpan) tipoDocSpan.innerHTML = '<span class="badge-success"><i class="bi bi-check-circle"></i> OFICIAL</span>';
            }
            codigoOrdenActual = codigo;
        }
        
        actualizarEstadoBotonPDF();
    }

    async function inicializarCodigo() {
        await obtenerUsuarioActual();
        esBorrador = true;
        const codigoTemporal = generarCodigoTemporal();
        actualizarNumeroOrdenUI(codigoTemporal, true);
        return codigoTemporal;
    }

    // =========================
    // HABILITAR/DESHABILITAR BOTÓN PDF
    // =========================
    function actualizarEstadoBotonPDF() {
        const btnPdf = document.getElementById('btnPdf');
        const ordenId = document.getElementById('orden_compra_id')?.value;
        
        if (btnPdf) {
            if (ordenId && ordenId !== '' && ordenId !== 'None' && esBorrador === false) {
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
    // CONSULTA A SUNAT PARA PROVEEDORES (PRIORIZANDO DATOS LOCALES)
    // =========================
    async function consultarSunat(ruc) {
        try {
            mostrarNotificacion(`🔍 Verificando RUC ${ruc} en sistema local...`, 'info');
            
            const checkResponse = await fetch(`/api/proveedores/buscar?q=${ruc}`);
            const checkData = await checkResponse.json();
            
            let existeLocal = false;
            let proveedorLocal = null;
            
            if (checkData.success && checkData.data && checkData.data.length > 0) {
                proveedorLocal = checkData.data.find(p => p.numero_documento === ruc);
                if (proveedorLocal) {
                    existeLocal = true;
                    console.log('✅ Proveedor encontrado en base local:', proveedorLocal);
                }
            }
            
            if (existeLocal && proveedorLocal) {
                // 🔥 USAR LA FUNCIÓN PARA ASEGURAR NOMBRE_COMERCIAL
                const nombreComercial = asegurarNombreComercial(proveedorLocal);
                
                mostrarNotificacion(`🏢 Proveedor ENCONTRADO en sistema: ${proveedorLocal.razon_social}`, 'success');
                
                return {
                    success: true,
                    existe_en_sistema: true,
                    proveedor_id: proveedorLocal.id,
                    razon_social: proveedorLocal.razon_social || '',
                    nombre_comercial: nombreComercial,
                    razon_comercial: proveedorLocal.razon_comercial || nombreComercial,
                    direccion: proveedorLocal.direccion_fiscal || '',
                    estado: proveedorLocal.estado || 'ACTIVO',
                    telefono_contacto: proveedorLocal.telefono_contacto || '',
                    email_contacto: proveedorLocal.email_contacto || '',
                    nombre_contacto: proveedorLocal.nombre_contacto || ''
                };
            }
            
            mostrarNotificacion(`🌐 Consultando RUC ${ruc} en SUNAT...`, 'info');
            const response = await fetch(`/api/sunat/consulta_proveedor?ruc=${ruc}`);
            const data = await response.json();
            
            if (data.success) {
                mostrarNotificacion(`🆕 Proveedor NUEVO (no existe en sistema), cargando datos de SUNAT...`, 'info');
                return {
                    success: true,
                    existe_en_sistema: false,
                    razon_social: data.razon_social || '',
                    nombre_comercial: data.razon_social || '', // SUNAT no devuelve nombre_comercial
                    razon_comercial: data.razon_social || '',
                    direccion: data.direccion || '',
                    estado: data.estado || '',
                    telefono_contacto: '',
                    email_contacto: '',
                    nombre_contacto: ''
                };
            } else {
                return { success: false, error: data.error || 'No se encontraron datos en SUNAT' };
            }
        } catch (error) {
            console.error('Error consultando:', error);
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
            btnBuscar.innerHTML = '<i class="bi bi-hourglass-split"></i> Verificando...';
            btnBuscar.disabled = true;
        }
        
        try {
            const resultado = await consultarSunat(numeroDocumento);
            
            if (resultado.success) {
                // 🔥 FORZAR QUE NOMBRE_COMERCIAL SIEMPRE TENGA VALOR
                const nombreComercial = resultado.nombre_comercial || resultado.razon_social || 'SIN RAZON SOCIAL';
                
                // 🔥 CORREGIDO: Llenar AMBOS campos (nombre_comercial Y razon_comercial)
                document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                document.getElementById('nuevo_nombre_comercial').value = nombreComercial;
                document.getElementById('nuevo_razon_comercial').value = nombreComercial;
                document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                
                if (resultado.existe_en_sistema) {
                    mostrarNotificacionExistente(resultado);
                    document.getElementById('nuevo_telefono').value = resultado.telefono_contacto || '';
                    document.getElementById('nuevo_email').value = resultado.email_contacto || '';
                    document.getElementById('nuevo_nombre_contacto').value = resultado.nombre_contacto || '';
                    resaltarCamposExistentes();
                    mostrarIndicadorProveedorExistente(resultado);
                } else {
                    document.getElementById('nuevo_telefono').value = '';
                    document.getElementById('nuevo_email').value = '';
                    document.getElementById('nuevo_nombre_contacto').value = '';
                    quitarResaltadoCampos();
                    ocultarIndicadorProveedorExistente();
                    
                    // Si es nuevo, mostrar el RUC en el campo de documento
                    document.getElementById('nuevo_numero_documento').value = numeroDocumento;
                }
                
                mostrarNotificacion('✅ Datos cargados correctamente', 'success');
            } else {
                mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error al consultar', 'danger');
        } finally {
            if (btnBuscar) {
                btnBuscar.innerHTML = textoOriginal;
                btnBuscar.disabled = false;
            }
        }
    }

    function mostrarNotificacionExistente(proveedor) {
        const notificacionDiv = document.createElement('div');
        notificacionDiv.id = 'proveedor-existente-notificacion';
        notificacionDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            border-left: 4px solid #ffd700;
        `;
        
        notificacionDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 28px;">🏢</div>
                <div style="flex: 1;">
                    <strong style="font-size: 16px;">¡PROVEEDOR YA REGISTRADO!</strong>
                    <div style="font-size: 13px; margin-top: 4px;">
                        Este RUC ya existe en el sistema con los siguientes datos:
                    </div>
                    <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 8px; margin-top: 8px; font-size: 12px;">
                        <div>📞 Teléfono: ${proveedor.telefono_contacto || 'No registrado'}</div>
                        <div>✉️ Email: ${proveedor.email_contacto || 'No registrado'}</div>
                        <div>👤 Contacto: ${proveedor.nombre_contacto || 'No registrado'}</div>
                    </div>
                    <div style="font-size: 11px; margin-top: 6px; opacity: 0.9;">
                        ✅ Los datos de contacto han sido autocompletados automáticamente
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
            </div>
        `;
        
        const oldNotif = document.getElementById('proveedor-existente-notificacion');
        if (oldNotif) oldNotif.remove();
        
        document.body.appendChild(notificacionDiv);
        
        setTimeout(() => {
            if (notificacionDiv && notificacionDiv.parentNode) {
                notificacionDiv.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notificacionDiv.remove(), 300);
            }
        }, 8000);
    }

    function resaltarCamposExistentes() {
        const campos = ['nuevo_telefono', 'nuevo_email', 'nuevo_nombre_contacto'];
        campos.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo && campo.value) {
                campo.style.transition = 'all 0.3s ease';
                campo.style.backgroundColor = '#fef3c7';
                campo.style.border = '2px solid #f59e0b';
                
                setTimeout(() => {
                    if (campo) {
                        campo.style.backgroundColor = '';
                        campo.style.border = '';
                    }
                }, 2000);
            }
        });
    }

    function quitarResaltadoCampos() {
        const campos = ['nuevo_telefono', 'nuevo_email', 'nuevo_nombre_contacto'];
        campos.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.style.backgroundColor = '';
                campo.style.border = '';
            }
        });
    }

    function mostrarIndicadorProveedorExistente(proveedor) {
        let badge = document.getElementById('proveedor-existente-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'proveedor-existente-badge';
            const formContainer = document.getElementById('formNuevoProveedor')?.querySelector('.modal-body');
            if (formContainer) {
                badge.style.cssText = `
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 10px 15px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;
                formContainer.insertBefore(badge, formContainer.firstChild);
            }
        }
        
        if (badge) {
            badge.innerHTML = `
                <span style="font-size: 20px;">⚠️</span>
                <div style="flex: 1;">
                    <strong style="color: #92400e;">¡ATENCIÓN!</strong>
                    <div style="color: #78350f;">Este RUC ya está registrado como proveedor con ID: ${proveedor.proveedor_id}</div>
                    <div style="color: #78350f; font-size: 11px; margin-top: 4px;">
                        Los datos de contacto han sido autocompletados automáticamente.
                    </div>
                </div>
            `;
            badge.style.display = 'flex';
        }
    }

    function ocultarIndicadorProveedorExistente() {
        const badge = document.getElementById('proveedor-existente-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    }

    // =========================
    // BOTÓN BUSCAR PROVEEDOR POR RUC (MEJORADO)
    // =========================
    const btnBuscarProveedorPorRuc = document.getElementById('btnBuscarProveedorPorRuc');
    const buscarRucInput = document.getElementById('buscar_ruc');
    const btnLimpiarProveedor = document.getElementById('btnLimpiarProveedor');

    if (btnBuscarProveedorPorRuc) {
        btnBuscarProveedorPorRuc.addEventListener('click', async function(e) {
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
            
            const textoOriginal = btnBuscarProveedorPorRuc.innerHTML;
            btnBuscarProveedorPorRuc.innerHTML = '<i class="bi bi-hourglass-split"></i> Verificando...';
            btnBuscarProveedorPorRuc.disabled = true;
            
            try {
                const resultado = await consultarSunat(ruc);
                
                if (resultado.success) {
                    // 🔥 FORZAR QUE NOMBRE_COMERCIAL SIEMPRE TENGA VALOR
                    const nombreComercial = resultado.nombre_comercial || resultado.razon_social || 'SIN RAZON SOCIAL';
                    
                    document.getElementById('proveedor_razon_social').value = resultado.razon_social || '';
                    document.getElementById('proveedor_doc').value = ruc;
                    document.getElementById('proveedor_direccion').value = resultado.direccion || '';
                    
                    // 🔥 Llenar campos del modal de nuevo proveedor (AMBOS)
                    document.getElementById('nuevo_razon_social').value = resultado.razon_social || '';
                    document.getElementById('nuevo_nombre_comercial').value = nombreComercial;
                    document.getElementById('nuevo_razon_comercial').value = nombreComercial;
                    document.getElementById('nuevo_direccion_fiscal').value = resultado.direccion || '';
                    document.getElementById('nuevo_numero_documento').value = ruc;
                    
                    if (resultado.existe_en_sistema) {
                        document.getElementById('telefono_contacto').value = resultado.telefono_contacto || '';
                        document.getElementById('proveedor_contacto').value = resultado.nombre_contacto || '';
                        document.getElementById('email_contacto_proveedor').value = resultado.email_contacto || '';
                        document.getElementById('proveedor_id').value = resultado.proveedor_id || '';
                        
                        mostrarNotificacionExistente(resultado);
                        
                        if (resultado.proveedor_id) {
                            await cargarDireccionesProveedor(resultado.proveedor_id);
                        }
                        
                        mostrarNotificacion('✅ Proveedor existente cargado con todos sus datos', 'success');
                    } else {
                        document.getElementById('telefono_contacto').value = '';
                        document.getElementById('proveedor_contacto').value = '';
                        document.getElementById('email_contacto_proveedor').value = '';
                        document.getElementById('proveedor_id').value = '';
                        
                        mostrarNotificacion('✅ Datos de SUNAT cargados (proveedor nuevo)', 'success');
                    }
                } else {
                    mostrarNotificacion('❌ ' + (resultado.error || 'No se encontraron datos para este RUC en SUNAT'), 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion('❌ Error al consultar: ' + error.message, 'danger');
            } finally {
                btnBuscarProveedorPorRuc.innerHTML = textoOriginal;
                btnBuscarProveedorPorRuc.disabled = false;
            }
        });
    }

    if (btnLimpiarProveedor) {
        btnLimpiarProveedor.addEventListener('click', function() {
            document.getElementById('proveedor_id').value = '';
            document.getElementById('proveedor_razon_social').value = '';
            document.getElementById('proveedor_doc').value = '';
            document.getElementById('proveedor_direccion').value = '';
            document.getElementById('telefono_contacto').value = '';
            document.getElementById('proveedor_contacto').value = '';
            document.getElementById('email_contacto_proveedor').value = '';
            document.getElementById('num_cotizacion').value = '';
            if (buscarRucInput) buscarRucInput.value = '';
            mostrarNotificacion('🧹 Proveedor limpiado', 'info');
        });
    }

    // =========================
    // CARGAR DIRECCIONES DEL PROVEEDOR
    // =========================
    async function cargarDireccionesProveedor(proveedorId) {
        const select = document.getElementById('lugar_entrega_select');
        if (!select) return;
        
        while (select.options.length > 2) {
            select.remove(2);
        }
        
        if (!proveedorId || proveedorId === '') return;
        
        try {
            const response = await fetch(`/api/proveedores/${proveedorId}/direcciones`);
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
    // CONFIGURAR LUGAR DE ENTREGA
    // =========================
    function configurarLugarEntrega() {
        const select = document.getElementById('lugar_entrega_select');
        const input = document.getElementById('lugar_entrega');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de lugar de entrega no encontrados');
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
    // CONFIGURAR FECHA REQUERIDA PERSONALIZADA
    // =========================
    function configurarFechaRequerida() {
        const select = document.getElementById('fecha_requerida_select');
        const input = document.getElementById('fecha_requerida');
        
        if (!select || !input) {
            console.warn('⚠️ Elementos de fecha requerida no encontrados');
            return;
        }
        
        select.addEventListener('change', function() {
            const valor = this.value;
            if (valor === 'personalizado') {
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Ej: 20/12/2024, 2 semanas, etc.';
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
    // CREAR NUEVO PROVEEDOR
    // =========================
    async function guardarNuevoProveedor() {
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
        
        const btnGuardar = document.getElementById('btnGuardarNuevoProveedor');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
        btnGuardar.disabled = true;
        
        try {
            const payload = {
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento,
                razon_social: razonSocial,
                nombre_comercial: document.getElementById('nuevo_nombre_comercial')?.value.trim() || '',
                razon_comercial: document.getElementById('nuevo_razon_comercial')?.value.trim() || '',
                direccion_fiscal: document.getElementById('nuevo_direccion_fiscal')?.value.trim() || '',
                telefono_contacto: document.getElementById('nuevo_telefono')?.value.trim() || '',
                email_contacto: document.getElementById('nuevo_email')?.value.trim() || '',
                nombre_contacto: document.getElementById('nuevo_nombre_contacto')?.value.trim() || ''
            };
            
            const response = await fetch('/api/proveedores/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('formNuevoProveedor')?.reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoProveedor'));
                modal.hide();
                
                mostrarNotificacionProveedorGuardadoGrande({
                    razon_social: razonSocial,
                    tipo_documento: tipoDocumento,
                    numero_documento: numeroDocumento,
                    nombre_contacto: payload.nombre_contacto,
                    telefono: payload.telefono_contacto,
                    email: payload.email_contacto
                });
                
                await cargarProveedorEnOrden(result.data.id);
            } else {
                mostrarNotificacion('❌ Error: ' + (result.error || 'No se pudo crear el proveedor'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarNotificacion('❌ Error de conexión', 'danger');
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    }

    function mostrarNotificacionProveedorGuardadoGrande(datosProveedor) {
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const hora = ahora.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        const overlay = document.createElement('div');
        overlay.id = 'notification-overlay-grande';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;
        
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            border-radius: 24px;
            padding: 40px 48px;
            max-width: 550px;
            width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        const iconoCheck = `
            <div style="margin-bottom: 20px;">
                <div style="background: rgba(255, 255, 255, 0.2); border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                    <svg style="width: 50px; height: 50px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
            </div>
        `;
        
        const titulo = `
            <h2 style="color: white; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; font-family: inherit;">
                ✅ ¡PROVEEDOR GUARDADO!
            </h2>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 20px 0;">
                El proveedor se ha registrado exitosamente en el sistema
            </p>
        `;
        
        const fechaHora = `
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 10px; margin-bottom: 20px;">
                <div style="color: white; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 20px;">
                    <span>📅 ${fecha}</span>
                    <span>⏰ ${hora}</span>
                </div>
            </div>
        `;
        
        const tipoDocTexto = datosProveedor.tipo_documento === 'RUC' ? 'RUC' : 'DNI';
        const tipoIcono = datosProveedor.tipo_documento === 'RUC' ? '🏢' : '👤';
        
        const infoProveedor = `
            <div style="background: white; border-radius: 16px; padding: 24px; margin: 0 0 20px 0; text-align: left;">
                <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px;">
                    <span style="font-size: 20px; font-weight: 700; color: #1f2937;">📋 DATOS DEL PROVEEDOR</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">RAZÓN SOCIAL</div>
                    <div style="font-size: 20px; font-weight: 700; color: #111827;">${escapeHtml(datosProveedor.razon_social)}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">${tipoDocTexto}</div>
                        <div style="font-size: 18px; font-weight: 600; color: #111827;">${tipoIcono} ${datosProveedor.numero_documento}</div>
                    </div>
                    ${datosProveedor.nombre_contacto ? `
                    <div>
                        <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">CONTACTO</div>
                        <div style="font-size: 16px; font-weight: 600; color: #111827;">👤 ${escapeHtml(datosProveedor.nombre_contacto)}</div>
                    </div>
                    ` : ''}
                </div>
                ${datosProveedor.telefono || datosProveedor.email ? `
                <div style="background: #f3f4f6; border-radius: 12px; padding: 12px; margin-top: 12px;">
                    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        ${datosProveedor.telefono ? `<div><span style="font-size: 13px; color: #6b7280;">📞 TELÉFONO</span><br><span style="font-weight: 600;">${escapeHtml(datosProveedor.telefono)}</span></div>` : ''}
                        ${datosProveedor.email ? `<div><span style="font-size: 13px; color: #6b7280;">✉️ EMAIL</span><br><span style="font-weight: 600; font-size: 13px;">${escapeHtml(datosProveedor.email)}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        const botonCerrar = `
            <button id="btnCerrarNotificacionGrande" style="
                background: white;
                color: #047857;
                border: none;
                padding: 14px 32px;
                font-size: 16px;
                font-weight: 600;
                border-radius: 40px;
                cursor: pointer;
                margin-top: 8px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                width: auto;
                min-width: 180px;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';" 
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';">
                ✕ CERRAR
            </button>
        `;
        
        notificacion.innerHTML = iconoCheck + titulo + fechaHora + infoProveedor + botonCerrar;
        overlay.appendChild(notificacion);
        document.body.appendChild(overlay);
        
        if (!document.querySelector('#notification-grande-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-grande-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from {
                        transform: scale(0.7);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes scaleOut {
                    from {
                        transform: scale(1);
                        opacity: 1;
                    }
                    to {
                        transform: scale(0.7);
                        opacity: 0;
                    }
                }
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        const cerrarNotificacion = () => {
            overlay.style.animation = 'fadeOut 0.2s ease-out';
            notificacion.style.animation = 'scaleOut 0.2s ease-out';
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }, 200);
        };
        
        const btnCerrar = document.getElementById('btnCerrarNotificacionGrande');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', cerrarNotificacion);
        }
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cerrarNotificacion();
            }
        });
    }

    async function cargarProveedorEnOrden(proveedorId) {
        try {
            const response = await fetch(`/api/proveedores/${proveedorId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const proveedor = result.data;
                const contacto = proveedor.contactos && proveedor.contactos.length > 0 ? proveedor.contactos[0] : {};
                
                document.getElementById('proveedor_id').value = proveedor.id;
                document.getElementById('proveedor_razon_social').value = proveedor.razon_social;
                document.getElementById('proveedor_doc').value = proveedor.numero_documento || '';
                document.getElementById('proveedor_direccion').value = proveedor.direccion_fiscal || '';
                document.getElementById('telefono_contacto').value = contacto.telefono || '';
                document.getElementById('proveedor_contacto').value = contacto.nombre_contacto || '';
                document.getElementById('email_contacto_proveedor').value = contacto.email || '';
                
                await cargarDireccionesProveedor(proveedor.id);
                
                mostrarNotificacion('✅ Proveedor cargado correctamente', 'success');
            }
        } catch (error) {
            console.error('Error cargando proveedor:', error);
        }
    }

    async function autoCompletarContactoYCorreo(proveedorId) {
        if (!proveedorId) return;
        
        try {
            const response = await fetch(`/api/proveedores/${proveedorId}/contacto`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const contacto = result.data.nombre_contacto || '';
                const email = result.data.email_contacto || '';
                const telefono = result.data.telefono_contacto || '';
                
                if (contacto) document.getElementById('proveedor_contacto').value = contacto;
                if (email) document.getElementById('email_contacto_proveedor').value = email;
                if (telefono) document.getElementById('telefono_contacto').value = telefono;
                
                if (contacto || email || telefono) {
                    console.log('✅ Contacto autocompletado:', { contacto, email, telefono });
                }
            }
        } catch (error) {
            console.error('Error autocompletando contacto:', error);
        }
    }

    // =========================
    // MODAL DE CONFIRMACIÓN
    // =========================
    function mostrarModalConfirmacion(datos) {
        const modalBody = document.getElementById('modalConfirmacionBody');
        if (!modalBody) return;
        
        const ahora = new Date();
        const fechaActual = ahora.toLocaleDateString('es-PE');
        const horaActual = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        
        modalBody.innerHTML = `
            <div class="text-center mb-3"><i class="bi bi-check-circle-fill" style="font-size: 48px; color: #10b981;"></i></div>
            <div class="alert alert-success"><strong>✅ ¡Orden de Compra guardada exitosamente!</strong></div>
            <div class="row">
                <div class="col-6"><strong>Número:</strong></div>
                <div class="col-6">${datos.numero || datos.codigo_orden}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Tipo:</strong></div>
                <div class="col-6">${datos.tipo || (esBorrador ? 'BORRADOR' : 'OFICIAL')}</div>
            </div>
            <div class="row mt-2">
                <div class="col-6"><strong>Comprador:</strong></div>
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
            const ordenId = document.getElementById('orden_compra_id')?.value;
            if (ordenId && !esBorrador) {
                const pdfUrl = `/api/orden_compra/pdf/${ordenId}`;
                window.open(pdfUrl, '_blank');
            } else {
                mostrarNotificacion('⚠️ Debe convertir a oficial antes de generar PDF', 'warning');
            }
        };
        
        document.getElementById('btnNuevaOrdenModal').onclick = () => {
            window.location.href = '/crear_compra';
        };
    }

    // =========================
    // ESTADO GLOBAL
    // =========================
    let estadoOrden = 'pendiente';
    let ordenBloqueada = false;
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
        portal.style.minWidth = rect.width + 'px';
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
                unidad_medida: getInput('.unidad_medida') || 'UNIDAD',
                cantidad: cantidad,
                precio_venta_unitario: precio_venta_unitario,
                subtotal_venta: valor_venta_total,
                costo_unitario: 0,
                subtotal_costo: 0,
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
    async function buscarProveedores(q) {
        try {
            const res = await fetch(`/api/proveedores/buscar?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            return json.data || [];
        } catch (error) {
            console.error('Error buscando proveedores:', error);
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

    // =========================
    // GUARDAR ORDEN DE COMPRA
    // =========================
    async function guardarOrdenCompra() {
        const proveedorData = {
            razon_social: document.getElementById('proveedor_razon_social')?.value.trim() || '',
            numero_documento: document.getElementById('proveedor_doc')?.value.trim() || '',
            direccion_fiscal: document.getElementById('proveedor_direccion')?.value.trim() || '',
            telefono_contacto: document.getElementById('telefono_contacto')?.value.trim() || '',
            email_contacto: document.getElementById('email_contacto_proveedor')?.value.trim() || '',
            nombre_contacto: document.getElementById('proveedor_contacto')?.value.trim() || ''
        };
        
        if (!proveedorData.razon_social || !proveedorData.numero_documento) {
            mostrarNotificacion("⚠️ Complete los datos del proveedor (Razón Social y RUC/DNI)", "warning");
            return;
        }
        
        const listaProductos = obtenerListaProductos();
        if (listaProductos.length === 0) { 
            mostrarNotificacion("⚠️ Agregue items", "warning"); 
            return; 
        }
        
        for (let i = 0; i < listaProductos.length; i++) {
            if (!listaProductos[i].producto_id) { 
                mostrarNotificacion(`⚠️ Falta seleccionar producto en la fila ${i + 1}`, "warning"); 
                return; 
            }
        }
        
        let totalSinDescuento = 0;
        for (const p of listaProductos) {
            totalSinDescuento += p.subtotal_venta;
        }
        
        const descuentoInput = document.getElementById('descuento_porcentaje_input');
        const descuentoTipo = document.getElementById('descuento_tipo');
        let descuentoPorcentaje = 0;
        let descuentoMonto = 0;
        
        if (descuentoInput && descuentoInput.value) {
            const valorDescuento = parseFloat(descuentoInput.value) || 0;
            
            if (descuentoTipo && descuentoTipo.value === 'monto') {
                descuentoMonto = Math.min(valorDescuento, totalSinDescuento);
                descuentoPorcentaje = totalSinDescuento > 0 ? (descuentoMonto / totalSinDescuento) * 100 : 0;
            } else {
                descuentoPorcentaje = valorDescuento;
                descuentoMonto = totalSinDescuento * (descuentoPorcentaje / 100);
            }
        }
        
        const totalConDescuento = totalSinDescuento - descuentoMonto;
        const igv = totalConDescuento * 0.18;
        const subtotal = totalConDescuento - igv;
        
        const orden_id = document.getElementById('orden_compra_id')?.value;
        
        const payload = {
            id: orden_id && orden_id !== '' && orden_id !== 'None' ? parseInt(orden_id) : null,
            proveedor_id: Number(document.getElementById('proveedor_id')?.value || 0),
            proveedor_data: {
                razon_social: proveedorData.razon_social,
                numero_documento: proveedorData.numero_documento,
                direccion_fiscal: proveedorData.direccion_fiscal,
                telefono_contacto: proveedorData.telefono_contacto,
                email_contacto: proveedorData.email_contacto,
                nombre_contacto: proveedorData.nombre_contacto,
                tipo_documento: proveedorData.numero_documento.length === 11 ? 'RUC' : 'DNI'
            },
            usuario_id: Number(document.getElementById("usuario_id")?.value || 0),
            estado: document.getElementById("estado")?.value || "pendiente",
            subtotal: subtotal,
            igv: igv,
            total: totalConDescuento,
            condicion_pago: document.getElementById("condicion_pago")?.value || "",
            tiempo_entrega: document.getElementById("tiempo_entrega")?.value || "",
            fecha_requerida: document.getElementById("fecha_requerida")?.value || "",
            lugar_entrega: document.getElementById("lugar_entrega")?.value || "",
            num_cotizacion: document.getElementById("num_cotizacion")?.value || "",
            nota_compra: document.getElementById("nota_compra")?.value || "",
            notas: document.getElementById('notas')?.value || "",
            productos: listaProductos,
            codigo_orden: codigoOrdenActual,
            correlativo: esBorrador ? 0 : correlativoActual,
            es_borrador: esBorrador,
            descuento_porcentaje: descuentoPorcentaje,
            descuento_monto: descuentoMonto,
            descuento_tipo: descuentoTipo?.value || 'porcentaje',
            proveedor_contacto: document.getElementById('proveedor_contacto')?.value || '',
            telefono_contacto: document.getElementById('telefono_contacto')?.value || '',
            email_contacto_proveedor: document.getElementById('email_contacto_proveedor')?.value || ''
        };
        
        const btnGuardar = esBorrador ? document.getElementById('btnGuardarBorrador') : document.getElementById('btnGuardarOficial');
        const textoOriginal = btnGuardar?.innerHTML;
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
            btnGuardar.disabled = true;
        }
        
        try {
            const res = await fetch('/api/orden_compra/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (!json.success) { 
                mostrarNotificacion("❌ Error: " + (json.error || "Error desconocido"), "danger");
                return; 
            }
            
            document.getElementById('orden_compra_id').value = json.data.id;
            
            if (json.data.proveedor_id) {
                document.getElementById('proveedor_id').value = json.data.proveedor_id;
            }
            
            if (!esBorrador) {
                correlativoActual++;
            }
            
            if (!esBorrador) {
                actualizarEstadoBotonPDF();
            }
            
            mostrarModalConfirmacion({ 
                id: json.data.id, 
                numero: json.data.codigo_orden, 
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
            mostrarNotificacion("⚠️ Esta orden de compra ya es oficial", "warning"); 
            return; 
        }
        
        const razonSocial = document.getElementById('proveedor_razon_social')?.value.trim();
        const numeroDocumento = document.getElementById('proveedor_doc')?.value.trim();
        
        if (!razonSocial || !numeroDocumento) {
            mostrarNotificacion("⚠️ Complete los datos del proveedor (Razón Social y RUC)", "warning");
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
        
        if (!confirm("¿Convertir este borrador a orden de compra oficial?\n\nEsta acción generará un código único y definitivo.")) return;
        
        const nuevoCodigo = await generarCodigoOficial();
        if (nuevoCodigo) {
            esBorrador = false;
            actualizarNumeroOrdenUI(nuevoCodigo, false);
            document.getElementById('estado').value = 'pendiente';
            await guardarOrdenCompra();
            mostrarNotificacion(`✅ Orden de compra convertida a OFICIAL\nNúmero: ${nuevoCodigo}`, "success");
        } else {
            mostrarNotificacion("❌ Error al generar código oficial. Intente nuevamente.", "danger");
        }
    }

    // =========================
    // GENERAR PDF
    // =========================
    function generatePdf() {
        const ordenId = document.getElementById('orden_compra_id')?.value;
        
        if (!ordenId || ordenId === '' || ordenId === 'None') {
            mostrarNotificacion("⚠️ Debe guardar la orden de compra primero", "warning");
            return;
        }
        
        if (esBorrador) {
            mostrarNotificacion("⚠️ Debe convertir la orden a OFICIAL antes de generar PDF", "warning");
            return;
        }
        
        const telefono = document.getElementById('telefono_contacto')?.value || '';
        const atencion = document.getElementById('proveedor_contacto')?.value || '';
        const correo = document.getElementById('email_contacto_proveedor')?.value || '';
        const numCotizacion = document.getElementById('num_cotizacion')?.value || '';
        const lugarEntrega = document.getElementById('lugar_entrega')?.value || '';
        
        const params = new URLSearchParams({
            telefono_contacto: telefono,
            proveedor_contacto: atencion,
            email_contacto_proveedor: correo,
            num_cotizacion: numCotizacion,
            lugar_entrega: lugarEntrega
        });
        
        const pdfUrl = `/api/orden_compra/pdf/${ordenId}?${params.toString()}`;
        
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
    function setProductoEnFila(row, p) {  
        const productoIdInput = row.querySelector('.producto_id');
        const codigoInput = row.querySelector('.codigo_producto');
        const descripcionInput = row.querySelector('.descripcion');
        const modeloInput = row.querySelector('.modelo');
        const marcaInput = row.querySelector('.marca');
        const unidadMedidaInput = row.querySelector('.unidad_medida');
        const precioVentaInput = row.querySelector('.precio_venta_unitario');
        const cantidadInput = row.querySelector('.cantidad');
        
        if (productoIdInput) productoIdInput.value = p.id;
        if (codigoInput) codigoInput.value = p.codigo || "";
        if (descripcionInput) descripcionInput.value = p.descripcion || "";
        if (modeloInput) modeloInput.value = p.modelo || "";
        if (marcaInput) marcaInput.value = p.marca || "";
        if (unidadMedidaInput) unidadMedidaInput.value = p.unidad_medida || "UNIDAD";
        
        if (precioVentaInput && p.precio_unitario) precioVentaInput.value = p.precio_unitario;
        
        if (cantidadInput && (cantidadInput.value === '0' || !cantidadInput.value)) {
            cantidadInput.value = 1;
        }
        
        setTimeout(() => recalculateAll(), 50);
    }

    // =========================
    // AUTOCOMPLETAR PRODUCTO EN FILA
    // =========================
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
                try {
                    const productos = await buscarProductos(q);
                    
                    if (!productos || productos.length === 0) {
                        portalShow(input, `<div class="empty">❌ No se encontraron productos</div>`);
                        return;
                    }

                    const html = productos.map(p => `
                        <div class="item" 
                            data-id="${p.id}" 
                            data-codigo="${p.codigo || ''}" 
                            data-descripcion="${p.descripcion || ''}" 
                            data-modelo="${p.modelo || ''}" 
                            data-marca="${p.marca || ''}" 
                            data-unidad="${p.unidad_medida || 'UNIDAD'}" 
                            data-costo="${p.costo_unitario || 0}" 
                            data-precio="${p.precio_unitario || 0}">
                            <strong>📦 ${p.codigo}</strong> - ${p.descripcion}
                            <div class="meta">${p.marca || ''} • Precio: S/ ${(p.precio_unitario || 0).toFixed(2)}</div>
                        </div>
                    `).join('');
                    
                    portalShow(input, html);

                    portal.querySelectorAll('.item').forEach(el => {
                        el.addEventListener('click', () => {
                            const productoData = {
                                id: el.dataset.id,
                                codigo: el.dataset.codigo,
                                descripcion: el.dataset.descripcion,
                                modelo: el.dataset.modelo,
                                marca: el.dataset.marca,
                                unidad_medida: el.dataset.unidad,
                                costo_unitario: parseFloat(el.dataset.costo) || 0,
                                precio_unitario: parseFloat(el.dataset.precio) || 0
                            };
                            setProductoEnFila(row, productoData);
                            portalHide();
                            recalculateAll();
                        });
                    });
                } catch (error) {
                    console.error('Error en autocomplete de producto:', error);
                    portalShow(input, `<div class="empty">Error al buscar productos</div>`);
                }
            }, 300);
        });
    }

    // =========================
    // AUTOCOMPLETAR PROVEEDOR
    // =========================
    function attachProveedorAutocomplete(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        let timeoutId = null;

        input.addEventListener('input', async () => {
            const q = input.value.trim();
            if (timeoutId) clearTimeout(timeoutId);
            if (q.length < 2) { portalHide(); return; }
            
            timeoutId = setTimeout(async () => {
                const proveedores = await buscarProveedores(q);
                
                if (!proveedores.length) {
                    portalShow(input, `<div class="empty">No se encontraron proveedores</div>`);
                    return;
                }
                
                const html = proveedores.map(p => `
                    <div class="item" 
                        data-id="${p.id}" 
                        data-razon="${escapeHtml(p.razon_social || '')}" 
                        data-doc="${p.numero_documento || ''}" 
                        data-direccion="${escapeHtml(p.direccion_fiscal || '')}" 
                        data-contacto="${escapeHtml(p.nombre_contacto || '')}" 
                        data-email="${p.email_contacto || ''}" 
                        data-telefono="${p.telefono_contacto || ''}">
                        <strong>🏢 ${escapeHtml(p.razon_social)}</strong>
                        <div class="meta">📄 ${p.numero_documento || ''}</div>
                        <div class="meta">📞 ${p.telefono_contacto || ''} • ✉️ ${p.email_contacto || ''}</div>
                    </div>
                `).join('');
                
                portalShow(input, html);
                
                portal.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', async () => {
                        const proveedorId = el.dataset.id;
                        document.getElementById('proveedor_id').value = proveedorId;
                        document.getElementById('proveedor_razon_social').value = el.dataset.razon;
                        document.getElementById('proveedor_doc').value = el.dataset.doc;
                        document.getElementById('proveedor_direccion').value = el.dataset.direccion;
                        document.getElementById('telefono_contacto').value = el.dataset.telefono || '';
                        document.getElementById('proveedor_contacto').value = el.dataset.contacto || '';
                        document.getElementById('email_contacto_proveedor').value = el.dataset.email || '';
                        
                        portalHide();
                        
                        if (proveedorId) {
                            await autoCompletarContactoYCorreo(proveedorId);
                            await cargarDireccionesProveedor(proveedorId);
                        }
                        
                        mostrarNotificacion('✅ Proveedor seleccionado', 'success');
                        datosModificados = true;
                    });
                });
            }, 300);
        });
    }

    // =========================
    // RECALCULAR CON DESCUENTO PERSONALIZABLE
    // =========================
    function recalculateAll() {
        const rows = document.querySelectorAll("#table-body tr");
        let totalValorVenta = 0;

        rows.forEach(r => {
            const cantidad = Number(r.querySelector('.cantidad')?.value || 0);
            const precioVenta = Number(r.querySelector('.precio_venta_unitario')?.value || 0);
            
            const valorVentaTotal = cantidad * precioVenta;
            const valorVentaTotalElem = r.querySelector('.valor_venta_total');
            if (valorVentaTotalElem) valorVentaTotalElem.textContent = formatCantidad(valorVentaTotal);
            totalValorVenta += valorVentaTotal;
        });

        const totalValorVentaElem = document.getElementById('total_valor_venta');
        if (totalValorVentaElem) totalValorVentaElem.textContent = formatCantidad(totalValorVenta);
        
        const summarySubtotal = document.getElementById('summary_subtotal_venta');
        if (summarySubtotal) summarySubtotal.textContent = formatCantidad(totalValorVenta);
        
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
    // AGREGAR ITEMS
    // =========================
    function addItem() {
        if (ordenBloqueada) { 
            mostrarNotificacion("⚠️ La orden está bloqueada.", "warning"); 
            return; 
        }
        itemCounter++;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="col-item">${itemCounter}</td>
            <td class="col-codigo">
                <input type="text" class="codigo_producto" placeholder="Buscar producto..." style="width:100%; min-width:120px;">
                <input type="hidden" class="producto_id">
            </td>
            <td class="col-desc"><input type="text" class="descripcion" readonly style="width:100%;"></td>
            <td class="col-modelo"><input type="text" class="modelo" readonly style="width:100%;"></td>
            <td class="col-marca"><input type="text" class="marca" readonly style="width:100%;"></td>
            <td class="col-unidad"><input type="text" class="unidad_medida" value="UNIDAD" style="width:100%;"></td>
            <td class="col-cantidad"><input type="number" class="cantidad" value="1" step="0.01" style="width:100%;"></td>
            <td class="col-precio"><input type="number" class="precio_venta_unitario" value="0" step="0.01" style="width:100%;"></td>
            <td class="valor_venta_total">0.00</td>
            <td class="col-eliminar"><button class="btn-del">🗑</button></td>
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
        estadoTexto.textContent = estadoOrden.toUpperCase();
        estadoElement.className = 'erp-status ';
        if (estadoOrden === 'pendiente') estadoElement.classList.add('estado-pendiente');
        else if (estadoOrden === 'cotizando') estadoElement.classList.add('estado-cotizando');
        else if (estadoOrden === 'aprobado') estadoElement.classList.add('estado-aprobado');
        else if (estadoOrden === 'rechazado') estadoElement.classList.add('estado-rechazado');
        else if (estadoOrden === 'ordenado') estadoElement.classList.add('estado-ordenado');
        else if (estadoOrden === 'recibido') estadoElement.classList.add('estado-recibido');
        else estadoElement.classList.add('estado-pendiente');
        actualizarBotones();
    }

    function actualizarBotones() {
        const pdfBtn = document.getElementById('btnPdf');
        const guardarBorrador = document.getElementById('btnGuardarBorrador');
        const guardarOficial = document.getElementById('btnGuardarOficial');
        const agregarBtn = document.getElementById('btnAgregarItem');
        const btnAprobado = document.getElementById('btnAprobado');
        
        if (modoConsulta) {
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
            if (agregarBtn) agregarBtn.disabled = true;
            if (pdfBtn) pdfBtn.disabled = false;
            ordenBloqueada = true;
            return;
        }
        
        if (estadoOrden === 'pendiente' || estadoOrden === 'cotizando') {
            ordenBloqueada = false;
            if (guardarBorrador) guardarBorrador.disabled = false;
            if (guardarOficial) guardarOficial.disabled = false;
            if (agregarBtn) agregarBtn.disabled = false;
            if (btnAprobado) btnAprobado.disabled = false;
        } else {
            ordenBloqueada = true;
            if (guardarBorrador) guardarBorrador.disabled = true;
            if (guardarOficial) guardarOficial.disabled = true;
            if (agregarBtn) agregarBtn.disabled = true;
            if (btnAprobado) btnAprobado.disabled = true;
        }
    }

    function aplicarBloqueoUI() {
        const disabled = ordenBloqueada;
        document.querySelectorAll('#table-body input').forEach(i => i.disabled = disabled);
        ['proveedor_razon_social', 'proveedor_doc', 'telefono_contacto', 'proveedor_contacto', 'email_contacto_proveedor', 'num_cotizacion', 'estado'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        ['comprador_responsable', 'email_contacto_user', 'telefono_contacto_user', 'condicion_pago', 'tiempo_entrega', 'fecha_requerida', 'lugar_entrega', 'nota_compra', 'notas', 'descuento_porcentaje_input', 'descuento_tipo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        const btnAgregar = document.getElementById('btnAgregarItem');
        if (btnAgregar) btnAgregar.disabled = disabled;
        document.querySelectorAll('#table-body .btn-del').forEach(b => b.disabled = disabled);
    }

    function showModificarModal() {
        const modalElement = document.getElementById('modalModificar');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    async function cargarOrdenCompra(id) {
        try {
            console.log("🔍 Cargando orden de compra ID:", id);
            const res = await fetch(`/api/orden_compra/${id}`);
            const json = await res.json();
            console.log("📦 Datos recibidos:", json);
            
            if (!json.success) { 
                mostrarNotificacion("Error al cargar orden de compra", "danger"); 
                return; 
            }
            
            const data = json.data;
            console.log("✅ Datos de orden:", data);
            
            if (data.codigo_orden) {
                codigoOrdenActual = data.codigo_orden;
                correlativoActual = data.correlativo || 0;
                esBorrador = data.codigo_orden.startsWith('TMP-');
                actualizarNumeroOrdenUI(data.codigo_orden, esBorrador);
            }
            
            if (data.proveedor_id) {
                document.getElementById('proveedor_id').value = data.proveedor_id;
            }
            document.getElementById('proveedor_razon_social').value = data.proveedor || data.razon_social || '';
            document.getElementById('proveedor_doc').value = data.numero_documento || '';
            document.getElementById('proveedor_direccion').value = data.direccion_fiscal || '';
            document.getElementById('proveedor_contacto').value = data.proveedor_contacto || '';
            document.getElementById('email_contacto_proveedor').value = data.email_contacto_proveedor || '';
            document.getElementById('telefono_contacto').value = data.telefono_contacto || '';
            document.getElementById('num_cotizacion').value = data.num_cotizacion || '';
            
            document.getElementById('estado').value = data.estado || 'pendiente';
            document.getElementById('notas').value = data.notas || '';
            document.getElementById('condicion_pago').value = data.condicion_pago || 'Contado';
            document.getElementById('tiempo_entrega').value = data.tiempo_entrega || '';
            document.getElementById('fecha_requerida').value = data.fecha_requerida || '';
            document.getElementById('lugar_entrega').value = data.lugar_entrega || '';
            document.getElementById('nota_compra').value = data.nota_compra || '';
            
            document.getElementById('usuario_id').value = data.usuario_id || '';
            document.getElementById('comprador_responsable').value = data.nombre_completo || '';
            document.getElementById('email_contacto_user').value = data.email || '';
            document.getElementById('telefono_contacto_user').value = data.telefono || '';
            
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
                        row.querySelector('.precio_venta_unitario').value = item.precio_unitario || 0;
                        row.querySelector('.codigo_producto').value = item.codigo || '';
                        row.querySelector('.descripcion').value = item.descripcion || '';
                        row.querySelector('.modelo').value = item.modelo || '';
                        row.querySelector('.marca').value = item.marca || '';
                        row.querySelector('.unidad_medida').value = item.unidad_medida || 'UNIDAD';
                    }
                });
            }
            
            recalculateAll();
            configurarTiempoEntrega();
            configurarLugarEntrega();
            
            if (data.proveedor_id) {
                await cargarDireccionesProveedor(data.proveedor_id);
            }
            
            actualizarEstadoBotonPDF();
            
        } catch (err) { 
            console.error("🔥 ERROR en cargarOrdenCompra:", err); 
            mostrarNotificacion("Error cargando orden de compra", "danger"); 
        }
    }

    // =========================
    // CACHE DE PROVEEDORES PARA AUTOCOMPLETADO RÁPIDO
    // =========================
    let proveedoresCache = [];
    let proveedoresCargados = false;

    async function cargarProveedoresCache() {
        if (proveedoresCargados) return;
        
        try {
            mostrarNotificacion('🔄 Cargando lista de proveedores...', 'info');
            const response = await fetch('/api/proveedores/buscar?q=');
            const result = await response.json();
            
            if (result.success && result.data) {
                proveedoresCache = result.data;
                proveedoresCargados = true;
                console.log(`✅ Proveedores cargados: ${proveedoresCache.length}`);
            }
        } catch (error) {
            console.error('Error cargando proveedores:', error);
        }
    }

    function attachProveedorAutocompleteRapido(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        let container = input.parentElement;
        if (getComputedStyle(container).position !== 'relative') {
            const newContainer = document.createElement('div');
            newContainer.style.position = 'relative';
            newContainer.style.width = '100%';
            input.parentNode.insertBefore(newContainer, input);
            newContainer.appendChild(input);
            container = newContainer;
        }

        const dropdownId = `dropdown_rapido_${inputId}`;
        let dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = dropdownId;
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                z-index: 10000;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-height: 300px;
                overflow-y: auto;
                display: none;
                border: 1px solid #e5e7eb;
                margin-top: 4px;
            `;
            container.appendChild(dropdown);
        }

        input.addEventListener('focus', async () => {
            if (!proveedoresCargados) {
                await cargarProveedoresCache();
            }
        });

        let busquedaTimeout = null;

        input.addEventListener('input', () => {
            const busqueda = input.value.trim().toLowerCase();
            
            if (busquedaTimeout) clearTimeout(busquedaTimeout);
            
            if (busqueda.length < 2) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }

            busquedaTimeout = setTimeout(() => {
                if (!proveedoresCargados) {
                    dropdown.innerHTML = `<div class="empty" style="padding: 12px; text-align: center;">Cargando proveedores...</div>`;
                    dropdown.style.display = 'block';
                    return;
                }
                
                const filtrados = proveedoresCache.filter(proveedor => {
                    const razon = (proveedor.razon_social || '').toLowerCase();
                    const doc = (proveedor.numero_documento || '').toLowerCase();
                    const nombreComercial = (proveedor.nombre_comercial || '').toLowerCase();
                    const contacto = (proveedor.nombre_contacto || '').toLowerCase();
                
                    return razon.includes(busqueda) || 
                        doc.includes(busqueda) || 
                        nombreComercial.includes(busqueda) ||
                        contacto.includes(busqueda);
                });
                
                if (filtrados.length === 0) {
                    dropdown.innerHTML = `<div class="empty" style="padding: 12px; text-align: center;">No se encontraron proveedores</div>`;
                    dropdown.style.display = 'block';
                    return;
                }
                
                dropdown.innerHTML = filtrados.map(p => `
                    <div class="item" 
                        style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9;"
                        data-id="${p.id || ''}"
                        data-razon="${escapeHtml(p.razon_social || '')}"
                        data-doc="${p.numero_documento || ''}"
                        data-direccion="${escapeHtml(p.direccion_fiscal || '')}"
                        data-contacto="${escapeHtml(p.nombre_contacto || '')}"
                        data-email="${p.email || p.email_contacto || ''}"
                        data-telefono="${p.telefono || p.telefono_contacto || ''}">
                        <strong>🏢 ${escapeHtml(p.razon_social || p.nombre_comercial || '')}</strong>
                        <div class="meta">📄 ${p.numero_documento || ''}</div>
                        <div class="meta">📞 ${p.telefono || p.telefono_contacto || ''} • ✉️ ${p.email || p.email_contacto || ''}</div>
                    </div>
                `).join('');
                
                dropdown.style.display = 'block';
                
                dropdown.querySelectorAll('.item').forEach(el => {
                    el.addEventListener('click', async () => {
                        const proveedorId = el.dataset.id;
                        document.getElementById('proveedor_id').value = proveedorId;
                        document.getElementById('proveedor_razon_social').value = el.dataset.razon;
                        document.getElementById('proveedor_doc').value = el.dataset.doc;
                        document.getElementById('proveedor_direccion').value = el.dataset.direccion;
                        document.getElementById('proveedor_contacto').value = el.dataset.contacto || '';
                        document.getElementById('email_contacto_proveedor').value = el.dataset.email || '';
                        document.getElementById('telefono_contacto').value = el.dataset.telefono || '';
                        
                        dropdown.style.display = 'none';
                        
                        if (proveedorId) {
                            await autoCompletarContactoYCorreo(proveedorId);
                            await cargarDireccionesProveedor(proveedorId);
                        }
                        
                        mostrarNotificacion('✅ Proveedor seleccionado', 'success');
                        datosModificados = true;
                    });
                });
            }, 150);
        });
        
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        function highlightItem(items, index) {
            items.forEach(item => item.style.background = '');
            if (items[index]) {
                items[index].style.background = '#fef2f2';
                items[index].scrollIntoView({ block: 'nearest' });
            }
        }
    }

    // =========================
    // EVENTOS
    // =========================
    document.getElementById('btnGuardarBorrador')?.addEventListener('click', guardarOrdenCompra);
    document.getElementById('btnGuardarOficial')?.addEventListener('click', convertirAOficial);
    document.getElementById('btnPdf')?.addEventListener('click', generatePdf);
    document.getElementById('btnModificar')?.addEventListener('click', showModificarModal);
    document.getElementById('btnAgregarItem')?.addEventListener('click', addItem);
    document.getElementById('btnCrearProveedor')?.addEventListener('click', () => {
        document.getElementById('formNuevoProveedor')?.reset();
        new bootstrap.Modal(document.getElementById('modalNuevoProveedor')).show();
    });
    document.getElementById('btnGuardarNuevoProveedor')?.addEventListener('click', guardarNuevoProveedor);
    
    const btnBuscarSunat = document.getElementById('btnBuscarSunat');
    if (btnBuscarSunat) {
        btnBuscarSunat.addEventListener('click', autocompletarConSunat);
    }

    document.getElementById('btn-confirmar-modificar')?.addEventListener('click', function() {
        const modalElement = document.getElementById('modalModificar');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        ordenBloqueada = false;
        aplicarBloqueoUI();
        mostrarNotificacion('✅ Orden habilitada para modificación', 'success');
    });

    document.getElementById('btnAprobado')?.addEventListener('click', async function() {
        const ordenId = document.getElementById('orden_compra_id')?.value;
        if (!ordenId || ordenId === 'None') {
            mostrarNotificacion('⚠️ Debe guardar la orden primero', 'warning');
            return;
        }
        
        const ordenProveedor = prompt('Ingrese el número de orden de compra del proveedor:');
        if (ordenProveedor) {
            document.getElementById('estado').value = 'aprobado';
            estadoOrden = 'aprobado';
            actualizarEstadoVisual();
            await guardarOrdenCompra();
            mostrarNotificacion('✅ Orden de compra aprobada', 'success');
        }
    });

    const estadoSelect = document.getElementById('estado');
    if (estadoSelect) {
        estadoSelect.addEventListener('change', function() {
            estadoOrden = this.value;
            actualizarEstadoVisual();
            aplicarBloqueoUI();
        });
    }

    // =========================
    // INIT
    // =========================
    configurarTiempoEntrega();
    configurarFechaRequerida();
    configurarCondicionPago();
    configurarLugarEntrega();
    configurarDescuentoPersonalizable();
    
    actualizarEstadoVisual();
    aplicarBloqueoUI();
    
    attachProveedorAutocompleteRapido('proveedor_doc');
    attachProveedorAutocompleteRapido('proveedor_razon_social');
    
    addItem();
    inicializarCodigo();

    const ordenId = document.getElementById('orden_compra_id')?.value;
    if (ordenId && ordenId !== 'None' && ordenId !== '') { 
        cargarOrdenCompra(ordenId); 
    } else { 
        esBorrador = true; 
        document.getElementById('estado').value = 'pendiente'; 
    }
});