import "server-only";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
