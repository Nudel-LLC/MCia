/**
 * Zod バリデーションスキーマ
 *
 * 全 API リクエストボディのバリデーションを一元管理。
 * Drizzle スキーマの enum と同期させることで二重定義を防ぐ。
 */

import { z } from "zod";
import { PROJECT_STATUSES, CLASSIFICATION_CATEGORIES } from "@/db/schema";

// ============================================================
// Users
// ============================================================

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
});

// ============================================================
// Agencies
// ============================================================

export const createAgencySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  emailDomain: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

export const updateAgencySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  emailDomain: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

// ============================================================
// Projects
// ============================================================

export const updateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
});

// ============================================================
// Classifications
// ============================================================

export const updateClassificationSchema = z.object({
  category: z.enum(CLASSIFICATION_CATEGORIES),
});

// ============================================================
// Webhook payloads
// ============================================================

export const gmailWebhookSchema = z.object({
  message: z.object({
    data: z.string(),
    messageId: z.string().optional(),
    publishTime: z.string().optional(),
  }),
  subscription: z.string().optional(),
});

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.object({
      status: z.string(),
      customer: z.string(),
    }),
  }),
});

export const lineWebhookSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.string(),
        source: z.object({
          userId: z.string(),
        }),
      })
    )
    .default([]),
});

// ============================================================
// Query params
// ============================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const invoiceQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  agency_id: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});
