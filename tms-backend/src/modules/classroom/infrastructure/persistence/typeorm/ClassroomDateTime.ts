export function dateOnlyToDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function combineDateAndTime(dateOnly: string, timeValue: string): Date {
  const date = dateOnlyToDate(dateOnly);
  const [hours, minutes, seconds] = timeValue.split(':').map(Number);

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
