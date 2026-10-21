import "server-only";
import { MongoClient } from "mongodb";
import { configureDns } from "./dns";
import { resolvedMongoUri } from "./mongo-uri";
configureDns();
const globalDb = globalThis as unknown as { mongo?: Promise<MongoClient> };
export async function mongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI yapılandırılmamış.");
  if (!globalDb.mongo)
    globalDb.mongo = resolvedMongoUri(uri)
      .then((resolved) => new MongoClient(resolved, { serverSelectionTimeoutMS: 5000 }).connect())
      .catch((e) => {
        globalDb.mongo = undefined;
        throw e;
      });
  return await globalDb.mongo;
}
export async function db() {
  return (await mongoClient()).db(process.env.MONGODB_DB || "wedding_memories");
}
