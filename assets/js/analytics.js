// Yandex Metrika and the VK retargeting pixel: the two analytics exceptions
// recorded in the constitution. Loaded by app.js after the page has loaded and
// the browser is idle. Runs only on klinton.ru itself, so that development
// and preview visits never reach the owner's counter. If either service is
// blocked, every call here is a silent no-op and the page is unchanged.

export const COUNTER_ID = 69157396; // carried over from the present site; the owner confirms 69157396 or 69427843
export const VK_PIXEL = 'VK-RTRG-858083-DFtH';
const PRODUCTION_HOSTS = new Set(['www.klinton.ru', 'klinton.ru']);
const MESSENGERS = [
  [/^(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/, 'whatsapp'],
  [/^(t\.me|telegram\.me)$/, 'telegram'],
  [/^(max\.ru)$/, 'max'],
];

export function isProductionHost(hostname) {
  return PRODUCTION_HOSTS.has(hostname);
}

// Maps a link to a goal. Only the kind of action, the file or messenger name
// and the page address are reported; nothing the visitor typed, no query values.
export function goalFor(href, pageUrl) {
  if (!href) return null;
  let url;
  let page;
  try {
    const base = new URL(pageUrl);
    page = base.pathname;
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.protocol === 'tel:') return { name: 'tel_click', params: { page } };
  if (url.protocol === 'mailto:') return { name: 'email_click', params: { page } };
  if (url.protocol === 'viber:') return { name: 'messenger_click', params: { page, messenger: 'viber' } };
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  for (const [re, messenger] of MESSENGERS) {
    if (re.test(url.hostname)) return { name: 'messenger_click', params: { page, messenger } };
  }
  const own = url.origin === new URL(pageUrl).origin;
  if (own && /^\/files\/[^/]+\.pdf$/i.test(url.pathname)) {
    return { name: 'doc_download', params: { page, doc: url.pathname.split('/').pop() } };
  }
  return null;
}

let started = false;

function ym(...args) {
  try {
    window.ym?.(...args);
  } catch {
    // a broken or blocked counter never affects the page
  }
}

export function goal(name, params) {
  if (!started) return;
  ym(COUNTER_ID, 'reachGoal', name, params);
}

export function start() {
  if (started || !isProductionHost(location.hostname)) return false;
  started = true;

  // the queue Yandex documents: calls made before tag.js arrives are kept
  window.ym = window.ym || function queue(...args) {
    (window.ym.a = window.ym.a || []).push(args);
  };
  window.ym.l = Date.now();
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(script);
  ym(COUNTER_ID, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false, // session recording stays off unless the owner records the decision
  });

  // VK retargeting: the pixel's image form, one request instead of VK's script library
  const pixel = new Image(1, 1);
  pixel.referrerPolicy = 'strict-origin-when-cross-origin';
  pixel.src = `https://vk.com/rtrg?p=${VK_PIXEL}`;

  // one delegated listener for every link goal; it never delays the navigation
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    const g = goalFor(link.getAttribute('href'), location.href);
    if (g) goal(g.name, g.params);
  }, { capture: true, passive: true });
  return true;
}
