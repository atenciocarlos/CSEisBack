/**
 * Robust regex-based parser for service call task data extracted via OCR.
 * Handles pipe-delimited text, spacing variations, and missing fields.
 */

export interface ParsedTask {
    task_id: string;
    status: string;
    customer: string;
    type: string;
    eta: string;
    address: string;
    technician: string;
}

/**
 * Parse full OCR text into an array of structured task objects.
 * Supports multiple task blocks within a single image.
 */
export function parseOcrText(rawText: string): ParsedTask[] {
    if (!rawText || rawText.trim().length === 0) return [];

    // Normalize: replace pipe characters and collapse multiple spaces
    const cleaned = rawText
        .replace(/\|/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();

    // Split by task boundaries — every "Task#" or "Task #" marks a new task block
    const taskBlocks = splitIntoTaskBlocks(cleaned);

    return taskBlocks
        .map(block => extractTaskFromBlock(block))
        .filter((t): t is ParsedTask => t !== null);
}

/**
 * Split the full OCR text into separate blocks, one per task.
 */
function splitIntoTaskBlocks(text: string): string[] {
    // Split on "Task#" or "Task #" (case-insensitive) but keep the delimiter
    const parts = text.split(/(?=Task\s*#)/gi);
    return parts
        .filter(p => /Task\s*#/i.test(p))
        .map(p => p.trim());
}

/**
 * Extract structured fields from a single task block using tolerant regex.
 */
function extractTaskFromBlock(block: string): ParsedTask | null {
    const taskId = extractField(block, /Task\s*#\s*[:\-]?\s*(.+?)(?:\s+Task\s+Status|\s+Customer|\s+Address|\s+Task\s+Type|\s+Tech|\n|$)/i);

    if (!taskId) return null; // Must have a Task ID

    const status = extractField(block, /Task\s+Status\s*[:\-]?\s*(.+?)(?:\s+Customer|\s+Address|\s+Task\s+Type|\s+Tech|\s+Task\s*#|\n|$)/i);
    const customer = extractField(block, /Customer\s+Name\s*[:\-]?\s*(.+?)(?:\s+Address|\s+Task\s+Type|\s+Tech|\s+Task\s+Status|\s+Task\s*#|\n|$)/i);
    const type = extractField(block, /Task\s+Type\s*[:\-]?\s*(.+?)(?:\s+Problem|\s+Risk|\s+Device|\s+Internal|\s+Life|\s+Tech|\s+Customer|\s+Address|\s+Task\s+Status|\s+Task\s*#|\n|$)/i);
    const eta = extractField(block, /Technician\s+ETA\s*[:\-]?\s*(.+?)(?:\s+Task\s*#|\s+Task\s+Status|\s+Customer|\s+Address|\s+Task\s+Type|\n|$)/i);
    const address = extractField(block, /Address\s*[:\-]?\s*(.+?)(?:\s+Task\s+Type|\s+Tech|\s+Customer|\s+Task\s+Status|\s+Task\s*#|\n|$)/i);

    // Try to extract a technician name — look for patterns like "Technician : John D" or "Technician Name : X"
    const technician = extractField(block, /Technician\s+(?:Name)?\s*[:\-]?\s*(.+?)(?:\s+ETA|\s+Task\s*#|\s+Task\s+Status|\s+Customer|\s+Address|\s+Task\s+Type|\n|$)/i);

    return {
        task_id: taskId,
        status: status || "",
        customer: customer || "",
        type: type || "",
        eta: eta || "",
        address: address || "",
        technician: technician || "",
    };
}

/**
 * Extract a single field value using a regex pattern.
 * Trims whitespace and trailing pipe artifacts.
 */
function extractField(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;

    return match[1]
        .replace(/\|/g, "")
        .replace(/\s+/g, " ")
        .trim() || null;
}
