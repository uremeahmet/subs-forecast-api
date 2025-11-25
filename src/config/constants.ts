import { GlobalSettings } from '../types/forecast';
import { monthRange } from '../lib/month';

export const FORECAST_START = '2026-04-01';
export const FORECAST_END = '2028-12-01';

export const MONTH_SEQUENCE = monthRange(FORECAST_START, FORECAST_END);

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  startDate: FORECAST_START,
  endDate: FORECAST_END,
  transactionFeeRate: 0.029,
  failedChargeRate: 0.01,
  refundRate: 0.005,
  reactivationRate: 0.02,
  planUpgradeRate: 0.015,
  planDowngradeRate: 0.008,
  couponRedemptionRate: 0.3,
  vatRate: 0.05,
  corporateTaxRate: 0.05,
  corporateTaxThreshold: 375000,
  sharedExpenses: {
    generalAndAdministrative: 0,
    technologyAndDevelopment: 0,
    fulfillmentAndService: 0,
    depreciationAndAmortization: 0,
  },
};
