$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = $PSScriptRoot
$assets = Join-Path $root 'hilal-oguzhan-assets'
$preview = Join-Path $root 'partner-v2-preview'
New-Item -ItemType Directory -Path $assets,$preview -Force | Out-Null
Copy-Item -LiteralPath 'C:/Users/onurt/Downloads/ChatGPT Image 24 Eyl 2026 00_55_19.png' -Destination (Join-Path $assets 'masa-yerlesimi-temsili.png')
Copy-Item -LiteralPath 'C:/Users/onurt/Downloads/WhatsApp Image 2026-09-21 at 15.42.47 (1).jpeg' -Destination (Join-Path $assets 'qr-baski-tasarimi.jpeg')
Copy-Item -LiteralPath 'C:/Users/onurt/Downloads/WhatsApp Image 2026-09-21 at 15.42.47.jpeg' -Destination (Join-Path $assets 'karsilama-karti.jpeg')
function RGB([string]$hex) { return [Convert]::ToInt32($hex.Substring(0,2),16) + 256*[Convert]::ToInt32($hex.Substring(2,2),16) + 65536*[Convert]::ToInt32($hex.Substring(4,2),16) }
$cream=RGB 'FBF7F0'; $ink=RGB '292321'; $red=RGB '9B292E'; $muted=RGB '726760'; $line=RGB 'E5DAD0'; $white=RGB 'FFFFFF'; $rose=RGB 'F2E4DF'
function Rect($s,$x,$y,$w,$h,$color) { $r=$s.Shapes.AddShape(1,$x,$y,$w,$h); $r.Fill.ForeColor.RGB=$color; $r.Line.Visible=0; return $r }
function Txt($s,[string]$t,$x,$y,$w,$h,$size=20,$color=$ink,$bold=$false) {
 $b=$s.Shapes.AddTextbox(1,$x,$y,$w,$h); $b.TextFrame.MarginLeft=0; $b.TextFrame.MarginRight=0; $b.TextFrame.MarginTop=0; $b.TextFrame.MarginBottom=0
 $b.TextFrame.WordWrap=-1; $b.TextFrame.TextRange.Text=$t; $b.TextFrame.TextRange.Font.Name='Aptos'; $b.TextFrame.TextRange.Font.Size=$size; $b.TextFrame.TextRange.Font.Color.RGB=$color; $b.TextFrame.TextRange.Font.Bold=[int]$bold*-1
 return $b
}
function Pic($s,$file,$x,$y,$w,$h) {
 $im=[Drawing.Image]::FromFile($file); $ratio=[Math]::Min($w/$im.Width,$h/$im.Height); $iw=$im.Width*$ratio; $ih=$im.Height*$ratio; $im.Dispose()
 return $s.Shapes.AddPicture($file,0,-1,($x+($w-$iw)/2),($y+($h-$ih)/2),$iw,$ih)
}
function Slide([string]$tag,[string]$title,[string]$sub='') {
 $s=$deck.Slides.Add($deck.Slides.Count+1,12); $s.FollowMasterBackground=0; $s.Background.Fill.ForeColor.RGB=$cream
 $null=Txt $s $tag 42 27 870 20 11 $red $true
 $null=Txt $s $title 42 65 880 85 31 $ink $true
 if($sub){$null=Txt $s $sub 42 142 870 48 16 $muted}
 $null=Rect $s 42 502 876 1 $line
 $null=Txt $s 'ANILAR  /  PARTNERLİK' 42 512 450 16 9 $muted
 $null=Txt $s ($deck.Slides.Count.ToString('00')) 888 512 30 16 9 $muted
 return $s
}
function Table($s,$rows,$x,$y,$widths,$rowH=48,$font=18) {
 for($r=0;$r -lt $rows.Count;$r++) { $cx=$x
  for($c=0;$c -lt $widths.Count;$c++) {
   $bg=$white; $fg=$ink; if($r -eq 0){$bg=$red;$fg=$white}elseif($r%2 -eq 0){$bg=$rose}
   $null=Rect $s $cx ($y+$r*$rowH) $widths[$c] $rowH $bg
   $null=Txt $s ([string]$rows[$r][$c]) ($cx+14) ($y+$r*$rowH+12) ($widths[$c]-24) ($rowH-14) $font $fg ($r -eq 0)
   $cx+=$widths[$c]
  }
 }
}
$app=New-Object -ComObject PowerPoint.Application
try {
 $deck=$app.Presentations.Add(0); $deck.PageSetup.SlideWidth=960; $deck.PageSetup.SlideHeight=540
 $s=Slide 'İLK ORGANİZASYONUMUZDAN PARTNERLİĞE' 'Misafirlerin anıları. İşletmenizin yeni geliri.'
 $null=Txt $s 'ANILAR' 42 177 430 60 48 $red $true
 $null=Txt $s "Hilal & Oğuzhan için QR baskısı hazır.`r`nŞimdi bu deneyimi sizin organizasyonlarınıza taşıyalım." 42 256 365 100 21 $ink
 $null=Rect $s 42 389 365 66 $red
 $null=Txt $s 'Her satışta işletmenize %30 pay' 59 410 338 34 21 $white $true
 $null=Pic $s (Join-Path $assets 'masa-yerlesimi-temsili.png') 432 175 486 275
 $null=Txt $s 'Organizasyon için hazırlanan tasarımların temsili masa yerleşimi.' 442 461 467 24 10 $muted

 $s=Slide 'DENEYİM' 'Telefonlarda kalan anılar, özel bir albümde.' 'Misafirlerin fotoğraf ve videoları organizasyona özel paylaşım sayfasında toplanır.'
 $cards=@(@('01','QR ile ulaş','Misafirler telefonlarından paylaşım sayfasını açar.'),@('02','Kolayca paylaş','Uygulama indirmeden, üyelik açmadan fotoğraf ve video yükler.'),@('03','Anıları sakla','Organizasyon sahibi özel albüme erişir, içerikleri indirir.'))
 for($i=0;$i -lt 3;$i++){ $x=42+$i*299; $null=Rect $s $x 219 277 220 $white; $null=Txt $s $cards[$i][0] ($x+20) 240 237 40 27 $red $true; $null=Txt $s $cards[$i][1] ($x+20) 295 237 37 22 $ink $true; $null=Txt $s $cards[$i][2] ($x+20) 342 237 89 17 $muted }
 $null=Txt $s 'Misafirler diğer kişilerin yüklediği içerikleri görüntülemez.' 42 462 876 25 14 $muted

 $s=Slide 'İLK ORGANİZASYON • HİLAL & OĞUZHAN' 'Fikirden baskıya: ilk QR kartımız hazır.' 'Organizasyona özel hazırlanan QR ve karşılama kartı tasarımları.'
 $null=Rect $s 42 210 428 246 $white; $null=Rect $s 490 210 428 246 $white
 $null=Pic $s (Join-Path $assets 'qr-baski-tasarimi.jpeg') 50 218 412 230
 $null=Pic $s (Join-Path $assets 'karsilama-karti.jpeg') 498 218 412 230
 $null=Txt $s 'QR kartı • Anı yakala, sevgiyi paylaş' 42 467 430 22 14 $red $true
 $null=Txt $s 'Karşılama kartı • Hilal & Oğuzhan' 490 467 428 22 14 $red $true
 $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text='Kurucu QR baskısının çıkarıldığını bildirdi. Gösterilenler baskı tasarımlarıdır; basılmış kartların saha fotoğrafı değildir. Gerçek baskıyı görüşmeye götürüp fiziksel örnek olarak gösterebilirsiniz. Katılım, yükleme adedi veya memnuniyet sonucu henüz sunulmadı. Görseldeki QR hedefi bu çalışma kapsamında doğrulanmadı.'

 $s=Slide 'MASA ÜZERİNDEKİ DENEYİM' 'Organizasyonun tasarımına eşlik eden bir davet.'
 $null=Pic $s (Join-Path $assets 'masa-yerlesimi-temsili.png') 110 151 740 329
 $null=Txt $s 'Temsili masa yerleşimi • Tasarım görselleştirmesidir; gerçekleşmiş etkinlik fotoğrafı değildir.' 42 480 876 19 11 $muted

 $s=Slide 'HİZMET AKIŞI' 'Hazırlıktan albüm teslimine.'
 $steps=@(@('1','Organizasyona özel hazırlık','Paylaşım sayfası, kişisel karşılama ve QR baskısı.'),@('2','Misafirlerden paylaşım','Fotoğraf ve video yükleme; isteğe bağlı isim ve mesaj.'),@('3','Özel albüme erişim','Yetkili kullanıcılar görüntüler ve içerikleri indirir.'))
 for($i=0;$i -lt 3;$i++){ $y=165+$i*87; $null=Rect $s 42 $y 51 51 $red; $null=Txt $s $steps[$i][0] 60 ($y+9) 28 36 25 $white $true; $null=Txt $s $steps[$i][1] 115 $y 780 34 22 $ink $true; $null=Txt $s $steps[$i][2] 115 ($y+37) 780 36 17 $muted }
 $null=Rect $s 42 436 876 51 $rose
 $null=Txt $s 'Organizasyon tarihinden sonra 7 gün yükleme, organizasyon tarihinden itibaren 3 ay saklama. Süre dolmadan indirme yapılır; süre sonunda içerikler kalıcı silinir.' 56 447 844 36 12 $ink

 $s=Slide 'PARTNERLİK MODELİ' 'Siz müşteriye sunun. Hizmet giderleri bize ait.'
 $null=Rect $s 42 170 425 276 $white; $null=Rect $s 491 170 427 276 $rose
 $null=Txt $s '%30' 66 185 365 70 48 $red $true
 $null=Txt $s 'İşletmenizin payı' 66 264 365 35 23 $ink $true
 $null=Txt $s "Hizmeti müşteriye tanıtın.`r`nOrganizasyon bilgilerini koordine edin.`r`nGerçekleşen satıştan pay kazanın." 66 317 368 112 19 $ink
 $null=Txt $s '%70' 515 185 365 70 48 $red $true
 $null=Txt $s 'ANILAR payı' 515 264 365 35 23 $ink $true
 $null=Txt $s "QR baskısı ve teslimat giderleri.`r`nDijital albüm ve teknik altyapı.`r`nHizmet ve teknik destek maliyetleri." 515 317 370 112 19 $ink
 $null=Txt $s 'Paylaşım KDV hariç satış üzerinden yapılır. İşletmenin payından hizmet gideri kesilmez; kendi vergileri işletmeye aittir.' 42 462 876 35 13 $muted

 $s=Slide 'FİYAT SEÇENEKLERİ' 'Her satışın işletmenize katkısı net.' 'Üç fiyat alternatifi; aynı %30 işletme payı.'
 Table $s @(@('Müşteri fiyatı*','KDV hariç satış','İşletmenizin payı'),@('3.750 TL','3.125,00 TL','937,50 TL'),@('5.000 TL','4.166,67 TL','1.250,00 TL'),@('6.250 TL','5.208,33 TL','1.562,50 TL')) 42 218 @(292,292,292) 48 20
 $null=Txt $s '*Müşteri fiyatları %20 KDV dahil varsayılmıştır. Paylar işletmenin kendi vergileri öncesidir. Fiyatlar aynı hizmet kapsamı için alternatiflerdir; nihai fiyat ve kapsam anlaşmada belirlenir.' 42 437 876 55 13 $muted

 $s=Slide '5.000 TL MÜŞTERİ FİYATI ÖRNEĞİ' '50 satışta 62.500 TL işletme payı.'
 $null=Rect $s 42 183 302 231 $red
 $null=Txt $s '1.250 TL' 63 215 263 70 42 $white $true
 $null=Txt $s 'Her ücretli satışta işletmenizin payı' 63 297 260 70 23 $white
 Table $s @(@('Yıllık ücretli satış','İşletme payı'),@('20 organizasyon','25.000 TL'),@('50 organizasyon','62.500 TL'),@('100 organizasyon','125.000 TL')) 372 183 @(273,273) 58 20
 $null=Txt $s 'Örnek satış hacimleridir; satış veya kazanç garantisi değildir. Tutarlar işletmenin kendi vergileri öncesidir.' 42 450 876 43 14 $muted

 $s=Slide 'YILLIK KAZANÇ SEÇENEKLERİ' 'Satış hacminize göre işletme payınız.'
 Table $s @(@('Ücretli satış','3.750 TL fiyat','5.000 TL fiyat','6.250 TL fiyat'),@('20','18.750 TL','25.000 TL','31.250 TL'),@('50','46.875 TL','62.500 TL','78.125 TL'),@('100','93.750 TL','125.000 TL','156.250 TL')) 42 195 @(177,233,233,233) 53 18
 $null=Txt $s 'Yalnızca hizmetin satıldığı organizasyonlar sayılır. Örneğin 100 etkinliğinizin 50''sinde hizmet satılırsa 50 satış satırı geçerlidir. Tutarlar işletmenin %30 payıdır ve kendi vergileri öncesidir.' 42 436 876 56 14 $muted

 $s=Slide 'BİRLİKTE BAŞLAYALIM' 'Bir sonraki organizasyonunuzda ANILAR.' 'Hilal & Oğuzhan için hazırlanan baskıyı görüşmede birlikte inceleyelim.'
 $null=Txt $s "01  Fiziksel QR baskısını inceleyelim.`r`n`r`n02  Ürün demosunu birlikte görelim.`r`n`r`n03  İlk organizasyonun fiyat ve kapsamını belirleyelim." 42 214 470 216 21 $ink $true
 $null=Pic $s (Join-Path $assets 'qr-baski-tasarimi.jpeg') 550 217 368 211
 $null=Txt $s 'Anlaşma başlıkları: baskı adedi ve teslimat, tahsilat/faturalama, işletme payının ödeme zamanı, iptal ve iade.' 42 460 876 34 13 $muted

 $pptPath=Join-Path $root 'ANILAR-Partnerlik-Sunumu-v2.pptx'
 $deck.SaveAs($pptPath,24)
 $deck.SaveAs((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v2.pdf'),32)
 $deck.Export($preview,'PNG',1600,900)
 Write-Output ('Created ' + $deck.Slides.Count + ' slides: ' + $pptPath)
 $deck.Close()
} finally { $app.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null }
