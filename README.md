# FireTalk sertifikat studiyası

Göndərilmiş `FireTalk_Istirak_Sertifikati.pdf` şablonuna uyğun toplu sertifikat generatoru. Şablon tətbiqdə hazır açılır: istifadəçi yalnız adları yazır və ZIP və ya ayrıca PDF seçir. Adlar brauzerdə emal olunur, serverə göndərilmir.

## İşə salmaq

Node.js 22.13+ və ya 24:

```sh
npm ci --cache /tmp/certificate-npm-cache
npm run dev -- --port 5173
```

```sh
npm test
npm run test:browser
npm run build
npm run preview -- --port 4173
```

Brauzer testləri sistemdə `/usr/bin/chromium` varsa ondan istifadə edir; başqa mühitdə əvvəlcə `npx playwright install chromium` işlədin. `dist/` statik HTTPS hostinqdə yayımlana bilər. Alt qovluqda hostinq üçün Vite build zamanı uyğun `--base` seçin. Şrift və PDF worker tətbiqlə birlikdə verilir; API açarı tələb olunmur.

## İstifadə

1. Hər sətirdə bir ad və soyad yazın və ya UTF-8 TXT faylı əlavə edin.
2. Birinci şəxsin sertifikatını canlı önizləmədə yoxlayın.
3. ZIP seçimini açıq saxlasanız, bütün PDF-lər `FireTalk-sertifikatlar/` qovluğunda arxivlə endirilir.
4. ZIP-i söndürsəniz, ayrıca PDF linkləri görünür. Tək şəxsin PDF-si birbaşa endirilir. Dəstəklənən brauzerlərdə hamısını seçilmiş qovluğa saxlamaq da mümkündür.

Şablonun ölçüsü 1491 × 1055 PDF nöqtəsidir. Orijinal şablonda “Ad Soyad” yazısı şəklin içindədir. `src/firetalk.js` bu yazının örtüləcək sahəsini və yeni adın yerini, tünd göy rəngini, ölçüsünü müəyyən edir. Yeni ad Montserrat ExtraBold şrifti ilə mərkəzlənir; uzun adlar mövcud xəttin eninə sığdırılır. Şablonun qalan hissəsi orijinal PDF-dən saxlanılır. Koordinat seçimi və əlavə PDF yükləmə tələb olunmur.

Təkrar adlar sıra nömrələri ilə ayrıca fayl alır. Say üçün tətbiq limiti yoxdur; çox böyük siyahılar brauzer yaddaşı ilə məhdudlaşır. Nəticələr səhifə yenilənənədək qalır: endirmələri saxlayın. Önizləmə ayrıca işləyir, onun xətası PDF yaratmağı bloklamır.

## Yoxlama

`npm test`: 30 Azərbaycan adlı sertifikat, ZIP, uzun adlar, səhifə fırlanması və göndərilmiş FireTalk şablonu ilə yaradılma.

`npm run test:browser`: hazır FireTalk şablonu, bir nəfərlə ZIP/PDF endirmə, çoxsaylı və təkrar adlar, TXT idxalı, boş siyahı, mobil görünüş, şablon yükləmə xətasından bərpa və önizləmə olmadan PDF yaradılması.

PDF: pdf-lib, fontkit, PDF.js. ZIP: JSZip. Montserrat: `public/MONTSERRAT-LICENSE.txt`. Ümumi PDF mühərrikinin test şrifti DejaVu Serif: `public/FONT-LICENSE.txt`.
