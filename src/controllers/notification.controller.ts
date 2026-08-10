import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getParam } from "../utils/getParam";
import * as notificationService from "../services/notification.service";

export const myNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.validatedQuery as unknown as {
      page: number;
      limit: number;
    };
    const result = await notificationService.listMyNotifications(
      req.user!.id,
      query.page ?? 1,
      query.limit ?? 20,
    );
    res.status(200).json({ success: true, data: result });
  },
);

export const markRead = catchAsync(async (req: Request, res: Response) => {
  const notification = await notificationService.markNotificationRead(
    req.user!.id,
    getParam(req, "id"),
  );
  res.status(200).json({ success: true, data: { notification } });
});
