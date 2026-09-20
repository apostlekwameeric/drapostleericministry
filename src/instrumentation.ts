export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSchema } = await import("@/lib/server/ensureSchema");
    await ensureSchema();
  } catch {
    /* Schema is also created on the first page/API request. */
  }
}
