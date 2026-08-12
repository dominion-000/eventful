export const paymentPaths = {
  "/payments/webhook": {
    post: {
      tags: ["Payments"],
      summary: "Paystack webhook - not for direct use, called by Paystack when a transaction event fires",
      description:
        "HMAC-SHA512 signature-verified against the raw request body. Register this URL in the Paystack dashboard.",
      responses: { "200": { description: "Acknowledged" }, "401": { description: "Invalid signature" } },
    },
  },
};
