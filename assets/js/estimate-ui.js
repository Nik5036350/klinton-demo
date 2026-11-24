// The estimate tool on /ceny/. The HTML already shows a worked example, so
// without this script the page is complete; with it, the result follows every
// change at once, the last input is remembered for the browser session, and
// the estimate can be carried into the request form.

import { estimate, describe } from './estimate.js';
import { rules } from './prices.js';
import { read, write } from './storage.js';
import { track } from './app.js';

const form = document.getElementById('estimate');
if (form) {
  const $ = (id) => document.getElementById(id);
  const facility = $('est-facility');
  const cleaning = $('est-cleaning');
  const area = $('est-area');
  const error = $('est-area-error');
  const sum = $('est-sum');
  const period = $('est-period');
  const summary = $('est-summary');
  const toRequest = $('est-request');
  const nf = new Intl.NumberFormat('ru-RU');
  const STORE_KEY = 'estimate';
  let reported = false;

  const saved = read('session', STORE_KEY);
  if (saved && typeof saved === 'object') {
    if (saved.facility && facility.querySelector(`option[value="${CSS.escape(saved.facility)}"]`)) facility.value = saved.facility;
    if (saved.cleaning && cleaning.querySelector(`option[value="${CSS.escape(saved.cleaning)}"]`)) cleaning.value = saved.cleaning;
    if (typeof saved.area === 'string') area.value = saved.area.slice(0, 12);
  }

  const update = () => {
    const raw = area.value.replace(/[\s ]/g, '');
    const input = { facility: facility.value, cleaning: cleaning.value, area: raw === '' ? NaN : Number(raw) };
    write('session', STORE_KEY, { facility: input.facility, cleaning: input.cleaning, area: area.value }, { maxBytes: 1024 });

    const result = estimate(rules, input);
    const invalid = Boolean(result && result.error && result.error.field === 'area');
    area.setAttribute('aria-invalid', String(invalid && raw !== ''));
    error.textContent = invalid && raw !== '' ? result.error.message : '';

    if (invalid) {
      sum.textContent = '—';
      period.textContent = 'укажите площадь';
      summary.textContent = '';
      toRequest.href = '/zayavka/';
      return;
    }
    const text = describe(input, result);
    summary.textContent = text;
    if (result === null) {
      sum.textContent = 'Индивидуально';
      period.textContent = 'нужен расчёт после выезда на объект';
    } else {
      sum.textContent = result.max === null ? `от ${nf.format(result.min)} ₽` : `${nf.format(result.min)}–${nf.format(result.max)} ₽`;
      period.textContent = result.period === 'month' ? 'в месяц, ориентировочно' : 'за уборку, ориентировочно';
      if (!reported) {
        reported = true;
        track('estimate_done', { facility: input.facility, cleaning: input.cleaning });
      }
    }
    const q = new URLSearchParams({ facility: input.facility, area: String(input.area), estimate: text });
    toRequest.href = `/zayavka/?${q}#zayavka`;
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  toRequest.addEventListener('click', () => track('estimate_to_request'));
  update();
}
