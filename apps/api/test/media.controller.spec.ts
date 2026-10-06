import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MediaController } from "../src/presentation/controllers/media.controller";

/** Mirrors the controller's cap; a 25MB+1 allocation is cheap enough for a test. */
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

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

describe("MediaController Slack proxy", () => {
  test("rejects a non-allowlisted Slack URL before fetching", async () => {
    const controller = new MediaController(
      { getCredentials: async () => ({ slackBotTokenEnc: "enc" }) } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        controller.getSlackMedia(
          "tenant-1",
          "http://169.254.169.254/latest/meta-data/",
          undefined,
          undefined,
          response(),
        ),
      BadRequestException,
    );
  });

  test("refuses to serve Slack files without tenant credentials", async () => {
    const controller = new MediaController(
      { getCredentials: async () => ({}) } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        controller.getSlackMedia(
          "tenant-1",
          "https://files.slack.com/files-pri/T1/a.png",
          undefined,
          undefined,
          response(),
        ),
      NotFoundException,
    );
  });

  test("sanitises the download filename into Content-Disposition", async () => {
    const headers: Record<string, string> = {};
    const controller = new MediaController(
      { getCredentials: async () => ({ slackBotTokenEnc: "enc" }) } as any,
      { decrypt: () => "xoxb-token" } as any,
      {} as any,
    );

    // Stub the redirect-following fetch with a small PNG.
    (controller as any).fetchFollowingSafeRedirects = async () =>
      new Response(Buffer.from("89504e470d0a1a0a", "hex"), {
        headers: { "content-type": "image/png", "content-length": "8" },
      });

    const res: any = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      send: () => undefined,
      status: () => ({ json: () => undefined }),
    };

    // A quote in the name must not break out of the header.
    await controller.getSlackMedia(
      "tenant-1",
      "https://files.slack.com/files-pri/T1/a.png",
      "1",
      'evil"; drop="x.txt',
      res,
    );

    assert.match(headers["Content-Disposition"], /^attachment; filename="[^"]*"$/);
    assert.ok(!headers["Content-Disposition"].includes('";"'));
    assert.ok(!headers["Content-Disposition"].includes("drop="));
  });

  test("omits Content-Disposition for inline display", async () => {
    const headers: Record<string, string> = {};
    const controller = new MediaController(
      { getCredentials: async () => ({ slackBotTokenEnc: "enc" }) } as any,
      { decrypt: () => "xoxb-token" } as any,
      {} as any,
    );

    (controller as any).fetchFollowingSafeRedirects = async () =>
      new Response(Buffer.from([1, 2, 3]), {
        headers: { "content-type": "image/png", "content-length": "3" },
      });

    const res: any = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      send: () => undefined,
      status: () => ({ json: () => undefined }),
    };

    await controller.getSlackMedia(
      "tenant-1",
      "https://files.slack.com/files-pri/T1/a.png",
      undefined,
      "shot.png",
      res,
    );

    assert.equal(headers["Content-Disposition"], undefined);
    assert.equal(headers["Content-Type"], "image/png");
  });

  test("enforces the size cap on actual bytes when content-length lies", async () => {
    const controller = new MediaController(
      { getCredentials: async () => ({ slackBotTokenEnc: "enc" }) } as any,
      { decrypt: () => "xoxb-token" } as any,
      {} as any,
    );

    // Declares a tiny length but returns far more than the cap.
    (controller as any).fetchFollowingSafeRedirects = async () =>
      new Response(Buffer.alloc(MAX_MEDIA_BYTES + 1), {
        headers: { "content-type": "application/octet-stream", "content-length": "10" },
      });

    const res: any = {
      setHeader: () => {},
      send: () => undefined,
      status: () => ({ json: () => undefined }),
    };

    await assert.rejects(
      () =>
        controller.getSlackMedia(
          "tenant-1",
          "https://files.slack.com/files-pri/T1/big.bin",
          undefined,
          undefined,
          res,
        ),
      BadRequestException,
    );
  });
});
