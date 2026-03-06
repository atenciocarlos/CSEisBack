import cron from "node-cron";
import { prisma } from "@/lib/prisma";

let cronStarted = false;

/**
 * Starts the nightly archive cron job.
 * Runs at midnight Florida time (America/New_York) every day.
 * Archives all active (non-archived) tasks.
 */
export function startArchiveCron() {
    if (cronStarted) return;
    cronStarted = true;

    // "0 0 * * *" = every day at 00:00, timezone = Florida
    cron.schedule(
        "0 0 * * *",
        async () => {
            console.log("[CRON] Midnight archive triggered at", new Date().toISOString());
            try {
                const result = await prisma.callRecord.updateMany({
                    where: { archivedAt: null },
                    data: { archivedAt: new Date() },
                });
                console.log(`[CRON] Archived ${result.count} task(s)`);
            } catch (error) {
                console.error("[CRON] Archive failed:", error);
            }
        },
        {
            timezone: "America/New_York",
        }
    );

    console.log("[CRON] Nightly archive scheduled (midnight America/New_York)");
}
