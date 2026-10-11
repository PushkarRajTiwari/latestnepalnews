// Date converter page: converts as soon as a year, month or day changes.
import { adMonthDays, adToBs, bsMonthDays, bsToAd, formatAd, formatBs, nepaliDigits, todayBs } from './nepali-date.js';

for (const form of document.querySelectorAll('[data-convert]')) {
  const bs = form.dataset.convert === 'bs';
  const lang = form.dataset.lang;
  const n = (value) => (lang === 'np' ? nepaliDigits(value) : String(value));
  const { year, month, day } = form.elements;
  const result = form.querySelector('[data-result]');
  const today = form.querySelector('[data-today]');

  // Keep the day list in step with the month's length.
  function fillDays() {
    const count = (bs ? bsMonthDays : adMonthDays)(Number(year.value), Number(month.value));
    const selected = Math.min(Number(day.value) || 1, count);
    day.replaceChildren(
      ...Array.from({ length: count }, (_, i) => {
        const option = new Option(n(i + 1), String(i + 1));
        option.selected = i + 1 === selected;
        return option;
      })
    );
  }

  function convert() {
    fillDays();
    const [y, m, d] = [year.value, month.value, day.value].map(Number);
    const other = bs ? bsToAd(y, m, d) : adToBs(y, m, d);
    result.textContent = other ? (bs ? formatAd(other, lang) : formatBs(other, lang)) : form.dataset.error;
  }

  function setToday() {
    const nowBs = todayBs();
    const date = bs ? nowBs : nowBs && bsToAd(nowBs.year, nowBs.month, nowBs.day);
    if (!date) return;
    year.value = String(date.year);
    month.value = String(date.month);
    fillDays();
    day.value = String(date.day);
    convert();
  }

  form.addEventListener('change', convert);
  form.addEventListener('submit', (event) => event.preventDefault());
  today.hidden = false;
  today.addEventListener('click', setToday);
  // The page was built up to 30 minutes ago; start from the visitor's today.
  setToday();
}
