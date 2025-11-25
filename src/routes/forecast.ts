import { Router } from 'express';
import { z } from 'zod';
import { getDefaultForecastPayload, simulateForecast } from '../lib/simulation';
import { SimulationRequest } from '../types/forecast';

const router = Router();

const monthlyOverrideSchema = z.object({
  date: z.string(),
  growth: z.number().optional(),
  churn: z.number().optional(),
});

const pricingSchema = z.object({
  base: z.number().positive().optional(),
  promoDiscount: z.number().min(0).max(1).optional(),
  promoMonths: z.number().int().min(0).optional(),
});

const metricsSchema = z.object({
  cogs: z.number().min(0).max(1).optional(),
  fees: z.number().min(0).max(1).optional(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  startingSubscribers: z.number().int().nonnegative().optional(),
  pricing: pricingSchema.partial().optional(),
  metrics: metricsSchema.partial().optional(),
  monthlyOverrides: z.array(monthlyOverrideSchema).default([]),
});

const globalSettingsSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    transactionFeeRate: z.number().optional(),
    failedChargeRate: z.number().optional(),
    refundRate: z.number().optional(),
    reactivationRate: z.number().optional(),
    planUpgradeRate: z.number().optional(),
    planDowngradeRate: z.number().optional(),
    couponRedemptionRate: z.number().optional(),
  })
  .partial();

const requestSchema = z.object({
  projects: z.array(projectSchema).optional(),
  globalSettings: globalSettingsSchema.optional(),
  selectedProjectIds: z.array(z.string()).optional(),
});

router.get('/defaults', (_req, res) => {
  const blueprint = getDefaultForecastPayload();
  const simulation = simulateForecast();
  res.json({ blueprint, simulation });
});

router.post('/simulate', (req, res) => {
  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const payload = parseResult.data as SimulationRequest;
  const response = simulateForecast(payload);
  return res.json(response);
});

export default router;
