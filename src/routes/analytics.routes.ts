import { Router } from "express";
import {
  creatorOverview,
  eventAnalytics,
} from "../controllers/analytics.controller";
import { protect, restrictTo } from "../middlewares/auth.middleware";

const router = Router();

router.get("/overview", protect, restrictTo("creator"), creatorOverview);
router.get("/events/:id", protect, restrictTo("creator"), eventAnalytics);

export default router;
