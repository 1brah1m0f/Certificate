import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function setup(page, names = 'Əli Hüseynov') {
  const doc = await PDFDocument.create(); doc.addPage([842, 595]);
  await page.goto('/');
  await page.locator('#template').setInputFiles({ name: 'template.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await doc.save()) });
  await expect(page.locator('#paper')).toBeVisible();
  await page.locator('#names').fill(names);
  await expect(page.locator('#generate')).toBeEnabled();
}
async function downloadBytes(download) { return readFile(await download.path()); }

test('one person: clicking the preview permits decimal coordinates and creates a ZIP', async ({ page }) => {
  await setup(page);
  await page.locator('#paper').click({ position: { x: 123, y: 153 } });
  const validity = await page.locator('#x').evaluate(input => ({ value: Number(input.value), valid: input.checkValidity() }));
  expect(validity.value % 1).not.toBe(0);
  expect(validity.valid).toBe(true);
  await expect(page.locator('#generate')).toBeEnabled();
  const downloaded = page.waitForEvent('download'); await page.locator('#generate').click();
  const archive = await JSZip.loadAsync(await downloadBytes(await downloaded));
  const files = Object.values(archive.files).filter(file => !file.dir);
  expect(files).toHaveLength(1);
  expect(files[0].name).toContain('Əli Hüseynov.pdf');
  expect((await PDFDocument.load(await files[0].async('uint8array'))).getPageCount()).toBe(1);
  await expect(page.locator('#status')).toHaveText('1 sertifikat hazırdır.');
});

test('one person without ZIP downloads a PDF and keeps a retry link', async ({ page }) => {
  await setup(page); await page.locator('#zip').uncheck();
  await page.locator('#x').fill('42.7'); await page.locator('#y').fill('51.3');
  const downloaded = page.waitForEvent('download'); await page.locator('#generate').click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('001-Əli Hüseynov.pdf');
  expect((await PDFDocument.load(await downloadBytes(download))).getPageCount()).toBe(1);
  await expect(page.locator('#results a')).toHaveCount(1);
});

test('invalid fields recover, multiple names yield individual PDFs, keyboard placement is safe', async ({ page }) => {
  await setup(page, 'Aysel Məmmədova\nNərmin Əliyeva');
  await page.locator('#size').fill(''); await expect(page.locator('#generate')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('Görünüş parametrlərini yoxla');
  await page.locator('#size').fill('32'); await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#paper').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#x')).toBeFocused(); await expect(page.locator('#x')).toHaveValue('50');
  await page.locator('#zip').uncheck(); await page.locator('#generate').click();
  await expect(page.locator('#results a')).toHaveCount(2);
  await expect(page.locator('#status')).toHaveText('2 sertifikat hazırdır.');
});
