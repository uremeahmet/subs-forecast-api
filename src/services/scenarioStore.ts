import { Filter, ObjectId } from 'mongodb';
import { getCollection } from '../db/mongo';
import type { ScenarioDocument, ScenarioInput } from '../types/scenario';

const COLLECTION = 'forecast_scenarios';

const normalizeId = (id: ScenarioDocument['_id']) =>
  typeof id === 'string' ? id : id.toHexString();

const serializeDocument = (doc: ScenarioDocument) => ({
  id: normalizeId(doc._id),
  name: doc.name,
  notes: doc.notes,
  overrides: doc.overrides,
  projectSettings: doc.projectSettings,
  selectedProjectIds: doc.selectedProjectIds,
  globalSettings: doc.globalSettings,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildIdFilters = (id: string): Filter<ScenarioDocument>[] => {
  const filters: Filter<ScenarioDocument>[] = [];
  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id) } as Filter<ScenarioDocument>);
  }
  filters.push({ _id: id } as Filter<ScenarioDocument>);
  return filters;
};

export const listScenarios = async () => {
  const collection = await getCollection<ScenarioDocument>(COLLECTION);
  const docs = await collection.find({}).sort({ updatedAt: -1 }).toArray();
  return docs.map(serializeDocument);
};

export const createScenario = async (input: ScenarioInput) => {
  const collection = await getCollection<ScenarioDocument>(COLLECTION);
  const timestamp = new Date();
  const doc: Omit<ScenarioDocument, '_id'> = {
    name: input.name,
    notes: input.notes,
    overrides: input.overrides ?? {},
    projectSettings: input.projectSettings ?? {},
    selectedProjectIds: input.selectedProjectIds ?? [],
    globalSettings: input.globalSettings,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const result = await collection.insertOne(doc as ScenarioDocument);
  const saved: ScenarioDocument = { ...(doc as ScenarioDocument), _id: result.insertedId };
  return serializeDocument(saved);
};

export const updateScenario = async (id: string, input: ScenarioInput) => {
  const collection = await getCollection<ScenarioDocument>(COLLECTION);
  const timestamp = new Date();
  const updateDoc = {
    $set: {
      name: input.name,
      notes: input.notes,
      overrides: input.overrides ?? {},
      projectSettings: input.projectSettings ?? {},
      selectedProjectIds: input.selectedProjectIds ?? [],
      globalSettings: input.globalSettings,
      updatedAt: timestamp,
    },
  };

  for (const filter of buildIdFilters(id)) {
    const result = await collection.findOneAndUpdate(filter, updateDoc, {
      returnDocument: 'after',
    });
    if (result?._id) {
      return serializeDocument(result);
    }
  }
  return null;
};

export const getScenarioById = async (id: string) => {
  const collection = await getCollection<ScenarioDocument>(COLLECTION);
  for (const filter of buildIdFilters(id)) {
    const document = await collection.findOne(filter);
    if (document) {
      return serializeDocument(document);
    }
  }
  return null;
};

