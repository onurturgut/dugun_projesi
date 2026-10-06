export async function rebuildMediaCounters(database) {
  const weddings = database.collection("weddings");
  const media = database.collection("media");
  let updated = 0;

  for await (const wedding of weddings.find({}, { projection: { id: 1 } })) {
    const stats = await media.aggregate([
      { $match: { wedding_id: wedding.id, purging: { $ne: true } } },
      {
        $group: {
          _id: null,
          photo_count: { $sum: { $cond: [{ $and: [{ $eq: [{ $ifNull: ["$deleted_at", null] }, null] }, { $eq: ["$type", "photo"] }] }, 1, 0] } },
          video_count: { $sum: { $cond: [{ $and: [{ $eq: [{ $ifNull: ["$deleted_at", null] }, null] }, { $eq: ["$type", "video"] }] }, 1, 0] } },
          media_bytes: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$deleted_at", null] }, null] }, "$size_bytes", 0] } },
          trashed_photo_count: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$deleted_at", null] }, null] }, { $eq: ["$type", "photo"] }] }, 1, 0] } },
          trashed_video_count: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$deleted_at", null] }, null] }, { $eq: ["$type", "video"] }] }, 1, 0] } },
          trashed_count: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$deleted_at", null] }, null] }, 1, 0] } },
          trashed_bytes: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$deleted_at", null] }, null] }, "$size_bytes", 0] } },
        },
      },
    ]).next();
    const empty = {
      photo_count: 0,
      video_count: 0,
      media_bytes: 0,
      trashed_photo_count: 0,
      trashed_video_count: 0,
      trashed_count: 0,
      trashed_bytes: 0,
    };
    const values = stats ? { ...stats } : empty;
    delete values._id;
    await weddings.updateOne({ id: wedding.id }, { $set: values });
    updated++;
  }
  return updated;
}
