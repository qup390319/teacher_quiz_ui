import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../docs/系統開發人員架構圖.svg');
const outPath = resolve(__dirname, '../docs/系統開發人員架構圖.png');

const svg = readFileSync(svgPath, 'utf-8');
const W = 680, H = 620, SCALE = 3;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
await page.setContent(
  `<!DOCTYPE html><html><head><meta charset="utf-8">
   <style>html,body{margin:0;padding:0}</style></head>
   <body>${svg}</body></html>`,
  { waitUntil: 'networkidle0' }
);
const el = await page.$('svg');
await el.screenshot({ path: outPath, omitBackground: false });
await browser.close();
console.log('PNG written:', outPath);
