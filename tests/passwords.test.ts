import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("password hashing", () => {
  it("verifies a valid password against its hash", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("rejects an invalid password", async () => {
    const hash = await hashPassword("matchday");

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects unsupported hash formats", async () => {
    await expect(verifyPassword("matchday", "legacy-hash")).resolves.toBe(false);
  });
});
