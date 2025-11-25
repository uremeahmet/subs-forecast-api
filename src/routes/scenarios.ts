import { Router } from 'express';
import { z } from 'zod';
import {
  listScenarios,
  createScenario,
  updateScenario,
  getScenarioById,
} from '../services/scenarioStore';

const router = Router();

const rateOverrideSchema = z.object({
  growth: z.number().optional(),
  churn: z.number().optional(),
  salesMarketingExpense: z.number().optional(),
});

const overridesSchema = z.record(z.string(), z.record(z.string(), rateOverrideSchema)).default({});

const projectSettingsSchema = z
  .record(
    z.string(),
    z.object({
      startingSubscribers: z.number().optional(),
      pricing: z.record(z.string(), z.number()).optional(),
      metrics: z.record(z.string(), z.number()).optional(),
    })
  )
  .default({});

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
  .partial()
  .optional();

const scenarioSchema = z.object({
  name: z.string().min(1),
  notes: z.string().max(2000).optional(),
  overrides: overridesSchema,
  projectSettings: projectSettingsSchema,
  selectedProjectIds: z.array(z.string()).min(1),
  globalSettings: globalSettingsSchema,
});

router.get('/', async (_req, res) => {
  try {
    const scenarios = await listScenarios();
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const scenario = await getScenarioById(req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    return res.json(scenario);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/', async (req, res) => {
  const parseResult = scenarioSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  try {
    const scenario = await createScenario(parseResult.data);
    return res.status(201).json(scenario);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/:id', async (req, res) => {
  const parseResult = scenarioSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  try {
    const scenario = await updateScenario(req.params.id, parseResult.data);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    return res.json(scenario);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

