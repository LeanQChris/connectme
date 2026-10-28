import { z } from "zod";

export const WhatsAppTemplateCategorySchema = z.enum([
  "UTILITY",
  "MARKETING",
  "AUTHENTICATION",
]);
export type WhatsAppTemplateCategory = z.infer<typeof WhatsAppTemplateCategorySchema>;

export const WhatsAppTemplateStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_APPEAL",
  "DELETED",
  "PENDING_DELETION",
  "LIMIT_EXCEEDED",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "PAUSED",
  "DISABLED",
]);
export type WhatsAppTemplateStatus = z.infer<typeof WhatsAppTemplateStatusSchema>;

export const WhatsAppTemplateComponentSchema = z.object({
  type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
  format: z.enum(["TEXT", "IMAGE", "DOCUMENT", "VIDEO", "LOCATION"]).optional(),
  text: z.string().optional(),
  example: z.record(z.string(), z.unknown()).optional(),
  buttons: z
    .array(
      z.object({
        type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "OTP"]),
        text: z.string(),
        url: z.string().optional(),
        phoneNumber: z.string().optional(),
      }),
    )
    .optional(),
});
export type WhatsAppTemplateComponent = z.infer<typeof WhatsAppTemplateComponentSchema>;

export const WhatsAppTemplateDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  category: WhatsAppTemplateCategorySchema,
  status: WhatsAppTemplateStatusSchema,
  components: z.array(WhatsAppTemplateComponentSchema),
  rawTemplate: z.record(z.string(), z.unknown()).optional(),
  providerId: z.string().optional(),
  rejectionReason: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type WhatsAppTemplateDto = z.infer<typeof WhatsAppTemplateDtoSchema>;

export const SendWhatsAppTemplateSchema = z.object({
  conversationId: z.string().uuid(),
  templateName: z.string().min(1, "Template name is required"),
  languageCode: z.string().default("en_US"),
  headerVariables: z.array(z.string()).optional(),
  bodyVariables: z.array(z.string()).optional(),
  buttonPayload: z.string().optional(),
});
export type SendWhatsAppTemplateDto = z.infer<typeof SendWhatsAppTemplateSchema>;

export const CreateWhatsAppTemplateDraftSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[a-z0-9_]+$/, "Template name must be lowercase alphanumeric with underscores only"),
  language: z.string().max(16).regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/, "Use a Meta language code such as en_US").default("en_US"),
  category: WhatsAppTemplateCategorySchema.default("UTILITY"),
  headerText: z.string().max(60).optional(),
  bodyText: z.string().min(1).max(1024),
  headerExamples: z.array(z.string().trim().min(1).max(1024)).max(1).optional(),
  bodyExamples: z.array(z.string().trim().min(1).max(1024)).max(100).optional(),
  footerText: z.string().max(60).optional(),
  buttons: z
    .array(
      z.object({
        type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
        text: z.string().max(25),
        url: z.string().optional(),
        phoneNumber: z.string().optional(),
      }),
    )
    .optional(),
});
export type CreateWhatsAppTemplateDraftDto = z.infer<
  typeof CreateWhatsAppTemplateDraftSchema
>;

/** Composer supports positional text parameters and static/quick-reply buttons. */
export function supportsWhatsAppTextTemplate(template: Pick<WhatsAppTemplateDto, "category" | "components">): boolean {
  return template.category !== "AUTHENTICATION" && Array.isArray(template.components) && template.components.some((c) => c.type === "BODY" && typeof c.text === "string") && template.components.every((c) =>
    ["HEADER", "BODY", "FOOTER", "BUTTONS"].includes(c.type) &&
    (c.type !== "HEADER" || c.format === "TEXT") &&
    (!c.text?.includes("{{") || !c.text.replace(/\{\{[1-9]\d*\}\}/g, "").includes("{{")) &&
    (!c.buttons || c.buttons.every((b) => b.type === "QUICK_REPLY" || b.type === "PHONE_NUMBER" || (b.type === "URL" && typeof b.url === "string" && !b.url.includes("{{")))));
}
