import { eventful } from "../src/app";
import { connectDB, disconnectDB } from "../src/config/db";
import { redis } from "../src/config/redis";
import { User } from "../src/models/User";
import { Event } from "../src/models/Event";
import { Ticket } from "../src/models/Ticket";
import { invalidateCache, invalidateCachePattern } from "../src/utils/cache";

export const app = eventful();

export interface LiveTestContext {
  runId: number;
  creatorEmail: string;
  eventeeEmail: string;
  creatorToken?: string;
  eventeeToken?: string;
  eventId?: string;
  ticketId?: string;
  ticketReference?: string;
}

export function createLiveTestContext(): LiveTestContext {
  const runId = Date.now();

  return {
    runId,
    creatorEmail: `live-creator-${runId}@eventful-test.dev`,
    eventeeEmail: `live-eventee-${runId}@eventful-test.dev`,
  };
}

export async function setupLiveTest() {
  await connectDB();
}

export async function cleanupLiveTest(ctx: LiveTestContext) {
  if (ctx.ticketId) {
    await Ticket.findByIdAndDelete(ctx.ticketId);
  }

  if (ctx.eventId) {
    await Event.findByIdAndDelete(ctx.eventId);
  }

  await User.deleteMany({
    email: {
      $in: [ctx.creatorEmail, ctx.eventeeEmail],
    },
  });

  if (ctx.eventId) {
    await invalidateCache(`analytics:event:${ctx.eventId}`);
    await invalidateCache(`events:id:${ctx.eventId}`);
  }

  await invalidateCachePattern("events:list:*");

  await disconnectDB();
  redis.disconnect();
}
