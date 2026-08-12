const user = requireAuth("creator");
const container = document.querySelector(".container");
const eventId = container.dataset.eventId;
const statsEl = document.getElementById("stats");
const listEl = document.getElementById("tickets-list");
const emptyState = document.getElementById("empty-state");
const messageEl = document.getElementById("message");

function statusBadge(status) {
  const labels = { success: "Paid", pending: "Pending", failed: "Failed" };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function renderStats(analytics) {
  const items = [
    { label: "Tickets Sold", value: analytics.ticketsSold },
    { label: "Capacity", value: analytics.capacity },
    { label: "Revenue", value: formatNaira(analytics.revenueNaira) },
    { label: "Checked In", value: analytics.checkedIn },
    {
      label: "Check-in Rate",
      value: `${Math.round(analytics.checkInRate * 100)}%`,
    },
  ];
  statsEl.innerHTML = items
    .map(
      (s) =>
        `<div class="card stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`,
    )
    .join("");
}

function renderTickets(tickets) {
  listEl.innerHTML = "";
  emptyState.classList.toggle("hidden", tickets.length > 0);

  for (const t of tickets) {
    const row = document.createElement("div");
    row.className = "card list-row";
    const buyer = t.eventee;
    row.innerHTML = `
      <div class="row-main">
        <strong>${buyer?.name || "Eventee"}</strong>
        <span class="meta">${buyer?.email || ""}</span>
        ${statusBadge(t.paymentStatus)}
        ${t.checkedIn ? '<span class="badge badge-success">Checked In</span>' : ""}
      </div>
      <div class="meta">${formatNaira(t.amountNaira)}</div>
    `;
    listEl.appendChild(row);
  }
}

async function loadAnalytics() {
  const { ok, body } = await apiFetch(`/analytics/events/${eventId}`);
  if (ok) {
    renderStats(body.data);
    document.getElementById("event-title").textContent = body.data.title;
  }
}

async function loadTickets() {
  const { ok, body } = await apiFetch(`/tickets/event/${eventId}?limit=100`);
  if (ok) renderTickets(body.data.items);
  else showMessage(messageEl, body?.message || "Could not load tickets");
}

function connectLiveScans() {
  const token = getToken();
  if (!token || typeof io === "undefined") return;

  const socket = io({ auth: { token } });
  socket.on("ticket:scanned", (payload) => {
    if (payload.eventId !== eventId) return;
    showMessage(
      messageEl,
      `A ticket was just checked in (${payload.checkedInCount} total so far).`,
      false,
    );
    loadAnalytics();
    loadTickets();
  });
}

async function init() {
  await Promise.all([loadAnalytics(), loadTickets()]);
  connectLiveScans();
}

init();
