# routes/pdf_generator.py

import os
import tempfile
import traceback
import json
import base64
import re

from datetime import datetime
from weasyprint import HTML

class PDFGenerator:
    def __init__(self):
        self.templates_dir = 'templates/cotizacion_oc/'
        self.logo_base64 = None

    def _obtener_logo_base64(self):
        """Obtiene el logo en base64"""
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

    def _convertir_float(self, valor, default=0.0):
        """Convierte un valor a float sin fallar con None o cadenas vacías."""

        if valor is None:
            return default

        if isinstance(valor, str):
            valor = valor.strip().replace(',', '.')

            if not valor:
                return default

        try:
            return float(valor)
        except (TypeError, ValueError):
            print(f"⚠️ No se pudo convertir a float: {valor!r}")
            return default

    def generar_pdf_universal(self, datos):
        """Genera PDF basado en el tipo de documento"""
        try:
            tipo_documento = datos.get('tipo_documento', '')
            print(f"Generando PDF universal - Tipo: {tipo_documento}")
            
            if tipo_documento == 'guia_remision':
                return self._generar_guia_remision(datos)
            elif tipo_documento == 'orden_compra':
                return self._generar_orden_compra(datos)
            else:
                return self._generar_cotizacion(datos)
                    
        except Exception as e:
            print(f"Error en generación universal: {e}")
            import traceback
            traceback.print_exc()
            return None

    # pdf_generator.py - Modificar _generar_guia_remision

    def _generar_guia_remision(self, datos_guia):
        """Genera el PDF de una Guía de Remisión."""

        print("📄 Iniciando generación de PDF de Guía de Remisión...")

        # 1. Mapear y normalizar datos
        datos_mapeados = self._mapear_datos_guia(datos_guia)

        print(f"✅ Datos mapeados")
        print(f"   Serie: {datos_mapeados.get('serie')}")
        print(f"   Número: {datos_mapeados.get('numero')}")
        print(f"   Productos: {len(datos_mapeados.get('items', []))}")
        print(f"   Peso: {datos_mapeados.get('peso_bruto_total')}")

        # 2. Obtener plantilla
        template_content = self._obtener_template_guia()

        if not template_content:
            raise RuntimeError(
                'La plantilla HTML de la guía está vacía.'
            )

        # 3. Generar filas de productos
        filas_productos = self._generar_filas_productos_guia(
            datos_mapeados.get('items', [])
        )

        datos_mapeados['filas_productos'] = filas_productos

        # 4. Reemplazar variables
        html_content = self._reemplazar_variables_template_guia(
            template_content,
            datos_mapeados
        )

        if not html_content:
            raise RuntimeError(
                'El contenido HTML resultante está vacío.'
            )

        # 5. Crear nombre del archivo
        fecha = datetime.now().strftime('%Y%m%d_%H%M%S')

        serie = str(datos_mapeados.get('serie') or 'T001')
        numero = str(datos_mapeados.get('numero') or 'sin_numero')

        nombre_archivo = (
            f"guia_{serie}_{numero}_{fecha}.pdf"
        )

        # Render permite escribir temporalmente en /tmp
        pdf_file = os.path.join(
            tempfile.gettempdir(),
            nombre_archivo
        )

        print(f"📂 Ruta PDF: {pdf_file}")

        # 6. Crear PDF
        try:
            HTML(
                string=html_content,
                base_url=os.getcwd()
            ).write_pdf(pdf_file)

        except Exception as error:
            print("❌ WeasyPrint no pudo generar el PDF")
            print(f"❌ Tipo: {type(error).__name__}")
            print(f"❌ Mensaje: {error}")
            traceback.print_exc()
            raise

        # 7. Verificar resultado
        if not os.path.isfile(pdf_file):
            raise FileNotFoundError(
                f'WeasyPrint terminó, pero no existe el PDF: {pdf_file}'
            )

        tamaño = os.path.getsize(pdf_file)

        if tamaño <= 0:
            raise RuntimeError(
                f'El PDF generado está vacío: {pdf_file}'
            )

        print(f"✅ PDF generado correctamente: {pdf_file}")
        print(f"✅ Tamaño: {tamaño} bytes")

        return pdf_file

    def _obtener_template_guia(self):
        """Retorna el template HTML de la guía como string (en memoria)"""
        return """<!DOCTYPE html>
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
                .empresa-izquierda .info-texto { font-size: 8px; line-height: 1.4; }
                .empresa-izquierda .info-texto .nombre { font-size: 10px; font-weight: bold; text-transform: uppercase; }
                .recuadro-derecha { flex-shrink: 0; border: 2px solid #000; border-radius: 12px; padding: 10px 20px; text-align: center; min-width: 200px; }
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
                .products-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 8.5px; }
                .products-table th { background: #333; color: white; padding: 4px 5px; text-align: center; border: 1px solid #000; }
                .products-table td { padding: 3px 5px; border: 1px solid #ccc; text-align: center; }
                .products-table td.descripcion { text-align: left; }
                .qr-container { text-align: center; margin: 8px 0 5px 0; padding: 6px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
                .qr-container img { width: 90px; height: 90px; }
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
                </div>
            </div>
            
            <div class="observaciones">
                <div class="fila"><span class="label">OBSERVACIONES:</span><span class="value">{{ observaciones }}</span></div>
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
        </html>"""

    def _mapear_datos_guia(self, datos_guia):
        """Mapea los datos de la guía al formato esperado."""

        EMPRESA = {
            'ruc': '20131369124',
            'nombre': 'KCF CORPORACION S.A.C.',
            'direccion': 'Av. Industrial 123, Lima, Perú',
            'telefono': '999 932 051',
            'email': 'ventas@kcfcorporacion.com'
        }

        logo_base64 = self._obtener_logo_base64()

        logo_src = (
            f"data:image/png;base64,{logo_base64}"
            if logo_base64
            else ""
        )

        # -----------------------------
        # NORMALIZAR ITEMS
        # -----------------------------
        items_raw = datos_guia.get('items')

        if items_raw is None:
            items = []

        elif isinstance(items_raw, str):
            texto = items_raw.strip()

            if not texto:
                items = []
            else:
                try:
                    items = json.loads(texto)
                except json.JSONDecodeError as error:
                    print(f"❌ items_json inválido: {error}")
                    print(f"❌ Contenido: {texto}")
                    items = []

        elif isinstance(items_raw, list):
            items = items_raw

        elif isinstance(items_raw, tuple):
            items = list(items_raw)

        elif isinstance(items_raw, dict):
            items = (
                items_raw.get('items')
                or items_raw.get('productos')
                or items_raw.get('detalle')
                or []
            )

        else:
            print(
                f"⚠️ Tipo no reconocido para items: "
                f"{type(items_raw).__name__}"
            )
            items = []

        if not isinstance(items, list):
            print(
                f"⚠️ Después de normalizar, items no es lista: "
                f"{type(items).__name__}"
            )
            items = []

        # -----------------------------
        # FORMATEAR ITEMS
        # -----------------------------
        items_formateados = []

        for idx, item in enumerate(items, start=1):

            if isinstance(item, dict):
                cantidad_raw = item.get('cantidad')

                cantidad = self._convertir_float(
                    cantidad_raw,
                    default=1.0
                )

                items_formateados.append({
                    'item': idx,
                    'codigo': (
                        item.get('codigo')
                        or item.get('codigo_producto')
                        or item.get('sku')
                        or ''
                    ),
                    'descripcion': (
                        item.get('producto')
                        or item.get('descripcion')
                        or item.get('nombre')
                        or ''
                    ),
                    'unidad': (
                        item.get('um')
                        or item.get('unidad')
                        or item.get('unidad_medida')
                        or 'NIU'
                    ),
                    'cantidad': cantidad,
                    'br': item.get('br') or ''
                })

            elif isinstance(item, (list, tuple)):
                cantidad_raw = (
                    item[2]
                    if len(item) > 2
                    else 1
                )

                items_formateados.append({
                    'item': idx,
                    'codigo': item[0] if len(item) > 0 else '',
                    'descripcion': item[1] if len(item) > 1 else '',
                    'unidad': (
                        item[3]
                        if len(item) > 3 and item[3]
                        else 'NIU'
                    ),
                    'cantidad': self._convertir_float(
                        cantidad_raw,
                        default=1.0
                    ),
                    'br': ''
                })

            else:
                print(
                    f"⚠️ Producto ignorado porque tiene formato inválido: "
                    f"{item!r}"
                )

        # -----------------------------
        # PESO TOTAL
        # -----------------------------
        peso_total = self._convertir_float(
            datos_guia.get('peso_total'),
            default=0.0
        )

        if peso_total <= 0 and items_formateados:
            peso_total = sum(
                item['cantidad'] * 0.5
                for item in items_formateados
            )

        modalidad = str(
            datos_guia.get('modalidad_transporte')
            or 'PRIVADO'
        ).upper()

        return {
            'logo_src': logo_src,

            'ruc_remitente': (
                datos_guia.get('ruc_remitente')
                or EMPRESA['ruc']
            ),

            'remitente_nombre': (
                datos_guia.get('remitente_nombre')
                or EMPRESA['nombre']
            ),

            'remitente_direccion': (
                datos_guia.get('remitente_direccion')
                or EMPRESA['direccion']
            ),

            'remitente_ubigeo': (
                datos_guia.get('remitente_ubigeo')
                or '150101'
            ),

            'telefono': (
                datos_guia.get('telefono')
                or EMPRESA['telefono']
            ),

            'email': (
                datos_guia.get('email')
                or EMPRESA['email']
            ),

            'ruc_destinatario': (
                datos_guia.get('ruc_destinatario')
                or datos_guia.get('ruc')
                or ''
            ),

            'destinatario_nombre': (
                datos_guia.get('destinatario_nombre')
                or datos_guia.get('cliente')
                or ''
            ),

            'destinatario_direccion': (
                datos_guia.get('destinatario_direccion')
                or datos_guia.get('destino')
                or ''
            ),

            'destinatario_ubigeo': (
                datos_guia.get('destinatario_ubigeo')
                or ''
            ),

            'serie': datos_guia.get('serie') or 'T001',
            'numero': datos_guia.get('numero') or '',

            'fecha_emision': self._formatear_fecha(
                datos_guia.get('fecha_emision')
            ),

            'fecha_traslado': self._formatear_fecha(
                datos_guia.get('fecha_traslado')
            ),

            'fecha_inicio_traslado': self._formatear_fecha(
                datos_guia.get('fecha_inicio_traslado')
                or datos_guia.get('fecha_traslado')
            ),

            'motivo_traslado': (
                datos_guia.get('motivo_traslado')
                or '01'
            ),

            'motivo_texto': self._get_motivo_texto(
                datos_guia.get('motivo_traslado') or '01'
            ),

            'modalidad_transporte': modalidad,

            'modalidad_texto': (
                'Transporte privado'
                if modalidad == 'PRIVADO'
                else 'Transporte público'
            ),

            'peso_bruto_total': peso_total,

            'numero_bultos': (
                datos_guia.get('numero_bultos')
                or 1
            ),

            'unidad_peso_texto': 'KGM',

            'transportista_nombre': (
                datos_guia.get('transportista_nombre')
                or '---'
            ),

            'conductor_nombre': (
                datos_guia.get('conductor_nombre')
                or '---'
            ),

            'conductor_dni': (
                datos_guia.get('conductor_dni')
                or '---'
            ),

            'placa_vehiculo': (
                datos_guia.get('placa_vehiculo')
                or '---'
            ),

            'licencia_conductor': (
                datos_guia.get('licencia_conductor')
                or '---'
            ),

            'nro_cotizacion': (
                datos_guia.get('documento_asociado')
                or datos_guia.get('cotizacion_numero')
                or ''
            ),

            'items': items_formateados,

            'observaciones': (
                datos_guia.get('observaciones')
                or ''
            ),

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
            '01': 'Venta', '02': 'Compra', '03': 'Traslado entre establecimientos',
            '04': 'Consignación', '05': 'Devolución', '06': 'Exportación',
            '07': 'Importación', '08': 'Donación', '09': 'Traslado por cuenta de terceros'
        }
        return motivos.get(codigo, codigo or 'Venta')

    def _generar_qr_guia(self, datos_guia):
        """Genera un código QR para la guía"""
        try:
            import qrcode
            from io import BytesIO
            
            qr_data = {
                'serie': datos_guia.get('serie', ''),
                'numero': datos_guia.get('numero', ''),
                'ruc_remitente': datos_guia.get('ruc_remitente', ''),
                'ruc_destinatario': datos_guia.get('ruc_destinatario', ''),
                'fecha_emision': self._formatear_fecha(datos_guia.get('fecha_emision')),
                'total_peso': str(datos_guia.get('peso_total', 0))
            }
            
            qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=4, border=2)
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
            'remitente_ubigeo', 'telefono', 'email',
            'ruc_destinatario', 'destinatario_nombre', 'destinatario_direccion',
            'destinatario_ubigeo', 'serie', 'numero',
            'fecha_emision', 'fecha_traslado', 'fecha_inicio_traslado',
            'motivo_traslado', 'motivo_texto', 'modalidad_texto',
            'numero_bultos', 'unidad_peso_texto', 'transportista_nombre',
            'conductor_nombre', 'conductor_dni', 'placa_vehiculo',
            'licencia_conductor', 'nro_cotizacion', 'observaciones'
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
        os.makedirs(os.path.dirname(template_path), exist_ok=True)
        template_basico = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Guía de Remisión</title>
            <style>
                @page { size: A4; margin: 1.2cm 1.5cm; }
                body { font-family: Arial, sans-serif; font-size: 9.5px; color: #1a1a1a; line-height: 1.8; }
                .header-superior { display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 10px; gap: 15px; }
                .empresa-izquierda { flex: 1; display: flex; align-items: center; gap: 12px; }
                .empresa-izquierda .logo-container { flex-shrink: 0; width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; }
                .empresa-izquierda .logo-container img { max-height: 60px; max-width: 100px; object-fit: contain; }
                .empresa-izquierda .info-texto { font-size: 8px; line-height: 1.4; }
                .empresa-izquierda .info-texto .nombre { font-size: 10px; font-weight: bold; text-transform: uppercase; }
                .recuadro-derecha { flex-shrink: 0; border: 2px solid #000; border-radius: 12px; padding: 10px 20px; text-align: center; min-width: 180px; }
                .recuadro-derecha .ruc { font-size: 10px; font-weight: bold; }
                .recuadro-derecha .titulo { font-size: 11px; font-weight: bold; letter-spacing: 1px; margin: 2px 0; }
                .recuadro-derecha .numero { font-size: 13px; font-weight: bold; }
                .seccion { margin-bottom: 8px; }
                .seccion-titulo { font-weight: bold; font-size: 9.5px; margin-bottom: 3px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; }
                .info-destinatario, .datos-traslado, .datos-ruta, .datos-transporte, .referencias, .observaciones {
                    border: 1px solid #ccc; border-radius: 8px; padding: 6px 12px; margin-bottom: 6px; background: #f9f9f9;
                }
                .fila { display: flex; padding: 1px 0; align-items: baseline; }
                .fila .label { font-weight: bold; min-width: 180px; flex-shrink: 0; }
                .fila .value { flex: 1; text-align: left; padding-left: 5px; }
                .products-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 8.5px; }
                .products-table th { background: #333; color: white; padding: 4px 5px; text-align: center; border: 1px solid #000; }
                .products-table td { padding: 3px 5px; border: 1px solid #ccc; text-align: center; }
                .products-table td.descripcion { text-align: left; }
                .qr-container { text-align: center; margin: 8px 0 5px 0; padding: 6px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
                .qr-container img { width: 90px; height: 90px; }
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
                    <thead><tr>
                        <th style="width:8%">ITEM</th>
                        <th style="width:12%">CODIGO</th>
                        <th style="width:30%">PRODUCTO</th>
                        <th style="width:10%">BR</th>
                        <th style="width:10%">U/M</th>
                        <th style="width:12%">CANTIDAD</th>
                    </tr></thead>
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
                </div>
            </div>
            
            <div class="observaciones">
                <div class="fila"><span class="label">OBSERVACIONES:</span><span class="value">{{ observaciones }}</span></div>
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

    def _generar_orden_compra(self, datos):
        """Genera PDF para orden de compra"""
        # Implementación simplificada
        print("Generando orden de compra...")
        return None

    def _generar_cotizacion(self, datos):
        """Genera PDF para cotización"""
        print("Generando cotización...")
        return None


# Instancia global
pdf_generator = PDFGenerator()