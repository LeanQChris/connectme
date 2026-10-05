import { ChannelType } from "./channel.vo";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface MessagingWindowState {
  open: boolean;
  msRemaining: number | null;
}

export class MessagingWindowVO {
  constructor(
    public readonly channel: ChannelType,
    public readonly lastInboundAt?: Date | null,
  ) {}

  public calculate(now: Date = new Date()): MessagingWindowState {
    // Telegram, Discord, Slack, and Widget have no customer service window ceiling
    if (
      this.channel === ChannelType.TELEGRAM ||
      this.channel === ChannelType.DISCORD ||
      this.channel === ChannelType.SLACK ||
      this.channel === ChannelType.WIDGET
    ) {
      return { open: true, msRemaining: null };
    }

    if (!this.lastInboundAt) {
      return { open: false, msRemaining: null };
    }

    const elapsed = now.getTime() - new Date(this.lastInboundAt).getTime();
    const remaining = TWENTY_FOUR_HOURS_MS - elapsed;

    if (remaining <= 0) {
      return { open: false, msRemaining: 0 };
    }

    return {
      open: true,
      msRemaining: Math.max(0, remaining),
    };
  }
}
