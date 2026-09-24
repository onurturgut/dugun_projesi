$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=$PSScriptRoot
$captures=Join-Path $root 'site-captures'
$preview=Join-Path $root 'partner-v3-preview'
New-Item -ItemType Directory -Path $preview -Force | Out-Null
function RGB([string]$hex){return [Convert]::ToInt32($hex.Substring(0,2),16)+256*[Convert]::ToInt32($hex.Substring(2,2),16)+65536*[Convert]::ToInt32($hex.Substring(4,2),16)}
$cream=RGB 'FBF7F0';$ink=RGB '292321';$red=RGB '9B292E';$muted=RGB '726760';$line=RGB 'E5DAD0';$white=RGB 'FFFFFF'
function Txt($s,[string]$t,$x,$y,$w,$h,$size=20,$color=$ink,$bold=$false){
 $b=$s.Shapes.AddTextbox(1,$x,$y,$w,$h);$b.TextFrame.MarginLeft=0;$b.TextFrame.MarginRight=0;$b.TextFrame.MarginTop=0;$b.TextFrame.MarginBottom=0;$b.TextFrame.WordWrap=-1
 $b.TextFrame.TextRange.Text=$t;$b.TextFrame.TextRange.Font.Name='Aptos';$b.TextFrame.TextRange.Font.Size=$size;$b.TextFrame.TextRange.Font.Color.RGB=$color;$b.TextFrame.TextRange.Font.Bold=[int]$bold*-1;return $b
}
function Pic($s,$name,$x,$y,$w,$h){
 $file=Join-Path $captures $name;$im=[Drawing.Image]::FromFile($file);$ratio=[Math]::Min($w/$im.Width,$h/$im.Height);$iw=$im.Width*$ratio;$ih=$im.Height*$ratio;$im.Dispose()
 return $s.Shapes.AddPicture($file,0,-1,($x+($w-$iw)/2),($y+($h-$ih)/2),$iw,$ih)
}
function Slide($index,[string]$tag,[string]$title){
 $s=$deck.Slides.Add($index,12);$s.FollowMasterBackground=0;$s.Background.Fill.ForeColor.RGB=$cream
 $null=Txt $s $tag 42 27 876 20 11 $red $true
 $null=Txt $s $title 42 64 876 66 30 $ink $true
 $r=$s.Shapes.AddShape(1,42,502,876,1);$r.Fill.ForeColor.RGB=$line;$r.Line.Visible=0
 $null=Txt $s 'ANILAR / ÜRÜN EKRANLARI' 42 512 700 16 9 $muted
 $null=Txt $s $index.ToString('00') 888 512 30 16 9 $muted
 return $s
}
$app=New-Object -ComObject PowerPoint.Application
try{
 $deck=$app.Presentations.Open((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v2.pptx'),0,0,0)
 $s=Slide 6 'ÜRÜNÜ TANIYIN' 'Baskıdan dijital deneyime.'
 $null=Pic $s '01-anasayfa-desktop.png' 42 139 522 353
 $null=Txt $s 'ANILAR ana sayfası' 590 164 320 43 25 $red $true
 $null=Txt $s "Hizmeti tek bakışta anlatan karşılama.`r`n`r`nÖrnek organizasyon sayfasına doğrudan erişim.`r`n`r`nMasa kartı ile başlayan paylaşım deneyimi." 590 222 317 225 21 $ink
 $null=Txt $s 'Çalışan yerel uygulamadan gerçek ekran görüntüsü • Eylül 2026' 590 456 324 34 11 $muted

 $s=Slide 7 'MİSAFİR DENEYİMİ • HİLAL & OĞUZHAN' 'QR koddan kişisel paylaşım sayfasına.'
 $null=Pic $s '03-misafir-mobil.png' 46 136 177 351
 $null=Pic $s '12-yukleme-formu.png' 250 136 177 351
 $null=Txt $s 'Telefonda birkaç adım' 463 161 433 42 25 $red $true
 $null=Txt $s "Çifte özel kapak ve karşılama.`r`n`r`nİsteğe bağlı isim ve mesaj.`r`n`r`nKameradan veya galeriden fotoğraf / video seçimi." 463 222 421 213 21 $ink
 $null=Txt $s '390 px mobil görünüm • Yerel uygulama ekranları. Bu incelemede dosya yüklenmedi.' 463 453 431 37 11 $muted

 $s=Slide 8 'ALBÜM YÖNETİMİ' 'İçerikler tek panelde, erişim yetkililerde.'
 $null=Pic $s '07-album-desktop.png' 42 148 608 325
 $null=Pic $s '10-album-mobil.png' 728 148 161 325
 $null=Txt $s 'Fotoğraf / video filtreleri, arama ve indirme araçları.' 42 477 660 20 12 $ink
 $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text='Bu görüntüler yerel uygulamada platform yöneticisi oturumundan alındı. Partner hesabı ekranı olarak sunulmamalıdır. Görünen mevcut yüklemeler, organizasyon sonrası katılım veya başarı sonucu değildir. Fotoğraf filtresi ile eşleşen içerik sayısı 10 olarak gözlendi. İndirme ve yükleme işlemleri bu incelemede çalıştırılmadı.'
 $null=Txt $s 'Yerel yönetici görünümü; mevcut içerikler etkinlik sonucu değildir.' 42 120 876 20 10 $muted

 $s=Slide 9 'PAYLAŞIM VE QR' 'Her organizasyona özel paylaşım araçları.'
 $null=Pic $s '09-paylasim-qr.png' 42 136 581 350
 $null=Txt $s 'Tek yerden yönetim' 646 160 272 38 24 $red $true
 $null=Txt $s "Misafir bağlantısı.`r`n`r`nPNG / SVG QR seçenekleri.`r`n`r`nMisafir sayfasına geçiş." 646 220 272 191 21 $ink
 $null=Txt $s 'Yerel önizleme ekranı. Buradaki QR localhost adresine gider; görüşmede dağıtılacak canlı QR değildir.' 646 429 272 62 11 $muted
 $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text='Ekrandaki QR yerel uygulamanın APP_URL ayarı nedeniyle localhost adresini taşır. Basılmış kartın QR hedefinin aynı olduğu iddia edilmez. Canlı ürün demosu ve basılı QR hedefi ayrıca doğrulanmalıdır.'

 for($i=1;$i -le $deck.Slides.Count;$i++){
  foreach($shape in $deck.Slides.Item($i).Shapes){if($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1){if($shape.Left -gt 870 -and $shape.Top -gt 500 -and $shape.TextFrame.TextRange.Text -match '^\d{2}$'){$shape.TextFrame.TextRange.Text=$i.ToString('00')}}}
 }
 $deck.SaveAs((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v3.pptx'),24)
 $deck.SaveAs((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v3.pdf'),32)
 $deck.Export($preview,'PNG',1600,900)
 Write-Output ('Created '+$deck.Slides.Count+' slides.')
 $deck.Close()
}finally{$app.Quit();[Runtime.InteropServices.Marshal]::ReleaseComObject($app)|Out-Null}
