import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { historyQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

/**
 * GET /api/history?date=YYYY-MM-DD&technician=alias&taskId=123
 *
 * Returns archived call records with optional filters.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryParams = {
            date: searchParams.get("date") || undefined,
            technician: searchParams.get("technician") || undefined,
            taskId: searchParams.get("taskId") || undefined,
        };

        // Validate query params with Zod
        const result = historyQuerySchema.safeParse(queryParams);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0]?.message || "Invalid query parameters" },
                { status: 400 }
            );
        }

        const { date: dateFilter, technician: techFilter, taskId: taskFilter } = result.data;

        // Build properly typed where clause (replaces `const where: any`)
        const where: Prisma.CallRecordWhereInput = {
            NOT: { archivedAt: null },
        };

        // Date filter: match archivedAt within that calendar day (Florida TZ approximation via UTC range)
        if (dateFilter) {
            const start = new Date(`${dateFilter}T00:00:00-05:00`);
            const end = new Date(`${dateFilter}T23:59:59-05:00`);
            where.archivedAt = { gte: start, lte: end };
        }

        // Task ID filter
        if (taskFilter) {
            where.taskId = { contains: taskFilter };
        }

        const records = await prisma.callRecord.findMany({
            where,
            orderBy: { archivedAt: "desc" },
            include: {
                uploadedBy: {
                    select: { alias: true },
                },
            },
        });

        // Technician filter (alias is on the relation, filter in JS)
        let filtered = records;
        if (techFilter) {
            const lower = techFilter.toLowerCase();
            filtered = records.filter(r =>
                r.uploadedBy?.alias?.toLowerCase().includes(lower)
            );
        }

        return NextResponse.json({ records: filtered }, { status: 200 });
    } catch (error) {
        console.error("[/api/history] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
