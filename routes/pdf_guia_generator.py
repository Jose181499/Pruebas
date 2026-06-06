# pdf_guia_generator.py
from weasyprint import HTML, CSS
from jinja2 import Template
import qrcode
import base64
from io import BytesIO
import json
from datetime import datetime

def generar_pdf_guia(guia_data):
    """
    Genera el PDF de la Guía de Remisión con código QR
    
    Args:
        guia_data: Diccionario con los datos de la guía
    
    Returns:
        BytesIO: Archivo PDF listo para descargar
    """
    
    # Generar código QR con los datos de la guía
    qr_data = generar_qr_data(guia_data)
    qr_base64 = generar_qr_base64(qr_data)
    
    # Agregar QR a los datos
    guia_data['qr_base64'] = qr_base64
    guia_data['fecha_emision_formato'] = formatear_fecha(guia_data.get('fecha_emision'))
    guia_data['fecha_traslado_formato'] = formatear_fecha(guia_data.get('fecha_traslado'))
    
    # Procesar items (si viene como string JSON)
    if isinstance(guia_data.get('items_json'), str):
        guia_data['items'] = json.loads(guia_data['items_json'])
    else:
        guia_data['items'] = guia_data.get('items_json', [])
    
    # Renderizar HTML
    html_content = renderizar_html_guia(guia_data)
    
    # CSS para el PDF
    css_content = """
    @page {
        size: A4;
        margin: 1.5cm;
    }
    
    body {
        font-family: 'Helvetica', Arial, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #333;
    }
    
    .header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
    }
    
    .header h1 {
        font-size: 18px;
        margin: 0;
        color: #1a1a2e;
    }
    
    .header p {
        margin: 5px 0 0;
        font-size: 10px;
        color: #666;
    }
    
    .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-bottom: 20px;
    }
    
    .info-box {
        border: 1px solid #ddd;
        padding: 10px;
        border-radius: 5px;
        background: #f9f9f9;
    }
    
    .info-box h3 {
        font-size: 12px;
        margin: 0 0 8px 0;
        padding-bottom: 5px;
        border-bottom: 1px solid #ddd;
        color: #2563eb;
    }
    
    .info-row {
        margin-bottom: 6px;
    }
    
    .info-label {
        font-weight: bold;
        font-size: 10px;
        color: #666;
    }
    
    .info-value {
        font-size: 11px;
        margin-top: 2px;
    }
    
    .qr-container {
        text-align: center;
        margin: 20px 0;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
    }
    
    .qr-container img {
        width: 120px;
        height: 120px;
    }
    
    .products-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }
    
    .products-table th {
        background: #1e293b;
        color: white;
        padding: 8px;
        font-size: 10px;
        text-align: center;
        border: 1px solid #333;
    }
    
    .products-table td {
        padding: 6px;
        border: 1px solid #ddd;
        text-align: center;
        font-size: 10px;
    }
    
    .summary {
        margin-top: 15px;
        text-align: right;
    }
    
    .summary-row {
        padding: 5px;
        margin-bottom: 3px;
    }
    
    .summary-row.total {
        font-size: 14px;
        font-weight: bold;
        border-top: 2px solid #333;
        padding-top: 8px;
    }
    
    .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 9px;
        color: #999;
        border-top: 1px solid #ddd;
        padding-top: 10px;
    }
    
    .observaciones {
        margin-top: 20px;
        padding: 10px;
        background: #f0fdf4;
        border-left: 3px solid #10b981;
        font-size: 10px;
    }
    
    .badge-estado {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
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
        "fecha_emision": guia_data.get('fecha_emision', ''),
        "total_peso": str(guia_data.get('peso_total', '0')),
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
    """Formatea fecha para mostrar"""
    if not fecha_str:
        return "No especificada"
    try:
        fecha = datetime.strptime(str(fecha_str), '%Y-%m-%d')
        return fecha.strftime('%d/%m/%Y')
    except:
        return str(fecha_str)

def renderizar_html_guia(guia_data):
    """Renderiza el HTML para el PDF"""
    
    template = Template('''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Guía de Remisión {{ serie }}-{{ numero }}</title>
    </head>
    <body>
        <div class="header">
            <h1>GUÍA DE REMISIÓN - REMITENTE</h1>
            <p>Documento Electrónico - SUNAT</p>
            <p>N° {{ serie }}-{{ numero }}</p>
        </div>
        
        <div class="qr-container">
            <img src="{{ qr_base64 }}" alt="Código QR">
            <p style="font-size: 9px; margin-top: 5px;">Código de verificación electrónica</p>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h3>📦 REMITENTE (Origen)</h3>
                <div class="info-row">
                    <div class="info-label">RUC:</div>
                    <div class="info-value">{{ ruc_remitente }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Razón Social:</div>
                    <div class="info-value">{{ remitente_nombre }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Dirección de Partida:</div>
                    <div class="info-value">{{ remitente_direccion or 'No especificada' }}</div>
                </div>
            </div>
            
            <div class="info-box">
                <h3>🎯 DESTINATARIO (Llegada)</h3>
                <div class="info-row">
                    <div class="info-label">RUC:</div>
                    <div class="info-value">{{ ruc_destinatario }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Razón Social:</div>
                    <div class="info-value">{{ destinatario_nombre }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Dirección de Llegada:</div>
                    <div class="info-value">{{ destinatario_direccion or 'No especificada' }}</div>
                </div>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h3>🚛 DATOS DEL TRASLADO</h3>
                <div class="info-row">
                    <div class="info-label">Motivo:</div>
                    <div class="info-value">{{ motivo_traslado }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Fecha Emisión:</div>
                    <div class="info-value">{{ fecha_emision_formato }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Fecha Traslado:</div>
                    <div class="info-value">{{ fecha_traslado_formato }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Documento Asociado:</div>
                    <div class="info-value">{{ documento_asociado or 'No especificado' }}</div>
                </div>
            </div>
            
            <div class="info-box">
                <h3>🚚 VEHÍCULO</h3>
                <div class="info-row">
                    <div class="info-label">Modalidad:</div>
                    <div class="info-value">{{ modalidad_transporte }}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Placa:</div>
                    <div class="info-value"><strong>{{ placa_vehiculo }}</strong></div>
                </div>
                <div class="info-row">
                    <div class="info-label">Conductor:</div>
                    <div class="info-value">{{ conductor_nombre or 'No especificado' }} (DNI: {{ conductor_dni or '-' }})</div>
                </div>
                {% if transportista_ruc %}
                <div class="info-row">
                    <div class="info-label">Transportista:</div>
                    <div class="info-value">{{ transportista_nombre }} (RUC: {{ transportista_ruc }})</div>
                </div>
                {% endif %}
            </div>
        </div>
        
        <h3 style="margin: 15px 0 10px 0;">📋 PRODUCTOS A TRASLADAR</h3>
        <table class="products-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th>Cantidad</th>
                    <th>Peso Unit. (kg)</th>
                    <th>Peso Total (kg)</th>
                </tr>
            </thead>
            <tbody>
                {% for item in items %}
                <tr>
                    <td>{{ loop.index }}</td>
                    <td>{{ item.codigo or '-' }}</td>
                    <td style="text-align: left;">{{ item.descripcion }}</td>
                    <td>{{ item.unidad or 'NIU' }}</td>
                    <td>{{ item.cantidad }}</td>
                    <td>{{ '%.2f'|format(item.peso_unitario|float) if item.peso_unitario else '0.00' }}</td>
                    <td>{{ '%.2f'|format((item.cantidad|float * (item.peso_unitario|float))) if item.peso_unitario else '0.00' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        
        <div class="summary">
            <div class="summary-row">
                <strong>Total Productos:</strong> {{ items|length }}
            </div>
            <div class="summary-row total">
                <strong>Peso Total:</strong> {{ '%.2f'|format(peso_total|float) }} kg
            </div>
        </div>
        
        {% if observaciones %}
        <div class="observaciones">
            <strong>📝 Observaciones:</strong><br>
            {{ observaciones }}
        </div>
        {% endif %}
        
        <div class="footer">
            <p>Documento emitido electrónicamente por KCF CORPORACION - Sistema ERP</p>
            <p>Fecha de emisión: {{ fecha_emision_formato }} - Validez según SUNAT</p>
            <div class="badge-estado estado-{{ estado_sunat }}">
                Estado: {{ estado_sunat }}
            </div>
        </div>
    </body>
    </html>
    ''')
    
    return template.render(**guia_data)