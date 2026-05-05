const API_BASE_URL = "http://localhost/algimon-api";
let appointments = [];
let currentTab = "Today";
const todayStr = new Date().toISOString().split("T")[0];

// ── STAFF AUTH GUARD ───────────────────────────────────────────────────────
(function staffAuthGuard() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { window.location.replace('login.html'); return; }
  try {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    if (user.type === 'client') { window.location.replace('dashboard.html'); }
  } catch (e) { window.location.replace('login.html'); }
})();

// ── TOKEN HELPER ────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

// ── STATUS MAPPING HELPERS ────────────────────────────────────────────────
// Maps DB status (lowercase/underscore) → display format used by the UI
function dbStatusToDisplay(s) {
  const map = {
    pending: 'Pending',
    approved: 'Approved',
    confirmed: 'Approved',    // DB stores 'confirmed', display as Approved
    'in-progress': 'In Progress',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Canceled',
    canceled: 'Canceled',
  };
  return map[(s || '').toLowerCase()] || 'Approved';
}

// Maps UI display status back to DB format for API calls
function displayStatusToDb(s) {
  const map = {
    'Approved': 'approved',
    'In Progress': 'in_progress',
    'Completed': 'completed',
    'Canceled': 'cancelled',
  };
  return map[s] || (s || '').toLowerCase();
}

// Normalise one inquiry row from the API → the shape shared.js UI expects
function normaliseInquiry(i) {
  return {
    id: parseInt(i.id || i._id),
    name: i.clientName || i.client_name || 'Unknown',
    service: i.serviceType || i.service_type || '—',
    date: i.requestedDate || i.appointment_date || '',
    time: i.requestedTime || i.appointment_time || '',
    phone: i.phone || i.client_phone || '',
    email: i.clientEmail || i.client_email || '',
    address: i.address || '',
    category: i.propertyType || i.property_type || 'Residential',
    status: dbStatusToDisplay(i.status),
    price_estimate: i.price_estimate
      ? '₱' + parseFloat(i.price_estimate).toLocaleString('en-PH')
      : '',
    actual_amount: i.actual_amount || null,
    receipt_no: i.receipt_no || null,
    cancel_reason: i.cancel_reason || '',
  };
}

const colors = {
  Approved: "bg-blue-100 text-blue-800",
  "In Progress": "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Canceled: "bg-red-100 text-red-800",
};

// ─── GREETING ─────────────────────────────────────────────────────────────────
function setGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const el = document.getElementById("greetingText");
  if (el) el.innerText = greeting + " 👋";
}

// ─── PAGE TITLE WITH DATE ─────────────────────────────────────────────────────
function updatePageTitle(tab) {
  const dateStr = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric" });
  document.getElementById("pageTitle").innerText =
    tab === "Today" ? `Today's Appointments` : "All Appointments";
  document.getElementById("pageSubtitle").innerText =
    tab === "Today"
      ? `${dateStr} — Manage active deployments and service reports.`
      : "All scheduled appointments across all dates.";
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
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
  const duration = 400;
  const steps = 20;
  const increment = (target - start) / steps;
  let current = start;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    current += increment;
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
  const navAll = document.getElementById("navAll");
  const active = ["bg-white/20", "shadow-inner", "font-semibold", "text-white"];
  const inactive = ["text-white/70"];

  if (type === "Today") {
    navToday.classList.add(...active); navToday.classList.remove(...inactive);
    navAll.classList.remove(...active); navAll.classList.add(...inactive);
  } else {
    navAll.classList.add(...active); navAll.classList.remove(...inactive);
    navToday.classList.remove(...active); navToday.classList.add(...inactive);
  }

  if (window.innerWidth < 768) toggleSidebar();
  updateUI();
}

// ── FETCH (Bug #1 fix) ─ calls GET /inquiries with auth token ───────────────────────────
async function fetchAppointments() {
  showTableSkeleton();
  try {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API error');
    appointments = (json.data || []).map(normaliseInquiry);
  } catch (err) {
    console.warn('[Algimon Staff] Could not fetch inquiries:', err.message);
    // Fallback demo data (Philippine-sounding names) — replace once API is live
    appointments = [
      { id: 1, name: "Maria Santos", service: "Fire Safety Inspection", date: todayStr, time: "09:00 AM", phone: "09171234567", email: "maria@example.com", address: "123 Rizal St, Quezon City", category: "Commercial", status: "Approved", price_estimate: "₱5,000" },
      { id: 2, name: "Jose Reyes", service: "Fire Extinguisher Check", date: todayStr, time: "11:00 AM", phone: "09281234567", email: "jose@example.com", address: "456 Mabini Ave, Makati", category: "Industrial", status: "In Progress", price_estimate: "₱1,500" },
      { id: 3, name: "Ana Dela Cruz", service: "CCTV Surveillance", date: todayStr, time: "01:30 PM", phone: "09391234567", email: "ana@example.com", address: "789 Luna Rd, Pasig", category: "Residential", status: "Approved", price_estimate: "₱23,000" },
      { id: 4, name: "Pedro Villanueva", service: "FDAS Design & Install", date: todayStr, time: "03:00 PM", phone: "09501234567", email: "pedro@example.com", address: "101 Bonifacio Blvd, BGC", category: "Commercial", status: "Completed", price_estimate: "₱150,000", actual_amount: "148000", receipt_no: "OR-20240501" },
    ];
  }
  updateUI();
}

// ─── UPDATE ON SERVER ─────────────────────────────────────────────────────────
async function updateAppointmentOnServer(id, data) {
  // Optimistically update local state first
  appointments = appointments.map((a) => (a.id === id ? { ...a, ...data } : a));
  updateUI();

  // Map display-status back to DB format
  const payload = {};
  if (data.status)        payload.status        = displayStatusToDb(data.status);
  if (data.actual_amount) payload.actual_amount  = data.actual_amount;
  if (data.receipt_no)    payload.receipt_no     = data.receipt_no;
  if (data.cancel_reason) payload.cancel_reason  = data.cancel_reason;
  if (data.date)          payload.appointment_date = data.date;
  if (data.time)          payload.appointment_time = data.time;

  try {
    const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API error');
  } catch (err) {
    console.warn('[Algimon Staff] Sync failed:', err.message);
    showToast('Could not sync with server. Changes may not be saved.', 'warning');
  }
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function updateUI() {
  const tbody = document.getElementById("appointment-table-body");
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
    // Smart empty state based on filter
    const messages = {
      Active: { icon: "fa-briefcase", title: "No active jobs right now", sub: "All caught up! No approved or in-progress jobs." },
      Approved: { icon: "fa-calendar-check", title: "No approved appointments", sub: "Nothing is waiting to be started." },
      "In Progress": { icon: "fa-spinner", title: "No jobs in progress", sub: "No jobs are currently being worked on." },
      Completed: { icon: "fa-circle-check", title: "No completed jobs yet", sub: "Completed jobs will appear here." },
      Canceled: { icon: "fa-ban", title: "No canceled appointments", sub: "No appointments have been canceled." },
      All: { icon: "fa-calendar-xmark", title: "No appointments found", sub: "Try adjusting your search or filter." },
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

  // Staggered row fade-in
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
      </tr>
    `;
  });

  // Attach ripple to action buttons
  document.querySelectorAll(".ripple-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => addRipple(btn, e));
  });
}

// ─── STATS WITH COUNT-UP ──────────────────────────────────────────────────────
function updateStats(pool) {
  const counts = {
    total: pool.length,
    approved: pool.filter((a) => a.status === "Approved").length,
    inprogress: pool.filter((a) => a.status === "In Progress").length,
    completed: pool.filter((a) => a.status === "Completed").length,
    canceled: pool.filter((a) => a.status === "Canceled").length,
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

function setStatus(status, colorClass) {
  document.getElementById("currentStatusText").innerText = status;
  document.getElementById("currentStatusDot").className = `w-2 h-2 rounded-full ${colorClass}`;
  document.getElementById("statusMenu").classList.add("hidden");
  showToast(`Status set to ${status}`, "info");
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
  const id = parseInt(document.getElementById("paymentApptId").value);
  const collected = document.getElementById("paymentCollected").checked;
  const actualAmount = document.getElementById("actualAmount").value.trim();
  const receipt = document.getElementById("receiptNumber").value.trim();

  if (!collected) { showToast("Please confirm payment collection first.", "warning"); return; }
  if (!actualAmount || parseFloat(actualAmount) <= 0) { showToast("Please enter the actual amount collected.", "warning"); return; }
  if (!receipt) { showToast("Receipt number is required for completion.", "warning"); return; }

  const appt = appointments.find((a) => a.id === id);
  const formattedAmount = `₱${parseFloat(actualAmount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const confirmBtn = document.querySelector("#paymentModal button[onclick=\"submitCompletion()\"]");
  if (confirmBtn) setButtonLoading(confirmBtn, true);

  await updateAppointmentOnServer(id, { status: "Completed", receipt_no: receipt, actual_amount: actualAmount });
  closeModal("paymentModal");
  if (confirmBtn) setButtonLoading(confirmBtn, false, "Confirm & Finish");

  document.getElementById("summaryCustomer").innerText = appt.name;
  document.getElementById("summaryEstimate").innerText = appt.price_estimate || "—";
  document.getElementById("summaryAmount").innerText = formattedAmount;
  document.getElementById("summaryReceipt").innerText = receipt;
  document.getElementById("completionSummaryModal").classList.remove("hidden");
  showToast(`Service completed for ${appt.name}!`, "success");
}

function openCancel(id) {
  document.getElementById("cancelId").value = id;
  document.getElementById("cancelReason").value = "";
  document.getElementById("cancelModal").classList.remove("hidden");
}

async function confirmCancel() {
  const id = parseInt(document.getElementById("cancelId").value);
  const reason = document.getElementById("cancelReason").value.trim();
  if (!reason) { showToast("Please provide a reason for cancellation.", "warning"); return; }

  const appt = appointments.find((a) => a.id === id);
  const btn = document.querySelector("#cancelModal button[onclick=\"confirmCancel()\"]");
  if (btn) setButtonLoading(btn, true);

  await updateAppointmentOnServer(id, { status: "Canceled", cancel_reason: reason });
  closeModal("cancelModal");
  if (btn) setButtonLoading(btn, false, "Confirm Cancel");
  showToast(`Appointment for ${appt.name} canceled.`, "info");
}

function openReschedule(id) {
  const appt = appointments.find((a) => a.id === id);
  document.getElementById("rescheduleId").value = id;
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
  const id = parseInt(document.getElementById("rescheduleId").value);
  const date = document.getElementById("rescheduleDate").value;
  const time = document.getElementById("rescheduleTime").value;
  if (!date || !time) { showToast("Please fill in both date and time.", "warning"); return; }

  const appt = appointments.find((a) => a.id === id);
  const btn = document.querySelector("#rescheduleModal button[onclick=\"confirmReschedule()\"]");
  if (btn) setButtonLoading(btn, true);

  const [hours, mins] = time.split(":");
  const displayTime = `${hours % 12 || 12}:${mins} ${hours >= 12 ? "PM" : "AM"}`;
  await updateAppointmentOnServer(id, { date, time: displayTime });
  closeModal("rescheduleModal");
  if (btn) setButtonLoading(btn, false, "Confirm");
  showToast(`Rescheduled for ${appt.name}.`, "success");
}

// ─── DETAILS ROW ──────────────────────────────────────────────────────────────
function toggleDetails(id) {
  const detailRowId = `details-${id}`;
  const existingRow = document.getElementById(detailRowId);
  const chevron = document.getElementById(`chevron-${id}`);

  if (existingRow && !existingRow.classList.contains("hidden")) {
    existingRow.classList.add("hidden");
    chevron.classList.remove("rotate-90");
    return;
  }

  document.querySelectorAll('[id^="details-"]').forEach((r) => r.classList.add("hidden"));
  document.querySelectorAll('[id^="chevron-"]').forEach((i) => i.classList.remove("rotate-90"));

  const appt = appointments.find((a) => a.id === id);
  const mainRow = chevron.closest("tr");
  let detailTr = document.getElementById(detailRowId);

  if (!detailTr) {
    detailTr = document.createElement("tr");
    detailTr.id = detailRowId;
    detailTr.className = "bg-gray-50 border-b border-gray-100";
    mainRow.after(detailTr);
  }

  detailTr.classList.remove("hidden");
  chevron.classList.add("rotate-90");

  // Apply expand animation
  detailTr.querySelector("td")?.classList.remove("detail-animate");
  void detailTr.offsetWidth; // reflow
  setTimeout(() => detailTr.querySelector("td")?.classList.add("detail-animate"), 0);

  const isActive = appt.status === "Approved" || appt.status === "In Progress";
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
            <p class="text-3xl font-bold text-gray-900 mb-4">${appt.price_estimate || "P0"}</p>
            ${paymentInfo}
          </div>
        </div>
      </div>
    </td>`;

  // Attach ripple to detail buttons
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
const logoutBtn = document.getElementById("logoutButton");
const logoutModal = document.getElementById("logoutModal");
const cancelBtn = document.getElementById("cancelLogoutBtn");
const confirmBtn = document.getElementById("confirmLogoutBtn");

if (logoutBtn) logoutBtn.addEventListener("click", () => { logoutModal.classList.add("show"); document.body.style.overflow = "hidden"; });
if (logoutModal) logoutModal.addEventListener("click", (e) => { if (e.target === logoutModal) { logoutModal.classList.remove("show"); document.body.style.overflow = ""; } });
if (cancelBtn) cancelBtn.addEventListener("click", () => { logoutModal.classList.remove("show"); document.body.style.overflow = ""; });
if (confirmBtn) confirmBtn.addEventListener("click", () => { if (typeof logAudit === "function") logAudit("Logout", "System", "Admin logged out"); localStorage.removeItem("token"); localStorage.removeItem("user"); sessionStorage.clear(); window.location.href = "login.html"; });

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
document.getElementById("mobileMenuBtn").onclick = toggleSidebar;
document.getElementById("sidebarOverlay").onclick = toggleSidebar;
document.getElementById("searchInput").oninput = updateUI;
document.getElementById("statusFilter").onchange = updateUI;

// ─── INIT ─────────────────────────────────────────────────────────────────────
setGreeting();
updatePageTitle("Today");
fetchAppointments();

document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("accountTrigger");
  const modal = document.getElementById("passwordModal");
  const closeX = document.getElementById("closePassX");
  const closeBtn = document.getElementById("closePassBtn");
  const form = document.getElementById("changePasswordForm");

  // 1. Open modal when clicking account (Charm Heh)
  trigger.addEventListener("click", () => {
    modal.classList.add("show");
  });

  // 2. Close functions
  const closeModal = () => modal.classList.remove("show");
  closeX.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);

  // Close on background click
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // 3. Form submit — validates then calls the real API (Bug #2 fix)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentP = document.getElementById("currentPass").value;
    const newP = document.getElementById("newPass").value;
    const confP = document.getElementById("confirmPass").value;
    const err = document.getElementById("passwordError");
    const submitBtn = form.querySelector('button[type="submit"]');

    // Frontend validation
    err.classList.add("hidden");
    err.textContent = 'Passwords do not match!';

    if (!currentP) {
      err.textContent = 'Please enter your current password.';
      err.classList.remove("hidden"); return;
    }
    const pwPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!pwPolicy.test(newP)) {
      err.textContent = 'New password must be ≥8 chars, include 1 uppercase & 1 special character.';
      err.classList.remove("hidden"); return;
    }
    if (newP !== confP) {
      err.classList.remove("hidden"); return;
    }

    setButtonLoading(submitBtn, true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ current_password: currentP, new_password: newP }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to change password.');
      closeModal();
      form.reset();
      showToast('Password updated successfully!', 'success');
    } catch (apiErr) {
      err.textContent = apiErr.message || 'Could not update password. Please try again.';
      err.classList.remove("hidden");
    } finally {
      setButtonLoading(submitBtn, false, 'Update Password');
    }
  });
});