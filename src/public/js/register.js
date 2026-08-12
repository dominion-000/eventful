const form = document.getElementById("register-form");
const messageEl = document.getElementById("message");

if (getCurrentUser()) window.location.href = "/";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  const { ok, body } = await apiFetch("/auth/register", {
    method: "POST",
    body: { name, email, password, role },
  });

  if (!ok) {
    showMessage(messageEl, body?.message || "Registration failed");
    return;
  }

  setToken(body.data.accessToken);
  window.location.href = role === "creator" ? "/dashboard" : "/";
});
