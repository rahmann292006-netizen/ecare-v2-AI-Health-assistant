import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = process.env.MAIL_OUTBOX || path.join(__dirname, '..', '.mail-outbox');
fs.mkdirSync(OUTBOX, { recursive: true });

export const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);

/**
 * Sends mail. When SMTP is not configured (dev / unconfigured deployment) the message is
 * written to server/.mail-outbox as a .eml file and its path returned, so the flow is
 * testable end to end without pretending an email was delivered.
 */
export async function sendMail({ to, subject, text, html }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!smtpConfigured) {
    const file = path.join(OUTBOX, `${id}.eml`);
    fs.writeFileSync(file, `To: ${to}\nFrom: ${process.env.MAIL_FROM || 'Lumen <no-reply@lumen.local>'}\nSubject: ${subject}\n\n${text}\n`);
    return { delivered: false, reason: 'smtp_not_configured', outboxFile: file };
  }
  // SMTP transport is intentionally dependency-free: it uses nodemailer when present.
  try {
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.MAIL_FROM || 'Lumen <no-reply@lumen.app>', to, subject, text, html });
    return { delivered: true };
  } catch (err) {
    const file = path.join(OUTBOX, `${id}.eml`);
    fs.writeFileSync(file, `To: ${to}\nSubject: ${subject}\n\n${text}\n\nSMTP error: ${err.message}\n`);
    return { delivered: false, reason: 'smtp_error', error: err.message, outboxFile: file };
  }
}

export function latestOutboxFor(email) {
  try {
    const files = fs.readdirSync(OUTBOX).filter((f) => f.endsWith('.eml')).sort();
    for (const f of files.reverse()) {
      const content = fs.readFileSync(path.join(OUTBOX, f), 'utf8');
      if (content.includes(`To: ${email}`)) return { file: f, content };
    }
  } catch { /* ignore */ }
  return null;
}
