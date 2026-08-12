const form = document.getElementById("login-form");
const messageEl = document.getElementById("message");

if (getCurrentUser()) window.location.href = "/";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { ok, body } = await apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (!ok) {
    showMessage(messageEl, body?.message || "Login failed");
    return;
  }

  setToken(body.data.accessToken);
  const user = getCurrentUser();
  window.location.href = user?.role === "creator" ? "/dashboard" : "/";
});
