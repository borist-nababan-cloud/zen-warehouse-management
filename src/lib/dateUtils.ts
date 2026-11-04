/**
 * Zen Family Spa Operational Date & Timezone Utilities
 * Standard: Asia/Jakarta (WIB, UTC+7)
 * 
 * Guarantees that regardless of the user's local browser device timezone (e.g., UTC, PST, GMT, JST),
 * the operational business day, shift boundaries, and database query filters always execute
 * strictly against Indonesian Western Time (WIB, UTC+7).
 */

export interface WIBDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string;   // 'YYYY-MM-DD'
  timeStr: string;   // 'HH:mm:ss'
  yymmdd: string;    // 'YYMMDD'
}

export interface OperationalDateInfo {
  dateStr: string;           // Active operational date in 'YYYY-MM-DD'
  isOvernight: boolean;      // True if between 00:00:00 and 07:59:59 WIB (Night shift review)
  wibNow: WIBDateParts;      // Real-time WIB clock snapshot
}

export interface OperationalBounds {
  localDateStr: string;      // 'YYYY-MM-DD'
  yymmdd: string;            // 'YYMMDD'
  nextDateStr: string;       // 'YYYY-MM-DD' (date + 1 day)
  startTimestamp: string;    // 'YYYY-MM-DDT00:00:00'
  endTimestamp: string;      // 'YYYY-MM-DDT23:59:59.999Z'
}

/**
 * Extracts exact date & time components in Asia/Jakarta (WIB, UTC+7).
 * Safe across all international browsers and OS timezones.
 */
export function getWIBDateParts(d: Date = new Date()): WIBDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);
  const second = parseInt(map.second || '0', 10);

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const dateStr = `${year}-${monthStr}-${dayStr}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  const yymmdd = `${String(year).slice(-2)}${monthStr}${dayStr}`;

  return { year, month, day, hour, minute, second, dateStr, timeStr, yymmdd };
}

/**
 * Calculates the authoritative Zen operational business day.
 * - Outlets close transactions at 23:30 WIB.
 * - Between 00:00:00 and 07:59:59 WIB, automatically defaults to yesterday's closing business day (Overnight review).
 * - From 08:00:00 WIB onwards, rolls over to today's date.
 */
export function getAutoWIBOperationalDate(d: Date = new Date()): OperationalDateInfo {
  const wibNow = getWIBDateParts(d);
  const isOvernight = wibNow.hour < 8;

  if (isOvernight) {
    // Exactly 24 hours prior
    const yesterdayDate = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayWIB = getWIBDateParts(yesterdayDate);
    return {
      dateStr: yesterdayWIB.dateStr,
      isOvernight: true,
      wibNow,
    };
  }

  return {
    dateStr: wibNow.dateStr,
    isOvernight: false,
    wibNow,
  };
}

/**
 * Computes deterministic operational bounds for Supabase database queries.
 */
export function getOperationalBounds(dateStr: string): OperationalBounds {
  const [y, m, d] = dateStr.split('-').map(Number);
  const yearShort = String(y).slice(-2);
  const monthStr = String(m).padStart(2, '0');
  const dayStr = String(d).padStart(2, '0');
  const yymmdd = `${yearShort}${monthStr}${dayStr}`;

  // Next calendar day calculation (UTC-safe)
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(nextDate.getUTCDate()).padStart(2, '0');
  const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

  return {
    localDateStr: dateStr,
    yymmdd,
    nextDateStr,
    startTimestamp: `${dateStr}T00:00:00`,
    endTimestamp: `${dateStr}T23:59:59.999Z`,
  };
}

/**
 * Returns formatted live WIB clock string for the UI header.
 */
export function getWIBLiveClockString(d: Date = new Date()): string {
  const parts = getWIBDateParts(d);
  return parts.timeStr;
}

