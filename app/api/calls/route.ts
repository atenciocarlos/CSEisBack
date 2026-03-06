import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch only ACTIVE records (exclude Completed), sorted by newest first
        const calls = await prisma.callRecord.findMany({
            where: {
                NOT: { status: "Completed" },
                archivedAt: null,
            },
            orderBy: { createdAt: "desc" },
            include: {
                uploadedBy: {
                    select: { alias: true },
                },
            },
        });

        return NextResponse.json({ calls }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch calls:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
