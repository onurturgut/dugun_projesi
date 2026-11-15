export function directUploadObjectInput(input: {
  bucket: string;
  key: string;
  contentType: string;
}) {
  return {
    Bucket: input.bucket,
    Key: input.key,
    ContentType: input.contentType,
  };
}

export function directUploadPresignOptions(expiresIn: number) {
  return {
    expiresIn,
    signableHeaders: new Set(["content-type"]),
  };
}
