$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$helperText=[IO.File]::ReadAllText((Join-Path $root 'add-site-slides.ps1'),[Text.Encoding]::UTF8)
$start=$helperText.IndexOf('function RGB')
$end=$helperText.IndexOf('$app=New-Object')
. ([scriptblock]::Create($helperText.Substring($start,$end-$start)))
function Box($s,$x,$y,$w,$h,$color){$r=$s.Shapes.AddShape(1,$x,$y,$w,$h);$r.Fill.ForeColor.RGB=$color;$r.Line.Visible=0}
$preview=Join-Path $root 'partner-v4-preview'
New-Item -ItemType Directory -Path $preview -Force | Out-Null
$app=New-Object -ComObject PowerPoint.Application
try{
 $deck=$app.Presentations.Open((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v3.pptx'),0,0,0)
 $s=Slide 2 'SİSTEMİN AMACI' 'ANILAR nedir, ne yapar?'
 $null=Txt $s 'Misafirlerin gözünden organizasyonun hikâyesini bir araya getirir.' 42 155 876 87 29 $red $true
 $null=Txt $s 'ANILAR; misafirlerin çektiği fotoğraf, video ve mesajları QR kod aracılığıyla organizasyona özel bir dijital albümde toplayan sistemdir.' 42 261 876 90 23 $ink
 Box $s 42 376 876 102 $white
 $null=Txt $s 'Amacımız' 60 391 200 31 20 $red $true
 $null=Txt $s 'Farklı telefonlarda kalan anıları toplama işini kolaylaştırmak; profesyonel çekimleri misafirlerin yakaladığı doğal anlarla tamamlamak.' 60 429 835 48 18 $ink

 $s=Slide 3 'NASIL ÇALIŞIR?' 'Bir QR koddan özel albüme, beş adım.'
 $items=@(@('1','Organizasyona özel sayfa','İsim, tarih, kapak görselleri ve karşılama mesajı hazırlanır.'),@('2','Masada QR kartı','Organizasyona özel bağlantı, tasarıma uygun kartlara basılır.'),@('3','Kolay erişim','Misafirler uygulama indirmeden, üyelik açmadan sayfayı açar.'),@('4','Anı paylaşımı','Fotoğraf ve video yükler; isterse isim ve mesaj ekler.'),@('5','Özel albüm','Organizasyon sahibi ve yetkililer içerikleri görüntüler, indirir.'))
 for($i=0;$i -lt 5;$i++){$y=143+$i*62;Box $s 42 $y 39 39 $red;$null=Txt $s $items[$i][0] 54 ($y+5) 24 30 22 $white $true;$null=Txt $s $items[$i][1] 102 $y 800 28 20 $ink $true;$null=Txt $s $items[$i][2] 102 ($y+29) 800 29 16 $muted}
 $null=Txt $s 'Misafirler diğer yüklemeleri göremez. Albüme organizasyon sahibi, ilgili işletme ve platform yöneticisi erişebilir.' 42 461 876 31 12 $muted

 $s=Slide 4 'SAĞLADIĞI KOLAYLIKLAR' 'Her kullanıcı için daha kolay bir deneyim.'
 $cards=@(@('Organizasyon sahibi','Fotoğraf istemek için insanlara tek tek yazma ihtiyacını azaltır. Paylaşılan anılara tek albümden ulaşır.'),@('Misafir','QR kodu okutur; üyelik ve uygulama gerektirmeden fotoğraf, video ve mesaj paylaşır.'),@('Partner işletme','Müşterisine ek hizmet sunar. Baskı ve teknik hizmet giderlerini üstlenmeden satıştan %30 pay kazanır.'),@('Platform yöneticisi','Organizasyonları, erişimleri ve içerikleri ortak yönetim panelinden takip eder.'))
 for($i=0;$i -lt 4;$i++){$x=42+($i%2)*451;$y=151+[math]::Floor($i/2)*171;Box $s $x $y 425 150 $white;$null=Txt $s $cards[$i][0] ($x+19) ($y+17) 385 33 23 $red $true;$null=Txt $s $cards[$i][1] ($x+19) ($y+62) 385 83 19 $ink}

 $s=Slide 5 'MİSYON VE VİZYON' 'Kolay paylaşım. Birlikte biriken hatıralar.'
 Box $s 42 155 425 289 $white
 Box $s 493 155 425 289 (RGB 'F2E4DF')
 $null=Txt $s 'Misyonumuz' 63 177 382 40 27 $red $true
 $null=Txt $s 'İnsanların özel günlerinde farklı telefonlarda biriken anıları, herkesin kolayca katkıda bulunabildiği özel dijital albümlerde buluşturmak.' 63 236 382 161 23 $ink
 $null=Txt $s 'Vizyonumuz' 514 177 382 40 27 $red $true
 $null=Txt $s 'Düğün, nişan ve diğer özel organizasyonlarda dijital anı paylaşımının doğal bir parçası olmak; partner işletmelerle daha fazla insanın hatıralarını bir araya getirmek.' 514 236 382 185 22 $ink
 $null=Txt $s 'Büyüme hedefimiz: ilk organizasyonlardan öğrenmek, kullanım kolaylığını geliştirmek ve partner ağını genişletmek.' 42 460 876 35 14 $muted

 for($i=1;$i -le $deck.Slides.Count;$i++){
  foreach($shape in $deck.Slides.Item($i).Shapes){if($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1){
   if($shape.Left -gt 870 -and $shape.Top -gt 500 -and $shape.TextFrame.TextRange.Text -match '^\d{2}$'){$shape.TextFrame.TextRange.Text=$i.ToString('00')}
   if($i -ge 2 -and $i -le 5 -and $shape.TextFrame.TextRange.Text -eq 'ANILAR / ÜRÜN EKRANLARI'){$shape.TextFrame.TextRange.Text='ANILAR / SİSTEM VE AMAÇ'}
  }}
 }
 $deck.SaveAs((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v4.pptx'),24)
 $deck.SaveAs((Join-Path $root 'ANILAR-Partnerlik-Sunumu-v4.pdf'),32)
 for($i=2;$i -le 5;$i++){$deck.Slides.Item($i).Export((Join-Path $preview ('Slayt'+$i+'.PNG')),'PNG',1600,900)}
 Write-Output ('Created '+$deck.Slides.Count+' slides; PDF and PowerPoint saved.')
 $deck.Close()
}finally{$app.Quit();[Runtime.InteropServices.Marshal]::ReleaseComObject($app)|Out-Null}
