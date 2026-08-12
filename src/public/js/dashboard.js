const user = requireAuth("creator");
const statsEl = document.getElementById("stats");
const listEl = document.getElementById("events-list");
const emptyState = document.getElementById("empty-state");
const messageEl = document.getElementById("message");

function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function renderStats(overview) {
  const items = [
    { label: "Events", value: overview.totalEvents },
    { label: "Tickets Sold", value: overview.totalTicketsSold },
    { label: "Revenue", value: formatNaira(overview.totalRevenueNaira) },
    { label: "Checked In", value: overview.totalCheckedIn },
    {
      label: "Check-in Rate",
      value: `${Math.round(overview.checkInRate * 100)}%`,
    },
  ];
  statsEl.innerHTML = items
    .map(
      (s) =>
        `<div class="card stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`,
    )
    .join("");
}

function renderEvents(events) {
  listEl.innerHTML = "";
  emptyState.classList.toggle("hidden", events.length > 0);

  for (const ev of events) {
    const row = document.createElement("div");
    row.className = "card list-row";
    row.innerHTML = `
      <div class="row-main">
        <strong>${ev.title}</strong>
        <span class="meta">${formatDate(ev.startDate)} · ${ev.venue}</span>
        ${statusBadge(ev.status)}
      </div>
      <div class="row-actions">
        <a href="/events/${ev._id}" class="btn btn-small btn-ghost">View</a>
        <a href="/dashboard/events/${ev._id}/edit" class="btn btn-small btn-ghost">Edit</a>
        <a href="/dashboard/events/${ev._id}/tickets" class="btn btn-small">Tickets</a>
      </div>
    `;
    listEl.appendChild(row);
  }
}

async function load() {
  const [overviewRes, eventsRes] = await Promise.all([
    apiFetch("/analytics/overview"),
    apiFetch("/events/mine?limit=50"),
  ]);

  if (overviewRes.ok) renderStats(overviewRes.body.data);
  if (eventsRes.ok) renderEvents(eventsRes.body.data.items);
  else
    showMessage(
      messageEl,
      eventsRes.body?.message || "Could not load your events",
    );
}

load();
