import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export function parseNames(text) {
  return text.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
}
export function fileName(name, index) {
  return `${String(index + 1).padStart(3, '0')}-${name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100)}.pdf`;
}
export async function createCertificate(template, fontBytes, name, options) {
  const doc = await PDFDocument.load(template);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const page = doc.getPage(options.page - 1);
  if (options.replaceArea) {
    page.drawRectangle({ ...options.replaceArea, color: rgb(1, 1, 1), borderWidth: 0 });
  }
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  const { width, height } = page.getSize();
  const visibleWidth = angle === 90 || angle === 270 ? height : width;
  const visibleHeight = angle === 90 || angle === 270 ? width : height;
  const size = Math.min(options.size, visibleWidth * options.maxWidth / font.widthOfTextAtSize(name, 1));
  const textWidth = font.widthOfTextAtSize(name, size);
  const x = Math.max(0, Math.min(visibleWidth - textWidth, options.x * visibleWidth - textWidth / 2));
  const y = visibleHeight * (1 - options.y) - size * 0.35;
  const positions = { 0: [x, y], 90: [width - y, x], 180: [width - x, height - y], 270: [y, height - x] };
  const [px, py] = positions[angle] ?? positions[0];
  const hex = options.color.replace('#', '');
  page.drawText(name, { x: px, y: py, size, font, rotate: degrees(angle), color: rgb(...[0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)) });
  return doc.save();
}
