import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/archive
 *
 * Manually archives all active (non-archived) tasks.
 * Sets archivedAt = now() on every record where archivedAt is null.
 */
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.callRecord.updateMany({
            where: { archivedAt: null },
            data: { archivedAt: new Date() },
        });

        return NextResponse.json(
            { message: `Archived ${result.count} task(s)`, count: result.count },
            { status: 200 }
        );
    } catch (error) {
        console.error("[/api/archive] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
