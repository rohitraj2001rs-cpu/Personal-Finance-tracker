const API_BASE = "http://localhost:5000/api";

const $ = id => document.getElementById(id);
let mode = "login";
let token = localStorage.getItem("financeflow_token");

function money(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API_BASE + path, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function showDashboard(user) {
  $("authView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("userName").textContent = user.name;
  loadDashboard();
}

async function loadDashboard() {
  try {
    const [summary, rows] = await Promise.all([
      api("/dashboard"),
      api("/transactions?limit=100" + ($("typeFilter").value ? `&type=${$("typeFilter").value}` : ""))
    ]);

    $("balance").textContent = money(summary.balance);
    $("income").textContent = money(summary.income);
    $("expense").textContent = money(summary.expense);
    $("count").textContent = summary.transactionCount;

    $("transactions").innerHTML = rows.length ? rows.map(row => `
      <div class="tx">
        <div>
          <div class="tx-title">${escapeHtml(row.description || row.category)}</div>
          <small class="muted">${escapeHtml(row.category)} · ${new Date(row.date).toLocaleDateString("en-IN")}</small>
        </div>
        <strong class="${row.type}">${row.type === "income" ? "+" : "-"}${money(row.amount)}</strong>
      </div>
    `).join("") : `<div class="empty">No transactions yet.</div>`;

    const entries = Object.entries(summary.categories).sort((a,b) => b[1]-a[1]);
    const max = entries[0]?.[1] || 1;
    $("categories").innerHTML = entries.length ? entries.map(([name, amount]) => `
      <div class="category">
        <div class="cat-row"><span>${escapeHtml(name)}</span><strong>${money(amount)}</strong></div>
        <div class="bar"><i style="width:${Math.max(4, amount/max*100)}%"></i></div>
      </div>
    `).join("") : `<div class="empty">Expense categories will appear here.</div>`;
  } catch (error) {
    if (error.message.includes("Authentication")) logout();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

$("loginTab").onclick = () => {
  mode = "login";
  $("loginTab").classList.add("active");
  $("registerTab").classList.remove("active");
  document.querySelectorAll(".register-only").forEach(x => x.classList.add("hidden"));
};

$("registerTab").onclick = () => {
  mode = "register";
  $("registerTab").classList.add("active");
  $("loginTab").classList.remove("active");
  document.querySelectorAll(".register-only").forEach(x => x.classList.remove("hidden"));
};

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("authMessage").textContent = "Please wait...";
  try {
    const body = {
      name: $("name").value,
      email: $("email").value,
      password: $("password").value
    };
    const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
    token = data.token;
    localStorage.setItem("financeflow_token", token);
    showDashboard(data.user);
  } catch (error) {
    $("authMessage").textContent = error.message;
  }
});

$("openFormBtn").onclick = () => {
  $("txDate").value = new Date().toISOString().slice(0,10);
  $("transactionDialog").showModal();
};

$("closeDialog").onclick = () => $("transactionDialog").close();

$("transactionForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await api("/transactions", {
      method: "POST",
      body: JSON.stringify({
        type: $("txType").value,
        amount: $("txAmount").value,
        category: $("txCategory").value,
        description: $("txDescription").value,
        date: $("txDate").value
      })
    });
    $("transactionForm").reset();
    $("transactionDialog").close();
    loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

$("typeFilter").onchange = loadDashboard;
$("logoutBtn").onclick = logout;

function logout() {
  token = null;
  localStorage.removeItem("financeflow_token");
  $("dashboardView").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("authView").classList.remove("hidden");
}

(async function init() {
  document.querySelectorAll(".register-only").forEach(x => x.classList.add("hidden"));
  if (!token) return;
  try {
    const data = await api("/me");
    showDashboard(data.user);
  } catch {
    logout();
  }
})();
