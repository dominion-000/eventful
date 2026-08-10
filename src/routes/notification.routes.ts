import { Router } from "express";
import {
  myNotifications,
  markRead,
} from "../controllers/notification.controller";
import { validate } from "../middlewares/validate";
import { paginationQuerySchema } from "../validators/common.validator";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// both creators and eventees get notifications, so no role restriction here
router.get("/mine", protect, validate(paginationQuerySchema), myNotifications);
router.patch("/:id/read", protect, markRead);

export default router;
