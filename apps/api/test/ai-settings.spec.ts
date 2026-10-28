import { test } from "node:test";
import assert from "node:assert/strict";
import { SettingsController } from "../src/presentation/controllers/settings.controller";
import { SaveSettingsBodySchema } from "../src/presentation/validation/schemas";
import { BadRequestException } from "@nestjs/common";

test("settings validator accepts AI configuration and explicit false, rejects malformed controls", () => {
  assert.equal(SaveSettingsBodySchema.parse({ secrets: { aiProvider: "openai", aiModel: "model", aiAutoReplyEnabled: false, aiAutoReplyPrompt: "", aiFallbackEnabled: false } }).secrets.aiAutoReplyEnabled, false);
  assert.equal(SaveSettingsBodySchema.safeParse({ secrets: { aiAutoReplyEnabled: "false" } }).success, false);
  assert.equal(SaveSettingsBodySchema.safeParse({ secrets: { aiAutoReplyPrompt: "x".repeat(4097) } }).success, false);
});
test("auto-reply cannot be enabled without credentials and false is persisted tenant-scoped", async () => {
  let written: any;
  const controller = new SettingsController({
    getCredentials: async () => null,
    updateCredentials: async (tenant: string, patch: any) => { assert.equal(tenant, "tenant"); written = patch; return {}; },
  } as any, { encrypt: () => "encrypted" } as any);
  await assert.rejects(controller.saveSettings("tenant", { secrets: { aiAutoReplyEnabled: true } }), BadRequestException);
  await controller.saveSettings("tenant", { secrets: { aiAutoReplyEnabled: false, aiAutoReplyPrompt: "", aiFallbackEnabled: false } });
  assert.equal(written.aiAutoReplyEnabled, false);
  assert.equal(written.aiAutoReplyPrompt, "");
  assert.equal(written.aiFallbackApiKeyEnc, null);
  await controller.saveSettings("tenant", { secrets: { aiAutoReplyEnabled: true, aiApiKey: "test-key" } });
  assert.equal(written.aiAutoReplyEnabled, true);
  assert.equal(written.aiApiKeyEnc, "encrypted");
});
