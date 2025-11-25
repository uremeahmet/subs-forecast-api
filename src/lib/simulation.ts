import { DEFAULT_PROJECTS } from '../config/defaultProjects';
import { DEFAULT_GLOBAL_SETTINGS, MONTH_SEQUENCE } from '../config/constants';
import {
  CohortMatrix,
  CohortRow,
  GlobalSettings,
  MonthlyOverride,
  MonthlyRate,
  ProjectDefinition,
  ProjectInput,
  ProjectTimeseriesPoint,
  SimulationRequest,
  SimulationResponse,
  TimeseriesPoint,
  MonthKey,
  SharedExpenses,
  SharedExpenseSchedule,
  SharedExpensesOverride,
} from '../types/forecast';
import { normalizeMonthKey } from './month';
import { clamp, round2, round4, safeDivide } from './math';

interface ResolvedProject extends ProjectDefinition {
  monthlyOverrides: MonthlyOverride[];
}

interface ProjectSimulationResult {
  project: Pick<ProjectDefinition, 'id' | 'name' | 'description'>;
  series: ProjectTimeseriesPoint[];
  cohorts: CohortMatrix;
}

const resolveProjectConfig = (base: ProjectDefinition, input?: ProjectInput): ResolvedProject => {
  return {
    ...base,
    name: input?.name ?? base.name,
    description: input?.description ?? base.description,
    startingSubscribers: input?.startingSubscribers ?? base.startingSubscribers,
    pricing: { ...base.pricing, ...input?.pricing },
    metrics: { ...base.metrics, ...input?.metrics },
    monthlyDefaults: base.monthlyDefaults,
    monthlyOverrides: input?.monthlyOverrides ?? [],
  };
};

const buildMonthlyRates = (project: ResolvedProject): MonthlyRate[] => {
  const overridesMap = new Map<string, MonthlyOverride>();
  project.monthlyOverrides.forEach((entry) => {
    overridesMap.set(normalizeMonthKey(entry.date), entry);
  });

  return MONTH_SEQUENCE.map((month, index) => {
    const defaultRate = project.monthlyDefaults[index];
    const override = overridesMap.get(month.key);
    return {
      date: month.key as MonthKey,
      growthRate: override?.growth ?? defaultRate?.growthRate ?? 0.15,
      churnRate: override?.churn ?? defaultRate?.churnRate ?? 0.04,
      salesMarketingExpense:
        override?.salesMarketingExpense ?? defaultRate?.salesMarketingExpense ?? 0,
    };
  });
};

const emptyPoint = (): ProjectTimeseriesPoint => ({
  date: '',
  activeCustomers: 0,
  newCustomers: 0,
  churnedCustomers: 0,
  reactivatedCustomers: 0,
  grossRevenue: 0,
  mrr: 0,
  netRevenue: 0,
  fees: 0,
  cogs: 0,
  arpu: 0,
  arr: 0,
  ltv: 0,
  mrrGrowthRate: 0,
  userChurnRate: 0,
  revenueChurnRate: 0,
  quickRatio: 0,
  upgrades: 0,
  downgrades: 0,
  otherRevenue: 0,
  couponsRedeemed: 0,
  failedCharges: 0,
  refunds: 0,
  expansionMRR: 0,
  contractionMRR: 0,
  churnMRR: 0,
  newMRR: 0,
  activeSubscriptions: 0,
  salesMarketingExpense: 0,
  sharedExpenses: 0,
  totalExpenses: 0,
  vat: 0,
  corporateIncomeTax: 0,
  profit: 0,
});

const aggregatePoints = (points: ProjectTimeseriesPoint[]): ProjectTimeseriesPoint => {
  return points.reduce((acc, point) => {
    acc.activeCustomers += point.activeCustomers;
    acc.newCustomers += point.newCustomers;
    acc.churnedCustomers += point.churnedCustomers;
    acc.reactivatedCustomers += point.reactivatedCustomers;
     acc.grossRevenue += point.grossRevenue;
    acc.mrr += point.mrr;
    acc.netRevenue += point.netRevenue;
    acc.fees += point.fees;
     acc.cogs += point.cogs;
    acc.upgrades += point.upgrades;
    acc.downgrades += point.downgrades;
    acc.otherRevenue += point.otherRevenue;
    acc.couponsRedeemed += point.couponsRedeemed;
    acc.failedCharges += point.failedCharges;
    acc.refunds += point.refunds;
    acc.expansionMRR += point.expansionMRR;
    acc.contractionMRR += point.contractionMRR;
    acc.churnMRR += point.churnMRR;
    acc.newMRR += point.newMRR;
    acc.activeSubscriptions += point.activeSubscriptions;
     acc.salesMarketingExpense += point.salesMarketingExpense;
     acc.sharedExpenses += point.sharedExpenses;
     acc.totalExpenses += point.totalExpenses;
     acc.vat += point.vat;
     acc.corporateIncomeTax += point.corporateIncomeTax;
     acc.profit += point.profit;
    return acc;
  }, emptyPoint());
};

const mergeSharedExpenses = (
  base: SharedExpenses,
  override?: SharedExpensesOverride
): SharedExpenses => ({
  generalAndAdministrative: override?.generalAndAdministrative ?? base.generalAndAdministrative,
  technologyAndDevelopment: override?.technologyAndDevelopment ?? base.technologyAndDevelopment,
  fulfillmentAndService: override?.fulfillmentAndService ?? base.fulfillmentAndService,
  depreciationAndAmortization:
    override?.depreciationAndAmortization ?? base.depreciationAndAmortization,
});

const computeMonthlySharedExpenseTotal = (
  monthKey: string,
  base: SharedExpenses,
  overrides?: SharedExpenseSchedule
) => {
  const monthOverride = overrides?.[monthKey];
  const general = monthOverride?.generalAndAdministrative ?? base.generalAndAdministrative ?? 0;
  const technology = monthOverride?.technologyAndDevelopment ?? base.technologyAndDevelopment ?? 0;
  const fulfillment = monthOverride?.fulfillmentAndService ?? base.fulfillmentAndService ?? 0;
  const depreciation =
    monthOverride?.depreciationAndAmortization ?? base.depreciationAndAmortization ?? 0;

  return round2(general + technology + fulfillment + depreciation);
};

const finalizeAggregatePoint = (point: ProjectTimeseriesPoint) => {
  point.arpu = round2(safeDivide(point.mrr, point.activeCustomers));
  point.arr = round2(point.mrr * 12);
  point.userChurnRate = round4(safeDivide(point.churnedCustomers, point.activeCustomers + point.churnedCustomers));
  point.ltv = round2(safeDivide(point.arpu, Math.max(point.userChurnRate, 0.0001), point.arpu * 18));
  point.quickRatio = round2(
    safeDivide(point.newMRR + point.expansionMRR, point.churnMRR + point.contractionMRR, 5)
  );
};

const simulateSingleProject = (
  project: ResolvedProject,
  globalSettings: GlobalSettings
): ProjectSimulationResult => {
  const monthlyRates = buildMonthlyRates(project);
  let activeCustomers = project.startingSubscribers;
  let previousMRR = activeCustomers * project.pricing.base;
  let churnReservoir = 0;
  const series: ProjectTimeseriesPoint[] = [];
  const vatRate = globalSettings.vatRate ?? 0.05;

  interface CohortState {
    key: string;
    monthIndex: number;
    history: number[];
  }

  const cohorts: CohortState[] = [];

  monthlyRates.forEach((rate, index) => {
    const monthMeta = MONTH_SEQUENCE[index]!;
    const normalizedGrowth = clamp(rate.growthRate, 0, 0.8);
    const normalizedChurn = clamp(rate.churnRate, 0, 0.9);

    const newCustomers = Math.round(activeCustomers * normalizedGrowth);
    const churnedCustomers = Math.round(activeCustomers * normalizedChurn);
    churnReservoir += churnedCustomers;
    const reactivatedCustomers = Math.min(
      Math.round(churnReservoir * globalSettings.reactivationRate),
      churnReservoir
    );
    churnReservoir -= reactivatedCustomers;

    const priceMultiplier = index < project.pricing.promoMonths ? 1 - project.pricing.promoDiscount : 1;
    const effectivePrice = project.pricing.base * priceMultiplier;

    const upgrades = Math.round(activeCustomers * globalSettings.planUpgradeRate);
    const downgrades = Math.round(activeCustomers * globalSettings.planDowngradeRate);

    const churnMRR = churnedCustomers * effectivePrice;
    const newMRR = newCustomers * effectivePrice;
    const expansionMRR = upgrades * effectivePrice;
    const contractionMRR = downgrades * effectivePrice * 0.6;

    const nextActive = Math.max(0, activeCustomers + newCustomers + reactivatedCustomers - churnedCustomers);
    const grossRevenue = round2(nextActive * effectivePrice + expansionMRR - contractionMRR);
    const netRevenueBeforeVAT = round2(grossRevenue / (1 + vatRate));
    const vat = round2(grossRevenue - netRevenueBeforeVAT);

    const feesRate = project.metrics.fees ?? globalSettings.transactionFeeRate;
    const fees = round2(grossRevenue * feesRate);
    const failedCharges = round2(grossRevenue * globalSettings.failedChargeRate);
    const refunds = round2(grossRevenue * globalSettings.refundRate);
    const cogs = round2(netRevenueBeforeVAT * project.metrics.cogs);
    const salesMarketingExpense = round2(rate.salesMarketingExpense ?? 0);
    const variableExpenses = fees + failedCharges + refunds + cogs + salesMarketingExpense;
    const netRevenue = round2(grossRevenue - variableExpenses - vat);

    const mrr = round2(netRevenueBeforeVAT);
    const arpu = round2(safeDivide(mrr, nextActive));
    const arr = round2(mrr * 12);
    const ltv = round2(safeDivide(arpu, Math.max(normalizedChurn, 0.0001), arpu * 24));
    const mrrGrowthRate = round4(safeDivide(mrr - previousMRR, previousMRR));
    const revenueChurnRate = round4(safeDivide(churnMRR + contractionMRR, previousMRR));
    const quickRatio = round2(
      safeDivide(newMRR + expansionMRR, churnMRR + contractionMRR, 5)
    );

    const couponsRedeemed = index < project.pricing.promoMonths ? Math.round(newCustomers * globalSettings.couponRedemptionRate) : 0;

    const point: ProjectTimeseriesPoint = {
      date: monthMeta.key,
      activeCustomers: nextActive,
      newCustomers,
      churnedCustomers,
      reactivatedCustomers,
      grossRevenue,
      mrr,
      netRevenue,
      fees,
      cogs,
      arpu,
      arr,
      ltv,
      mrrGrowthRate,
      userChurnRate: normalizedChurn,
      revenueChurnRate,
      quickRatio,
      upgrades,
      downgrades,
      otherRevenue: 0,
      couponsRedeemed,
      failedCharges,
      refunds,
      expansionMRR,
      contractionMRR,
      churnMRR,
      newMRR,
      activeSubscriptions: nextActive,
      salesMarketingExpense,
      sharedExpenses: 0,
      totalExpenses: variableExpenses,
      vat,
      corporateIncomeTax: 0,
      profit: netRevenue,
    };

    series.push(point);

    cohorts.forEach((cohort) => {
      if (cohort.monthIndex === index) {
        return;
      }
      const previousRetention = cohort.history[cohort.history.length - 1] ?? 1;
      const nextRetention = round4(Math.max(0, previousRetention * (1 - normalizedChurn)));
      cohort.history.push(nextRetention);
    });

    if (newCustomers > 0) {
      cohorts.push({ key: monthMeta.key, monthIndex: index, history: [1] });
    }

    previousMRR = mrr;
    activeCustomers = nextActive;
  });

  const cohortMatrix: CohortMatrix = {
    projectId: project.id,
    rows: cohorts.map<CohortRow>((cohort) => ({
      cohortStart: cohort.key,
      retention: cohort.history,
    })),
  };

  return {
    project: { id: project.id, name: project.name, description: project.description },
    series,
    cohorts: cohortMatrix,
  };
};

export const simulateForecast = (
  payload?: SimulationRequest,
  projectDefinitions?: ProjectDefinition[]
): SimulationResponse => {
  const incomingGlobal = payload?.globalSettings ?? {};
  const globalSettings: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...incomingGlobal,
    sharedExpenses: mergeSharedExpenses(
      DEFAULT_GLOBAL_SETTINGS.sharedExpenses,
      incomingGlobal.sharedExpenses
    ),
    sharedExpenseOverrides: {
      ...(DEFAULT_GLOBAL_SETTINGS.sharedExpenseOverrides ?? {}),
      ...(incomingGlobal.sharedExpenseOverrides ?? {}),
    },
  };

  const overrideMap = new Map<string, ProjectInput>();
  payload?.projects?.forEach((project) => overrideMap.set(project.id, project));

  const baseProjects = projectDefinitions?.length ? projectDefinitions : DEFAULT_PROJECTS;

  const resolvedProjects = baseProjects.map((project) =>
    resolveProjectConfig(project, overrideMap.get(project.id))
  );

  const selectedIds = new Set(
    payload?.selectedProjectIds?.length ? payload.selectedProjectIds : resolvedProjects.map((project) => project.id)
  );

  const projectResults = resolvedProjects.map((project) => simulateSingleProject(project, globalSettings));

  const yearlyRevenueTracker = new Map<number, number>();

  const timeseries: TimeseriesPoint[] = MONTH_SEQUENCE.map((month, index) => {
    const projects: Record<string, ProjectTimeseriesPoint> = {};
    const selectedPoints: ProjectTimeseriesPoint[] = [];

    projectResults.forEach((result) => {
      const point = result.series[index]!;
      projects[result.project.id] = point;
      if (selectedIds.has(result.project.id)) {
        selectedPoints.push(point);
      }
    });

    const totals = aggregatePoints(selectedPoints);
    totals.date = month.key;
    const sharedExpenseTotal = computeMonthlySharedExpenseTotal(
      month.key,
      globalSettings.sharedExpenses,
      globalSettings.sharedExpenseOverrides
    );
    totals.sharedExpenses = sharedExpenseTotal;
    totals.totalExpenses += sharedExpenseTotal;
    const year = month.date.getFullYear();
    const cumulativeRevenue = (yearlyRevenueTracker.get(year) ?? 0) + totals.grossRevenue;
    yearlyRevenueTracker.set(year, cumulativeRevenue);

    const taxableBase = Math.max(0, totals.grossRevenue - totals.totalExpenses - totals.vat);
    const shouldApplyTax = cumulativeRevenue >= globalSettings.corporateTaxThreshold;
    const corporateIncomeTax = shouldApplyTax
      ? round2(taxableBase * globalSettings.corporateTaxRate)
      : 0;
    totals.corporateIncomeTax = corporateIncomeTax;
    const totalExpenseWithTax = totals.totalExpenses + totals.vat + corporateIncomeTax;
    totals.netRevenue = round2(totals.grossRevenue - totalExpenseWithTax);
    totals.profit = totals.netRevenue;
    finalizeAggregatePoint(totals);

    return {
      date: month.key,
      projects,
      totals,
    };
  });

  timeseries.forEach((point, index) => {
    if (index === 0) {
      point.totals.mrrGrowthRate = 0;
      point.totals.revenueChurnRate = 0;
      return;
    }
    const prevEntry = timeseries[index - 1];
    if (!prevEntry) {
      return;
    }
    const prev = prevEntry.totals;
    point.totals.mrrGrowthRate = round4(safeDivide(point.totals.mrr - prev.mrr, prev.mrr));
    point.totals.revenueChurnRate = round4(
      safeDivide(point.totals.churnMRR + point.totals.contractionMRR, prev.mrr)
    );
  });

  const latestTotals = timeseries[timeseries.length - 1]?.totals ?? emptyPoint();

  const summary = {
    totalMRR: round2(latestTotals.mrr),
    grossRevenue: round2(latestTotals.grossRevenue),
    netRevenue: round2(latestTotals.netRevenue),
    totalExpenses: round2(latestTotals.totalExpenses),
    vat: round2(latestTotals.vat),
    corporateIncomeTax: round2(latestTotals.corporateIncomeTax),
    profit: round2(latestTotals.profit),
    totalCustomers: Math.round(latestTotals.activeCustomers),
    arr: round2(latestTotals.arr),
    ltv: round2(latestTotals.ltv),
    quickRatio: round2(latestTotals.quickRatio),
    mrrGrowthRate: latestTotals.mrrGrowthRate,
    userChurnRate: latestTotals.userChurnRate,
    revenueChurnRate: latestTotals.revenueChurnRate,
  };

  const cohorts = projectResults.map((result) => result.cohorts);

  return {
    summary,
    timeseries,
    cohorts,
    metadata: {
      months: MONTH_SEQUENCE.map((month) => month.key),
      projects: projectResults.map((result) => result.project),
      globalDefaults: globalSettings,
    },
  };
};

export const getDefaultForecastPayload = (projects: ProjectDefinition[]) => ({
  projects: projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    startingSubscribers: project.startingSubscribers,
    pricing: project.pricing,
    metrics: project.metrics,
    monthlyData: project.monthlyDefaults,
  })),
  globalSettings: DEFAULT_GLOBAL_SETTINGS,
});
