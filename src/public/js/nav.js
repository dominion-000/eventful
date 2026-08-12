(function () {
  const user = getCurrentUser();
  const nav = document.getElementById("nav-links");
  if (!nav) return;

  if (!user) {
    nav.innerHTML = `
      <a href="/">Browse</a>
      <a href="/login">Log In</a>
      <a href="/register" class="btn-small">Sign Up</a>
    `;
    return;
  }

  if (user.role === "creator") {
    nav.innerHTML = `
      <a href="/">Browse</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/scan">Scan</a>
      <button id="logout-btn" class="btn-small btn-ghost">Log Out</button>
    `;
  } else {
    nav.innerHTML = `
      <a href="/">Browse</a>
      <a href="/my-tickets">My Tickets</a>
      <button id="logout-btn" class="btn-small btn-ghost">Log Out</button>
    `;
  }

  document.getElementById("logout-btn")?.addEventListener("click", logout);
})();
