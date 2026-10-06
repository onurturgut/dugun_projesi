import "server-only";
import { db } from "./db";
import { deleteObject } from "./r2";
import { cleanupCovers } from "./covers";
import { processMediaPreviews } from "./media-processing";
export async function cleanup(now = new Date()) {
  const database = await db();
  const iso = now.toISOString();
  await database.collection("media").updateMany(
    {
      processing_status: "processing",
      processing_started_at: {
        $lt: new Date(now.getTime() - 15 * 60_000).toISOString(),
      },
    },
    { $set: { processing_status: "failed" } },
  );
  const previews = await processMediaPreviews(8);
  let files = 0,
    tickets = 0,
    events = 0;
  const errors: string[] = [];
  const expiredEvents = await database
    .collection("weddings")
    .find({ expires_at: { $type: "string", $lte: iso }, purged_at: null })
    .limit(100)
    .toArray();
  for (const event of expiredEvents)
    await database
      .collection("media")
      .updateMany({ wedding_id: event.id }, { $set: { purge_at: iso } });
  const due = await database
    .collection("media")
    .find({
      $or: [{ purge_at: { $type: "string", $lte: iso } }, { purging: true }],
    })
    .limit(500)
    .toArray();
  for (const row of due) {
    // Compare the deadline again: a simultaneous restore may have cleared it.
    const claimed = await database
      .collection("media")
      .findOneAndUpdate(
        {
          id: row.id,
          $or: [
            { purge_at: { $type: "string", $lte: iso } },
            { purging: true },
          ],
        },
        { $set: { purging: true } },
        { returnDocument: "after" },
      );
    if (!claimed) continue;
    try {
      await deleteObject(row.storage_path);
      if (row.preview_path) await deleteObject(row.preview_path);
      await database
        .collection("media")
        .deleteOne({ id: row.id, purging: true });
      const inTrash = row.deleted_at != null;
      await database.collection("weddings").updateOne(
        { id: row.wedding_id },
        {
          $inc: inTrash
            ? {
                trashed_photo_count: row.type === "photo" ? -1 : 0,
                trashed_video_count: row.type === "video" ? -1 : 0,
                trashed_count: -1,
                trashed_bytes: -row.size_bytes,
              }
            : {
                photo_count: row.type === "photo" ? -1 : 0,
                video_count: row.type === "video" ? -1 : 0,
                media_bytes: -row.size_bytes,
              },
        },
      );
      files++;
    } catch {
      errors.push(`media:${row.id}`);
    }
  }
  const stale = await database
    .collection("upload_tickets")
    .find({ expiresAt: { $lte: now } })
    .limit(500)
    .toArray();
  for (const ticket of stale) {
    try {
      const registered = await database
        .collection("media")
        .findOne({ storage_path: ticket.storage_path });
      if (!registered) await deleteObject(ticket.storage_path);
      await database
        .collection("upload_tickets")
        .deleteOne({ _id: ticket._id });
      tickets++;
    } catch {
      errors.push(`ticket:${ticket._id}`);
    }
  }
  for (const event of expiredEvents) {
    if (
      (await database
        .collection("media")
        .countDocuments({ wedding_id: event.id })) === 0 &&
      (await database
        .collection("upload_tickets")
        .countDocuments({ weddingId: event.id })) === 0
    ) {
      await database
        .collection("weddings")
        .updateOne(
          { id: event.id },
          { $set: { purged_at: iso, upload_enabled: false } },
        );
      events++;
    }
  }
  await cleanupCovers(now, errors);
  const result = { at: iso, files, tickets, events, ...previews, errors };
  await database.collection("maintenance_runs").insertOne(result);
  return result;
}
