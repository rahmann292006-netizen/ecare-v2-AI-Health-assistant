import { useCallback, useEffect, useState } from 'react';
import {
  Settings as SettingsIcon, Sun, Moon, MonitorSmartphone, Check, AlertCircle, Trash2, Download,
  KeyRound, User as UserIcon, Palette, Target, ShieldCheck, Loader2,
} from 'lucide-react';
import { AppShell, PageHead, Avatar, Loading, useToast } from '../components/AppShell.jsx';
import { useAuth, useTheme } from '../lib/auth.jsx';
import { get, patch, post, del } from '../lib/api.js';
import { fullDay, relative } from '../lib/format.js';

const COLORS = ['amber', 'clay', 'moss', 'slate', 'stone', 'sand'];

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="card">
      <div className="card__head">
        <div>
          <div className="card__title row" style={{ gap: 8 }}><Icon aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--accent)' }} /> {title}</div>
          {hint && <div className="card__hint" style={{ marginTop: 2 }}>{hint}</div>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, profile, preferences, refresh } = useAuth();
  const { preference, setTheme } = useTheme();
  const [form, setForm] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Settings — Lumen';
  }, []);

  useEffect(() => {
    if (profile && !form) {
      setForm({
        displayName: profile.displayName || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        goal: profile.goal || '',
        experienceLevel: profile.experienceLevel || 'beginner',
        avatarColor: profile.avatarColor || 'amber',
      });
    }
    if (preferences && !prefs) {
      setPrefs({
        weeklyGoalMinutes: preferences.weeklyGoalMinutes ?? 300,
        emailDigest: Boolean(preferences.emailDigest),
        reducedMotion: Boolean(preferences.reducedMotion),
      });
    }
  }, [profile, preferences, form, prefs]);

  const loadSessions = useCallback(() => {
    get('/users/sessions').then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await patch('/users', form);
      await refresh();
      toast.push('Profile saved.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (patchBody) => {
    setSavingPrefs(true);
    try {
      await patch('/users/preferences', patchBody);
      await refresh();
      toast.push('Preferences saved.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setSavingPrefs(false);
    }
  };

  const chooseTheme = async (theme) => {
    setTheme(theme);
    if (user) savePrefs({ theme });
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.push('The new passwords do not match.', 'danger');
      return;
    }
    setSavingPassword(true);
    try {
      await post('/users/password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.push('Password changed. Other sessions were signed out.', 'success');
      loadSessions();
    } catch (err) {
      toast.push(err.message, 'danger');
    } finally {
      setSavingPassword(false);
    }
  };

  const revoke = async (id) => {
    try {
      await del(`/users/sessions/${id}`);
      loadSessions();
      toast.push('Session signed out.');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const exportData = async () => {
    try {
      const data = await get('/users/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lumen-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.push('Export downloaded.', 'success');
    } catch (err) {
      toast.push(err.message, 'danger');
    }
  };

  const themeOptions = [
    { id: 'light', label: 'Obsidian Light', hint: 'Warm off-white, charcoal type, restrained amber.', icon: Sun },
    { id: 'dark', label: 'Midnight Dark', hint: 'Deep charcoal surfaces with a softer amber.', icon: Moon },
    { id: 'system', label: 'Follow the system', hint: 'Match your operating system appearance.', icon: MonitorSmartphone },
  ];

  return (
    <AppShell title="Settings">
      <div className="page page--narrow">
        <PageHead eyebrow="Account" title="Settings" sub="Your profile, appearance, learning goal, security and data." />

        {!form && <Loading rows={3} height={90} />}

        {form && (
          <div className="stack stack-5">
            <Section icon={UserIcon} title="Profile" hint="Shown on your posts and discussions.">
              <form className="stack stack-4" onSubmit={saveProfile}>
                <div className="row" style={{ gap: 14 }}>
                  <Avatar name={form.displayName} color={form.avatarColor} size="lg" />
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>Avatar colour</div>
                    <div className="row" style={{ gap: 6 }}>
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, avatarColor: c })}
                          className={`avatar avatar--${c}`}
                          style={{ cursor: 'pointer', border: form.avatarColor === c ? '2px solid var(--accent)' : '2px solid transparent' }}
                          aria-label={`Avatar colour ${c}`}
                          aria-pressed={form.avatarColor === c}
                        >
                          {form.avatarColor === c ? <Check style={{ width: 12, height: 12 }} /> : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid--2">
                  <div className="field">
                    <label className="label" htmlFor="displayName">Name</label>
                    <input id="displayName" className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} minLength={2} maxLength={60} required />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" className="input" value={user.email} disabled />
                    <span className="hint">{user.emailVerified ? 'Verified' : 'Not verified — check your inbox for the link.'}</span>
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="headline">Headline</label>
                  <input id="headline" className="input" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={120} placeholder="Backend learner · Python and databases" />
                </div>

                <div className="field">
                  <label className="label" htmlFor="bio">About</label>
                  <textarea id="bio" className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={400} placeholder="What are you working toward?" style={{ minHeight: 90 }} />
                  <span className="hint">{form.bio.length}/400</span>
                </div>

                <div className="grid grid--2">
                  <div className="field">
                    <label className="label" htmlFor="location">Location</label>
                    <input id="location" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="website">Website</label>
                    <input id="website" className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={200} placeholder="https://" />
                  </div>
                </div>

                <div className="grid grid--2">
                  <div className="field">
                    <label className="label" htmlFor="goal">Learning goal</label>
                    <input id="goal" className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} maxLength={160} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="level">Experience level</label>
                    <select id="level" className="select" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
                      <option value="beginner">Just starting</option>
                      <option value="some">Some basics</option>
                      <option value="intermediate">Comfortable coding</option>
                      <option value="advanced">Experienced</option>
                    </select>
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn--primary" disabled={savingProfile}>
                    {savingProfile ? <Loader2 className="spin" /> : <Check />} Save profile
                  </button>
                </div>
              </form>
            </Section>

            <Section icon={Palette} title="Appearance" hint="Saved to your account and remembered on this device.">
              <div className="stack stack-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const active = preference === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseTheme(option.id)}
                      className="row"
                      aria-pressed={active}
                      style={{
                        gap: 12, padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        background: active ? 'var(--accent-soft)' : 'var(--surface)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      <Icon aria-hidden="true" style={{ width: 16, height: 16, color: active ? 'var(--accent)' : 'var(--muted)' }} />
                      <span style={{ flex: 1 }}>
                        <span className="small strong" style={{ display: 'block' }}>{option.label}</span>
                        <span className="tiny muted">{option.hint}</span>
                      </span>
                      {active && <Check style={{ width: 14, height: 14, color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
                <label className="checkbox" style={{ marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={prefs?.reducedMotion || false}
                    onChange={(e) => {
                      const next = { ...prefs, reducedMotion: e.target.checked };
                      setPrefs(next);
                      document.documentElement.toggleAttribute('data-reduced-motion', e.target.checked);
                      localStorage.setItem('lumen.reducedMotion', e.target.checked ? '1' : '0');
                      savePrefs({ reducedMotion: e.target.checked });
                    }}
                  />
                  Reduce motion (turns off transitions and skeleton animation)
                </label>
              </div>
            </Section>

            <Section icon={Target} title="Learning goal" hint="Used by your weekly plan and dashboard.">
              <div className="row row--wrap" style={{ gap: 16, alignItems: 'flex-end' }}>
                <div className="field" style={{ minWidth: 180 }}>
                  <label className="label" htmlFor="weekly">Weekly study target</label>
                  <select
                    id="weekly"
                    className="select"
                    value={prefs?.weeklyGoalMinutes ?? 300}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setPrefs({ ...prefs, weeklyGoalMinutes: value });
                      savePrefs({ weeklyGoalMinutes: value });
                    }}
                    disabled={savingPrefs}
                  >
                    {[120, 180, 300, 420, 600, 900].map((m) => (
                      <option key={m} value={m}>{m % 60 === 0 ? `${m / 60} hours` : `${m} minutes`} per week</option>
                    ))}
                  </select>
                </div>
                <label className="checkbox" style={{ marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={prefs?.emailDigest || false}
                    onChange={(e) => {
                      setPrefs({ ...prefs, emailDigest: e.target.checked });
                      savePrefs({ emailDigest: e.target.checked });
                    }}
                  />
                  Email me a weekly progress digest
                </label>
              </div>
              {!prefs?.emailDigest && (
                <p className="tiny muted" style={{ marginTop: 8 }}>
                  Digests are only sent when an SMTP server is configured on the server; with none, nothing is mailed.
                </p>
              )}
            </Section>

            <Section icon={KeyRound} title="Password" hint="Changing it signs out every other session.">
              <form className="stack stack-3" onSubmit={changePassword}>
                <div className="field">
                  <label className="label" htmlFor="current">Current password</label>
                  <input id="current" className="input" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                </div>
                <div className="grid grid--2">
                  <div className="field">
                    <label className="label" htmlFor="new">New password</label>
                    <input id="new" className="input" type="password" autoComplete="new-password" minLength={10} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="confirm">Confirm new password</label>
                    <input id="confirm" className="input" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
                  </div>
                </div>
                <span className="hint">At least 10 characters, including a letter and a digit.</span>
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn--primary" disabled={savingPassword}>
                    {savingPassword ? <Loader2 className="spin" /> : <KeyRound />} Update password
                  </button>
                </div>
              </form>
            </Section>

            <Section icon={ShieldCheck} title="Active sessions" hint="Everywhere this account is signed in.">
              {!sessions && <Loading rows={2} height={44} />}
              {sessions && sessions.length === 0 && <p className="small muted">No sessions listed.</p>}
              {sessions && sessions.length > 0 && (
                <table className="table">
                  <thead><tr><th>Device</th><th>Signed in</th><th>Last active</th><th /></tr></thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="small">{s.current ? 'This device' : (s.userAgent || 'Unknown device').slice(0, 46)}</div>
                          <div className="tiny muted">{s.ip || '—'}</div>
                        </td>
                        <td className="tiny muted">{fullDay(s.createdAt)}</td>
                        <td className="tiny muted">{relative(s.lastSeenAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {!s.current && (
                            <button className="btn btn--ghost btn--sm" onClick={() => revoke(s.id)}>Sign out</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section icon={Download} title="Your data" hint="Download everything Lumen stores about you.">
              <div className="row row--wrap" style={{ gap: 10 }}>
                <button className="btn" onClick={exportData}><Download /> Export as JSON</button>
              </div>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                The export includes your profile, preferences, progress, notes, bookmarks, lab sessions, aptitude
                attempts and community posts.
              </p>
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
