import crypto from "crypto";
import request from "supertest";
import { Ticket } from "../../src/models/Ticket";

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

  const eventee = await request(app).post("/api/v1/auth/register").send({
    name: "Live Test Eventee",
    email: ctx.eventeeEmail,
    password: "password123",
    role: "eventee",
  });

  ctx.eventeeToken = eventee.body.data.accessToken;

  const event = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${ctx.creatorToken}`)
    .send({
      title: `Live Ticket Test Event ${ctx.runId}`,
      description: "Created for ticket integration tests.",
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

describe("Tickets integration", () => {
  it("initializes a Paystack transaction and persists a pending ticket", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${ctx.eventeeToken}`)
      .send({
        eventId: ctx.eventId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.authorizationUrl).toContain("paystack.com");
    expect(res.body.data.paymentStatus).toBe("pending");

    ctx.ticketId = res.body.data.ticketId;

    const ticketInDb = await Ticket.findById(ctx.ticketId);

    expect(ticketInDb).not.toBeNull();
    expect(ticketInDb!.paymentStatus).toBe("pending");

    ctx.ticketReference = ticketInDb!.paystackReference;
  });

  it("accepts a genuinely signed Paystack webhook", async () => {
    const payload = JSON.stringify({
      event: "charge.success",
      data: {
        reference: ctx.ticketReference,
      },
    });

    const signature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(payload)
      .digest("hex");

    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(payload);

    expect(res.status).toBe(200);

    const ticketAfter = await Ticket.findById(ctx.ticketId);

    expect(ticketAfter!.paymentStatus).not.toBe("success");
  });

  it("shows the ticket in the creator's event ticket list", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/event/${ctx.eventId}`)
      .set("Authorization", `Bearer ${ctx.creatorToken}`);

    expect(res.status).toBe(200);

    const found = res.body.data.items.find(
      (ticket: { _id: string }) => ticket._id === ctx.ticketId,
    );

    expect(found).toBeTruthy();
  });
});
