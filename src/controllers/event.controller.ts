import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getParam } from "../utils/getParam";
import * as eventService from "../services/event.service";
import { ListEventsQuery } from "../validators/event.validator";

export const createEvent = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.createEvent(req.user!.id, req.body);
  res
    .status(201)
    .json({ success: true, message: "Event created", data: { event } });
});

export const getEvent = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(getParam(req, "id"));
  res.status(200).json({ success: true, data: { event } });
});

export const browseEvents = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as unknown as ListEventsQuery;
  const result = await eventService.listPublishedEvents(query);
  res.status(200).json({ success: true, data: result });
});

export const myEvents = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as unknown as {
    page: number;
    limit: number;
  };
  const result = await eventService.listMyEvents(
    req.user!.id,
    query.page ?? 1,
    query.limit ?? 10,
  );
  res.status(200).json({ success: true, data: result });
});

export const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.updateEvent(
    getParam(req, "id"),
    req.user!.id,
    req.body,
  );
  res
    .status(200)
    .json({ success: true, message: "Event updated", data: { event } });
});

export const cancelEvent = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.cancelEvent(
    getParam(req, "id"),
    req.user!.id,
  );
  res
    .status(200)
    .json({ success: true, message: "Event cancelled", data: { event } });
});

export const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  await eventService.deleteDraftEvent(getParam(req, "id"), req.user!.id);
  res.status(204).send();
});
