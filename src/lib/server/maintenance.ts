import "server-only";
import { db } from "./db";
import { deleteObject } from "./r2";
export async function cleanup(now = new Date()) {
  const database = await db();
  const iso = now.toISOString();
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
      await database
        .collection("media")
        .deleteOne({ id: row.id, purging: true });
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
  const result = { at: iso, files, tickets, events, errors };
  await database.collection("maintenance_runs").insertOne(result);
  return result;
}
