import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4180';
const OUT = process.env.TMPDIR + '/shots';
const email = `lab${Date.now()}@example.com`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));

await page.goto(BASE + '/signup', { waitUntil: 'networkidle' });
await page.fill('#name', 'Rohit Menon');
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 20000 });

await page.goto(BASE + '/lab', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/14-lab-editor.png` });
await page.click('button:has-text("Run")');
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/15-lab-run.png` });
console.log('terminal:', (await page.locator('.terminal').innerText()).slice(0, 160).replace(/\n/g, ' | '));

// exercise with tests
await page.goto(BASE + '/lab?exercise=py-sum-evens', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
console.log("submit present:", await page.locator("button:has-text(\"Submit tests\")").count());
await page.click("button:has-text(\"Submit tests\")");
await page.waitForTimeout(5000);
await page.screenshot({ path: `${OUT}/15b-lab-tests.png`, fullPage: true });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
