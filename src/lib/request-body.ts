export class RequestBodyTooLargeError extends Error {
  readonly code = "request_body_too_large";
}

export async function readUtf8BodyLimited(
  request: Request,
  maxBytes: number,
) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1)
    throw new Error("Pozitif tam sayı gövde sınırı gereklidir.");
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes)
    throw new RequestBodyTooLargeError("İstek gövdesi sınırı aşıyor.");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let totalBytes = 0;
  let result = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError("İstek gövdesi sınırı aşıyor.");
      }
      result += decoder.decode(chunk.value, { stream: true });
    }
    result += decoder.decode();
    return result;
  } finally {
    reader.releaseLock();
  }
}
