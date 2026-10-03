import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { Response } from "express";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";
import { S3PresignService } from "../../infrastructure/storage/s3-presign.service";
import { TenantId } from "../auth/tenant-id.decorator";
import { decryptStrict } from "../../infrastructure/crypto/decrypt-strict";
import { isAllowedMediaHost } from "../../infrastructure/security/allowed-media-hosts";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { PresignBodySchema } from "../validation/schemas";

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MAX_REDIRECTS = 3;

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
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(PresignBodySchema)) body: { filename?: string; contentType?: string },
  ) {
    const safeName = (body?.filename || "upload.bin")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    const key = `tenants/${tenantId}/${Date.now()}-${safeName}`;
    return this.s3Presign.presignPut(key);
  }

  /**
   * Proxies Meta/WhatsApp media downloads using the tenant's Bearer token.
   * Only allow-listed hosts may be fetched to prevent SSRF.
   */
  @Get()
  async getMedia(
    @TenantId() tenantId: string,
    @Query("id") mediaId: string,
    @Query("url") directUrl: string,
    @Res() res: Response,
  ) {
    if (directUrl && !isAllowedMediaHost(directUrl)) {
      throw new BadRequestException("Media host is not allowed.");
    }

    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds?.waAccessTokenEnc) {
      throw new NotFoundException("WhatsApp credentials not found for media download");
    }

    const token = decryptStrict(this.aesVault, creds.waAccessTokenEnc);

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
      if (!isAllowedMediaHost(downloadUrl)) {
        throw new BadRequestException("Resolved media host is not allowed.");
      }

      const mediaRes = await this.fetchFollowingSafeRedirects(downloadUrl, token);

      const declaredLength = Number(mediaRes.headers.get("content-length") || "0");
      if (declaredLength > MAX_MEDIA_BYTES) {
        throw new BadRequestException("Media exceeds the maximum allowed size.");
      }

      const contentType = mediaRes.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);

      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      if (buffer.byteLength > MAX_MEDIA_BYTES) {
        throw new BadRequestException("Media exceeds the maximum allowed size.");
      }
      return res.send(buffer);
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error(`Media proxy error: ${err.message}`, err.stack);
      return res.status(502).json({ error: "Media download failed" });
    }
  }

  private async fetchFollowingSafeRedirects(
    url: string,
    token: string,
  ): Promise<Awaited<ReturnType<typeof fetch>>> {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedMediaHost(current)) {
        throw new BadRequestException("Media host is not allowed.");
      }
      const response = await fetch(current, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
      });
      if (response.status < 300 || response.status >= 400) return response;

      const location = response.headers.get("location");
      if (!location) return response;
      current = new URL(location, current).toString();
    }
    throw new BadRequestException("Too many redirects while fetching media.");
  }
}
