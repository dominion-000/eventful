import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Ticket } from "../../src/models/Ticket";
import { invalidateCache } from "../../src/utils/cache";

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

  it("counts a paid, checked-in ticket - regression test for the ObjectId/string $match bug", async () => {
    // .aggregate() doesn't cast query values the way .find() does, so this
    // ticket has to exist as a real document for the bug (comparing a
    // string eventId against a stored ObjectId) to actually be caught here
    const ticket = await Ticket.create({
      event: ctx.eventId,
      eventee: new mongoose.Types.ObjectId(), // not asserted on, just needs to be a valid id
      paystackReference: `regression-${ctx.runId}`,
      amountNaira: 5000,
      paymentStatus: "success",
      checkedIn: true,
    });
    ctx.ticketId = ticket._id.toString();

    await invalidateCache(`analytics:event:${ctx.eventId}`);
    const creatorId = (jwt.decode(ctx.creatorToken!) as { sub: string }).sub;
    await invalidateCache(`analytics:creator:${creatorId}`);

    const overview = await request(app)
      .get("/api/v1/analytics/overview")
      .set("Authorization", `Bearer ${ctx.creatorToken}`);
    expect(overview.body.data.totalTicketsSold).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.totalCheckedIn).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.totalRevenueNaira).toBeGreaterThanOrEqual(5000);

    const perEvent = await request(app)
      .get(`/api/v1/analytics/events/${ctx.eventId}`)
      .set("Authorization", `Bearer ${ctx.creatorToken}`);
    expect(perEvent.body.data.ticketsSold).toBeGreaterThanOrEqual(1);
    expect(perEvent.body.data.checkedIn).toBeGreaterThanOrEqual(1);
  });
});
