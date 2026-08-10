/* ============================================================
   INVENTARIO.JS - Módulo de Inventario (Frontend completo)
   ============================================================ */

(function() {
    'use strict';

    // ============================================================
    // 1. VARIABLES GLOBALES DEL MÓDULO
    // ============================================================
    const MODULE_NAME = 'Inventario';

    // Mapeo de secciones y sus endpoints simulados (para el ejemplo)
    const API_ENDPOINTS = {
        estado_stock: '/inventario/api/estado_stock',
        kardex: '/inventario/api/kardex',
        entradas_salidas: '/inventario/api/entradas_salidas',
        transferencias: '/inventario/api/transferencias'
    };

    // ============================================================
    // 2. INICIALIZACIÓN PRINCIPAL
    // ============================================================
    function initInventario(tabId) {
        console.log(`📦 [${MODULE_NAME}] Inicializando módulo con tab: ${tabId}`);
        
        // Si no se pasa tabId, usar el primero o el de la URL
        if (!tabId) {
            const urlParams = new URLSearchParams(window.location.search);
            tabId = urlParams.get('tab') || 'estado_stock';
        }

        // Cargar los datos de la sección activa
        cargarDatosSeccion(tabId);
    }

    // Exponer la función al global (para que el HTML la llame)
    window.initInventario = initInventario;

    // ============================================================
    // 3. CARGA DE DATOS POR SECCIÓN (AJAX)
    // ============================================================
    function cargarDatosSeccion(tabId) {
        // 1. Mostrar loader visual (opcional)
        const tbodyId = getTbodyId(tabId);
        if (tbodyId) {
            document.getElementById(tbodyId).innerHTML = `
                <tr><td colspan="10" style="padding:20px;color:#94A3B8;font-weight:900;">
                    ⏳ Cargando datos...
                </td></tr>
            `;
        }

        // 2. Simular petición AJAX al backend
        // NOTA: Cambia esto por un fetch real cuando tengas el backend listo
        setTimeout(() => {
            // Simulamos datos de respuesta según el tab
            let data = [];
            let countLabel = '';

            if (tabId === 'estado_stock') {
                data = getMockStockData();
                countLabel = 'productos';
            } else if (tabId === 'kardex') {
                data = getMockKardexData();
                countLabel = 'movimientos';
            } else if (tabId === 'entradas_salidas') {
                data = getMockMovimientosData();
                countLabel = 'movimientos';
            } else if (tabId === 'transferencias') {
                data = getMockTransferenciasData();
                countLabel = 'transferencias';
            }

            // 3. Renderizar la tabla con los datos
            renderizarTabla(tabId, data);
            
            // 4. Actualizar contador del footer
            const countSpan = document.getElementById(`${tabId}Count`);
            if (countSpan) {
                countSpan.textContent = `Mostrando ${data.length} de ${data.length} ${countLabel}`;
            }

            // 5. Actualizar KPIs (si los tienes definidos en el HTML)
            actualizarKPIs(tabId, data);

        }, 400); // Simulación de latencia
    }

    // ============================================================
    // 4. RENDERIZADO DE TABLAS
    // ============================================================
    function renderizarTabla(tabId, data) {
        const tbodyId = getTbodyId(tabId);
        if (!tbodyId) return;

        const tbody = document.getElementById(tbodyId);
        let html = '';

        if (!data || data.length === 0) {
            html = `<tr><td colspan="10" style="padding:20px;color:#94A3B8;font-weight:900;">
                📭 No se encontraron registros.
            </td></tr>`;
        } else {
            data.forEach((item, index) => {
                html += `<tr>`;
                // Generamos las celdas según la sección
                if (tabId === 'estado_stock') {
                    html += `
                        <td><b>${item.codigo || 'PROD-001'}</b></td>
                        <td>${item.producto || 'Producto genérico'}</td>
                        <td><b>${item.stock_actual || 0}</b></td>
                        <td>${item.stock_minimo || 5}</td>
                        <td>${item.ubicacion || 'Almacén Principal'}</td>
                        <td>${item.ultimo_movimiento || '2026-07-13'}</td>
                        <td>${getAccionesHTML(item.id, 'stock')}</td>
                    `;
                } else if (tabId === 'kardex') {
                    html += `
                        <td>${item.fecha || '2026-07-13'}</td>
                        <td><b>${item.numero || 'KARDEX-001'}</b></td>
                        <td>${item.producto || 'Producto'}</td>
                        <td><span class="badge ${item.tipo === 'Entrada' ? 'b-approved' : 'b-canceled'}">${item.tipo || 'Movimiento'}</span></td>
                        <td><b>${item.cantidad || 0}</b></td>
                        <td>${item.responsable || 'Usuario'}</td>
                        <td>${getAccionesHTML(item.id, 'kardex')}</td>
                    `;
                } else if (tabId === 'entradas_salidas') {
                    html += `
                        <td>${item.fecha || '2026-07-13'}</td>
                        <td><b>${item.documento || 'DOC-001'}</b></td>
                        <td><span class="badge ${item.tipo === 'Entrada' ? 'b-approved' : 'b-canceled'}">${item.tipo || 'Movimiento'}</span></td>
                        <td>${item.producto || 'Producto'}</td>
                        <td><b>${item.cantidad || 0}</b></td>
                        <td>${item.motivo || 'Sin motivo'}</td>
                        <td>${getAccionesHTML(item.id, 'movimiento')}</td>
                    `;
                } else if (tabId === 'transferencias') {
                    html += `
                        <td><b>${item.numero || 'TRF-001'}</b></td>
                        <td>${item.fecha || '2026-07-13'}</td>
                        <td>${item.origen || 'Almacén A'}</td>
                        <td>${item.destino || 'Almacén B'}</td>
                        <td>${item.producto || 'Producto'}</td>
                        <td><b>${item.cantidad || 0}</b></td>
                        <td><span class="badge ${item.estado === 'Completada' ? 'b-approved' : item.estado === 'En tránsito' ? 'b-info' : 'b-pending'}">${item.estado || 'Pendiente'}</span></td>
                        <td>${getAccionesHTML(item.id, 'transferencia')}</td>
                    `;
                }
                html += `</tr>`;
            });
        }

        tbody.innerHTML = html;
    }

    // ============================================================
    // 5. FUNCIONES DE ACCIONES Y MENÚS (Kebab)
    // ============================================================
    function getAccionesHTML(id, tipo) {
        // Botón de kebab que abre el menú contextual
        return `
            <button class="kebab" onclick="toggleMenu(event, '${id}', '${tipo}')">⋮</button>
        `;
    }

    window.toggleMenu = function(event, id, tipo) {
        // Prevenir que el clic se propague
        event.stopPropagation();

        // Cerrar cualquier otro menú abierto
        const existingMenu = document.querySelector('.menu-pop');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Crear el menú flotante
        const menu = document.createElement('div');
        menu.className = 'menu-pop';
        menu.style.top = (event.clientY + 10) + 'px';
        menu.style.left = (event.clientX - 20) + 'px';

        // Opciones según el tipo
        let opciones = '';
        if (tipo === 'stock') {
            opciones = `
                <button class="menu-edit" onclick="accionStock('ajustar', '${id}')">📝 Ajustar stock</button>
                <button class="menu-pdf" onclick="accionStock('detalle', '${id}')">📄 Ver detalle</button>
                <div class="menu-divider"></div>
                <button class="danger" onclick="accionStock('eliminar', '${id}')">🗑️ Eliminar</button>
            `;
        } else if (tipo === 'kardex' || tipo === 'movimiento') {
            opciones = `
                <button class="menu-edit" onclick="accionMovimiento('ver', '${id}')">👁️ Ver detalle</button>
                <button class="menu-pdf" onclick="accionMovimiento('pdf', '${id}')">📄 Generar comprobante</button>
                <div class="menu-divider"></div>
                <button class="danger" onclick="accionMovimiento('eliminar', '${id}')">🗑️ Eliminar</button>
            `;
        } else if (tipo === 'transferencia') {
            opciones = `
                <button class="menu-edit" onclick="accionTransferencia('editar', '${id}')">✏️ Editar</button>
                <button class="menu-approve" onclick="accionTransferencia('completar', '${id}')">✅ Marcar completada</button>
                <div class="menu-divider"></div>
                <button class="danger" onclick="accionTransferencia('eliminar', '${id}')">🗑️ Eliminar</button>
            `;
        }

        menu.innerHTML = opciones;
        document.body.appendChild(menu);

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    };

    // Funciones de acciones (abrir modales, etc.)
    window.accionStock = function(accion, id) {
        closeAllMenus();
        if (accion === 'ajustar') {
            // Abrir modal de ajuste
            document.getElementById('stockModal').classList.add('active');
            document.getElementById('stkProducto').value = 'Producto ID ' + id;
        } else if (accion === 'detalle') {
            alert(`📊 Ver detalle de stock del ID: ${id}`);
        } else if (accion === 'eliminar') {
            if (confirm('¿Estás seguro de eliminar este producto?')) {
                alert(`🗑️ Producto ${id} eliminado (simulado)`);
            }
        }
    };

    window.accionMovimiento = function(accion, id) {
        closeAllMenus();
        if (accion === 'ver') {
            // Abrir modal de kardex
            document.getElementById('kardexModal').classList.add('active');
            document.getElementById('kdxNumero').value = 'MOV-' + id;
        } else if (accion === 'pdf') {
            alert(`📄 Generando PDF del movimiento ${id}`);
        } else if (accion === 'eliminar') {
            if (confirm('¿Eliminar este movimiento del kardex?')) {
                alert(`🗑️ Movimiento ${id} eliminado (simulado)`);
            }
        }
    };

    window.accionTransferencia = function(accion, id) {
        closeAllMenus();
        if (accion === 'editar') {
            document.getElementById('transferenciaModal').classList.add('active');
        } else if (accion === 'completar') {
            if (confirm('¿Marcar esta transferencia como completada?')) {
                alert(`✅ Transferencia ${id} completada (simulado)`);
                // Recargar datos
                const activeTab = document.querySelector('.tab-btn.active');
                if (activeTab) cargarDatosSeccion(activeTab.dataset.tab);
            }
        } else if (accion === 'eliminar') {
            if (confirm('¿Eliminar esta transferencia?')) {
                alert(`🗑️ Transferencia ${id} eliminada (simulado)`);
            }
        }
    };

    function closeAllMenus() {
        const menus = document.querySelectorAll('.menu-pop');
        menus.forEach(m => m.remove());
    }

    // ============================================================
    // 6. FUNCIONES PARA ABRIR MODALES (Botones principales)
    // ============================================================
    window.openStockModal = function() {
        document.getElementById('stockModal').classList.add('active');
        document.getElementById('stkActual').value = '0';
        document.getElementById('stkNuevo').value = '0';
        document.getElementById('stkProducto').value = '';
    };

    window.openEntradaModal = function() {
        document.getElementById('entradaSalidaModal').classList.add('active');
        document.getElementById('movTipo').value = 'Entrada';
        document.getElementById('entradaSalidaModalTitle').textContent = '📥 Nueva entrada de mercadería';
    };

    window.openSalidaModal = function() {
        document.getElementById('entradaSalidaModal').classList.add('active');
        document.getElementById('movTipo').value = 'Salida';
        document.getElementById('entradaSalidaModalTitle').textContent = '📤 Nueva salida de mercadería';
    };

    window.openTransferenciaModal = function() {
        document.getElementById('transferenciaModal').classList.add('active');
    };

    // ============================================================
    // 7. FUNCIONES DE GUARDADO (Simuladas)
    // ============================================================
    window.saveAjusteStock = function() {
        const producto = document.getElementById('stkProducto').value;
        const nuevoStock = document.getElementById('stkNuevo').value;
        const motivo = document.getElementById('stkMotivo').value;

        if (!producto) {
            alert('❌ Debes ingresar un producto.');
            return;
        }

        // Simular envío al backend
        console.log('📤 Guardando ajuste:', { producto, nuevoStock, motivo });
        alert(`✅ Ajuste de stock guardado correctamente.\nProducto: ${producto}\nNuevo stock: ${nuevoStock}`);
        
        closeModal('stockModal');
        recargarSeccionActiva();
    };

    window.saveMovimiento = function(estado) {
        const tipo = document.getElementById('movTipo').value;
        const producto = document.getElementById('movProducto').value;
        const cantidad = document.getElementById('movCantidad').value;

        if (!producto) {
            alert('❌ Debes ingresar el producto.');
            return;
        }

        console.log('📤 Guardando movimiento:', { tipo, producto, cantidad, estado });
        alert(`✅ ${tipo} registrada con estado "${estado}".\nProducto: ${producto}\nCantidad: ${cantidad}`);
        
        closeModal('entradaSalidaModal');
        recargarSeccionActiva();
    };

    window.saveTransferencia = function(estado) {
        const origen = document.getElementById('tfrOrigen').value;
        const destino = document.getElementById('tfrDestino').value;
        const producto = document.getElementById('tfrProducto').value;

        if (!producto) {
            alert('❌ Debes ingresar el producto a transferir.');
            return;
        }

        console.log('📤 Guardando transferencia:', { origen, destino, producto, estado });
        alert(`✅ Transferencia guardada con estado "${estado}".\nDe: ${origen}\nA: ${destino}`);
        
        closeModal('transferenciaModal');
        recargarSeccionActiva();
    };

    // ============================================================
    // 8. FUNCIONES UTILITARIAS
    // ============================================================
    function getTbodyId(tabId) {
        const map = {
            'estado_stock': 'stockRows',
            'kardex': 'kardexRows',
            'entradas_salidas': 'movRows',
            'transferencias': 'transRows'
        };
        return map[tabId] || null;
    }

    function actualizarKPIs(tabId, data) {
        // Si tienes un panel de KPIs (status-board) lo actualizas aquí
        const kpiContainer = document.getElementById(tabId + 'KPI');
        if (kpiContainer && data) {
            // Ejemplo básico: mostrar un contador
            kpiContainer.innerHTML = `
                <div class="status-card">
                    <div class="status-dot dot-total">${data.length}</div>
                    <div><small>Total registros</small><b>${data.length}</b></div>
                </div>
            `;
        }
    }

    function recargarSeccionActiva() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            cargarDatosSeccion(activeTab.dataset.tab);
        }
    }

    window.closeModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
        }
    };

    window.exportData = function(tabId) {
        alert(`📥 Exportando datos de la sección: ${tabId} (Simulado)`);
    };

    window.clearSolicitudDateFilter = function() {
        // Para compatibilidad con el estilo de compras, solo un placeholder
        console.log('🧹 Limpiando filtros de fecha');
    };

    // Función para cambiar el color del modal de entrada/salida (estilo visual)
    window.cambiarColorMov = function() {
        const tipo = document.getElementById('movTipo').value;
        const title = document.getElementById('entradaSalidaModalTitle');
        if (tipo === 'Entrada') {
            title.textContent = '📥 Nueva entrada de mercadería';
            document.getElementById('entradaSalidaModal').querySelector('.btn-primary').style.background = '#059669'; // Verde
        } else {
            title.textContent = '📤 Nueva salida de mercadería';
            document.getElementById('entradaSalidaModal').querySelector('.btn-primary').style.background = '#EF233C'; // Rojo
        }
    };

    // ============================================================
    // 9. DATOS DE EJEMPLO (MOCK) - REEMPLAZAR CON BACKEND REAL
    // ============================================================
    function getMockStockData() {
        return [
            { id: 1, codigo: 'PROD-001', producto: 'Laptop Lenovo ThinkPad', stock_actual: 45, stock_minimo: 10, ubicacion: 'Estante A3', ultimo_movimiento: '2026-07-10' },
            { id: 2, codigo: 'PROD-002', producto: 'Monitor Samsung 24"', stock_actual: 12, stock_minimo: 5, ubicacion: 'Estante B1', ultimo_movimiento: '2026-07-11' },
            { id: 3, codigo: 'PROD-003', producto: 'Teclado Mecánico RGB', stock_actual: 0, stock_minimo: 20, ubicacion: 'Estante C2', ultimo_movimiento: '2026-07-05' },
        ];
    }

    function getMockKardexData() {
        return [
            { id: 101, fecha: '2026-07-10', numero: 'MOV-001', producto: 'Laptop Lenovo', tipo: 'Entrada', cantidad: 10, responsable: 'Juan Pérez' },
            { id: 102, fecha: '2026-07-11', numero: 'MOV-002', producto: 'Monitor Samsung', tipo: 'Salida', cantidad: 2, responsable: 'María García' },
            { id: 103, fecha: '2026-07-12', numero: 'MOV-003', producto: 'Teclado Mecánico', tipo: 'Salida', cantidad: 5, responsable: 'Carlos López' },
        ];
    }

    function getMockMovimientosData() {
        return [
            { id: 201, fecha: '2026-07-09', documento: 'OC-001', tipo: 'Entrada', producto: 'Laptop Lenovo', cantidad: 8, motivo: 'Compra' },
            { id: 202, fecha: '2026-07-10', documento: 'FAC-002', tipo: 'Salida', producto: 'Monitor Samsung', cantidad: 1, motivo: 'Venta' },
            { id: 203, fecha: '2026-07-11', documento: 'AJ-001', tipo: 'Salida', producto: 'Teclado Mecánico', cantidad: 3, motivo: 'Ajuste' },
        ];
    }

    function getMockTransferenciasData() {
        return [
            { id: 301, numero: 'TRF-001', fecha: '2026-07-08', origen: 'Almacén Principal', destino: 'Tienda 1', producto: 'Laptop Lenovo', cantidad: 5, estado: 'Completada' },
            { id: 302, numero: 'TRF-002', fecha: '2026-07-10', origen: 'Almacén Principal', destino: 'Almacén Secundario', producto: 'Monitor Samsung', cantidad: 3, estado: 'En tránsito' },
            { id: 303, numero: 'TRF-003', fecha: '2026-07-12', origen: 'Tienda 1', destino: 'Tienda 2', producto: 'Teclado Mecánico', cantidad: 2, estado: 'Pendiente' },
        ];
    }

})();