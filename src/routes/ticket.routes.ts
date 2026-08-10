import { Router } from 'express';
import {
  purchaseTicket,
  myTickets,
  eventTickets,
  myTicketQrCode,
  scanTicket,
} from '../controllers/ticket.controller';
import { validate } from '../middlewares/validate';
import { purchaseTicketSchema, scanTicketSchema } from '../validators/ticket.validator';
import { paginationQuerySchema } from '../validators/common.validator';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', protect, restrictTo('eventee'), validate(purchaseTicketSchema), purchaseTicket);
router.get('/mine', protect, restrictTo('eventee'), validate(paginationQuerySchema), myTickets);
router.get('/mine/:id/qr', protect, restrictTo('eventee'), myTicketQrCode);

router.get('/event/:eventId', protect, restrictTo('creator'), validate(paginationQuerySchema), eventTickets);
router.post('/scan', protect, restrictTo('creator'), validate(scanTicketSchema), scanTicket);

export default router;
