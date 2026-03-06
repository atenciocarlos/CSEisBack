import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusUpdateSchema } from "@/lib/validations";

/**
 * PATCH /api/calls/:id/status
 *
 * Updates the status of a specific call record.
 * Body: { "status": "Working" | "Completed" }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Validate with Zod
        const result = statusUpdateSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0]?.message || "Invalid status. Must be 'Working' or 'Completed'." },
                { status: 400 }
            );
        }

        const { status } = result.data;

        // Verify the record exists
        const existing = await prisma.callRecord.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "Call record not found." },
                { status: 404 }
            );
        }

        // Update the status
        const updated = await prisma.callRecord.update({
            where: { id },
            data: { status },
            include: {
                uploadedBy: {
                    select: { alias: true },
                },
            },
        });

        return NextResponse.json({ record: updated }, { status: 200 });
    } catch (error) {
        console.error("[PATCH /api/calls/:id/status]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
