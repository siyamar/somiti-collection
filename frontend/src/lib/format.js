/**
 * Formatting utilities for Bengali digits, currency, and dates
 */

const banglaDigitsMap = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

/**
 * Converts English digits to Bengali digits
 * @param {string | number} input
 * @returns {string}
 */
export function toBanglaDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (match) => banglaDigitsMap[match] || match);
}

/**
 * Formats a number as Bengali currency: ৳ ১২,৪০০
 * @param {number | string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('bn-BD', {
    maximumFractionDigits: 0,
  }).format(num);
  return `৳ ${formatted}`;
}

/**
 * Formats a plain number with Bengali grouping and digits
 * @param {number | string} num
 * @returns {string}
 */
export function formatNumber(num) {
  const val = Number(num) || 0;
  return new Intl.NumberFormat('bn-BD').format(val);
}

/**
 * Formats a plain number for currency display without the taka symbol (e.g. ১২,৪০০)
 * @param {number | string} num
 * @returns {string}
 */
export function formatMoney(num) {
  return formatNumber(num);
}

const bnMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const bnDays = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

/**
 * Formats date into standard Bengali style: "১৪ অক্টোবর ২০২৬, বুধবার"
 * @param {string | Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = toBanglaDigits(d.getDate());
  const month = bnMonths[d.getMonth()];
  const year = toBanglaDigits(d.getFullYear());
  const dayOfWeek = bnDays[d.getDay()];

  return `${day} ${month} ${year}, ${dayOfWeek}`;
}

/**
 * Formats date into short format: "১৪/১০/২০২৬"
 * @param {string | Date} dateInput
 * @returns {string}
 */
export function formatShortDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${toBanglaDigits(day)}/${toBanglaDigits(month)}/${toBanglaDigits(year)}`;
}

/**
 * Formats time into Bengali: "দুপুর ১২:৪০" বা "বিকাল ৪:০৫"
 * @param {string | Date} dateInput
 * @returns {string}
 */
export function formatTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  let period = 'সকাল';
  let h = hours;

  if (hours >= 12 && hours < 15) {
    period = 'দুপুর';
  } else if (hours >= 15 && hours < 18) {
    period = 'বিকাল';
  } else if (hours >= 18 && hours < 20) {
    period = 'সন্ধ্যা';
  } else if (hours >= 20 || hours < 6) {
    period = 'রাত';
  }

  if (h > 12) h -= 12;
  if (h === 0) h = 12;

  return `${period} ${toBanglaDigits(h)}:${toBanglaDigits(minutes)}`;
}

/**
 * Formats relative date: "আজ", "গতকাল", "২ দিন আগে"
 * @param {string | Date} targetDate
 * @param {string | Date} baseDate
 * @returns {string}
 */
export function formatRelativeDate(targetDate, baseDate = new Date()) {
  if (!targetDate) return 'কোনো পূর্ববর্তী জমা নেই';
  const t = new Date(targetDate);
  const b = new Date(baseDate);
  if (isNaN(t.getTime())) return '';

  // Calculate day difference
  const diffTime = b.setHours(0,0,0,0) - t.setHours(0,0,0,0);
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'আজ';
  if (diffDays === 1) return 'গতকাল';
  if (diffDays > 1 && diffDays < 30) return `${toBanglaDigits(diffDays)} দিন আগে`;
  return formatShortDate(targetDate);
}

