import { Body, Controller, Delete, Get, Post, Req, ServiceUnavailableException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { BrowserPushSubscription, User } from "@connectme/database";
import { AesVaultService } from "@connectme/channels";
import { BrowserPushSubscriptionSchema, type BrowserPushSubscriptionDto } from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";
import { RequireRoles } from "../auth/require-roles.decorator";
import type { AuthenticatedRequest } from "../auth/clerk-auth.guard";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";

@Controller("api/notifications")
@RequireRoles("owner", "admin", "agent", "viewer")
export class BrowserPushController {
  constructor(
    @InjectRepository(BrowserPushSubscription) private readonly subscriptions: Repository<BrowserPushSubscription>,
    private readonly vault: AesVaultService,
    @InjectQueue("browser-push") private readonly queue: Queue,
  ) {}

  @Get("config")
  config() {
    const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
    return { configured, publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null };
  }

  @Post("subscriptions")
  async subscribe(@TenantId() tenantId: string, @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(BrowserPushSubscriptionSchema)) subscription: BrowserPushSubscriptionDto) {
    const { configured, publicKey } = this.config();
    if (!configured) throw new ServiceUnavailableException("Background push is not configured on this server.");
    const userId = req.userId!;
    const endpointHash = createHash("sha256").update(subscription.endpoint).digest("hex");
    await this.subscriptions.manager.transaction(async (manager) => {
      const member = await manager.getRepository(User).findOne({ where: { id: userId, tenantId }, lock: { mode: "pessimistic_write" } });
      if (!member || member.disabledAt) throw new ForbiddenException("Workspace membership is inactive.");
      const repo = manager.getRepository(BrowserPushSubscription);
      const existing = await repo.findOne({ where: { tenantId, endpointHash } });
      if (existing?.userId !== userId && await repo.countBy({ tenantId, userId }) >= 20) throw new BadRequestException("Remove an old device before adding another (maximum 20).");
      // Reassign an existing device only within the authenticated workspace.
      await repo.save(repo.create({ ...existing, tenantId, userId, endpointHash,
        subscriptionEnc: this.vault.encrypt(subscription), vapidPublicKey: publicKey!,
      }));
    });
    return { ok: true };
  }

  @Delete("subscriptions")
  async unsubscribe(@TenantId() tenantId: string, @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(z.object({ endpoint: z.string().max(2048) }).strict())) body: { endpoint: string }) {
    await this.subscriptions.delete({ tenantId, userId: req.userId!, endpointHash: createHash("sha256").update(body.endpoint).digest("hex") });
    return { ok: true };
  }

  @Post("test")
  async test(@TenantId() tenantId: string, @Req() req: AuthenticatedRequest) {
    if (!this.config().configured) throw new ServiceUnavailableException("Background push is not configured.");
    const subscriptions = await this.subscriptions.find({ where: { tenantId, userId: req.userId! } });
    if (!subscriptions.length) throw new BadRequestException("Enable background alerts for this device first.");
    await this.queue.addBulk(subscriptions.map((s) => ({ name: "deliver", data: { tenantId, subscriptionId: s.id, test: true },
      opts: { jobId: `push-test-${randomUUID()}`, attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 100, removeOnFail: 100 },
    })));
    return { ok: true };
  }
}
