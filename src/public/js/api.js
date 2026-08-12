const API_BASE = "/api/v1";
const TOKEN_KEY = "eventful_access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  return { id: payload.sub, role: payload.role };
}

function logout() {
  setToken(null);
  window.location.href = "/login";
}

function requireAuth(role) {
  const user = getCurrentUser();
  if (!user || (role && user.role !== role)) {
    window.location.href = "/login";
    return null;
  }
  return user;
}

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const body = await res.json();
  const token = body?.data?.accessToken;
  setToken(token);
  return token;
}

async function apiFetch(path, options = {}) {
  const doFetch = (token) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res = await doFetch(getToken());

  if (res.status === 401 && getToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      setToken(null);
    }
  }

  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

function showMessage(el, message, isError = true) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  el.classList.toggle("message-error", isError);
  el.classList.toggle("message-success", !isError);
}

function formatNaira(amount) {
  return `\u20a6${Number(amount).toLocaleString("en-NG")}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
