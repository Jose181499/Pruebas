# pdf_generator.py - VERSIÓN CORREGIDA

import os
from weasyprint import HTML
from datetime import datetime
from flask import render_template_string
import json
import base64
import re

class PDFGenerator:
    def __init__(self):
        self.templates_dir = 'templates/cotizacion_oc/'
        self.logo_base64 = None  # Cache para el logo

    def _obtener_logo_base64(self):
        """Obtiene el logo en base64 para incrustarlo en el PDF"""
        if self.logo_base64:
            return self.logo_base64 
        
        logo_path = 'logo-kcf.png'
        if os.path.exists(logo_path):
            try:
                with open(logo_path, 'rb') as f:
                    logo_data = f.read()
                    self.logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                    return self.logo_base64
            except Exception as e:
                print(f"Error al leer logo: {e}")
        return None

    # ============================================================
    # MÉTODO PRINCIPAL - GENERAR PDF UNIVERSAL
    # ============================================================
    def generar_pdf_universal(self, datos):
        """Genera PDF basado en el tipo de documento - MÉTODO PRINCIPAL"""
        try:
            tipo_documento = datos.get('tipo_documento', '')
            
            print(f"Generando PDF universal - Tipo detectado: {tipo_documento}")
            
            # ORDEN DE COMPRA
            if tipo_documento == 'orden_compra' or 'numero_orden' in datos:
                return self._generar_orden_compra(datos)
            
            # GUÍA DE REMISIÓN
            elif tipo_documento == 'guia_remision' or ('serie' in datos and 'numero' in datos and 'destinatario_nombre' in datos):
                return self._generar_guia_remision(datos)
            
            # COTIZACIÓN (por defecto)
            elif tipo_documento == 'cotizacion' or 'numero_cotizacion' in datos:
                return self._generar_cotizacion(datos)
            else:
                # Detección automática
                if 'proveedor_razon_social' in datos:
                    return self._generar_orden_compra(datos)
                elif 'destinatario_nombre' in datos and 'serie' in datos:
                    return self._generar_guia_remision(datos)
                else:
                    return self._generar_cotizacion(datos)
                    
        except Exception as e:
            print(f"Error en generación universal de PDF: {e}")
            import traceback
            traceback.print_exc()
            return None

    # ============================================================
    # GENERAR COTIZACIÓN
    # ============================================================
    def _generar_cotizacion(self, datos_cotizacion):
        """Genera PDF para cotización con formato KCF"""
        try:
            print("Iniciando generación de PDF de cotización...")
            print(f"Datos recibidos: {list(datos_cotizacion.keys())}")
            
            datos_mapeados = self._mapear_datos_cotizacion(datos_cotizacion)
            print(f"Datos mapeados: {list(datos_mapeados.keys())}")
            
            template_path = os.path.join(self.templates_dir, 'cotizacion_comercial.html')
            if not os.path.exists(template_path):
                print(f"Template no encontrado en {template_path}")
                return None
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            print("Template de cotización cargado correctamente")
            
            filas_productos = self._generar_filas_productos(datos_mapeados.get('productos', []))
            datos_mapeados['filas_productos'] = filas_productos
            
            html_content = self._reemplazar_variables_template(template_content, datos_mapeados)
            
            fecha = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_file = f"cotizacion_{datos_mapeados.get('numero_cotizacion', 'sin_numero')}_{fecha}.pdf"
            
            print(f"Generando PDF: {pdf_file}")
            
            base_url = f"file://{os.getcwd()}/"
            HTML(string=html_content, base_url=base_url).write_pdf(pdf_file)
            
            print("PDF de cotización generado exitosamente")
            return pdf_file
            
        except Exception as e:
            print(f"Error generando PDF de cotización: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _mapear_datos_cotizacion(self, datos_cotizacion):
        """Mapea los datos de la cotización al formato esperado por el template"""
        cliente = datos_cotizacion.get('cliente', {})
        
        def get_from_notas(prefijo):
            notas = datos_cotizacion.get('notas', '')
            for line in notas.split('\n'):
                if line.startswith(prefijo):
                    return line.replace(prefijo, '').strip()
            return ''
        
        logo_base64 = self._obtener_logo_base64()
        logo_src = f"data:image/png;base64,{logo_base64}" if logo_base64 else ""
        
        datos_mapeados = {
            'numero_cotizacion': datos_cotizacion.get('numero_cotizacion'),
            'fecha_actual': datetime.now().strftime('%d/%m/%Y'),
            'cliente_razon_social': cliente.get('razon_social', '') or get_from_notas('Señor(es):'),
            'cliente_ruc': cliente.get('numero_documento', '') or get_from_notas('Doc:'),
            'cliente_direccion': cliente.get('direccion_fiscal', '') or get_from_notas('Dirección entrega:'),
            'cliente_telefono': get_from_notas('Teléfono:'),
            'cliente_contacto': get_from_notas('Atención:'),
            'numero_requerimiento': get_from_notas('Requerimiento:'),
            'asesor_comercial': get_from_notas('Asesor:'),
            'email_contacto': get_from_notas('Email:'),
            'telefono_contacto': get_from_notas('Teléfono contacto:'),
            'forma_pago': get_from_notas('Forma pago:'),
            'tiempo_entrega': get_from_notas('Tiempo entrega:'),
            'lugar_entrega': get_from_notas('Lugar entrega:'),
            'validez_oferta': get_from_notas('Validez:'),
            'descuento_comercial': get_from_notas('Desc comercial:'),
            'nota_cotizacion': get_from_notas('Nota cotización:'),
            'logo_src': logo_src,
            'productos': [],
            'subtotal': datos_cotizacion.get('subtotal', 0),
            'igv': datos_cotizacion.get('igv', 0),
            'total': datos_cotizacion.get('total', 0)
        }
        
        for i, item in enumerate(datos_cotizacion.get('items', []), 1):
            producto = {
                'item': i,
                'descripcion': item.get('descripcion', ''),
                'marca': item.get('marca', ''),
                'unidad': item.get('unidad', ''),
                'cantidad': item.get('cantidad', 0),
                'precio_unitario': item.get('precio_venta_con_descuento', 0),
                'subtotal': item.get('subtotal_venta_con_descuento', 0),
                'porcentaje_descuento': item.get('descuento_porcentaje', 0)
            }
            datos_mapeados['productos'].append(producto)
        
        return datos_mapeados

    def _generar_filas_productos(self, productos):
        """Genera las filas HTML de la tabla de productos"""
        filas = ""
        for prod in productos:
            clase_descuento = "fila-con-descuento" if prod.get('porcentaje_descuento', 0) > 0 else ""
            descuento_porcentaje = f"{prod.get('porcentaje_descuento', 0):.1f}%" if prod.get('porcentaje_descuento', 0) > 0 else "-"
            valor_descuento = f"S/ {prod.get('subtotal', 0):.2f}" if prod.get('porcentaje_descuento', 0) > 0 else "-"
            valor_final = f"S/ {prod.get('subtotal', 0):.2f}"
            
            filas += f"""            <tr class="{clase_descuento}">
                <td>{prod.get('item', '')}</td>
                <td class="descripcion">{prod.get('descripcion', '')}</td>
                <td class="marca">{prod.get('marca', '')}</td>
                <td>{prod.get('unidad', '')}</td>
                <td>{prod.get('cantidad', 0)}</td>
                <td class="numero-formateado">S/ {prod.get('precio_unitario', 0):.2f}</td>
                <td class="numero-formateado">S/ {prod.get('subtotal', 0):.2f}</td>
                <td>{descuento_porcentaje}</td>
                <td class="numero-formateado">{valor_descuento}</td>
                <td class="numero-formateado">{valor_final}</td>
            </tr>
"""
        return filas

    def _reemplazar_variables_template(self, template, datos):
        """Reemplaza variables del template sin usar Jinja2"""
        html = template
        
        logo_src = datos.get('logo_src', '')
        if logo_src:
            html = html.replace('src="logo-kcf.png"', f'src="{logo_src}"')
        
        html = html.replace("{{ numero_cotizacion }}", str(datos.get('numero_cotizacion', '')))
        html = html.replace("{{ fecha_actual }}", str(datos.get('fecha_actual', '')))
        html = html.replace("{{ cliente_razon_social }}", str(datos.get('cliente_razon_social', '')))
        html = html.replace("{{ cliente_ruc }}", str(datos.get('cliente_ruc', '')))
        html = html.replace("{{ cliente_direccion }}", str(datos.get('cliente_direccion', '')))
        html = html.replace("{{ cliente_telefono }}", str(datos.get('cliente_telefono', '')))
        html = html.replace("{{ cliente_contacto }}", str(datos.get('cliente_contacto', '')))
        html = html.replace("{{ numero_requerimiento }}", str(datos.get('numero_requerimiento', '')))
        html = html.replace("{{ asesor_comercial }}", str(datos.get('asesor_comercial', '')))
        html = html.replace("{{ email_contacto }}", str(datos.get('email_contacto', '')))
        html = html.replace("{{ telefono_contacto }}", str(datos.get('telefono_contacto', '')))
        html = html.replace("{{ forma_pago }}", str(datos.get('forma_pago', '')))
        html = html.replace("{{ tiempo_entrega }}", str(datos.get('tiempo_entrega', '')))
        html = html.replace("{{ lugar_entrega }}", str(datos.get('lugar_entrega', '')))
        html = html.replace("{{ validez_oferta }}", str(datos.get('validez_oferta', '')))
        html = html.replace("{{ nota_cotizacion }}", str(datos.get('nota_cotizacion', '')))
        
        subtotal = datos.get('subtotal', 0)
        igv = datos.get('igv', 0)
        total = datos.get('total', 0)
        
        html = html.replace("{{ total_subtotal_venta|default(0)|formato_soles }}", f"{subtotal:.2f}")
        html = html.replace("{{ total_subtotal_venta_desc|default(0)|formato_soles }}", f"{subtotal:.2f}")
        html = html.replace("{{ summary_igv|default(0)|formato_soles }}", f"{igv:.2f}")
        html = html.replace("{{ summary_total_venta|default(0)|formato_soles }}", f"{total:.2f}")
        
        inicio_tbody = html.find('<tbody>')
        fin_tbody = html.find('</tbody>')
        if inicio_tbody >= 0 and fin_tbody > inicio_tbody:
            inicio_for = html.find('{% for producto in productos %}', inicio_tbody)
            fin_for = html.find('{% endfor %}', inicio_for)
            if inicio_for >= 0 and fin_for > inicio_for:
                parte_antes = html[:inicio_for]
                parte_despues = html[fin_for + len('{% endfor %}'):]
                html = parte_antes + datos.get('filas_productos', '') + parte_despues
        
        html = re.sub(r'{%.*?%}', '', html, flags=re.DOTALL)
        html = re.sub(r'{{.*?}}', '', html, flags=re.DOTALL)
        
        return html

    # ============================================================
    # GENERAR ORDEN DE COMPRA
    # ============================================================
    def _generar_orden_compra(self, datos_orden_compra):
        """Genera PDF para orden de compra con formato KCF"""
        try:
            print("Iniciando generación de PDF de orden de compra...")
            
            if not os.path.exists(self.templates_dir):
                os.makedirs(self.templates_dir)
            
            template_path = os.path.join(self.templates_dir, 'generar_orden_compra.html')
            
            if not os.path.exists(template_path):
                self._crear_template_orden_compra_basico(template_path)
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            print("Template de orden de compra cargado correctamente")
            
            html_content = render_template_string(template_content, **datos_orden_compra)
            
            fecha = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_file = f"orden_compra_{datos_orden_compra.get('numero_orden', 'sin_numero')}_{fecha}.pdf"
            
            print(f"Generando PDF: {pdf_file}")
            
            base_url = f"file://{os.getcwd()}/"
            HTML(string=html_content, base_url=base_url).write_pdf(pdf_file)
            
            print("PDF de orden de compra generado exitosamente")
            return pdf_file
            
        except Exception as e:
            print(f"Error generando PDF de orden de compra: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _crear_template_cotizacion_basico(self, template_path):
        """Crea un template básico para cotización si no existe"""
        template_basico = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cotización - KCF CORPORACION</title>
            <style>
                body { font-family: Arial; font-size: 12px; }
                .header { text-align: center; margin-bottom: 20px; }
                .empresa { font-size: 16px; font-weight: bold; color: #D32F2F; }
                .numero { font-size: 14px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 5px; }
                th { background: #f0f0f0; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="empresa">KCF CORPORACION</div>
                <div class="numero">Cotización Nro: {{ numero_cotizacion }}</div>
                <div>Fecha: {{ fecha_actual }}</div>
            </div>
            <div><strong>Cliente:</strong> {{ cliente_razon_social }}</div>
            <div><strong>RUC:</strong> {{ cliente_ruc }}</div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Descripción</th>
                        <th>Marca</th>
                        <th>Und.</th>
                        <th>Cant.</th>
                        <th>Valor Venta Unit S/.</th>
                        <th>Valor Venta Total S/.</th>
                    </tr>
                </thead>
                <tbody>
                    {% for producto in productos %}
                    <tr>
                        <td>{{ producto.item }}</td>
                        <td>{{ producto.descripcion }}</td>
                        <td>{{ producto.marca }}</td>
                        <td>{{ producto.unidad }}</td>
                        <td>{{ producto.cantidad }}</td>
                        <td>S/ {{ producto.precio_venta_unitario }}</td>
                        <td>S/ {{ producto.subtotal_venta }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            <div style="margin-top: 20px; text-align: right;">
                <div><strong>Total: S/ {{ summary_total_venta }}</strong></div>
            </div>
        </body>
        </html>
        """
        
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(template_basico)
        print("Template básico de cotización creado")

    def _crear_template_orden_compra_basico(self, template_path):
        """Crea un template básico para orden de compra si no existe"""
        template_basico = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Orden de Compra - KCF CORPORACION</title>
            <style>
                body { font-family: Arial; font-size: 12px; }
                .header { text-align: center; margin-bottom: 20px; }
                .empresa { font-size: 16px; font-weight: bold; color: #D32F2F; }
                .numero { font-size: 14px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 5px; }
                th { background: #f0f0f0; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="empresa">KCF CORPORACION</div>
                <div class="numero">Orden de Compra Nro: {{ numero_orden }}</div>
                <div>Fecha: {{ fecha_actual }}</div>
            </div>
            <div><strong>Proveedor:</strong> {{ proveedor_razon_social }}</div>
            <div><strong>RUC:</strong> {{ proveedor_ruc }}</div>
            <div><strong>Dirección:</strong> {{ proveedor_direccion }}</div>
            {% if nota_orden %}
            <div><strong>Nota:</strong> {{ nota_orden }}</div>
            {% endif %}
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Descripción</th>
                        <th>Marca</th>
                        <th>Und.</th>
                        <th>Cant.</th>
                        <th>Precio Unit S/.</th>
                        <th>Subtotal S/.</th>
                    </tr>
                </thead>
                <tbody>
                    {% for producto in productos %}
                    <tr>
                        <td>{{ producto.item }}</td>
                        <td>{{ producto.descripcion }}</td>
                        <td>{{ producto.marca }}</td>
                        <td>{{ producto.unidad }}</td>
                        <td>{{ producto.cantidad }}</td>
                        <td>S/ {{ producto.precio_unitario }}</td>
                        <td>S/ {{ producto.subtotal }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
            <div style="margin-top: 20px; text-align: right;">
                <div><strong>Total: S/ {{ total_final }}</strong></div>
            </div>
        </body>
        </html>
        """
        
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(template_basico)
        print("Template básico de orden de compra creado")

    # ============================================================
    # GENERAR GUÍA DE REMISIÓN
    # ============================================================
    def _generar_guia_remision(self, datos_guia):
        """
        Genera PDF para Guía de Remisión
        """
        try:
            print("📄 Iniciando generación de PDF de Guía de Remisión...")
            print(f"Datos recibidos: {list(datos_guia.keys())}")
            
            datos_mapeados = self._mapear_datos_guia(datos_guia)
            
            template_path = os.path.join(self.templates_dir, 'guia_remision.html')
            if not os.path.exists(template_path):
                self._crear_template_guia_basico(template_path)
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            filas_productos = self._generar_filas_productos_guia(datos_mapeados.get('items', []))
            datos_mapeados['filas_productos'] = filas_productos
            
            html_content = self._reemplazar_variables_template_guia(template_content, datos_mapeados)
            
            fecha = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_file = f"guia_{datos_mapeados.get('serie', 'T001')}_{datos_mapeados.get('numero', 'sin_numero')}_{fecha}.pdf"
            
            print(f"Generando PDF: {pdf_file}")
            
            base_url = f"file://{os.getcwd()}/"
            HTML(string=html_content, base_url=base_url).write_pdf(pdf_file)
            
            print("PDF de Guía de Remisión generado exitosamente")
            return pdf_file
            
        except Exception as e:
            print(f"Error generando PDF de guía: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _mapear_datos_guia(self, datos_guia):
        """
        Mapea los datos de la guía al formato esperado por el template
        """
        EMPRESA = {
            'ruc': '20131369124',
            'nombre': 'KCF CORPORACION S.A.C.',
            'direccion': 'Av. Industrial 123, Lima, Perú',
            'telefono': '999 932 051',
            'email': 'ventas@kcfcorporacion.com',
            'web': 'www.kcfcorporacion.com'
        }
        
        logo_base64 = self._obtener_logo_base64()
        logo_src = f"data:image/png;base64,{logo_base64}" if logo_base64 else ""
        
        items = datos_guia.get('items', [])
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except:
                items = []
        
        items_formateados = []
        for idx, item in enumerate(items, 1):
            if isinstance(item, dict):
                items_formateados.append({
                    'item': idx,
                    'codigo': item.get('codigo', ''),
                    'descripcion': item.get('producto', item.get('descripcion', '')),
                    'unidad': item.get('um', 'NIU'),
                    'cantidad': float(item.get('cantidad', 1)),
                    'br': item.get('br', '')
                })
            elif isinstance(item, (list, tuple)):
                items_formateados.append({
                    'item': idx,
                    'codigo': item[0] if len(item) > 0 else '',
                    'descripcion': item[1] if len(item) > 1 else '',
                    'unidad': 'NIU',
                    'cantidad': float(item[2] if len(item) > 2 else 1),
                    'br': ''
                })
        
        peso_total = float(datos_guia.get('peso_total', 0))
        if peso_total == 0 and items_formateados:
            peso_total = sum(float(item['cantidad']) * 0.5 for item in items_formateados)
        
        return {
            'logo_src': logo_src,
            'ruc_remitente': datos_guia.get('ruc_remitente', EMPRESA['ruc']),
            'remitente_nombre': datos_guia.get('remitente_nombre', EMPRESA['nombre']),
            'remitente_direccion': datos_guia.get('remitente_direccion', EMPRESA['direccion']),
            'remitente_ubigeo': datos_guia.get('remitente_ubigeo', '150101'),
            'telefono': EMPRESA['telefono'],
            'email': EMPRESA['email'],
            'web': EMPRESA['web'],
            'ruc_destinatario': datos_guia.get('ruc_destinatario', datos_guia.get('ruc', '')),
            'destinatario_nombre': datos_guia.get('destinatario_nombre', datos_guia.get('cliente', '')),
            'destinatario_direccion': datos_guia.get('destinatario_direccion', datos_guia.get('destino', '')),
            'destinatario_ubigeo': datos_guia.get('destinatario_ubigeo', '150101'),
            'serie': datos_guia.get('serie', 'T001'),
            'numero': datos_guia.get('numero', ''),
            'fecha_emision': self._formatear_fecha(datos_guia.get('fecha_emision')),
            'fecha_traslado': self._formatear_fecha(datos_guia.get('fecha_traslado')),
            'fecha_inicio_traslado': self._formatear_fecha(datos_guia.get('fecha_inicio_traslado')),
            'motivo_traslado': datos_guia.get('motivo_traslado', '01'),
            'motivo_texto': self._get_motivo_texto(datos_guia.get('motivo_traslado', '01')),
            'modalidad_transporte': datos_guia.get('modalidad_transporte', 'PRIVADO'),
            'modalidad_texto': 'Transporte privado' if datos_guia.get('modalidad_transporte') == 'PRIVADO' else 'Transporte público',
            'peso_bruto_total': float(peso_total),
            'numero_bultos': datos_guia.get('numero_bultos', 1),
            'unidad_peso_texto': 'KGM',
            'transportista_nombre': datos_guia.get('transportista_nombre', '---'),
            'conductor_nombre': datos_guia.get('conductor_nombre', '---'),
            'conductor_dni': datos_guia.get('conductor_dni', '---'),
            'placa_vehiculo': datos_guia.get('placa_vehiculo', '---'),
            'licencia_conductor': datos_guia.get('licencia_conductor', '---'),
            'nro_cotizacion': datos_guia.get('documento_asociado', datos_guia.get('cotizacion_numero', '')),
            'pedido_compra_cliente': datos_guia.get('pedido_compra_cliente', ''),
            'nro_factura': datos_guia.get('nro_factura', ''),
            'items': items_formateados,
            'observaciones': datos_guia.get('observaciones', ''),
            'qr_base64': self._generar_qr_guia(datos_guia)
        }

    def _formatear_fecha(self, fecha):
        """Formatea fecha para mostrar en DD/MM/YYYY"""
        if not fecha:
            return datetime.now().strftime('%d/%m/%Y')
        try:
            if isinstance(fecha, str):
                if '/' in fecha:
                    return fecha
                dt = datetime.fromisoformat(fecha.replace('Z', '+00:00'))
                return dt.strftime('%d/%m/%Y')
            elif isinstance(fecha, datetime):
                return fecha.strftime('%d/%m/%Y')
            return str(fecha)
        except:
            return str(fecha)

    def _get_motivo_texto(self, codigo):
        """Obtiene el texto del motivo de traslado"""
        motivos = {
            '01': 'Venta',
            '02': 'Compra',
            '03': 'Traslado entre establecimientos',
            '04': 'Consignación',
            '05': 'Devolución',
            '06': 'Exportación',
            '07': 'Importación',
            '08': 'Donación',
            '09': 'Traslado por cuenta de terceros'
        }
        return motivos.get(codigo, codigo or 'Venta')

    def _generar_qr_guia(self, datos_guia):
        """Genera un código QR para la guía"""
        try:
            import qrcode
            from io import BytesIO
            import base64
            
            qr_data = {
                'serie': datos_guia.get('serie', ''),
                'numero': datos_guia.get('numero', ''),
                'ruc_remitente': datos_guia.get('ruc_remitente', ''),
                'ruc_destinatario': datos_guia.get('ruc_destinatario', ''),
                'fecha_emision': self._formatear_fecha(datos_guia.get('fecha_emision')),
                'total_peso': str(datos_guia.get('peso_total', 0))
            }
            
            qr = qrcode.QRCode(
                version=2,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=4,
                border=2,
            )
            qr.add_data(json.dumps(qr_data))
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            return f"data:image/png;base64,{img_base64}"
        except:
            return ""

    def _generar_filas_productos_guia(self, productos):
        """Genera las filas HTML de la tabla de productos para guía"""
        filas = ""
        for prod in productos:
            filas += f"""            <tr>
                <td>{prod.get('item', '')}</td>
                <td>{prod.get('codigo', '')}</td>
                <td class="descripcion">{prod.get('descripcion', '')}</td>
                <td>{prod.get('br', '')}</td>
                <td>{prod.get('unidad', 'NIU')}</td>
                <td>{prod.get('cantidad', 0)}</td>
            </tr>
"""
        return filas

    def _reemplazar_variables_template_guia(self, template, datos):
        """Reemplaza variables del template de guía"""
        html = template
        
        logo_src = datos.get('logo_src', '')
        if logo_src:
            html = html.replace('src="logo-kcf.png"', f'src="{logo_src}"')
        
        variables = [
            'ruc_remitente', 'remitente_nombre', 'remitente_direccion',
            'remitente_ubigeo', 'telefono', 'email', 'web',
            'ruc_destinatario', 'destinatario_nombre', 'destinatario_direccion',
            'destinatario_ubigeo', 'serie', 'numero',
            'fecha_emision', 'fecha_traslado', 'fecha_inicio_traslado',
            'motivo_traslado', 'motivo_texto', 'modalidad_transporte',
            'modalidad_texto', 'numero_bultos', 'unidad_peso_texto',
            'transportista_nombre', 'conductor_nombre', 'conductor_dni',
            'placa_vehiculo', 'licencia_conductor', 'nro_cotizacion',
            'pedido_compra_cliente', 'nro_factura', 'observaciones'
        ]
        
        for var in variables:
            value = datos.get(var, '')
            html = html.replace(f"{{{{ {var} }}}}", str(value))
        
        peso = datos.get('peso_bruto_total', 0)
        html = html.replace("{{ '%.1f'|format(peso_bruto_total|float) if peso_bruto_total else '0.0' }}", f"{peso:.1f}")
        
        qr = datos.get('qr_base64', '')
        html = html.replace("{{ qr_base64 }}", qr)
        
        inicio_tbody = html.find('<tbody>')
        fin_tbody = html.find('</tbody>')
        if inicio_tbody >= 0 and fin_tbody > inicio_tbody:
            inicio_for = html.find('{% for item in items %}', inicio_tbody)
            fin_for = html.find('{% endfor %}', inicio_for)
            if inicio_for >= 0 and fin_for > inicio_for:
                parte_antes = html[:inicio_for]
                parte_despues = html[fin_for + len('{% endfor %}'):]
                html = parte_antes + datos.get('filas_productos', '') + parte_despues
        
        html = re.sub(r'{%.*?%}', '', html, flags=re.DOTALL)
        html = re.sub(r'{{.*?}}', '', html, flags=re.DOTALL)
        
        return html

    def _crear_template_guia_basico(self, template_path):
        """Crea un template básico para guía de remisión"""
        template_basico = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Guía de Remisión {{ serie }}-{{ numero }}</title>
    <style>
        @page { size: A4; margin: 1.2cm 1.5cm; }
        body { font-family: 'Helvetica', Arial, sans-serif; font-size: 9.5px; color: #1a1a1a; line-height: 1.8; }
        .header-superior { display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 10px; gap: 15px; }
        .empresa-izquierda { flex: 1; display: flex; align-items: center; gap: 12px; }
        .empresa-izquierda .logo-container { flex-shrink: 0; width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; }
        .empresa-izquierda .logo-container img { max-height: 60px; max-width: 100px; object-fit: contain; }
        .empresa-izquierda .logo-container .logo-texto { font-size: 20px; font-weight: bold; color: #D32F2F; text-align: center; }
        .empresa-izquierda .info-texto { font-size: 8px; line-height: 1.4; }
        .empresa-izquierda .info-texto .nombre { font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .recuadro-derecha { flex-shrink: 0; border: 2px solid #000; border-radius: 12px; padding: 10px 20px; text-align: center; min-width: 200px; display: flex; flex-direction: column; justify-content: center; background: #ffffff; }
        .recuadro-derecha .ruc { font-size: 10px; font-weight: bold; }
        .recuadro-derecha .titulo { font-size: 11px; font-weight: bold; letter-spacing: 1px; margin: 2px 0; }
        .recuadro-derecha .numero { font-size: 13px; font-weight: bold; }
        .seccion { margin-bottom: 8px; }
        .seccion-titulo { font-weight: bold; font-size: 9.5px; margin-bottom: 3px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; }
        .info-destinatario, .datos-traslado, .datos-ruta, .datos-transporte, .referencias, .observaciones {
            border: 1px solid #ccc; border-radius: 8px; padding: 6px 12px; margin-bottom: 6px; background: #f9f9f9;
        }
        .fila { display: flex; padding: 1px 0; align-items: baseline; }
        .fila .label { font-weight: bold; min-width: 200px; flex-shrink: 0; }
        .fila .value { flex: 1; text-align: left; padding-left: 5px; }
        .products-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 8.5px; border-radius: 8px; overflow: hidden; }
        .products-table th { background: #333; color: white; padding: 4px 5px; text-align: center; border: 1px solid #000; font-size: 8px; text-transform: uppercase; }
        .products-table td { padding: 3px 5px; border: 1px solid #ccc; text-align: center; font-size: 8.5px; }
        .products-table td.descripcion { text-align: left; }
        .products-table tr:nth-child(even) { background: #f9f9f9; }
        .qr-container { text-align: center; margin: 8px 0 5px 0; padding: 6px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
        .qr-container img { width: 90px; height: 90px; }
        .qr-container .qr-text { font-size: 7.5px; color: #444; margin-top: 3px; }
        .footer { margin-top: 12px; text-align: center; font-size: 7.5px; color: #555; border-top: 1px solid #ddd; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="header-superior">
        <div class="empresa-izquierda">
            <div class="logo-container">
                <img src="logo-kcf.png" alt="Logo" style="max-height:60px;">
            </div>
            <div class="info-texto">
                <div class="nombre">{{ remitente_nombre }}</div>
                <div class="direccion">{{ remitente_direccion }}</div>
                <div class="contacto">
                    <span>Telf: {{ telefono }}</span>
                    <span>Email: {{ email }}</span>
                </div>
            </div>
        </div>
        <div class="recuadro-derecha">
            <div class="ruc">R.U.C. Nº {{ ruc_remitente }}</div>
            <div class="titulo">GUIA DE REMISIÓN</div>
            <div class="numero">{{ serie }}-{{ numero }}</div>
        </div>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">DESTINATARIO</div>
        <div class="info-destinatario">
            <div class="fila"><span class="label">R.U.C.:</span><span class="value">{{ ruc_destinatario }}</span></div>
            <div class="fila"><span class="label">DENOMINACIÓN:</span><span class="value">{{ destinatario_nombre }}</span></div>
        </div>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">DATOS DEL TRASLADO</div>
        <div class="datos-traslado">
            <div class="fila"><span class="label">FECHA EMISIÓN:</span><span class="value">{{ fecha_emision }}</span></div>
            <div class="fila"><span class="label">FECHA INICIO TRASLADO:</span><span class="value">{{ fecha_inicio_traslado }}</span></div>
            <div class="fila"><span class="label">MOTIVO DE TRASLADO:</span><span class="value">{{ motivo_texto }}</span></div>
            <div class="fila"><span class="label">MODALIDAD DE TRANSPORTE:</span><span class="value">{{ modalidad_texto }}</span></div>
            <div class="fila"><span class="label">PESO BRUTO TOTAL (KGM):</span><span class="value">{{ '%.1f'|format(peso_bruto_total|float) if peso_bruto_total else '0.0' }}</span></div>
            <div class="fila"><span class="label">NÚMERO DE BULTOS:</span><span class="value">{{ numero_bultos }}</span></div>
        </div>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">DATOS DE RUTA</div>
        <div class="datos-ruta">
            <div class="fila"><span class="label">PUNTO DE PARTIDA:</span><span class="value">{{ remitente_direccion }}</span></div>
            <div class="fila"><span class="label">PUNTO DE LLEGADA:</span><span class="value">{{ destinatario_direccion }}</span></div>
        </div>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">DATOS DEL TRANSPORTE</div>
        <div class="datos-transporte">
            <div class="fila"><span class="label">TRANSPORTISTA:</span><span class="value">{{ transportista_nombre }}</span></div>
            <div class="fila"><span class="label">CONDUCTOR:</span><span class="value">{{ conductor_nombre }}</span></div>
            <div class="fila"><span class="label">DNI:</span><span class="value">{{ conductor_dni }}</span></div>
            <div class="fila"><span class="label">PLACA:</span><span class="value">{{ placa_vehiculo }}</span></div>
            <div class="fila"><span class="label">LICENCIA:</span><span class="value">{{ licencia_conductor }}</span></div>
        </div>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">PRODUCTOS</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width:8%">ITEM</th>
                    <th style="width:12%">CODIGO</th>
                    <th style="width:30%">PRODUCTO</th>
                    <th style="width:10%">BR</th>
                    <th style="width:10%">U/M</th>
                    <th style="width:12%">CANTIDAD</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td>{{ item.item }}</td>
                    <td>{{ item.codigo }}</td>
                    <td class="descripcion">{{ item.descripcion }}</td>
                    <td>{{ item.br }}</td>
                    <td>{{ item.unidad }}</td>
                    <td>{{ '%.1f'|format(item.cantidad|float) if item.cantidad else '0.0' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    
    <div class="seccion">
        <div class="seccion-titulo">REFERENCIAS</div>
        <div class="referencias">
            <div class="fila"><span class="label">NRO DE COTIZACION:</span><span class="value">{{ nro_cotizacion }}</span></div>
            <div class="fila"><span class="label">NRO DE FACTURA:</span><span class="value">{{ nro_factura }}</span></div>
        </div>
    </div>
    
    <div class="observaciones">
        <div class="fila">
            <span class="label">OBSERVACIONES:</span>
            <span class="value">{{ observaciones }}</span>
        </div>
    </div>
    
    <div class="qr-container">
        <img src="{{ qr_base64 }}" alt="Código QR">
        <div class="qr-text">Representación impresa de la GUIA DE REMISIÓN</div>
    </div>
    
    <div class="footer">
        <div>Pag. 1 de 1</div>
        <div>Powered by KCF CORPORACION</div>
    </div>
</body>
</html>
"""
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(template_basico)
        print("Template básico de guía creado")


# ============================================================
# INSTANCIA GLOBAL
# ============================================================
pdf_generator = PDFGenerator()