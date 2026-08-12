const user = requireAuth("creator");
const formCard = document.querySelector(".form-card");
const eventId = formCard.dataset.eventId || null;
const form = document.getElementById("event-form");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submit-btn");

const fields = {
  title: document.getElementById("event-title"),
  description: document.getElementById("description"),
  category: document.getElementById("category"),
  venue: document.getElementById("venue"),
  startDate: document.getElementById("start-date"),
  capacity: document.getElementById("capacity"),
  price: document.getElementById("price"),
  status: document.getElementById("status"),
  reminders: document.getElementById("reminders"),
};

function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadExisting() {
  if (!eventId) return;
  const { ok, body } = await apiFetch(`/events/${eventId}`);
  if (!ok) {
    showMessage(messageEl, body?.message || "Could not load event");
    return;
  }
  const ev = body.data.event;
  fields.title.value = ev.title;
  fields.description.value = ev.description;
  fields.category.value = ev.category;
  fields.venue.value = ev.venue;
  fields.startDate.value = toDatetimeLocalValue(ev.startDate);
  fields.capacity.value = ev.capacity;
  fields.price.value = ev.ticketPriceNaira;
  fields.status.value = ev.status === "cancelled" ? "draft" : ev.status;
  fields.reminders.value = ev.reminderOffsetsMinutes.join(", ");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  const reminderOffsetsMinutes = fields.reminders.value
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  const payload = {
    title: fields.title.value,
    description: fields.description.value,
    category: fields.category.value,
    venue: fields.venue.value,
    startDate: new Date(fields.startDate.value).toISOString(),
    capacity: parseInt(fields.capacity.value, 10),
    ticketPriceNaira: parseFloat(fields.price.value) || 0,
    status: fields.status.value,
    reminderOffsetsMinutes: reminderOffsetsMinutes.length
      ? reminderOffsetsMinutes
      : [1440],
  };

  const { ok, body } = eventId
    ? await apiFetch(`/events/${eventId}`, { method: "PATCH", body: payload })
    : await apiFetch("/events", { method: "POST", body: payload });

  if (!ok) {
    showMessage(messageEl, body?.message || "Could not save event");
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Event";
    return;
  }

  const savedId = eventId || body.data.event._id;
  window.location.href = `/events/${savedId}`;
});

loadExisting();
