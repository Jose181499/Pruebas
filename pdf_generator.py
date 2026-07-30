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

