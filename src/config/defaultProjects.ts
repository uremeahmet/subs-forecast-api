import { DEFAULT_MONTHLY_RATES } from './rateTables';
import { ProjectDefinition } from '../types/forecast';

const scaleMonthlyRates = (growthMultiplier: number, churnDelta: number) =>
  DEFAULT_MONTHLY_RATES.map((rate) => ({
    date: rate.date,
    growthRate: parseFloat(Math.max(0.03, Math.min(0.45, rate.growthRate * growthMultiplier)).toFixed(4)),
    churnRate: parseFloat(Math.max(0.01, rate.churnRate + churnDelta).toFixed(4)),
    salesMarketingExpense: rate.salesMarketingExpense ?? 0,
  }));

export const DEFAULT_PROJECTS: ProjectDefinition[] = [
  {
    id: 'flower',
    name: 'Flower Subscription',
    description: 'Weekly designer bouquets delivered fresh.',
    startingSubscribers: 820,
    pricing: { base: 49, promoDiscount: 0.4, promoMonths: 3 },
    metrics: { cogs: 0.48, fees: 0.029 },
    monthlyDefaults: scaleMonthlyRates(1.05, -0.01),
  },
  {
    id: 'dog-box',
    name: 'Dog Treat Box',
    description: 'Healthy treats and toys for dogs.',
    startingSubscribers: 1250,
    pricing: { base: 39, promoDiscount: 0.35, promoMonths: 2 },
    metrics: { cogs: 0.44, fees: 0.029 },
    monthlyDefaults: scaleMonthlyRates(0.95, -0.005),
  },
  {
    id: 'coffee-club',
    name: 'Coffee Club',
    description: 'Single-origin beans roasted weekly.',
    startingSubscribers: 2100,
    pricing: { base: 29, promoDiscount: 0.25, promoMonths: 1 },
    metrics: { cogs: 0.38, fees: 0.029 },
    monthlyDefaults: scaleMonthlyRates(0.9, 0.0),
  },
  {
    id: 'wellness-kit',
    name: 'Wellness Kit',
    description: 'Supplements and wellness essentials.',
    startingSubscribers: 640,
    pricing: { base: 59, promoDiscount: 0.3, promoMonths: 3 },
    metrics: { cogs: 0.5, fees: 0.03 },
    monthlyDefaults: scaleMonthlyRates(1.1, -0.012),
  },
  {
    id: 'education-pack',
    name: 'Education Pack',
    description: 'STEM projects for kids delivered monthly.',
    startingSubscribers: 980,
    pricing: { base: 44, promoDiscount: 0.28, promoMonths: 2 },
    metrics: { cogs: 0.46, fees: 0.029 },
    monthlyDefaults: scaleMonthlyRates(1, -0.004),
  },
];
