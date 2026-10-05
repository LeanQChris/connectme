import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { LinkPreviewService, LinkPreviewData } from "../../infrastructure/services/link-preview.service";
import { Public } from "../auth/public.decorator";

@Controller("api/preview-link")
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Get()
  @Public()
  async getPreview(@Query("url") url: string): Promise<LinkPreviewData | { error: string }> {
    if (!url) {
      throw new BadRequestException("Query param 'url' is required");
    }

    const preview = await this.linkPreviewService.getPreview(url);
    if (!preview) {
      return { error: "Failed to generate link preview" };
    }
    return preview;
  }
}
