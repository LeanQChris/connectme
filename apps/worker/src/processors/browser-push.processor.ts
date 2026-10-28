import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job, UnrecoverableError } from "bullmq";
import * as webpush from "web-push";
import { BrowserPushSubscription, Message, MessageDirection } from "@connectme/database";
import { AesVaultService } from "@connectme/channels";
import { BrowserPushSubscriptionSchema } from "@connectme/contracts";

export interface BrowserPushJob { tenantId: string; subscriptionId: string; messageId?: string; test?: boolean }

@Processor("browser-push", { concurrency: 5 })
export class BrowserPushProcessor extends WorkerHost {
  constructor(
    @InjectRepository(BrowserPushSubscription) private readonly subscriptions: Repository<BrowserPushSubscription>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly vault: AesVaultService,
  ) { super(); }

  async process(job: Job<BrowserPushJob>): Promise<void> {
    const { tenantId, subscriptionId, messageId } = job.data;
    const subscription = await this.subscriptions.findOne({ where: { id: subscriptionId, tenantId }, relations: ["user"] });
    if (!subscription || subscription.user.disabledAt || subscription.user.tenantId !== tenantId) return;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) throw new UnrecoverableError("Browser push VAPID configuration is missing.");
    if (subscription.vapidPublicKey !== publicKey || Date.now() - subscription.updatedAt.getTime() > 90 * 86400000) {
      await this.subscriptions.delete({ id: subscriptionId, tenantId });
      return;
    }
    let conversationId: string | undefined;
    if (!job.data.test) {
      if (!messageId) return;
      const message = await this.messages.findOne({ where: { id: messageId, conversation: { tenantId } }, relations: ["conversation"] });
      if (!message || message.direction !== MessageDirection.INBOUND || Date.now() - message.createdAt.getTime() > 15 * 60000) return;
      conversationId = message.conversationId;
    }
    const parsed = BrowserPushSubscriptionSchema.safeParse(this.vault.decryptStrict(subscription.subscriptionEnc));
    if (!parsed.success) throw new UnrecoverableError("Invalid encrypted browser subscription.");
    try {
      // Never include customer names or message content on a device lock screen.
      await webpush.sendNotification(parsed.data, JSON.stringify({
        title: job.data.test ? "ConnectMe — Test alert" : "ConnectMe — New message",
        body: job.data.test ? "Background notifications are connected." : "A new customer message is waiting in your inbox.",
        conversationId, tag: messageId || "connectme-push-test",
      }), { vapidDetails: { subject, publicKey, privateKey }, TTL: 300, timeout: 10000 });
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await this.subscriptions.delete({ id: subscriptionId, tenantId });
        return;
      }
      if (code && code >= 400 && code < 500 && code !== 429) throw new UnrecoverableError(`Browser push rejected (${code}).`);
      // Don't log endpoints or keys from the provider error object.
      throw new Error("Browser push delivery failed; retrying.");
    }
  }
}
