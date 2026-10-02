import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

@Processor("inbound-webhooks")
export class WebhookInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookInboundProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing async webhook job ${job.id} for channel ${job.name}`);
    // Background worker task (e.g., media fetching, large batch processing, SLA reporting)
    return { success: true };
  }
}
