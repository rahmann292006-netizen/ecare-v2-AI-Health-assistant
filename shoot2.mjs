import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4180';
const OUT = process.env.TMPDIR + '/shots';
const email = `flow${Date.now()}@example.com`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 160)));

await page.goto(BASE + '/signup', { waitUntil: 'networkidle' });
await page.fill('#name', 'Ayesha Rahman');
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 20000 });
console.log('signed up');

// enrol + complete a lesson through the UI
await page.goto(BASE + '/courses/python-programming', { waitUntil: 'networkidle' });
await page.click('button:has-text("Add to my courses")');
await page.waitForTimeout(1500);
await page.click('a[href*="/courses/python-programming/"]');
await page.waitForURL('**/courses/python-programming/**');
await page.waitForTimeout(1200);
await page.click('text=Mark lesson complete');
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/13-lesson-complete.png`, fullPage: false });

// lab: run code
await page.goto(BASE + '/lab', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/14-lab-editor.png` });
await page.click('text=Run');
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/15-lab-run.png` });
console.log('lab status:', await page.locator('.badge').first().innerText().catch(() => '?'));

// aptitude: practice set
await page.goto(BASE + '/aptitude', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/16-aptitude-setup.png` });
await page.locator('button:has-text("Practise")').last().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/17-aptitude-runner.png` });

// dashboard again after activity
await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/18-dashboard-active.png`, fullPage: true });

// dark theme dashboard
await page.evaluate(() => localStorage.setItem('lumen.theme', 'dark'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/19-dashboard-dark.png`, fullPage: true });

// mobile
const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: `${OUT}/20-mobile-dashboard.png` });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
