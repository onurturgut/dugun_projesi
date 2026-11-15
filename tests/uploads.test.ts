import assert from "node:assert/strict";
import test from "node:test";
import { validateFiles } from "../src/lib/uploads";
import {
  canUseSameOriginPhotoFallback,
  SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES,
} from "../src/lib/upload-fallback";

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
  const result = validateFiles([
    new File(["not media"], "notes.txt", { type: "text/plain" }),
  ], { createPreviews: false });

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
  assert.equal(canUseSameOriginPhotoFallback({ kind: "photo", size: 0 }), false);
});
