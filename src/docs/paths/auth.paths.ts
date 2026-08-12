export const authPaths = {
  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Create an account as a creator or eventee",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password", "role"],
              properties: {
                name: { type: "string", minLength: 2 },
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 8 },
                role: { type: "string", enum: ["creator", "eventee"] },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Account created" },
        "409": {
          description: "Email already registered",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        "422": { description: "Validation failed" },
      },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Log in and receive an access token (refresh token set as httpOnly cookie)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Logged in" },
        "401": { description: "Invalid credentials" },
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Rotate the refresh token (reads it from the httpOnly cookie) and get a new access token",
      responses: {
        "200": { description: "Token refreshed" },
        "401": { description: "Missing/invalid/reused refresh token" },
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Invalidate the current refresh token",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Logged out" } },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Get the current user's profile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Current user",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { data: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } },
              },
            },
          },
        },
        "401": { description: "Missing/invalid access token" },
      },
    },
  },
};
