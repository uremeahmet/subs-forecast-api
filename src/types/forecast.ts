export type MonthKey = `${number}-${string}`;

export interface MonthlyRate {
  date: MonthKey;
  growthRate: number;
  churnRate: number;
  salesMarketingExpense?: number;
}

export interface MonthlyOverride {
  date: MonthKey;
  growth?: number;
  churn?: number;
  salesMarketingExpense?: number;
}

export interface ProjectPricing {
  base: number; // USD
  promoDiscount: number; // 0-1
  promoMonths: number;
}

export interface ProjectMetrics {
  cogs: number; // Cost of goods sold ratio
  fees: number; // Payment processor fee ratio
}

export interface ProjectDefinition {
  id: string;
  name: string;
  description: string;
  startingSubscribers: number;
  pricing: ProjectPricing;
  metrics: ProjectMetrics;
  monthlyDefaults: MonthlyRate[];
}

export interface ProjectInput {
  id: string;
  name?: string;
  description?: string;
  startingSubscribers?: number;
  pricing?: Partial<ProjectPricing>;
  metrics?: Partial<ProjectMetrics>;
  monthlyOverrides: MonthlyOverride[];
}

export interface SharedExpenses {
  generalAndAdministrative: number;
  technologyAndDevelopment: number;
  fulfillmentAndService: number;
  depreciationAndAmortization: number;
}

export interface SharedExpensesOverride {
  generalAndAdministrative?: number | undefined;
  technologyAndDevelopment?: number | undefined;
  fulfillmentAndService?: number | undefined;
  depreciationAndAmortization?: number | undefined;
}
export type SharedExpenseSchedule = Record<string, SharedExpensesOverride>;

export interface GlobalSettings {
  startDate: string;
  endDate: string;
  transactionFeeRate: number;
  failedChargeRate: number;
  refundRate: number;
  reactivationRate: number;
  planUpgradeRate: number;
  planDowngradeRate: number;
  couponRedemptionRate: number;
  vatRate: number;
  corporateTaxRate: number;
  corporateTaxThreshold: number;
  sharedExpenses: SharedExpenses;
  sharedExpenseOverrides?: SharedExpenseSchedule;
}

export interface SimulationRequest {
  projects?: ProjectInput[];
  globalSettings?: Partial<Omit<GlobalSettings, 'sharedExpenses'>> & {
    sharedExpenses?: SharedExpensesOverride;
    sharedExpenseOverrides?: SharedExpenseSchedule;
  };
  selectedProjectIds?: string[];
}

export interface ProjectTimeseriesPoint {
  date: string;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  reactivatedCustomers: number;
  grossRevenue: number;
  mrr: number;
  netRevenue: number;
  fees: number;
  cogs: number;
  arpu: number;
  arr: number;
  ltv: number;
  mrrGrowthRate: number;
  userChurnRate: number;
  revenueChurnRate: number;
  quickRatio: number;
  upgrades: number;
  downgrades: number;
  otherRevenue: number;
  couponsRedeemed: number;
  failedCharges: number;
  refunds: number;
  expansionMRR: number;
  contractionMRR: number;
  churnMRR: number;
  newMRR: number;
  activeSubscriptions: number;
  salesMarketingExpense: number;
  sharedExpenses: number;
  totalExpenses: number;
  vat: number;
  corporateIncomeTax: number;
  profit: number;
}

export interface TimeseriesPoint {
  date: string;
  totals: ProjectTimeseriesPoint;
  projects: Record<string, ProjectTimeseriesPoint>;
}

export interface CohortRow {
  cohortStart: string;
  retention: number[]; // percentages 0-1 for month index
}

export interface CohortMatrix {
  projectId: string;
  rows: CohortRow[];
}

export interface DashboardSummary {
  totalMRR: number;
  grossRevenue: number;
  netRevenue: number;
  totalExpenses: number;
  vat: number;
  corporateIncomeTax: number;
  profit: number;
  totalCustomers: number;
  arr: number;
  ltv: number;
  quickRatio: number;
  mrrGrowthRate: number;
  userChurnRate: number;
  revenueChurnRate: number;
}

export interface SimulationResponse {
  summary: DashboardSummary;
  timeseries: TimeseriesPoint[];
  cohorts: CohortMatrix[];
  metadata: {
    months: string[];
    projects: Array<Pick<ProjectDefinition, 'id' | 'name' | 'description'>>;
    globalDefaults: GlobalSettings;
  };
}
