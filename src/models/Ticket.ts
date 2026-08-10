import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface ITicket extends Document {
  _id: Types.ObjectId;
  event: Types.ObjectId;
  eventee: Types.ObjectId;
  paystackReference: string;
  amountNaira: number;
  paymentStatus: PaymentStatus;
  qrToken: string | null;
  checkedIn: boolean;
  checkedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    eventee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // unique paystack transaction reference we generate at initialize time -
    // this is how the webhook finds the right ticket
    paystackReference: {
      type: String,
      required: true,
      unique: true,
    },
    amountNaira: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    // set once payment succeeds - a signed token, not just the ticket id,
    // so a scanner can't be tricked by guessing/incrementing ids
    qrToken: {
      type: String,
      default: null,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ticketSchema.index({ event: 1, paymentStatus: 1 });
ticketSchema.index({ eventee: 1, createdAt: -1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);
