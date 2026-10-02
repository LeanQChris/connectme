
export interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: string;
        payload: { url?: string };
      }>;
    };
    delivery?: {
      mids?: string[];
      watermark: number;
    };
    read?: {
      watermark: number;
    };
  }>;
  changes?: Array<{
    value: {
      messaging_product?: string;
      metadata?: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type: string; sha256: string };
        video?: { id: string; mime_type: string };
        audio?: { id: string; mime_type: string };
        document?: { id: string; mime_type: string; filename: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface MetaWebhookPayload {
  object: "whatsapp_business_account" | "page" | "instagram";
  entry: MetaWebhookEntry[];
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
    document?: {
      file_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
    voice?: {
      file_id: string;
      mime_type?: string;
      file_size?: number;
    };
  };
}

export interface DiscordInteractionPayload {
  type: number;
  id: string;
  token: string;
  channel_id?: string;
  guild_id?: string;
  member?: {
    user: {
      id: string;
      username: string;
      avatar?: string;
    };
  };
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
  data?: {
    id: string;
    name: string;
    options?: Array<{
      name: string;
      type: number;
      value: string | number | boolean;
    }>;
  };
}
