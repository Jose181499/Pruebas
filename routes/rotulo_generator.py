"""
================================================================================
GENERADOR DE RÓTULOS DE EMBALAJE
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
# IMPORTACIÓN DE REPORTLAB (PARA GENERAR PDF)
# =================================================================================
try:
    from reportlab.lib.pagesizes import A5, landscape
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.colors import black, grey, white, Color, HexColor
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


# =================================================================================
# CONSTANTES DE KCF CORPORACION
# =================================================================================
class KCF_CONFIG:
    """Configuración fija de KCF CORPORACION"""
    NOMBRE = 'KCF CORPORACION S.A.C'
    RUC = '20612345678'
    DIRECCION = 'JR. LAS ALMENDRAS VERDES NRO. 284 URB. VIRGEN DEL ROSARIO LIMA - LIMA - SAN MARTIN DE PORRES'
    TELEFONO = '987-654-321'
    EMAIL = 'ventas@kcf.pe'
    WEB = 'www.kcf.pe'
    
    # Colores de la empresa
    COLOR_PRIMARIO = HexColor('#1a1a2e')   # Azul oscuro
    COLOR_SECUNDARIO = HexColor('#2d2d44') # Gris oscuro
    COLOR_ACCENT = HexColor('#e94560')     # Rojo acento
    COLOR_TEXTO = HexColor('#1a1a1a')      # Negro
    COLOR_GRIS = HexColor('#555555')       # Gris
    COLOR_GRIS_CLARO = HexColor('#888888') # Gris claro
    COLOR_FONDO = HexColor('#f8f9fa')      # Fondo gris claro


# =================================================================================
# FUNCIONES AUXILIARES
# =================================================================================
def generar_codigo_barras(texto):
    """
    Genera un código de barras simulado en texto
    
    Args:
        texto (str): Texto para generar el código
        
    Returns:
        str: Código de barras simulado
    """
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
    """Convierte milímetros a puntos (para ReportLab)"""
    return mm_val * 2.83465


def calcular_bultos(items):
    """Calcula el número de bultos basado en los items"""
    total_items = sum(item.get('cantidad', 0) for item in items)
    bultos = max(1, (total_items + 9) // 10)
    if total_items == 0:
        bultos = 1
    return bultos


def formatear_fecha(fecha_str):
    """Formatea una fecha para mostrar en DD/MM/YYYY"""
    if not fecha_str:
        return datetime.now().strftime('%d/%m/%Y')
    try:
        fecha_dt = datetime.strptime(str(fecha_str), '%Y-%m-%d')
        return fecha_dt.strftime('%d/%m/%Y')
    except:
        return datetime.now().strftime('%d/%m/%Y')


def obtener_items(guia):
    """Obtiene los items de la guía en formato lista"""
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
# GENERADOR DE PDF
# =================================================================================
def generar_rotulo_pdf(guia):
    """
    Genera PDF del rótulo de embalaje (formato AGD GROUP)
    
    ═══════════════════════════════════════════════════════════════
    DATOS FIJOS DE KCF CORPORACION (se pueden sobrescribir desde guia):
    • remitente_nombre  → KCF CORPORACION S.A.C
    • remitente_direccion → JR. LAS ALMENDRAS VERDES...
    • ruc_remitente     → 20612345678
    • telefono          → 987-654-321
    • email             → ventas@kcf.pe
    • web               → www.kcf.pe
    ═══════════════════════════════════════════════════════════════
    
    RESTO DE DATOS: Se toman de la guía (destinatario, conductor, productos, etc.)
    
    Args:
        guia (dict): Datos de la guía de remisión
    
    Returns:
        bytes: Datos del PDF generado
    """
    # ──────────────────────────────────────────────────────────────────────────
    # VERIFICAR DISPONIBILIDAD DE REPORTLAB
    # ──────────────────────────────────────────────────────────────────────────
    if not REPORTLAB_AVAILABLE:
        raise Exception("ReportLab no está instalado. Ejecuta: pip install reportlab")
    
    # ──────────────────────────────────────────────────────────────────────────
    # CONFIGURACIÓN DEL DOCUMENTO
    # ──────────────────────────────────────────────────────────────────────────
    buffer = io.BytesIO()
    page_width = 90 * mm   # 90mm de ancho
    page_height = 150 * mm # 150mm de alto
    
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
    
    # ──────────────────────────────────────────────────────────────────────────
    # DATOS FIJOS DE KCF CORPORACION
    # ──────────────────────────────────────────────────────────────────────────
    REMITENTE_FIJO = guia.get('remitente_nombre', KCF_CONFIG.NOMBRE)
    DIRECCION_REMITENTE_FIJA = guia.get('remitente_direccion', KCF_CONFIG.DIRECCION)
    RUC_REMITENTE = guia.get('ruc_remitente', KCF_CONFIG.RUC)
    TELEFONO = guia.get('telefono', KCF_CONFIG.TELEFONO)
    EMAIL = guia.get('email', KCF_CONFIG.EMAIL)
    
    # ──────────────────────────────────────────────────────────────────────────
    # DATOS DE LA GUÍA
    # ──────────────────────────────────────────────────────────────────────────
    items = obtener_items(guia)
    
    destinatario = guia.get('destinatario_nombre', '')
    ubicacion_destino = guia.get('destinatario_direccion', '')
    ruc_destinatario = guia.get('ruc_destinatario', '')
    
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    codigo_ruta = guia.get('codigo_ruta', '')
    
    numero_guia = f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}"
    fecha = formatear_fecha(guia.get('fecha_emision', ''))
    bultos = calcular_bultos(items)
    
    # ──────────────────────────────────────────────────────────────────────────
    # DIBUJAR EL RÓTULO
    # ──────────────────────────────────────────────────────────────────────────
    y = 140  # posición inicial en mm
    
    # ─── 1. REMITENTE (FIJO - KCF CORPORACION) ───
    # Título principal
    c.setFont(font_name, 12)
    c.setFillColor(KCF_CONFIG.COLOR_PRIMARIO)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), REMITENTE_FIJO[:35])
    y -= 5
    
    # RUC
    c.setFont(font_name, 9)
    c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"RUC: {RUC_REMITENTE}")
    y -= 4
    
    # Dirección
    c.setFont(font_name, 8)
    c.setFillColor(KCF_CONFIG.COLOR_GRIS)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), DIRECCION_REMITENTE_FIJA[:35])
    y -= 4
    
    # Contacto
    c.setFont(font_name, 7)
    c.setFillColor(KCF_CONFIG.COLOR_GRIS)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"Tel: {TELEFONO} | Email: {EMAIL}")
    y -= 4
    
    # Ubicación de destino (de la guía)
    if ubicacion_destino:
        c.setFont(font_name, 8)
        c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
        c.drawCentredString(mm_to_pt(45), mm_to_pt(y), ubicacion_destino[:35])
    y -= 6
    
    # Línea separadora
    c.setLineWidth(1)
    c.setStrokeColor(KCF_CONFIG.COLOR_ACCENT)
    c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
    y -= 5
    
    # ─── 2. CÓDIGO DE RUTA (de la guía) ───
    if codigo_ruta:
        c.setFont(font_name, 16)
        c.setFillColor(KCF_CONFIG.COLOR_PRIMARIO)
        c.drawCentredString(mm_to_pt(45), mm_to_pt(y), codigo_ruta[:20])
        y -= 8
    else:
        y -= 4
    
    # ─── 3. CONDUCTOR (de la guía) ───
    if conductor:
        c.setFont(font_name, 10)
        c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
        c.drawCentredString(mm_to_pt(45), mm_to_pt(y), conductor[:35])
        y -= 5
        
        if dni_conductor:
            c.setFont(font_name, 9)
            c.setFillColor(KCF_CONFIG.COLOR_GRIS)
            c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"DNI: {dni_conductor}")
            y -= 7
        else:
            y -= 4
    else:
        y -= 4
    
    # Línea separadora
    c.setLineWidth(1)
    c.setStrokeColor(KCF_CONFIG.COLOR_PRIMARIO)
    c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
    y -= 5
    
    # ─── 4. DESTINATARIO (de la guía) ───
    if destinatario:
        c.setFont(font_name, 12)
        c.setFillColor(KCF_CONFIG.COLOR_PRIMARIO)
        c.drawCentredString(mm_to_pt(45), mm_to_pt(y), destinatario[:35])
        y -= 5
        
        if ruc_destinatario:
            c.setFont(font_name, 9)
            c.setFillColor(KCF_CONFIG.COLOR_GRIS)
            c.drawCentredString(mm_to_pt(45), mm_to_pt(y), f"RUC: {ruc_destinatario}")
            y -= 7
        else:
            y -= 4
    else:
        y -= 4
    
    # ─── 5. TABLA DE PRODUCTOS (de la guía) ───
    if items:
        # Encabezados de la tabla
        c.setFont(font_name, 7)
        c.setFillColor(KCF_CONFIG.COLOR_PRIMARIO)
        c.drawString(mm_to_pt(5), mm_to_pt(y), "CANT")
        c.drawString(mm_to_pt(20), mm_to_pt(y), "DESCRIPCIÓN")
        c.drawString(mm_to_pt(70), mm_to_pt(y), "PESO")
        y -= 4
        
        # Línea de encabezados
        c.setLineWidth(1)
        c.setStrokeColor(KCF_CONFIG.COLOR_PRIMARIO)
        c.line(mm_to_pt(5), mm_to_pt(y), mm_to_pt(85), mm_to_pt(y))
        y -= 3
        
        # Items (máximo 8 para que quepan)
        c.setFont(font_name, 7)
        c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
        
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
    else:
        c.setFont(font_name, 8)
        c.setFillColor(KCF_CONFIG.COLOR_GRIS_CLARO)
        c.drawString(mm_to_pt(5), mm_to_pt(y), "Sin productos")
        y -= 5
    
    # ─── 6. CÓDIGO DE BARRAS ───
    y -= 4
    c.setFont(font_name, 18)
    c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
    codigo_barras = generar_codigo_barras(numero_guia)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), codigo_barras)
    y -= 8
    
    # ─── 7. RESUMEN FINAL ───
    y -= 2
    c.setFont(font_name, 9)
    c.setFillColor(KCF_CONFIG.COLOR_TEXTO)
    c.drawString(mm_to_pt(5), mm_to_pt(y), f"Guía: {numero_guia}")
    c.drawString(mm_to_pt(45), mm_to_pt(y), f"Fecha: {fecha}")
    
    # Bultos (con fondo de color)
    c.setFillColor(KCF_CONFIG.COLOR_ACCENT)
    c.rect(mm_to_pt(73), mm_to_pt(y) - 2, mm_to_pt(12), mm_to_pt(6), fill=1, stroke=0)
    c.setFillColor(white)
    c.drawCentredString(mm_to_pt(79), mm_to_pt(y) + 0.5, str(bultos))
    
    # ─── 8. PIE ───
    y -= 8
    c.setFont(font_name, 6)
    c.setFillColor(KCF_CONFIG.COLOR_GRIS_CLARO)
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), "RÓTULO DE EMBALAJE · Generado automáticamente")
    y -= 3
    c.drawCentredString(mm_to_pt(45), mm_to_pt(y), "Verificar integridad del producto")
    
    # ─── 9. NÚMERO DE PÁGINA ───
    c.setFont(font_name, 8)
    c.setFillColor(KCF_CONFIG.COLOR_GRIS_CLARO)
    c.drawRightString(mm_to_pt(85), mm_to_pt(5), "01/01")
    
    # ──────────────────────────────────────────────────────────────────────────
    # GUARDAR PDF
    # ──────────────────────────────────────────────────────────────────────────
    c.save()
    
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


# =================================================================================
# GENERADOR DE HTML (PARA VISTA PREVIA)
# =================================================================================
def generar_rotulo_html(guia):
    """
    Genera HTML del rótulo para vista previa (con colores y diseño mejorado)
    
    Args:
        guia (dict): Datos de la guía
    
    Returns:
        str: HTML del rótulo
    """
    # ──────────────────────────────────────────────────────────────────────────
    # DATOS DE LA GUÍA
    # ──────────────────────────────────────────────────────────────────────────
    items = obtener_items(guia)
    
    REMITENTE_FIJO = guia.get('remitente_nombre', KCF_CONFIG.NOMBRE)
    DIRECCION_REMITENTE_FIJA = guia.get('remitente_direccion', KCF_CONFIG.DIRECCION)
    RUC_REMITENTE = guia.get('ruc_remitente', KCF_CONFIG.RUC)
    TELEFONO = guia.get('telefono', KCF_CONFIG.TELEFONO)
    EMAIL = guia.get('email', KCF_CONFIG.EMAIL)
    
    destinatario = guia.get('destinatario_nombre', '')
    ubicacion_destino = guia.get('destinatario_direccion', '')
    ruc_destinatario = guia.get('ruc_destinatario', '')
    codigo_ruta = guia.get('codigo_ruta', '')
    conductor = guia.get('conductor_nombre', '')
    dni_conductor = guia.get('conductor_dni', '')
    numero_guia = f"{guia.get('serie', 'T001')}-{guia.get('numero', '000001')}"
    bultos = calcular_bultos(items)
    fecha = formatear_fecha(guia.get('fecha_emision', ''))
    codigo_barras = generar_codigo_barras(numero_guia)
    
    # ──────────────────────────────────────────────────────────────────────────
    # CONSTRUIR HTML
    # ──────────────────────────────────────────────────────────────────────────
    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Rótulo de Embalaje - KCF CORPORACION</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
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
                border: 3px solid #1a1a2e;
                border-radius: 8px;
                padding: 12px 14px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }}
            .header {{
                text-align: center;
                border-bottom: 3px double #e94560;
                padding-bottom: 6px;
                margin-bottom: 8px;
            }}
            .header .empresa {{
                font-size: 14px;
                font-weight: 900;
                color: #1a1a2e;
                letter-spacing: -0.5px;
            }}
            .header .ruc {{
                font-size: 9px;
                font-weight: 600;
                color: #333;
            }}
            .header .direccion {{
                font-size: 9px;
                font-weight: 500;
                color: #555;
            }}
            .header .contacto {{
                font-size: 8px;
                font-weight: 400;
                color: #555;
            }}
            .header .destino {{
                font-size: 9px;
                font-weight: 500;
                color: #1a1a2e;
                margin-top: 2px;
            }}
            .codigo-ruta {{
                text-align: center;
                font-size: 16px;
                font-weight: 800;
                letter-spacing: 2px;
                color: #1a1a2e;
                padding: 4px 0;
                margin: 4px 0;
                background: #f0f0f5;
                border-radius: 4px;
                border-left: 4px solid #e94560;
            }}
            .conductor {{
                text-align: center;
                font-size: 12px;
                font-weight: 700;
                padding: 4px 0;
                border-top: 1px dashed #ddd;
                border-bottom: 1px dashed #ddd;
                margin: 4px 0 6px 0;
                color: #1a1a2e;
            }}
            .conductor span {{
                font-weight: 400;
                font-size: 11px;
                color: #555;
            }}
            .destinatario {{
                text-align: center;
                font-size: 13px;
                font-weight: 800;
                color: #1a1a2e;
                padding: 4px 0;
                margin-bottom: 2px;
                background: #f0f0f5;
                border-radius: 4px;
            }}
            .destinatario-ruc {{
                text-align: center;
                font-size: 9px;
                font-weight: 500;
                color: #555;
                margin-bottom: 6px;
            }}
            .tabla {{
                width: 100%;
                font-size: 9px;
                border-collapse: collapse;
                margin: 6px 0;
            }}
            .tabla th {{
                background: #1a1a2e;
                color: #fff;
                padding: 3px 4px;
                text-align: center;
                font-size: 7px;
                text-transform: uppercase;
            }}
            .tabla td {{
                padding: 2px 4px;
                text-align: center;
                border-bottom: 1px solid #eee;
            }}
            .tabla .desc {{
                text-align: left;
                font-weight: 500;
            }}
            .codigo-barras {{
                text-align: center;
                font-family: 'Courier New', monospace;
                font-size: 20px;
                letter-spacing: 2px;
                padding: 4px 0;
                margin: 4px 0;
                background: #f8f9fa;
                border-radius: 4px;
            }}
            .resumen {{
                border-top: 3px double #1a1a2e;
                padding-top: 6px;
                margin-top: 6px;
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                font-weight: 600;
                color: #1a1a2e;
            }}
            .resumen .bultos {{
                background: #e94560;
                color: #fff;
                padding: 2px 12px;
                border-radius: 4px;
                font-size: 14px;
            }}
            .pie {{
                text-align: center;
                font-size: 7px;
                color: #888;
                border-top: 1px solid #ddd;
                padding-top: 4px;
                margin-top: 4px;
            }}
            .btn-imprimir {{
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #1a1a2e;
                color: #fff;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                z-index: 999;
            }}
            .btn-imprimir:hover {{
                transform: scale(1.05);
                background: #e94560;
            }}
            @media print {{
                body {{ background: white; padding: 0; }}
                .btn-imprimir {{ display: none !important; }}
                .rotulo {{
                    border: 2px solid #1a1a2e !important;
                    box-shadow: none !important;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="rotulo">
            <!-- HEADER: REMITENTE (KCF CORPORACION) -->
            <div class="header">
                <div class="empresa">{REMITENTE_FIJO}</div>
                <div class="ruc">RUC: {RUC_REMITENTE}</div>
                <div class="direccion">{DIRECCION_REMITENTE_FIJA}</div>
                <div class="contacto">Tel: {TELEFONO} | Email: {EMAIL}</div>
                <div class="destino">{ubicacion_destino if ubicacion_destino else ''}</div>
            </div>

            <!-- CÓDIGO DE RUTA -->
            <div class="codigo-ruta">{codigo_ruta if codigo_ruta else ''}</div>

            <!-- CONDUCTOR -->
            <div class="conductor">
                {conductor if conductor else ''}
                <span>DNI: {dni_conductor if dni_conductor else ''}</span>
            </div>

            <!-- DESTINATARIO -->
            <div class="destinatario">{destinatario if destinatario else ''}</div>
            <div class="destinatario-ruc">RUC: {ruc_destinatario if ruc_destinatario else ''}</div>

            <!-- TABLA DE PRODUCTOS -->
            <table class="tabla">
                <thead>
                    <tr>
                        <th style="width:15%">Cant</th>
                        <th style="width:55%">Descripción</th>
                        <th style="width:30%">Peso</th>
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
                        <td>{cantidad}</td>
                        <td class="desc">{descripcion}</td>
                        <td>{peso_total:.1f} kg</td>
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

            <!-- CÓDIGO DE BARRAS -->
            <div class="codigo-barras">{codigo_barras}</div>

            <!-- RESUMEN FINAL -->
            <div class="resumen">
                <span>📦 Guía: <strong>{numero_guia}</strong></span>
                <span>📅 {fecha}</span>
                <span class="bultos">{bultos}</span>
            </div>

            <!-- PIE -->
            <div class="pie">
                RÓTULO DE EMBALAJE · Generado automáticamente · Verificar integridad del producto
            </div>
        </div>

        <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Rótulo</button>
    </body>
    </html>
    '''
    
    return html