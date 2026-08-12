const user = requireAuth("creator");
const tokenInput = document.getElementById("manual-token");
const scanBtn = document.getElementById("scan-btn");
const messageEl = document.getElementById("message");
const logEl = document.getElementById("log");

let logStarted = false;

function appendLog(text) {
  if (!logStarted) {
    logEl.textContent = "";
    logEl.classList.remove("empty-state");
    logStarted = true;
  }
  const line = document.createElement("div");
  line.className = "list-row";
  line.textContent = `${new Date().toLocaleTimeString()} — ${text}`;
  logEl.prepend(line);
}

async function checkIn() {
  const qrToken = tokenInput.value.trim();
  if (!qrToken) return;

  scanBtn.disabled = true;
  const { ok, body } = await apiFetch("/tickets/scan", {
    method: "POST",
    body: { qrToken },
  });

  if (ok) {
    showMessage(messageEl, "Checked in successfully.", false);
    appendLog(`Ticket ${body.data.ticketId} checked in`);
  } else {
    showMessage(messageEl, body?.message || "Check-in failed");
  }

  tokenInput.value = "";
  tokenInput.focus();
  scanBtn.disabled = false;
}

scanBtn.addEventListener("click", checkIn);
tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkIn();
});

function connectLiveFeed() {
  const token = getToken();
  if (!token || typeof io === "undefined") return;

  const socket = io({ auth: { token } });
  socket.on("ticket:scanned", (payload) => {
    appendLog(
      `Ticket scanned on event ${payload.eventId} (${payload.checkedInCount} checked in so far)`,
    );
  });
}

connectLiveFeed();
