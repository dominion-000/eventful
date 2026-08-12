const grid = document.getElementById("events-grid");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");

function categoryLabel(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function renderEvents(events) {
  grid.innerHTML = "";
  emptyState.classList.toggle("hidden", events.length > 0);

  for (const ev of events) {
    const card = document.createElement("a");
    card.href = `/events/${ev._id}`;
    card.className = "card event-card";
    card.innerHTML = `
      <span class="category">${categoryLabel(ev.category)}</span>
      <h3>${ev.title}</h3>
      <div class="meta">${formatDate(ev.startDate)}</div>
      <div class="meta">${ev.venue}</div>
      <div class="price">${ev.ticketPriceNaira > 0 ? formatNaira(ev.ticketPriceNaira) : "Free"}</div>
    `;
    grid.appendChild(card);
  }
}

let debounceTimer;
async function loadEvents() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (categoryFilter.value) params.set("category", categoryFilter.value);

  const { ok, body } = await apiFetch(`/events?${params.toString()}`);
  if (ok) renderEvents(body.data.items);
}

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadEvents, 300);
});
categoryFilter.addEventListener("change", loadEvents);

loadEvents();
