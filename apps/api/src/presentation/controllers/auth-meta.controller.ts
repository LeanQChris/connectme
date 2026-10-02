import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Res,
  Inject,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ChannelType } from "@connectme/database";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";

@Controller("api/auth/meta")
export class AuthMetaController {
  private readonly logger = new Logger(AuthMetaController.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly aesVault: AesVaultService,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    return defaultTenant.id;
  }

  @Get("connect")
  connect(
    @Query("tenantId") queryTenantId: string,
    @Res() res: Response,
  ) {
    const appId = process.env.META_CLIENT_ID || process.env.META_APP_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    if (!appId) {
      return res.redirect(`${appUrl}/settings?error=META_APP_ID_NOT_CONFIGURED`);
    }

    const state = queryTenantId || "default";
    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "pages_messaging",
      "instagram_basic",
      "instagram_manage_messages",
    ].join(",");

    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;

    return res.redirect(authUrl);
  }

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

    if (!code || !appId || !appSecret) {
      return res.redirect(`${appUrl}/settings?error=MISSING_CODE_OR_CREDENTIALS`);
    }

    try {
      // 1. Exchange code for user access token
      const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&code=${encodeURIComponent(code)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.access_token) {
        throw new Error(tokenJson.error?.message || "Failed to exchange authorization code");
      }

      const userAccessToken = tokenJson.access_token;
      const tenantId = await this.resolveTenantId(state !== "default" ? state : undefined);

      // 2. Fetch pages & instagram accounts
      const accountsUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsJson = await accountsRes.json();

      if (accountsJson.data && Array.isArray(accountsJson.data)) {
        for (const page of accountsJson.data) {
          // Save Facebook Page
          await this.tenantRepo.saveConnectedAccount({
            tenantId,
            channel: ChannelType.MESSENGER,
            provider: "meta",
            externalId: page.id,
            name: page.name,
            accessTokenEnc: this.aesVault.encrypt(page.access_token),
            isActive: true,
          });

          // Save Instagram Account if linked
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
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() body: { accountId: string },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    if (body.accountId) {
      await this.tenantRepo.removeConnectedAccount(tenantId, body.accountId);
    }
    return { ok: true };
  }
}
