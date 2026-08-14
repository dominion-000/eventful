import mongoose from "mongoose";
import { Event } from "../models/Event";
import { Ticket } from "../models/Ticket";
import { AppError } from "../utils/AppError";
import { cached, invalidateCache } from "../utils/cache";

const ANALYTICS_TTL = 60; // 1 minute

function overviewCacheKey(creatorId: string) {
  return `analytics:creator:${creatorId}`;
}

function eventCacheKey(eventId: string) {
  return `analytics:event:${eventId}`;
}

export async function invalidateAnalyticsCache(
  eventId: string,
  creatorId: string,
): Promise<void> {
  await Promise.all([
    invalidateCache(eventCacheKey(eventId)),
    invalidateCache(overviewCacheKey(creatorId)),
  ]);
}

interface AggregateResult {
  totalTicketsSold: number;
  totalRevenueNaira: number;
  totalCheckedIn: number;
}

async function aggregateTickets(eventIds: string[]): Promise<AggregateResult> {
  if (eventIds.length === 0) {
    return { totalTicketsSold: 0, totalRevenueNaira: 0, totalCheckedIn: 0 };
  }

  // .aggregate() bypasses Mongoose's normal query casting (unlike .find()),
  // so a plain string here would never match Ticket.event, which is stored
  // as a real ObjectId - $in needs actual ObjectId instances or it silently
  // matches nothing, which is exactly why this showed 0 tickets sold/checked
  // in even with real successful tickets sitting in the collection.
  const objectIds = eventIds.map((id) => new mongoose.Types.ObjectId(id));

  const [result] = await Ticket.aggregate([
    { $match: { event: { $in: objectIds }, paymentStatus: "success" } },
    {
      $group: {
        _id: null,
        totalTicketsSold: { $sum: 1 },
        totalRevenueNaira: { $sum: "$amountNaira" },
        totalCheckedIn: { $sum: { $cond: ["$checkedIn", 1, 0] } },
      },
    },
  ]);

  return result
    ? {
        totalTicketsSold: result.totalTicketsSold,
        totalRevenueNaira: result.totalRevenueNaira,
        totalCheckedIn: result.totalCheckedIn,
      }
    : { totalTicketsSold: 0, totalRevenueNaira: 0, totalCheckedIn: 0 };
}

export async function getCreatorOverview(creatorId: string) {
  return cached(
    overviewCacheKey(creatorId),
    async () => {
      const events = await Event.find({ creator: creatorId })
        .select("_id")
        .lean();
      const eventIds = events.map((e) => e._id.toString());
      const totals = await aggregateTickets(eventIds);

      return {
        totalEvents: events.length,
        ...totals,
        checkInRate:
          totals.totalTicketsSold > 0
            ? totals.totalCheckedIn / totals.totalTicketsSold
            : 0,
      };
    },
    ANALYTICS_TTL,
  );
}

export async function getEventAnalytics(eventId: string, creatorId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound("Event not found");
  if (event.creator.toString() !== creatorId)
    throw AppError.forbidden("You do not own this event");

  return cached(
    eventCacheKey(eventId),
    async () => {
      const totals = await aggregateTickets([eventId]);

      return {
        eventId,
        title: event.title,
        capacity: event.capacity,
        ticketsSold: totals.totalTicketsSold,
        revenueNaira: totals.totalRevenueNaira,
        checkedIn: totals.totalCheckedIn,
        capacityUtilization:
          event.capacity > 0 ? totals.totalTicketsSold / event.capacity : 0,
        checkInRate:
          totals.totalTicketsSold > 0
            ? totals.totalCheckedIn / totals.totalTicketsSold
            : 0,
      };
    },
    ANALYTICS_TTL,
  );
}
