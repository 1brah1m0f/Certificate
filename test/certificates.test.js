import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { createCertificate, parseNames, fileName } from '../src/certificates.js';
const font = new Uint8Array(await readFile(new URL('../public/certificate-font.ttf', import.meta.url)));

test('creates 30 personalized Unicode PDFs preserving all template pages and ZIP folder', async () => {
  const template = await PDFDocument.create(); template.addPage([842, 595]); template.addPage([595, 842]);
  const original = await template.save();
  const names = parseNames('\nƏli Hüseynov\r\n Aysel Məmmədova \n\n' + Array.from({ length: 28 }, (_, i) => `İştirakçı Şəxs ${i + 1}`).join('\n'));
  assert.equal(names.length, 30);
  const zip = new JSZip();
  for (let i = 0; i < names.length; i++) {
    const output = await createCertificate(original, font, names[i], { page: 2, size: 32, x: .5, y: .5, maxWidth: .8, color: '#173f35' });
    const pdf = await PDFDocument.load(output); assert.equal(pdf.getPageCount(), 2);
    zip.file(`sertifikatlar/${fileName(names[i], i)}`, output);
  }
  const archive = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
  assert.equal(Object.values(archive.files).filter(file => !file.dir).length, 30);
  assert.ok(archive.file('sertifikatlar/001-Əli Hüseynov.pdf'));
});
test('handles rotation, long names, duplicate names and unsafe filenames', async () => {
  for (const angle of [0, 90, 180, 270]) {
    const template = await PDFDocument.create(); template.addPage([842, 595]).setRotation(degrees(angle));
    const output = await createCertificate(await template.save(), font, 'Şəbnəm Əlizadə '.repeat(8), { page: 1, size: 100, x: .5, y: .5, maxWidth: .8, color: '#112233' });
    assert.equal((await PDFDocument.load(output)).getPage(0).getRotation().angle, angle);
  }
  assert.notEqual(fileName('Əli', 0), fileName('Əli', 1));
  assert.equal(fileName('../test:name', 0), '001-.._test_name.pdf');
});
