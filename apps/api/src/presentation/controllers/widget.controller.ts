import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { IContactRepository } from "../../domain/repositories/i-contact.repository";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../domain/repositories/i-message.repository";
import { ChannelType, MessageDirection, MessageStatus, MediaType } from "@connectme/database";
import { InboxRealtimeGateway } from "../gateways/inbox-realtime.gateway";
import { createHmac } from "crypto";

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
  ) {}

  @Post("session")
  async createSession(@Body() body: { tenantId: string; visitorId?: string; visitorName?: string }) {
    if (!body.tenantId) {
      throw new BadRequestException("tenantId is required");
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
    @Body() body: { text?: string; mediaUrl?: string; media?: any[]; name?: string },
  ) {
    const rawToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!rawToken) throw new UnauthorizedException("Session token missing");

    const session = verifyWidgetToken(rawToken, this.signingSecret);
    if (!session) throw new UnauthorizedException("Invalid session token");

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

    const msg = await this.messageRepo.createMessage(tenantId, {
      conversationId: conv.id,
      externalId: `wmsg_${Date.now()}`,
      direction: MessageDirection.INBOUND,
      channel: ChannelType.WIDGET,
      type: mediaList.length > 0 ? (mediaList[0].type === "image" ? MediaType.IMAGE : MediaType.DOCUMENT) : MediaType.TEXT,
      text: body.text || null,
      mediaUrl: mediaList[0]?.url || body.mediaUrl || null,
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
}
