# Sertifikat studiyası

PDF şablonu və ad siyahısından toplu sertifikat hazırlayan, Azərbaycan dilində brauzer tətbiqi. Fayllar serverə göndərilmir.

## İşə salmaq

Node.js 22.13+ (yaxud 24) tələb olunur.

```sh
npm ci --cache /tmp/certificate-npm-cache
npm run dev -- --port 5173
```

```sh
npm test
npm run build
npm run preview -- --port 4173
```

`dist/` istənilən statik HTTPS hostinqdə yayımlana bilər. PDF worker və şrift tətbiqlə birlikdə verilir; CDN və API açarı tələb olunmur.

## İstifadə

1. Şifrəsiz PDF şablonunu seçin. Ad üçün boş sahəsi olan şablon istifadə edin; mövcud mətn avtomatik silinmir.
2. Hər sətirdə bir ad daxil edin və ya UTF-8 TXT faylı yükləyin. Təkrar adlar ayrıca sertifikat yaradır.
3. Səhifəni seçin, önizləmədə adın mərkəzinə klikləyin. Klaviatura ilə üfüqi/şaquli faizləri də dəyişmək olar. Şriftin ölçüsü, rəngi və maksimum ad sahəsi tənzimlənir. Uzun adlar sahəyə sığacaq qədər kiçildilir.
4. ZIP seçildikdə bütün PDF-lər `sertifikatlar/` qovluğunda arxivlənir. Seçilmədikdə hər sertifikat üçün ayrıca endirmə linki verilir. Qovluq seçmə API-sini dəstəkləyən brauzerlərdə bütün PDF-ləri seçilmiş qovluğa saxlamaq da mümkündür; bu imkan HTTPS və ya localhost tələb edir.

Orijinal PDF-nin bütün səhifələri saxlanılır, ad yalnız seçilmiş səhifəyə yazılır. Fayl adları sıra nömrəsi daşıyır; eyni adlı şəxslər bir-birinin faylını əvəz etmir. Say üçün tətbiq limiti yoxdur, amma çox böyük şablon və siyahılar brauzerin yaddaşı ilə məhdudlaşır. Hazırlanmış nəticələr səhifə yenilənəndə silinir; endirmələri əvvəlcədən saxlayın.

## Yoxlama

`npm test` 30 Azərbaycan adlı, çoxsəhifəli sertifikatın yaradılmasını, ZIP qovluğunun tərkibini, fırladılmış səhifələri, uzun və təkrar adları yoxlayır. Brauzerdə real PDF şablonu ilə önizləmə və endirmə də yoxlanmalıdır.

PDF emalı: pdf-lib, fontkit və PDF.js. ZIP: JSZip. Şrift: DejaVu Serif (`public/FONT-LICENSE.txt`).
