/**
 * Booking slot validation.
 *
 * A mentor publishes recurring weekly availability as local wall-clock times.
 * Bookings are stored as UTC instants, so the two have to be compared in one
 * agreed zone — the business timezone below — rather than the server's, which
 * would silently shift every window when the app is deployed somewhere else.
 */

/** Fixed +05:30. India does not observe DST, so a constant offset is exact. */
const BUSINESS_UTC_OFFSET_MINUTES = 5 * 60 + 30;

const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export interface AvailabilitySlot {
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface SlotCheckResult {
  ok: boolean;
  reason?: string;
}

/** Minutes since midnight for an "HH:mm" or "HH:mm:ss.SSS" time string. */
function minutesOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The instant expressed in business-local terms. */
function toBusinessLocal(at: Date): { day: string; minutes: number } {
  const shifted = new Date(at.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return {
    day: DAYS[shifted.getUTCDay()],
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Checks a requested time against a mentor's weekly availability.
 *
 * The whole session has to fit inside a single window — a 30-minute booking
 * starting five minutes before a window closes is not bookable.
 */
export function fitsAvailability(
  scheduledAt: Date,
  durationMinutes: number,
  availability: AvailabilitySlot[]
): SlotCheckResult {
  if (availability.length === 0) {
    return { ok: false, reason: 'This mentor has not published any availability yet.' };
  }

  const { day, minutes } = toBusinessLocal(scheduledAt);
  const end = minutes + durationMinutes;

  const windowsToday = availability.filter((slot) => slot.day_of_week === day);
  if (windowsToday.length === 0) {
    return { ok: false, reason: `This mentor is not available on ${day}s.` };
  }

  const fits = windowsToday.some((slot) => {
    if (!slot.start_time || !slot.end_time) return false;
    const start = minutesOfDay(slot.start_time);
    const finish = minutesOfDay(slot.end_time);
    if (start === null || finish === null) return false;
    return minutes >= start && end <= finish;
  });

  return fits
    ? { ok: true }
    : { ok: false, reason: 'That time is outside this mentor’s available hours.' };
}

/** Two sessions clash when either starts before the other ends. */
export function overlaps(
  aStart: Date,
  aMinutes: number,
  bStart: Date,
  bMinutes: number
): boolean {
  const aEnd = aStart.getTime() + aMinutes * 60_000;
  const bEnd = bStart.getTime() + bMinutes * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

/** Bookings must be far enough ahead that a mentor can actually see them. */
export const MIN_LEAD_TIME_MINUTES = 60;

/** And not so far ahead that the calendar becomes meaningless. */
export const MAX_LEAD_TIME_DAYS = 90;

export function withinBookingWindow(scheduledAt: Date, now = new Date()): SlotCheckResult {
  const leadMinutes = (scheduledAt.getTime() - now.getTime()) / 60_000;

  if (leadMinutes < MIN_LEAD_TIME_MINUTES) {
    return {
      ok: false,
      reason: `Sessions must be booked at least ${MIN_LEAD_TIME_MINUTES} minutes in advance.`,
    };
  }
  if (leadMinutes > MAX_LEAD_TIME_DAYS * 24 * 60) {
    return {
      ok: false,
      reason: `Sessions can only be booked up to ${MAX_LEAD_TIME_DAYS} days ahead.`,
    };
  }

  return { ok: true };
}
