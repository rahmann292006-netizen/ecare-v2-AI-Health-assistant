import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const OUT = `${process.env.TMP}/shots`;
const BASE = 'http://localhost:4180';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/80-live-landing.png` });
console.log('landing:', await p.title());
const email = `live-${Date.now()}@example.com`;
await p.goto(BASE + '/signup');
await p.fill('#name', 'Live Check');
await p.fill('#email', email);
await p.fill('#password', 'Correct-horse-battery9');
await p.click('button[type=submit]');
await p.waitForURL(/dashboard|courses/, { timeout: 20000 });
await p.waitForTimeout(1000);
await p.screenshot({ path: `${OUT}/81-live-dashboard.png` });
for (const path of ['/courses', '/events', '/courses/python-programming', '/courses/python-programming/roadmap', '/plan', '/notifications']) {
  const r = await p.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  const text = (await p.locator('body').innerText()).slice(0, 60).replace(/\s+/g, ' ');
  console.log(path, r.status(), '|', text);
}
await b.close();
