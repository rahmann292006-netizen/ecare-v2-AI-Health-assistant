import { chromium } from 'playwright-core';
import Database from 'better-sqlite3';

const BASE = 'http://localhost:4180';
const OUT = process.env.TMPDIR + '/shots';
const db = new Database('server/data/lumen.db', { readonly: true });
const email = db.prepare("SELECT email FROM users WHERE email LIKE 'assess%@example.com' ORDER BY id DESC LIMIT 1").get().email;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));

await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 20000 });

const shots = [
  ['/courses/data-structures-algorithms', '40-dsa-course.png', 1200],
  ['/courses/data-structures-algorithms/big-o', '41-dsa-lesson.png', 1600],
  ['/courses/generative-ai/rag-pipeline', '42-genai-rag.png', 1600],
  ['/courses/generative-ai/genai-capstone', '43-genai-capstone.png', 1600],
];

for (const [path, file, wait] of shots) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log('shot', file);
}

// Quiz interaction: answer the DSA knowledge check wrong first, then check the review.
await page.goto(BASE + '/courses/data-structures-algorithms/big-o', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const quiz = page.locator('.quiz-item');
console.log('knowledge check questions on page:', await quiz.count());
await page.locator('.quiz-option').nth(2).click();
await page.locator('.quiz-option').nth(4).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/44-quiz-picked.png`, fullPage: true });
await page.click('button:has-text("Check answers")');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/45-quiz-review.png`, fullPage: true });
console.log('review marks:', await page.locator('.review-mark').count());

// Mobile check of the same lesson.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
await mpage.goto(BASE + '/login', { waitUntil: 'networkidle' });
await mpage.fill('#email', email);
await mpage.fill('#password', 'Correct-horse-battery9');
await mpage.click('button[type=submit]');
await mpage.waitForURL('**/dashboard', { timeout: 20000 });
await mpage.goto(BASE + '/courses/generative-ai/attention', { waitUntil: 'networkidle' });
await mpage.waitForTimeout(1500);
await mpage.screenshot({ path: `${OUT}/46-mobile-genai-lesson.png`, fullPage: true });

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
