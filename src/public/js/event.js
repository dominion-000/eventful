const contentEl = document.getElementById("event-content");
const eventId = contentEl.dataset.eventId;
const loadingEl = document.getElementById("loading");
const messageEl = document.getElementById("message");
const actionArea = document.getElementById("action-area");

function categoryLabel(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function renderActionArea(event) {
  const user = getCurrentUser();

  if (!user) {
    actionArea.innerHTML = `<a href="/login" class="btn">Log in to buy a ticket</a>`;
    return;
  }

  if (user.role === "creator") {
    if (user.id === event.creator) {
      actionArea.innerHTML = `
        <div class="row-actions">
          <a href="/dashboard/events/${event._id}/edit" class="btn btn-ghost">Edit</a>
          <a href="/dashboard/events/${event._id}/tickets" class="btn btn-ghost">View Tickets</a>
        </div>
      `;
    } else {
      actionArea.innerHTML = `<p class="subtitle">Creators attend as themselves, not as eventees.</p>`;
    }
    return;
  }

  if (event.status !== "published") {
    actionArea.innerHTML = `<p class="subtitle">This event isn't open for ticket sales.</p>`;
    return;
  }

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent =
    event.ticketPriceNaira > 0
      ? `Buy Ticket · ${formatNaira(event.ticketPriceNaira)}`
      : "Get Free Ticket";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Redirecting to payment…";
    const { ok, body } = await apiFetch("/tickets", {
      method: "POST",
      body: { eventId },
    });
    if (!ok) {
      showMessage(messageEl, body?.message || "Could not start checkout");
      btn.disabled = false;
      btn.textContent = "Try again";
      return;
    }
    window.location.href = body.data.authorizationUrl;
  });
  actionArea.appendChild(btn);
}

async function loadEvent() {
  const { ok, body } = await apiFetch(`/events/${eventId}`);
  if (!ok) {
    loadingEl.textContent = body?.message || "Event not found";
    return;
  }

  const event = body.data.event;
  document.getElementById("category").textContent = categoryLabel(
    event.category,
  );
  document.getElementById("title").textContent = event.title;
  document.getElementById("meta").textContent =
    `${formatDate(event.startDate)} · ${event.venue}`;
  document.getElementById("description").textContent = event.description;

  renderActionArea(event);

  const shareRes = await apiFetch(`/events/${eventId}/share`);
  if (shareRes.ok) {
    const links = shareRes.body.data.platforms;
    const shareContainer = document.getElementById("share-links");
    for (const [platform, url] of Object.entries(links)) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      shareContainer.appendChild(a);
    }
  }

  loadingEl.classList.add("hidden");
  contentEl.classList.remove("hidden");
}

loadEvent();
