import './style.css';
import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { createCertificate, parseNames, fileName } from './certificates.js';
import { FIRETALK } from './firetalk.js';
import { PDFDocument } from 'pdf-lib';
import { detectNameSlot, sampleColors } from './template-tools.js';
pdfjs.GlobalWorkerOptions.workerSrc = worker;

document.querySelector('#app').innerHTML = `
<header><a class="brand" href="/" aria-label="FireTalk sertifikat studiyası"><span class="brand-icon">S</span> Sertifikat<span class="brand-light"> / studiya</span></a><span class="privacy">● Adlar cihazınızda qalır</span></header>
<main><div class="intro"><p class="eyebrow">SƏNİN ŞABLONUN · SƏNİN SERTİFİKATIN</p><h1>Bir şablon.<br>İstənilən qədər sertifikat.</h1><p>PDF şablonunu seç, adın yerini tənzimlə və bütün sertifikatları hazırla.</p></div>
<div class="workspace"><section class="controls" aria-label="Sertifikat hazırlamaq">
<div class="step"><h2><span>01</span> Sertifikat şablonu</h2><label class="upload">Öz PDF şablonunu yüklə<input id="template" type="file" accept=".pdf,application/pdf"></label><button id="firetalk" class="retry" type="button">Hazır FireTalk şablonuna qayıt</button><p id="template-name" class="hint">Hazır FireTalk şablonu</p><div class="template-info"><strong>FireTalk iştirak sertifikatı</strong><p>“Sıfırdan Startapa: Qurucunun Hekayəsi”</p><small>Adın yeri, rəngi və qalın şrifti hazır tənzimlənib.</small></div><a class="template-link" href="${import.meta.env.BASE_URL}firetalk-template.pdf" download="FireTalk_Istirak_Sertifikati.pdf">Orijinal şablonu endir ↓</a></div>
<div class="step"><h2><span>02</span> İştirakçıların adları <small id="count">0 nəfər</small></h2><label class="sr-only" for="names">Hər sətirdə bir ad və soyad</label><textarea id="names" rows="7" placeholder="Hər sətirdə bir ad və soyad\n\nAysel Məmmədova\nƏli Hüseynov\nNərmin Əliyeva"></textarea><div class="row"><small>1 nəfər də, bütöv siyahı da olar.</small><label class="text-button" for="names-file">TXT-dən yüklə<input id="names-file" type="file" accept=".txt,text/plain" class="sr-only"></label></div></div>
<div id="editor" class="step" hidden><h2><span>03</span> Adın yeri və görünüşü</h2><p class="hint" id="editor-hint">“Ad Soyad” ayrıca mətndirsə, yeri avtomatik seçilir. Əks halda “Sahəni seç” düyməsinə basıb köhnə adın ətrafına çərçivə çək.</p><div class="editor-actions"><button id="select-area" type="button">Sahəni seç</button><button id="pick-color" type="button">Şablondan rəng seç</button></div><div class="fields"><label>Səhifə<select id="page"><option value="1">1</option></select></label><label>Şrift<select id="font"><option value="firetalk-font.ttf">Montserrat qalın</option><option value="certificate-font.ttf">DejaVu Serif</option></select></label><label>Ölçü (pt)<input id="size" type="number" min="1" max="300" value="32" step="0.1"></label><label>Üfüqi (%)<input id="x" type="number" min="0" max="100" value="50" step="0.1"></label><label>Şaquli (%)<input id="y" type="number" min="0" max="100" value="50" step="0.1"></label><label>Maks. en (%)<input id="maxWidth" type="number" min="1" max="100" value="80" step="0.1"></label><label>Adın rəngi<input id="color" type="color" value="#000038"></label><label>Örtüyün rəngi<input id="background" type="color" value="#ffffff"></label></div><label class="check cover-check"><input id="cover" type="checkbox"><span><strong>Seçilmiş sahədə köhnə adı ört</strong><small>Bütöv sahə seçilmiş fon rəngi ilə örtülür. Naxışlı fon üçün adsız şablon daha uyğundur.</small></span></label><p class="hint">Dəqiq şrift üçün öz TTF/OTF faylını da seçə bilərsən.</p><label class="font-upload">Şrift faylı<input id="font-file" type="file" accept=".ttf,.otf"></label></div><div class="export"><h2><span>04</span> Endirmə formatı</h2><label class="check"><input type="checkbox" id="zip" checked><span><strong>ZIP arxivi kimi endir</strong><small>PDF-lər arxivdə bir qovluqda toplanır. ZIP-i söndürsən, ayrıca PDF-lər alacaqsan.</small></span></label><button id="generate" class="primary" disabled>Sertifikatları hazırla <span>↗</span></button><p id="status" role="status" aria-live="polite">FireTalk şablonu yüklənir…</p><button id="retry" class="retry" hidden>Yenidən yüklə</button></div>
</section><section class="preview-section" aria-label="Sertifikat önizləməsi"><div class="preview-heading"><h2>Canlı önizləmə</h2><span id="preview-tag">FIRETALK ŞABLONU</span></div><div class="preview-stage"><div id="empty"><div class="paper-icon">F</div><h3>Sertifikat hazırlanır</h3><p>Şablon bir neçə saniyəyə burada görünəcək.</p></div><div id="paper" hidden><canvas id="canvas"></canvas><div id="selection" hidden></div></div></div><div class="preview-foot"><span id="preview-status" role="status">Şablon yüklənir…</span><span>Azərbaycan hərfləri dəstəklənir</span></div><section id="results" hidden><h2>Sertifikatlar hazırdır</h2><p></p><div id="downloads"></div></section></section></div>
<footer><span>FireTalk · Sertifikat studiyası</span><span>PDF və adlar serverə göndərilmir.</span></footer></main>`;
const $ = id => document.getElementById(id);
let template, fontBytes, busy = false, urls = [], renderVersion = 0, timer;
let custom = false, coverArea = null, selecting = false, pickingColor = false, selectionStart = null;
let loadVersion = 0, originalCanvas, displayHeight = 1055;
const fontCache = new Map();
const validSettings = () => !custom || ['size','x','y','maxWidth'].every(id => $(id).value !== '' && $(id).checkValidity());
const settings = () => custom ? { page:+$('page').value, size:+$('size').value, x:+$('x').value/100, y:+$('y').value/100, maxWidth:+$('maxWidth').value/100, color:$('color').value, background:$('background').value, coverArea:$('cover').checked ? coverArea : null } : FIRETALK;
const archiveName = () => custom ? 'sertifikatlar' : 'FireTalk-sertifikatlar';
const names = () => parseNames($('names').value);
function update() {
  const count = names().length;
  $('count').textContent = `${count} nəfər`;
  $('generate').disabled = busy || !template || !count || !validSettings();
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
  if (!template || !validSettings()) return;
  $('paper').classList.toggle('selecting',selecting || pickingColor);
  $('preview-status').textContent = 'Önizləmə yenilənir…';
  let doc;
  try {
    const name = names()[0] || 'Ad Soyad';
    const bytes = selecting || pickingColor ? template.slice() : await createCertificate(template, fontBytes, name, settings());
    doc = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await doc.getPage(custom ? +$('page').value : 1);
    const viewport = page.getViewport({ scale: 1400 / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (version !== renderVersion) return;
    if (selecting || pickingColor) originalCanvas = canvas;
    canvas.id = 'canvas'; $('canvas').replaceWith(canvas); $('paper').hidden = false; $('empty').hidden = true;
    $('preview-status').textContent = selecting ? 'Köhnə adın ətrafına çərçivə çək.' : pickingColor ? 'Şablonda istədiyin rəngə kliklə.' : names().length ? `Önizləmə: ${name}` : 'İlk adı daxil et — nəticəni burada görəcəksən.';
  } catch {
    if (version === renderVersion) $('preview-status').textContent = 'Önizləmə açıla bilmədi. Sertifikatı yenə PDF kimi hazırlaya bilərsən.';
  } finally { await doc?.destroy(); }
}
async function initialize() {
  if (busy) return;
  const version = ++loadVersion;
  busy = true; update(); $('retry').hidden = true;
  $('status').textContent = 'FireTalk şablonu yüklənir…';
  try {
    const assets = await Promise.all([loadAsset('firetalk-template.pdf'), loadAsset('firetalk-font.ttf')]);
    if (version !== loadVersion) return;
    [template, fontBytes] = assets;
    custom = false; selecting = pickingColor = false; coverArea = null; clearResults();
    $('editor').hidden = true; $('selection').hidden = true; $('template-name').textContent = 'Hazır FireTalk şablonu'; $('preview-tag').textContent = 'FIRETALK ŞABLONU';
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
  if (busy || !template || !names().length || !validSettings()) return;
  busy = true; update(); clearResults();
  const list = names(), zipped = $('zip').checked, options = settings(), archive = archiveName();
  const inputs = [...document.querySelectorAll('.controls input,.controls textarea,.controls select,.controls button')];
  inputs.forEach(input => input.disabled = true);
  try {
    const zip = zipped ? new JSZip() : null, files = [];
    for (let i = 0; i < list.length; i++) {
      $('status').textContent = `Hazırlanır: ${i + 1} / ${list.length}`;
      const bytes = await createCertificate(template, fontBytes, list[i], options);
      const filename = fileName(list[i], i);
      if (zip) zip.file(`${archive}/${filename}`, bytes);
      else files.push({ name: list[i], filename, url: blobUrl(bytes, 'application/pdf') });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (zip) {
      const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      const url = blobUrl(bytes, 'application/zip');
      addLink(url, `${archive}.zip`, 'ZIP arxivini endir ↓'); download(url, `${archive}.zip`);
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
    $('results').querySelector('p').textContent = zipped ? `Bütün sertifikatlar ${archive} qovluğunda toplandı.` : 'Sertifikatları aşağıdakı linklərdən ayrıca endirə bilərsən.';
    $('status').textContent = `${list.length} sertifikat hazırdır.`;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    clearResults(); $('status').textContent = 'Sertifikat hazırlanmadı. Səhifəni yenilə və yenidən cəhd et.';
  } finally { inputs.forEach(input => input.disabled = false); busy = false; update(); }
});

function schedulePreview() {
  clearResults(); update(); clearTimeout(timer);
  if (!validSettings()) $('status').textContent = 'Ölçü və koordinat xanalarındakı rəqəmləri yoxla.';
  timer = setTimeout(preview, 200);
}
function applyArea(area, size) {
  coverArea = area;
  $('x').value = ((area.x + area.width/2)*100).toFixed(1);
  $('y').value = ((area.y + area.height/2)*100).toFixed(1);
  $('maxWidth').value = Math.max(1,Math.min(100,area.width*100)).toFixed(1);
  $('size').value = Math.min(300,Math.max(1,size || area.height*displayHeight*.65)).toFixed(1);
  $('cover').checked = true;
}
async function inspectPage() {
  const version = ++renderVersion;
  let doc;
  try {
    doc = await pdfjs.getDocument({data:template.slice(),password:''}).promise;
    const page = await doc.getPage(+$('page').value), viewport = page.getViewport({scale:1});
    const content = await page.getTextContent();
    if (version !== renderVersion) return;
    displayHeight = viewport.height;
    const area = detectNameSlot(content.items,viewport);
    coverArea = null; $('cover').checked = false;
    selecting = pickingColor = false; $('selection').hidden = true;
    if(area) {
      applyArea(area,area.size);
      const canvas = document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      if(version !== renderVersion) return;
      const colors = sampleColors(canvas,area); $('color').value=colors.color; $('background').value=colors.background;
      $('status').textContent = 'Ad sahəsi tapıldı. Rəng və yerləşməni önizləmədə yoxla.';
    } else $('status').textContent = 'Ad sahəsini seç: “Sahəni seç” düyməsinə basıb şablondakı adın ətrafına çərçivə çək.';
  } catch { $('status').textContent = 'Avtomatik seçim mümkün olmadı. Adın yerini “Sahəni seç” ilə təyin et.'; }
  finally { await doc?.destroy(); }
  update(); void preview();
}
$('template').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file || busy) return;
  ++loadVersion; ++renderVersion; busy = true; update();
  $('status').textContent = 'PDF yoxlanılır…';
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await PDFDocument.load(bytes);
    const font = await loadAsset('firetalk-font.ttf');
    template = bytes; fontBytes = font; custom = true; clearResults();
    $('font').value = 'firetalk-font.ttf';
    $('page').replaceChildren(...Array.from({length:doc.getPageCount()},(_,i)=>new Option(String(i+1),String(i+1))));
    $('template-name').textContent = file.name; $('preview-tag').textContent = 'ÖZ PDF ŞABLONUN'; $('editor').hidden = false; $('retry').hidden = true;
    $('size').value='32'; $('x').value='50'; $('y').value='50'; $('maxWidth').value='80';
    await inspectPage();
  } catch { $('status').textContent = 'PDF açıla bilmədi. Şifrəsiz, etibarlı PDF seç. Əvvəlki şablon saxlanıldı.'; }
  finally { busy = false; event.target.value=''; update(); }
});
$('firetalk').addEventListener('click', initialize);
$('page').addEventListener('change', async () => { if(busy) return; busy=true; clearResults(); update(); try { await inspectPage(); } finally { busy=false; update(); } });
for(const id of ['size','x','y','maxWidth','color','background','cover']) $(id).addEventListener('input',schedulePreview);
$('cover').addEventListener('change', () => { if($('cover').checked && !coverArea && validSettings()) { const width=+$('maxWidth').value/100, height=Math.min(1,+$('size').value*1.4/displayHeight); coverArea={x:Math.max(0,Math.min(1-width,+$('x').value/100-width/2)),y:Math.max(0,Math.min(1-height,+$('y').value/100-height/2)),width,height}; schedulePreview(); $('status').textContent='Örtük adın koordinatları, ölçüsü və maksimum eninə uyğun yaradıldı.'; } });
$('font').addEventListener('change', async () => {
  if(busy) return; busy=true; update();
  try { const path=$('font').value; if(!fontCache.has(path)) fontCache.set(path,await loadAsset(path)); fontBytes=fontCache.get(path); schedulePreview(); }
  catch { $('status').textContent='Şrift yüklənmədi. Əvvəlki şrift saxlanıldı.'; }
  finally { busy=false; update(); }
});
$('font-file').addEventListener('change',async event=>{
  const file=event.target.files[0]; if(!file || busy) return;
  busy=true; update();
  try {
    const bytes=new Uint8Array(await file.arrayBuffer());
    await createCertificate(template,bytes,names()[0]||'Əli Şəbnəm',settings());
    fontBytes=bytes; clearResults(); void preview(); $('status').textContent='Öz şriftin tətbiq edildi.';
  } catch { $('status').textContent='Şrift açıla bilmədi. Etibarlı TTF və ya OTF faylı seç.'; }
  finally { busy=false; event.target.value=''; update(); }
});
$('select-area').addEventListener('click',()=>{ if(busy)return; selecting=!selecting; pickingColor=false; $('selection').hidden=true; void preview(); });
$('pick-color').addEventListener('click',()=>{ if(busy)return; pickingColor=!pickingColor; selecting=false; $('selection').hidden=true; void preview(); });
function pointerPosition(event) {
  const rect=$('canvas').getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};
}
function selectionArea(end) {return {x:Math.min(selectionStart.x,end.x),y:Math.min(selectionStart.y,end.y),width:Math.abs(end.x-selectionStart.x),height:Math.abs(end.y-selectionStart.y)};}
$('paper').addEventListener('pointerdown',event=>{
  if(busy || !custom || (!selecting && !pickingColor) || originalCanvas !== $('canvas')) return;
  if(pickingColor) {
    const pos=pointerPosition(event), canvas=$('canvas');
    const pixel=canvas.getContext('2d').getImageData(Math.min(canvas.width-1,Math.floor(pos.x*canvas.width)),Math.min(canvas.height-1,Math.floor(pos.y*canvas.height)),1,1).data;
    $('color').value='#'+[...pixel].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''); pickingColor=false; schedulePreview(); return;
  }
  event.preventDefault(); selectionStart=pointerPosition(event); $('paper').setPointerCapture(event.pointerId);
});
$('paper').addEventListener('pointermove',event=>{
  if(!selectionStart) return;
  const area=selectionArea(pointerPosition(event)), box=$('selection'); box.hidden=false;
  Object.assign(box.style,{left:`${area.x*100}%`,top:`${area.y*100}%`,width:`${area.width*100}%`,height:`${area.height*100}%`});
});
$('paper').addEventListener('pointerup',event=>{
  if(!selectionStart) return;
  const area=selectionArea(pointerPosition(event)); selectionStart=null; $('selection').hidden=true;
  if(area.width<.005 || area.height<.005) { $('status').textContent='Sahə seçmək üçün adın ətrafına çərçivə çək.'; return; }
  applyArea(area); const colors=sampleColors($('canvas'),area); $('color').value=colors.color; $('background').value=colors.background;
  selecting=false; schedulePreview(); $('status').textContent='Ad sahəsi seçildi. Önizləməni yoxla; rəngi və ölçünü dəyişə bilərsən.';
});
$('paper').addEventListener('pointercancel',()=>{ selectionStart=null; $('selection').hidden=true; });
void initialize();
