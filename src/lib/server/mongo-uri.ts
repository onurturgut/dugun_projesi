import "server-only";
import { Resolver } from "node:dns/promises";

const DEFAULT_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

function mongoResolver() {
  const configured = process.env.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const resolver = new Resolver();
  resolver.setServers(configured?.length ? configured : DEFAULT_DNS_SERVERS);
  return resolver;
}

export async function resolvedMongoUri(uri: string) {
  if (!uri.startsWith("mongodb+srv://")) return uri;
  const parsed = new URL(uri);
  const resolver = mongoResolver();
  const records = await resolver.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  if (!records.length) throw new Error("MongoDB SRV kaydı bulunamadı.");
  let txtOptions = "";
  try {
    txtOptions = (await resolver.resolveTxt(parsed.hostname)).flat().join("");
  } catch {
    // TXT options are optional; the original query parameters are preserved below.
  }
  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
    : "";
  const hosts = records.map((record) => `${record.name}:${record.port}`).join(",");
  const options = new URLSearchParams(txtOptions);
  for (const [key, value] of parsed.searchParams) options.set(key, value);
  options.set("tls", "true");
  return `mongodb://${credentials}${hosts}${parsed.pathname}?${options.toString()}`;
}
