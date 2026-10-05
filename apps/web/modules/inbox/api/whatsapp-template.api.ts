import type {
  WhatsAppTemplateDto,
  SendWhatsAppTemplateDto,
  CreateWhatsAppTemplateDraftDto,
} from "@connectme/contracts";

export const whatsappTemplateApi = {
  async listTemplates(): Promise<WhatsAppTemplateDto[]> {
    const res = await fetch("/api/whatsapp/templates");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch WhatsApp templates");
    }
    const data = await res.json();
    return data.templates || [];
  },

  async syncTemplates(): Promise<{ syncedCount: number; templates: WhatsAppTemplateDto[] }> {
    const res = await fetch("/api/whatsapp/templates/sync", {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to sync templates from Meta");
    }
    return res.json();
  },

  async sendTemplate(
    dto: SendWhatsAppTemplateDto,
  ): Promise<{ success: boolean; messageId: string; externalId?: string | null }> {
    const res = await fetch("/api/whatsapp/templates/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to send WhatsApp template message");
    }
    return res.json();
  },

  async createDraft(
    dto: CreateWhatsAppTemplateDraftDto,
  ): Promise<{ template: WhatsAppTemplateDto }> {
    const res = await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create WhatsApp template draft");
    }
    return res.json();
  },
};
