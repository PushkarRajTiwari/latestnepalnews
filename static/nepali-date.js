// Bikram Sambat (BS) <-> Gregorian (AD) dates. Used by the build for the
// header date and by the converter page in the browser.
//
// BS months have no fixed length, so each year's month lengths come from a
// table: one string per year from 2000 BS, one digit per month, each digit
// being days minus 29. Years up to 2083 match the published calendar and
// three independent open-source tables. 2084 onwards is the majority of
// those tables and should be checked against the official calendar
// (Nepal Panchanga Nirnayak Samiti) once it is published.
const FIRST_YEAR = 2000;
const MONTHS = [
  '132321110102', '223222101011', '223321101011', '232321110012', '132321110102', '223222101011',
  '223321101011', '232321110012', '222322011002', '223222101011', '223321101011', '232321110012',
  '222322011011', '223222101011', '223321101011', '232321110012', '222322011011', '223222101011',
  '232321101011', '232321110102', '222322101011', '223222101011', '232321110011', '232321110102',
  '222322101011', '223222101011', '232321110012', '132321110102', '223222101011', '223231101011',
  '232321110012', '132321110102', '223222101011', '223321101011', '232321110012', '132322011002',
  '223222101011', '223321101011', '232321110012', '222322011011', '223222101011', '223321101011',
  '232321110012', '222322011011', '223222101011', '232321101011', '232321110012', '222322101011',
  '223222101011', '232321110011', '232321110102', '222322101011', '223222101011', '232321110011',
  '232321110102', '223222101011', '223231101011', '232321110012', '132321110102', '223222101011',
  '223321101011', '232321110012', '132322010102', '223222101011', '223321101011', '232321110012',
  '222322011002', '223222101011', '223321101011', '232321110012', '222322011011', '223222101011',
  '232321101011', '232321110012', '222322101011', '223222101011', '232321110011', '232321110102',
  '222322101011', '223222101011', '232321110011', '232321110102', '223222101011', '223222101011',
  '232321110012', '132321110102', '223222101011', '223222110111', '123312110111', '132321110111',
  '132321110111',
];
// 1 Baisakh 2000 BS was 14 April 1943.
const EPOCH = Date.UTC(1943, 3, 14);
const DAY = 86_400_000;

export const bsRange = { first: FIRST_YEAR, last: FIRST_YEAR + MONTHS.length - 1 };

export const bsMonths = {
  np: ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'],
  en: ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
};
export const adMonths = {
  np: ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export const weekdays = {
  np: ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

// Days in a BS month (month 1-12), or 0 outside the table.
export function bsMonthDays(year, month) {
  const row = MONTHS[year - FIRST_YEAR];
  return row && month >= 1 && month <= 12 ? 29 + Number(row[month - 1]) : 0;
}

export function adMonthDays(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// BS -> AD. Returns { year, month, day, weekday } (weekday 0 = Sunday), or
// null if the date is outside the table or does not exist.
export function bsToAd(year, month, day) {
  if (day < 1 || day > bsMonthDays(year, month)) return null;
  let days = day - 1;
  for (let y = FIRST_YEAR; y < year; y++) for (let m = 1; m <= 12; m++) days += bsMonthDays(y, m);
  for (let m = 1; m < month; m++) days += bsMonthDays(year, m);
  const date = new Date(EPOCH + days * DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() };
}

// AD -> BS. Same shape as bsToAd, or null outside the table.
export function adToBs(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > adMonthDays(year, month)) return null;
  const time = Date.UTC(year, month - 1, day);
  const weekday = new Date(time).getUTCDay();
  let days = Math.round((time - EPOCH) / DAY);
  if (days < 0) return null;
  for (let y = FIRST_YEAR; y <= bsRange.last; y++) {
    for (let m = 1; m <= 12; m++) {
      const length = bsMonthDays(y, m);
      if (days < length) return { year: y, month: m, day: days + 1, weekday };
      days -= length;
    }
  }
  return null;
}

// Today's BS date in Nepal (UTC+5:45).
export function todayBs(now = new Date()) {
  const nepal = new Date(now.getTime() + 345 * 60_000);
  return adToBs(nepal.getUTCFullYear(), nepal.getUTCMonth() + 1, nepal.getUTCDate());
}

const DEVANAGARI = '०१२३४५६७८९';
export function nepaliDigits(value) {
  return String(value).replace(/\d/g, (d) => DEVANAGARI[d]);
}

// "२४ असोज २०८३, शनिबार" / "24 Ashwin 2083, Saturday"
export function formatBs(date, lang) {
  if (!date) return '';
  const text = `${date.day} ${bsMonths[lang][date.month - 1]} ${date.year}, ${weekdays[lang][date.weekday]}`;
  return lang === 'np' ? nepaliDigits(text) : text;
}

export function formatAd(date, lang) {
  if (!date) return '';
  const text = `${date.day} ${adMonths[lang][date.month - 1]} ${date.year}, ${weekdays[lang][date.weekday]}`;
  return lang === 'np' ? nepaliDigits(text) : text;
}
