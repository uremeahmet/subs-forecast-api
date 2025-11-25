import type { Document, ObjectId } from 'mongodb';
import type { GlobalSettings, SharedExpenses, SharedExpenseSchedule } from './forecast';

export interface RateOverrideState {
  growth?: number | undefined;
  churn?: number | undefined;
}

export type MonthlyOverrideState = Record<string, RateOverrideState>;

export interface ProjectSettingAdjustments {
  startingSubscribers?: number | undefined;
  pricing?: Record<string, number> | undefined;
  metrics?: Record<string, number> | undefined;
}

export type ProjectSettingsState = Record<string, ProjectSettingAdjustments>;

type OptionalProps<T> = {
  [Key in keyof T]?: T[Key] | undefined;
};

type ScenarioSharedExpenses = OptionalProps<SharedExpenses>;

export interface ScenarioGlobalSettings {
  startDate?: string | undefined;
  endDate?: string | undefined;
  transactionFeeRate?: number | undefined;
  failedChargeRate?: number | undefined;
  refundRate?: number | undefined;
  reactivationRate?: number | undefined;
  planUpgradeRate?: number | undefined;
  planDowngradeRate?: number | undefined;
  couponRedemptionRate?: number | undefined;
  vatRate?: number | undefined;
  corporateTaxRate?: number | undefined;
  corporateTaxThreshold?: number | undefined;
  sharedExpenses?: ScenarioSharedExpenses | undefined;
  sharedExpenseOverrides?: SharedExpenseSchedule | undefined;
}

export interface ScenarioPayload {
  name: string;
  notes?: string | undefined;
  overrides: Record<string, MonthlyOverrideState>;
  projectSettings: ProjectSettingsState;
  selectedProjectIds: string[];
  globalSettings?: ScenarioGlobalSettings | undefined;
}

export interface ScenarioInput extends ScenarioPayload {}

export interface ScenarioDocument extends ScenarioPayload, Document {
  _id: ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioResponse extends ScenarioPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

