import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../src/presentation/pipes/zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(
    z.object({ name: z.string().min(1), age: z.number().int().optional() }),
  );

  test("passes through valid input", () => {
    const result = pipe.transform({ name: "Ada", age: 36 }, { type: "body" });
    assert.deepEqual(result, { name: "Ada", age: 36 });
  });

  test("rejects invalid input with field errors", () => {
    try {
      pipe.transform({ name: "" }, { type: "body" });
      assert.fail("expected a BadRequestException");
    } catch (err) {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse() as { message: string; errors: { path: string }[] };
      assert.equal(body.message, "Validation failed");
      assert.equal(body.errors[0]?.path, "name");
    }
  });

  test("rejects non-object input", () => {
    assert.throws(() => pipe.transform("nope", { type: "body" }), BadRequestException);
  });
});
