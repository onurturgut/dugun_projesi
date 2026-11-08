from pathlib import Path

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "ShineQR-Katalog-V3-3D-QR-Sayfalari.pdf"
ASSETS = ROOT / "public" / "qr-templates"
RENDERED = ROOT / "tmp" / "pdfs" / "catalog-v3-cards"
PRESENTATIONS = ROOT / "public" / "design-center" / "presentations"
CACHE = ROOT / "tmp" / "pdfs" / "catalog-v3-3d-cache"
FONTS = ROOT / "public" / "fonts" / "qr"

W, H = A4
CREAM = HexColor("#F5EFE6")
PAPER = HexColor("#FBF8F2")
BURGUNDY = HexColor("#3B0710")
BURGUNDY_2 = HexColor("#5A0B18")
GOLD = HexColor("#C8A168")
INK = HexColor("#30251F")
MUTED = HexColor("#75675E")
LINE = HexColor("#D9CFC1")
WHITE = HexColor("#FFFDF8")


COLLECTIONS = [
    {
        "id": "velvet-flow",
        "name": "Velvet Flow",
        "tagline": "Derin tonlar, güçlü ve modern bir atmosfer.",
        "variants": [
            ("Bordo", "01_Bordo_On_Yuz.webp", "01_Bordo_Arka_Yuz.webp", "#760B19"),
            ("Lacivert", "02_Lacivert_On_Yuz.webp", "02_Lacivert_Arka_Yuz.webp", "#092444"),
            ("Siyah", "03_Siyah_On_Yuz.webp", "03_Siyah_Arka_Yuz.webp", "#181716"),
            ("Krem", "04_Krem_On_Yuz.webp", "04_Krem_Arka_Yuz.webp", "#EAD9BD"),
            ("Zumrut", "05_Zumrut_On_Yuz.webp", "05_Zumrut_Arka_Yuz.webp", "#07524C"),
        ],
    },
    {
        "id": "botanical",
        "name": "Botanical",
        "tagline": "Doğal çizgiler, ferah ve zarif bir görünüm.",
        "variants": [
            ("Adacayi", "Botanical_Adacayi_On_Yuz.webp", "Botanical_Adacayi_Arka_Yuz.webp", "#8E9B78"),
            ("Krem", "Botanical_Krem_On_Yuz.webp", "Botanical_Krem_Arka_Yuz.webp", "#EEE3CF"),
            ("Mavi", "Botanical_Mavi_On_Yuz.webp", "Botanical_Mavi_Arka_Yuz.webp", "#A9C9E5"),
            ("Pudra", "Botanical_Pudra_On_Yuz.webp", "Botanical_Pudra_Arka_Yuz.webp", "#E6B8B3"),
            ("Siyah", "Botanical_Siyah_On_Yuz.webp", "Botanical_Siyah_Arka_Yuz.webp", "#171717"),
        ],
    },
    {
        "id": "modern-arch",
        "name": "Minimal",
        "tagline": "Sade kompozisyon, dengeli ve çağdaş detaylar.",
        "variants": [
            ("Krem", "01_Krem_On_Yuz.webp", "01_Krem_Arka_Yuz.webp", "#ECDD C7".replace(" ", "")),
            ("Pudra", "02_Pudra_On_Yuz.webp", "02_Pudra_Arka_Yuz.webp", "#DDA9A0"),
            ("Adacayi", "03_Adacayi_On_Yuz.webp", "03_Adacayi_Arka_Yuz.webp", "#9AA087"),
            ("Mavi", "04_Mavi_On_Yuz.webp", "04_Mavi_Arka_Yuz.webp", "#AFC5DF"),
            ("Siyah", "05_Siyah_On_Yuz.webp", "05_Siyah_Arka_Yuz.webp", "#171717"),
        ],
    },
    {
        "id": "aurora",
        "name": "Aurora",
        "tagline": "Sanatsal dokular, yumuşak ve romantik renkler.",
        "variants": [
            ("Gul", "Aurora_01_Rose_On_Yuz.webp", "Aurora_01_Rose_Arka_Yuz.webp", "#D98F98"),
            ("Mavi", "Aurora_02_Mavi_On_Yuz.webp", "Aurora_02_Mavi_Arka_Yuz.webp", "#A9C7E7"),
            ("Krem", "Aurora_03_Krem_On_Yuz.webp", "Aurora_03_Krem_Arka_Yuz.webp", "#ECD7B8"),
            ("Yesil", "Aurora_04_Yesil_On_Yuz.webp", "Aurora_04_Yesil_Arka_Yuz.webp", "#88A185"),
            ("Lavanta", "Aurora_05_Lavanta_On_Yuz.webp", "Aurora_05_Lavanta_Arka_Yuz.webp", "#C5A5DF"),
        ],
    },
]


def register_fonts():
    pdfmetrics.registerFont(TTFont("Cormorant", FONTS / "cormorant-garamond-500.ttf"))
    pdfmetrics.registerFont(TTFont("CormorantI", FONTS / "cormorant-garamond-500-italic.ttf"))
    pdfmetrics.registerFont(TTFont("Manrope", FONTS / "manrope-400.ttf"))
    pdfmetrics.registerFont(TTFont("Montserrat", FONTS / "montserrat-regular.ttf"))
    pdfmetrics.registerFont(TTFont("MontserratB", FONTS / "montserrat-bold.ttf"))


def path_for(collection, filename):
    face = "front" if "On_Yuz" in filename else "back"
    variant_name = next(entry[0] for entry in collection["variants"] if filename in entry[1:3])
    variant_id = variant_name.lower().replace("ı", "i").replace("ü", "u").replace("ş", "s").replace("ğ", "g").replace("ö", "o").replace("ç", "c")
    aliases = {
        "bordo": "burgundy", "lacivert": "navy", "siyah": "black", "krem": "cream", "zumrut": "emerald",
        "adacayi": "sage", "mavi": "blue", "pudra": "blush", "gul": "rose", "yesil": "green", "lavanta": "lavender",
    }
    return RENDERED / f"{collection['id']}-{aliases[variant_id]}-{face}.png"


def presentation_for(collection, filename, format_id="portrait-mini"):
    variant_name = next(entry[0] for entry in collection["variants"] if filename in entry[1:3])
    variant_id = variant_name.lower().replace("ı", "i").replace("ü", "u").replace("ş", "s").replace("ğ", "g").replace("ö", "o").replace("ç", "c")
    aliases = {
        "bordo": "burgundy", "lacivert": "navy", "siyah": "black", "krem": "cream", "zumrut": "emerald",
        "adacayi": "sage", "mavi": "blue", "pudra": "blush", "gul": "rose", "yesil": "green", "lavanta": "lavender",
    }
    variant_id = aliases[variant_id]
    collection_id = collection["id"]
    folder = PRESENTATIONS / collection_id / format_id
    if collection_id == "velvet-flow":
        suffix = "welcome-sign-presentation.png" if format_id == "welcome-sign-500x700" else f"{format_id}-presentation.png"
        return folder / f"{collection_id}-{variant_id}-{suffix}"
    if collection_id == "botanical":
        if format_id == "portrait-mini":
            return folder / f"botanical-{variant_id}-portrait-mini-uploaded-presentation-v1.png"
        short = "welcome-sign" if format_id == "welcome-sign-500x700" else "landscape-mini"
        return folder / f"botanical-{variant_id}-{short}-uploaded-presentation-v1.png"
    uploaded = "uploaded-v1-presentation.png" if collection_id == "modern-arch" else "uploaded-v1-presentation.png"
    if format_id == "portrait-mini":
        return folder / f"{collection_id}-{variant_id}-portrait-mini-{uploaded}"
    if format_id == "landscape-mini":
        if collection_id == "modern-arch":
            return folder / f"{collection_id}-{variant_id}-landscape-mini-uploaded-v1-presentation.png"
        return folder / f"{collection_id}-{variant_id}-landscape-mini-uploaded-presentation-v1.png"
    return folder / f"{collection_id}-{variant_id}-welcome-sign-500x700-uploaded-v1-presentation.png"


def cached_image(path):
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / f"{abs(hash(str(path.resolve())))}.jpg"
    if not cached.exists() or cached.stat().st_mtime < path.stat().st_mtime:
        with Image.open(path) as source:
            image = source.convert("RGB")
            image.thumbnail((1400, 1000), Image.Resampling.LANCZOS)
            image.save(cached, "JPEG", quality=88, optimize=True)
    return cached


def fit_image(c, path, x, y, w, h, pad=0, shadow=True):
    path = cached_image(path)
    if shadow:
        c.setFillColor(Color(0, 0, 0, alpha=0.12))
        c.roundRect(x + 3, y - 3, w, h, 5, fill=1, stroke=0)
    with Image.open(path) as im:
        iw, ih = im.size
    scale = min((w - pad * 2) / iw, (h - pad * 2) / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(str(path), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")


def label(c, text, x, y, color=MUTED, size=7):
    c.setFillColor(color)
    c.setFont("MontserratB", size)
    c.drawString(x, y, text.upper())


def title(c, line1, line2=None, dark=False):
    color = WHITE if dark else INK
    c.setFillColor(color)
    c.setFont("Cormorant", 31)
    c.drawString(46, H - 82, line1)
    if line2:
        c.setFont("CormorantI", 31)
        c.setFillColor(GOLD if dark else BURGUNDY_2)
        c.drawString(46, H - 112, line2)


def footer(c, page_no, dark=False):
    c.setStrokeColor(Color(1, 1, 1, alpha=0.2) if dark else LINE)
    c.line(46, 35, W - 46, 35)
    c.setFillColor(Color(1, 1, 1, alpha=0.6) if dark else MUTED)
    c.setFont("Montserrat", 6.3)
    c.drawString(46, 20, "SHINEQR  /  TASARIM MERKEZİ KOLEKSİYONLARI")
    c.drawRightString(W - 46, 20, f"{page_no:02d}")


def page_7(c):
    c.setFillColor(CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "QR KOLEKSİYONLARI", 46, H - 43)
    title(c, "Dört farklı stil.", "Size ait tek bir hikâye.")
    c.setFillColor(MUTED); c.setFont("Manrope", 8.2)
    c.drawRightString(W - 46, H - 68, "Tasarım Merkezi'ndeki aktif koleksiyonlar,")
    c.drawRightString(W - 46, H - 80, "ön ve arka yüzleriyle birlikte sunulur.")
    positions = [(46, 353), (302, 353), (46, 92), (302, 92)]
    for idx, (col, (x, y)) in enumerate(zip(COLLECTIONS, positions), 1):
        c.setFillColor(PAPER); c.roundRect(x, y, 247, 232, 4, fill=1, stroke=0)
        fit_image(c, presentation_for(col, col["variants"][0][1]), x + 12, y + 42, 220, 178)
        label(c, f"QR-{idx:02d}", x + 12, y + 25, BURGUNDY_2)
        c.setFillColor(INK); c.setFont("Cormorant", 14); c.drawString(x + 53, y + 22, col["name"])
        c.setFillColor(MUTED); c.setFont("Manrope", 6.2); c.drawRightString(x + 232, y + 23, "5 RENK  /  ÖN + ARKA")
    footer(c, 7)


def detail_page(c, page_no, pair, dark):
    c.setFillColor(BURGUNDY if dark else CREAM); c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "QR KOLEKSİYONLARI  /  TASARIM MERKEZİ", 46, H - 43, GOLD if dark else MUTED)
    title(c, f"{pair[0]['name']}  +", pair[1]["name"], dark=dark)
    top = 528
    for row, col in enumerate(pair):
        y = top - row * 255
        presentation = presentation_for(col, col["variants"][0][1])
        fit_image(c, presentation, 46, y, 301, 224)
        c.setFillColor(Color(1,1,1,alpha=.08) if dark else PAPER); c.roundRect(366, y, 181, 224, 4, fill=1, stroke=0)
        label(c, f"QR-{COLLECTIONS.index(col)+1:02d}", 383, y + 193, GOLD if dark else BURGUNDY_2)
        c.setFillColor(WHITE if dark else INK); c.setFont("Cormorant", 22); c.drawString(383, y + 161, col["name"])
        c.setFillColor(Color(1,1,1,alpha=.72) if dark else MUTED); c.setFont("Manrope", 7.2)
        words = col["tagline"].split(); lines=[]; line=""
        for word in words:
            if len(line + " " + word) > 28: lines.append(line); line=word
            else: line=(line+" "+word).strip()
        lines.append(line)
        for n, line in enumerate(lines): c.drawString(383, y + 137 - n*11, line)
        c.setFont("MontserratB", 6.5); c.drawString(383, y + 84, "5 RENK SEÇENEĞİ")
        for i, (_, _, _, hex_color) in enumerate(col["variants"]):
            c.setFillColor(HexColor(hex_color)); c.circle(390 + i*25, y + 58, 7, fill=1, stroke=0)
        c.setFillColor(Color(1,1,1,alpha=.6) if dark else MUTED); c.setFont("Montserrat", 6)
        c.drawString(383, y + 28, "GERÇEK ÖN VE ARKA YÜZ TASARIMLARI")
    footer(c, page_no, dark=dark)


def page_10(c):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    label(c, "RENK KUTUPHANESI", 46, H-43)
    title(c, "Dört koleksiyon.", "Yirmi renk seçeneği.")
    c.setFillColor(MUTED); c.setFont("Manrope", 8)
    c.drawString(46, H-140, "Her renk, koleksiyonun ön ve arka yüz tasarım dili korunarak hazırlanır.")
    card_w, card_h, gap = 95, 121, 12
    start_x, start_y = 46, 535
    for row, col in enumerate(COLLECTIONS):
        label(c, f"QR-{row+1:02d}  {col['name']}", 46, start_y - row*148 + 127, BURGUNDY_2, 6.5)
        for i, (name, front, _, swatch) in enumerate(col["variants"]):
            x = start_x + i*(card_w+gap); y = start_y - row*148
            c.setFillColor(PAPER); c.roundRect(x,y,card_w,card_h,3,fill=1,stroke=0)
            fit_image(c,presentation_for(col,front),x+5,y+25,85,89,shadow=False)
            c.setFillColor(HexColor(swatch)); c.circle(x+13,y+13,4.5,fill=1,stroke=0)
            c.setFillColor(INK); c.setFont("Montserrat",5.8); c.drawString(x+23,y+10.5,name)
    footer(c,10)


def page_11(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    label(c,"KİŞİSELLEŞTİRME",46,H-43)
    title(c,"Her detay,", "sizin hikâyenize ait.")
    col = COLLECTIONS[1]
    fit_image(c,presentation_for(col,col["variants"][0][1]),56,279,441,329)
    c.setFillColor(CREAM); c.roundRect(46,78,W-92,157,4,fill=1,stroke=0)
    label(c,"KİŞİSELLEŞTİRİLEBİLEN ALANLAR",64,211,BURGUNDY_2)
    items=[("01","Çiftin isimleri"),("02","Organizasyon tarihi"),("03","Karşılama metni"),("04","QR açıklama metni"),("05","Renk seçimi"),("06","Fiziksel format")]
    for i,(num,text) in enumerate(items):
        x=64+(i%3)*166; y=174-(i//3)*52
        c.setFillColor(GOLD); c.setFont("MontserratB",6); c.drawString(x,y+15,num)
        c.setFillColor(INK); c.setFont("Cormorant",12); c.drawString(x,y,text)
    c.setFillColor(MUTED); c.setFont("Manrope",6.7)
    c.drawString(64,91,"Koleksiyonun temel kompozisyonu korunur; belirlenen metin ve renk alanları size özel uygulanır.")
    footer(c,11)


def page_16(c):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    label(c,"FİZİKSEL QR ÜRÜN AİLESİ",46,H-43)
    title(c,"Üç farklı format.","Tek bir tasarım dili.")
    c.setFillColor(MUTED); c.setFont("Manrope",8)
    c.drawString(46,H-140,"Masa üstünden karşılama alanına kadar aynı koleksiyon dili devam eder.")
    col=COLLECTIONS[0]
    cards=[("KOMPAKT","Mini QR Kart",118,184),("MASA ÜSTÜ","Masa Kartı",145,226),("GİRİŞ ALANI","Karşılama Tabelası",174,270)]
    xs=[46,220,394]
    for i,(eyebrow,name,iw,ih) in enumerate(cards):
        x=xs[i]; c.setFillColor(PAPER); c.roundRect(x,153,155,453,5,fill=1,stroke=0)
        format_id=["portrait-mini","landscape-mini","welcome-sign-500x700"][i]
        fit_image(c,presentation_for(col,col["variants"][0][1],format_id),x+8,291,139,ih)
        label(c,eyebrow,x+16,256,BURGUNDY_2)
        c.setFillColor(INK); c.setFont("Cormorant",16); c.drawString(x+16,229,name)
        c.setFillColor(MUTED); c.setFont("Manrope",6.5)
        desc=["Kişisel masa yerleşimi", "Masada görünür ana format", "Karşılama alanında güçlü yönlendirme"][i]
        c.drawString(x+16,210,desc)
        c.setStrokeColor(LINE); c.line(x+16,188,x+139,188)
        c.setFillColor(MUTED); c.setFont("MontserratB",5.8); c.drawString(x+16,171,"ÖN + ARKA YÜZ  /  BASKIYA UYGUN")
    c.setFillColor(BURGUNDY); c.roundRect(46,73,W-92,52,4,fill=1,stroke=0)
    c.setFillColor(WHITE); c.setFont("Cormorant",14); c.drawString(64,94,"Format ve kesin ölçüler sipariş kapsamında onaylanır.")
    c.setFillColor(GOLD); c.setFont("MontserratB",6); c.drawRightString(W-64,95,"4 KOLEKSIYON  /  20 RENK")
    footer(c,16)


def page_17(c):
    c.setFillColor(BURGUNDY); c.rect(0,0,W,H,fill=1,stroke=0)
    label(c,"TASARIM MERKEZİ QR KÜTÜPHANESİ",46,H-43,GOLD)
    title(c,"Bütün koleksiyonlar.","Tek bakışta.",dark=True)
    c.setFillColor(Color(1,1,1,alpha=.68)); c.setFont("Manrope",8)
    c.drawString(46,H-140,"Dört koleksiyon ve yirmi renk varyasyonu, gerçek ön yüz tasarımlarıyla gösterilir.")
    card_w, card_h, gap=94,111,12; sy=535
    for row,col in enumerate(COLLECTIONS):
        label(c,f"QR-{row+1:02d}  {col['name']}",46,sy-row*137+117,GOLD,6.2)
        for i,(name,front,_,swatch) in enumerate(col["variants"]):
            x=46+i*(card_w+gap); y=sy-row*137
            c.setFillColor(Color(1,1,1,alpha=.07)); c.roundRect(x,y,card_w,card_h,3,fill=1,stroke=0)
            fit_image(c,presentation_for(col,front),x+4,y+25,86,80,shadow=False)
            c.setFillColor(HexColor(swatch)); c.circle(x+12,y+13,4,fill=1,stroke=0)
            c.setFillColor(WHITE); c.setFont("Montserrat",5.5); c.drawString(x+21,y+10.5,name)
    c.setStrokeColor(Color(1,1,1,alpha=.18)); c.line(46,68,W-46,68)
    c.setFillColor(GOLD); c.setFont("CormorantI",14); c.drawCentredString(W/2,49,"Seçiminiz, isimleriniz ve organizasyon bilgilerinizle size özel hazırlanır.")
    footer(c,17,dark=True)


def main():
    register_fonts()
    missing=[]
    for col in COLLECTIONS:
        for _,front,back,_ in col["variants"]:
            p=presentation_for(col,front)
            if not p.exists(): missing.append(str(p))
    if missing:
        raise FileNotFoundError("Missing assets:\n"+"\n".join(missing))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
    c.setTitle("ShineQR Katalog V3 - Yeni QR Sayfalari")
    for draw in (page_7, lambda x: detail_page(x,8,COLLECTIONS[:2],True), lambda x: detail_page(x,9,COLLECTIONS[2:],False), page_10, page_11, page_16, page_17):
        draw(c); c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
