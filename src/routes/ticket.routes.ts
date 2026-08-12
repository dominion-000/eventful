import { Router } from "express";
import {
  purchaseTicket,
  myTickets,
  eventTickets,
  myTicketQrCode,
  verifyMyTicket,
  setMyTicketReminders,
  scanTicket,
} from "../controllers/ticket.controller";
import { validate } from "../middlewares/validate";
import {
  purchaseTicketSchema,
  scanTicketSchema,
  setReminderSchema,
} from "../validators/ticket.validator";
import { paginationQuerySchema } from "../validators/common.validator";
import { protect, restrictTo } from "../middlewares/auth.middleware";
import { paymentLimiter } from "../middlewares/rateLimiter";

const router = Router();

router.post(
  "/",
  protect,
  restrictTo("eventee"),
  paymentLimiter,
  validate(purchaseTicketSchema),
  purchaseTicket,
);
router.get(
  "/mine",
  protect,
  restrictTo("eventee"),
  validate(paginationQuerySchema),
  myTickets,
);
router.get("/mine/:id/qr", protect, restrictTo("eventee"), myTicketQrCode);
router.post(
  "/mine/:id/verify",
  protect,
  restrictTo("eventee"),
  paymentLimiter,
  verifyMyTicket,
);
router.patch(
  "/mine/:id/reminders",
  protect,
  restrictTo("eventee"),
  validate(setReminderSchema),
  setMyTicketReminders,
);

router.get(
  "/event/:eventId",
  protect,
  restrictTo("creator"),
  validate(paginationQuerySchema),
  eventTickets,
);
router.post(
  "/scan",
  protect,
  restrictTo("creator"),
  validate(scanTicketSchema),
  scanTicket,
);

export default router;
