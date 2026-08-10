import { Router } from "express";
import {
  createEvent,
  getEvent,
  browseEvents,
  myEvents,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventShareLinks,
} from "../controllers/event.controller";
import { validate } from "../middlewares/validate";
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
} from "../validators/event.validator";
import { protect, restrictTo } from "../middlewares/auth.middleware";

const router = Router();

// Public browse - must come before /:id so "mine" isn't parsed as an id
router.get("/", validate(listEventsQuerySchema), browseEvents);
router.get(
  "/mine",
  protect,
  restrictTo("creator"),
  validate(listEventsQuerySchema),
  myEvents,
);

router.post(
  "/",
  protect,
  restrictTo("creator"),
  validate(createEventSchema),
  createEvent,
);

router.get("/:id", getEvent);
router.get("/:id/share", getEventShareLinks);
router.patch(
  "/:id",
  protect,
  restrictTo("creator"),
  validate(updateEventSchema),
  updateEvent,
);
router.post("/:id/cancel", protect, restrictTo("creator"), cancelEvent);
router.delete("/:id", protect, restrictTo("creator"), deleteEvent);

export default router;
