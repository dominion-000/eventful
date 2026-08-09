import mongoose from 'mongoose';
import { Event, IEvent } from '../models/Event';
import { AppError } from '../utils/AppError';
import { cached, invalidateCache, invalidateCachePattern } from '../utils/cache';
import { CreateEventInput, UpdateEventInput, ListEventsQuery } from '../validators/event.validator';

const EVENT_CACHE_TTL = 300; // 5 minutes
const LIST_CACHE_PREFIX = 'events:list:';

function eventCacheKey(id: string) {
  return `events:id:${id}`;
}

async function invalidateEventCaches(eventId: string) {
  await invalidateCache(eventCacheKey(eventId));
  await invalidateCachePattern(`${LIST_CACHE_PREFIX}*`);
}

export async function createEvent(creatorId: string, input: CreateEventInput): Promise<IEvent> {
  const event = await Event.create({ ...input, creator: creatorId });
  await invalidateCachePattern(`${LIST_CACHE_PREFIX}*`);
  return event;
}

export async function getEventById(eventId: string): Promise<IEvent> {
  return cached<IEvent>(eventCacheKey(eventId), async () => {
    const found = await Event.findById(eventId).lean<IEvent>();
    if (!found) throw AppError.notFound('Event not found');
    return found;
  });
}

export async function listPublishedEvents(query: ListEventsQuery) {
  const cacheKey = `${LIST_CACHE_PREFIX}${JSON.stringify(query)}`;

  return cached(cacheKey, async () => {
    const filter: mongoose.FilterQuery<IEvent> = { status: 'published' };

    if (query.category) filter.category = query.category;
    if (query.search) filter.$text = { $search: query.search };
    if (query.from || query.to) {
      filter.startDate = {};
      if (query.from) filter.startDate.$gte = query.from;
      if (query.to) filter.startDate.$lte = query.to;
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      Event.find(filter).sort({ startDate: 1 }).skip(skip).limit(query.limit).lean(),
      Event.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }, EVENT_CACHE_TTL);
}

export async function listMyEvents(creatorId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Event.find({ creator: creatorId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Event.countDocuments({ creator: creatorId }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getOwnedEventOrThrow(eventId: string, creatorId: string): Promise<IEvent> {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound('Event not found');
  if (event.creator.toString() !== creatorId) {
    throw AppError.forbidden('You do not own this event');
  }
  return event;
}

export async function updateEvent(
  eventId: string,
  creatorId: string,
  input: UpdateEventInput
): Promise<IEvent> {
  const event = await getOwnedEventOrThrow(eventId, creatorId);

  if (event.status === 'cancelled') {
    throw AppError.badRequest('Cannot edit a cancelled event');
  }

  Object.assign(event, input);
  await event.save();
  await invalidateEventCaches(eventId);
  return event;
}

export async function cancelEvent(eventId: string, creatorId: string): Promise<IEvent> {
  const event = await getOwnedEventOrThrow(eventId, creatorId);

  if (event.status === 'cancelled') {
    throw AppError.badRequest('Event is already cancelled');
  }

  event.status = 'cancelled';
  await event.save();
  await invalidateEventCaches(eventId);
  return event;
}

export async function deleteDraftEvent(eventId: string, creatorId: string): Promise<void> {
  const event = await getOwnedEventOrThrow(eventId, creatorId);

  if (event.status !== 'draft') {
    throw AppError.badRequest(
      'Only draft events can be permanently deleted - cancel published events instead'
    );
  }

  await event.deleteOne();
  await invalidateEventCaches(eventId);
}
