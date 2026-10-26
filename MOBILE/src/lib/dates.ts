/**
 * Dates in the reader's language. The website leans on the browser's `Intl`;
 * a phone's JavaScript engine ships only part of it, so the few formats the
 * app needs are written out here — identical on every device.
 */
type Lang = 'en' | 'hi' | string;

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'],
};
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल॰', 'अग॰', 'सित॰', 'अक्तू॰', 'नव॰', 'दिस॰'],
};
/* Monday first, like the calendar. */
const WEEKDAYS = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  hi: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'],
};
const WEEKDAYS_NARROW = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  hi: ['सो', 'मं', 'बु', 'गु', 'शु', 'श', 'र'],
};

const WEEKDAYS_SHORT = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  hi: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
};

const pick = (lang: Lang) => (lang === 'hi' ? 'hi' : 'en');
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

export const weekdayNamesNarrow = (lang: Lang) => WEEKDAYS_NARROW[pick(lang)];
export const weekdayNamesShort = (lang: Lang) => WEEKDAYS_SHORT[pick(lang)];

/** "October 2026" */
export const monthYear = (d: Date, lang: Lang) => `${MONTHS[pick(lang)][d.getMonth()]} ${d.getFullYear()}`;

/** "Monday, 12 October" */
export const longDate = (d: Date, lang: Lang) => `${WEEKDAYS[pick(lang)][mondayIndex(d)]}, ${d.getDate()} ${MONTHS[pick(lang)][d.getMonth()]}`;

/** "12 Oct 2026" */
export const mediumDate = (d: Date, lang: Lang) => `${d.getDate()} ${MONTHS_SHORT[pick(lang)][d.getMonth()]} ${d.getFullYear()}`;

/** "12 Oct" */
export const shortDate = (d: Date, lang: Lang) => `${d.getDate()} ${MONTHS_SHORT[pick(lang)][d.getMonth()]}`;

/** "12 Oct, 4:05 pm" */
export function dateTime(d: Date, lang: Lang) {
  const h = d.getHours();
  const hour12 = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${shortDate(d, lang)}, ${hour12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

/* -- "3 days ago" ---------------------------------------------------------- */

type Unit = 'minute' | 'hour' | 'day';

const EN_UNITS: Record<Unit, [string, string]> = { minute: ['minute', 'minutes'], hour: ['hour', 'hours'], day: ['day', 'days'] };
const HI_UNITS: Record<Unit, [string, string]> = { minute: ['मिनट', 'मिनट'], hour: ['घंटा', 'घंटे'], day: ['दिन', 'दिन'] };

function relative(value: number, unit: Unit, lang: Lang): string {
  const hi = lang === 'hi';
  if (value === 0) return unit === 'day' ? (hi ? 'आज' : 'today') : unit === 'hour' ? (hi ? 'यह घंटा' : 'this hour') : hi ? 'अभी' : 'just now';
  if (unit === 'day' && value === -1) return hi ? 'कल' : 'yesterday';
  if (unit === 'day' && value === 1) return hi ? 'कल' : 'tomorrow';
  const n = Math.abs(value);
  const word = (hi ? HI_UNITS : EN_UNITS)[unit][n === 1 ? 0 : 1];
  if (hi) return value < 0 ? `${n} ${word} पहले` : `${n} ${word} में`;
  return value < 0 ? `${n} ${word} ago` : `in ${n} ${word}`;
}

/** How long ago (or how soon) an ISO timestamp is, in words. */
export function relativeDays(iso: string, lang: Lang) {
  const diff = (new Date(iso).getTime() - Date.now()) / 86400000;
  if (Math.abs(diff) < 1) {
    const h = Math.round(diff * 24);
    return Math.abs(h) < 1 ? relative(Math.round(diff * 1440), 'minute', lang) : relative(h, 'hour', lang);
  }
  return relative(Math.round(diff), 'day', lang);
}
