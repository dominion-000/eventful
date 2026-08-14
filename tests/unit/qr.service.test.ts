import { generateQrToken, verifyQrToken } from "../../src/services/qr.service";

describe("qr.service", () => {
  it("verifies a token it generated", () => {
    const token = generateQrToken("507f1f77bcf86cd799439011");
    expect(verifyQrToken(token).valid).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const token = generateQrToken("507f1f77bcf86cd799439011");
    expect(verifyQrToken(token.slice(0, -2) + "ff").valid).toBe(false);
  });

  it("rejects a forged id with a stolen signature", () => {
    const token = generateQrToken("507f1f77bcf86cd799439011");
    const [, signature] = token.split(".");
    expect(verifyQrToken(`507f1f77bcf86cd799439099.${signature}`).valid).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(verifyQrToken("garbage").valid).toBe(false);
    expect(verifyQrToken("").valid).toBe(false);
  });
});
