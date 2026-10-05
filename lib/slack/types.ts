export interface SlackUserProfile {
  id: string;
  name: string;
  real_name?: string;
  avatarUrl: string | null;
}

export interface SlackFile {
  id: string;
  name: string;
  title?: string;
  mimetype: string;
  filetype?: string;
  size: number;
  url_private?: string;
  url_private_download?: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  thumb_800?: string;
  thumb_1024?: string;
}

export interface SlackMessageEvent {
  type: "message";
  subtype?: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  channel: string;
  channel_type?: "channel" | "group" | "im" | "mpim";
  files?: SlackFile[];
  hidden?: boolean;
}

export interface SlackEventCallback {
  token?: string;
  team_id: string;
  api_app_id?: string;
  event: SlackMessageEvent;
  type: "event_callback";
  event_id?: string;
  event_time?: number;
}

export interface SlackUrlVerification {
  type: "url_verification";
  token?: string;
  challenge: string;
}

export type SlackWebhookPayload = SlackUrlVerification | SlackEventCallback;

export interface SlackAuthTestResponse {
  ok: boolean;
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
  bot_id?: string;
  error?: string;
}
