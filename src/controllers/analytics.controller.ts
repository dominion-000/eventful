import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getParam } from "../utils/getParam";
import * as analyticsService from "../services/analytics.service";

export const creatorOverview = catchAsync(
  async (req: Request, res: Response) => {
    const data = await analyticsService.getCreatorOverview(req.user!.id);
    res.status(200).json({ success: true, data });
  },
);

export const eventAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const data = await analyticsService.getEventAnalytics(
      getParam(req, "id"),
      req.user!.id,
    );
    res.status(200).json({ success: true, data });
  },
);
