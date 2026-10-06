import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  HttpException,
  Inject,
} from "@nestjs/common";
import type { Request } from "express";
import { MAX_UPLOAD_BYTES } from "@connectme/contracts";
import { Public } from "../auth/public.decorator";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { IContactRepository } from "../../domain/repositories/i-contact.repository";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../domain/repositories/i-message.repository";
import { ChannelType, MessageDirection, MessageStatus, MediaType } from "@connectme/database";
import { InboxRealtimeGateway } from "../gateways/inbox-realtime.gateway";
import { S3PresignService } from "../../infrastructure/storage/s3-presign.service";
import { isAllowedMediaHost } from "../../infrastructure/security/allowed-media-hosts";
import {
  allowWidgetMessage,
  isAllowedWidgetOrigin,
} from "../../infrastructure/security/widget-guards";
import { createHmac } from "crypto";

/** A human types far slower than this; anything faster is a bot. */
const WIDGET_MESSAGES_PER_MINUTE = 12;
/** Bounds one host's ability to flood several tenants at once. */
const WIDGET_MESSAGES_PER_IP_PER_MINUTE = 60;

function signWidgetToken(tenantId: string, visitorId: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ tenantId, visitorId, exp: Date.now() + 30 * 86400000 })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyWidgetToken(token: string, secret: string): { tenantId: string; visitorId: string } | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Date.now()) return null;
    return { tenantId: data.tenantId, visitorId: data.visitorId };
  } catch {
    return null;
  }
}

@Public()
@Controller("api/widget")
export class WidgetController {
  private readonly signingSecret = process.env.ENCRYPTION_KEY || "widget-secret-key-1234567890123456";

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IContactRepository")
    private readonly contactRepo: IContactRepository,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
    private readonly realtimeGateway: InboxRealtimeGateway,
    private readonly s3Presign: S3PresignService,
  ) {}

  /** Prefer the proxy header; Express only populates req.ip behind a trusted proxy. */
  private clientIp(xfwd: string | undefined, req?: Request): string {
    const forwarded = xfwd?.split(",")[0]?.trim();
    return forwarded || req?.ip || "unknown";
  }

  @Post("session")
  async createSession(
    @Headers("origin") origin: string,
    @Body() body: { tenantId: string; visitorId?: string; visitorName?: string },
  ) {
    if (!body.tenantId) {
      throw new BadRequestException("tenantId is required");
    }

    // Opt-in embed allowlist; unset WIDGET_ALLOWED_ORIGINS keeps this open.
    if (!isAllowedWidgetOrigin(origin)) {
      throw new ForbiddenException("This site is not permitted to embed the widget.");
    }

    const visitorId = body.visitorId || `visitor_${Math.random().toString(36).substring(2, 12)}`;
    const token = signWidgetToken(body.tenantId, visitorId, this.signingSecret);

    const contact = await this.contactRepo.upsertContact(
      body.tenantId,
      ChannelType.WIDGET,
      visitorId,
      {
        name: body.visitorName || `Visitor ${visitorId.slice(-4)}`,
      },
    );

    const conv = await this.convRepo.findOrCreateForContact(
      body.tenantId,
      contact.id,
      ChannelType.WIDGET,
      null,
    );

    return {
      sessionToken: token,
      visitorId,
      conversationId: conv.id,
    };
  }

  @Post("message")
  async sendMessage(
    @Headers("authorization") authHeader: string,
    @Headers("origin") origin: string,
    @Headers("x-forwarded-for") xfwd: string,
    @Req() req: Request,
    @Body() body: { text?: string; mediaUrl?: string; media?: any[]; name?: string },
  ) {
    const rawToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!rawToken) throw new UnauthorizedException("Session token missing");

    const session = verifyWidgetToken(rawToken, this.signingSecret);
    if (!session) throw new UnauthorizedException("Invalid session token");

    if (!isAllowedWidgetOrigin(origin)) {
      throw new ForbiddenException("This site is not permitted to use the widget.");
    }
    this.enforceMessageRate(session.visitorId, xfwd, req);

    const { tenantId, visitorId } = session;
    const contact = await this.contactRepo.upsertContact(
      tenantId,
      ChannelType.WIDGET,
      visitorId,
      {
        name: body.name || `Visitor ${visitorId.slice(-4)}`,
      },
    );

    const conv = await this.convRepo.findOrCreateForContact(
      tenantId,
      contact.id,
      ChannelType.WIDGET,
      null,
    );

    const mediaList = body.media && body.media.length > 0
      ? body.media
      : body.mediaUrl
      ? [{ url: body.mediaUrl, type: "file" }]
      : [];

    this.assertAllowedMediaUrls(mediaList);

    const msg = await this.messageRepo.createMessage(tenantId, {
      conversationId: conv.id,
      externalId: `wmsg_${Date.now()}`,
      direction: MessageDirection.INBOUND,
      channel: ChannelType.WIDGET,
      type: mediaList.length > 0 ? (mediaList[0].type === "image" ? MediaType.IMAGE : MediaType.DOCUMENT) : MediaType.TEXT,
      text: body.text || null,
      media: mediaList.length > 0 ? mediaList : null,
      status: MessageStatus.RECEIVED,
      authorName: contact.name,
    });

    const preview = body.text || (mediaList.length > 0 ? `📎 ${mediaList.length} file(s)` : "Widget message");
    await this.convRepo.updateLastMessage(tenantId, conv.id, preview, true);

    this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, msg);

    return { message: msg };
  }

  @Get("messages")
  async getMessages(
    @Headers("authorization") authHeader: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    const rawToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!rawToken) throw new UnauthorizedException("Session token missing");

    const session = verifyWidgetToken(rawToken, this.signingSecret);
    if (!session) throw new UnauthorizedException("Invalid session token");

    const { tenantId, visitorId } = session;
    const contact = await this.contactRepo.findByExternalId(tenantId, ChannelType.WIDGET, visitorId);
    if (!contact) return { messages: [] };

    const conv = await this.convRepo.findByContactId(tenantId, contact.id);
    if (!conv) return { messages: [] };

    const messages = await this.messageRepo.findMessagesPage(
      tenantId,
      conv.id,
      Math.min(parseInt(limit || "50", 10), 100),
      before,
    );

    return { conversationId: conv.id, messages };
  }

  /**
   * Per-visitor and per-IP message budgets. The global throttler only bounds
   * requests per IP; this is what stops one visitor flooding a tenant's inbox.
   */
  private enforceMessageRate(visitorId: string, xfwd: string | undefined, req?: Request): void {
    const ip = this.clientIp(xfwd, req);
    const withinSession = allowWidgetMessage(
      `visitor:${visitorId}`,
      WIDGET_MESSAGES_PER_MINUTE,
      60_000,
    );
    const withinIp = allowWidgetMessage(
      `ip:${ip}`,
      WIDGET_MESSAGES_PER_IP_PER_MINUTE,
      60_000,
    );
    if (!withinSession || !withinIp) {
      throw new HttpException("Slow down", 429);
    }
  }

  /**
   * A widget visitor is untrusted, and an attachment URL is later fetched by an
   * *agent's* browser. Accepting an arbitrary URL here would let anyone who can
   * open the widget make an agent request an internal or hostile host, so the
   * same media-host allowlist the proxy uses is enforced.
   */
  private assertAllowedMediaUrls(mediaList: Array<{ url?: unknown }>): void {
    for (const item of mediaList || []) {
      const url = typeof item?.url === "string" ? item.url : "";
      if (!url) throw new BadRequestException("Attachment URL is missing.");
      // A relative path is same-origin and re-validated by the media proxy.
      if (url.startsWith("/api/")) continue;
      if (!isAllowedMediaHost(url)) {
        throw new BadRequestException(
          "Attachment host is not allowed. Upload the file first, or allow the host via MEDIA_ALLOWED_HOSTS.",
        );
      }
    }
  }

  /**
   * Issues a presigned PUT so the visitor's browser uploads straight to object
   * storage — the API never touches the bytes.
   *
   * The declared size is signed into the URL, so a client that PUTs a different
   * number of bytes fails signature verification. That is the size cap: the
   * presign would otherwise happily allow an anonymous 1GB write.
   */
  @Post("upload")
  async upload(
    @Headers("authorization") authHeader: string,
    @Headers("origin") origin: string,
    @Headers("x-forwarded-for") xfwd: string,
    @Req() req: Request,
    @Body() body: { filename?: string; size?: unknown; contentType?: string },
  ) {
    const rawToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!rawToken) throw new UnauthorizedException("Session token missing");

    const session = verifyWidgetToken(rawToken, this.signingSecret);
    if (!session) throw new UnauthorizedException("Invalid session token");

    if (!isAllowedWidgetOrigin(origin)) {
      throw new ForbiddenException("This site is not permitted to use the widget.");
    }
    this.enforceMessageRate(session.visitorId, xfwd, req);

    const size = Number(body?.size);
    if (!Number.isInteger(size) || size <= 0) {
      throw new BadRequestException("size must be a positive integer (bytes).");
    }
    if (size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `File is too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB).`,
      );
    }

    const safeName = (body?.filename || "upload.bin")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    const key = `widget/${session.tenantId}/${Date.now()}-${safeName}`;

    return this.s3Presign.presignPut(key, 900, size);
  }
}
