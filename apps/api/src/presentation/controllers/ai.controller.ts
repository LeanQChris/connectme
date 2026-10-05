import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AiService } from "../../infrastructure/services/ai.service";
import { TenantId } from "../auth/tenant-id.decorator";
import {
  GenerateAiSuggestionsDto,
  AiRewriteDto,
  AiSummarizeDto,
  AiTestConnectionDto,
} from "@connectme/contracts";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("suggest")
  @HttpCode(HttpStatus.OK)
  public async suggest(
    @TenantId() tenantId: string,
    @Body() dto: GenerateAiSuggestionsDto,
  ) {
    const suggestions = await this.aiService.suggestReplies(tenantId, dto);
    return { suggestions };
  }

  @Post("rewrite")
  @HttpCode(HttpStatus.OK)
  public async rewrite(
    @TenantId() tenantId: string,
    @Body() dto: AiRewriteDto,
  ) {
    return this.aiService.rewriteText(tenantId, dto.text, dto.mode);
  }

  @Post("summarize")
  @HttpCode(HttpStatus.OK)
  public async summarize(
    @TenantId() tenantId: string,
    @Body() dto: AiSummarizeDto,
  ) {
    return this.aiService.summarizeConversation(tenantId, dto);
  }

  @Post("test")
  @HttpCode(HttpStatus.OK)
  public async testConnection(
    @TenantId() _tenantId: string,
    @Body() dto: AiTestConnectionDto,
  ) {
    return this.aiService.testConnection(
      dto.apiKey,
      dto.provider,
      dto.model,
      dto.customBaseUrl,
    );
  }
}
