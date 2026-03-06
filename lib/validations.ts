import { z } from "zod";

// Login / Register schema (alias and password)
export const authSchema = z.object({
    alias: z.string().min(2, "Alias must be at least 2 characters").max(30, "Alias too long"),
    password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password too long"),
});

// Status update schema for PATCH /api/calls/:id/status
export const statusUpdateSchema = z.object({
    status: z.enum(["Working", "Completed"]),
});

// Address update schema for PATCH /api/calls/:id/address
export const addressUpdateSchema = z.object({
    address: z.string().min(1, "Address cannot be empty").max(200, "Address too long"),
});

// History query parameters schema (optional)
export const historyQuerySchema = z.object({
    date: z.string().optional().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: "Invalid date format" }),
    technician: z.string().optional(),
    taskId: z.string().optional(),
});

// Parsed OCR task schema (ensures no extra fields)
export const parsedTaskSchema = z.object({
    task_id: z.string(),
    status: z.string().optional(),
    customer: z.string().optional(),
    type: z.string().optional(),
    eta: z.string().optional(),
    address: z.string().optional(),
    technician: z.string().optional(),
});
