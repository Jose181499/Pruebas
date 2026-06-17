"""
Generador de rótulos de embalaje (formato AGD GROUP)
DATOS FIJOS: Solo KCF CORPORACION (remitente)
RESTO: Se toma de la cotización/guía
"""
import json
from datetime import datetime
import io
import os

try:
    from reportlab.lib.pagesizes import A5, landscape
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.colors import black, grey, white
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generar_codigo_barras(texto):
    """Genera un código de barras simulado"""
    texto_limpio = ''.join(c for c in texto if c.isalnum()).upper()
    if not texto_limpio:
        return "||| || |||| ||| |||| |||"
    
    resultado = ""
    for i, char in enumerate(texto_limpio[:10]):
        ascii_val = ord(char)
        patron = bin(ascii_val % 30)[2:].zfill(5)
        patron = patron.replace('0', ' ').replace('1', '|')
        resultado += patron + ' '
    return resultado[:35]


def generar_rotulo_pdf(guia):
    """
    Genera PDF del rótulo de embalaje (formato AGD GROUP)
    
    DATOS FIJOS DE KCF CORPORACION:
    - remitente_nombre: KCF CORPORACION S.A.C
    - remitente_direccion: AV. PRINCIPAL 123 - LIMA - PERÚ
    
    RESTO DE DATOS: Se toman de la guía (destinatario, conductor, productos, etc.)
    
    Args:
        guia (dict): Datos de la guía de remisión
    
    Returns:
        bytes: Datos del PDF generado
    """
    if not REPORTLAB_AVAILABLE:
        raise Exception("ReportLab no está instalado. Ejecuta: pip install reportlab")
    
    buffer = io.BytesIO()
    page_width = 90 * mm
    page_height = 150 * mm
    
    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))
    
    # Configurar fuente
    font_name = 'Helvetica'
    try:
        font_path = '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf'
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont('Mono', font_path))
            font_name = 'Mono'
    except:
        pass
    
    # ==========================================
    # DATOS FIJOS DE KCF CORPORACION (EMPRESA)
    # ==========================================
    REMITENTE_FIJO = 'KCF CORPORACION S.A.C'
    DIRECCION_REMITENTE_FIJA = 'AV. PRINCIPAL 123 - LIMA - PERÚ'
    
    # ==========================================
    # DATOS QUE VIENEN DE LA COTIZACIÓN/GUÍA
    # ==========================================
    items = []
    if guia.get('items_json'):
        try:
            items = json.loads(guia['items_json'])
        except:
            items = []
    
    # Destinatario (viene de la guía)
    destinatario = guia.get('destinatario_nombre', '')
    ubicacion_destino = guia.get('destinatario_direccion', '')
    
    # Conductor (viene de la guía)
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    
    # Código de ruta (viene de la guía)
    codigo_ruta = guia.get('codigo_ruta', '')
    
    # Número de guía
    numero_guia = f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}"
    
    # Fecha
    fecha = guia.get('fecha_emision', '')
    if fecha:
        try:
            fecha_dt = datetime.strptime(str(fecha), '%Y-%m-%d')
            fecha = fecha_dt.strftime('%d/%m/%Y')
        except:
            fecha = datetime.now().strftime('%d/%m/%Y')
    else:
        fecha = datetime.now().strftime('%d/%m/%Y')
    
    # Calcular bultos
    total_items = sum(item.get('cantidad', 0) for item in items)
    bultos = max(1, (total_items + 9) // 10)
    if total_items == 0:
        bultos = 1
    
    def mm_to_pt(mm_val):
        return mm_val * 2.83465
    
    y = 140  # posición inicial en mm
    
    # --- 1. REMITENTE (FIJO - KCF CORPORACION) ---
    c.setFont(font_name, 12)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), REMITENTE_FIJO[:35])
    y -= 6
    
    c.setFont(font_name, 9)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), DIRECCION_REMITENTE_FIJA[:35])
    y -= 5
    
    # Ubicación de destino (de la guía)
    c.setFont(font_name, 8)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), ubicacion_destino[:35] if ubicacion_destino else '')
    y -= 7
    
    # Línea separadora
    c.setLineWidth(1)
    c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
    y -= 5
    
    # --- 2. CÓDIGO DE RUTA (de la guía) ---
    c.setFont(font_name, 16)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), codigo_ruta[:20] if codigo_ruta else '')
    y -= 8
    
    # --- 3. CONDUCTOR (de la guía) ---
    c.setFont(font_name, 10)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), conductor[:35] if conductor else '')
    y -= 5
    
    c.setFont(font_name, 9)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"DNI: {dni_conductor}" if dni_conductor else '')
    y -= 7
    
    # Línea separadora
    c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
    y -= 5
    
    # --- 4. DESTINATARIO (de la guía) ---
    c.setFont(font_name, 12)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), destinatario[:35] if destinatario else '')
    y -= 8
    
    # --- 5. TABLA DE PRODUCTOS (de la guía) ---
    c.setFont(font_name, 7)
    c.drawString(mm_to_pt(5), mm_to_pt(y), "Cant")
    c.drawString(mm_to_pt(20), mm_to_pt(y), "Descripción")
    c.drawString(mm_to_pt(70), mm_to_pt(y), "Peso")
    y -= 4
    
    # Línea de encabezados
    c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
    y -= 3
    
    # Items (máximo 8 para que quepan)
    c.setFont(font_name, 7)
    c.setFillColorRGB(0, 0, 0)
    
    for item in items[:8]:
        cantidad = item.get('cantidad', 0)
        descripcion = item.get('descripcion', '-')[:25]
        peso_unitario = float(item.get('peso_unitario', 0))
        peso_total = cantidad * peso_unitario
        
        c.drawString(mm_to_pt(5), mm_to_pt(y), str(cantidad))
        c.drawString(mm_to_pt(20), mm_to_pt(y), descripcion)
        c.drawString(mm_to_pt(70), mm_to_pt(y), f"{peso_total:.1f} kg")
        y -= 5
        
        if y < 20:
            break
    
    if not items:
        c.drawString(mm_to_pt(5), mm_to_pt(y), "Sin productos")
        y -= 5
    
    # --- 6. CÓDIGO DE BARRAS ---
    y -= 4
    c.setFont(font_name, 18)
    c.setFillColorRGB(0, 0, 0)
    codigo_barras = generar_codigo_barras(numero_guia)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), codigo_barras)
    y -= 8
    
    # --- 7. RESUMEN FINAL ---
    y -= 2
    c.setFont(font_name, 9)
    c.setFillColorRGB(0, 0, 0)
    c.drawString(mm_to_pt(5), mm_to_pt(y), f"Guía: {numero_guia}")
    c.drawString(mm_to_pt(45), mm_to_pt(y), f"Fecha: {fecha}")
    
    # Bultos (con fondo negro)
    c.setFillColorRGB(0, 0, 0)
    c.rect(mm_to_pt(73), mm_to_pt(y) - 2, mm_to_pt(12), mm_to_pt(6), fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.drawCentredString(mm_to_pt(79), mm_to_pt(y) + 0.5, str(bultos))
    c.setFillColorRGB(0, 0, 0)
    
    # --- 8. PIE ---
    y -= 8
    c.setFont(font_name, 6)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), "RÓTULO DE EMBALAJE · Generado automáticamente")
    y -= 3
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), "Verificar integridad del producto")
    
    # --- 9. NÚMERO DE PÁGINA ---
    c.setFont(font_name, 8)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawRightString(mm_to_pt(85), mm_to_pt(5), "01/01")
    
    c.save()
    
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


def generar_rotulo_html(guia):
    """
    Genera HTML del rótulo para vista previa
    
    DATOS FIJOS DE KCF CORPORACION:
    - remitente_nombre: KCF CORPORACION S.A.C
    - remitente_direccion: AV. PRINCIPAL 123 - LIMA - PERÚ
    
    RESTO DE DATOS: Se toman de la guía (destinatario, conductor, productos, etc.)
    
    Args:
        guia (dict): Datos de la guía
    
    Returns:
        str: HTML del rótulo
    """
    items = []
    if guia.get('items_json'):
        try:
            items = json.loads(guia['items_json'])
        except:
            items = []
    
    # ==========================================
    # DATOS FIJOS DE KCF CORPORACION
    # ==========================================
    REMITENTE_FIJO = 'KCF CORPORACION S.A.C'
    DIRECCION_REMITENTE_FIJA = 'AV. PRINCIPAL 123 - LIMA - PERÚ'
    
    # ==========================================
    # DATOS DE LA GUÍA
    # ==========================================
    destinatario = guia.get('destinatario_nombre', '')
    ubicacion_destino = guia.get('destinatario_direccion', '')
    codigo_ruta = guia.get('codigo_ruta', '')
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    numero_guia = f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}"
    
    # Calcular bultos
    total_items = sum(item.get('cantidad', 0) for item in items)
    bultos = max(1, (total_items + 9) // 10)
    if total_items == 0:
        bultos = 1
    
    # Fecha
    fecha = guia.get('fecha_emision', datetime.now().strftime('%Y-%m-%d'))
    try:
        fecha_dt = datetime.strptime(str(fecha), '%Y-%m-%d')
        fecha = fecha_dt.strftime('%d/%m/%Y')
    except:
        pass
    
    # Código de barras
    codigo_barras = generar_codigo_barras(numero_guia)
    
    # Construir HTML
    html = f'''
    <div style="
        width: 90mm;
        max-width: 90mm;
        min-height: 130mm;
        background: #ffffff;
        border: 3px solid #1a1a1a;
        border-radius: 8px;
        padding: 12px 14px;
        font-family: 'Courier New', monospace;
        margin: 0 auto;
    ">
        <!-- Remitente (FIJO: KCF CORPORACION) -->
        <div style="text-align:center;border-bottom:3px double #1a1a1a;padding-bottom:6px;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:900;letter-spacing:-0.5px;color:#1a1a1a;line-height:1.2;">
                {REMITENTE_FIJO}
            </div>
            <div style="font-size:10px;font-weight:600;color:#333;">
                {DIRECCION_REMITENTE_FIJA}
            </div>
            <div style="font-size:9px;font-weight:500;color:#555;">
                {ubicacion_destino if ubicacion_destino else ''}
            </div>
        </div>

        <!-- Código de Ruta (de la guía) -->
        <div style="text-align:center;font-size:16px;font-weight:800;letter-spacing:2px;color:#1a1a1a;padding:4px 0;margin-bottom:4px;background:#f8f9fa;border-radius:4px;">
            {codigo_ruta if codigo_ruta else ''}
        </div>

        <!-- Conductor (de la guía) -->
        <div style="text-align:center;font-size:12px;font-weight:700;padding:4px 0;border-top:1px dashed #ddd;border-bottom:1px dashed #ddd;margin:4px 0 6px 0;">
            {conductor if conductor else ''}
            <span style="font-weight:400;font-size:11px;color:#555;">
                DNI: {dni_conductor if dni_conductor else ''}
            </span>
        </div>

        <!-- Destinatario (de la guía) -->
        <div style="text-align:center;font-size:13px;font-weight:800;color:#1a1a1a;padding:4px 0;margin-bottom:6px;background:#f0f0f0;border-radius:4px;">
            {destinatario if destinatario else ''}
        </div>

        <!-- Tabla de Productos (de la guía) -->
        <table style="width:100%;font-size:9px;border-collapse:collapse;margin:6px 0;">
            <thead>
                <tr>
                    <th style="background:#1a1a1a;color:#fff;padding:3px 4px;text-align:center;font-size:7px;text-transform:uppercase;">Cant</th>
                    <th style="background:#1a1a1a;color:#fff;padding:3px 4px;text-align:left;font-size:7px;text-transform:uppercase;">Descripción</th>
                    <th style="background:#1a1a1a;color:#fff;padding:3px 4px;text-align:center;font-size:7px;text-transform:uppercase;">Peso</th>
                </tr>
            </thead>
            <tbody>
    '''
    
    if items:
        for item in items[:8]:
            cantidad = item.get('cantidad', 0)
            descripcion = item.get('descripcion', '-')[:25]
            peso_unitario = float(item.get('peso_unitario', 0))
            peso_total = cantidad * peso_unitario
            html += f'''
                <tr>
                    <td style="text-align:center;padding:2px 4px;font-size:9px;">{cantidad}</td>
                    <td style="text-align:left;padding:2px 4px;font-size:9px;font-weight:500;">{descripcion}</td>
                    <td style="text-align:center;padding:2px 4px;font-size:9px;">{peso_total:.1f} kg</td>
                </tr>
            '''
    else:
        html += '''
            <tr>
                <td colspan="3" style="text-align:center;padding:8px;color:#999;">Sin productos</td>
            </tr>
        '''
    
    html += f'''
            </tbody>
        </table>

        <!-- Código de Barras -->
        <div style="text-align:center;font-family:'Courier New',monospace;font-size:20px;letter-spacing:2px;padding:4px 0;margin:4px 0;background:#f8f9fa;border-radius:4px;">
            {codigo_barras}
        </div>

        <!-- Resumen Final -->
        <div style="border-top:3px double #1a1a1a;padding-top:6px;margin-top:6px;display:flex;justify-content:space-between;font-size:10px;font-weight:600;">
            <span>📦 Guía: <strong>{numero_guia}</strong></span>
            <span>📅 {fecha}</span>
            <span style="background:#1a1a1a;color:#fff;padding:2px 12px;border-radius:4px;font-size:14px;">{bultos}</span>
        </div>

        <!-- Pie -->
        <div style="text-align:center;font-size:7px;color:#888;border-top:1px solid #ddd;padding-top:4px;margin-top:4px;">
            RÓTULO DE EMBALAJE · Generado automáticamente · Verificar integridad del producto
        </div>
    </div>
    '''
    
    return html