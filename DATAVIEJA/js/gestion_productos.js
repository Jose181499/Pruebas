// ==================== GESTIÓN DE PRODUCTOS - KCF CORPORACIÓN ====================
// Versión COMPLETA - Integra todas las funcionalidades de los módulos

// ==================== VARIABLES GLOBALES ====================
let editModal, deleteModal, kardexModal, nuevoProductoModal;
let currentProductId = null;

// ==================== NOTIFICACIONES MEJORADAS ====================
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 4000) {
    // Eliminar notificaciones anteriores
    $('.notificacion-flotante').remove();
    
    const colores = {
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const iconos = {
        success: 'check-circle-fill',
        danger: 'exclamation-triangle-fill',
        warning: 'exclamation-circle-fill',
        info: 'info-circle-fill'
    };
    
    const notificacion = $(`
        <div class="notificacion-flotante alert alert-${tipo} d-flex align-items-center shadow-lg" 
             style="position: fixed; top: 20px; right: 20px; z-index: 99999; 
                    min-width: 320px; max-width: 500px; border-radius: 16px;
                    border-left: 5px solid ${colores[tipo] || '#3b82f6'};
                    background: white; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    animation: slideInRight 0.4s ease;">
            <i class="bi bi-${iconos[tipo] || 'info-circle-fill'} me-3" 
               style="font-size: 1.5rem; color: ${colores[tipo] || '#3b82f6'};"></i>
            <div class="flex-grow-1" style="color: #1e293b; font-weight: 500; font-size: 0.95rem;">
                ${mensaje}
            </div>
            <button class="btn-close ms-3" onclick="$(this).closest('.notificacion-flotante').fadeOut(300, function(){$(this).remove();})"></button>
        </div>
    `);
    
    $('body').append(notificacion);
    
    // Auto-cerrar
    setTimeout(() => {
        notificacion.fadeOut(300, function() { $(this).remove(); });
    }, duracion);
}

// ==================== FILTROS Y BÚSQUEDA ====================
function filtrarTablaProductos() {
    const familia = $('#filtro-familia').val();
    const busqueda = $('#filtro-busqueda').val().toLowerCase();
    const estado = $('#filtro-estado').val();
    let visibleCount = 0;
    
    $('#tbody-productos tr').each(function() {
        const $row = $(this);
        const rowFamilia = $row.data('familia') || '';
        const rowEstado = $row.data('estado') || 'activo';
        const textoBusqueda = ($row.data('descripcion') || '') + ' ' + ($row.data('codigo') || '') + ' ' + ($row.data('marca') || '');
        
        const matchFamilia = !familia || rowFamilia === familia;
        const matchBusqueda = !busqueda || textoBusqueda.toLowerCase().includes(busqueda);
        const matchEstado = !estado || rowEstado === estado;
        
        if (matchFamilia && matchBusqueda && matchEstado) {
            $row.show();
            visibleCount++;
        } else {
            $row.hide();
        }
    });
    
    $('#totalProductosCount').text(visibleCount);
}

function cargarSelectoresKardex() {
    const options = ['<option value="">-- Seleccionar producto --</option>'];
    
    $('#tbody-productos tr:visible').each(function() {
        const $row = $(this);
        const id = $row.find('.btn-editar-producto').data('id');
        const desc = $row.find('td:eq(2)').text().trim();
        const codigo = $row.find('.badge.bg-secondary').text().trim();
        
        if (id) {
            options.push(`<option value="${id}">${codigo} - ${desc.substring(0, 45)}</option>`);
        }
    });
    
    $('#kardex_producto_id, #mov_kardex_producto_id').html(options.join(''));
}

// ==================== ABRIR EDITAR PRODUCTO ====================
function abrirEditarProducto(id) {
    if (!id) {
        mostrarNotificacion('ID de producto no válido', 'danger');
        return;
    }
    
    currentProductId = id;
    
    // Mostrar loading en modal
    $('#edit_product_content').html(`
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-3 text-muted">Cargando datos del producto...</p>
        </div>
    `);
    
    if (editModal) editModal.show();
    
    $.ajax({
        url: '/api/productos/' + id,
        method: 'GET',
        success: function(producto) {
            llenarFormularioEdicion(producto);
        },
        error: function(xhr) {
            console.error('Error al cargar producto:', xhr);
            mostrarNotificacion('Error al cargar los datos del producto', 'danger');
            $('#edit_product_content').html(`
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
                    <p class="mt-3">Error al cargar los datos del producto</p>
                    <button class="btn btn-outline-danger btn-sm" onclick="abrirEditarProducto(${id})">
                        <i class="bi bi-arrow-repeat me-1"></i> Reintentar
                    </button>
                </div>
            `);
        }
    });
}

function llenarFormularioEdicion(producto) {
    // Llenar campos básicos
    $('#edit_id').val(producto.id);
    $('#edit_codigo').val(producto.codigo || '');
    $('#edit_familia').val(producto.familia || '');
    $('#edit_descripcion').val(producto.descripcion || '');
    $('#edit_descripcion_larga').val(producto.descripcion_larga || '');
    $('#edit_marca').val(producto.marca || '');
    $('#edit_modelo').val(producto.modelo || '');
    $('#edit_unidad').val(producto.unidad || '');
    $('#edit_volumen').val(producto.volumen || '');
    $('#edit_peso').val(producto.peso || '');
    $('#edit_observaciones').val(producto.observaciones || '');
    $('#edit_transporte').val(producto.transporte || '');
    $('#edit_costo_unitario').val(producto.costo_unitario || '');
    $('#edit_precio_unitario').val(producto.precio_unitario || '');
    $('#edit_stock').val(producto.stock || '');
    $('#edit_estado').val(producto.estado || 'activo');
    
    // Calcular margen
    calcularMargenEdicion();
    
    // Mostrar contenido
    $('#edit_product_content').html(`
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label fw-semibold">Código</label>
                <input type="text" class="form-control" id="edit_codigo" readonly>
            </div>
            <div class="col-md-6">
                <label class="form-label fw-semibold">Familia</label>
                <select class="form-select" id="edit_familia">
                    <option value="">Sin familia</option>
                    <option value="seguridad">Seguridad Industrial</option>
                    <option value="oficina">Mobiliario de Oficina</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="ferreteria">Ferretería</option>
                </select>
            </div>
            <div class="col-12">
                <label class="form-label fw-semibold">Descripción</label>
                <input type="text" class="form-control" id="edit_descripcion">
            </div>
            <div class="col-12">
                <label class="form-label fw-semibold">Descripción larga</label>
                <textarea class="form-control" id="edit_descripcion_larga" rows="2"></textarea>
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold">Marca</label>
                <input type="text" class="form-control" id="edit_marca">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold">Modelo</label>
                <input type="text" class="form-control" id="edit_modelo">
            </div>
            <div class="col-md-4">
                <label class="form-label fw-semibold">Unidad</label>
                <input type="text" class="form-control" id="edit_unidad" placeholder="Und, Kg, L, etc.">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Volumen (m³)</label>
                <input type="number" step="0.001" class="form-control" id="edit_volumen">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Peso (kg)</label>
                <input type="number" step="0.01" class="form-control" id="edit_peso">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Costo Unitario (S/)</label>
                <input type="number" step="0.01" class="form-control" id="edit_costo_unitario">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Precio Unitario (S/)</label>
                <input type="number" step="0.01" class="form-control" id="edit_precio_unitario">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Margen (%)</label>
                <input type="text" class="form-control" id="edit_margen" readonly>
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Stock</label>
                <input type="number" class="form-control" id="edit_stock">
            </div>
            <div class="col-md-6">
                <label class="form-label fw-semibold">Transporte referencial</label>
                <select class="form-select" id="edit_transporte">
                    <option value="">Seleccionar</option>
                    <option value="motorizado">Motorizado</option>
                    <option value="auto">Auto</option>
                    <option value="minivan">Minivan</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="camion">Camión</option>
                    <option value="agencia">Agencia</option>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label fw-semibold">Estado</label>
                <select class="form-select" id="edit_estado">
                    <option value="activo">🟢 Activo</option>
                    <option value="inactivo">⚪ Inactivo</option>
                    <option value="bajo_pedido">🟠 Bajo pedido</option>
                    <option value="disponible">🔵 Disponible</option>
                    <option value="bloqueado">🔴 Bloqueado</option>
                </select>
            </div>
            <div class="col-12">
                <label class="form-label fw-semibold">Observaciones</label>
                <textarea class="form-control" id="edit_observaciones" rows="2"></textarea>
            </div>
        </div>
        <div class="mt-4 text-end">
            <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">
                <i class="bi bi-x-circle me-1"></i> Cancelar
            </button>
            <button type="button" class="btn btn-primary" id="btnGuardarEdicionProducto">
                <i class="bi bi-save me-1"></i> Guardar cambios
            </button>
        </div>
    `);
    
    // Reasignar eventos
    $('#edit_costo_unitario, #edit_precio_unitario').on('input', calcularMargenEdicion);
    $('#btnGuardarEdicionProducto').off('click').on('click', guardarEdicion);
}

// ==================== GUARDAR EDICIÓN ====================
function calcularMargenEdicion() {
    const costo = parseFloat($('#edit_costo_unitario').val()) || 0;
    const precio = parseFloat($('#edit_precio_unitario').val()) || 0;
    
    if (costo > 0 && precio > 0) {
        const margen = ((precio - costo) / costo * 100).toFixed(2);
        $('#edit_margen').val(margen + '%');
    } else {
        $('#edit_margen').val('');
    }
}

function guardarEdicion() {
    const id = $('#edit_id').val();
    if (!id) {
        mostrarNotificacion('Error: ID de producto no encontrado', 'danger');
        return;
    }
    
    const datos = {
        familia: $('#edit_familia').val(),
        descripcion: $('#edit_descripcion').val(),
        descripcion_larga: $('#edit_descripcion_larga').val(),
        marca: $('#edit_marca').val(),
        modelo: $('#edit_modelo').val(),
        unidad: $('#edit_unidad').val(),
        volumen: parseFloat($('#edit_volumen').val()) || 0,
        peso: parseFloat($('#edit_peso').val()) || 0,
        observaciones: $('#edit_observaciones').val(),
        transporte: $('#edit_transporte').val(),
        costo_unitario: parseFloat($('#edit_costo_unitario').val()) || 0,
        precio_unitario: parseFloat($('#edit_precio_unitario').val()) || 0,
        stock: parseInt($('#edit_stock').val()) || 0,
        estado: $('#edit_estado').val()
    };
    
    const btn = $('#btnGuardarEdicionProducto');
    const textoOriginal = btn.html();
    btn.prop('disabled', true);
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
    
    $.ajax({
        url: '/api/productos/' + id,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function(response) {
            if (response.success) {
                mostrarNotificacion('✅ Producto actualizado correctamente', 'success');
                if (editModal) editModal.hide();
                setTimeout(() => location.reload(), 800);
            } else {
                mostrarNotificacion('❌ Error: ' + (response.error || 'No se pudo actualizar'), 'danger');
            }
        },
        error: function(xhr) {
            console.error('Error al guardar edición:', xhr);
            let errorMsg = 'Error de conexión al servidor';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            }
            mostrarNotificacion('❌ ' + errorMsg, 'danger');
        },
        complete: function() {
            btn.prop('disabled', false);
            btn.html(textoOriginal);
        }
    });
}

// ==================== ELIMINAR PRODUCTO ====================
function abrirEliminarProducto(id) {
    if (!id) {
        mostrarNotificacion('ID de producto no válido', 'danger');
        return;
    }
    
    currentProductId = id;
    
    // Obtener información del producto para mostrar
    $.ajax({
        url: '/api/productos/' + id,
        method: 'GET',
        success: function(producto) {
            $('#eliminar_id_producto').val(id);
            $('#eliminar_nombre_producto').text(producto.descripcion || 'Producto sin nombre');
            $('#eliminar_codigo_producto').text(producto.codigo || '');
            if (deleteModal) deleteModal.show();
        },
        error: function() {
            $('#eliminar_id_producto').val(id);
            $('#eliminar_nombre_producto').text('Producto ID: ' + id);
            if (deleteModal) deleteModal.show();
        }
    });
}

function eliminarProducto() {
    const id = $('#eliminar_id_producto').val();
    if (!id) {
        mostrarNotificacion('Error: ID de producto no encontrado', 'danger');
        return;
    }
    
    const btn = $('#confirmarEliminarProductoBtn');
    const textoOriginal = btn.html();
    btn.prop('disabled', true);
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...');
    
    $.ajax({
        url: '/api/productos/' + id,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                mostrarNotificacion('✅ Producto eliminado correctamente', 'success');
                if (deleteModal) deleteModal.hide();
                setTimeout(() => location.reload(), 800);
            } else {
                mostrarNotificacion('❌ Error: ' + (response.error || 'No se pudo eliminar'), 'danger');
            }
        },
        error: function(xhr) {
            console.error('Error al eliminar producto:', xhr);
            mostrarNotificacion('❌ Error de conexión al servidor', 'danger');
        },
        complete: function() {
            btn.prop('disabled', false);
            btn.html(textoOriginal);
        }
    });
}

// ==================== KÁRDEX ====================
function abrirKardex() {
    if (kardexModal) kardexModal.show();
    cargarSelectoresKardex();
}

function cargarKardex(productoId) {
    const tbody = $('#tbody-kardex');
    
    if (!productoId) {
        tbody.html('<tr><td colspan="8" class="text-center text-muted py-4">Seleccione un producto para ver su kárdex</td></tr>');
        $('#kardex_stock_actual').text('0');
        $('#kardex_valor_total').text('S/ 0.00');
        $('#kardex_nombre_producto').text('Ninguno seleccionado');
        return;
    }
    
    // Obtener nombre del producto
    $.ajax({
        url: '/api/productos/' + productoId,
        method: 'GET',
        success: function(producto) {
            $('#kardex_nombre_producto').text(producto.descripcion || 'Producto');
        }
    });
    
    tbody.html('<tr><td colspan="8" class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div>Cargando movimientos...</td></tr>');
    
    $.ajax({
        url: '/api/movimientos_stock?producto_id=' + productoId,
        method: 'GET',
        success: function(movimientos) {
            if (!movimientos || movimientos.length === 0) {
                tbody.html('<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos para este producto</td></tr>');
                actualizarStockProducto(productoId);
                return;
            }
            
            tbody.empty();
            let saldo = 0;
            
            movimientos.forEach(mov => {
                if (mov.tipo === 'ENTRADA') saldo += mov.cantidad;
                else if (mov.tipo === 'SALIDA') saldo -= mov.cantidad;
                else if (mov.tipo === 'AJUSTE') saldo = mov.cantidad;
                
                const fecha = mov.created_at ? new Date(mov.created_at).toLocaleDateString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }) : '-';
                
                const tipoBadge = {
                    'ENTRADA': '<span class="badge bg-success"><i class="bi bi-arrow-down-circle me-1"></i>ENTRADA</span>',
                    'SALIDA': '<span class="badge bg-danger"><i class="bi bi-arrow-up-circle me-1"></i>SALIDA</span>',
                    'AJUSTE': '<span class="badge bg-warning text-dark"><i class="bi bi-pencil-square me-1"></i>AJUSTE</span>'
                };
                
                tbody.append(`
                    <tr>
                        <td><small class="text-muted">${fecha}</small></td>
                        <td>${tipoBadge[mov.tipo] || mov.tipo}</td>
                        <td>${mov.referencia || '-'}</td>
                        <td>${mov.motivo || '-'}</td>
                        <td class="text-end text-success">${mov.tipo === 'ENTRADA' ? mov.cantidad : '-'}</td>
                        <td class="text-end text-danger">${mov.tipo === 'SALIDA' ? mov.cantidad : '-'}</td>
                        <td class="text-end fw-bold">${saldo}</td>
                        <td class="text-end">${mov.costo_unitario ? 'S/ ' + mov.costo_unitario.toFixed(2) : '-'}</td>
                    </tr>
                `);
            });
            
            // Agregar fila de saldo final
            tbody.append(`
                <tr class="table-light fw-bold">
                    <td colspan="6" class="text-end">SALDO FINAL</td>
                    <td class="text-end">${saldo}</td>
                    <td class="text-end">S/ ${(saldo * (movimientos[0]?.costo_unitario || 0)).toFixed(2)}</td>
                </tr>
            `);
            
            $('#kardex_stock_actual').text(saldo);
            actualizarValorTotal(productoId, saldo);
        },
        error: function(xhr) {
            console.error('Error al cargar kárdex:', xhr);
            tbody.html('<tr><td colspan="8" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error al cargar movimientos</td></tr>');
            mostrarNotificacion('Error al cargar kárdex', 'danger');
        }
    });
}

function actualizarStockProducto(productoId) {
    $.ajax({
        url: '/api/productos/' + productoId,
        method: 'GET',
        success: function(p) {
            $('#kardex_stock_actual').text(p.stock || 0);
            actualizarValorTotal(productoId, p.stock || 0);
        }
    });
}

function actualizarValorTotal(productoId, stock) {
    $.ajax({
        url: '/api/productos/' + productoId,
        method: 'GET',
        success: function(p) {
            const valor = stock * (p.costo_unitario || 0);
            $('#kardex_valor_total').text(`S/ ${valor.toFixed(2)}`);
        }
    });
}

// ==================== MOVIMIENTOS DE STOCK ====================
function guardarMovimiento() {
    const productoId = $('#mov_kardex_producto_id').val();
    const tipo = $('#mov_kardex_tipo').val();
    const cantidad = $('#mov_kardex_cantidad').val();
    const costo = $('#mov_kardex_costo').val();
    const referencia = $('#mov_kardex_referencia').val();
    const motivo = $('#mov_kardex_motivo').val();
    const fecha = $('#mov_kardex_fecha').val();
    
    if (!productoId) {
        mostrarNotificacion('Seleccione un producto', 'warning');
        $('#mov_kardex_producto_id').focus();
        return;
    }
    
    if (!cantidad || parseInt(cantidad) <= 0) {
        mostrarNotificacion('Ingrese una cantidad válida mayor a 0', 'warning');
        $('#mov_kardex_cantidad').focus();
        return;
    }
    
    const datos = {
        producto_id: parseInt(productoId),
        tipo: tipo,
        cantidad: parseInt(cantidad),
        costo_unitario: costo ? parseFloat(costo) : null,
        referencia: referencia || null,
        motivo: motivo || null,
        fecha: fecha || new Date().toISOString().split('T')[0]
    };
    
    const btn = $('#btnGuardarMovimientoKardex');
    const textoOriginal = btn.html();
    btn.prop('disabled', true);
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
    
    $.ajax({
        url: '/api/movimientos_stock',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function(response) {
            if (response.success) {
                mostrarNotificacion('✅ Movimiento registrado correctamente', 'success');
                
                // Cerrar modal de movimiento
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoMovimientoKardex'));
                if (modal) modal.hide();
                
                // Recargar kárdex
                const select = $('#kardex_producto_id').val();
                if (select) {
                    cargarKardex(select);
                }
                
                // Limpiar formulario
                $('#mov_kardex_cantidad').val('');
                $('#mov_kardex_costo').val('');
                $('#mov_kardex_referencia').val('');
                $('#mov_kardex_motivo').val('');
                
                // Actualizar tabla de productos
                setTimeout(() => location.reload(), 1500);
            } else {
                mostrarNotificacion('❌ ' + (response.error || 'Error al registrar movimiento'), 'danger');
            }
        },
        error: function(xhr) {
            console.error('Error guardando movimiento:', xhr);
            mostrarNotificacion('❌ Error de conexión al servidor', 'danger');
        },
        complete: function() {
            btn.prop('disabled', false);
            btn.html(textoOriginal);
        }
    });
}

// ==================== MARGEN EN NUEVO PRODUCTO ====================
function configurarCalculoMargen() {
    const costoInput = $('#costo_unitario');
    const precioInput = $('#precio_unitario');
    const margenInput = $('#margen_calculado_nuevo');
    
    function calcularMargenNuevo() {
        const costo = parseFloat(costoInput.val()) || 0;
        const precio = parseFloat(precioInput.val()) || 0;
        
        if (costo > 0 && precio > 0) {
            const margen = ((precio - costo) / costo * 100).toFixed(2);
            margenInput.val(margen + '%');
            margenInput.css('color', margen > 0 ? '#10b981' : '#ef4444');
        } else {
            margenInput.val('');
            margenInput.css('color', '');
        }
    }
    
    costoInput.on('input', calcularMargenNuevo);
    precioInput.on('input', calcularMargenNuevo);
}

// ==================== IMPORTAR EXCEL ====================
function configurarImportacion() {
    $('#btnImportarExcelTrigger').click(function() {
        $('#fileExcelInput').click();
    });
    
    $('#fileExcelInput').change(function() {
        if (this.files.length) {
            const fileName = this.files[0].name;
            mostrarNotificacion(`📁 Importando archivo: ${fileName}`, 'info', 2000);
            $('#importExcelForm').submit();
        }
    });
}

// ==================== EXPORTAR A EXCEL ====================
function exportarExcel() {
    const familia = $('#filtro-familia').val() || '';
    const busqueda = $('#filtro-busqueda').val() || '';
    
    const params = new URLSearchParams();
    if (familia) params.append('familia', familia);
    if (busqueda) params.append('busqueda', busqueda);
    
    mostrarNotificacion('📊 Generando archivo Excel...', 'info', 2000);
    
    window.location.href = '/api/exportar_productos?' + params.toString();
}

// ==================== NUEVO PRODUCTO ====================
function abrirNuevoProducto() {
    if (nuevoProductoModal) nuevoProductoModal.show();
    
    // Generar código automático
    const fecha = new Date();
    const codigo = `PRD-${fecha.getFullYear()}${String(fecha.getMonth()+1).padStart(2,'0')}${String(fecha.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random() * 1000)).padStart(3,'0')}`;
    $('#nuevo_codigo').val(codigo);
    
    // Limpiar formulario
    $('#formNuevoProducto')[0].reset();
    $('#nuevo_costo_unitario').val('');
    $('#nuevo_precio_unitario').val('');
    $('#margen_calculado_nuevo').val('');
    $('#nuevo_estado').val('activo');
}

function guardarNuevoProducto() {
    const datos = {
        codigo: $('#nuevo_codigo').val(),
        familia: $('#nuevo_familia').val(),
        descripcion: $('#nuevo_descripcion').val(),
        descripcion_larga: $('#nuevo_descripcion_larga').val(),
        marca: $('#nuevo_marca').val(),
        modelo: $('#nuevo_modelo').val(),
        unidad: $('#nuevo_unidad').val(),
        volumen: parseFloat($('#nuevo_volumen').val()) || 0,
        peso: parseFloat($('#nuevo_peso').val()) || 0,
        observaciones: $('#nuevo_observaciones').val(),
        transporte: $('#nuevo_transporte').val(),
        costo_unitario: parseFloat($('#nuevo_costo_unitario').val()) || 0,
        precio_unitario: parseFloat($('#nuevo_precio_unitario').val()) || 0,
        stock: parseInt($('#nuevo_stock').val()) || 0,
        estado: $('#nuevo_estado').val()
    };
    
    // Validar campos obligatorios
    if (!datos.descripcion) {
        mostrarNotificacion('La descripción es obligatoria', 'warning');
        $('#nuevo_descripcion').focus();
        return;
    }
    
    const btn = $('#btnGuardarNuevoProducto');
    const textoOriginal = btn.html();
    btn.prop('disabled', true);
    btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
    
    $.ajax({
        url: '/api/productos',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function(response) {
            if (response.success) {
                mostrarNotificacion('✅ Producto creado correctamente', 'success');
                if (nuevoProductoModal) nuevoProductoModal.hide();
                setTimeout(() => location.reload(), 1000);
            } else {
                mostrarNotificacion('❌ Error: ' + (response.error || 'No se pudo crear el producto'), 'danger');
            }
        },
        error: function(xhr) {
            console.error('Error al crear producto:', xhr);
            let errorMsg = 'Error de conexión al servidor';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            }
            mostrarNotificacion('❌ ' + errorMsg, 'danger');
        },
        complete: function() {
            btn.prop('disabled', false);
            btn.html(textoOriginal);
        }
    });
}

// ==================== COMPARATIVO DE COSTOS ====================
function abrirComparativoCostos() {
    mostrarNotificacion('📊 Abriendo comparativo de costos...', 'info', 1500);
    // Redirigir a la página de comparativo
    window.location.href = '/comparativo-costos';
}

// ==================== BASE DE DATOS PRODUCTOS ====================
function abrirBaseDatos() {
    mostrarNotificacion('📚 Abriendo base de datos de productos...', 'info', 1500);
    window.location.href = '/base-datos-productos';
}

// ==================== INICIALIZACIÓN ====================
$(document).ready(function() {
    console.log('🟢 Inicializando sistema de gestión de productos KCF...');
    
    // Inicializar modales
    const modalEditarElement = document.getElementById('modalEditarProducto');
    const modalEliminarElement = document.getElementById('modalEliminarProducto');
    const modalKardexElement = document.getElementById('modalKardex');
    const modalNuevoElement = document.getElementById('modalNuevoProducto');
    
    if (modalEditarElement) {
        editModal = new bootstrap.Modal(modalEditarElement);
        // Limpiar al cerrar
        modalEditarElement.addEventListener('hidden.bs.modal', function() {
            $('#edit_product_content').html('');
        });
    }
    
    if (modalEliminarElement) {
        deleteModal = new bootstrap.Modal(modalEliminarElement);
    }
    
    if (modalKardexElement) {
        kardexModal = new bootstrap.Modal(modalKardexElement);
    }
    
    if (modalNuevoElement) {
        nuevoProductoModal = new bootstrap.Modal(modalNuevoElement);
    }
    
    // ========== FILTROS ==========
    $('#filtro-familia, #filtro-busqueda, #filtro-estado').on('change keyup', function() {
        filtrarTablaProductos();
        cargarSelectoresKardex();
    });
    
    // Inicializar
    filtrarTablaProductos();
    cargarSelectoresKardex();
    
    // ========== BOTONES DE ACCIÓN EN FILAS ==========
    $(document).on('click', '.btn-editar-producto', function() {
        const id = $(this).data('id');
        abrirEditarProducto(id);
    });
    
    $(document).on('click', '.btn-eliminar-producto', function() {
        const id = $(this).data('id');
        abrirEliminarProducto(id);
    });
    
    // ========== SIDEBAR LINKS ==========
    $('#sidebarDashboardLink').click(function(e) {
        e.preventDefault();
        window.location.href = '/mantenedor';
    });
    
    $('#sidebarKardexLink').click(function(e) {
        e.preventDefault();
        abrirKardex();
    });
    
    $('#sidebarComparativoLink').click(function(e) {
        e.preventDefault();
        abrirComparativoCostos();
    });
    
    $('#sidebarBaseDatosLink').click(function(e) {
        e.preventDefault();
        abrirBaseDatos();
    });
    
    $('#volverPanelLink').click(function(e) {
        e.preventDefault();
        window.location.href = '/mantenedor';
    });
    
    // ========== BOTONES GUARDAR ==========
    $('#btnGuardarEdicionProducto').off('click').on('click', guardarEdicion);
    $('#confirmarEliminarProductoBtn').off('click').on('click', eliminarProducto);
    $('#btnGuardarMovimientoKardex').off('click').on('click', guardarMovimiento);
    $('#btnGuardarNuevoProducto').off('click').on('click', guardarNuevoProducto);
    $('#btnAbrirNuevoProducto').off('click').on('click', abrirNuevoProducto);
    
    // ========== CALCULAR MARGEN EN EDICIÓN ==========
    $(document).on('input', '#edit_costo_unitario, #edit_precio_unitario', calcularMargenEdicion);
    
    // ========== KÁRDEX ==========
    $('#kardex_producto_id').change(function() {
        cargarKardex($(this).val());
    });
    
    // ========== FECHA POR DEFECTO EN MOVIMIENTO ==========
    if ($('#mov_kardex_fecha').val() === '') {
        $('#mov_kardex_fecha').val(new Date().toISOString().split('T')[0]);
    }
    
    // ========== CONFIGURAR IMPORTACIÓN ==========
    configurarImportacion();
    
    // ========== CONFIGURAR MARGEN NUEVO ==========
    configurarCalculoMargen();
    
    // ========== BOTÓN EXPORTAR ==========
    $('#btnExportarExcel').off('click').on('click', exportarExcel);
    
    // ========== STYLES PARA NOTIFICACIONES ==========
    const styleNoti = document.createElement('style');
    styleNoti.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notificacion-flotante {
            animation: slideInRight 0.4s ease;
        }
    `;
    document.head.appendChild(styleNoti);
    
    console.log('✅ Inicialización completa del sistema KCF');
});