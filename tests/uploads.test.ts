import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUploadCompletePayload,
  buildUploadSignPayload,
  createFallbackSessionId,
  resolveUploadMime,
  validateFiles,
} from "../src/lib/uploads";
import {
  canUseSameOriginPhotoFallback,
  SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES,
  uploadTransportOrder,
} from "../src/lib/upload-fallback";
import {
  directUploadObjectInput,
  directUploadPresignOptions,
} from "../src/lib/upload-signing";

test("professional folder validation avoids creating memory-heavy previews", () => {
  const files = [
    new File([new Uint8Array(12)], "ceremony.jpg", {
      type: "image/jpeg",
      lastModified: 1,
    }),
    new File([new Uint8Array(18)], "first-dance.mp4", {
      type: "video/mp4",
      lastModified: 2,
    }),
  ];

  const result = validateFiles(files, { createPreviews: false });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(
    result.accepted.map((item) => [item.file.name, item.kind, item.previewUrl]),
    [
      ["ceremony.jpg", "photo", ""],
      ["first-dance.mp4", "video", ""],
    ],
  );
});

test("professional folder validation rejects unsupported files", () => {
  const result = validateFiles(
    [new File(["not media"], "notes.txt", { type: "text/plain" })],
    { createPreviews: false },
  );

  assert.equal(result.accepted.length, 0);
  assert.match(result.errors[0], /desteklenmiyor/);
});

test("same-origin fallback is restricted to small photos", () => {
  assert.equal(
    canUseSameOriginPhotoFallback({ kind: "photo", size: 985_348 }),
    true,
  );
  assert.equal(
    canUseSameOriginPhotoFallback({
      kind: "photo",
      size: SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES + 1,
    }),
    false,
  );
  assert.equal(
    canUseSameOriginPhotoFallback({ kind: "video", size: 985_348 }),
    false,
  );
  assert.equal(
    canUseSameOriginPhotoFallback({ kind: "photo", size: 0 }),
    false,
  );
});

test("small photos use the same-origin emergency transport first", () => {
  assert.deepEqual(uploadTransportOrder({ kind: "photo", size: 985_348 }), [
    "same-origin",
    "direct",
  ]);
  assert.deepEqual(uploadTransportOrder({ kind: "video", size: 985_348 }), [
    "direct",
    "direct",
  ]);
});

test("direct R2 upload signs content type without signing content length", () => {
  const input = directUploadObjectInput({
    bucket: "wedding-media",
    key: "weddings/event/file",
    contentType: "image/jpeg",
  });
  const options = directUploadPresignOptions(900);

  assert.deepEqual(input, {
    Bucket: "wedding-media",
    Key: "weddings/event/file",
    ContentType: "image/jpeg",
  });
  assert.equal("ContentLength" in input, false);
  assert.deepEqual([...options.signableHeaders], ["content-type"]);
  assert.equal(options.expiresIn, 900);
});

test("Android-compatible session id fallback creates an RFC 4122 UUID", () => {
  const id = createFallbackSessionId(new Uint8Array(16));
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("Android media MIME types are normalized from extension and aliases", () => {
  assert.equal(
    resolveUploadMime({ name: "kamera.JPG", type: "application/octet-stream" }),
    "image/jpeg",
  );
  assert.equal(
    resolveUploadMime({ name: "paylasim", type: "image/jpg" }),
    "image/jpeg",
  );
  assert.equal(
    resolveUploadMime({ name: "video.MOV", type: "" }),
    "video/quicktime",
  );
});

test("guest metadata is sent only after object upload completes", () => {
  const file = new File([new Uint8Array(24)], "anı.jpg", {
    type: "image/jpeg",
    lastModified: 1,
  });
  const sign = buildUploadSignPayload(
    "7d286fbe-d42a-455a-b81a-8f205f51b894",
    { file },
    "image/jpeg",
    undefined,
  );
  assert.equal("guest_name" in sign, false);
  assert.equal("guest_message" in sign, false);
  assert.deepEqual(
    buildUploadCompletePayload("a".repeat(64), {
      guest_name: "  Ayşe  ",
      guest_message: "  Mutluluklar! 🎉  ",
    }),
    {
      ticket: "a".repeat(64),
      guest_name: "Ayşe",
      guest_message: "Mutluluklar! 🎉",
    },
  );
});
