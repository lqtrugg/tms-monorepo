import { ClassServiceError } from '../../shared/errors/class.error.js';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function normalizeTime(value: string, fieldName: string): string {
  const match = TIME_PATTERN.exec(value.trim());

  if (!match) {
    throw new ClassServiceError(`${fieldName} must be in HH:mm or HH:mm:ss format`, 400);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new ClassServiceError(`${fieldName} has invalid time value`, 400);
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function dateOnlyToDate(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    throw new ClassServiceError('invalid date value', 500);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new ClassServiceError('invalid date value', 500);
  }

  return date;
}

export function combineDateAndTime(dateOnly: string, timeValue: string): Date {
  const date = dateOnlyToDate(dateOnly);
  const normalizedTime = normalizeTime(timeValue, 'start_time');
  const [hours, minutes, seconds] = normalizedTime.split(':').map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    0,
  );
}
