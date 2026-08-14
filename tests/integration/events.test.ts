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

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Live Test Creator",
    email: ctx.creatorEmail,
    password: "password123",
    role: "creator",
  });

  ctx.creatorToken = register.body.data.accessToken;
}, 45000);

afterAll(async () => {
  await cleanupLiveTest(ctx);
}, 45000);

describe("Events integration", () => {
  it("creates and publishes an event", async () => {
    const res = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${ctx.creatorToken}`)
      .send({
        title: `Live Test Event ${ctx.runId}`,
        description: "Created by the live integration suite - safe to delete.",
        category: "concert",
        venue: "Live Test Venue",
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        ticketPriceNaira: 5000,
        status: "published",
      });

    expect(res.status).toBe(201);

    ctx.eventId = res.body.data.event._id;

    expect(ctx.eventId).toBeTruthy();
  });

  it("returns a published event", async () => {
    expect(ctx.eventId).toBeTruthy();

    const res = await request(app).get(`/api/v1/events/${ctx.eventId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeTruthy();
  });

  it("generates a share link", async () => {
    expect(ctx.eventId).toBeTruthy();

    const res = await request(app).get(`/api/v1/events/${ctx.eventId}/share`);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain(ctx.eventId);
  });
});
