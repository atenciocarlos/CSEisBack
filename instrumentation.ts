/**
 * Next.js instrumentation hook.
 * Runs once when the server starts.
 * Used to start the nightly archive cron job.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { startArchiveCron } = await import("@/lib/cron");
        startArchiveCron();
    }
}
