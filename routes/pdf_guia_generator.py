from weasyprint import HTML, CSS
from jinja2 import Template
import qrcode
import base64
from io import BytesIO
import json
from datetime import datetime, date
import re
import os

def convertir_a_serializable(obj):
    """Convierte objetos no serializables a tipos serializables"""
    if isinstance(obj, (date, datetime)):
        return obj.strftime('%Y-%m-%d')
    return obj

def obtener_logo_base64():
    """
    Obtiene el logo de la empresa en formato base64 para incrustar en el PDF
    """
    try:
        # Ruta del logo - ajusta según tu estructura
        logo_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'img', 'logo_kcf.png')
        
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                logo_data = f.read()
                return base64.b64encode(logo_data).decode('utf-8')
        else:
            # Logo por defecto en base64 (letras KCF)
            return None
    except Exception as e:
        print(f"Error cargando logo: {e}")
        return None

def generar_pdf_guia(guia_data):
    """
    Genera el PDF de la Guía de Remisión con código QR y logo de la empresa
    
    Args:
        guia_data: Diccionario con los datos de la guía
    
    Returns:
        BytesIO: Archivo PDF listo para descargar
    """
    
    # Convertir fechas a string si son objetos date
    if isinstance(guia_data.get('fecha_emision'), (date, datetime)):
        guia_data['fecha_emision'] = guia_data['fecha_emision'].strftime('%Y-%m-%d')
    
    if isinstance(guia_data.get('fecha_traslado'), (date, datetime)):
        guia_data['fecha_traslado'] = guia_data['fecha_traslado'].strftime('%Y-%m-%d')
    
    if isinstance(guia_data.get('fecha_inicio_traslado'), (date, datetime)):
        guia_data['fecha_inicio_traslado'] = guia_data['fecha_inicio_traslado'].strftime('%Y-%m-%d')
    
    # Generar código QR con los datos de la guía
    qr_data = generar_qr_data(guia_data)
    qr_base64 = generar_qr_base64(qr_data)
    
    # Obtener logo de la empresa
    logo_base64 = obtener_logo_base64()
    
    # Agregar QR y logo a los datos
    guia_data['qr_base64'] = qr_base64
    guia_data['logo_base64'] = logo_base64
    guia_data['fecha_emision_formato'] = formatear_fecha(guia_data.get('fecha_emision'))
    guia_data['fecha_traslado_formato'] = formatear_fecha(guia_data.get('fecha_traslado'))
    guia_data['fecha_inicio_formato'] = formatear_fecha(guia_data.get('fecha_inicio_traslado'))
    
    # Procesar items (si viene como string JSON)
    if isinstance(guia_data.get('items_json'), str):
        items = json.loads(guia_data['items_json'])
        guia_data['items'] = items
    else:
        guia_data['items'] = guia_data.get('items_json', [])
    
    # Procesar motivos de traslado - mantener el código y texto
    guia_data['motivo_codigo'] = guia_data.get('motivo_traslado', '')
    guia_data['motivo_texto'] = get_motivo_texto(guia_data.get('motivo_traslado', ''))
    
    # Asegurar que peso_bruto_total sea float
    if guia_data.get('peso_bruto_total'):
        guia_data['peso_bruto_total'] = float(guia_data['peso_bruto_total'])
    else:
        guia_data['peso_bruto_total'] = 0.0
    
    # Obtener unidad de peso
    guia_data['unidad_peso_texto'] = get_unidad_peso_texto(guia_data.get('unidad_peso_bruto', 'KGM'))
    
    # Obtener modalidad de transporte texto
    guia_data['modalidad_texto'] = 'Transporte privado' if guia_data.get('modalidad_transporte') == 'PRIVADO' else 'Transporte público'
    
    # Obtener el nombre de la empresa remitente
    guia_data['remitente_nombre'] = guia_data.get('remitente_nombre', 'KCF CORPORACION SAC')
    guia_data['remitente_direccion'] = guia_data.get('remitente_direccion', 'JR. LAS ALMENDRAS VERDES NRO. 284 URB. VIRGEN DEL ROSARIO LIMA - LIMA - SAN MARTIN DE PORRES')
    
    # Renderizar HTML
    html_content = renderizar_html_guia(guia_data)
    
    # CSS para el PDF con estilo mejorado y colores KCF
    css_content = """
    @page {
        size: A4;
        margin: 1.2cm 1.5cm;
    }
    
    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 9.5px;
        line-height: 1.5;
        color: #1a1a1a;
    }
    
    /* HEADER CON LOGO */
    .header-empresa {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #D32F2F;
        padding-bottom: 8px;
        margin-bottom: 10px;
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .header-left .logo {
        max-height: 50px;
        max-width: 120px;
    }
    
    .header-left .logo img {
        height: auto;
        max-height: 50px;
        max-width: 120px;
    }
    
    .header-info {
        flex: 1;
        text-align: right;
    }
    
    .header-info .nombre-empresa {
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #D32F2F;
    }
    
    .header-info .direccion-empresa {
        font-size: 8px;
        color: #555;
        margin-top: 2px;
    }
    
    .header-info .contacto-empresa {
        font-size: 8px;
        color: #555;
    }
    
    .ruc-header {
        text-align: center;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 2px;
        color: #D32F2F;
    }
    
    .titulo-guia {
        text-align: center;
        font-size: 14px;
        font-weight: bold;
        margin: 6px 0 2px 0;
        letter-spacing: 1px;
        color: #D32F2F;
    }
    
    .numero-guia {
        text-align: center;
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #1a1a1a;
    }
    
    .seccion {
        margin-bottom: 8px;
    }
    
    .seccion-titulo {
        font-weight: bold;
        font-size: 9.5px;
        margin-bottom: 3px;
        text-transform: uppercase;
        color: #D32F2F;
        border-bottom: 1px solid #D32F2F;
        padding-bottom: 2px;
    }
    
    /* RECUADRO DESTINATARIO */
    .info-destinatario {
        border: 1px solid #ccc;
        padding: 6px 10px;
        margin-bottom: 6px;
        background: #f9f9f9;
    }
    
    .info-destinatario .info-line {
        padding: 1px 0;
        font-size: 9px;
    }
    
    .info-destinatario .label {
        font-weight: bold;
        display: inline-block;
        min-width: 110px;
    }
    
    .info-destinatario .value {
        display: inline-block;
    }
    
    /* RECUADRO DATOS DEL TRASLADO */
    .datos-traslado {
        border: 1px solid #ccc;
        padding: 6px 10px;
        margin-bottom: 6px;
        background: #f9f9f9;
    }
    
    .datos-traslado .fila {
        display: flex;
        flex-wrap: wrap;
        padding: 1px 0;
    }
    
    .datos-traslado .campo {
        flex: 1;
        min-width: 140px;
        padding: 1px 5px 1px 0;
        font-size: 9px;
    }
    
    .datos-traslado .label {
        font-weight: bold;
    }
    
    /* RECUADRO DATOS DE RUTA */
    .datos-ruta {
        border: 1px solid #ccc;
        padding: 6px 10px;
        margin-bottom: 6px;
        background: #f9f9f9;
    }
    
    .datos-ruta .info-line {
        padding: 1px 0;
        font-size: 9px;
    }
    
    .datos-ruta .label {
        font-weight: bold;
        display: inline-block;
        min-width: 110px;
    }
    
    .datos-ruta .value {
        display: inline-block;
    }
    
    /* RECUADRO DEL TRANSPORTE */
    .datos-transporte {
        border: 2px solid #333;
        padding: 8px 12px;
        margin-bottom: 6px;
        background: #f5f5f5;
    }
    
    .datos-transporte .info-line {
        padding: 2px 0;
        font-size: 9px;
    }
    
    .datos-transporte .label {
        font-weight: bold;
        display: inline-block;
        min-width: 110px;
    }
    
    .datos-transporte .value {
        display: inline-block;
    }
    
    /* TABLA DE PRODUCTOS */
    .products-table {
        width: 100%;
        border-collapse: collapse;
        margin: 4px 0;
        font-size: 8.5px;
    }
    
    .products-table th {
        background: #D32F2F;
        color: white;
        padding: 4px 5px;
        text-align: center;
        border: 1px solid #B71C1C;
        font-size: 8px;
        text-transform: uppercase;
    }
    
    .products-table td {
        padding: 3px 5px;
        border: 1px solid #ccc;
        text-align: center;
        font-size: 8.5px;
    }
    
    .products-table td.descripcion {
        text-align: left;
    }
    
    .products-table td.series {
        text-align: left;
        font-size: 7.5px;
        color: #444;
    }
    
    /* OBSERVACIONES */
    .observaciones {
        margin-top: 8px;
        padding: 5px 10px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        font-size: 8.5px;
    }
    
    .observaciones .label {
        font-weight: bold;
    }
    
    /* CÓDIGO QR */
    .qr-container {
        text-align: center;
        margin: 8px 0 5px 0;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        background: #fafafa;
    }
    
    .qr-container img {
        width: 90px;
        height: 90px;
    }
    
    .qr-container .qr-text {
        font-size: 7.5px;
        color: #444;
        margin-top: 3px;
    }
    
    /* FOOTER */
    .footer {
        margin-top: 12px;
        text-align: center;
        font-size: 7.5px;
        color: #555;
        border-top: 1px solid #ddd;
        padding-top: 6px;
    }
    
    .footer .autorizacion {
        font-size: 7.5px;
        color: #444;
    }
    
    .footer .powered {
        font-size: 7px;
        color: #777;
        margin-top: 2px;
    }
    """
    
    # Generar PDF
    pdf_file = BytesIO()
    HTML(string=html_content).write_pdf(pdf_file, stylesheets=[CSS(string=css_content)])
    pdf_file.seek(0)
    
    return pdf_file

def generar_qr_data(guia_data):
    """Genera los datos que irán en el código QR según formato SUNAT"""
    qr_info = {
        "serie": guia_data.get('serie', ''),
        "numero": guia_data.get('numero', ''),
        "ruc_remitente": guia_data.get('ruc_remitente', ''),
        "ruc_destinatario": guia_data.get('ruc_destinatario', ''),
        "fecha_emision": convertir_a_serializable(guia_data.get('fecha_emision', '')),
        "total_peso": str(guia_data.get('peso_bruto_total', '0')),
        "placa_vehiculo": guia_data.get('placa_vehiculo', '')
    }
    return json.dumps(qr_info)

def generar_qr_base64(data):
    """Genera código QR y lo convierte a base64 para incrustar en HTML"""
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=4,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_base64}"

def formatear_fecha(fecha_str):
    """Formatea fecha para mostrar en formato DD/MM/YYYY"""
    if not fecha_str:
        return ""
    try:
        if isinstance(fecha_str, str):
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d')
        else:
            fecha = fecha_str
        return fecha.strftime('%d/%m/%Y')
    except:
        return str(fecha_str)

def get_motivo_texto(codigo):
    """Obtiene el texto descriptivo del motivo de traslado"""
    motivos = {
        '01': 'Venta',
        '02': 'Compra',
        '03': 'Traslado entre establecimientos',
        '04': 'Consignación',
        '05': 'Devolución',
        '06': 'Exportación',
        '07': 'Importación',
        '08': 'Donación',
        '09': 'Traslado por cuenta de terceros',
        '10': 'Traslado para transformación',
        '11': 'Traslado por reparación',
        '12': 'Traslado por garantía',
        '13': 'Traslado por consignación para venta',
        '14': 'Traslado por consignación para transformación',
        '15': 'Traslado por consignación para reparación',
        '16': 'Traslado por devolución de consignación',
        '17': 'Traslado por permuta',
        '18': 'Traslado por comodato',
        '19': 'Traslado por arrendamiento',
        '20': 'Traslado por anticipo de venta',
        '21': 'Traslado por anticipo de compra',
        '22': 'Traslado por maquila',
        '23': 'Traslado por consignación para maquila',
        '24': 'Traslado por devolución de maquila',
        '25': 'Traslado por consignación para venta a plazo',
        '26': 'Traslado por consignación para venta al contado',
        '27': 'Traslado por consignación para venta con anticipo',
        '28': 'Traslado por consignación para venta con reserva de dominio'
    }
    return motivos.get(codigo, codigo or '')

def get_unidad_peso_texto(codigo):
    """Obtiene el texto de la unidad de peso"""
    unidades = {
        'ESCUBA': 'ESCUBA',
        'KGM': 'KGM',
        'TNE': 'TNE',
        'LBR': 'LBR',
        'GRM': 'GRM',
        'ONZ': 'ONZ',
        'CEN': 'CEN',
        'UM': 'UM',
        'ZZ': 'ZZ',
        'NU': 'NU'
    }
    return unidades.get(codigo, 'KGM')

def renderizar_html_guia(guia_data):
    """Renderiza el HTML para el PDF con logo de la empresa"""
    
    template = Template('''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Guía de Remisión {{ serie }}-{{ numero }}</title>
    </head>
    <body>
        <!-- HEADER EMPRESA CON LOGO -->
        <div class="header-empresa">
            <div class="header-left">
                {% if logo_base64 %}
                <div class="logo">
                    <img src="data:image/png;base64,{{ logo_base64 }}" alt="KCF Logo">
                </div>
                {% else %}
                <div style="font-size:14px; font-weight:bold; color:#D32F2F;">KCF</div>
                {% endif %}
                <div style="border-left:2px solid #D32F2F; padding-left:10px;">
                    <div style="font-size:10px; font-weight:bold; color:#D32F2F;">{{ remitente_nombre or 'KCF CORPORACION SAC' }}</div>
                    <div style="font-size:7.5px; color:#555;">RUC: {{ ruc_remitente or '20602095704' }}</div>
                </div>
            </div>
            <div class="header-info">
                <div class="nombre-empresa">{{ remitente_nombre or 'KCF CORPORACION SAC' }}</div>
                <div class="direccion-empresa">{{ remitente_direccion or '' }}</div>
                <div class="contacto-empresa">Tel: {{ telefono or '987-654-321' }} | Email: {{ email or 'ventas@kcf.pe' }} | Web: {{ web or 'www.kcf.pe' }}</div>
            </div>
        </div>
        
        <!-- RUC Y TÍTULO -->
        <div class="ruc-header">R.U.C. Nº {{ ruc_remitente or '' }}</div>
        <div class="titulo-guia">GUIA DE REMISION REMITENTE ELECTRONICA</div>
        <div class="numero-guia">{{ serie }}-{{ numero }}</div>
        
        <!-- DESTINATARIO -->
        <div class="seccion">
            <div class="seccion-titulo">DESTINATARIO</div>
            <div class="info-destinatario">
                <div class="info-line">
                    <span class="label">R.U.C.:</span>
                    <span class="value">{{ ruc_destinatario or '' }}</span>
                </div>
                <div class="info-line">
                    <span class="label">DENOMINACIÓN:</span>
                    <span class="value">{{ destinatario_nombre or '' }}</span>
                </div>
                <div class="info-line">
                    <span class="label">DIRECCIÓN:</span>
                    <span class="value">{{ destinatario_direccion or '' }}</span>
                </div>
            </div>
        </div>
        
        <!-- DATOS DEL TRASLADO -->
        <div class="seccion">
            <div class="seccion-titulo">DATOS DEL TRASLADO</div>
            <div class="datos-traslado">
                <div class="fila">
                    <div class="campo">
                        <span class="label">FECHA EMISIÓN:</span>
                        {{ fecha_emision_formato }}
                    </div>
                    <div class="campo">
                        <span class="label">FECHA INICIO DE TRASLADO:</span>
                        {{ fecha_inicio_formato }}
                    </div>
                </div>
                <div class="fila">
                    <div class="campo">
                        <span class="label">MOTIVO DE TRASLADO:</span>
                        {{ motivo_texto }}
                    </div>
                    <div class="campo">
                        <span class="label">MODALIDAD DE TRANSPORTE:</span>
                        {{ modalidad_texto }}
                    </div>
                </div>
                <div class="fila">
                    <div class="campo">
                        <span class="label">PESO BRUTO TOTAL ({{ unidad_peso_texto }}):</span>
                        {{ '%.1f'|format(peso_bruto_total|float) if peso_bruto_total else '0.0' }}
                    </div>
                    <div class="campo">
                        <span class="label">NÚMERO DE BULTOS:</span>
                        {{ numero_bultos or '1' }}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- DATOS DE RUTA -->
        <div class="seccion">
            <div class="seccion-titulo">DATOS DE RUTA</div>
            <div class="datos-ruta">
                <div class="info-line">
                    <span class="label">PUNTO DE PARTIDA:</span>
                    <span class="value">({{ remitente_ubigeo or '' }}) {{ remitente_direccion or '' }}, Perú</span>
                </div>
                <div class="info-line">
                    <span class="label">PUNTO DE LLEGADA:</span>
                    <span class="value">({{ destinatario_ubigeo or '' }}) {{ destinatario_direccion or '' }}, Perú</span>
                </div>
            </div>
        </div>
        
        <!-- DATOS DEL TRANSPORTE -->
        <div class="seccion">
            <div class="seccion-titulo">DATOS DEL TRANSPORTE</div>
            <div class="datos-transporte">
                <div class="info-line">
                    <span class="label">TRANSPORTISTA:</span>
                    <span class="value">{% if transportista_nombre %}{{ transportista_nombre }}{% else %}---{% endif %}</span>
                </div>
                <div class="info-line">
                    <span class="label">VEHICULO:</span>
                    <span class="value">{{ placa_vehiculo or '' }}</span>
                </div>
                <div class="info-line">
                    <span class="label">CONDUCTOR:</span>
                    <span class="value">D.N.I. {{ conductor_dni or '' }} - {{ conductor_nombre or '' }}</span>
                </div>
            </div>
        </div>
        
        <!-- PRODUCTOS -->
        <div class="seccion">
            <div class="seccion-titulo">PRODUCTOS</div>
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width:8%">Nro</th>
                        <th style="width:15%">CÓD.</th>
                        <th style="width:32%">DESCRIPCIÓN</th>
                        <th style="width:10%">U/M</th>
                        <th style="width:10%">CANTIDAD</th>
                        <th style="width:25%">SERIES</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in items %}
                    <tr>
                        <td>{{ loop.index }}</td>
                        <td>{{ item.codigo or '-' }}</td>
                        <td class="descripcion">{{ item.descripcion }}</td>
                        <td>{{ item.unidad or 'NIU' }}</td>
                        <td>{{ '%.1f'|format(item.cantidad|float) if item.cantidad else '0.0' }}</td>
                        <td class="series">{{ item.series or '' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <!-- OBSERVACIONES -->
        <div class="observaciones">
            <span class="label">OBSERVACIONES :</span>
            {% if orden_compra_cliente %}
            Orden de Compra {{ destinatario_nombre or 'Cliente' }} : {{ orden_compra_cliente }}
            {% endif %}
            {% if observaciones %}
            {% if orden_compra_cliente %} {% endif %}
            {{ observaciones }}
            {% endif %}
        </div>
        
        <!-- QR Y FOOTER -->
        <div class="qr-container">
            <img src="{{ qr_base64 }}" alt="Código QR">
            <div class="qr-text">Representación impresa de la GUIA DE REMISIÓN REMITENTE ELECTRÓNICA, consulte el documento en https://see.conflux.pe</div>
            <div class="qr-text" style="font-size:7px; margin-top:1px;">Autorizado mediante resolución N° 214-005-0001193/SUNAT</div>
        </div>
        
        <div class="footer">
            <div class="powered">Pag. 1 de 1</div>
            <div class="powered">Powered by KCF CORPORACION</div>
        </div>
    </body>
    </html>
    ''')
    
    return template.render(**guia_data)