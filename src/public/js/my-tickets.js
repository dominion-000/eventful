const user = requireAuth("eventee");
const listEl = document.getElementById("tickets-list");
const emptyState = document.getElementById("empty-state");
const messageEl = document.getElementById("message");
const modal = document.getElementById("qr-modal");
const qrImage = document.getElementById("qr-image");

document.getElementById("close-modal").addEventListener("click", () => {
  modal.classList.add("hidden");
});

function statusBadge(status) {
  const labels = { success: "Paid", pending: "Pending", failed: "Failed" };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function renderTickets(tickets) {
  listEl.innerHTML = "";
  emptyState.classList.toggle("hidden", tickets.length > 0);

  for (const t of tickets) {
    const row = document.createElement("div");
    row.className = "card list-row";
    const ev = t.event;
    row.innerHTML = `
      <div class="row-main">
        <strong>${ev?.title || "Event"}</strong>
        <span class="meta">${ev ? formatDate(ev.startDate) + " · " + ev.venue : ""}</span>
        ${statusBadge(t.paymentStatus)}
        ${t.checkedIn ? '<span class="badge badge-success">Checked In</span>' : ""}
      </div>
      <div class="row-actions"></div>
    `;

    const actions = row.querySelector(".row-actions");

    if (t.paymentStatus === "success") {
      const qrBtn = document.createElement("button");
      qrBtn.className = "btn btn-small";
      qrBtn.textContent = "View QR";
      qrBtn.addEventListener("click", () => showQr(t._id));
      actions.appendChild(qrBtn);
    } else if (t.paymentStatus === "pending") {
      const verifyBtn = document.createElement("button");
      verifyBtn.className = "btn btn-small btn-ghost";
      verifyBtn.textContent = "Check Payment Status";
      verifyBtn.addEventListener("click", () => verifyTicket(t._id, verifyBtn));
      actions.appendChild(verifyBtn);
    }

    listEl.appendChild(row);
  }
}

async function showQr(ticketId) {
  const { ok, body } = await apiFetch(`/tickets/mine/${ticketId}/qr`);
  if (!ok) {
    showMessage(messageEl, body?.message || "Could not load QR code");
    return;
  }
  qrImage.src = body.data.qrImage;
  modal.classList.remove("hidden");
}

async function verifyTicket(ticketId, btn) {
  btn.disabled = true;
  btn.textContent = "Checking…";
  const { ok, body } = await apiFetch(`/tickets/mine/${ticketId}/verify`, {
    method: "POST",
  });
  if (ok && body.data.paymentStatus === "success") {
    showMessage(messageEl, "Payment confirmed!", false);
  } else if (ok) {
    showMessage(messageEl, `Payment status: ${body.data.paymentStatus}`);
  } else {
    showMessage(messageEl, body?.message || "Could not verify payment");
  }
  await loadTickets();
}

async function loadTickets() {
  const { ok, body } = await apiFetch("/tickets/mine?limit=50");
  if (ok) renderTickets(body.data.items);
}

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get("ticketId");
  if (!ticketId) return;

  showMessage(messageEl, "Confirming your payment…", false);
  const { ok, body } = await apiFetch(`/tickets/mine/${ticketId}/verify`, {
    method: "POST",
  });

  if (ok && body.data.paymentStatus === "success") {
    showMessage(messageEl, "Payment confirmed - your ticket is ready!", false);
  } else if (ok && body.data.paymentStatus === "pending") {
    showMessage(
      messageEl,
      'Still confirming with Paystack - if this doesn\'t update in a minute, use "Check Payment Status" below.',
      false,
    );
  } else {
    showMessage(messageEl, body?.message || "Payment could not be confirmed");
  }

  window.history.replaceState({}, "", "/my-tickets");
}

function connectLiveNotifications() {
  const token = getToken();
  if (!token || typeof io === "undefined") return;

  const socket = io({ auth: { token } });
  socket.on("notification:new", (payload) => {
    showMessage(messageEl, payload.message, false);
    loadTickets();
  });
}

(async function init() {
  await handlePaymentReturn();
  await loadTickets();
  connectLiveNotifications();
})();
