import { MONTH_SEQUENCE } from './constants';
import type { MonthKey, MonthlyRate } from '../types/forecast';

const buildSequence = (length: number, start: number, drift: number, amplitude: number) => {
  return Array.from({ length }).map((_, idx) => {
    const seasonal = Math.sin(idx / 2.5) * amplitude;
    return parseFloat((start + drift * idx + seasonal).toFixed(4));
  });
};

const growthSequence = buildSequence(MONTH_SEQUENCE.length, 0.22, -0.0022, 0.015);
const churnSequence = buildSequence(MONTH_SEQUENCE.length, 0.07, 0.0004, 0.01);

export const DEFAULT_MONTHLY_RATES: MonthlyRate[] = MONTH_SEQUENCE.map((month, idx) => {
  const safeGrowth = growthSequence[idx] ?? growthSequence[growthSequence.length - 1] ?? 0.15;
  const safeChurn = churnSequence[idx] ?? churnSequence[churnSequence.length - 1] ?? 0.04;
  return {
    date: month.key as MonthKey,
    growthRate: Math.max(0.05, safeGrowth),
    churnRate: Math.max(0.015, safeChurn),
    salesMarketingExpense: 0,
  };
});
