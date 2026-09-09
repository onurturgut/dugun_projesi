// Run once from a scheduler, or keep --watch running as a supervised worker.
const base = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!base || !secret || secret.length < 32)
  throw new Error("APP_URL ve en az 32 karakter CRON_SECRET gerekli.");
async function run() {
  const response = await fetch(new URL("/api/maintenance", base), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(240000),
  });
  const result = await response.json();
  console.log(JSON.stringify({ status: response.status, ...result }));
  if (!response.ok)
    throw new Error(
      "Temizlik tamamlanamadı; başarısız dosyalar sonraki çalışmada tekrar denenecek.",
    );
}
if (process.argv.includes("--watch")) {
  for (;;) {
    try {
      await run();
    } catch (error) {
      console.error(error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
} else await run();
