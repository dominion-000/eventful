import crypto from 'crypto';
import { Event } from '../models/Event';
import { Ticket, ITicket } from '../models/Ticket';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { initializeTransaction, verifyTransaction } from './paystack.service';
import { generateQrToken, verifyQrToken } from './qr.service';

async function countSoldTickets(eventId: string): Promise<number> {
  return Ticket.countDocuments({ event: eventId, paymentStatus: 'success' });
}

export async function purchaseTicket(eventeeId: string, eventId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound('Event not found');
  if (event.status !== 'published') throw AppError.badRequest('This event is not open for ticket sales');
  if (event.startDate.getTime() <= Date.now()) throw AppError.badRequest('This event has already started');

  const existing = await Ticket.findOne({
    event: eventId,
    eventee: eventeeId,
    paymentStatus: { $in: ['pending', 'success'] },
  });

  if (existing?.paymentStatus === 'success') {
    throw AppError.conflict('You already have a ticket for this event');
  }

  const sold = await countSoldTickets(eventId);
  if (sold >= event.capacity) {
    throw AppError.badRequest('This event is sold out');
  }

  const eventee = await User.findById(eventeeId);
  if (!eventee) throw AppError.notFound('User not found');

  // reuse an existing pending ticket's reference so retrying a failed
  // checkout doesn't spawn duplicate pending rows for the same person+event
  const reference = existing ? existing.paystackReference : `evt_${crypto.randomUUID()}`;

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
    metadata: { eventId: event._id.toString(), eventeeId: eventee._id.toString() },
  });

  return { ticket, authorizationUrl: paystack.authorizationUrl };
}

/**
 * Source of truth for payment confirmation. Never trust the client-side
 * redirect after checkout - only this webhook (signature-verified, then
 * re-confirmed against Paystack's own verify endpoint) marks a ticket paid.
 */
export async function confirmPaymentFromWebhook(reference: string): Promise<void> {
  const ticket = await Ticket.findOne({ paystackReference: reference });
  if (!ticket) {
    console.warn(`Webhook for unknown reference: ${reference}`);
    return;
  }

  // webhooks can and do fire more than once for the same event - stay idempotent
  if (ticket.paymentStatus === 'success') return;

  const verification = await verifyTransaction(reference);

  if (verification.status !== 'success' || verification.amountNaira !== ticket.amountNaira) {
    ticket.paymentStatus = 'failed';
    await ticket.save();
    return;
  }

  const sold = await countSoldTickets(ticket.event.toString());
  const event = await Event.findById(ticket.event);

  if (!event || sold >= event.capacity) {
    // paid but the event filled up in the race between initialize and confirm -
    // flagging as failed here; in production this needs a Paystack refund call
    ticket.paymentStatus = 'failed';
    await ticket.save();
    console.error(`Oversold event ${ticket.event.toString()} - ticket ${ticket._id.toString()} needs a refund`);
    return;
  }

  ticket.paymentStatus = 'success';
  ticket.qrToken = generateQrToken(ticket._id.toString());
  await ticket.save();
}

export async function listMyTickets(eventeeId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ticket.find({ eventee: eventeeId })
      .populate('event', 'title startDate venue category status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments({ eventee: eventeeId }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getMyTicketById(eventeeId: string, ticketId: string) {
  const ticket = await Ticket.findOne({ _id: ticketId, eventee: eventeeId });
  if (!ticket) throw AppError.notFound('Ticket not found');
  return ticket;
}

async function getOwnedEventOrThrow(eventId: string, creatorId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw AppError.notFound('Event not found');
  if (event.creator.toString() !== creatorId) throw AppError.forbidden('You do not own this event');
  return event;
}

export async function listEventTickets(eventId: string, creatorId: string, page: number, limit: number) {
  await getOwnedEventOrThrow(eventId, creatorId);

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ticket.find({ event: eventId })
      .populate('eventee', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments({ event: eventId }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function scanTicket(creatorId: string, qrToken: string): Promise<ITicket> {
  const { valid, ticketId } = verifyQrToken(qrToken);
  if (!valid || !ticketId) throw AppError.badRequest('Invalid QR code');

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw AppError.notFound('Ticket not found');

  await getOwnedEventOrThrow(ticket.event.toString(), creatorId);

  if (ticket.paymentStatus !== 'success') {
    throw AppError.badRequest('This ticket was never paid for');
  }
  if (ticket.checkedIn) {
    throw AppError.conflict('This ticket has already been checked in');
  }

  ticket.checkedIn = true;
  ticket.checkedInAt = new Date();
  await ticket.save();
  return ticket;
}
