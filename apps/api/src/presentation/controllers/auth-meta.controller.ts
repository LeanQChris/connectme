import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Inject,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { ChannelType } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";
import { IdempotencyLockService } from "../../infrastructure/redis/idempotency-lock.service";
import { TenantId } from "../auth/tenant-id.decorator";
import { Public } from "../auth/public.decorator";
import { encodeOAuthState, decodeOAuthState } from "../../infrastructure/security/oauth-state";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { DisconnectBodySchema } from "../validation/schemas";

const STATE_TTL_MS = 10 * 60 * 1000;
const GRAPH_VERSION = "v22.0";

function base64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

@Controller("api/auth/meta")
export class AuthMetaController {
  private readonly logger = new Logger(AuthMetaController.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly aesVault: AesVaultService,
    private readonly idempotency: IdempotencyLockService,
  ) {}

  @Get("connect")
  connect(@TenantId() tenantId: string, @Res() res: Response) {
    const appId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    if (!appId) {
      return res.redirect(`${appUrl}/settings?error=META_APP_ID_NOT_CONFIGURED`);
    }

    const codeVerifier = base64Url(randomBytes(48));
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
    const state = encodeOAuthState({
      t: tenantId,
      n: base64Url(randomBytes(16)),
      v: codeVerifier,
      exp: Date.now() + STATE_TTL_MS,
    });

    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "pages_messaging",
      "instagram_basic",
      "instagram_manage_messages",
    ].join(",");

    const authUrl =
      `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&scope=${encodeURIComponent(scopes)}`;

    return res.redirect(authUrl);
  }

  @Public()
  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const appId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
    const appSecret = process.env.META_CLIENT_SECRET || process.env.META_APP_SECRET;
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    const decoded = decodeOAuthState(state);
    if (!code || !appId || !appSecret || !decoded) {
      return res.redirect(`${appUrl}/settings?error=MISSING_CODE_OR_CREDENTIALS`);
    }

    // Single-use: reject replayed callbacks.
    const fresh = await this.idempotency.acquire(`meta-oauth-state:${decoded.n}`, 15 * 60);
    if (!fresh) {
      return res.redirect(`${appUrl}/settings?error=OAUTH_STATE_REPLAYED`);
    }

    const tenantId = decoded.t;

    try {
      const tokenUrl =
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${appId}` +
        `&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${encodeURIComponent(code)}&code_verifier=${encodeURIComponent(decoded.v)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error?.message || "Failed to exchange authorization code");
      }

      const userAccessToken = tokenJson.access_token;

      const accountsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsJson = await accountsRes.json();

      if (accountsJson.data && Array.isArray(accountsJson.data)) {
        for (const page of accountsJson.data) {
          await this.tenantRepo.saveConnectedAccount({
            tenantId,
            channel: ChannelType.MESSENGER,
            provider: "meta",
            externalId: page.id,
            name: page.name,
            accessTokenEnc: this.aesVault.encrypt(page.access_token),
            isActive: true,
          });

          if (page.instagram_business_account?.id) {
            await this.tenantRepo.saveConnectedAccount({
              tenantId,
              channel: ChannelType.INSTAGRAM,
              provider: "meta",
              externalId: page.instagram_business_account.id,
              name: page.instagram_business_account.username || `${page.name} (Instagram)`,
              accessTokenEnc: this.aesVault.encrypt(page.access_token),
              isActive: true,
            });
          }
        }
      }

      return res.redirect(`${appUrl}/settings?connected=meta`);
    } catch (err: any) {
      this.logger.error(`Meta OAuth callback error: ${err.message}`, err.stack);
      return res.redirect(`${appUrl}/settings?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post("disconnect")
  async disconnect(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(DisconnectBodySchema)) body: { accountId: string },
  ) {
    if (body.accountId) {
      await this.tenantRepo.removeConnectedAccount(tenantId, body.accountId);
    }
    return { ok: true };
  }
}
