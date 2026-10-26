// PDF.js coordinates become screen coordinates, including rotated/cropped pages.
export function detectNameSlot(items, viewport) {
  const placeholder = /^(?:ad\s*(?:və\s*)?soyad|ad[ıi]?\s*(?:və\s*)?soyad[ıi]?|name\s*(?:and\s*)?surname|full\s*name|your\s*name|recipient(?:\s*name)?|\{\{\s*name\s*\}\})$/iu;
  const item = items.find(item => placeholder.test(item.str.trim()));
  if (!item) return null;
  const [a, b, c, d, e, f] = item.transform;
  const size = Math.hypot(c, d) || item.height;
  const length = Math.hypot(a, b) || size;
  const points = [0, 1].flatMap(horizontal => [0, 1].map(vertical => viewport.convertToViewportPoint(
    e + horizontal * item.width * a / length + vertical * size * c / size,
    f + horizontal * item.width * b / length + vertical * size * d / size,
  )));
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const left = Math.max(0, Math.min(...xs) - size * .1), top = Math.max(0, Math.min(...ys) - size * .1);
  const right = Math.min(viewport.width, Math.max(...xs) + size * .1), bottom = Math.min(viewport.height, Math.max(...ys) + size * .3);
  return { x: left / viewport.width, y: top / viewport.height, width: (right-left)/viewport.width, height:(bottom-top)/viewport.height, size };
}
export function sampleColors(canvas, area) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const x = Math.max(0, Math.floor(area.x * canvas.width)), y = Math.max(0, Math.floor(area.y * canvas.height));
  const width = Math.max(1, Math.min(canvas.width-x, Math.ceil(area.width*canvas.width)));
  const height = Math.max(1, Math.min(canvas.height-y, Math.ceil(area.height*canvas.height)));
  const { data } = context.getImageData(x,y,width,height);
  const bins = new Map();
  for(let i=0;i<data.length;i+=4) {
    const color = [data[i],data[i+1],data[i+2]].map(v=>Math.round(v/8)*8).map(v=>Math.min(255,v));
    const key = color.join(','); bins.set(key,(bins.get(key)||0)+1);
  }
  const entries = [...bins].sort((a,b)=>b[1]-a[1]);
  const background = entries[0]?.[0] || '255,255,255';
  const bg = background.split(',').map(Number);
  const foreground = entries.find(([key,count]) => count >= 2 && key.split(',').reduce((sum,v,i)=>sum+Math.abs(Number(v)-bg[i]),0)>120)?.[0] || '0,0,0';
  const hex = key => '#' + key.split(',').map(v=>Number(v).toString(16).padStart(2,'0')).join('');
  return { color: hex(foreground), background: hex(background) };
}
