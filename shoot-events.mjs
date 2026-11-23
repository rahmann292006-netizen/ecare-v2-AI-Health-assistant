/** Screenshots of the events area: list, detail, quiz grading, code grading, leaderboard. */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = `${process.env.TMP}/shots`;
const BASE = 'http://127.0.0.1:4180';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));

const email = `events-${Date.now()}@example.com`;
await page.goto(`${BASE}/signup`);
await page.fill('#name, #name', 'Aisha Verma').catch(() => {});
await page.fill('#email', email);
await page.fill('#password', 'Correct-horse-battery9');
await page.click('button[type=submit]');
await page.waitForURL(/dashboard|courses/, { timeout: 20000 });
console.log('signed up');

// list
await page.goto(`${BASE}/events`);
await page.waitForSelector('text=Events', { timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/70-events.png`, fullPage: false });
console.log('list ok');

// the quiz event: register, then answer one question
await page.goto(`${BASE}/events/python-placement-quiz-1`);
await page.waitForSelector('text=Python Placement Quiz', { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/71-event-detail.png` });

const register = page.locator('button:has-text("Register for this event"), button:has-text("Join now and start")');
if (await register.count()) {
  await register.click();
  await page.waitForTimeout(1200);
}
console.log('registered:', await page.locator('text=You are registered').count());

// force the event live so the answering flow can be photographed
const { default: Database } = await import('better-sqlite3');
const db = new Database('server/data/lumen.db');
db.prepare("UPDATE competitions SET status='live', starts_at=?, ends_at=? WHERE slug='python-placement-quiz-1'").run(
  new Date(Date.now() - 3600_000).toISOString(),
  new Date(Date.now() + 3600_000).toISOString(),
);
await page.reload();
await page.waitForSelector('text=What is the value of', { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/72-event-quiz.png` });

// answer wrongly, then correctly
// a fresh learner each run, so no earlier answer is stored for this question
db.prepare('DELETE FROM competition_submissions WHERE competition_id = 1 AND user_id = (SELECT id FROM users WHERE email = ?)').run(email);
// the correct option is 0 for this question, so pick B to show the wrong-answer path
const opt = page.locator('.option').nth(1);
await opt.scrollIntoViewIfNeeded();
await opt.click();
await page.waitForTimeout(250);
console.log('selected:', await page.locator('.option.is-selected').count());
const submitBtn = page.locator('button:has-text("Submit answer")');
console.log('submit disabled?', await submitBtn.isDisabled());
await submitBtn.click();
await page.waitForTimeout(4000);
console.log('notices:', await page.locator('.notice').allInnerTexts());
await page.waitForSelector('text=Not quite', { timeout: 15000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/73-event-quiz-graded.png` });
await page.locator('.option').first().click();
await page.waitForTimeout(250);
await page.locator('button:has-text("Submit")').click();
await page.waitForSelector('text=Correct.', { timeout: 15000 });
await page.waitForTimeout(400);

// the code event: register, submit a solution
db.prepare("UPDATE competitions SET status='live', starts_at=?, ends_at=? WHERE slug='dsa-sprint-autumn'").run(
  new Date(Date.now() - 3600_000).toISOString(),
  new Date(Date.now() + 3600_000).toISOString(),
);
await page.goto(`${BASE}/events/dsa-sprint-autumn`);
await page.waitForSelector('text=DSA Sprint', { timeout: 15000 });
const reg2 = page.locator('button:has-text("Register for this event"), button:has-text("Join now and start")');
if (await reg2.count()) {
  await reg2.click();
  await page.waitForTimeout(1200);
}
await page.reload();
await page.waitForSelector('text=Running total', { timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/74-event-code.png` });

// type the solution into Monaco
// Monaco ignores a click in an unfocused window, so focus the page first, then use the
// editor's own API through the model attached to the visible instance
await page.bringToFront();
const solution = 'nums = [int(x) for x in input().split()]\ntotal = 0\nout = []\nfor n in nums:\n    total += n\n    out.append(str(total))\nprint(" ".join(out))';
const modelId = await page.evaluate((src) => {
  const el = document.querySelector('.monaco-editor .view-lines') || document.querySelector('.monaco-editor');
  el?.click();
  const api = window.monaco;
  if (!api) return null;
  const model = api.editor.getModels()[0];
  if (!model) return null;
  model.setValue(src);
  return model.id;
}, solution);
console.log('monaco model:', modelId);
await page.waitForTimeout(600);
await page.locator('button:has-text("Submit solution")').click();
await page.waitForSelector('text=Passed all tests', { timeout: 60000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/75-event-code-graded.png` });

// leaderboard from the published example event
await page.goto(`${BASE}/events/logic-puzzle-warmup`);
await page.waitForSelector('text=Logic Puzzle Warm-up', { timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/76-event-published.png` });

// mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(`${BASE}/signin`);
await mp.fill('#email', email);
await mp.fill('#password', 'Correct-horse-battery9');
await mp.click('button[type=submit]');
await mp.waitForURL(/dashboard|courses/, { timeout: 20000 });
await mp.goto(`${BASE}/events`);
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${OUT}/77-events-mobile.png`, fullPage: false });
await mp.goto(`${BASE}/events/dsa-sprint-autumn`);
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${OUT}/78-event-mobile.png` });

console.log('console errors:', errs.slice(0, 4));
await browser.close();
console.log('done');
