// Price rules transcribed from the company's published price list
// (/files/prays-list.pdf, "Прайс на клининговые услуги", dated January 2023).
// Only what the document states: every value there is a lower bound ("от"),
// so rateMax is null. The owner confirms the list is current (README, open inputs).
//
// Assumptions recorded for the owner to confirm:
// - regular cleaning ("5–7 дней в неделю") is priced per m² per month;
// - business centres use the office rate;
// - areas above 100 000 m² need an individual calculation.

export const updated = '2023-01';

const AREA = { areaFrom: 1, areaTo: 100000 };
const rule = (service, facility, unit, rateMin) => ({ service, facility, unit, ...AREA, rateMin, rateMax: null, updated });

export const rules = [
  // Регулярная уборка (5–7 дней в неделю)
  rule('daily', 'office', 'm2-month', 20),
  rule('daily', 'business-centre', 'm2-month', 20),
  rule('daily', 'retail', 'm2-month', 25),
  rule('daily', 'production', 'm2-month', 25),
  rule('daily', 'warehouse', 'm2-month', 12),
  // Генеральная уборка
  rule('general', 'office', 'm2-visit', 80),
  rule('general', 'business-centre', 'm2-visit', 80),
  rule('general', 'warehouse', 'm2-visit', 30),
  rule('general', 'retail', 'm2-visit', 30),
  rule('general', 'production', 'm2-visit', 60),
  // Уборка после строительства или ремонта
  rule('post-construction', 'office', 'm2-visit', 90),
  rule('post-construction', 'business-centre', 'm2-visit', 90),
  rule('post-construction', 'warehouse', 'm2-visit', 65),
  rule('post-construction', 'retail', 'm2-visit', 65),
  rule('post-construction', 'production', 'm2-visit', 60),
];

// The full published list, for the price table on /ceny/ (written into the HTML).
export const catalogue = [
  { group: 'Регулярная уборка, 5–7 дней в неделю', items: [
    ['Офисные помещения', 'от 20 ₽/м²'], ['Торговые помещения', 'от 25 ₽/м²'], ['Промышленные помещения', 'от 25 ₽/м²'],
    ['Склады', 'от 12 ₽/м²'], ['Прилегающая территория летом', 'от 9 ₽/м²'], ['Прилегающая территория зимой', 'от 16 ₽/м²'],
  ] },
  { group: 'Генеральная уборка', items: [
    ['Офисные помещения', 'от 80 ₽/м²'], ['Складские и торговые помещения', 'от 30 ₽/м²'], ['Производственные помещения', 'от 60 ₽/м²'],
  ] },
  { group: 'Уборка после строительства или ремонта', items: [
    ['Офисные помещения', 'от 90 ₽/м²'], ['Складские и торговые помещения', 'от 65 ₽/м²'], ['Производственные помещения', 'от 60 ₽/м²'], ['Бассейны', 'от 150 ₽/м²'],
  ] },
  { group: 'Мойка окон', items: [
    ['Ручная, есть доступ изнутри', 'от 32 ₽/м²'], ['Телескопическими штангами, до 20 м', 'от 35 ₽/м²'], ['Промышленными альпинистами', 'от 70 ₽/м²'],
    ['После строительства', 'от 120 ₽/м²'], ['Зимняя', 'от 300 ₽/м²'],
  ] },
  { group: 'Мойка фасадов', items: [
    ['Композитных', 'от 35 ₽/м²'], ['Штукатурных', 'от 35 ₽/м²'], ['После строительства', 'от 120 ₽/м²'],
  ] },
  { group: 'Химчистка', items: [
    ['Ковролин на месте', 'от 60 ₽/м²'], ['Мебель', 'от 250 ₽ за посадочное место'], ['Жалюзи на месте', 'от 150 ₽/м²'],
    ['Жалюзи с вывозом', 'от 250 ₽/м²'], ['Залы кинотеатров', 'от 90 ₽ за посадочное место'], ['Элитный текстиль', 'по результатам осмотра'],
  ] },
  { group: 'Полы и камень', items: [
    ['Глубокая чистка твёрдых полов дисковой машиной', 'от 80 ₽/м²'], ['Защитный полимерный слой', 'от 150 ₽/м²'],
    ['Полимерные защитные покрытия', 'от 70 ₽/м²'], ['Ленточные защитные покрытия', 'от 250 ₽/м.п.'],
    ['Мрамор: кристаллизация', 'от 380 ₽/м²'], ['Мрамор: шлифовка и полировка', 'от 950 ₽/м²'],
    ['Гранит и керамогранит: шлифовка и полировка', 'от 1500 ₽/м²'], ['Паркет: чистка дисковой машиной, без материалов', 'от 90 ₽/м²'],
  ] },
  { group: 'Другие работы', items: [
    ['Обеспыливание потолочных конструкций и вентканалов: склады', 'от 60 ₽/м²'],
    ['Обеспыливание потолочных конструкций и вентканалов: производство', 'от 80 ₽/м²'],
    ['Чистка эскалаторов и траволаторов', 'от 7000 ₽/шт.'], ['Дополнительная уборка', '250 ₽ за сервис-час'],
    ['Срочный выезд, начало работ в течение 3 часов', '+25 % к виду работ'], ['Ночные работы', '+20 % к виду работ'],
  ] },
];
