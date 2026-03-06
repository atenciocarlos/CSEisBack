import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authSchema } from "@/lib/validations";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate input with Zod
        const result = authSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0]?.message || "Invalid input" },
                { status: 400 }
            );
        }

        const { alias, password } = result.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { alias },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "This alias is already taken. Please choose another or login." },
                { status: 409 }
            );
        }

        // Hash password & create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                alias,
                password: hashedPassword,
            },
        });

        return NextResponse.json(
            { message: "User created successfully", id: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
