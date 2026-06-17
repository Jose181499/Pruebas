"""
================================================================================
GENERADOR DE RÓTULOS DE EMBALAJE - KCF CORPORACION
================================================================================
Formato: AGD GROUP adaptado para KCF CORPORACION
DATOS FIJOS: KCF CORPORACION (remitente, RUC, contacto)
RESTO: Se toma de la cotización/guía
================================================================================
"""

import json
from datetime import datetime
import io
import os

# =================================================================================
# IMPORTACIÓN DE REPORTLAB
# =================================================================================
try:
    from reportlab.lib.pagesizes import A5, landscape
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.colors import white, HexColor
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# =================================================================================
# CONFIGURACIÓN KCF CORPORACION
# =================================================================================
class KCF:
    """Datos fijos de KCF CORPORACION"""
    NOMBRE = 'KCF CORPORACION S.A.C'
    RUC = '20612345678'
    DIRECCION = 'JR. LAS ALMENDRAS VERDES NRO. 284 URB. VIRGEN DEL ROSARIO LIMA - LIMA - SAN MARTIN DE PORRES'
    TELEFONO = '987-654-321'
    EMAIL = 'ventas@kcf.pe'
    WEB = 'www.kcf.pe'
    
    # Colores KCF
    AZUL = HexColor('#1a2a6c')
    ROJO = HexColor('#e94560')
    NEGRO = HexColor('#1a1a1a')
    GRIS = HexColor('#555555')
    GRIS_CLARO = HexColor('#888888')
    BLANCO = white


# =================================================================================
# FUNCIONES AUXILIARES
# =================================================================================
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


def mm_to_pt(mm_val):
    """Convierte milímetros a puntos"""
    return mm_val * 2.83465


def calcular_bultos(items):
    """Calcula el número de bultos"""
    total_items = sum(item.get('cantidad', 0) for item in items)
    return max(1, (total_items + 9) // 10) if total_items > 0 else 1


def formatear_fecha(fecha_str):
    """Formatea fecha a DD/MM/YYYY"""
    if not fecha_str:
        return datetime.now().strftime('%d/%m/%Y')
    try:
        fecha_dt = datetime.strptime(str(fecha_str), '%Y-%m-%d')
        return fecha_dt.strftime('%d/%m/%Y')
    except:
        return datetime.now().strftime('%d/%m/%Y')


def obtener_items(guia):
    """Obtiene los items de la guía"""
    items = []
    if guia.get('items_json'):
        try:
            items = json.loads(guia['items_json'])
        except:
            items = []
    if not items and guia.get('items'):
        items = guia.get('items', [])
    return items


# =================================================================================
# GENERAR PDF DEL RÓTULO
# =================================================================================
def generar_rotulo_pdf(guia):
    """
    Genera PDF del rótulo de embalaje con formato AGD GROUP
    """
    if not REPORTLAB_AVAILABLE:
        raise Exception("ReportLab no está instalado. Ejecuta: pip install reportlab")
    
    # ─── CONFIGURACIÓN ───
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(90 * mm, 150 * mm))
    
    # ─── FUENTE ───
    font_name = 'Helvetica'
    try:
        font_path = '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf'
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont('Mono', font_path))
            font_name = 'Mono'
    except:
        pass
    
    # ─── DATOS FIJOS (KCF) ───
    remitente = guia.get('remitente_nombre', KCF.NOMBRE)
    ruc_remitente = guia.get('ruc_remitente', KCF.RUC)
    
    # ─── DATOS DE LA GUÍA ───
    items = obtener_items(guia)
    destinatario = guia.get('destinatario_nombre', '')
    ruc_destinatario = guia.get('ruc_destinatario', '')
    direccion_entrega = guia.get('destinatario_direccion', '')
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    numero_guia = guia.get('codigo_ruta', f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}")
    numero_factura = guia.get('documento_asociado', 'E001-496')
    bultos = calcular_bultos(items)
    total_bultos = bultos
    
    # ─── DIBUJAR ───
    y = 138
    x_left = 8
    x_right = 82
    
    # ═══════════════════════════════════════════════════
    # 1. REMITENTE (KCF) - BORDE SUPERIOR
    # ═══════════════════════════════════════════════════
    # Borde del recuadro
    c.setStrokeColor(KCF.AZUL)
    c.setLineWidth(2)
    c.rect(mm_to_pt(5), mm_to_pt(5), mm_to_pt(80), mm_to_pt(140), fill=0, stroke=1)
    
    # Nombre de la empresa (arriba)
    c.setFont(font_name, 11)
    c.setFillColor(KCF.AZUL)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), remitente[:35])
    y -= 5
    
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"RUC: {ruc_remitente}")
    y -= 8
    
    # Línea separadora
    c.setLineWidth(1)
    c.setStrokeColor(KCF.ROJO)
    c.line(mm_to_pt(10), mm_to_pt(y), mm_to_pt(80), mm_to_pt(y))
    y -= 6
    
    # ═══════════════════════════════════════════════════
    # 2. CLIENTE (DESTINATARIO)
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), "CLIENTE:")
    y -= 4
    
    c.setFont(font_name, 10)
    c.setFillColor(KCF.NEGRO)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), destinatario[:35] if destinatario else '')
    y -= 5
    
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), f"RUC: {ruc_destinatario}" if ruc_destinatario else '')
    y -= 6
    
    # ═══════════════════════════════════════════════════
    # 3. DIRECCIÓN DE ENTREGA
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), "DIRECCIÓN DE ENTREGA:")
    y -= 4
    
    c.setFont(font_name, 9)
    c.setFillColor(KCF.NEGRO)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), direccion_entrega[:40] if direccion_entrega else '')
    y -= 4
    if len(direccion_entrega) > 40:
        c.drawString(mm_to_pt(x_left), mm_to_pt(y), direccion_entrega[40:75])
        y -= 4
    y -= 2
    
    # ═══════════════════════════════════════════════════
    # 4. CONSIGNADOS (CONDUCTOR)
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), "CONSIGNADOS:")
    y -= 4
    
    c.setFont(font_name, 10)
    c.setFillColor(KCF.NEGRO)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), conductor[:35] if conductor else '')
    y -= 5
    
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), f"DNI: {dni_conductor}" if dni_conductor else '')
    y -= 6
    
    # ═══════════════════════════════════════════════════
    # 5. N° BULTOS, N° GUÍA, FACTURA
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), f"N° BULTOS: {bultos}")
    c.drawString(mm_to_pt(45), mm_to_pt(y), f"N° GUÍA: {numero_guia}")
    y -= 5
    
    c.setFont(font_name, 8)
    c.setFillColor(KCF.GRIS)
    c.drawString(mm_to_pt(x_left), mm_to_pt(y), f"FACTURA: {numero_factura}")
    y -= 8
    
    # ═══════════════════════════════════════════════════
    # 6. CÓDIGO DE BARRAS
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 16)
    c.setFillColor(KCF.NEGRO)
    codigo_barras = generar_codigo_barras(numero_guia)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), codigo_barras)
    y -= 8
    
    # ═══════════════════════════════════════════════════
    # 7. PIE
    # ═══════════════════════════════════════════════════
    c.setFont(font_name, 6)
    c.setFillColor(KCF.GRIS_CLARO)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(10), "RÓTULO DE EMBALAJE · Generado automáticamente")
    
    c.save()
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


# =================================================================================
# GENERAR HTML DEL RÓTULO
# =================================================================================
def generar_rotulo_html(guia):
    """
    Genera HTML del rótulo con formato AGD GROUP
    """
    items = obtener_items(guia)
    
    # Datos fijos (KCF)
    remitente = guia.get('remitente_nombre', KCF.NOMBRE)
    ruc_remitente = guia.get('ruc_remitente', KCF.RUC)
    
    # Datos de la guía
    destinatario = guia.get('destinatario_nombre', '')
    ruc_destinatario = guia.get('ruc_destinatario', '')
    direccion_entrega = guia.get('destinatario_direccion', '')
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    numero_guia = guia.get('codigo_ruta', f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}")
    numero_factura = guia.get('documento_asociado', 'E001-496')
    bultos = calcular_bultos(items)
    codigo_barras = generar_codigo_barras(numero_guia)
    
    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rótulo de Embalaje</title>
    <style>
        * {{ margin:0; padding:0; box-sizing:border-box; }}
        body {{
            font-family: 'Courier New', monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #eef2ff;
            padding: 10px;
        }}
        .rotulo {{
            width: 90mm;
            max-width: 90mm;
            min-height: 130mm;
            background: #ffffff;
            border: 2px solid #1a2a6c;
            border-radius: 4px;
            padding: 10px 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            position: relative;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #e94560;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }}
        .header .empresa {{
            font-size: 12px;
            font-weight: 900;
            color: #1a2a6c;
            letter-spacing: 0.5px;
        }}
        .header .ruc {{
            font-size: 8px;
            font-weight: 600;
            color: #555;
        }}
        .campo {{
            margin: 2px 0;
        }}
        .campo .label {{
            font-size: 8px;
            font-weight: 700;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .campo .valor {{
            font-size: 10px;
            font-weight: 600;
            color: #1a1a1a;
        }}
        .campo .valor-grande {{
            font-size: 11px;
            font-weight: 700;
            color: #1a1a1a;
        }}
        .campo .valor-gris {{
            font-size: 9px;
            font-weight: 500;
            color: #555;
        }}
        .separador {{
            border-top: 1px dashed #ddd;
            margin: 3px 0;
        }}
        .fila {{
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }}
        .codigo-barras {{
            text-align: center;
            font-size: 18px;
            letter-spacing: 2px;
            padding: 4px 0;
            margin: 4px 0;
            background: #f8f9fa;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }}
        .pie {{
            text-align: center;
            font-size: 6px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 4px;
            margin-top: 4px;
            position: absolute;
            bottom: 8px;
            left: 12px;
            right: 12px;
        }}
        .btn-imprimir {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a2a6c;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 999;
            transition: all 0.2s;
        }}
        .btn-imprimir:hover {{
            background: #e94560;
            transform: scale(1.05);
        }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .btn-imprimir {{ display: none !important; }}
            .rotulo {{
                border: 2px solid #1a2a6c !important;
                box-shadow: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="rotulo">
        <!-- HEADER: REMITENTE -->
        <div class="header">
            <div class="empresa">{remitente}</div>
            <div class="ruc">RUC: {ruc_remitente}</div>
        </div>

        <!-- CLIENTE -->
        <div class="campo">
            <div class="label">CLIENTE:</div>
            <div class="valor-grande">{destinatario if destinatario else ''}</div>
            <div class="valor-gris">RUC: {ruc_destinatario if ruc_destinatario else ''}</div>
        </div>

        <div class="separador"></div>

        <!-- DIRECCIÓN DE ENTREGA -->
        <div class="campo">
            <div class="label">DIRECCIÓN DE ENTREGA:</div>
            <div class="valor">{direccion_entrega if direccion_entrega else ''}</div>
        </div>

        <div class="separador"></div>

        <!-- CONSIGNADOS (CONDUCTOR) -->
        <div class="campo">
            <div class="label">CONSIGNADOS:</div>
            <div class="valor">{conductor if conductor else ''}</div>
            <div class="valor-gris">DNI: {dni_conductor if dni_conductor else ''}</div>
        </div>

        <div class="separador"></div>

        <!-- N° BULTOS, N° GUÍA, FACTURA -->
        <div class="fila">
            <div class="campo" style="flex:1;">
                <div class="label">N° BULTOS:</div>
                <div class="valor" style="font-size:14px;font-weight:800;color:#e94560;">{bultos}</div>
            </div>
            <div class="campo" style="flex:1;">
                <div class="label">N° GUÍA:</div>
                <div class="valor">{numero_guia}</div>
            </div>
            <div class="campo" style="flex:1;">
                <div class="label">FACTURA:</div>
                <div class="valor">{numero_factura}</div>
            </div>
        </div>

        <!-- CÓDIGO DE BARRAS -->
        <div class="codigo-barras">{codigo_barras}</div>

        <!-- PIE -->
        <div class="pie">RÓTULO DE EMBALAJE · Verificar integridad del producto</div>
    </div>

    <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Rótulo</button>
</body>
</html>'''
    
    return html