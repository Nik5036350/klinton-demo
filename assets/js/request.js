// The request form is Yandex Forms' own form in a frame. This module builds
// the frame address and watches whether the form actually arrived.
// buildFormUrl and themeFor touch no DOM; watchFrame only uses the frame's
// event interface, so all three run under node --test.

export const FORM_ORIGIN = 'https://forms.yandex.ru';
export const MAX_URL = 32000;

export function buildFormUrl(formId, params = {}) {
  if (typeof formId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(formId)) {
    throw new TypeError('malformed form id');
  }
  const search = new URLSearchParams();
  search.set('iframe', '1');
  for (const [key, value] of Object.entries(params)) {
    if (key === 'iframe' || value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const url = `${FORM_ORIGIN}/u/${formId}/?${search}`;
  if (url.length > MAX_URL) throw new RangeError('form address exceeds 32,000 characters');
  return url;
}

export function themeFor(prefersDark, prefersContrast) {
  return (prefersDark ? 'dark' : 'light') + (prefersContrast ? '-hc' : '');
}

// A frame fires "load" even when it shows the browser's own error page
// (offline, blocked by an extension), so "load" alone proves nothing. The
// probe asks for the form's own address (query dropped); a blocked or offline
// request rejects. Not the host root: that redirects to another Yandex host,
// which the Content Security Policy refuses, so the probe would always fail.
export function defaultProbe(src) {
  let url = `${FORM_ORIGIN}/`;
  try {
    const u = new URL(src);
    if (u.origin === FORM_ORIGIN) url = u.origin + u.pathname;
  } catch {
    // no usable frame address: fall back to the host
  }
  return fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', credentials: 'omit' })
    .then(() => true, () => false);
}

// Resolves once with 'loaded', 'failed' or 'timeout', and leaves no listener
// or timer behind.
// `loaded`: the frame already fired "load" before watching began (the browser
// starts a lazy frame earlier than the page's own "in view" observer fires).
export function watchFrame(iframe, {
  timeoutMs = 8000,
  probe = defaultProbe,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  loaded: alreadyLoaded = false,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let loaded = alreadyLoaded === true;
    let reachable = null;
    let timer;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimer(timer);
      iframe.removeEventListener('load', onLoad);
      resolve(result);
    };
    const decide = () => {
      if (reachable === false) finish('failed');
      else if (reachable === true && loaded) finish('loaded');
    };
    function onLoad() {
      loaded = true;
      decide();
    }

    iframe.addEventListener('load', onLoad);
    timer = setTimer(() => finish('timeout'), timeoutMs);
    Promise.resolve()
      .then(() => probe(iframe.src))
      .then((ok) => { reachable = ok === true; }, () => { reachable = false; })
      .then(decide);
  });
}

// The form, framed under the name "ya-form-<id>", posts its content height as
// the JSON string {"iframe-height": N} (the protocol of Yandex's own embed.js).
// Returns the height in pixels, or null for any other message. Bounded so a
// malformed message can neither collapse the frame nor make it huge.
export const FRAME_MIN = 160;
export const FRAME_MAX = 4000;
export function frameHeightFrom(origin, data) {
  if (origin !== FORM_ORIGIN || typeof data !== 'string' || !data.includes('iframe-height')) return null;
  let h;
  try {
    h = JSON.parse(data)['iframe-height'];
  } catch {
    return null;
  }
  h = Number(h);
  if (!Number.isFinite(h) || h <= 0) return null;
  return Math.min(FRAME_MAX, Math.max(FRAME_MIN, Math.ceil(h)));
}

// Values the estimate page may carry to the request page through the address.
// Only these three are accepted; everything else in the address is ignored.
const FACILITY_KEYS = new Set(['office', 'business-centre', 'warehouse', 'production', 'retail', 'hotel', 'fitness', 'parking']);
export function paramsFromLocation(search) {
  const q = new URLSearchParams(search || '');
  const out = {};
  const facility = q.get('facility');
  if (facility && FACILITY_KEYS.has(facility)) out.facility = facility;
  const area = q.get('area');
  if (area && /^[1-9]\d{0,6}$/.test(area) && Number(area) <= 1000000) out.area = area;
  const estimate = q.get('estimate');
  if (estimate) out.estimate = [...estimate].slice(0, 300).join('');
  return out;
}

// The frame address with carried values added; a facility key becomes the
// form's answer id, or is left out when the form has no answer for it.
export function frameUrlWith(src, params, facilityAnswers = {}) {
  const url = new URL(src);
  for (const [key, value] of Object.entries(params)) {
    if (key === 'facility') {
      const answer = facilityAnswers[value];
      if (answer) url.searchParams.set('facility', answer);
    } else {
      url.searchParams.set(key, value);
    }
  }
  return url.href;
}
