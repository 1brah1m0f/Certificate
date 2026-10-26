# Sertifikat studiyası

İstənilən şifrəsiz PDF şablonuna ad siyahısını yerləşdirən brauzer tətbiqi. Hazır FireTalk şablonu da saxlanılır. PDF, adlar və əlavə şriftlər serverə göndərilmir.

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

Brauzer testləri sistemdə `/usr/bin/chromium` varsa ondan istifadə edir; başqa mühitdə əvvəlcə `npx playwright install chromium` işlədin. `dist/` statik HTTPS hostinqdə yayımlana bilər. Alt qovluq üçün uyğun Vite `--base` seçin. Şrift və PDF worker tətbiqlə birlikdə verilir; API açarı tələb olunmur.

## Öz PDF şablonun

1. “Öz PDF şablonunu yüklə” ilə faylı seçin, lazım olsa səhifəni dəyişin. Bütün səhifələr çıxış PDF-də saxlanılır; ad yalnız seçilmiş səhifəyə yazılır.
2. PDF-də ayrıca mətn olan “Ad Soyad”, “Full name”, “Name Surname”, “Recipient name” və oxşar ad sahəsi tapılarsa, yer və ölçü avtomatik seçilir. Yazının və fonun rəngi önizləmədən təxmin edilir. Nəticəni yoxlayın.
3. Şəkil/skan formasında PDF və ya başqa ad yeri üçün “Sahəni seç” düyməsini basın, önizləmədə köhnə adın ətrafına çərçivə çəkin. Ad mərkəzlənir və uzun adlar sahəyə sığdırılır. Bu, OCR etmir.
4. Adın rəngini, ölçüsünü, maksimum enini, üfüqi/şaquli faizlərini dəyişin. “Şablondan rəng seç” ilə orijinal rəngdən nümunə götürmək olar. Hazır iki şrift arasından seçim edin və ya uyğun TTF/OTF yükləyin; şrift avtomatik orijinal PDF-dən çıxarılmır.
5. Şablonda köhnə ad varsa, “Seçilmiş sahədə köhnə adı ört” seçimini açın. Çərçivə ilə seçilən sahə fon rəngi ilə örtülür. Klaviatura ilə işləyərkən əvvəlcə koordinatları, maksimum eni və ölçünü daxil edib örtük seçimini açın: örtük həmin ölçülərdən yaranacaq. Naxışlı və şəkilli fon avtomatik bərpa edilmir — belə hallarda adsız şablondan istifadə edin.
6. Hər sətirdə bir iştirakçı daxil edin və ya UTF-8 TXT yükləyin. ZIP açıq olduqda PDF-lər arxivdə qovluğa toplanır; bağlı olduqda ayrı PDF linkləri verilir. Tək PDF birbaşa endirilir. Dəstəklənən brauzerlərdə qovluğa toplu saxlamaq da mümkündür.

Şifrəli və korlanmış PDF-lər qəbul edilmir; əvvəlki işlək şablon saxlanılır. Nəticələr səhifə yenilənəndə silinir. Say limiti yoxdur, amma böyük siyahılar brauzer yaddaşı ilə məhdudlaşır.

## Hazır FireTalk şablonu

“H​azır FireTalk şablonuna qayıt” hazır ad yerləşməsini bərpa edir. İmza və iki loqo istifadəçinin göndərdiyi nümunələr əsasında yenilənib. Şablon və ayrıca loqo/imza faylları `public/` qovluğundadır. `src/firetalk.js` adın dəqiq sahəsini, yerini, rəngini və ölçüsünü saxlayır.

## Yoxlama

`npm test`: 30 Azərbaycan adlı PDF, ZIP, uzun və təkrar adlar, səhifə fırlanması və FireTalk şablonu.

`npm run test:browser`: FireTalk və öz PDF-ni yükləmə, avtomatik ad sahəsi, əllə çərçivə, kəsrli koordinatlar, çoxsəhifəli/fırladılmış PDF, şrift yükləmə, xətadan bərpa, mobil görünüş, ZIP və PDF endirmə.

PDF: pdf-lib, fontkit, PDF.js. ZIP: JSZip. Şrift lisenziyaları: `public/MONTSERRAT-LICENSE.txt`, `public/FONT-LICENSE.txt`.
