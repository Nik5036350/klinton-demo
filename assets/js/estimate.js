// Indicative price from the company's published price rules. Pure: no DOM,
// no network. estimate() never invents a number: an input no rule covers
// returns null, shown as "individual calculation".

export const FACILITIES = {
  office: 'Офис',
  'business-centre': 'Бизнес-центр',
  warehouse: 'Склад',
  production: 'Производство',
  retail: 'Магазин или торговый центр',
  hotel: 'Гостиница',
  fitness: 'Фитнес-клуб',
  parking: 'Паркинг',
};

export const CLEANINGS = {
  daily: 'ежедневная уборка',
  general: 'генеральная уборка',
  'post-construction': 'уборка после ремонта',
};

const UNITS = { 'm2-month': 'month', 'm2-visit': 'visit' };
const PERIOD_TEXT = { month: 'в месяц', visit: 'за уборку' };
const MAX_AREA = 1000000;
const nf = new Intl.NumberFormat('ru-RU');

// hundreds below 100 000, thousands above; a positive price never becomes zero
export function roundPrice(value) {
  const step = value < 100000 ? 100 : 1000;
  return Math.max(step, Math.round(value / step) * step);
}

export function validateRules(rules) {
  const errors = [];
  const isInt = (n) => Number.isInteger(n) && n > 0;
  rules.forEach((r, i) => {
    const at = `rule ${i} (${r.service}/${r.facility})`;
    if (!(r.service in CLEANINGS)) errors.push(`${at}: unknown service`);
    if (r.facility !== 'any' && !(r.facility in FACILITIES)) errors.push(`${at}: unknown facility`);
    if (!(r.unit in UNITS)) errors.push(`${at}: unknown unit`);
    if (!isInt(r.rateMin)) errors.push(`${at}: rateMin must be a positive integer`);
    if (r.rateMax !== null && (!isInt(r.rateMax) || r.rateMax < r.rateMin)) errors.push(`${at}: rateMin must not exceed rateMax`);
    if (!isInt(r.areaFrom) || !isInt(r.areaTo) || r.areaFrom > r.areaTo) errors.push(`${at}: bad area range`);
  });
  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      const a = rules[i];
      const b = rules[j];
      if (a.service === b.service && a.facility === b.facility && a.areaFrom <= b.areaTo && b.areaFrom <= a.areaTo) {
        errors.push(`rules ${i} and ${j} (${a.service}/${a.facility}): area ranges overlap`);
      }
    }
  }
  return errors;
}

// Returns { min, max, unit, period }, null (no rule covers the input), or
// { error: { field, message } } for an input that cannot be priced as typed.
export function estimate(rules, input) {
  const { facility, cleaning, area } = input || {};
  if (!(facility in FACILITIES)) return { error: { field: 'facility', message: 'Выберите тип объекта' } };
  if (!(cleaning in CLEANINGS)) return { error: { field: 'cleaning', message: 'Выберите вид уборки' } };
  if (typeof area !== 'number' || !Number.isInteger(area) || area < 1 || area > MAX_AREA) {
    return { error: { field: 'area', message: 'Укажите площадь целым числом от 1 до 1 000 000 м²' } };
  }
  const rule = rules.find((r) => r.service === cleaning
    && (r.facility === facility || r.facility === 'any')
    && area >= r.areaFrom && area <= r.areaTo);
  if (!rule) return null;
  return {
    min: roundPrice(area * rule.rateMin),
    max: rule.rateMax === null ? null : roundPrice(area * rule.rateMax),
    unit: rule.unit,
    period: UNITS[rule.unit],
  };
}

// One line for the request form, e.g.
// "Склад, ежедневная уборка, 2 000 м²: от 24 000 ₽ в месяц, ориентировочно"
export function describe(input, result) {
  const head = `${FACILITIES[input.facility]}, ${CLEANINGS[input.cleaning]}, ${nf.format(input.area)} м²`;
  if (!result || result.error) return `${head}: нужен индивидуальный расчёт`;
  const money = result.max === null
    ? `от ${nf.format(result.min)} ₽`
    : `${nf.format(result.min)}–${nf.format(result.max)} ₽`;
  return `${head}: ${money} ${PERIOD_TEXT[result.period]}, ориентировочно`;
}
