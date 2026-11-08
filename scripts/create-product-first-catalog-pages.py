from pathlib import Path
import hashlib

from PIL import Image, ImageFilter, ImageOps
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/ShineQR-Katalog-Product-First-7-Sayfa.pdf"
CARDS = ROOT / "tmp/pdfs/catalog-v3-cards"
CACHE = ROOT / "tmp/pdfs/product-first-cutouts"
ARCHES = ROOT / "public/presentation-assets/catalog-acrylic-arches-v1.png"
FONTS = ROOT / "public/fonts/qr"
W, H = A4

PAPER = HexColor("#FBF7F0")
CREAM = HexColor("#F2E9DE")
INK = HexColor("#211817")
MUTED = HexColor("#76685F")
WINE = HexColor("#540B17")
BURGUNDY = HexColor("#36070E")
GOLD = HexColor("#C39B5C")
WHITE = HexColor("#FFFDF8")
LINE = HexColor("#DED1C2")

COLLECTIONS = [
    ("velvet-flow", "Velvet Flow", ["burgundy", "navy", "black", "cream", "emerald"], ["Bordo", "Lacivert", "Siyah", "Krem", "Zümrüt"]),
    ("botanical", "Botanical", ["sage", "cream", "blue", "blush", "black"], ["Adaçayı", "Krem", "Mavi", "Pudra", "Siyah"]),
    ("modern-arch", "Minimal", ["cream", "blush", "sage", "blue", "black"], ["Krem", "Pudra", "Adaçayı", "Mavi", "Siyah"]),
    ("aurora", "Aurora", ["rose", "blue", "cream", "green", "lavender"], ["Gül", "Mavi", "Krem", "Yeşil", "Lavanta"]),
]
SWATCH = {"burgundy":"#760B19","navy":"#092444","black":"#181716","cream":"#E8D8BE","emerald":"#07524C","sage":"#8E9B78","blue":"#A9C9E5","blush":"#E6B8B3","rose":"#D98F98","green":"#88A185","lavender":"#C5A5DF"}


def register_fonts():
    pdfmetrics.registerFont(TTFont("Cormorant",FONTS/"cormorant-garamond-500.ttf"))
    pdfmetrics.registerFont(TTFont("CormorantI",FONTS/"cormorant-garamond-500-italic.ttf"))
    pdfmetrics.registerFont(TTFont("Manrope",FONTS/"manrope-400.ttf"))
    pdfmetrics.registerFont(TTFont("Montserrat",FONTS/"montserrat-regular.ttf"))
    pdfmetrics.registerFont(TTFont("MontserratB",FONTS/"montserrat-bold.ttf"))


def card_path(cid,variant,face="front"):
    return CARDS/f"{cid}-{variant}-{face}.png"


def transparent_pair(cid,variant):
    CACHE.mkdir(parents=True,exist_ok=True)
    target=CACHE/f"{cid}-{variant}-pair.png"
    if target.exists(): return target
    front=Image.open(card_path(cid,variant,"front")).convert("RGBA")
    back=Image.open(card_path(cid,variant,"back")).convert("RGBA")
    front.thumbnail((650,870),Image.Resampling.LANCZOS); back.thumbnail((590,790),Image.Resampling.LANCZOS)
    front=front.rotate(3,resample=Image.Resampling.BICUBIC,expand=True)
    back=back.rotate(-4,resample=Image.Resampling.BICUBIC,expand=True)
    stage=Image.new("RGBA",(1300,980),(0,0,0,0))
    def paste_shadow(item,xy):
        alpha=item.getchannel("A"); shadow=Image.new("RGBA",item.size,(20,8,8,0)); shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(22)).point(lambda p:int(p*.38)))
        stage.alpha_composite(shadow,(xy[0]+18,xy[1]+22)); stage.alpha_composite(item,xy)
    paste_shadow(back,(620,110)); paste_shadow(front,(170,45))
    stage.save(target)
    return target


def transparent_single(cid,variant,face="front"):
    CACHE.mkdir(parents=True,exist_ok=True)
    target=CACHE/f"{cid}-{variant}-{face}-single.png"
    if target.exists(): return target
    item=Image.open(card_path(cid,variant,face)).convert("RGBA"); item.thumbnail((680,900),Image.Resampling.LANCZOS)
    stage=Image.new("RGBA",(820,1020),(0,0,0,0)); alpha=item.getchannel("A")
    shadow=Image.new("RGBA",item.size,(18,6,6,0)); shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(25)).point(lambda p:int(p*.32)))
    stage.alpha_composite(shadow,(82,80)); stage.alpha_composite(item,(60,50)); stage.save(target); return target


def img(c,path,x,y,w,h):
    with Image.open(path) as im: iw,ih=im.size
    s=min(w/iw,h/ih); dw,dh=iw*s,ih*s
    c.drawImage(str(path),x+(w-dw)/2,y+(h-dh)/2,dw,dh,mask="auto")


def rect(c,x,y,w,h,color,r=0,alpha=1):
    base=color
    if isinstance(color,str): base=HexColor(color)
    c.setFillColor(Color(base.red,base.green,base.blue,alpha=alpha) if alpha<1 else base)
    c.roundRect(x,y,w,h,r,fill=1,stroke=0)


def heading(c,eyebrow,line1,line2,x=46,y=782,light=False):
    c.setFillColor(GOLD if light else WINE); c.setFont("MontserratB",6.2); c.drawString(x,y,eyebrow.upper())
    c.setFillColor(WHITE if light else INK); c.setFont("Cormorant",31); c.drawString(x,y-42,line1)
    c.setFillColor(GOLD if light else WINE); c.setFont("CormorantI",31); c.drawString(x,y-72,line2)


def footer(c,n,light=False):
    c.setFillColor(Color(1,1,1,alpha=.55) if light else MUTED); c.setFont("Montserrat",5.8)
    c.drawString(44,20,"SHINEQR  /  PRODUCT-FIRST EDITION"); c.drawRightString(W-44,20,f"{n:02d}")


def p7(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    rect(c,0,0,182,H,BURGUNDY)
    img(c,ARCHES,238,55,330,725)
    c.setFillColor(GOLD); c.setFont("MontserratB",6.2); c.drawString(42,782,"QR KOLEKSİYONLARI")
    c.setFillColor(WHITE); c.setFont("Cormorant",27); c.drawString(42,740,"Ürünü")
    c.drawString(42,710,"görün.")
    c.setFillColor(GOLD); c.setFont("CormorantI",25); c.drawString(42,669,"Detayı")
    c.drawString(42,641,"hissedin.")
    c.setFillColor(Color(1,1,1,alpha=.72)); c.setFont("Manrope",7.5)
    c.drawString(42,588,"Gerçek QR kodu,"); c.drawString(42,576,"gerçek içerik,"); c.drawString(42,564,"şeffaf 3D ürün sunumu.")
    heroes=[("velvet-flow","burgundy",188,390,190,290),("botanical","sage",335,375,190,290),("modern-arch","cream",214,105,180,270),("aurora","rose",360,95,180,270)]
    for cid,var,x,y,w,h in heroes: img(c,transparent_single(cid,var),x,y,w,h)
    c.setFillColor(GOLD); c.setFont("MontserratB",6); c.drawString(42,90,"04 KOLEKSİYON")
    c.drawString(42,76,"20 RENK")
    c.drawString(42,62,"ÖN + ARKA YÜZ")
    footer(c,7,True)


def p8(c):
    c.setFillColor(BURGUNDY); c.rect(0,0,W,H,fill=1,stroke=0)
    heading(c,"QR-01  /  VELVET FLOW","Kadife kadar derin.","Işık kadar etkileyici.",light=True)
    c.setFillColor(Color(1,1,1,alpha=.67)); c.setFont("Manrope",7.3)
    c.drawRightString(W-46,780,"Ön ve arka yüz, gerçek QR kodu ve")
    c.drawRightString(W-46,768,"okunabilir içerikle birlikte sunulur.")
    img(c,transparent_pair("velvet-flow","burgundy"),28,270,539,390)
    rect(c,46,84,W-92,142,CREAM,r=8)
    c.setFillColor(WINE); c.setFont("MontserratB",6); c.drawString(65,201,"BEŞ RENK / TEK KOLEKSİYON DİLİ")
    variants=COLLECTIONS[0][2]; names=COLLECTIONS[0][3]
    for i,(v,name) in enumerate(zip(variants,names)):
        x=64+i*100; img(c,transparent_single("velvet-flow",v),x,105,67,83)
        c.setFillColor(HexColor(SWATCH[v])); c.circle(x+7,96,4,fill=1,stroke=0)
        c.setFillColor(INK); c.setFont("Montserrat",5.4); c.drawString(x+16,94,name)
    footer(c,8,True)


def p9(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    heading(c,"İKİ İMZA KOLEKSİYON","Doğal zarafet.","Modern sadelik.")
    rect(c,36,85,255,568,CREAM,r=10); rect(c,304,85,255,568,"#EFE7DD",r=10)
    blocks=[("botanical","sage","Botanical","Organik çizgiler ve yumuşak doğa tonları.",48),("modern-arch","cream","Minimal","Mimari denge ve temiz tipografi.",316)]
    for cid,var,name,desc,x in blocks:
        img(c,transparent_pair(cid,var),x-4,280,247,330)
        c.setFillColor(WINE); c.setFont("Cormorant",21); c.drawString(x+12,244,name)
        c.setFillColor(MUTED); c.setFont("Manrope",6.7); c.drawString(x+12,224,desc)
        variants=next(row[2] for row in COLLECTIONS if row[0]==cid)
        labels=next(row[3] for row in COLLECTIONS if row[0]==cid)
        for i,(v,label) in enumerate(zip(variants,labels)):
            c.setFillColor(HexColor(SWATCH[v])); c.circle(x+16+i*42,180,7,fill=1,stroke=0)
            c.setFillColor(INK); c.setFont("Montserrat",4.6); c.drawCentredString(x+16+i*42,162,label)
        c.setStrokeColor(LINE); c.line(x+12,137,x+223,137)
        c.setFillColor(MUTED); c.setFont("MontserratB",5.4); c.drawString(x+12,118,"GERÇEK QR  /  ÖN + ARKA  /  5 RENK")
    footer(c,9)


def p10(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    heading(c,"RENK KÜTÜPHANESİ","Yirmi seçenek.","Hepsi görünür.")
    c.setFillColor(MUTED); c.setFont("Manrope",7); c.drawString(46,655,"Düz renk kutuları yerine gerçek kart yüzleri ve okunabilir QR kodları.")
    y=527
    for row,(cid,name,variants,labels) in enumerate(COLLECTIONS):
        c.setFillColor(WINE); c.setFont("MontserratB",5.8); c.drawString(46,y+88,f"QR-{row+1:02d}  {name.upper()}")
        for i,(v,label) in enumerate(zip(variants,labels)):
            x=46+i*102; rect(c,x,y,92,78,CREAM,r=5)
            img(c,transparent_single(cid,v),x+15,y+20,62,58)
            c.setFillColor(HexColor(SWATCH[v])); c.circle(x+10,y+10,4,fill=1,stroke=0)
            c.setFillColor(INK); c.setFont("Montserrat",5.2); c.drawString(x+19,y+8,label)
        y-=118
    rect(c,46,54,W-92,50,WINE,r=5)
    c.setFillColor(WHITE); c.setFont("CormorantI",14); c.drawString(64,75,"Renk seçimi yalnızca görünümü değil, deneyimin duygusunu da belirler.")
    footer(c,10)


def p11(c):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    heading(c,"KİŞİSELLEŞTİRME","Kart sizin olur.","QR her zaman görünür kalır.")
    img(c,transparent_single("aurora","rose"),48,228,255,410)
    rect(c,320,165,229,470,PAPER,r=10)
    c.setFillColor(WINE); c.setFont("MontserratB",6); c.drawString(342,600,"KİŞİSELLEŞEN ALANLAR")
    items=[("01","Çiftin isimleri","Hilal & Oğuz"),("02","Tarih","14 Eylül 2026"),("03","Ana mesaj","Bir kare de senden olsun."),("04","Yükleme çağrısı","QR kodu okut ve yükle"),("05","Renk","Gül / Rose"),("06","Fiziksel format","Masa kartı")]
    y=556
    for num,title,value in items:
        c.setFillColor(GOLD); c.setFont("MontserratB",5.6); c.drawString(342,y,num)
        c.setFillColor(INK); c.setFont("Cormorant",12.5); c.drawString(370,y-1,title)
        c.setFillColor(MUTED); c.setFont("Manrope",5.8); c.drawString(370,y-15,value)
        c.setStrokeColor(LINE); c.line(342,y-28,525,y-28); y-=65
    rect(c,46,76,503,58,BURGUNDY,r=5)
    c.setFillColor(WHITE); c.setFont("CormorantI",13); c.drawString(64,99,"Koleksiyonun tasarım sistemi korunur; kişisel bilgiler doğal biçimde yerleşir.")
    footer(c,11)


def p16(c):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    heading(c,"FİZİKSEL ÜRÜN AİLESİ","Üç ölçekte görünürlük.","Tek tasarım dili.")
    c.setFillColor(MUTED); c.setFont("Manrope",7); c.drawString(46,655,"Şeffaf ürün kesitleri sayesinde format, oran ve QR alanı doğrudan karşılaştırılır.")
    cards=[("Mini QR Kart",94,210,"Kişisel masa yerleşimi"),("Masa Kartı",126,280,"Her masada ana yönlendirme"),("Karşılama Tabelası",158,351,"Giriş alanında güçlü ilk temas")]
    xs=[46,218,390]
    for i,(name,wcard,hcard,desc) in enumerate(cards):
        x=xs[i]; rect(c,x,115,159,470,CREAM,r=8)
        img(c,transparent_single("velvet-flow","burgundy"),x+(159-wcard)/2,256,wcard,hcard)
        c.setFillColor(GOLD); c.setFont("MontserratB",5.8); c.drawString(x+17,222,f"0{i+1}")
        c.setFillColor(INK); c.setFont("Cormorant",15.5); c.drawString(x+17,195,name)
        c.setFillColor(MUTED); c.setFont("Manrope",5.8); c.drawString(x+17,176,desc)
        c.setStrokeColor(LINE); c.line(x+17,151,x+142,151)
        c.setFont("MontserratB",5); c.drawString(x+17,134,"QR GÖRÜNÜR  /  BASKIYA UYGUN")
    rect(c,46,54,W-92,39,WINE,r=4)
    c.setFillColor(WHITE); c.setFont("CormorantI",12.5); c.drawString(64,69,"Kesin ölçüler, üretim ve teklif onayında belirlenir.")
    footer(c,16)


def p17(c):
    c.setFillColor(BURGUNDY); c.rect(0,0,W,H,fill=1,stroke=0)
    img(c,ARCHES,315,120,265,650)
    heading(c,"KOLEKSİYON SEÇİMİ","Dört koleksiyon.","Karar vermek artık kolay.",light=True)
    c.setFillColor(Color(1,1,1,alpha=.68)); c.setFont("Manrope",7)
    c.drawString(46,655,"Her kart, arka plansız ve gerçek içeriğiyle gösterilir.")
    positions=[(46,350),(177,350),(46,115),(177,115)]
    for (cid,name,variants,_),(x,y) in zip(COLLECTIONS,positions):
        rect(c,x,y,120,210,"#4A1019",r=7)
        img(c,transparent_single(cid,variants[0]),x+8,y+42,104,150)
        c.setFillColor(WHITE); c.setFont("Cormorant",11); c.drawCentredString(x+60,y+22,name)
    rect(c,326,180,213,145,PAPER,r=9)
    c.setFillColor(WINE); c.setFont("MontserratB",6); c.drawString(348,292,"SEÇİM ÖZETİ")
    c.setFillColor(INK); c.setFont("Cormorant",18); c.drawString(348,257,"Koleksiyon")
    c.setFont("CormorantI",18); c.setFillColor(WINE); c.drawString(348,235,"Renk + format")
    c.setFillColor(MUTED); c.setFont("Manrope",6.3); c.drawString(348,207,"İsim, tarih ve mesajınızla tamamlanır.")
    c.setFillColor(GOLD); c.setFont("MontserratB",6); c.drawString(326,145,"20 RENK  /  ÖN + ARKA  /  GERÇEK QR")
    c.setFillColor(WHITE); c.setFont("CormorantI",15); c.drawString(326,111,"Anılarınız için tasarlandı.")
    footer(c,17,True)


def main():
    register_fonts(); OUT.parent.mkdir(parents=True,exist_ok=True)
    missing=[str(ARCHES)] if not ARCHES.exists() else []
    for cid,_,variants,_ in COLLECTIONS:
        for v in variants:
            for face in ("front","back"):
                p=card_path(cid,v,face)
                if not p.exists(): missing.append(str(p))
    if missing: raise FileNotFoundError("Eksik ürün görselleri:\n"+"\n".join(missing))
    c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1); c.setTitle("ShineQR Product-First Katalog - 7 Sayfa")
    for page in (p7,p8,p9,p10,p11,p16,p17): page(c); c.showPage()
    c.save(); print(OUT)


if __name__=="__main__": main()
