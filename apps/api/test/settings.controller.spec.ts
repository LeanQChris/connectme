import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SettingsController } from "../src/presentation/controllers/settings.controller";

describe("SettingsController", () => {
  test("maps connected flags and accounts", async () => {
    const tenantRepo = {
      getCredentials: async () => ({
        waPhoneNumberId: "123",
        waAccessTokenEnc: "v2.x",
        pageAccessTokenEnc: null,
        telegramTokenEnc: null,
        discordBotTokenEnc: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        webhookVerifyToken: "vt",
        waAppId: "app",
      }),
      findConnectedAccounts: async () => [
        {
          id: "acc-1",
          tenantId: "t1",
          channel: "INSTAGRAM",
          provider: "meta",
          externalId: "ig-1",
          name: "ig",
          avatarUrl: null,
          isActive: true,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
    };

    const controller = new SettingsController(tenantRepo as any, {} as any);
    const payload = await controller.getSettings("t1");

    assert.equal(payload.settings.connected.whatsapp, true);
    assert.equal(payload.settings.connected.instagram, true);
    assert.equal(payload.settings.connected.telegram, false);
    assert.equal(payload.settings.accounts.length, 1);
    assert.equal(payload.settings.instagramUsername, "ig");
  });

  test("fails loudly when a stored credential cannot be decrypted", async () => {
    const tenantRepo = {
      getCredentials: async () => ({ telegramTokenEnc: "v2.corrupt" }),
    };
    const vault = { decrypt: () => null };
    const controller = new SettingsController(tenantRepo as any, vault as any);

    await assert.rejects(() => controller.verifyConnection("t1", { channel: "telegram" }));
  });

  test("rejects verification when no credentials are saved", async () => {
    const controller = new SettingsController({ getCredentials: async () => null } as any, {} as any);
    const result = await controller.verifyConnection("t1", { channel: "telegram" });
    assert.deepEqual(result, { ok: false, detail: "No credentials saved." });
  });
});
