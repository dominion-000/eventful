import { Schema, model, Document, Types } from "mongoose";

export type EventCategory =
  | "concert"
  | "theater"
  | "sports"
  | "cultural"
  | "other";
export type EventStatus = "draft" | "published" | "cancelled";

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  startDate: Date;
  endDate?: Date;
  capacity: number;
  ticketPriceNaira: number;
  reminderOffsetsMinutes: number[];
  status: EventStatus;
  creator: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ["concert", "theater", "sports", "cultural", "other"],
      required: [true, "Category is required"],
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    ticketPriceNaira: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Ticket price cannot be negative"],
      default: 0,
    },
    reminderOffsetsMinutes: {
      type: [Number],
      default: [1440], // 1 day before, by default
    },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

eventSchema.pre("validate", function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "endDate cannot be before startDate");
  }
  next();
});

eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ creator: 1, createdAt: -1 });
eventSchema.index({ title: "text", description: "text" });

export const Event = model<IEvent>("Event", eventSchema);
