import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job, UnrecoverableError } from "bullmq";
import { Repository } from "typeorm";
import {
  ChannelType,
  ConnectedAccount,
  Conversation,
  Message,
  TenantCredential,
} from "@connectme/database";
import {
  AesVaultService,
  downloadRemoteMedia,
  downloadWhatsAppMedia,
} from "@connectme/channels";
import { MEDIA_REHOST_QUEUE, MediaRehostJobData } from "../queue.constants";
import { mediaKindFor } from "./media-kind";
import { S3MediaService } from "../storage/s3-media.service";
import { RealtimePublisher } from "../realtime/realtime-publisher";

type DownloadedBytes = { buffer: Buffer; mimeType: string | null };

@Processor(MEDIA_REHOST_QUEUE)
export class MediaRehostProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaRehostProcessor.name);
  private storageWarningLogged = false;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    @InjectRepository(TenantCredential)
    private readonly credRepo: Repository<TenantCredential>,
    private readonly aesVault: AesVaultService,
    private readonly s3MediaService: S3MediaService,
    private readonly realtime: RealtimePublisher,
  ) {
    super();
  }

  async process(job: Job<MediaRehostJobData>): Promise<void> {
    const data = job.data;

    if (!this.s3MediaService.isConfigured()) {
      if (!this.storageWarningLogged) {
        this.storageWarningLogged = true;
        this.logger.warn(
          "Media storage is not configured; skipping inbound media re-host.",
        );
      }
      return;
    }

    const message = await this.messageRepo.findOne({ where: { id: data.messageId } });
    if (!message) return;

    const conv = await this.conversationRepo.findOne({
      where: { id: message.conversationId, tenantId: data.tenantId },
    });
    if (!conv) {
      this.logger.warn(`Conversation for message ${data.messageId} not found; skipping.`);
      return;
    }

    const bytes = await this.resolveBytes(data, conv);
    if (!bytes) return;

    const mimeType = bytes.mimeType ?? data.mimeType ?? null;
    const key = `media/${data.tenantId}/${data.messageId}/${Date.now()}${this.extensionFor(mimeType)}`;
    const publicUrl = await this.s3MediaService.uploadBuffer(
      key,
      bytes.buffer,
      mimeType || "application/octet-stream",
    );

    // `mediaUrl` was retired: the canonical location is media[]. Rewrite the
    // first attachment's url (the one we just re-hosted), or create the entry
    // when the inbound path had only a provider-side id (WhatsApp).
    const previous = message.media && message.media.length > 0 ? message.media : null;
    message.media = previous
      ? previous.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                url: publicUrl,
                mimeType: item.mimeType ?? mimeType ?? undefined,
                size: item.size ?? bytes.buffer.byteLength,
              }
            : item,
        )
      : [
          {
            url: publicUrl,
            type: mediaKindFor(message.type),
            mimeType: mimeType ?? undefined,
            size: bytes.buffer.byteLength,
          },
        ];
    message.mediaMimeType = mimeType;
    message.mediaSize = bytes.buffer.byteLength;
    const updated = await this.messageRepo.save(message);

    await this.realtime.publish({
      type: "message:new",
      tenantId: data.tenantId,
      payload: { conversationId: conv.id, message: updated },
    });

    this.logger.log(`Re-hosted media for message ${data.messageId} at ${publicUrl}.`);
  }

  private async resolveBytes(
    data: MediaRehostJobData,
    conv: Conversation,
  ): Promise<DownloadedBytes | null> {
    const isWhatsApp =
      data.channel === ChannelType.WHATSAPP || conv.channel === ChannelType.WHATSAPP;

    try {
      if (data.mediaId && isWhatsApp) {
        const token = await this.resolveWhatsAppToken(conv, data.tenantId);
        return await downloadWhatsAppMedia(data.mediaId, token);
      }
      if (data.mediaUrl) {
        return await downloadRemoteMedia(data.mediaUrl);
      }
      return null;
    } catch (err) {
      if (err instanceof UnrecoverableError) throw err;
      if (this.isUnrecoverableDownloadError(err)) {
        throw new UnrecoverableError(err instanceof Error ? err.message : "Media unavailable.");
      }
      throw err;
    }
  }

  private async resolveWhatsAppToken(
    conv: Conversation,
    tenantId: string,
  ): Promise<string> {
    if (conv.accountId) {
      const account = await this.accountRepo.findOne({
        where: { id: conv.accountId, tenantId },
      });
      if (account?.accessTokenEnc) {
        return this.aesVault.decryptStrict<string>(account.accessTokenEnc);
      }
    }

    const creds = await this.credRepo.findOne({ where: { tenantId } });
    if (creds?.waAccessTokenEnc) {
      return this.aesVault.decryptStrict<string>(creds.waAccessTokenEnc);
    }

    throw new UnrecoverableError("WhatsApp access token unavailable for media re-host.");
  }

  private isUnrecoverableDownloadError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : "";
    return /\bHTTP (400|401|403|404|410)\b/.test(message);
  }

  private extensionFor(mimeType: string | null): string {
    if (!mimeType) return ".bin";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/png") return ".png";
    if (mimeType === "video/mp4") return ".mp4";
    if (mimeType.startsWith("audio/")) return ".ogg";
    return ".bin";
  }
}
