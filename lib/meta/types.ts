/**
 * Strict types for the Meta webhook payloads.
 *
 * Only the fields this app reads are modelled, and everything is optional:
 * Meta adds fields over time and a malformed event must never crash the route.
 * Platform error shapes are kept loose on purpose.
 */

export interface MetaError {
  code?: number;
  title?: string;
  message?: string;
  error_subcode?: number;
  fbtrace_id?: string;
}

/** Envelope shared by every webhook body. */
export interface WebhookBody {
  object?: "whatsapp_business_account" | "page" | "instagram" | "instagram_graph_api";
  entry?: unknown[];
}

/* ------------------------------- WhatsApp ------------------------------- */

export interface WhatsAppTextBody {
  body?: string;
}

export interface WhatsAppInboundMessage {
  from?: string;
  /** Platform message id. Used for deduplication. */
  id?: string;
  /** Unix seconds, as a string. */
  timestamp?: string;
  type?: string;
  text?: WhatsAppTextBody;
  image?: unknown;
  audio?: unknown;
  video?: unknown;
  document?: unknown;
  sticker?: unknown;
  location?: unknown;
  interactive?: unknown;
  context?: unknown;
}

export interface WhatsAppStatus {
  /** Id of the outbound message this status refers to. */
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed" | "deleted" | "warning";
  timestamp?: string;
  recipient_id?: string;
  errors?: MetaError[];
}

export interface WhatsAppChangeValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WhatsAppInboundMessage[];
  statuses?: WhatsAppStatus[];
  errors?: MetaError[];
}

export interface WhatsAppWebhookBody extends WebhookBody {
  object: "whatsapp_business_account";
  entry?: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: WhatsAppChangeValue }>;
  }>;
}

/* ------------------------------- Messenger ------------------------------ */

export interface PageMessage {
  /** Message id. */
  mid?: string;
  text?: string;
  /** True when the Page itself sent the message. Must be ignored. */
  is_echo?: boolean;
  app_id?: number;
  attachments?: Array<{
    type?: string;
    title?: string;
    payload?: {
      url?: string;
      title?: string;
      sticker_id?: number;
    };
  }>;
}

export interface PageMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  /** Unix milliseconds. */
  timestamp?: number;
  message?: PageMessage;
}

export interface PageWebhookBody extends WebhookBody {
  object: "page";
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: PageMessagingEvent[];
    standby?: PageMessagingEvent[];
    changes?: Array<{ field?: string; value?: PageMessagingEvent | unknown }>;
  }>;
}

/* ------------------------------- Instagram ------------------------------ */

export interface InstagramWebhookBody extends WebhookBody {
  object: "instagram";
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: PageMessagingEvent[];
    standby?: PageMessagingEvent[];
    changes?: Array<{ field?: string; value?: PageMessagingEvent | unknown }>;
  }>;
}