const API_BASE_URL = "http://localhost/algimon-api/endpoints";
let appointments = [];
let currentTab = "Today";
const todayStr = new Date().toISOString().split("T")[0];

const colors = {
  Approved: "bg-blue-100 text-blue-800",
  "In Progress": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Canceled: "bg-red-100 text-red-800",
};

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
function getToken() {
  // Check both storages — token may be in either depending on "Remember Me"
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`,
  };
}

function handleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  window.location.href = "login.html";
}

// ─── GREETING ─────────────────────────────────────────────────────────────────
function setGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const el = document.getElementById("greetingText");
  if (el) el.innerText = greeting + " 👋";
}

// ─── PAGE TITLE ───────────────────────────────────────────────────────────────
function updatePageTitle(tab) {
  const dateStr = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric" });
  document.getElementById("pageTitle").innerText =
    tab === "Today" ? `Today's Appointments` : "All Appointments";
  document.getElementById("pageSubtitle").innerText =
    tab === "Today"
      ? `${dateStr} — Manage active deployments and service reports.`
      : "All scheduled appointments across all dates.";
}

// ─── LOAD USER INFO ───────────────────────────────────────────────────────────
async function loadUserInfo() {
  if (!getToken()) {
    handleUnauthorized();
    return Promise.reject();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/me.php`, { headers: authHeaders() });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return Promise.reject();
    }

    const user = await res.json();

    const nameEl  = document.getElementById("user-name");
    const emailEl = document.getElementById("user-email");
    const avatar  = document.getElementById("user-avatar");
    if (nameEl)  nameEl.innerText  = user.name  || "Staff";
    if (emailEl) emailEl.innerText = user.email || "";
    if (avatar)  avatar.innerText  = (user.name || "S").charAt(0).toUpperCase();

    // Restore availability status from DB
    if (user.availability && user.availability.status) {
      const statusColorMap = {
        Available: "bg-green-500",
        Busy:      "bg-yellow-500",
        Onsite:    "bg-blue-500",
      };
      const s = user.availability.status;
      const dot = document.getElementById("currentStatusDot");
      const txt = document.getElementById("currentStatusText");
      if (txt) txt.innerText = s;
      if (dot) dot.className = `w-2 h-2 rounded-full ${statusColorMap[s] || "bg-green-500"}`;
    }

  } catch {
    handleUnauthorized();
    return Promise.reject();
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const icons  = { success: "fa-circle-check", error: "fa-circle-xmark", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
  const styles = { success: "bg-green-600", error: "bg-red-600", warning: "bg-yellow-500", info: "bg-blue-600" };

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-16 right-4 z-[300] flex flex-col gap-2 items-end pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${styles[type]} translate-y-4 opacity-0 transition-all duration-300 max-w-xs pointer-events-auto`;
  toast.innerHTML = `<i class="fas ${icons[type]} shrink-0"></i><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove("translate-y-4", "opacity-0")));
  setTimeout(() => { toast.classList.add("translate-y-4", "opacity-0"); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function showTableSkeleton() {
  const tbody = document.getElementById("appointment-table-body");
  const row = `
    <tr class="border-b border-gray-100">
      <td class="px-4 md:px-6 py-4"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-gray-200 animate-pulse shrink-0"></div><div class="h-3.5 bg-gray-200 rounded animate-pulse w-32"></div></div></td>
      <td class="px-4 md:px-6 py-4 hidden sm:table-cell"><div class="h-3 bg-gray-200 rounded animate-pulse w-24"></div></td>
      <td class="px-4 md:px-6 py-4 hidden md:table-cell"><div class="h-5 bg-gray-200 rounded animate-pulse w-20"></div></td>
      <td class="px-4 md:px-6 py-4 text-right"><div class="h-6 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div></td>
    </tr>`;
  tbody.innerHTML = row.repeat(4);
}

// ─── BUTTON LOADING ───────────────────────────────────────────────────────────
function setButtonLoading(btn, loading, restoreLabel) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1.5"></i>Saving...`;
    btn.classList.add("opacity-75", "cursor-not-allowed");
  } else {
    btn.disabled = false;
    btn.innerHTML = restoreLabel || btn.dataset.originalHtml || btn.innerHTML;
    btn.classList.remove("opacity-75", "cursor-not-allowed");
  }
}

// ─── RIPPLE ───────────────────────────────────────────────────────────────────
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ─── ROW FLASH ────────────────────────────────────────────────────────────────
function flashRow(id) {
  const row = document.querySelector(`tr[onclick="toggleDetails(${id})"]`);
  if (row) {
    row.classList.add("flash-success");
    setTimeout(() => row.classList.remove("flash-success"), 1200);
  }
}

// ─── STAT COUNT-UP ────────────────────────────────────────────────────────────
function animateCount(el, target) {
  const start = parseInt(el.innerText) || 0;
  if (start === target) return;
  const duration = 400, steps = 20;
  const increment = (target - start) / steps;
  let current = start, step = 0;
  const timer = setInterval(() => {
    step++; current += increment;
    el.innerText = Math.round(current);
    if (step >= steps) { el.innerText = target; clearInterval(timer); }
  }, duration / steps);
}

// ─── BACK TO TOP ──────────────────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  const btn = document.getElementById("backToTop");
  if (btn) btn.classList.toggle("show", window.scrollY > 300);
});

// ─── CLOSE MODAL ──────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function setActiveNav(event, type) {
  event.preventDefault();
  currentTab = type;
  updatePageTitle(type);

  const navToday = document.getElementById("navToday");
  const navAll   = document.getElementById("navAll");
  const active   = ["bg-white/20", "shadow-inner", "font-semibold", "text-white"];
  const inactive = ["text-white/70"];

  if (type === "Today") {
    navToday.classList.add(...active);    navToday.classList.remove(...inactive);
    navAll.classList.remove(...active);   navAll.classList.add(...inactive);
  } else {
    navAll.classList.add(...active);      navAll.classList.remove(...inactive);
    navToday.classList.remove(...active); navToday.classList.add(...inactive);
  }

  if (window.innerWidth < 768) toggleSidebar();
  updateUI();
}

// ─── FETCH APPOINTMENTS ───────────────────────────────────────────────────────
async function fetchAppointments() {
  showTableSkeleton();
  try {
    const res = await fetch(`${API_BASE_URL}/get_appointments.php`, { headers: authHeaders() });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (res.ok) {
      appointments = await res.json();
    } else {
      throw new Error("Server error");
    }
  } catch {
    showToast("Could not load appointments from server.", "error");
    appointments = [];
  }
  updateUI();
}

// ─── UPDATE ON SERVER ─────────────────────────────────────────────────────────
async function updateAppointmentOnServer(id, data) {
  appointments = appointments.map((a) => (a.id === id ? { ...a, ...data } : a));
  updateUI();

  try {
    const res = await fetch(`${API_BASE_URL}/update_appointment.php`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ id, ...data }),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error("Server error");
  } catch {
    showToast("Could not sync with server. Changes may not be saved.", "warning");
  }
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
  const tbody  = document.getElementById("appointment-table-body");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const filter = document.getElementById("statusFilter").value;
  tbody.innerHTML = "";

  const tabFiltered = appointments.filter((a) => {
    if (a.status === "Pending") return false;
    return currentTab === "Today" ? a.date === todayStr : true;
  });

  updateStats(tabFiltered);

  const displayFiltered = tabFiltered.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search);
    const matchesStatus = filter === "Active"
      ? a.status === "Approved" || a.status === "In Progress"
      : filter === "All" || a.status === filter;
    return matchesSearch && matchesStatus;
  });

  if (displayFiltered.length === 0) {
    const messages = {
      Active:          { icon: "fa-briefcase",      title: "No active jobs right now",   sub: "All caught up! No approved or in-progress jobs." },
      Approved:        { icon: "fa-calendar-check",  title: "No approved appointments",   sub: "Nothing is waiting to be started." },
      "In Progress":   { icon: "fa-spinner",         title: "No jobs in progress",        sub: "No jobs are currently being worked on." },
      Completed:       { icon: "fa-circle-check",    title: "No completed jobs yet",      sub: "Completed jobs will appear here." },
      Canceled:        { icon: "fa-ban",             title: "No canceled appointments",   sub: "No appointments have been canceled." },
      All:             { icon: "fa-calendar-xmark",  title: "No appointments found",      sub: "Try adjusting your search or filter." },
    };
    const m = search
      ? { icon: "fa-magnifying-glass", title: `No results for "${search}"`, sub: "Try a different name." }
      : (messages[filter] || messages.All);
    tbody.innerHTML = `
      <tr><td colspan="4" class="px-6 py-16 text-center">
        <div class="flex flex-col items-center gap-2 text-gray-400">
          <i class="fas ${m.icon} text-3xl mb-1"></i>
          <p class="font-semibold text-sm text-gray-500">${m.title}</p>
          <p class="text-xs">${m.sub}</p>
        </div>
      </td></tr>`;
    return;
  }

  displayFiltered.forEach((appt, index) => {
    let actionBtns = "";
    if (appt.status === "Approved") {
      actionBtns = `<button id="btn-start-${appt.id}" onclick="event.stopPropagation(); changeStatus(${appt.id}, 'In Progress', this)" class="ripple-btn bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded hover:bg-purple-700 uppercase transition-all">Start Job</button>`;
    } else if (appt.status === "In Progress") {
      actionBtns = `<button onclick="event.stopPropagation(); openPaymentModal(${appt.id})" class="ripple-btn bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded hover:bg-green-700 uppercase transition-all">Mark Done</button>`;
    }

    tbody.innerHTML += `
      <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer row-animate" style="animation-delay:${index * 40}ms" onclick="toggleDetails(${appt.id})">
        <td class="px-4 md:px-6 py-4 font-bold text-gray-800">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform duration-200 shrink-0" id="chevron-${appt.id}"></i>
            <span class="truncate max-w-[140px] sm:max-w-none">${appt.name}</span>
          </div>
        </td>
        <td class="px-4 md:px-6 py-4 text-gray-500 hidden sm:table-cell">
          <span class="whitespace-nowrap text-sm">${appt.date}</span>
          <span class="appt-time-badge text-[10px] text-gray-300 ml-1">@ ${appt.time}</span>
        </td>
        <td class="px-4 md:px-6 py-4 hidden md:table-cell">
          <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${colors[appt.status]} whitespace-nowrap">${appt.status}</span>
        </td>
        <td class="px-4 md:px-6 py-4 text-right whitespace-nowrap">${actionBtns}</td>
      </tr>`;
  });

  document.querySelectorAll(".ripple-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => addRipple(btn, e));
  });
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats(pool) {
  const counts = {
    total:      pool.length,
    approved:   pool.filter((a) => a.status === "Approved").length,
    inprogress: pool.filter((a) => a.status === "In Progress").length,
    completed:  pool.filter((a) => a.status === "Completed").length,
    canceled:   pool.filter((a) => a.status === "Canceled").length,
  };
  Object.keys(counts).forEach((key) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (el) animateCount(el, counts[key]);
  });
}

// ─── STATUS MENU ──────────────────────────────────────────────────────────────
function toggleStatusMenu() {
  document.getElementById("statusMenu").classList.toggle("hidden");
}

async function setStatus(status, colorClass) {
  document.getElementById("currentStatusText").innerText = status;
  document.getElementById("currentStatusDot").className = `w-2 h-2 rounded-full ${colorClass}`;
  document.getElementById("statusMenu").classList.add("hidden");
  showToast(`Status set to ${status}`, "info");

  try {
    await fetch(`${API_BASE_URL}/update_availability.php`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
  } catch {
    // Silently fail — UI already updated
  }
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
async function changeStatus(id, newStatus, btn) {
  const appt = appointments.find((a) => a.id === id);
  if (btn) setButtonLoading(btn, true);
  await updateAppointmentOnServer(id, { status: newStatus });
  flashRow(id);
  showToast(`Job started for ${appt.name}`, "success");
}

function openPaymentModal(id) {
  const appt = appointments.find((a) => a.id === id);
  document.getElementById("paymentApptId").value = id;
  document.getElementById("receiptNumber").value = "";
  document.getElementById("actualAmount").value = "";
  document.getElementById("paymentCollected").checked = false;
  document.getElementById("priceEstimateDisplay").innerText = appt.price_estimate || "Not set";
  document.getElementById("paymentModal").classList.remove("hidden");
}

async function submitCompletion() {
  const id           = parseInt(document.getElementById("paymentApptId").value);
  const collected    = document.getElementById("paymentCollected").checked;
  const actualAmount = document.getElementById("actualAmount").value.trim();
  const receipt      = document.getElementById("receiptNumber").value.trim();

  if (!collected)                                     { showToast("Please confirm payment collection first.", "warning"); return; }
  if (!actualAmount || parseFloat(actualAmount) <= 0) { showToast("Please enter the actual amount collected.", "warning"); return; }
  if (!receipt)                                       { showToast("Receipt number is required for completion.", "warning"); return; }

  const appt            = appointments.find((a) => a.id === id);
  const formattedAmount = `₱${parseFloat(actualAmount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const confirmBtn      = document.querySelector("#paymentModal button[onclick=\"submitCompletion()\"]");

  if (confirmBtn) setButtonLoading(confirmBtn, true);
  await updateAppointmentOnServer(id, { status: "Completed", receipt_no: receipt, actual_amount: actualAmount });
  closeModal("paymentModal");
  if (confirmBtn) setButtonLoading(confirmBtn, false, "Confirm & Finish");

  document.getElementById("summaryCustomer").innerText = appt.name;
  document.getElementById("summaryEstimate").innerText = appt.price_estimate || "—";
  document.getElementById("summaryAmount").innerText   = formattedAmount;
  document.getElementById("summaryReceipt").innerText  = receipt;
  document.getElementById("completionSummaryModal").classList.remove("hidden");
  showToast(`Service completed for ${appt.name}!`, "success");
}

function openCancel(id) {
  document.getElementById("cancelId").value = id;
  document.getElementById("cancelReason").value = "";
  document.getElementById("cancelModal").classList.remove("hidden");
}

async function confirmCancel() {
  const id     = parseInt(document.getElementById("cancelId").value);
  const reason = document.getElementById("cancelReason").value.trim();
  if (!reason) { showToast("Please provide a reason for cancellation.", "warning"); return; }

  const appt = appointments.find((a) => a.id === id);
  const btn  = document.querySelector("#cancelModal button[onclick=\"confirmCancel()\"]");
  if (btn) setButtonLoading(btn, true);

  await updateAppointmentOnServer(id, { status: "Canceled", cancel_reason: reason });
  closeModal("cancelModal");
  if (btn) setButtonLoading(btn, false, "Confirm Cancel");
  showToast(`Appointment for ${appt.name} canceled.`, "info");
}

function openReschedule(id) {
  const appt = appointments.find((a) => a.id === id);
  document.getElementById("rescheduleId").value   = id;
  document.getElementById("rescheduleDate").value = appt.date;
  if (appt.time) {
    const [timePart, meridiem] = appt.time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    document.getElementById("rescheduleTime").value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  } else {
    document.getElementById("rescheduleTime").value = "";
  }
  document.getElementById("rescheduleModal").classList.remove("hidden");
}

async function confirmReschedule() {
  const id   = parseInt(document.getElementById("rescheduleId").value);
  const date = document.getElementById("rescheduleDate").value;
  const time = document.getElementById("rescheduleTime").value;
  if (!date || !time) { showToast("Please fill in both date and time.", "warning"); return; }

  const appt = appointments.find((a) => a.id === id);
  const btn  = document.querySelector("#rescheduleModal button[onclick=\"confirmReschedule()\"]");
  if (btn) setButtonLoading(btn, true);

  const [hours, mins] = time.split(":");
  const displayTime   = `${hours % 12 || 12}:${mins} ${hours >= 12 ? "PM" : "AM"}`;
  await updateAppointmentOnServer(id, { date, time: displayTime });
  closeModal("rescheduleModal");
  if (btn) setButtonLoading(btn, false, "Confirm");
  showToast(`Rescheduled for ${appt.name}.`, "success");
}

// ─── DETAILS ROW ──────────────────────────────────────────────────────────────
function toggleDetails(id) {
  const detailRowId = `details-${id}`;
  const existingRow = document.getElementById(detailRowId);
  const chevron     = document.getElementById(`chevron-${id}`);

  if (existingRow && !existingRow.classList.contains("hidden")) {
    existingRow.classList.add("hidden");
    chevron.classList.remove("rotate-90");
    return;
  }

  document.querySelectorAll('[id^="details-"]').forEach((r) => r.classList.add("hidden"));
  document.querySelectorAll('[id^="chevron-"]').forEach((i) => i.classList.remove("rotate-90"));

  const appt    = appointments.find((a) => a.id === id);
  const mainRow = chevron.closest("tr");
  let detailTr  = document.getElementById(detailRowId);

  if (!detailTr) {
    detailTr = document.createElement("tr");
    detailTr.id = detailRowId;
    detailTr.className = "bg-gray-50 border-b border-gray-100";
    mainRow.after(detailTr);
  }

  detailTr.classList.remove("hidden");
  chevron.classList.add("rotate-90");

  detailTr.querySelector("td")?.classList.remove("detail-animate");
  void detailTr.offsetWidth;
  setTimeout(() => detailTr.querySelector("td")?.classList.add("detail-animate"), 0);

  const isActive      = appt.status === "Approved" || appt.status === "In Progress";
  const rescheduleBtn = isActive
    ? `<button onclick="event.stopPropagation(); openReschedule(${appt.id})" class="ripple-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap transition-colors">
         <i class="fa-regular fa-calendar shrink-0"></i><span>Reschedule</span>
       </button>` : "";

  let paymentInfo = "";
  if (appt.status === "Completed" && appt.actual_amount) {
    const fmt = `₱${parseFloat(appt.actual_amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    paymentInfo = `
      <div class="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div class="flex justify-between text-xs"><span class="text-gray-400 font-bold uppercase">Estimate</span><span class="text-gray-400 line-through">${appt.price_estimate || "—"}</span></div>
        <div class="flex justify-between text-xs"><span class="text-gray-500 font-bold uppercase">Collected</span><span class="text-green-700 font-bold text-sm">${fmt}</span></div>
        ${appt.receipt_no ? `<div class="flex justify-between text-xs"><span class="text-gray-400 font-bold uppercase">OR #</span><span class="text-gray-600">${appt.receipt_no}</span></div>` : ""}
      </div>`;
  }

  detailTr.innerHTML = `
    <td colspan="4" class="px-4 md:px-10 py-6 md:py-10 detail-animate">
      <div class="flex flex-col lg:flex-row gap-6 lg:gap-12">
        <div class="flex-1 space-y-6 min-w-0">
          <div>
            <h3 class="text-xl font-bold text-gray-900">${appt.name}</h3>
            <p class="text-sm font-semibold text-red-700 mt-1 uppercase tracking-tight">${appt.service}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-regular fa-calendar text-gray-400 mt-1 w-5 shrink-0"></i><span>${appt.date}</span></div>
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-regular fa-clock text-gray-400 mt-1 w-5 shrink-0"></i><span>${appt.time}</span></div>
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-solid fa-phone text-gray-400 mt-1 w-5 shrink-0"></i><span>${appt.phone}</span></div>
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-regular fa-envelope text-gray-400 mt-1 w-5 shrink-0"></i><span class="break-all">${appt.email}</span></div>
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-solid fa-location-dot text-gray-400 mt-1 w-5 shrink-0"></i><span>${appt.address}</span></div>
            <div class="flex items-start gap-3 text-sm text-gray-600 min-w-0"><i class="fa-solid fa-file-lines text-gray-400 mt-1 w-5 shrink-0"></i><span>${appt.category || "Residential"}</span></div>
          </div>
          ${rescheduleBtn ? `<div class="pt-2">${rescheduleBtn}</div>` : ""}
        </div>
        <div class="w-full lg:w-72 shrink-0">
          <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p class="text-[10px] uppercase text-gray-400 font-bold mb-1 tracking-widest">Pricing (Estimate)</p>
            <p class="text-3xl font-bold text-gray-900 mb-4">${appt.price_estimate || "—"}</p>
            ${paymentInfo}
          </div>
        </div>
      </div>
    </td>`;

  detailTr.querySelectorAll(".ripple-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => addRipple(btn, e));
  });
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const isHidden = sidebar.classList.contains("-translate-x-full");
  if (isHidden) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("sidebar-open");
    overlay.classList.remove("hidden");
    setTimeout(() => sidebar.classList.remove("sidebar-open"), 350);
  } else {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
const logoutBtn   = document.getElementById("logoutButton");
const logoutModal = document.getElementById("logoutModal");
const cancelBtn   = document.getElementById("cancelLogoutBtn");
const confirmBtn  = document.getElementById("confirmLogoutBtn");

if (logoutBtn)   logoutBtn.addEventListener("click", () => { logoutModal.classList.add("show"); document.body.style.overflow = "hidden"; });
if (logoutModal) logoutModal.addEventListener("click", (e) => { if (e.target === logoutModal) { logoutModal.classList.remove("show"); document.body.style.overflow = ""; } });
if (cancelBtn)   cancelBtn.addEventListener("click", () => { logoutModal.classList.remove("show"); document.body.style.overflow = ""; });
if (confirmBtn)  confirmBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  window.location.href = "login.html";
});

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
document.getElementById("mobileMenuBtn").onclick  = toggleSidebar;
document.getElementById("sidebarOverlay").onclick = toggleSidebar;
document.getElementById("searchInput").oninput    = updateUI;
document.getElementById("statusFilter").onchange  = updateUI;

// ─── INIT ─────────────────────────────────────────────────────────────────────
setGreeting();
updatePageTitle("Today");
loadUserInfo().then(() => {
  fetchAppointments();
});

// ─── PASSWORD MODAL ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const trigger  = document.getElementById("accountTrigger");
  const modal    = document.getElementById("passwordModal");
  const closeX   = document.getElementById("closePassX");
  const closeBtn = document.getElementById("closePassBtn");
  const form     = document.getElementById("changePasswordForm");

  const closePasswordModal = () => modal.classList.remove("show");

  if (trigger)  trigger.addEventListener("click", () => modal.classList.add("show"));
  if (closeX)   closeX.addEventListener("click", closePasswordModal);
  if (closeBtn) closeBtn.addEventListener("click", closePasswordModal);
  window.addEventListener("click", (e) => { if (e.target === modal) closePasswordModal(); });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById("currentPass").value;
      const newP        = document.getElementById("newPass").value;
      const confP       = document.getElementById("confirmPass").value;
      const err         = document.getElementById("passwordError");

      if (newP !== confP) { err.classList.remove("hidden"); return; }
      err.classList.add("hidden");

      try {
        const res = await fetch(`${API_BASE_URL}/change_password.php`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ current_password: currentPass, new_password: newP }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("Password updated successfully!", "success");
          closePasswordModal();
          form.reset();
        } else {
          showToast(data.error || "Failed to update password.", "error");
        }
      } catch {
        showToast("Could not connect to server.", "error");
      }
    });
  }
});