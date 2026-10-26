import './style.css';
import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { createCertificate, parseNames, fileName } from './certificates.js';
import { FIRETALK } from './firetalk.js';
pdfjs.GlobalWorkerOptions.workerSrc = worker;

document.querySelector('#app').innerHTML = `
<header><a class="brand" href="/" aria-label="FireTalk sertifikat studiyası"><span class="brand-icon">F</span> FireTalk<span class="brand-light"> / sertifikat studiyası</span></a><span class="privacy">● Adlar cihazınızda qalır</span></header>
<main><div class="intro"><p class="eyebrow">FIRETALK · İŞTİRAK SERTİFİKATI</p><h1>Şablon hazırdır.<br>Sadəcə adları əlavə et.</h1><p>Adlar göndərdiyin sertifikatdakı “Ad Soyad” yerinə, tünd göy rəngdə yerləşir.</p></div>
<div class="workspace"><section class="controls" aria-label="Sertifikat hazırlamaq">
<div class="step"><h2><span>01</span> FireTalk şablonu</h2><div class="template-info"><strong>FireTalk iştirak sertifikatı</strong><p>“Sıfırdan Startapa: Qurucunun Hekayəsi”</p><small>Adın yeri, rəngi və qalın şrifti hazır tənzimlənib.</small></div><a class="template-link" href="${import.meta.env.BASE_URL}firetalk-template.pdf" download="FireTalk_Istirak_Sertifikati.pdf">Orijinal şablonu endir ↓</a></div>
<div class="step"><h2><span>02</span> İştirakçıların adları <small id="count">0 nəfər</small></h2><label class="sr-only" for="names">Hər sətirdə bir ad və soyad</label><textarea id="names" rows="7" placeholder="Hər sətirdə bir ad və soyad\n\nAysel Məmmədova\nƏli Hüseynov\nNərmin Əliyeva"></textarea><div class="row"><small>1 nəfər də, bütöv siyahı da olar.</small><label class="text-button" for="names-file">TXT-dən yüklə<input id="names-file" type="file" accept=".txt,text/plain" class="sr-only"></label></div></div>
<div class="export"><h2><span>03</span> Endirmə formatı</h2><label class="check"><input type="checkbox" id="zip" checked><span><strong>ZIP arxivi kimi endir</strong><small>PDF-lər arxivdə bir qovluqda toplanır. ZIP-i söndürsən, ayrıca PDF-lər alacaqsan.</small></span></label><button id="generate" class="primary" disabled>Sertifikatları hazırla <span>↗</span></button><p id="status" role="status" aria-live="polite">FireTalk şablonu yüklənir…</p><button id="retry" class="retry" hidden>Yenidən yüklə</button></div>
</section><section class="preview-section" aria-label="Sertifikat önizləməsi"><div class="preview-heading"><h2>Canlı önizləmə</h2><span id="preview-tag">FIRETALK ŞABLONU</span></div><div class="preview-stage"><div id="empty"><div class="paper-icon">F</div><h3>Sertifikat hazırlanır</h3><p>Şablon bir neçə saniyəyə burada görünəcək.</p></div><div id="paper" hidden><canvas id="canvas"></canvas></div></div><div class="preview-foot"><span id="preview-status" role="status">Şablon yüklənir…</span><span>Azərbaycan hərfləri dəstəklənir</span></div><section id="results" hidden><h2>Sertifikatlar hazırdır</h2><p></p><div id="downloads"></div></section></section></div>
<footer><span>FireTalk · Sertifikat studiyası</span><span>PDF və adlar serverə göndərilmir.</span></footer></main>`;
const $ = id => document.getElementById(id);
let template, fontBytes, busy = false, urls = [], renderVersion = 0, timer;
const names = () => parseNames($('names').value);
function update() {
  const count = names().length;
  $('count').textContent = `${count} nəfər`;
  $('generate').disabled = busy || !template || !count;
}
function clearResults() {
  urls.forEach(URL.revokeObjectURL); urls = [];
  $('downloads').replaceChildren(); $('results').hidden = true;
}
function blobUrl(bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type })); urls.push(url); return url;
}
function addLink(url, filename, title) {
  const link = document.createElement('a'); link.href = url; link.download = filename;
  link.textContent = title; $('downloads').append(link); return link;
}
function download(url, filename) {
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
}
async function loadAsset(path) {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error('Şablon və ya şrift yüklənmədi. İnternet bağlantısını yoxla.');
  return new Uint8Array(await response.arrayBuffer());
}
async function preview() {
  const version = ++renderVersion;
  if (!template) return;
  $('preview-status').textContent = 'Önizləmə yenilənir…';
  let doc;
  try {
    const name = names()[0] || 'Ad Soyad';
    const bytes = await createCertificate(template, fontBytes, name, FIRETALK);
    doc = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1400 / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (version !== renderVersion) return;
    canvas.id = 'canvas'; $('canvas').replaceWith(canvas); $('paper').hidden = false; $('empty').hidden = true;
    $('preview-status').textContent = names().length ? `Önizləmə: ${name}` : 'İlk adı daxil et — nəticəni burada görəcəksən.';
  } catch {
    if (version === renderVersion) $('preview-status').textContent = 'Önizləmə açıla bilmədi. Sertifikatı yenə PDF kimi hazırlaya bilərsən.';
  } finally { await doc?.destroy(); }
}
async function initialize() {
  busy = true; update(); $('retry').hidden = true;
  $('status').textContent = 'FireTalk şablonu yüklənir…';
  try {
    const assets = await Promise.all([loadAsset('firetalk-template.pdf'), loadAsset('firetalk-font.ttf')]);
    [template, fontBytes] = assets;
    $('status').textContent = 'Şablon hazırdır. Adları daxil et və sertifikatları yarat.';
    // Preview is independent: rendering never blocks the Generate button.
    void preview();
  } catch (error) {
    template = undefined; $('status').textContent = error.message; $('retry').hidden = false;
  } finally { busy = false; update(); }
}
function namesChanged() {
  clearResults(); update(); clearTimeout(timer); timer = setTimeout(preview, 250);
  if (template) $('status').textContent = names().length ? 'Adlar hazırdır. Önizləməni yoxlayıb sertifikatları yarat.' : 'Ən azı bir ad və soyad daxil et.';
}
$('names').addEventListener('input', namesChanged);
$('names-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { $('names').value = await file.text(); namesChanged(); }
  catch { $('status').textContent = 'TXT faylı oxunmadı. Adları mətn sahəsinə daxil et.'; }
  finally { event.target.value = ''; }
});
$('retry').addEventListener('click', initialize);
$('generate').addEventListener('click', async () => {
  if (busy || !template || !names().length) return;
  busy = true; update(); clearResults();
  const list = names(), zipped = $('zip').checked;
  const inputs = [...document.querySelectorAll('.controls input,.controls textarea')];
  inputs.forEach(input => input.disabled = true);
  try {
    const zip = zipped ? new JSZip() : null, files = [];
    for (let i = 0; i < list.length; i++) {
      $('status').textContent = `Hazırlanır: ${i + 1} / ${list.length}`;
      const bytes = await createCertificate(template, fontBytes, list[i], FIRETALK);
      const filename = fileName(list[i], i);
      if (zip) zip.file(`FireTalk-sertifikatlar/${filename}`, bytes);
      else files.push({ name: list[i], filename, url: blobUrl(bytes, 'application/pdf') });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (zip) {
      const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      const url = blobUrl(bytes, 'application/zip');
      addLink(url, 'FireTalk-sertifikatlar.zip', 'ZIP arxivini endir ↓'); download(url, 'FireTalk-sertifikatlar.zip');
    } else {
      for (const file of files) addLink(file.url, file.filename, `${file.name} ↓`);
      if (files.length === 1) download(files[0].url, files[0].filename);
      if ('showDirectoryPicker' in window) {
        const button = document.createElement('button'); button.textContent = 'Hamısını qovluğa saxla';
        button.addEventListener('click', async () => {
          try {
            const directory = await window.showDirectoryPicker();
            for (const file of files) {
              const handle = await directory.getFileHandle(file.filename, { create: true });
              const stream = await handle.createWritable(); await stream.write(await (await fetch(file.url)).blob()); await stream.close();
            }
            $('status').textContent = 'Bütün sertifikatlar qovluğa saxlanıldı.';
          } catch (error) { if (error.name !== 'AbortError') $('status').textContent = 'Qovluğa yazmaq alınmadı. PDF-ləri linklərdən endir.'; }
        }); $('downloads').prepend(button);
      }
    }
    $('results').hidden = false;
    $('results').querySelector('p').textContent = zipped ? 'Bütün sertifikatlar FireTalk-sertifikatlar qovluğunda toplandı.' : 'Sertifikatları aşağıdakı linklərdən ayrıca endirə bilərsən.';
    $('status').textContent = `${list.length} sertifikat hazırdır.`;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    clearResults(); $('status').textContent = 'Sertifikat hazırlanmadı. Səhifəni yenilə və yenidən cəhd et.';
  } finally { inputs.forEach(input => input.disabled = false); busy = false; update(); }
});
void initialize();
