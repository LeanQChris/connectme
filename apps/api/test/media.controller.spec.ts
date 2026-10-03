import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MediaController } from "../src/presentation/controllers/media.controller";

function response() {
  return {
    setHeader: () => {},
    send: () => {},
    status: () => ({ json: () => {} }),
  } as any;
}

describe("MediaController (SSRF + tenant)", () => {
  test("rejects a non-allowlisted direct URL before fetching", async () => {
    const controller = new MediaController(
      { getCredentials: async () => null } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () => controller.getMedia("tenant-1", "", "http://169.254.169.254/latest/meta-data/", response()),
      BadRequestException,
    );
  });

  test("uses the authenticated tenant, not a query parameter", async () => {
    let askedTenant: string | undefined;
    const controller = new MediaController(
      {
        getCredentials: async (tenantId: string) => {
          askedTenant = tenantId;
          return null;
        },
      } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () => controller.getMedia("tenant-secure", "", undefined as any, response()),
      NotFoundException,
    );
    assert.equal(askedTenant, "tenant-secure");
  });
});
