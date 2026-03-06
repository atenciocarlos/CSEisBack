import { NextRequest, NextResponse } from "next/server";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { parseOcrText, type ParsedTask } from "@/lib/parser";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsedTaskSchema } from "@/lib/validations";
import crypto from "crypto";

// ── Constants ──
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes for JPEG and PNG
const MAGIC_BYTES: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
};

/**
 * POST /api/ocr
 *
 * Accepts a multipart/form-data request with an "image" file field.
 * Sends the image to Google Cloud Vision API (DOCUMENT_TEXT_DETECTION),
 * parses the result into structured task JSON, checks for duplicates,
 * and returns saved + skipped tasks.
 */
export async function POST(request: NextRequest) {
    try {
        // ── 1. Auth check FIRST (before reading any body) ──
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized. You must be logged in to upload tasks." },
                { status: 401 }
            );
        }

        // ── 2. Read & validate file ──
        const formData = await request.formData();
        const file = formData.get("image") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No image file provided. Send an 'image' field in multipart/form-data." },
                { status: 400 }
            );
        }

        // Strict MIME whitelist — only JPEG and PNG
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG and PNG images are accepted." },
                { status: 400 }
            );
        }

        // File size limit — 5 MB max
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.` },
                { status: 400 }
            );
        }

        // ── 3. Read image into Buffer ──
        const arrayBuffer = await file.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // Magic bytes validation — verify actual file type, not just Content-Type header
        const expectedMagic = MAGIC_BYTES[file.type];
        if (expectedMagic) {
            const fileMagic = Array.from(imageBuffer.subarray(0, expectedMagic.length));
            const isValid = expectedMagic.every((byte, i) => byte === fileMagic[i]);
            if (!isValid) {
                return NextResponse.json(
                    { error: "File content does not match declared MIME type. Upload rejected." },
                    { status: 400 }
                );
            }
        }

        // Generate sanitized filename (defense-in-depth)
        const _safeFilename = `${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;

        // ── 4. Initialize Cloud Vision client ──
        let client: ImageAnnotatorClient;

        if (process.env.GOOGLE_CREDENTIALS_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            client = new ImageAnnotatorClient({ credentials });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            client = new ImageAnnotatorClient();
        } else {
            return NextResponse.json(
                { error: "Google Cloud credentials are not configured. Set GOOGLE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS." },
                { status: 500 }
            );
        }

        // ── 5. Call DOCUMENT_TEXT_DETECTION for higher accuracy ──
        const [result] = await client.documentTextDetection({
            image: { content: imageBuffer.toString("base64") },
        });

        const fullText = result.fullTextAnnotation?.text || "";

        if (!fullText) {
            return NextResponse.json(
                { error: "No text could be detected in the uploaded image." },
                { status: 400 }
            );
        }

        // ── 6. Parse structured tasks from OCR text ──
        const rawTasks: ParsedTask[] = parseOcrText(fullText);

        if (rawTasks.length === 0) {
            return NextResponse.json(
                { error: "No task data could be extracted from the image text." },
                { status: 400 }
            );
        }

        // ── 7. Validate parsed tasks with Zod (mass-assignment prevention) ──
        const tasks: ParsedTask[] = [];
        for (const raw of rawTasks) {
            const parsed = parsedTaskSchema.safeParse(raw);
            if (parsed.success) {
                tasks.push(parsed.data as ParsedTask);
            }
            // Silently skip fields that don't conform — only safe fields pass through
        }

        if (tasks.length === 0) {
            return NextResponse.json(
                { error: "No valid task data could be extracted from the image." },
                { status: 400 }
            );
        }

        // ── 8. Duplicate check & save ──
        const duplicates: string[] = [];
        const newTasks: ParsedTask[] = [];

        for (const task of tasks) {
            const existing = await prisma.callRecord.findFirst({
                where: { taskId: task.task_id },
            });
            if (existing) {
                duplicates.push(task.task_id);
            } else {
                newTasks.push(task);
            }
        }

        const savedRecords = await Promise.all(
            newTasks.map(task =>
                prisma.callRecord.create({
                    data: {
                        taskId: task.task_id,
                        status: task.status,
                        customer: task.customer,
                        type: task.type,
                        eta: task.eta,
                        address: task.address,
                        technician: task.technician || null,
                        rawText: fullText,
                        uploadedById: session.user.id,
                    },
                    include: {
                        uploadedBy: {
                            select: { alias: true },
                        },
                    },
                })
            )
        );

        return NextResponse.json(
            { tasks: savedRecords, duplicates, rawText: fullText },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error("[/api/ocr] OCR processing error:", error instanceof Error ? error.message : "Unknown error");

        return NextResponse.json(
            { error: "Internal server error during OCR processing." },
            { status: 500 }
        );
    }
}
