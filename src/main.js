import './style.css';
import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { createCertificate, parseNames, fileName } from './certificates.js';
pdfjs.GlobalWorkerOptions.workerSrc = worker;

document.querySelector('#app').innerHTML = `
<header><a class="brand" href="/" aria-label="Sertifikat studiyası ana səhifə"><span class="brand-icon">S</span> sertifikat<span class="brand-light"> / studiya</span></a><span class="privacy">● Fayllarınız cihazınızda qalır</span></header>
<main><div class="intro"><p class="eyebrow">BİR ŞABLON. İSTƏNİLƏN QƏDƏR SERTİFİKAT.</p><h1>Uğurların adı olsun.</h1><p>PDF şablonunu əlavə et, adları yaz, sertifikatları bir dəfəyə hazırla.</p></div>
<div class="workspace"><section class="controls" aria-label="Sertifikat parametrləri">
<div class="step"><h2><span>01</span> Şablonu əlavə et</h2><label class="upload" for="template"><strong id="file-label">↑ PDF şablonunu seç</strong><small>Orijinal dizayn və bütün səhifələr saxlanılır</small><input id="template" type="file" accept="application/pdf,.pdf"></label></div>
<div class="step"><h2><span>02</span> Ad siyahısını daxil et <small id="count">0 nəfər</small></h2><label class="sr-only" for="names">Hər sətirdə bir ad və soyad</label><textarea id="names" rows="6" placeholder="Hər sətirdə bir ad və soyad\n\nAysel Məmmədova\nƏli Hüseynov\nNərmin Əliyeva"></textarea><div class="row"><small>Hər sətir bir sertifikatdır.</small><label class="text-button" for="names-file">TXT-dən yüklə<input id="names-file" type="file" accept=".txt,text/plain" class="sr-only"></label></div></div>
<div class="step"><h2><span>03</span> Adın görünüşünü tənzimlə</h2><p class="hint">Önizləmədə adın yerləşəcəyi yerə kliklə və ya koordinatları dəyiş.</p><div class="fields"><label>Səhifə<select id="page"><option>1</option></select></label><label>Ölçü (pt)<input id="size" type="number" min="8" max="150" value="32"></label><label>Rəng<input id="color" type="color" value="#173f35"></label><label>Üfüqi (%)<input id="x" type="number" step="0.1" min="0" max="100" value="50"></label><label>Şaquli (%)<input id="y" type="number" step="0.1" min="0" max="100" value="50"></label><label>Ad sahəsi (%)<input id="maxWidth" type="number" min="10" max="100" value="80"></label></div></div>
<div class="export"><label class="check"><input type="checkbox" id="zip" checked><span><strong>ZIP arxivi kimi endir</strong><small>Sertifikatlar arxivdə bir qovluqda toplanır.</small></span></label><button id="generate" class="primary" disabled>Sertifikatları hazırla <span>↗</span></button><p id="status" role="status" aria-live="polite">Başlamaq üçün PDF və ad siyahısını əlavə et.</p></div>
</section><section class="preview-section" aria-label="Sertifikat önizləməsi"><div class="preview-heading"><h2>Canlı önizləmə</h2><span id="preview-tag">ŞABLON GÖZLƏNİLİR</span></div><div class="preview-stage"><div id="empty"><div class="paper-icon">✧</div><h3>İlk sertifikat burada görünəcək</h3><p>Şablonu yüklədikdən sonra adın yerini<br>bir kliklə seçə bilərsən.</p></div><button id="paper" hidden aria-label="Adın yerini seçmək üçün sertifikata klikləyin"><canvas id="canvas"></canvas></button></div><div class="preview-foot"><span>↖ Kliklə yerləşdir</span><span>Azərbaycan hərfləri dəstəklənir</span></div><section id="results" hidden><h2>Sertifikatlar hazırdır</h2><p>ZIP seçilməyib. Hər PDF-ni aşağıdan ayrıca endir.</p><div id="downloads"></div></section></section></div>
<footer><span>Sertifikat studiyası</span><span>Şablon səndən. Qalanı bizdən.</span></footer></main>`;
const $ = id => document.getElementById(id);
let template, fontBytes, pageCount = 0, renderVersion = 0, busy = false, urls = [];
const names = () => parseNames($('names').value);
const options = () => ({ page: +$('page').value, size: +$('size').value, color: $('color').value, x: +$('x').value / 100, y: +$('y').value / 100, maxWidth: +$('maxWidth').value / 100 });
const validOptions = () => ['size','x','y','maxWidth'].every(id => $(id).checkValidity() && $(id).value !== '');
function update() {
  const count = names().length;
  $('count').textContent = `${count} nəfər`;
  $('generate').disabled = busy || !template || !count || !validOptions();
  for (const id of ['size', 'x', 'y', 'maxWidth']) $(id).setAttribute('aria-invalid', String(!$(id).checkValidity() || $(id).value === ''));
  if (!busy && !validOptions()) $('status').textContent = 'Görünüş parametrlərini yoxla: ölçü 8–150, koordinatlar 0–100, ad sahəsi 10–100 olmalıdır.';
  else if (!busy && template && count && $('status').textContent.startsWith('Görünüş parametrlərini')) $('status').textContent = 'Parametrlər hazırdır. Sertifikatı yarada bilərsən.';
}
function clearResults() { urls.forEach(URL.revokeObjectURL); urls = []; $('downloads').replaceChildren(); $('results').hidden = true; }
function blobUrl(bytes, type) { const url = URL.createObjectURL(new Blob([bytes], { type })); urls.push(url); return url; }
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
async function getFont() { if (!fontBytes) { const response = await fetch(`${import.meta.env.BASE_URL}certificate-font.ttf`); if (!response.ok) throw new Error('Şrift yüklənmədi.'); fontBytes = new Uint8Array(await response.arrayBuffer()); } return fontBytes; }
async function preview() {
  const version = ++renderVersion;
  if (!template || !validOptions()) return;
  let doc;
  try {
    const bytes = await createCertificate(template, await getFont(), names()[0] || 'Ad Soyad', options());
    doc = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(+$('page').value);
    const viewport = page.getViewport({ scale: Math.min(2, 1400 / page.getViewport({ scale: 1 }).width) });
    const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (version !== renderVersion) return;
    canvas.id = 'canvas'; $('canvas').replaceWith(canvas); $('paper').hidden = false; $('empty').hidden = true; $('preview-tag').textContent = `SƏHİFƏ ${$('page').value} / ${pageCount}`;
  } catch (error) { if (version === renderVersion) $('status').textContent = `Önizləmə alınmadı: ${error.message}`; }
  finally { await doc?.destroy(); }
}
$('template').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  busy = true; update(); $('status').textContent = 'Şablon oxunur…';
  let doc;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    doc = await pdfjs.getDocument({ data: bytes.slice(), password: '' }).promise;
    pageCount = doc.numPages; template = bytes;
    $('page').replaceChildren(...Array.from({ length: pageCount }, (_, i) => new Option(String(i + 1), String(i + 1))));
    $('file-label').textContent = file.name; clearResults(); await preview();
    $('status').textContent = 'Şablon hazırdır. Adları daxil et və yerləşməni yoxla.';
  } catch { $('status').textContent = 'PDF açıla bilmədi. Şifrəsiz, etibarlı PDF seç.'; }
  finally { await doc?.destroy(); busy = false; update(); }
});
let timer;
for (const id of ['names','page','size','color','x','y','maxWidth']) $(id).addEventListener('input', () => { clearResults(); update(); clearTimeout(timer); timer = setTimeout(preview, 200); });
$('names-file').addEventListener('change', async event => { const file = event.target.files[0]; if (file) { $('names').value = await file.text(); clearResults(); update(); preview(); } });
$('paper').addEventListener('click', event => { if (busy) return; if (event.detail === 0) { $('x').focus(); return; } const rect = $('canvas').getBoundingClientRect(); $('x').value = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)).toFixed(1); $('y').value = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)).toFixed(1); clearResults(); update(); preview(); });
$('generate').addEventListener('click', async () => {
  if (busy || !template || !names().length || !validOptions()) { update(); return; }
  busy = true; update(); clearResults();
  const list = names(), settings = options(), source = template.slice(), zipped = $('zip').checked;
  const inputs = [...document.querySelectorAll('.controls input,.controls textarea,.controls select')]; inputs.forEach(input => input.disabled = true);
  try {
    const font = await getFont(), zip = zipped ? new JSZip() : null, files = [];
    for (let i = 0; i < list.length; i++) {
      $('status').textContent = `Hazırlanır: ${i + 1} / ${list.length}`;
      const bytes = await createCertificate(source, font, list[i], settings), filename = fileName(list[i], i);
      if (zip) zip.file(`sertifikatlar/${filename}`, bytes);
      else files.push({ name: list[i], filename, url: blobUrl(bytes, 'application/pdf') });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (zip) { const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }); const url = blobUrl(bytes, 'application/zip'); download(url, 'sertifikatlar.zip'); const link = document.createElement('a'); link.href = url; link.download = 'sertifikatlar.zip'; link.textContent = 'ZIP arxivini yenidən endir ↓'; $('downloads').append(link); }
    else for (const file of files) { const link = document.createElement('a'); link.href = file.url; link.download = file.filename; link.textContent = `${file.name} ↓`; $('downloads').append(link); }
    $('results').hidden = false; $('results').querySelector('p').textContent = zipped ? 'Bütün PDF-lər sertifikatlar qovluğunda toplandı.' : 'Hər PDF-ni ayrıca endir. Brauzer dəstəkləyirsə, hamısını bir qovluğa da saxlaya bilərsən.';
    if (!zipped && 'showDirectoryPicker' in window) { const button = document.createElement('button'); button.textContent = 'Hamısını qovluğa saxla'; button.addEventListener('click', async () => { try { const directory = await window.showDirectoryPicker(); for (const file of files) { const handle = await directory.getFileHandle(file.filename, { create: true }); const stream = await handle.createWritable(); await stream.write(await (await fetch(file.url)).blob()); await stream.close(); } $('status').textContent = 'Bütün sertifikatlar qovluğa saxlanıldı.'; } catch (error) { if (error.name !== 'AbortError') $('status').textContent = 'Qovluğa yazmaq alınmadı. PDF-ləri linklərdən endir.'; } }); $('downloads').prepend(button); }
    if (!zipped && files.length === 1) download(files[0].url, files[0].filename);
    $('status').textContent = `${list.length} sertifikat hazırdır.`;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { clearResults(); $('status').textContent = `Hazırlamaq alınmadı: ${error.message}`; }
  finally { inputs.forEach(input => input.disabled = false); busy = false; update(); }
});
