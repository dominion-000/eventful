import crypto from "crypto";
import { verifyWebhookSignature } from "../../src/services/paystack.service";

describe("paystack.service - webhook signature", () => {
  const body = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "abc" } }));
  const sign = (payload: Buffer) =>
    crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(payload).digest("hex");

  it("accepts a correctly signed payload", () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(verifyWebhookSignature(body, "deadbeef")).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it("rejects a signature computed for a different body", () => {
    const otherBody = Buffer.from(JSON.stringify({ event: "charge.failed" }));
    expect(verifyWebhookSignature(body, sign(otherBody))).toBe(false);
  });
});
