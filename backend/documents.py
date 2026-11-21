from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

from constants import REQUEST_TYPES

pdfmetrics.registerFont(TTFont('NotoSans', str(Path(__file__).parent / 'fonts/NotoSans-Regular.ttf')))


def request_pdf(doc, user):
    output = BytesIO()
    style = ParagraphStyle('body', fontName='NotoSans', fontSize=11, leading=18, spaceAfter=14)
    title = ParagraphStyle('title', parent=style, fontSize=22, leading=28, spaceAfter=24)
    paragraphs = [
        Paragraph('Кампус · конкурсный образец', title),
        Paragraph(escape(REQUEST_TYPES[doc['type']]['label']), title),
        Paragraph(escape(f"Заявка {doc['number']}"), style),
        Paragraph(escape(f"Студент: {user['full_name']}"), style),
        Paragraph(escape(f"Факультет: {user['faculty']}"), style),
        Paragraph(escape(f"Направление: {user['direction']}"), style),
        Paragraph(escape(f"Курс: {user['course']}. Группа: {user['group']}"), style),
        Spacer(1, 24),
        Paragraph('Демонстрационный документ. Все данные вымышлены. '
                  'Не является официальной справкой и не предназначен для предъявления.', style),
    ]
    SimpleDocTemplate(output, title='Кампус — демонстрационная справка').build(paragraphs)
    output.seek(0)
    return output
