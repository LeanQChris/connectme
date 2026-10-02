export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  image?: { url?: string; proxy_url?: string; height?: number; width?: number };
  thumbnail?: { url?: string; proxy_url?: string; height?: number; width?: number };
  video?: { url?: string; proxy_url?: string; height?: number; width?: number };
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp?: string | null;
  tts?: boolean;
  mention_everyone?: boolean;
  attachments?: DiscordAttachment[];
  embeds?: DiscordEmbed[];
  pinned?: boolean;
  type?: number;
  guild_id?: string;
}

export interface DiscordWebhookPayload {
  token?: string;
  userId?: string;
  message?: DiscordMessage;
  // If receiving standard Discord interaction ping/event
  type?: number;
  id?: string;
  data?: unknown;
}
