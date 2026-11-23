import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4180';
const OUT = process.env.TMP + '/shots';
const stamp = Date.now();
const email = `shot${stamp}@example.com`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '/signup');
await page.fill('#name', 'Roadmap Tester');
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForTimeout(2500);
console.log('after signup url:', page.url());

await page.screenshot({ path: `${OUT}/49-after-signup.png`, fullPage: true });
console.log('body snippet:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' | '));
await page.goto(BASE + '/courses/full-stack-development/roadmap');
await page.waitForSelector('text=The stages', { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/50-roadmap.png`, fullPage: true });
console.log('roadmap title:', await page.title());

await page.goto(BASE + '/courses/full-stack-development/start');
await page.waitForSelector('text=How much time each day?', { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/51-start-journey.png`, fullPage: true });

await page.click('button[type=submit]');
await page.waitForURL('**/plan', { timeout: 15000 });
await page.waitForSelector('text=This week', { timeout: 15000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/52-plan.png`, fullPage: true });
console.log('plan url:', page.url());

await page.goto(BASE + '/plan');
await page.waitForSelector('text=Due today or earlier', { timeout: 15000 });
await page.screenshot({ path: `${OUT}/53-today.png`, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/courses/full-stack-development/plan');
await page.waitForSelector('text=This week', { timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/54-plan-mobile.png`, fullPage: true });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
