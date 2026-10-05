export enum ChannelType {
  WHATSAPP = "WHATSAPP",
  MESSENGER = "MESSENGER",
  INSTAGRAM = "INSTAGRAM",
  TELEGRAM = "TELEGRAM",
  DISCORD = "DISCORD",
  SLACK = "SLACK",
  WIDGET = "WIDGET",
}

export enum MessageDirection {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  INTERNAL_NOTE = "INTERNAL_NOTE",
}

export enum MessageStatus {
  RECEIVED = "RECEIVED",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
}

export enum MediaType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  DOCUMENT = "DOCUMENT",
  STICKER = "STICKER",
  LOCATION = "LOCATION",
  FILE = "FILE",
  OTHER = "OTHER",
}

export enum ConversationStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  SNOOZED = "SNOOZED",
}

export enum ScheduleMode {
  NATIVE = "NATIVE",
  LOCAL = "LOCAL",
}

export enum ScheduledPostStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}

export enum ScheduledMessageStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}
