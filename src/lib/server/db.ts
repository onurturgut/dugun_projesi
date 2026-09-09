import "server-only";
import { MongoClient } from "mongodb";
const globalDb = globalThis as unknown as { mongo?: Promise<MongoClient> };
export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI yapılandırılmamış.");
  if (!globalDb.mongo)
    globalDb.mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
      .connect()
      .catch((e) => {
        globalDb.mongo = undefined;
        throw e;
      });
  return (await globalDb.mongo).db(
    process.env.MONGODB_DB || "wedding_memories",
  );
}
