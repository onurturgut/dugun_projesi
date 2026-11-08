from pathlib import Path
import hashlib

from PIL import Image
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/ShineQR-Katalog-Creative-Edition-7-Sayfa.pdf"
PRES = ROOT / "public/design-center/presentations"
BG = ROOT / "public/presentation-assets/catalog-luxury-background-v1.png"
CACHE = ROOT / "tmp/pdfs/creative-catalog-cache"
FONTS = ROOT / "public/fonts/qr"
W, H = A4

INK = HexColor("#241A16")
BURGUNDY = HexColor("#3A0710")
WINE = HexColor("#641220")
GOLD = HexColor("#C6A064")
CREAM = HexColor("#F5EFE5")
PAPER = HexColor("#FCF8F1")
WHITE = HexColor("#FFFDF8")
MUTED = HexColor("#76675E")

COLLECTIONS = [
    ("velvet-flow", "Velvet Flow", "burgundy", ["burgundy", "navy", "black", "cream", "emerald"], ["Bordo", "Lacivert", "Siyah", "Krem", "Zümrüt"]),
    ("botanical", "Botanical", "sage", ["sage", "cream", "blue", "blush", "black"], ["Adaçayı", "Krem", "Mavi", "Pudra", "Siyah"]),
    ("modern-arch", "Minimal", "cream", ["cream", "blush", "sage", "blue", "black"], ["Krem", "Pudra", "Adaçayı", "Mavi", "Siyah"]),
    ("aurora", "Aurora", "rose", ["rose", "blue", "cream", "green", "lavender"], ["Gül", "Mavi", "Krem", "Yeşil", "Lavanta"]),
]

SWATCHES = {
    "burgundy":"#760B19", "navy":"#092444", "black":"#181716", "cream":"#E7D7BC", "emerald":"#07524C",
    "sage":"#8E9B78", "blue":"#A9C9E5", "blush":"#E6B8B3", "rose":"#D98F98", "green":"#88A185", "lavender":"#C5A5DF",
}


def fonts():
    pdfmetrics.registerFont(TTFont("Cormorant", FONTS/"cormorant-garamond-500.ttf"))
    pdfmetrics.registerFont(TTFont("CormorantI", FONTS/"cormorant-garamond-500-italic.ttf"))
    pdfmetrics.registerFont(TTFont("Manrope", FONTS/"manrope-400.ttf"))
    pdfmetrics.registerFont(TTFont("Montserrat", FONTS/"montserrat-regular.ttf"))
    pdfmetrics.registerFont(TTFont("MontserratB", FONTS/"montserrat-bold.ttf"))


def presentation(collection, variant, fmt="portrait-mini"):
    folder = PRES/collection/fmt
    if collection == "velvet-flow":
        suffix = "welcome-sign-presentation.png" if fmt == "welcome-sign-500x700" else f"{fmt}-presentation.png"
        return folder/f"{collection}-{variant}-{suffix}"
    if collection == "botanical":
        if fmt == "portrait-mini": return folder/f"botanical-{variant}-portrait-mini-uploaded-presentation-v1.png"
        short = "welcome-sign" if fmt == "welcome-sign-500x700" else "landscape-mini"
        return folder/f"botanical-{variant}-{short}-uploaded-presentation-v1.png"
    if fmt == "portrait-mini": return folder/f"{collection}-{variant}-portrait-mini-uploaded-v1-presentation.png"
    if fmt == "landscape-mini":
        tail = "uploaded-v1-presentation.png" if collection == "modern-arch" else "uploaded-presentation-v1.png"
        return folder/f"{collection}-{variant}-landscape-mini-{tail}"
    return folder/f"{collection}-{variant}-welcome-sign-500x700-uploaded-v1-presentation.png"


def cached(path, max_size=(1500, 1100)):
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1((str(path.resolve())+str(max_size)).encode()).hexdigest()[:20]
    target = CACHE/f"{key}.jpg"
    if not target.exists() or target.stat().st_mtime < path.stat().st_mtime:
        with Image.open(path) as source:
            im = source.convert("RGB"); im.thumbnail(max_size, Image.Resampling.LANCZOS)
            im.save(target, "JPEG", quality=90, optimize=True)
    return target


def image_fit(c, path, x, y, w, h, cover=False, radius=0, shadow=False):
    path = cached(path)
    with Image.open(path) as im: iw, ih = im.size
    scale = max(w/iw, h/ih) if cover else min(w/iw, h/ih)
    dw, dh = iw*scale, ih*scale
    if shadow:
        c.setFillColor(Color(0,0,0,alpha=.18)); c.roundRect(x+5,y-5,w,h,radius,fill=1,stroke=0)
    if cover:
        c.saveState(); p=c.beginPath(); p.roundRect(x,y,w,h,radius); c.clipPath(p,stroke=0,fill=0)
        c.drawImage(str(path), x+(w-dw)/2, y+(h-dh)/2, dw, dh)
        c.restoreState()
    else:
        c.drawImage(str(path), x+(w-dw)/2, y+(h-dh)/2, dw, dh)


def small_label(c, text, x, y, color=MUTED):
    c.setFillColor(color); c.setFont("MontserratB", 6.2); c.drawString(x,y,text.upper())


def page_no(c, n, light=False):
    c.setFillColor(Color(1,1,1,alpha=.58) if light else MUTED); c.setFont("Montserrat",6)
    c.drawString(42,20,"SHINEQR  /  CREATIVE EDITION"); c.drawRightString(W-42,20,f"{n:02d}")


def hero_title(c, eyebrow, first, italic, x=46, y=760, light=False):
    small_label(c,eyebrow,x,y, GOLD if light else WINE)
    c.setFillColor(WHITE if light else INK); c.setFont("Cormorant",31); c.drawString(x,y-43,first)
    c.setFillColor(GOLD if light else WINE); c.setFont("CormorantI",31); c.drawString(x,y-73,italic)


def p7(c):
    image_fit(c,BG,0,0,W,H,cover=True)
    c.setFillColor(Color(.08,.02,.025,alpha=.35)); c.rect(0,0,W,H,fill=1,stroke=0)
    hero_title(c,"QR KOLEKSİYONLARI","Dört dünya.","Tek bir aşk hikâyesi.",light=True)
    c.setFillColor(Color(1,1,1,alpha=.78)); c.setFont("Manrope",8)
    c.drawString(46,642,"Tasarım Merkezi’nin dört imza koleksiyonu,")
    c.drawString(46,629,"gerçek 3D sunumlarıyla ilk kez aynı sahnede.")
    image_fit(c,presentation("velvet-flow","burgundy"),46,275,503,310,cover=True,radius=5,shadow=True)
    for i,(_,name,_,_,_) in enumerate(COLLECTIONS):
        x=46+i*126; c.setFillColor(Color(1,1,1,alpha=.1)); c.roundRect(x,210,113,42,21,fill=1,stroke=0)
        c.setFillColor(WHITE); c.setFont("Cormorant",11); c.drawCentredString(x+56.5,228,name)
    c.setFillColor(GOLD); c.setFont("MontserratB",6.2); c.drawString(46,177,"04 KOLEKSİYON  /  20 RENK  /  03 FİZİKSEL FORMAT")
    page_no(c,7,True)


def collection_page(c,n,left,right,dark=False):
    c.setFillColor(BURGUNDY if dark else CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    hero_title(c,"TASARIM MERKEZİ",left[1],right[1],light=dark)
    c.setFillColor(Color(1,1,1,alpha=.72) if dark else MUTED); c.setFont("Manrope",7.6)
    c.drawRightString(W-46,760,"İki karakter. İki farklı atmosfer.")
    c.drawRightString(W-46,747,"Her biri beş renk ve çift yüz seçeneğiyle.")
    blocks=[(left,46,358),(right,302,92)]
    for idx,(col,x,y) in enumerate(blocks):
        cid,name,default,variants,names=col
        image_fit(c,presentation(cid,default),x,y,247,316,cover=True,radius=5,shadow=True)
        c.setFillColor(BURGUNDY if not dark else Color(1,1,1,alpha=.08)); c.roundRect(x+16,y+18,215,70,4,fill=1,stroke=0)
        small_label(c,f"QR-{COLLECTIONS.index(col)+1:02d}",x+30,y+67,GOLD)
        c.setFillColor(WHITE); c.setFont("Cormorant",17); c.drawString(x+30,y+43,name)
        for j,v in enumerate(variants):
            c.setFillColor(HexColor(SWATCHES[v])); c.circle(x+31+j*24,y+26,6,fill=1,stroke=0)
    page_no(c,n,dark)


def p10(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    hero_title(c,"RENK KÜTÜPHANESİ","Yirmi renk.","Yirmi farklı ruh.")
    c.setFillColor(MUTED); c.setFont("Manrope",7.5); c.drawString(46,642,"Her varyasyon, gerçek 3D ürün sunumuyla birlikte gösterilir.")
    y=518
    for row,(cid,name,_,variants,names) in enumerate(COLLECTIONS):
        small_label(c,f"QR-{row+1:02d}  {name}",46,y+100,WINE)
        for i,(variant,label) in enumerate(zip(variants,names)):
            x=46+i*102
            c.setFillColor(CREAM); c.roundRect(x,y,92,88,4,fill=1,stroke=0)
            image_fit(c,presentation(cid,variant),x+4,y+22,84,61,cover=True,radius=3)
            c.setFillColor(HexColor(SWATCHES[variant])); c.circle(x+11,y+11,4,fill=1,stroke=0)
            c.setFillColor(INK); c.setFont("Montserrat",5.4); c.drawString(x+20,y+9,label)
        y-=124
    c.setFillColor(BURGUNDY); c.roundRect(46,58,W-92,48,4,fill=1,stroke=0)
    c.setFillColor(WHITE); c.setFont("CormorantI",14); c.drawString(64,78,"Renk seçiminiz, organizasyonunuzun atmosferiyle eşleştirilir.")
    page_no(c,10)


def p11(c):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    image_fit(c,presentation("botanical","sage"),0,345,W,497,cover=True)
    c.setFillColor(Color(.12,.07,.04,alpha=.22)); c.rect(0,345,W,497,fill=1,stroke=0)
    c.setFillColor(Color(.08,.03,.02,alpha=.72)); c.rect(0,650,W,192,fill=1,stroke=0)
    hero_title(c,"KİŞİSELLEŞTİRME","Hazır bir tasarım değil.","Size ait bir imza.",x=46,y=792,light=True)
    c.setFillColor(PAPER); c.roundRect(46,72,W-92,235,8,fill=1,stroke=0)
    small_label(c,"SİZİNLE DEĞİŞEN DETAYLAR",70,274,WINE)
    items=[("01","İsimler"),("02","Tarih"),("03","Karşılama metni"),("04","QR çağrısı"),("05","Renk"),("06","Fiziksel format")]
    for i,(num,text) in enumerate(items):
        x=70+(i%3)*157; y=225-(i//3)*66
        c.setFillColor(GOLD); c.setFont("MontserratB",6); c.drawString(x,y+20,num)
        c.setFillColor(INK); c.setFont("Cormorant",15); c.drawString(x,y,text)
        c.setStrokeColor(HexColor("#DDD1C2")); c.line(x,y-12,x+126,y-12)
    c.setFillColor(MUTED); c.setFont("Manrope",6.5)
    c.drawString(70,94,"Koleksiyonun sanat yönetimi korunur; hikâyenize ait bilgiler tasarımın doğal bir parçasına dönüşür.")
    page_no(c,11)


def p16(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    hero_title(c,"FİZİKSEL ÜRÜN AİLESİ","Bir tasarım.","Üç farklı sahne.")
    c.setFillColor(MUTED); c.setFont("Manrope",7.5); c.drawString(46,642,"Masa üstünden karşılama alanına uzanan bütünsel bir deneyim.")
    cards=[("portrait-mini","Mini QR Kart","Kişisel dokunuş"),("landscape-mini","Masa Kartı","Masada güçlü görünürlük"),("welcome-sign-500x700","Karşılama Tabelası","Girişte ilk temas")]
    xs=[46,218,390]
    for i,(fmt,name,desc) in enumerate(cards):
        x=xs[i]; h=[185,207,231][i]
        c.setFillColor(CREAM); c.roundRect(x,176,159,400,6,fill=1,stroke=0)
        image_fit(c,presentation("velvet-flow","burgundy",fmt),x+8,317,143,h,cover=True,radius=4)
        small_label(c,f"0{i+1}",x+18,282,WINE)
        c.setFillColor(INK); c.setFont("Cormorant",16); c.drawString(x+18,254,name)
        c.setFillColor(MUTED); c.setFont("Manrope",6.4); c.drawString(x+18,233,desc)
        c.setStrokeColor(HexColor("#DCCFBE")); c.line(x+18,211,x+141,211)
        c.setFont("MontserratB",5.5); c.drawString(x+18,193,"3D SUNUM  /  ÖN + ARKA")
    c.setFillColor(BURGUNDY); c.roundRect(46,78,W-92,55,5,fill=1,stroke=0)
    c.setFillColor(WHITE); c.setFont("CormorantI",14); c.drawString(64,100,"Format ve kesin ölçüler, sipariş kapsamıyla birlikte onaylanır.")
    page_no(c,16)


def p17(c):
    image_fit(c,BG,0,0,W,H,cover=True)
    c.setFillColor(Color(.08,.01,.02,alpha=.52)); c.rect(0,0,W,H,fill=1,stroke=0)
    hero_title(c,"KOLEKSİYON FİNALİ","Seçiminiz hazır.","Hikâyeniz başlasın.",light=True)
    c.setFillColor(Color(1,1,1,alpha=.74)); c.setFont("Manrope",7.4)
    c.drawString(46,642,"Dört koleksiyondan size en yakın olanı seçin.")
    cards=[]
    for row,col in enumerate(COLLECTIONS):
        cid,name,default,_,_=col; x=46+(row%2)*257; y=367-(row//2)*190
        image_fit(c,presentation(cid,default),x,y,246,165,cover=True,radius=5,shadow=True)
        c.setFillColor(Color(.12,.02,.03,alpha=.72)); c.roundRect(x+12,y+12,105,31,15,fill=1,stroke=0)
        c.setFillColor(WHITE); c.setFont("Cormorant",11); c.drawCentredString(x+64.5,y+23,name)
    c.setFillColor(GOLD); c.setFont("MontserratB",6.4); c.drawString(46,132,"TASARIM MERKEZİ  /  4 KOLEKSİYON  /  20 RENK  /  3 FORMAT")
    c.setFillColor(WHITE); c.setFont("CormorantI",17); c.drawString(46,94,"Her güzel an, iyi tasarlanmış bir başlangıcı hak eder.")
    page_no(c,17,True)


def main():
    fonts(); OUT.parent.mkdir(parents=True,exist_ok=True)
    required=[BG]
    for cid,_,default,variants,_ in COLLECTIONS:
        required += [presentation(cid,v) for v in variants]
    required += [presentation("velvet-flow","burgundy",f) for f in ("landscape-mini","welcome-sign-500x700")]
    missing=[str(p) for p in required if not p.exists()]
    if missing: raise FileNotFoundError("Eksik görseller:\n"+"\n".join(missing))
    c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
    c.setTitle("ShineQR Katalog Creative Edition - 7 Sayfa")
    pages=[p7,lambda c:collection_page(c,8,COLLECTIONS[0],COLLECTIONS[1],True),lambda c:collection_page(c,9,COLLECTIONS[2],COLLECTIONS[3]),p10,p11,p16,p17]
    for page in pages: page(c); c.showPage()
    c.save(); print(OUT)


if __name__ == "__main__": main()
