import { MongoClient, Db, Collection, Document } from 'mongodb';

const uri = process.env.MONGODB_CONNECTIONSTRING ?? process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'subs-report';

let client: MongoClient | null = null;
let database: Db | null = null;

const getClient = async () => {
  if (client) {
    return client;
  }
  if (!uri) {
    throw new Error(
      'MONGODB_CONNECTIONSTRING environment variable is required for scenario storage.'
    );
  }
  client = new MongoClient(uri);
  await client.connect();
  return client;
};

export const getDb = async (): Promise<Db> => {
  if (database) {
    return database;
  }
  const activeClient = await getClient();
  database = activeClient.db(dbName);
  return database;
};

export const getCollection = async <T extends Document = Document>(name: string): Promise<Collection<T>> => {
  const db = await getDb();
  return db.collection<T>(name);
};

