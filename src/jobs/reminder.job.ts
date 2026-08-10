import cron, { ScheduledTask } from "node-cron";
import { Ticket } from "../models/Ticket";
import { IEvent } from "../models/Event";
import { Notification } from "../models/Notification";
import { emitToUser } from "../socket";

const CHECK_WINDOW_MS = 60 * 1000; // this job runs once a minute

let task: ScheduledTask | null = null;

async function dispatchDueReminders(): Promise<void> {
  const now = Date.now();

  // only paid, not-yet-started tickets can have a reminder still owed
  const tickets = await Ticket.find({
    paymentStatus: "success",
  }).populate<{ event: IEvent }>("event");

  for (const ticket of tickets) {
    const event = ticket.event;
    if (!event || event.startDate.getTime() <= now) continue;

    const offsets = ticket.reminderOffsetsMinutes.length
      ? ticket.reminderOffsetsMinutes
      : event.reminderOffsetsMinutes;

    let changed = false;

    for (const offsetMinutes of offsets) {
      if (ticket.remindersSent.includes(offsetMinutes)) continue;

      const dueAt = event.startDate.getTime() - offsetMinutes * 60 * 1000;
      const isDue = dueAt <= now && dueAt > now - CHECK_WINDOW_MS;
      if (!isDue) continue;

      const message = `Reminder: "${event.title}" starts in ${formatOffset(offsetMinutes)}.`;

      await Notification.create({
        recipient: ticket.eventee,
        event: event._id,
        type: "reminder",
        message,
      });

      emitToUser(ticket.eventee.toString(), "notification:new", {
        type: "reminder",
        eventId: event._id.toString(),
        message,
      });

      ticket.remindersSent.push(offsetMinutes);
      changed = true;
    }

    if (changed) await ticket.save();
  }
}

function formatOffset(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} day(s)`;
  if (minutes % 60 === 0) return `${minutes / 60} hour(s)`;
  return `${minutes} minute(s)`;
}

export function startReminderJob(): void {
  if (task) return;
  task = cron.schedule("* * * * *", () => {
    dispatchDueReminders().catch((err) =>
      console.error("Reminder job failed:", err),
    );
  });
  console.log("Reminder job scheduled (every minute)");
}

export function stopReminderJob(): void {
  task?.stop();
  task = null;
}

// exported for testing
export { dispatchDueReminders };
