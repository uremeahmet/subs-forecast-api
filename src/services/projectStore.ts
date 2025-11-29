import { ObjectId } from 'mongodb';
import { getCollection } from '../db/mongo';
import type { MonthKey, MonthlyRate, ProjectDefinition } from '../types/forecast';
import { DEFAULT_PROJECTS } from '../config/defaultProjects';
import { DEFAULT_MONTHLY_RATES } from '../config/rateTables';
import { MONTH_SEQUENCE } from '../config/constants';

interface ProjectDocument extends ProjectDefinition {
  _id: ObjectId;
}

const COLLECTION = 'forecast_projects';

const FALLBACK_RATE: MonthlyRate = {
  date: '1970-01',
  growthRate: 0.15,
  churnRate: 0.04,
  salesMarketingExpense: 0,
};

const normalizeMonthlyDefaults = (source: MonthlyRate[] = []): MonthlyRate[] => {
  const byKey = new Map<MonthKey, MonthlyRate>();
  source.forEach((entry) => {
    if (entry?.date) {
      byKey.set(entry.date as MonthKey, entry);
    }
  });

  return MONTH_SEQUENCE.map((month, index) => {
    const existing = byKey.get(month.key as MonthKey);
    if (existing) {
      return existing;
    }
    const fallback =
      DEFAULT_MONTHLY_RATES[index] ??
      DEFAULT_MONTHLY_RATES[DEFAULT_MONTHLY_RATES.length - 1] ??
      FALLBACK_RATE;
    return {
      date: month.key as MonthKey,
      growthRate: fallback.growthRate,
      churnRate: fallback.churnRate,
      salesMarketingExpense: fallback.salesMarketingExpense ?? 0,
    };
  });
};

const serializeProject = (doc: ProjectDocument): ProjectDefinition => ({
  id: doc.id,
  name: doc.name,
  description: doc.description,
  startingSubscribers: doc.startingSubscribers,
  pricing: doc.pricing,
  metrics: doc.metrics,
  monthlyDefaults: normalizeMonthlyDefaults(doc.monthlyDefaults),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';

const buildDefaultProject = (name: string, id?: string): ProjectDefinition => ({
  id: id ?? slugify(name),
  name,
  description: '',
  startingSubscribers: 0,
  pricing: { base: 0, promoDiscount: 0, promoMonths: 0 },
  metrics: { cogs: 0, fees: 0 },
  monthlyDefaults: DEFAULT_MONTHLY_RATES.map((rate) => ({ ...rate })),
});

export const seedProjectsIfNeeded = async () => {
  const collection = await getCollection<ProjectDocument>(COLLECTION);
  const count = await collection.countDocuments();
  if (count > 0) {
    return;
  }
  await collection.insertMany(DEFAULT_PROJECTS as ProjectDocument[]);
};

export const listProjects = async (): Promise<ProjectDefinition[]> => {
  const collection = await getCollection<ProjectDocument>(COLLECTION);
  const docs = await collection.find({}).sort({ name: 1 }).toArray();
  return docs.map(serializeProject);
};

export const createProject = async (name: string): Promise<ProjectDefinition> => {
  const collection = await getCollection<ProjectDocument>(COLLECTION);
  const baseId = slugify(name);
  let candidateId = baseId;
  let suffix = 1;
  // ensure unique id
  // eslint-disable-next-line no-await-in-loop
  while (await collection.findOne({ id: candidateId })) {
    candidateId = `${baseId}-${suffix++}`;
  }

  const doc: ProjectDefinition = buildDefaultProject(name, candidateId);
  const result = await collection.insertOne(doc as ProjectDocument);
  return serializeProject({ ...(doc as ProjectDocument), _id: result.insertedId });
};

export const deleteProject = async (id: string) => {
  const collection = await getCollection<ProjectDocument>(COLLECTION);
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
};

