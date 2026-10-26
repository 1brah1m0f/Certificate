import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
async function setup(page, names = 'Əli Hüseynov') {
  await page.goto('/');
  await page.locator('#names').fill(names);
  await expect(page.locator('#generate')).toBeEnabled();
}
async function downloadBytes(download) { return readFile(await download.path()); }

test('FireTalk template loads automatically and one person gets a ZIP', async ({ page }) => {
  await setup(page);
  await expect(page.locator('#paper')).toBeVisible();
  await expect(page.locator('#preview-status')).toHaveText('Önizləmə: Əli Hüseynov');
  const downloaded = page.waitForEvent('download'); await page.locator('#generate').click();
  const archive = await JSZip.loadAsync(await downloadBytes(await downloaded));
  const files = Object.values(archive.files).filter(file => !file.dir);
  expect(files).toHaveLength(1);
  expect(files[0].name).toBe('FireTalk-sertifikatlar/001-Əli Hüseynov.pdf');
  const pdf = await PDFDocument.load(await files[0].async('uint8array'));
  expect(pdf.getPage(0).getSize()).toEqual({ width: 1491, height: 1055 });
  await expect(page.locator('#status')).toHaveText('1 sertifikat hazırdır.');
});

test('one person without ZIP downloads a PDF and keeps a retry link', async ({ page }) => {
  await setup(page); await page.locator('#zip').uncheck();
  const downloaded = page.waitForEvent('download'); await page.locator('#generate').click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('001-Əli Hüseynov.pdf');
  expect((await PDFDocument.load(await downloadBytes(download))).getPageCount()).toBe(1);
  await expect(page.locator('#results a')).toHaveCount(1);
});

test('multiple and duplicate names, blank input, TXT import and mobile layout', async ({ page }) => {
  await setup(page); await page.locator('#names').fill(' \n ');
  await expect(page.locator('#generate')).toBeDisabled();
  await page.locator('#names-file').setInputFiles({name:'names.txt',mimeType:'text/plain',buffer:Buffer.from('Aysel Məmmədova\nNərmin Əliyeva\nAysel Məmmədova')});
  await expect(page.locator('#count')).toHaveText('3 nəfər');
  await page.locator('#zip').uncheck(); await page.locator('#generate').click();
  await expect(page.locator('#results a')).toHaveCount(3);
  expect(await page.locator('#results a').evaluateAll(links => new Set(links.map(link => link.download)).size)).toBe(3);
  for(const width of [320,768,1024,1440]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('preview failure does not block generation and asset failures can be retried', async ({ page }) => {
  await page.route('**/firetalk-template.pdf', route => route.fulfill({status:503,body:'Unavailable'}));
  await page.goto('/'); await expect(page.locator('#retry')).toBeVisible();
  await expect(page.locator('#generate')).toBeDisabled();
  await page.unroute('**/firetalk-template.pdf');
  await page.route('**/pdf.worker*.mjs*', route => route.abort());
  await page.locator('#retry').click(); await page.locator('#names').fill('Şəbnəm Əliyeva');
  await expect(page.locator('#generate')).toBeEnabled();
  const downloaded = page.waitForEvent('download'); await page.locator('#generate').click();
  expect((await downloaded).suggestedFilename()).toBe('FireTalk-sertifikatlar.zip');
  await expect(page.locator('#status')).toHaveText('1 sertifikat hazırdır.');
});

async function uploadTemplate(page, { rotated = false, placeholder = true } = {}) {
  const { degrees, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create(); doc.addPage([600,400]);
  const target=doc.addPage([600,400]);
  if(rotated) target.setRotation(degrees(90));
  if(placeholder) target.drawText('Ad Soyad',{x:200,y:200,size:24,color:rgb(.5,0,0)});
  await page.locator('#template').setInputFiles({name:'custom.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});
  await expect(page.locator('#editor')).toBeVisible();
  await expect(page.locator('#generate')).toBeEnabled();
}

test('custom PDF detects placeholder and exports the selected page with all pages preserved',async({page})=>{
  await setup(page);await uploadTemplate(page);
  await page.locator('#page').selectOption('2');
  await expect(page.locator('#cover')).toBeChecked();
  await expect(page.locator('#status')).toContainText('Ad sahəsi tapıldı');
  expect(await page.locator('#color').inputValue()).not.toBe('#000038');
  await page.locator('#zip').uncheck();
  const downloaded=page.waitForEvent('download');await page.locator('#generate').click();
  const pdf=await PDFDocument.load(await downloadBytes(await downloaded));
  expect(pdf.getPageCount()).toBe(2);expect(pdf.getPage(1).getSize()).toEqual({width:600,height:400});
  await page.locator('#firetalk').click();await expect(page.locator('#editor')).toBeHidden();
  await expect(page.locator('#template-name')).toHaveText('Hazır FireTalk şablonu');
});

test('manual rectangle selection, decimal controls and rotated PDF export',async({page})=>{
  await setup(page);await uploadTemplate(page,{rotated:true,placeholder:false});
  await page.locator('#page').selectOption('2');
  await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#select-area').click();
  await expect(page.locator('#preview-status')).toHaveText('Köhnə adın ətrafına çərçivə çək.');
  const rect=await page.locator('#canvas').boundingBox();
  await page.mouse.move(rect.x+rect.width*.2,rect.y+rect.height*.4);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.5,{steps:5});await page.mouse.up();
  await expect(page.locator('#cover')).toBeChecked();
  await page.locator('#x').fill('49.7');await page.locator('#y').fill('45.3');
  await expect(page.locator('#generate')).toBeEnabled();
  const downloaded=page.waitForEvent('download');await page.locator('#generate').click();
  const zip=await JSZip.loadAsync(await downloadBytes(await downloaded));
  const file=Object.values(zip.files).find(f=>!f.dir);expect(file.name).toBe('sertifikatlar/001-Əli Hüseynov.pdf');
  const pdf=await PDFDocument.load(await file.async('uint8array'));expect(pdf.getPage(1).getRotation().angle).toBe(90);
});

test('invalid PDF retains previous template, invalid numbers recover and uploaded font works',async({page})=>{
  await setup(page);await uploadTemplate(page);
  await page.locator('#template').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('broken')});
  await expect(page.locator('#status')).toContainText('Əvvəlki şablon saxlanıldı');
  await page.locator('#size').fill('');await expect(page.locator('#generate')).toBeDisabled();
  await page.locator('#size').fill('32');await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#cover').check();await expect(page.locator('#cover')).toBeChecked();
  await expect(page.locator('#status')).toContainText('Örtük adın koordinatları');
  await page.locator('#font-file').setInputFiles('public/certificate-font.ttf');
  await expect(page.locator('#status')).toHaveText('Öz şriftin tətbiq edildi.');
  await expect(page.locator('#generate')).toBeEnabled();
  for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
