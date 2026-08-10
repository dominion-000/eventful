import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { getParam } from '../utils/getParam';
import { AppError } from '../utils/AppError';
import * as ticketService from '../services/ticket.service';
import { generateQrImageDataUrl } from '../services/qr.service';
import { verifyWebhookSignature } from '../services/paystack.service';

export const purchaseTicket = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.body;
  const result = await ticketService.purchaseTicket(req.user!.id, eventId);
  res.status(201).json({
    success: true,
    message: 'Checkout initialized',
    data: {
      ticketId: result.ticket._id,
      paymentStatus: result.ticket.paymentStatus,
      authorizationUrl: result.authorizationUrl,
    },
  });
});

export const myTickets = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as unknown as { page: number; limit: number };
  const result = await ticketService.listMyTickets(req.user!.id, query.page ?? 1, query.limit ?? 10);
  res.status(200).json({ success: true, data: result });
});

export const eventTickets = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as unknown as { page: number; limit: number };
  const result = await ticketService.listEventTickets(
    getParam(req, 'eventId'),
    req.user!.id,
    query.page ?? 1,
    query.limit ?? 10
  );
  res.status(200).json({ success: true, data: result });
});

export const myTicketQrCode = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.getMyTicketById(req.user!.id, getParam(req, 'id'));

  if (!ticket.qrToken) throw AppError.badRequest('This ticket has not been paid for yet');

  const qrImage = await generateQrImageDataUrl(ticket.qrToken);
  res.status(200).json({ success: true, data: { qrImage } });
});

export const scanTicket = catchAsync(async (req: Request, res: Response) => {
  const { qrToken } = req.body;
  const ticket = await ticketService.scanTicket(req.user!.id, qrToken);
  res.status(200).json({
    success: true,
    message: 'Ticket checked in',
    data: { ticketId: ticket._id, checkedInAt: ticket.checkedInAt },
  });
});

// Paystack posts here on every transaction event. req.body is the raw Buffer
// here (see the route registration) because signature verification needs the
// exact bytes Paystack signed - a re-serialized JSON object won't match.
export const paystackWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const rawBody = req.body as Buffer;

  if (!verifyWebhookSignature(rawBody, signature)) {
    throw AppError.unauthorized('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody.toString('utf8'));

  if (payload.event === 'charge.success') {
    await ticketService.confirmPaymentFromWebhook(payload.data.reference);
  }

  // Paystack just needs a 200 to stop retrying - it doesn't care about the body
  res.status(200).json({ received: true });
});
