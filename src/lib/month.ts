import { addMonths, differenceInMonths, format, parseISO } from 'date-fns';

export interface MonthDescriptor {
  key: string; // yyyy-MM
  label: string; // Apr 2026
  date: Date;
  index: number;
}

export const monthRange = (startIso: string, endIso: string): MonthDescriptor[] => {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const totalMonths = differenceInMonths(end, start) + 1;

  return Array.from({ length: totalMonths }).map((_, idx) => {
    const date = addMonths(start, idx);
    return {
      key: format(date, 'yyyy-MM'),
      label: format(date, 'LLL yyyy'),
      date,
      index: idx,
    };
  });
};

export const normalizeMonthKey = (iso: string) => format(parseISO(`${iso}-01`), 'yyyy-MM');
