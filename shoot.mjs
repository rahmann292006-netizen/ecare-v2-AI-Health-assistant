import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4180';
const OUT = process.env.TMPDIR + '/shots';
const email = `preview${Date.now()}@example.com`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));

async function shot(path, name, opts = {}) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
  console.log('shot', name, '->', path);
}

// landing (light)
await shot('/', '01-landing-light');

// signup
await page.goto(BASE + '/signup', { waitUntil: 'networkidle' });
await page.fill('#name', 'Ayesha Rahman');
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.fill('#goal', 'Backend engineering and databases');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/02-dashboard-light.png`, fullPage: true });
console.log('dashboard ok');

// dark theme
await page.evaluate(() => { localStorage.setItem('lumen.theme', 'dark'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/03-dashboard-dark.png`, fullPage: true });

await page.evaluate(() => { localStorage.setItem('lumen.theme', 'light'); });

await shot('/courses', '04-courses', { full: true });
await page.goto(BASE + '/courses/python-programming', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/05-course.png`, fullPage: true });
const firstLesson = await page.locator('a[href*="/courses/python-programming/"]').first().getAttribute('href');
await shot(firstLesson, '06-lesson', { full: true });
await shot('/lab', '07-lab');
await shot('/tutor', '08-tutor');
await shot('/community', '09-community');
await shot('/aptitude', '10-aptitude');
await shot('/analytics', '11-analytics');
await shot('/settings', '12-settings', { full: true });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
