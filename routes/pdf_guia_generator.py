
from weasyprint import HTML, CSS
from jinja2 import Template
import qrcode
import base64
from io import BytesIO
import json
from datetime import datetime, date
import re

def convertir_a_serializable(obj):
    """Convierte objetos no serializables a tipos serializables"""
    if isinstance(obj, (date, datetime)):
        return obj.strftime('%Y-%m-%d')
    return obj

def generar_pdf_guia(guia_data):
    """
    Genera el PDF de la Guía de Remisión con código QR
    
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
    
    # Agregar QR a los datos
    guia_data['qr_base64'] = qr_base64
    guia_data['fecha_emision_formato'] = formatear_fecha(guia_data.get('fecha_emision'))
    guia_data['fecha_traslado_formato'] = formatear_fecha(guia_data.get('fecha_traslado'))
    guia_data['fecha_inicio_formato'] = formatear_fecha(guia_data.get('fecha_inicio_traslado'))
    
    # Procesar items (si viene como string JSON)
    if isinstance(guia_data.get('items_json'), str):
        items = json.loads(guia_data['items_json'])
        guia_data['items'] = items
    else:
        guia_data['items'] = guia_data.get('items_json', [])
    
    # Procesar motivos de traslado
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
    
    # Renderizar HTML
    html_content = renderizar_html_guia(guia_data)
    
    # CSS para el PDF - Estilo tipo SUNAT
    css_content = """
    @page {
        size: A4;
        margin: 1.2cm 1.5cm;
    }
    
    body {
        font-family: 'Helvetica', Arial, sans-serif;
        font-size: 10px;
        line-height: 1.5;
        color: #1a1a1a;
    }
    
    .header-empresa {
        text-align: center;
        border-bottom: 2px solid #1a1a1a;
        padding-bottom: 8px;
        margin-bottom: 12px;
    }
    
    .header-empresa .nombre-empresa {
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .header-empresa .direccion-empresa {
        font-size: 9px;
        color: #444;
    }
    
    .header-empresa .contacto-empresa {
        font-size: 9px;
        color: #444;
    }
    
    .titulo-guia {
        text-align: center;
        font-size: 14px;
        font-weight: bold;
        margin: 10px 0;
        letter-spacing: 1px;
    }
    
    .numero-guia {
        text-align: center;
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 15px;
    }
    
    .seccion {
        margin-bottom: 10px;
    }
    
    .seccion-titulo {
        font-weight: bold;
        font-size: 10px;
        margin-bottom: 4px;
        text-transform: uppercase;
        color: #1a1a1a;
    }
    
    .info-line {
        padding: 2px 0;
        font-size: 9.5px;
    }
    
    .info-line .label {
        font-weight: bold;
        display: inline-block;
        min-width: 120px;
    }
    
    .info-line .value {
        display: inline-block;
    }
    
    .info-destinatario {
        border: 1px solid #ccc;
        padding: 8px 10px;
        margin-bottom: 8px;
        background: #f9f9f9;
    }
    
    .info-destinatario .label {
        font-weight: bold;
    }
    
    .datos-traslado {
        border: 1px solid #ccc;
        padding: 8px 10px;
        margin-bottom: 8px;
        background: #f9f9f9;
    }
    
    .datos-traslado .row {
        display: flex;
        flex-wrap: wrap;
    }
    
    .datos-traslado .col {
        flex: 1;
        min-width: 120px;
        padding: 2px 5px 2px 0;
    }
    
    .datos-ruta {
        border: 1px solid #ccc;
        padding: 8px 10px;
        margin-bottom: 8px;
        background: #f9f9f9;
    }
    
    .datos-transporte {
        border: 1px solid #ccc;
        padding: 8px 10px;
        margin-bottom: 8px;
        background: #f9f9f9;
    }
    
    .products-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
        font-size: 9px;
    }
    
    .products-table th {
        background: #1a1a2e;
        color: white;
        padding: 5px 6px;
        text-align: center;
        border: 1px solid #333;
        font-size: 8.5px;
        text-transform: uppercase;
    }
    
    .products-table td {
        padding: 4px 6px;
        border: 1px solid #ccc;
        text-align: center;
        font-size: 9px;
    }
    
    .products-table td.descripcion {
        text-align: left;
    }
    
    .products-table td.series {
        text-align: left;
        font-size: 8px;
        color: #555;
    }
    
    .observaciones {
        margin-top: 10px;
        padding: 6px 10px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        font-size: 9px;
    }
    
    .observaciones .label {
        font-weight: bold;
    }
    
    .qr-container {
        text-align: center;
        margin: 10px 0;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #fafafa;
    }
    
    .qr-container img {
        width: 100px;
        height: 100px;
    }
    
    .qr-container .qr-text {
        font-size: 8px;
        color: #666;
        margin-top: 4px;
    }
    
    .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 8px;
        color: #666;
        border-top: 1px solid #ddd;
        padding-top: 8px;
    }
    
    .footer .autorizacion {
        font-size: 8px;
        color: #444;
    }
    
    .footer .powered {
        font-size: 7px;
        color: #999;
        margin-top: 3px;
    }
    
    .badge-estado {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 10px;
        font-size: 9px;
        font-weight: bold;
        margin-top: 5px;
    }
    
    .estado-ACEPTADA { background: #d1fae5; color: #065f46; }
    .estado-BORRADOR { background: #fef3c7; color: #92400e; }
    .estado-PROCESANDO { background: #dbeafe; color: #1e40af; }
    .estado-RECHAZADA { background: #fee2e2; color: #991b1b; }
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
    
    # Convertir a base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_base64}"

def formatear_fecha(fecha_str):
    """Formatea fecha para mostrar en formato DD/MM/YYYY"""
    if not fecha_str:
        return ""
    try:
        # Si es string, intentar parsear
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
    """Renderiza el HTML para el PDF con formato tipo SUNAT"""
    
    template = Template('''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Guía de Remisión {{ serie }}-{{ numero }}</title>
    </head>
    <body>
        <!-- HEADER EMPRESA -->
        <div class="header-empresa">
            <div class="nombre-empresa">{{ remitente_nombre or 'KCF CORPORACION' }}</div>
            <div class="direccion-empresa">{{ remitente_direccion or '' }}</div>
            <div class="contacto-empresa">Tel: {{ telefono or '' }} Email: {{ email or '' }}</div>
        </div>
        
        <!-- TÍTULO Y NÚMERO -->
        <div class="titulo-guia">GUIA DE REMISION REMITENTE ELECTRONICA</div>
        <div class="numero-guia">{{ serie }}-{{ numero }}</div>
        
        <!-- DESTINATARIO -->
        <div class="seccion">
            <div class="seccion-titulo">DESTINATARIO</div>
            <div class="info-destinatario">
                <div class="info-line">
                    <span class="label">R.U.C.:</span>
                    <span class="value">{{ ruc_destinatario }}</span>
                </div>
                <div class="info-line">
                    <span class="label">DENOMINACIÓN:</span>
                    <span class="value">{{ destinatario_nombre }}</span>
                </div>
            </div>
        </div>
        
        <!-- DATOS DEL TRASLADO -->
        <div class="seccion">
            <div class="seccion-titulo">DATOS DEL TRASLADO</div>
            <div class="datos-traslado">
                <div class="row">
                    <div class="col">
                        <span class="label">FECHA EMISIÓN :</span>
                        {{ fecha_emision_formato }}
                    </div>
                    <div class="col">
                        <span class="label">FECHA INICIO DE TRASLADO :</span>
                        {{ fecha_inicio_formato }}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">MOTIVO DE TRASLADO :</span>
                        {{ motivo_texto }}
                    </div>
                    <div class="col">
                        <span class="label">MODALIDAD DE TRANSPORTE :</span>
                        {{ modalidad_texto }}
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <span class="label">PESO BRUTO TOTAL ({{ unidad_peso_texto }}) :</span>
                        {{ '%.1f'|format(peso_bruto_total|float) if peso_bruto_total else '0.0' }}
                    </div>
                    <div class="col">
                        <span class="label">NÚMERO DE BULTOS :</span>
                        {{ numero_bultos or '1' }}
                    </div>
                </div>
                {% if documento_asociado %}
                <div class="row">
                    <div class="col">
                        <span class="label">DOCUMENTO ASOCIADO :</span>
                        {{ documento_asociado }}
                    </div>
                    <div class="col"></div>
                </div>
                {% endif %}
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
                    <span class="value">{% if transportista_nombre %}{{ transportista_nombre }} (RUC: {{ transportista_ruc }}){% else %}---{% endif %}</span>
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
        {% if observaciones or orden_compra_cliente %}
        <div class="observaciones">
            <span class="label">OBSERVACIONES :</span>
            {% if orden_compra_cliente %}
            Orden de Compra {{ destinatario_nombre or 'Cliente' }} : {{ orden_compra_cliente }}
            {% endif %}
            {% if observaciones %}
            {% if orden_compra_cliente %} - {% endif %}
            {{ observaciones }}
            {% endif %}
        </div>
        {% endif %}
        
        <!-- QR Y FOOTER -->
        <div class="qr-container">
            <img src="{{ qr_base64 }}" alt="Código QR">
            <div class="qr-text">Representación impresa de la GUIA DE REMISIÓN REMITENTE ELECTRÓNICA, consulte el documento en https://see.conflux.pe</div>
            <div class="qr-text" style="font-size:7px; margin-top:2px;">Autorizado mediante resolución N° 214-005-0001193/SUNAT</div>
        </div>
        
        <div class="footer">
            <div class="autorizacion">Representación impresa de la GUIA DE REMISIÓN REMITENTE ELECTRÓNICA</div>
            <div class="autorizacion">Autorizado mediante resolución N° 214-005-0001193/SUNAT</div>
            <div class="powered">Pag. 1 de 1</div>
            <div class="powered">Powered by Conflux</div>
        </div>
    </body>
    </html>
    ''')
    
    return template.render(**guia_data)