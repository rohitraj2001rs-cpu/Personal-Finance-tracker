import { MongoClient } from "mongodb";

let client;
let database;

export async function connectDatabase(uri, dbName) {
  client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);
  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("transactions").createIndex({ userId: 1, date: -1 });
  return database;
}

export function db() {
  if (!database) throw new Error("Database is not connected");
  return database;
}

export async function closeDatabase() {
  if (client) await client.close();
}
