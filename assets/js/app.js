// Runs on every page. Everything here enhances HTML that already works on its
// own: with this script missing, the menu link jumps to the footer menu, the
// figures show their final values and the request block shows its contacts.
// Listeners and observers are attached once; nothing runs on an idle page.

import { read, write } from './storage.js';

const doc = document;
const root = doc.documentElement;
const media = (q) => window.matchMedia(q).matches;
const reducedMotion = () => media('(prefers-reduced-motion: reduce)');

// Actions worth counting. Analytics loads late (after the page is usable), so
// earlier actions wait in a short queue and are replayed once it is there.
const pendingGoals = [];
let analytics = null;
export function track(name, params) {
  if (analytics) analytics.goal(name, params);
  else if (pendingGoals.length < 20) pendingGoals.push([name, params]);
}

function initAnalytics() {
  const load = () => import('./analytics.js')
    .then((m) => {
      if (!m.start()) return;
      analytics = m;
      for (const [name, params] of pendingGoals.splice(0)) m.goal(name, params);
    })
    .catch(() => {}); // blocked or offline: the page does not depend on it
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 1));
  if (doc.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

// ---------- light / dark ----------
// The page follows the system preference until the visitor picks a theme;
// the pick is saved and applied before the first paint by the small inline
// script in <head>, so later pages never flash the other theme.
const THEME_COLOR = { light: '#f6f3ec', dark: '#12110e' };
export const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : media('(prefers-color-scheme: dark)'));

function initTheme() {
  const btn = doc.querySelector('[data-theme-toggle]');
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  const original = metas.map((m) => m.content);
  const paint = () => {
    const dark = isDark();
    metas.forEach((m, i) => { m.content = root.dataset.theme ? THEME_COLOR[root.dataset.theme] : original[i]; });
    if (!btn) return;
    btn.dataset.mode = dark ? 'dark' : 'light';
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
  };
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      write('local', 'theme', next, { maxBytes: 16 });
      paint();
      track('theme', { mode: next });
    });
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  paint();
}

// ---------- menu ----------
function initMenu() {
  const header = doc.querySelector('.header');
  const toggle = header?.querySelector('.header__menu');
  const nav = header?.querySelector('#site-nav');
  if (!toggle || !nav) return;
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-expanded', 'false');
  const setOpen = (open, focusToggle = false) => {
    header.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Закрыть' : 'Меню';
    if (open) nav.querySelector('a')?.focus();
    else if (focusToggle) toggle.focus();
  };
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    setOpen(!header.hasAttribute('data-open'));
  });
  toggle.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      setOpen(!header.hasAttribute('data-open'));
    }
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.hasAttribute('data-open')) setOpen(false, true);
  });
  doc.addEventListener('click', (e) => {
    if (!header.hasAttribute('data-open')) return;
    if (nav.contains(e.target) && e.target.closest('a')) setOpen(false);
    else if (!header.contains(e.target)) setOpen(false);
  });
  window.matchMedia('(min-width: 72rem)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

// ---------- phone bar steps aside while a request block is on screen ----------
function initPhoneBar() {
  const bar = doc.querySelector('.phonebar');
  const blocks = doc.querySelectorAll('.request');
  if (!bar || !blocks.length || !('IntersectionObserver' in window)) return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
    bar.toggleAttribute('data-hidden', visible.size > 0);
  }, { rootMargin: '0px 0px -30% 0px' });
  blocks.forEach((b) => io.observe(b));
}

// ---------- cookie notice ----------
// While shown, the page gets extra bottom space of the notice's height, so the
// notice never hides content or an action: everything can be scrolled clear.
function initNotice() {
  const notice = doc.querySelector('.notice');
  if (!notice || read('local', 'notice')) return;
  const body = doc.body.style;
  notice.hidden = false;
  const reserve = () => body.setProperty('--notice-h', `${notice.offsetHeight + 16}px`);
  reserve();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(reserve) : null;
  ro?.observe(notice);
  notice.querySelector('[data-notice-dismiss]')?.addEventListener('click', () => {
    write('local', 'notice', new Date().toISOString().slice(0, 10), { maxBytes: 64 });
    notice.hidden = true;
    ro?.disconnect();
    body.removeProperty('--notice-h');
  }, { once: true });
}

// ---------- figures count up once, only when scrolled into view ----------
// Markup: <span data-count="100000">100 000</span> holds the number alone (a
// unit such as <small>+</small> sits outside it). A figure already on screen
// when the page opens keeps its final value; the final value is in the HTML,
// so without this script nothing is missing.
function initCounters() {
  const els = doc.querySelectorAll('[data-count]');
  if (!els.length || reducedMotion() || !('IntersectionObserver' in window)) return;
  const format = new Intl.NumberFormat('ru-RU');
  const run = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || target <= 0) return;
    const final = el.textContent;
    const shadow = doc.createElement('span');
    shadow.className = 'visually-hidden';
    shadow.textContent = final;
    el.setAttribute('aria-hidden', 'true');
    el.after(shadow);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1100);
      el.textContent = format.format(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      el.textContent = final;
      el.removeAttribute('aria-hidden');
      shadow.remove();
    };
    requestAnimationFrame(step);
  };
  const seen = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const first = !seen.has(e.target);
      seen.add(e.target);
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      if (!first) run(e.target);
    }
  }, { rootMargin: '0px 0px -15% 0px' });
  els.forEach((el) => io.observe(el));
}

// ---------- copy buttons (hidden until they can work) ----------
function initCopy() {
  if (!navigator.clipboard) return;
  for (const btn of doc.querySelectorAll('[data-copy]')) {
    const target = doc.querySelector(btn.dataset.copy);
    if (!target) continue;
    btn.hidden = false;
    const label = btn.textContent;
    let timer;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        btn.textContent = 'Скопировано';
        track('copy', { what: btn.dataset.copyName || btn.dataset.copy });
      } catch {
        btn.textContent = 'Не удалось скопировать';
      }
      clearTimeout(timer);
      timer = setTimeout(() => { btn.textContent = label; }, 2000);
    });
  }
}

// ---------- request form frame ----------
async function initRequestFrames() {
  const frames = doc.querySelectorAll('[data-request-frame]');
  if (!frames.length) return;
  const { themeFor, watchFrame, paramsFromLocation, frameUrlWith, frameHeightFrom } = await import('./request.js');
  const theme = themeFor(isDark(), media('(prefers-contrast: more)'));
  // The form reports its content height; the frame follows it, so there is no
  // inner scrollbar and no empty space. When it shrinks after sending and the
  // confirmation is not fully visible (above the screen, under the sticky
  // header or below), it is brought into view.
  addEventListener('message', (e) => {
    const h = frameHeightFrom(e.origin, e.data);
    if (h === null) return;
    const frame = [...frames].find((f) => f.contentWindow === e.source);
    if (!frame) return;
    const before = frame.offsetHeight;
    if (Math.abs(before - h) < 2) return;
    frame.style.height = `${h}px`;
    if (h < before - 200) {
      const r = frame.getBoundingClientRect();
      const header = doc.querySelector('.header')?.offsetHeight || 0;
      if (r.top < header + 16 || r.bottom > innerHeight) frame.scrollIntoView({ block: 'center' });
    }
  });
  const carried = paramsFromLocation(location.search); // from the estimate on /ceny/
  for (const frame of frames) {
    let answers = {};
    try {
      answers = JSON.parse(frame.dataset.facilityAnswers || '{}');
    } catch {
      // a malformed map only means the facility is not pre-selected
    }
    const src = frameUrlWith(frame.src, { ...carried, ...(theme !== 'light' ? { theme } : {}) }, answers);
    if (src !== frame.src) frame.src = src;
    // Note the frame's load from now on: a lazy frame may finish loading
    // before the observer below reports it in view.
    let frameLoaded = false;
    frame.addEventListener('load', () => { frameLoaded = true; }, { once: true });
    const fallback = frame.parentElement.querySelector('[data-request-fallback]');
    const start = () => watchFrame(frame, { timeoutMs: 8000, loaded: frameLoaded }).then((result) => {
      if (result === 'loaded') {
        track('request_open', { form: frame.className.match(/--(\w+)/)?.[1] });
        return;
      }
      frame.hidden = true;
      if (fallback) fallback.hidden = false;
      track('request_fallback', { reason: result });
    });
    if (!('IntersectionObserver' in window)) {
      start();
      continue;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start();
    }, { rootMargin: '100% 0px' });
    io.observe(frame);
  }
}

initTheme();
initMenu();
initPhoneBar();
initNotice();
initCounters();
initCopy();
initRequestFrames();
initAnalytics();
