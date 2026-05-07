// ── STAFF ATTENDANCE — Daily Sheet ───────────────────────────────────────────
const API = 'http://localhost/algimon-api';

class AttendanceManager {
    constructor() {
        this.token     = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        this.staffData = [];
        this.date      = _today();
    }

    _headers() {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token };
    }

    // ── LOAD ─────────────────────────────────────────────────────────────────
    async loadAll() {
        if (!this.token) { window.location.href = 'login.html'; return; }

        this.date = document.getElementById('date-filter').value || _today();
        this._showSkeletons();

        try {
            const res  = await fetch(`${API}/attendance?date=${this.date}`, { headers: this._headers() });
            if (res.status === 401) { window.location.href = 'login.html'; return; }
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'API error');

            this.staffData = json.data.staff;
            this._renderStats(json.data.stats);
            this._renderSheet();
        } catch (err) {
            document.getElementById('sheet-body').innerHTML = `
                <tr><td colspan="4" class="text-center py-10 text-gray-400 text-sm">
                    <i class="fas fa-plug text-2xl block mb-2 text-red-300"></i>
                    Could not load attendance: ${_esc(err.message)}
                </td></tr>`;
            console.error('Attendance load error:', err);
        }
    }

    _showSkeletons() {
        document.getElementById('sheet-body').innerHTML = [1,2,3,4].map(() => `
            <tr>
                <td><div class="flex items-center gap-3">
                    <div class="skeleton skeleton-avatar shrink-0"></div>
                    <div class="flex-1"><div class="skeleton skeleton-title mb-1"></div><div class="skeleton skeleton-text" style="width:50%"></div></div>
                </div></td>
                <td><div class="skeleton skeleton-text" style="width:120px"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td></td>
            </tr>`).join('');
    }

    // ── STATS ─────────────────────────────────────────────────────────────────
    _renderStats(s) {
        document.getElementById('stat-present').textContent  = s.present;
        document.getElementById('stat-absent').textContent   = s.absent;
        document.getElementById('stat-late').textContent     = s.late;
        document.getElementById('stat-on-leave').textContent = s.on_leave;
        document.getElementById('stat-unmarked').textContent = s.unmarked;
        document.getElementById('stat-total').textContent    = s.total;
    }

    // ── SHEET ─────────────────────────────────────────────────────────────────
    _renderSheet() {
        const body = document.getElementById('sheet-body');
        const noEl = document.getElementById('no-staff');

        if (!this.staffData.length) {
            body.innerHTML = '';
            noEl.classList.remove('hidden');
            return;
        }
        noEl.classList.add('hidden');
        body.innerHTML = this.staffData.map(s => this._buildRow(s)).join('');
    }

    _buildRow(s) {
        const color    = _avatarColor(s.name);
        const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const [roleClass, roleLabel] = _roleMeta(s.role);
        const status   = s.attendance_status || '';
        const rowClass = _rowClass(status);

        return `
        <tr id="row-${s.id}" class="${rowClass}">
            <td>
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                         style="background:${color}">${initials}</div>
                    <div>
                        <p class="font-semibold text-gray-900 text-sm leading-tight">${_esc(s.name)}</p>
                        <span class="role-badge ${roleClass} mt-0.5">${roleLabel}</span>
                    </div>
                </div>
            </td>
            <td>
                <select class="status-select" data-id="${s.id}" data-att-id="${s.attendance_id || ''}"
                        onchange="attendance.onStatusChange(this, ${s.id})">
                    <option value=""         ${!status              ? 'selected' : ''}>— Unmarked —</option>
                    <option value="present"  ${status==='present'  ? 'selected' : ''}>Present</option>
                    <option value="absent"   ${status==='absent'   ? 'selected' : ''}>Absent</option>
                    <option value="late"     ${status==='late'     ? 'selected' : ''}>Late</option>
                    <option value="on_leave" ${status==='on_leave' ? 'selected' : ''}>On Leave</option>
                </select>
            </td>
            <td>
                <input type="text" class="remarks-input" data-id="${s.id}"
                       value="${_esc(s.remarks || '')}"
                       placeholder="optional note…"
                       onblur="attendance.onRemarksBlur(this, ${s.id})"
                       onkeydown="if(event.key==='Enter') this.blur()">
            </td>
            <td>
                <span id="save-ind-${s.id}" class="save-indicator"></span>
            </td>
        </tr>`;
    }

    // ── EVENTS ────────────────────────────────────────────────────────────────
    async onStatusChange(select, staffId) {
        const status  = select.value;
        const remarks = document.querySelector(`.remarks-input[data-id="${staffId}"]`)?.value || '';

        // Update row color immediately for snappy feedback
        const row = document.getElementById(`row-${staffId}`);
        if (row) row.className = _rowClass(status);

        await this._save(staffId, status, remarks);
    }

    async onRemarksBlur(input, staffId) {
        const select  = document.querySelector(`.status-select[data-id="${staffId}"]`);
        const status  = select ? select.value : '';
        const remarks = input.value;
        // Only save remarks if a status is already set
        if (!status) return;
        await this._save(staffId, status, remarks);
    }

    // ── SAVE (upsert or clear) ────────────────────────────────────────────────
    async _save(staffId, status, remarks) {
        const ind = document.getElementById(`save-ind-${staffId}`);
        if (ind) { ind.className = 'save-indicator saving'; ind.textContent = 'Saving…'; }

        try {
            if (!status) {
                // Status set back to unmarked — delete the record
                const attId = document.querySelector(`.status-select[data-id="${staffId}"]`)?.dataset.attId;
                if (attId) {
                    const res  = await fetch(`${API}/attendance/${attId}`, {
                        method: 'DELETE', headers: this._headers()
                    });
                    const json = await res.json();
                    if (!json.success) throw new Error(json.message);
                    document.querySelector(`.status-select[data-id="${staffId}"]`).dataset.attId = '';
                }
            } else {
                const res  = await fetch(`${API}/attendance/mark`, {
                    method:  'POST',
                    headers: this._headers(),
                    body:    JSON.stringify({ staff_id: staffId, date: this.date, status, remarks }),
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.message);

                // Store the attendance_id for future updates/deletes
                const select = document.querySelector(`.status-select[data-id="${staffId}"]`);
                if (select && json.data?.attendance_id) select.dataset.attId = json.data.attendance_id;

                const name = this.staffData.find(s => s.id == staffId)?.name || 'Staff';
                logAudit('Mark Attendance', 'Staff', `${name} marked as ${status}`);
            }

            if (ind) { ind.className = 'save-indicator saved'; ind.textContent = '✓ Saved'; }
            setTimeout(() => { if (ind) ind.textContent = ''; }, 2000);

            // Update local cache & recompute stats
            const staff = this.staffData.find(s => s.id == staffId);
            if (staff) { staff.attendance_status = status || null; staff.remarks = remarks; }
            this._recomputeStats();

        } catch (err) {
            if (ind) { ind.className = 'save-indicator error'; ind.textContent = '✗ Failed'; }
            showToast('Save failed: ' + err.message, 'error');
        }
    }

    _recomputeStats() {
        const c = { present: 0, absent: 0, late: 0, on_leave: 0, unmarked: 0 };
        this.staffData.forEach(s => {
            const k = s.attendance_status || 'unmarked';
            if (c[k] !== undefined) c[k]++;
        });
        document.getElementById('stat-present').textContent  = c.present;
        document.getElementById('stat-absent').textContent   = c.absent;
        document.getElementById('stat-late').textContent     = c.late;
        document.getElementById('stat-on-leave').textContent = c.on_leave;
        document.getElementById('stat-unmarked').textContent = c.unmarked;
    }

    // ── EXPORT CSV ────────────────────────────────────────────────────────────
    exportCSV() {
        fetch(`${API}/attendance/export?date=${this.date}`, {
            headers: { Authorization: 'Bearer ' + this.token }
        })
        .then(r => r.blob())
        .then(blob => {
            const link    = document.createElement('a');
            link.href     = URL.createObjectURL(blob);
            link.download = `attendance_${this.date}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('CSV downloaded', 'success');
        })
        .catch(() => showToast('Export failed', 'error'));
    }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function _today() {
    return new Date().toISOString().split('T')[0];
}

function _rowClass(status) {
    return { present: 'row-present', absent: 'row-absent', late: 'row-late', on_leave: 'row-on-leave' }[status] || '';
}

function _esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _avatarColor(name) {
    const palette = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899'];
    let h = 0;
    for (const c of (name || 'A')) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
    return palette[h % palette.length];
}

function _roleMeta(role) {
    return {
        'admin':             ['bg-red-100 text-red-700',       'Admin'],
        'manager':           ['bg-purple-100 text-purple-700', 'Manager'],
        'senior_technician': ['bg-blue-100 text-blue-700',     'Sr. Tech'],
        'technician':        ['bg-green-100 text-green-700',   'Technician'],
    }[role] || ['bg-gray-100 text-gray-600', role];
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
let attendance;
document.addEventListener('DOMContentLoaded', () => {
    attendance = new AttendanceManager();

    const dateInput = document.getElementById('date-filter');
    dateInput.value = _today();
    dateInput.max   = _today();
    dateInput.addEventListener('change', () => attendance.loadAll());

    attendance.loadAll();

    // User info in sidebar
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    if (user.name) {
        document.getElementById('user-name').textContent   = user.name;
        document.getElementById('user-email').textContent  = user.email || '';
        document.getElementById('user-avatar').textContent = user.name[0]?.toUpperCase() || 'A';
    }

    // Logout
    const logoutModal = document.getElementById('logoutModal');
    const showLogout  = () => { logoutModal.classList.add('show'); document.body.style.overflow = 'hidden'; };
    const hideLogout  = () => { logoutModal.classList.remove('show'); document.body.style.overflow = ''; };
    document.getElementById('logoutButton')?.addEventListener('click', showLogout);
    document.getElementById('cancelLogoutBtn')?.addEventListener('click', hideLogout);
    document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => {
        logAudit('Logout', 'System', 'Admin logged out');
        localStorage.removeItem('token'); localStorage.removeItem('user'); sessionStorage.clear();
        window.location.href = 'login.html';
    });
    window.handleModalBackdrop = e => { if (e.target === logoutModal) hideLogout(); };

    // Back to top
    window.addEventListener('scroll', () => {
        document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    // Greeting
    const h  = new Date().getHours();
    const el = document.getElementById('page-greeting');
    if (el) el.textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

    // Mobile sidebar
    document.getElementById('mobileMenuBtn')?.addEventListener('click', openSidebar);
});

function openSidebar()  { document.getElementById('sidebar').classList.remove('-translate-x-full'); document.getElementById('sidebarOverlay').classList.remove('hidden'); }
function closeSidebar() { document.getElementById('sidebar').classList.add('-translate-x-full');    document.getElementById('sidebarOverlay').classList.add('hidden'); }
function toggleStaffDropdown() {
    document.getElementById('staff-submenu').classList.toggle('hidden');
    document.getElementById('staff-chevron').classList.toggle('rotate-180');
}

// ── GLOBAL TOAST ─────────────────────────────────────────────────────────────
window.showToast = function(message, type) {
    type = type || 'info';
    const inner = document.getElementById('toast-inner');
    const icon  = document.getElementById('toast-icon');
    const msg   = document.getElementById('toast-message');
    if (!inner || !icon || !msg) return;
    const icons = { success:'fa-check-circle text-green-400', error:'fa-exclamation-circle text-red-400', warning:'fa-exclamation-triangle text-yellow-400', info:'fa-info-circle text-blue-400' };
    inner.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white toast-${type}`;
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};
