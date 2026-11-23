import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, patch, post } from './api.js';

const AuthContext = createContext(null);
const ThemeContext = createContext(null);

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? systemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('lumen.theme', theme);
  return resolved;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => localStorage.getItem('lumen.theme') || 'system');
  const [resolved, setResolved] = useState(() => document.documentElement.getAttribute('data-theme') || systemTheme());

  useEffect(() => {
    setResolved(applyTheme(preference));
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preference === 'system') setResolved(applyTheme('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setTheme = useCallback((theme) => setPreference(theme), []);
  const toggle = useCallback(() => setPreference((p) => (p === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ preference, resolved, setTheme, toggle }), [preference, resolved, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, profile: null, preferences: null });

  const refresh = useCallback(async () => {
    try {
      const data = await get('/auth/me');
      setState({ status: 'ready', user: data.user, profile: data.profile, preferences: data.preferences });
      return data;
    } catch (err) {
      if (err.status === 401) {
        setState({ status: 'anonymous', user: null, profile: null, preferences: null });
        return null;
      }
      setState({ status: 'error', user: null, profile: null, preferences: null, error: err.message });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    const data = await post('/auth/login', payload);
    setState({ status: 'ready', user: data.user, profile: data.profile, preferences: data.preferences });
    return data;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await post('/auth/signup', payload);
    setState({ status: 'ready', user: data.user, profile: data.profile, preferences: data.preferences });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout', {});
    } finally {
      setState({ status: 'anonymous', user: null, profile: null, preferences: null });
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await patch('/users', payload);
    setState((s) => ({ ...s, user: data.user, profile: data.profile, preferences: data.preferences }));
    return data;
  }, []);

  const value = useMemo(
    () => ({ ...state, isAuthed: state.status === 'ready', refresh, login, signup, logout, updateProfile, setState }),
    [state, refresh, login, signup, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
