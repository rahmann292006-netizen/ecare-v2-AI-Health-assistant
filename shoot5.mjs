import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4180';
const OUT = process.env.TMPDIR + '/shots';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));

await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.fill('#email', process.env.TEST_EMAIL);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 20000 });

await page.goto(BASE + '/courses/python-programming', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/30-course-checkpoints.png`, fullPage: true });

await page.goto(BASE + '/checkpoints/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/31-checkpoint-intro.png`, fullPage: true });

await page.click('button:has-text("checkpoint")');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/32-checkpoint-question.png` });
// answer two questions then jump around
await page.locator('.option').nth(1).click();
await page.click('button:has-text("Next")');
await page.waitForTimeout(300);
await page.locator('.option').nth(2).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/33-checkpoint-progress.png` });
await page.click('button:has-text("Submit now")');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/34-checkpoint-result.png`, fullPage: true });

await page.goto(BASE + '/checkpoints/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/35-checkpoint-history.png`, fullPage: true });

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE + '/login', { waitUntil: 'networkidle' });
await mp.fill('#email', process.env.TEST_EMAIL);
await mp.fill('#password', 'Correct-horse-battery9');
await mp.click('button[type=submit]');
await mp.waitForURL('**/dashboard', { timeout: 20000 });
await mp.goto(BASE + '/checkpoints/1', { waitUntil: 'networkidle' });
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${OUT}/36-checkpoint-mobile.png`, fullPage: true });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
