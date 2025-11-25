import { Router } from 'express';
import { z } from 'zod';
import { getDefaultForecastPayload, simulateForecast } from '../lib/simulation';
import { SimulationRequest } from '../types/forecast';
import { listProjects } from '../services/projectStore';

const router = Router();

const monthlyOverrideSchema = z.object({
  date: z.string(),
  growth: z.number().optional(),
  churn: z.number().optional(),
  salesMarketingExpense: z.number().optional(),
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

const sharedExpensesSchema = z
  .object({
    generalAndAdministrative: z.number().optional(),
    technologyAndDevelopment: z.number().optional(),
    fulfillmentAndService: z.number().optional(),
    depreciationAndAmortization: z.number().optional(),
  })
  .partial();

const sharedExpenseOverridesSchema = z.record(z.string(), sharedExpensesSchema).optional();

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
    vatRate: z.number().optional(),
    corporateTaxRate: z.number().optional(),
    corporateTaxThreshold: z.number().optional(),
    sharedExpenses: sharedExpensesSchema.optional(),
    sharedExpenseOverrides: sharedExpenseOverridesSchema,
  })
  .partial();

const requestSchema = z.object({
  projects: z.array(projectSchema).optional(),
  globalSettings: globalSettingsSchema.optional(),
  selectedProjectIds: z.array(z.string()).optional(),
});

router.get('/defaults', async (_req, res) => {
  try {
    const projects = await listProjects();
    const blueprint = getDefaultForecastPayload(projects);
    const simulation = simulateForecast(undefined, projects);
    res.json({ blueprint, simulation });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/simulate', async (req, res) => {
  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  try {
    const projects = await listProjects();
    const payload = parseResult.data as SimulationRequest;
    const response = simulateForecast(payload, projects);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
