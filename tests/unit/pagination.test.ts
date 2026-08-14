import { paginationQuerySchema } from "../../src/validators/common.validator";

describe("paginationQuerySchema", () => {
  it("accepts limit at the max boundary (50)", () => {
    expect(paginationQuerySchema.safeParse({ query: { limit: "50" } }).success).toBe(true);
  });

  it("rejects a limit above the max (100)", () => {
    expect(paginationQuerySchema.safeParse({ query: { limit: "100" } }).success).toBe(false);
  });

  it("defaults limit to 10 when not provided", () => {
    const result = paginationQuerySchema.safeParse({ query: {} });
    expect(result.success && result.data.query.limit).toBe(10);
  });
});
