import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  Res,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";
import { S3PresignService } from "../../infrastructure/storage/s3-presign.service";

@Controller("api/media")
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly aesVault: AesVaultService,
    private readonly s3Presign: S3PresignService,
  ) {}

  /**
   * Creates a presigned PUT URL so the browser uploads directly to S3/R2.
   * The resulting public URL is what Meta fetches when publishing media.
   */
  @Post("presign")
  async presign(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() body: { filename?: string; contentType?: string },
  ) {
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant(
      "system",
      "admin@connectme.local",
    );
    const tenantId = headerTenantId || defaultTenant.id;
    const safeName = (body?.filename || "upload.bin")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    const key = `tenants/${tenantId}/${Date.now()}-${safeName}`;
    return this.s3Presign.presignPut(key);
  }

  /**
   * Proxies Meta/WhatsApp media downloads using the tenant's Bearer token
   */
  @Get()
  async getMedia(
    @Query("id") mediaId: string,
    @Query("url") directUrl: string,
    @Query("tenantId") queryTenantId: string,
    @Res() res: Response,
  ) {
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    const tenantId = queryTenantId || defaultTenant.id;
    const creds = await this.tenantRepo.getCredentials(tenantId);

    if (!creds?.waAccessTokenEnc) {
      throw new NotFoundException("WhatsApp credentials not found for media download");
    }

    const token = this.aesVault.decrypt<string>(creds.waAccessTokenEnc) || creds.waAccessTokenEnc;

    try {
      let downloadUrl = directUrl;
      if (!downloadUrl && mediaId) {
        const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
        const metaRes = await fetch(`https://graph.facebook.com/${graphVersion}/${mediaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metaJson = await metaRes.json();
        downloadUrl = metaJson.url;
      }

      if (!downloadUrl) {
        throw new NotFoundException("Could not retrieve media URL");
      }

      const mediaRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);

      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      return res.send(buffer);
    } catch (err: any) {
      this.logger.error(`Media proxy error: ${err.message}`, err.stack);
      return res.status(500).json({ error: err.message });
    }
  }
}
