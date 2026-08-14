import request from "supertest";
import { redis } from "../../src/config/redis";
import {
  app,
  createLiveTestContext,
  setupLiveTest,
  cleanupLiveTest,
} from "../helpers";

const ctx = createLiveTestContext();

beforeAll(async () => {
  await setupLiveTest();

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Live Test Creator",
    email: ctx.creatorEmail,
    password: "password123",
    role: "creator",
  });

  ctx.creatorToken = register.body.data.accessToken;

  const event = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${ctx.creatorToken}`)
    .send({
      title: `Live Cache Test Event ${ctx.runId}`,
      description: "Created for cache integration tests.",
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

describe("Event caching integration", () => {
  it("writes the browse list to Redis", async () => {
    const cacheKey = "events:list:" + JSON.stringify({ page: 1, limit: 10 });

    await redis.del(cacheKey);

    const res = await request(app).get("/api/v1/events");

    expect(res.status).toBe(200);

    const cached = await redis.get(cacheKey);

    expect(cached).not.toBeNull();
  });

  it("writes a single event fetch to Redis", async () => {
    await request(app).get(`/api/v1/events/${ctx.eventId}`);

    const cached = await redis.get(`events:id:${ctx.eventId}`);

    expect(cached).not.toBeNull();
  });

  it("serves the share link when the event is cached", async () => {
    const res = await request(app).get(`/api/v1/events/${ctx.eventId}/share`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain(ctx.eventId);
  });
});
