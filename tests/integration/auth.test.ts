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
}, 45000);

afterAll(async () => {
  await cleanupLiveTest(ctx);
}, 45000);

describe("Auth integration", () => {
  it("registers a creator", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Live Test Creator",
      email: ctx.creatorEmail,
      password: "password123",
      role: "creator",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("registers an eventee", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Live Test Eventee",
      email: ctx.eventeeEmail,
      password: "password123",
      role: "eventee",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("logs a registered creator back in", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Live Test Creator",
      email: ctx.creatorEmail,
      password: "password123",
      role: "creator",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: ctx.creatorEmail,
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });
});
