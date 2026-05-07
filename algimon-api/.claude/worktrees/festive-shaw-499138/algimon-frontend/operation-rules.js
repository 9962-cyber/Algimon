// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost/algimon-api";

// ── STATE ─────────────────────────────────────────────────────────────────────
let timeSlotsConfig = {
    monday:    { active: false, start: "08:00", end: "17:00", maxSlots: 8 },
    tuesday:   { active: false, start: "08:00", end: "17:00", maxSlots: 8 },
    wednesday: { active: false, start: "08:00", end: "17:00", maxSlots: 8 },
    thursday:  { active: false, start: "08:00", end: "17:00", maxSlots: 8 },
    friday:    { active: false, start: "08:00", end: "17:00", maxSlots: 8 },
    saturday:  { active: false, start: "09:00", end: "15:00", maxSlots: 6 },
    sunday:    { active: false, start: "10:00", end: "14:00", maxSlots: 4 }
};
// Each item: { id, date, reason }
let blockedDates = [];

// ── AUTH ──────────────────────────────────────────────────────────────────────
function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ── API HELPERS ───────────────────────────────────────────────────────────────
async function apiRequest(method, path, body) {
    const opts = { method, headers: getAuthHeaders() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res  = await fetch(API_BASE + path, opts);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API error');
    return json.data;
}
const apiGet    = (path)       => apiRequest('GET',    path);
const apiPut    = (path, body) => apiRequest('PUT',    path, body);
const apiPost   = (path, body) => apiRequest('POST',   path, body);
const apiDelete = (path)       => apiRequest('DELETE', path);

// ── LOAD DATA FROM DB ─────────────────────────────────────────────────────────
async function loadData() {
    try {
        const [slotsData, blockedData] = await Promise.all([
            apiGet('/time-slots'),
            apiGet('/blocked-dates')
        ]);

        // Merge DB values into local state
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        for (const day of days) {
            if (slotsData[day]) {
                timeSlotsConfig[day].active   = slotsData[day].active   ?? false;
                timeSlotsConfig[day].start    = slotsData[day].start    ?? timeSlotsConfig[day].start;
                timeSlotsConfig[day].end      = slotsData[day].end      ?? timeSlotsConfig[day].end;
                timeSlotsConfig[day].maxSlots = slotsData[day].maxSlots ?? timeSlotsConfig[day].maxSlots;
            }
        }
        blockedDates = blockedData;

        // Re-render with real DB values
        renderDayCards();
        updateSummaryAndCapacity();
        renderBlockedList();
        renderCalendar();

    } catch (err) {
        // API failed — page already shows defaults from the initial render below
        const msg = err.message.toLowerCase().includes('unauthorized')
            ? 'Not logged in — time slots loaded in read-only mode.'
            : 'Could not load from database: ' + err.message;
        showToast(msg, 'warning');
    }
}

// ── TIME PICKER HELPERS ───────────────────────────────────────────────────────
function parse24h(val) {
    const [hStr, mStr] = (val || "08:00").split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h < 12 ? 'AM' : 'PM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return { hour: h, minute: m, ampm };
}

function to24h(hour, minute, ampm) {
    let h = parseInt(hour, 10);
    if (ampm === 'AM' && h === 12) h = 0;
    else if (ampm === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

function hourOptions(selected) {
    return Array.from({length:12}, (_,i) => i+1)
        .map(h => `<option value="${h}" ${h === selected ? 'selected' : ''}>${h}</option>`)
        .join('');
}

function minuteOptions(selected) {
    return Array.from({length:60}, (_,m) =>
        `<option value="${m}" ${m === selected ? 'selected' : ''}>${String(m).padStart(2,'0')}</option>`
    ).join('');
}

function timePickerHTML(idPrefix, val24, disabled) {
    const { hour, minute, ampm } = parse24h(val24);
    const dis = disabled ? 'disabled' : '';
    return `
    <div class="custom-time-picker ${disabled ? 'picker-disabled' : ''}" id="picker-${idPrefix}">
        <i class="fas fa-clock picker-icon"></i>
        <div class="picker-segment">
            <select class="picker-select picker-hour" id="${idPrefix}-hour" ${dis}>${hourOptions(hour)}</select>
            <i class="fas fa-chevron-down picker-chevron"></i>
        </div>
        <span class="picker-colon">:</span>
        <div class="picker-segment">
            <select class="picker-select picker-minute" id="${idPrefix}-minute" ${dis}>${minuteOptions(minute)}</select>
            <i class="fas fa-chevron-down picker-chevron"></i>
        </div>
        <div class="picker-segment picker-segment-ampm">
            <select class="picker-select picker-ampm" id="${idPrefix}-ampm" ${dis}>
                <option value="AM" ${ampm==='AM'?'selected':''}>AM</option>
                <option value="PM" ${ampm==='PM'?'selected':''}>PM</option>
            </select>
            <i class="fas fa-chevron-down picker-chevron"></i>
        </div>
    </div>`;
}

function getPickerValue(idPrefix) {
    const hEl = document.getElementById(`${idPrefix}-hour`);
    const mEl = document.getElementById(`${idPrefix}-minute`);
    const aEl = document.getElementById(`${idPrefix}-ampm`);
    if (!hEl || !mEl || !aEl) return null;
    return to24h(hEl.value, mEl.value, aEl.value);
}

function formatTime24(val24) {
    if (!val24) return '';
    const { hour, minute, ampm } = parse24h(val24);
    return `${hour}:${String(minute).padStart(2,'0')} ${ampm}`;
}

// ── RENDER: DAY CARDS ─────────────────────────────────────────────────────────
function renderDayCards() {
    const container = document.getElementById('days-container');
    if (!container) return;

    const days     = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    const dayNames = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday", friday:"Friday", saturday:"Saturday", sunday:"Sunday" };

    container.innerHTML = days.map(day => `
        <div class="day-item ${timeSlotsConfig[day].active ? '' : 'disabled'}" id="day-${day}">
            <div class="day-header">
                <div class="day-title">
                    <label class="toggle">
                        <input type="checkbox" id="day-toggle-${day}" ${timeSlotsConfig[day].active ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="font-semibold text-gray-800">${dayNames[day]}</span>
                </div>
                <span class="badge-active" style="display:${timeSlotsConfig[day].active ? 'inline-block' : 'none'};">Active</span>
            </div>
            <div class="time-fields">
                <div class="time-field">
                    <label>Start Time</label>
                    ${timePickerHTML(`start-${day}`, timeSlotsConfig[day].start, !timeSlotsConfig[day].active)}
                </div>
                <div class="time-field">
                    <label>End Time</label>
                    ${timePickerHTML(`end-${day}`, timeSlotsConfig[day].end, !timeSlotsConfig[day].active)}
                </div>
            </div>
            <div class="slots-section ${timeSlotsConfig[day].active ? '' : 'opacity-50'}">
                <label class="slots-label">Maximum Slots per Day</label>
                <div class="slots-value" id="slots-${day}-display">${timeSlotsConfig[day].maxSlots}</div>
                <p class="slots-hint">Number of appointments that can be booked on this day</p>
                <div class="slots-controls">
                    <button type="button" class="slots-btn" id="decr-${day}" ${timeSlotsConfig[day].active ? '' : 'disabled'}>−</button>
                    <span class="slots-count" id="slots-${day}">${timeSlotsConfig[day].maxSlots}</span>
                    <button type="button" class="slots-btn" id="incr-${day}" ${timeSlotsConfig[day].active ? '' : 'disabled'}>+</button>
                </div>
            </div>
        </div>
    `).join('');

    days.forEach(day => {
        const toggle = document.getElementById(`day-toggle-${day}`);
        if (toggle) toggle.onchange = (e) => toggleDay(day, e.target.checked);

        ['hour','minute','ampm'].forEach(part => {
            const el = document.getElementById(`start-${day}-${part}`);
            if (el) el.addEventListener('change', () => {
                if (!timeSlotsConfig[day].active) return;
                const v = getPickerValue(`start-${day}`);
                if (v) { timeSlotsConfig[day].start = v; updateSummaryAndCapacity(); }
            });
        });
        ['hour','minute','ampm'].forEach(part => {
            const el = document.getElementById(`end-${day}-${part}`);
            if (el) el.addEventListener('change', () => {
                if (!timeSlotsConfig[day].active) return;
                const v = getPickerValue(`end-${day}`);
                if (v) { timeSlotsConfig[day].end = v; updateSummaryAndCapacity(); }
            });
        });

        document.getElementById(`decr-${day}`)?.addEventListener('click', () => decreaseSlots(day));
        document.getElementById(`incr-${day}`)?.addEventListener('click', () => increaseSlots(day));
    });
}

function applyDayUI(day) {
    const dayDiv = document.getElementById(`day-${day}`);
    if (!dayDiv) return;
    const isActive = timeSlotsConfig[day].active;

    dayDiv.classList.toggle('disabled', !isActive);
    const badge = dayDiv.querySelector('.badge-active');
    if (badge) badge.style.display = isActive ? 'inline-block' : 'none';

    ['hour','minute','ampm'].forEach(part => {
        const s = document.getElementById(`start-${day}-${part}`);
        const e = document.getElementById(`end-${day}-${part}`);
        if (s) s.disabled = !isActive;
        if (e) e.disabled = !isActive;
    });
    document.getElementById(`picker-start-${day}`)?.classList.toggle('picker-disabled', !isActive);
    document.getElementById(`picker-end-${day}`)?.classList.toggle('picker-disabled', !isActive);
    document.getElementById(`decr-${day}`) && (document.getElementById(`decr-${day}`).disabled = !isActive);
    document.getElementById(`incr-${day}`) && (document.getElementById(`incr-${day}`).disabled = !isActive);
    dayDiv.querySelector('.slots-section')?.classList.toggle('opacity-50', !isActive);
    const chk = document.getElementById(`day-toggle-${day}`);
    if (chk && chk.checked !== isActive) chk.checked = isActive;
}

window.toggleDay = function(day, isActive) {
    timeSlotsConfig[day].active = isActive;
    applyDayUI(day);
    updateSummaryAndCapacity();
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    showToast(`${dayName} ${isActive ? 'activated' : 'deactivated'}`, isActive ? 'success' : 'info');
};

window.increaseSlots = function(day) {
    if (!timeSlotsConfig[day].active) return;
    timeSlotsConfig[day].maxSlots++;
    document.getElementById(`slots-${day}`).innerText = timeSlotsConfig[day].maxSlots;
    const d = document.getElementById(`slots-${day}-display`);
    if (d) d.innerText = timeSlotsConfig[day].maxSlots;
    updateSummaryAndCapacity();
};

window.decreaseSlots = function(day) {
    if (!timeSlotsConfig[day].active || timeSlotsConfig[day].maxSlots <= 0) return;
    timeSlotsConfig[day].maxSlots--;
    document.getElementById(`slots-${day}`).innerText = timeSlotsConfig[day].maxSlots;
    const d = document.getElementById(`slots-${day}-display`);
    if (d) d.innerText = timeSlotsConfig[day].maxSlots;
    updateSummaryAndCapacity();
};

// ── RENDER: BUSINESS HOURS SUMMARY ───────────────────────────────────────────
function updateSummaryAndCapacity() {
    const summaryDiv = document.getElementById('summary-container');
    if (!summaryDiv) return;
    const days   = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    const pretty = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };
    let total = 0;
    summaryDiv.innerHTML = '';

    for (const d of days) {
        const cfg = timeSlotsConfig[d];
        const row = document.createElement('div');
        row.className = `flex justify-between py-2 border-b text-sm ${cfg.active ? '' : 'text-gray-400'}`;
        if (cfg.active) {
            total += cfg.maxSlots;
            row.innerHTML = `<span class="font-medium">${pretty[d]}</span><span>${formatTime24(cfg.start)} – ${formatTime24(cfg.end)} <span class="font-bold text-red-700">(${cfg.maxSlots} slots)</span></span>`;
        } else {
            row.innerHTML = `<span class="font-medium">${pretty[d]}</span><span>Closed</span>`;
        }
        summaryDiv.appendChild(row);
    }
    document.getElementById('total-capacity').innerText = total;
}

// ── SAVE TIME SLOTS → API ─────────────────────────────────────────────────────
window.saveTimeSlots = async function() {
    const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

    // Flush picker values into config before sending
    days.forEach(day => {
        if (timeSlotsConfig[day].active) {
            const sv = getPickerValue(`start-${day}`);
            const ev = getPickerValue(`end-${day}`);
            if (sv) timeSlotsConfig[day].start = sv;
            if (ev) timeSlotsConfig[day].end   = ev;
        }
    });

    const saveBtn = document.querySelector('[onclick="saveTimeSlots()"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving…'; }

    try {
        await apiPut('/time-slots', timeSlotsConfig);
        const activeDays = days
            .filter(d => timeSlotsConfig[d].active)
            .map(d => d.charAt(0).toUpperCase() + d.slice(1))
            .join(', ');
        if (typeof logAudit === 'function') {
            logAudit('Update Time Slots', 'System', `Saved time slot config. Active: ${activeDays || 'None'}`);
        }
        showToast('Time slots saved successfully!', 'success');
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Time Slots'; }
    }
};

// ── ADD BLOCKED DATE → API ────────────────────────────────────────────────────
window.addBlockedDate = async function() {
    const dateInput   = document.getElementById('blocked-date-input');
    const reasonInput = document.getElementById('blocked-reason-input');
    const dateStr     = dateInput?.value || '';

    if (!dateStr) { showToast('Please select a date', 'error'); return; }
    if (blockedDates.some(b => b.date === dateStr)) { showToast('This date is already blocked', 'error'); return; }

    const reason = reasonInput?.value.trim() || 'Blocked';
    const addBtn = document.querySelector('[onclick="addBlockedDate()"]');
    if (addBtn) addBtn.disabled = true;

    try {
        const created = await apiPost('/blocked-dates', { date: dateStr, reason });
        blockedDates.push({ id: created.id, date: created.date, reason: created.reason });
        blockedDates.sort((a, b) => a.date.localeCompare(b.date));
        renderBlockedList();
        renderCalendar();
        if (dateInput)   dateInput.value   = '';
        if (reasonInput) reasonInput.value = '';
        if (typeof logAudit === 'function') {
            logAudit('Block Date', 'System', `Blocked ${dateStr}: ${reason}`);
        }
        showToast(`Blocked ${dateStr} — ${reason}`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        if (addBtn) addBtn.disabled = false;
    }
};

// ── RENDER: BLOCKED DATES LIST ────────────────────────────────────────────────
function renderBlockedList() {
    const container = document.getElementById('blocked-list-container');
    const countSpan = document.getElementById('blocked-count');
    if (!container) return;

    if (countSpan) countSpan.innerText = `(${blockedDates.length})`;

    if (blockedDates.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-6 text-sm">No blocked dates added</div>';
        return;
    }

    container.innerHTML = '';
    blockedDates.forEach(item => {
        const div = document.createElement('div');
        div.className = 'blocked-date-item';
        div.innerHTML = `
            <div>
                <span class="font-mono text-sm font-semibold">${item.date}</span>
                <span class="ml-3 text-gray-600 text-xs">${escapeHtml(item.reason) || 'No reason'}</span>
            </div>
            <button class="delete-blocked text-red-500 hover:text-red-700" data-id="${item.id}">
                <i class="fas fa-trash-alt"></i>
            </button>`;
        container.appendChild(div);
    });

    container.querySelectorAll('.delete-blocked').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = parseInt(btn.getAttribute('data-id'));
            const item = blockedDates.find(b => b.id === id);
            showConfirm({
                title:       'Remove Blocked Date?',
                message:     `${item?.date || 'This date'} (${item?.reason || 'no reason'}) will become available for bookings again.`,
                confirmText: 'Remove',
                type:        'warning',
                onConfirm:   async () => {
                    try {
                        await apiDelete(`/blocked-dates/${id}`);
                        blockedDates = blockedDates.filter(b => b.id !== id);
                        renderBlockedList();
                        renderCalendar();
                        if (typeof logAudit === 'function') {
                            logAudit('Unblock Date', 'System', `Removed blocked date ${item?.date}: ${item?.reason}`);
                        }
                        showToast('Blocked date removed', 'success');
                    } catch (err) {
                        showToast('Delete failed: ' + err.message, 'error');
                    }
                }
            });
        });
    });
}

// ── RENDER: CALENDAR ──────────────────────────────────────────────────────────
let currentMonth = new Date().getMonth();
let currentYear  = new Date().getFullYear();

function renderCalendar() {
    const tbody = document.getElementById('calendar-body');
    if (!tbody) return;

    const firstDay     = new Date(currentYear, currentMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthNames   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    const monthHeader = document.getElementById('calendar-month');
    if (monthHeader) monthHeader.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    tbody.innerHTML = '';
    let dayCounter = 1;

    for (let i = 0; i < 6; i++) {
        if (dayCounter > daysInMonth) break;
        const tr = document.createElement('tr');

        for (let j = 0; j < 7; j++) {
            const td = document.createElement('td');
            if (i === 0 && j < startWeekday) {
                td.innerText = '';
            } else if (dayCounter > daysInMonth) {
                td.innerText = '';
            } else {
                const dateStr   = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(dayCounter).padStart(2,'0')}`;
                const blocked   = blockedDates.find(b => b.date === dateStr);
                td.innerText = dayCounter;
                if (blocked) {
                    td.classList.add('blocked');
                    td.style.backgroundColor = '#fecaca';
                    td.style.color           = '#dc2626';
                    td.style.fontWeight      = '600';
                    td.style.borderRadius    = '4px';
                    td.title = blocked.reason || 'Blocked';
                }
                dayCounter++;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

window.previousMonth = function() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
    renderCalendar();
};
window.nextMonth = function() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
    renderCalendar();
};

// ── TABS ──────────────────────────────────────────────────────────────────────
window.switchTab = function(tab) {
    const timeTab    = document.getElementById('time-slots-tab');
    const blockedTab = document.getElementById('blocked-dates-tab');
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (tab === 'time-slots' && i === 0) || (tab === 'blocked-dates' && i === 1));
    });
    timeTab?.classList.toggle('hidden', tab !== 'time-slots');
    blockedTab?.classList.toggle('hidden', tab !== 'blocked-dates');
    if (tab === 'blocked-dates') { renderBlockedList(); renderCalendar(); }
};

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
window.showToast = function(message, type = 'info') {
    const icons = { success:'fa-check-circle text-green-400', error:'fa-exclamation-circle text-red-400', warning:'fa-exclamation-triangle text-yellow-400', info:'fa-info-circle text-blue-400' };
    const inner = document.getElementById('toast-inner');
    const icon  = document.getElementById('toast-icon');
    const msg   = document.getElementById('toast-message');
    if (!inner || !icon || !msg) return;
    inner.className = inner.className.replace(/toast-\S+/g,'').replace(/bg-\S+/g,'').trim();
    inner.classList.add('flex','items-center','gap-3','px-4','py-3','rounded-xl','shadow-2xl','text-sm','font-medium','transition-all','duration-300','text-white','toast-'+type);
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};

// ── USER INFO ─────────────────────────────────────────────────────────────────
function updateUserInfo() {
    const user    = JSON.parse(localStorage.getItem('user') || '{}');
    const nameEl  = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avEl    = document.getElementById('user-avatar');
    if (nameEl)  nameEl.textContent  = user.name  || 'Admin User';
    if (emailEl) emailEl.textContent = user.email || 'admin@algimon.com';
    if (avEl)    avEl.textContent    = user.name ? user.name.charAt(0).toUpperCase() : 'A';
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
const logoutBtn   = document.getElementById('logoutButton');
const logoutModal = document.getElementById('logoutModal');
const cancelBtn   = document.getElementById('cancelLogoutBtn');
const confirmBtn  = document.getElementById('confirmLogoutBtn');

function showModal() { logoutModal?.classList.add('show');    document.body.style.overflow = 'hidden'; }
function hideModal() { logoutModal?.classList.remove('show'); document.body.style.overflow = ''; }

if (logoutBtn)  logoutBtn.addEventListener('click', showModal);
if (cancelBtn)  cancelBtn.addEventListener('click', hideModal);
if (confirmBtn) confirmBtn.addEventListener('click', () => {
    if (typeof logAudit === 'function') logAudit('Logout', 'System', 'Admin logged out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'login.html';
});
window.handleModalBackdrop = (e) => { if (e.target === logoutModal) hideModal(); };
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && logoutModal?.classList.contains('show')) hideModal();
});

// ── BACK TO TOP ───────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });
window.scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

// ── STAFF DROPDOWN ────────────────────────────────────────────────────────────
function toggleStaffDropdown() {
    document.getElementById('staff-submenu')?.classList.toggle('hidden');
    document.getElementById('staff-chevron')?.classList.toggle('rotate-180');
}
window.toggleStaffDropdown = toggleStaffDropdown;

// ── INLINE STYLES FOR BLOCKED DATE ITEMS + TOAST ──────────────────────────────
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .blocked-date-item { background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; }
        .delete-blocked { background:none; border:none; cursor:pointer; padding:8px; border-radius:8px; transition:background 0.2s; }
        .delete-blocked:hover { background:rgba(220,38,38,.1); }
        #toast-inner { transform:translateY(1rem); opacity:0; transition:all 0.3s ease; }
        #toast-inner.show { transform:translateY(0); opacity:1; }
        .toast-success { background:#14532d; }
        .toast-error   { background:#7f1d1d; }
        .toast-warning { background:#78350f; }
        .toast-info    { background:#1e3a5f; }
    `;
    document.head.appendChild(style);
})();

// ── INIT ──────────────────────────────────────────────────────────────────────
updateUserInfo();
renderDayCards();
updateSummaryAndCapacity();
renderBlockedList();
renderCalendar();
loadData(); // async: re-renders with real DB values when response arrives
