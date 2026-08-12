import crypto from "crypto";
import { Event } from "../models/Event";
import { Ticket, ITicket } from "../models/Ticket";
import { User } from "../models/User";
import { Notification } from "../models/Notification";
import { AppError } from "../utils/AppError";
import { initializeTransaction, verifyTransaction } from "./paystack.service";
import { generateQrToken, verifyQrToken } from "./qr.service";
import { emitToUser, emitToEvent } from "../socket";
import { invalidateAnalyticsCache } from "./analytics.service";

async function countSoldTickets(eventId: string): Promise<number> {
  return Ticket.countDocuments({ event: eventId, paymentStatus: "success" });
}

export async function purchaseTicket(
  eventeeId: string,
  eventId: string,
  callbackBase: string,
) {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound("Event not found");
  if (event.status !== "published")
    throw AppError.badRequest("This event is not open for ticket sales");
  if (event.startDate.getTime() <= Date.now())
    throw AppError.badRequest("This event has already started");

  const existing = await Ticket.findOne({
    event: eventId,
    eventee: eventeeId,
    paymentStatus: { $in: ["pending", "success"] },
  });

  if (existing?.paymentStatus === "success") {
    throw AppError.conflict("You already have a ticket for this event");
  }

  const sold = await countSoldTickets(eventId);
  if (sold >= event.capacity) {
    throw AppError.badRequest("This event is sold out");
  }

  const eventee = await User.findById(eventeeId);
  if (!eventee) throw AppError.notFound("User not found");

  // reuse an existing pending ticket's reference so retrying a failed
  // checkout doesn't spawn duplicate pending rows for the same person+event
  const reference = existing
    ? existing.paystackReference
    : `evt_${crypto.randomUUID()}`;

  const ticket =
    existing ??
    (await Ticket.create({
      event: event._id,
      eventee: eventee._id,
      paystackReference: reference,
      amountNaira: event.ticketPriceNaira,
    }));

  const paystack = await initializeTransaction({
    email: eventee.email,
    amountNaira: event.ticketPriceNaira,
    reference,
    callbackUrl: `${callbackBase}/my-tickets?ticketId=${ticket._id.toString()}`,
    metadata: {
      eventId: event._id.toString(),
      eventeeId: eventee._id.toString(),
    },
  });

  return { ticket, authorizationUrl: paystack.authorizationUrl };
}

/**
 * Confirms a ticket's payment against Paystack's verify endpoint - never
 * trust a client redirect or webhook payload on its own, this is the one
 * place that actually flips a ticket to 'success'. Called from both the
 * webhook handler and the manual /verify endpoint below, so both paths
 * share the exact same rules (idempotent, capacity re-checked, amount checked).
 */
async function confirmTicketPayment(ticket: ITicket): Promise<ITicket> {
  if (ticket.paymentStatus === "success") return ticket;

  const verification = await verifyTransaction(ticket.paystackReference);

  if (
    verification.status !== "success" ||
    verification.amountNaira !== ticket.amountNaira
  ) {
    if (
      verification.status === "failed" ||
      verification.status === "abandoned"
    ) {
      ticket.paymentStatus = "failed";
      await ticket.save();
    }
    // 'pending' stays pending - caller can check again later
    return ticket;
  }

  const sold = await countSoldTickets(ticket.event.toString());
  const event = await Event.findById(ticket.event);

  if (!event || sold >= event.capacity) {
    // paid but the event filled up in the race between initialize and confirm -
    // flagging as failed here; in production this needs a Paystack refund call
    ticket.paymentStatus = "failed";
    await ticket.save();
    console.error(
      `Oversold event ${ticket.event.toString()} - ticket ${ticket._id.toString()} needs a refund`,
    );
    return ticket;
  }

  ticket.paymentStatus = "success";
  ticket.qrToken = generateQrToken(ticket._id.toString());
  await ticket.save();

  const message = `Your ticket for "${event.title}" is confirmed.`;
  await Notification.create({
    recipient: ticket.eventee,
    event: event._id,
    type: "ticket_confirmed",
    message,
  });
  emitToUser(ticket.eventee.toString(), "notification:new", {
    type: "ticket_confirmed",
    eventId: event._id.toString(),
    message,
  });
  emitToEvent(event._id.toString(), "event:seats-update", {
    eventId: event._id.toString(),
    sold: sold + 1,
    capacity: event.capacity,
  });
  await invalidateAnalyticsCache(
    event._id.toString(),
    event.creator.toString(),
  );

  return ticket;
}

/**
 * Webhook path - the reliable, no-user-interaction-required source of truth.
 * Fires even if the eventee closes their browser right after paying.
 */
export async function confirmPaymentFromWebhook(
  reference: string,
): Promise<void> {
  const ticket = await Ticket.findOne({ paystackReference: reference });
  if (!ticket) {
    console.warn(`Webhook for unknown reference: ${reference}`);
    return;
  }
  await confirmTicketPayment(ticket);
}

/**
 * Manual polling path - Paystack's own recommended alternative to webhooks
 * (see their docs: "make a request for an update, popularly known as
 * polling"). Useful for local dev without a public webhook URL, or as a
 * same-request confirmation right after the eventee returns from checkout.
 */
export async function verifyMyTicketPayment(
  eventeeId: string,
  ticketId: string,
): Promise<ITicket> {
  const ticket = await Ticket.findOne({ _id: ticketId, eventee: eventeeId });
  if (!ticket) throw AppError.notFound("Ticket not found");
  return confirmTicketPayment(ticket);
}

export async function listMyTickets(
  eventeeId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ticket.find({ eventee: eventeeId })
      .populate("event", "title startDate venue category status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments({ eventee: eventeeId }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getMyTicketById(eventeeId: string, ticketId: string) {
  const ticket = await Ticket.findOne({ _id: ticketId, eventee: eventeeId });
  if (!ticket) throw AppError.notFound("Ticket not found");
  return ticket;
}

export async function setMyTicketReminders(
  eventeeId: string,
  ticketId: string,
  offsetsMinutes: number[],
): Promise<ITicket> {
  const ticket = await getMyTicketById(eventeeId, ticketId);
  // resets remindersSent for any offset no longer requested so re-adding it later
  // won't be silently skipped as "already sent"
  ticket.remindersSent = ticket.remindersSent.filter((m) =>
    offsetsMinutes.includes(m),
  );
  ticket.reminderOffsetsMinutes = offsetsMinutes;
  await ticket.save();
  return ticket;
}

async function getOwnedEventOrThrow(eventId: string, creatorId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound("Event not found");
  if (event.creator.toString() !== creatorId)
    throw AppError.forbidden("You do not own this event");
  return event;
}

export async function listEventTickets(
  eventId: string,
  creatorId: string,
  page: number,
  limit: number,
) {
  await getOwnedEventOrThrow(eventId, creatorId);

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ticket.find({ event: eventId })
      .populate("eventee", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments({ event: eventId }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function scanTicket(
  creatorId: string,
  qrToken: string,
): Promise<ITicket> {
  const { valid, ticketId } = verifyQrToken(qrToken);
  if (!valid || !ticketId) throw AppError.badRequest("Invalid QR code");

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw AppError.notFound("Ticket not found");

  const event = await getOwnedEventOrThrow(ticket.event.toString(), creatorId);

  if (ticket.paymentStatus !== "success") {
    throw AppError.badRequest("This ticket was never paid for");
  }
  if (ticket.checkedIn) {
    throw AppError.conflict("This ticket has already been checked in");
  }

  ticket.checkedIn = true;
  ticket.checkedInAt = new Date();
  await ticket.save();

  const checkedInCount = await Ticket.countDocuments({
    event: event._id,
    checkedIn: true,
  });
  const message = `A ticket for "${event.title}" was just scanned.`;

  await Notification.create({
    recipient: creatorId,
    event: event._id,
    type: "ticket_scanned",
    message,
  });
  emitToUser(creatorId, "ticket:scanned", {
    eventId: event._id.toString(),
    ticketId: ticket._id.toString(),
    checkedInCount,
  });
  await invalidateAnalyticsCache(event._id.toString(), creatorId);

  return ticket;
}
