import request from "supertest";

import {
  app,
  createLiveTestContext,
  setupLiveTest,
  cleanupLiveTest,
} from "../helpers";

const ctx = createLiveTestContext();

beforeAll(async () => {
  await setupLiveTest();

  const creator = await request(app).post("/api/v1/auth/register").send({
    name: "Live Test Creator",
    email: ctx.creatorEmail,
    password: "password123",
    role: "creator",
  });

  ctx.creatorToken = creator.body.data.accessToken;

  const event = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${ctx.creatorToken}`)
    .send({
      title: `Live Analytics Test Event ${ctx.runId}`,
      description: "Created for analytics integration tests.",
      category: "concert",
      venue: "Live Test Venue",
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 100,
      ticketPriceNaira: 5000,
      status: "published",
    });

  ctx.eventId = event.body.data.event._id;
}, 45000);

afterAll(async () => {
  await cleanupLiveTest(ctx);
}, 45000);

describe("Analytics integration", () => {
  it("reflects real event data from the aggregation pipeline", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${ctx.creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalEvents).toBeGreaterThanOrEqual(1);
  });
});
