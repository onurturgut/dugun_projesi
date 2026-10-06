import "server-only";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export function storage() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
  } = process.env;
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
  )
    throw new Error("R2 bağlantı ayarları eksik.");
  return {
    client: new S3Client({
      region: "auto",
      endpoint:
        process.env.NODE_ENV !== "production" &&
        process.env.MONGODB_DB?.startsWith("test_") &&
        process.env.R2_TEST_ENDPOINT
          ? process.env.R2_TEST_ENDPOINT
          : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: R2_BUCKET_NAME,
  };
}
export async function deleteObject(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

type CachedSignedUrl = { url: string; refreshAt: number };
const r2Global = globalThis as typeof globalThis & {
  weddingSignedUrlCache?: Map<string, CachedSignedUrl>;
};
const signedUrlCache =
  r2Global.weddingSignedUrlCache ||
  (r2Global.weddingSignedUrlCache = new Map<string, CachedSignedUrl>());

export async function signedObjectUrl(key: string, expiresIn = 3600) {
  const cacheKey = `${key}:${expiresIn}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.refreshAt > Date.now()) return cached.url;
  const { client, bucket } = storage();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
  if (signedUrlCache.size >= 10_000) signedUrlCache.clear();
  signedUrlCache.set(cacheKey, {
    url,
    refreshAt: Date.now() + Math.max(1, expiresIn - 300) * 1000,
  });
  return url;
}
