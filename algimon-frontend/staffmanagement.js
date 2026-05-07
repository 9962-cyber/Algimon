// ── STAFF MANAGEMENT ─────────────────────────────────────────────────────────
const API = 'http://localhost/algimon-api';

class StaffManager {
    constructor() {
        this.token        = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        this.staff        = [];
        this.editingId    = null;
        this.currentCerts = [];
        this.init();
    }

    _headers() {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token };
    }

    async init() {
        this._loadUserInfo();
        this._setupFilters();
        await this.loadStaff();
    }

    _loadUserInfo() {
        try {
            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            if (u.name) {
                const n = document.getElementById('user-name');
                const e = document.getElementById('user-email');
                const a = document.getElementById('user-avatar');
                if (n) n.textContent = u.name;
                if (e) e.textContent = u.email || '';
                if (a) a.textContent = (u.name || 'A')[0].toUpperCase();
            }
        } catch { /* ignore */ }
    }

    _setupFilters() {
        document.getElementById('search-input')?.addEventListener('input',  () => this._renderGrid());
        document.getElementById('role-filter')?.addEventListener('change', () => this._renderGrid());
    }

    // ── LOAD ─────────────────────────────────────────────────────────────────
    async loadStaff() {
        this._showSkeleton();
        try {
            const res  = await fetch(`${API}/staff`, { headers: this._headers() });
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'API error');
            this.staff = json.data.staff;
            this._renderStats(json.data.stats);
            this._renderGrid();
        } catch (err) {
            document.getElementById('staff-grid').innerHTML = `
                <div class="col-span-3 text-center py-16 text-gray-400">
                    <i class="fas fa-plug text-3xl mb-3 block text-red-300"></i>
                    <p class="text-sm">Could not load staff: ${this._esc(err.message)}</p>
                </div>`;
            console.error('Staff load error:', err);
        }
    }

    _showSkeleton() {
        const grid = document.getElementById('staff-grid');
        grid.innerHTML = [1, 2, 3].map(() => `
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="skeleton skeleton-avatar shrink-0"></div>
                    <div class="flex-1">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text" style="width:60%"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-text mb-2"></div>
                <div class="skeleton skeleton-text" style="width:70%"></div>
            </div>`).join('');
    }

    // ── STATS ─────────────────────────────────────────────────────────────────
    _renderStats(s) {
        document.getElementById('stat-total').textContent     = s.total;
        document.getElementById('stat-available').textContent = s.available_today;
        document.getElementById('stat-active').textContent    = s.active_assignments;
        document.getElementById('stat-certs').textContent     = s.certifications;
    }

    // ── GRID ──────────────────────────────────────────────────────────────────
    _renderGrid() {
        const search = (document.getElementById('search-input')?.value || '').toLowerCase();
        const role   = document.getElementById('role-filter')?.value || '';
        const noEl   = document.getElementById('no-staff');
        const grid   = document.getElementById('staff-grid');

        const filtered = this.staff.filter(s => {
            const matchSearch = !search ||
                s.name.toLowerCase().includes(search) ||
                s.email.toLowerCase().includes(search);
            const matchRole = !role || s.role === role;
            return matchSearch && matchRole;
        });

        if (!filtered.length) {
            grid.innerHTML = '';
            noEl.classList.remove('hidden');
            return;
        }
        noEl.classList.add('hidden');
        grid.innerHTML = filtered.map(s => this._buildCard(s)).join('');
    }

    _buildCard(s) {
        const [roleClass, roleLabel] = this._roleMeta(s.role);
        const color    = this._avatarColor(s.name);
        const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const days     = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        const dayShort = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

        const dayPills = days.map((d, i) => {
            const active = (s.availability_days || []).includes(d);
            return `<span class="day-pill ${active ? 'active' : 'inactive'}">${dayShort[i]}</span>`;
        }).join('');

        const certBadges = (s.certifications || []).length
            ? (s.certifications).map(c =>
                `<span class="cert-tag"><i class="fas fa-certificate text-[9px]"></i>${this._esc(c)}</span>`
              ).join('')
            : `<span class="text-xs text-gray-400 italic">No certifications</span>`;

        return `
        <div class="staff-card bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-staff-id="${s.id}">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                         style="background:${color}">${initials}</div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-gray-900 text-base leading-tight truncate">${this._esc(s.name)}</h3>
                        <span class="role-badge ${roleClass} mt-1">${roleLabel}</span>
                    </div>
                </div>
                <div class="flex gap-1 shrink-0 ml-2">
                    <button onclick="staffMgr.openEdit(${s.id})" title="Edit"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <i class="fas fa-edit text-xs"></i>
                    </button>
<<<<<<< HEAD
                    <button onclick="staffMgr.confirmResetPassword(${s.id}, '${this._esc(s.name)}')" title="Reset Password"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                        <i class="fas fa-key text-xs"></i>
                    </button>
=======
>>>>>>> ba480c3877aa6c9ada883ba61e008d131871ea95
                    <button onclick="staffMgr.confirmDelete(${s.id}, '${this._esc(s.name)}')" title="Delete"
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>

            <div class="space-y-2 mb-4 text-sm text-gray-600">
                <div class="flex items-center gap-2 truncate">
                    <i class="fas fa-envelope text-gray-400 text-xs w-4 text-center shrink-0"></i>
                    <span class="truncate">${this._esc(s.email)}</span>
                </div>
                ${s.phone ? `
                <div class="flex items-center gap-2">
                    <i class="fas fa-phone text-gray-400 text-xs w-4 text-center shrink-0"></i>
                    <span>${this._esc(s.phone)}</span>
                </div>` : ''}
            </div>

            <div class="border-t border-gray-100 pt-3 mb-3">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Availability</p>
                <div class="flex gap-1 flex-wrap">${dayPills}</div>
            </div>

            <div class="border-t border-gray-100 pt-3">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Certifications</p>
                <div class="flex flex-wrap gap-1.5">${certBadges}</div>
            </div>
        </div>`;
    }

    // ── ADD ───────────────────────────────────────────────────────────────────
    openAdd() {
        this.editingId    = null;
        this.currentCerts = [];

        document.getElementById('modal-title').textContent    = 'Add Staff Member';
        document.getElementById('modal-subtitle').style.display = '';
        document.getElementById('submit-icon').className     = 'fas fa-user-plus';
        document.getElementById('submit-label').textContent  = 'Add Staff Member';

        document.getElementById('staff-id').value    = '';
        document.getElementById('field-name').value  = '';
        document.getElementById('field-email').value = '';
        document.getElementById('field-phone').value = '';
        document.getElementById('field-role').value  = 'technician';

        document.querySelectorAll('.avail-cb').forEach(cb => cb.checked = false);
        this._renderCertTags();
        this._openModal();
    }

    // ── EDIT ──────────────────────────────────────────────────────────────────
    openEdit(id) {
        const s = this.staff.find(x => x.id === id);
        if (!s) return;
        this.editingId    = id;
        this.currentCerts = [...(s.certifications || [])];

        document.getElementById('modal-title').textContent    = 'Edit Staff Member';
        document.getElementById('modal-subtitle').style.display = 'none';
        document.getElementById('submit-icon').className     = 'fas fa-save';
        document.getElementById('submit-label').textContent  = 'Save Changes';

        document.getElementById('staff-id').value    = s.id;
        document.getElementById('field-name').value  = s.name  || '';
        document.getElementById('field-email').value = s.email || '';
        document.getElementById('field-phone').value = s.phone || '';
        document.getElementById('field-role').value  = s.role  || 'technician';

        document.querySelectorAll('.avail-cb').forEach(cb => {
            cb.checked = (s.availability_days || []).includes(cb.value);
        });
        this._renderCertTags();
        this._openModal();
    }

    closeModal() {
        document.getElementById('staff-modal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    _openModal() {
        document.getElementById('staff-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('field-name').focus(), 80);
    }

    // ── CERTIFICATIONS TAG INPUT ──────────────────────────────────────────────
    addCert() {
        const input = document.getElementById('cert-input');
        const val   = input.value.trim();
        if (!val) return;
        if (!this.currentCerts.includes(val)) {
            this.currentCerts.push(val);
            this._renderCertTags();
        }
        input.value = '';
        input.focus();
    }

    removeCert(cert) {
        this.currentCerts = this.currentCerts.filter(c => c !== cert);
        this._renderCertTags();
    }

    _renderCertTags() {
        const container = document.getElementById('cert-tags');
        if (!this.currentCerts.length) { container.innerHTML = ''; return; }
        container.innerHTML = this.currentCerts.map(cert => `
            <span class="cert-tag">
                <i class="fas fa-certificate text-[9px]"></i>
                ${this._esc(cert)}
                <button type="button" onclick="staffMgr.removeCert(${JSON.stringify(cert)})"
                    class="ml-1 text-blue-400 hover:text-blue-700 transition-colors">
                    <i class="fas fa-times text-[9px]"></i>
                </button>
            </span>`).join('');
    }

    // ── SUBMIT (add or edit) ──────────────────────────────────────────────────
    async submitForm() {
        const name  = document.getElementById('field-name').value.trim();
        const email = document.getElementById('field-email').value.trim();
        const phone = document.getElementById('field-phone').value.trim();
        const role  = document.getElementById('field-role').value;
        const avail = [...document.querySelectorAll('.avail-cb:checked')].map(cb => cb.value);

        if (!name || !email) {
            showToast('Name and email are required.', 'error');
            return;
        }

        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

        const body = { name, email, phone, role, certifications: this.currentCerts, availability_days: avail };

        try {
            const isEdit = !!this.editingId;
            const url    = isEdit ? `${API}/staff/${this.editingId}` : `${API}/staff`;
            const method = isEdit ? 'PUT' : 'POST';

            const res  = await fetch(url, { method, headers: this._headers(), body: JSON.stringify(body) });
            const json = await res.json();

            if (!json.success) throw new Error(json.message || 'Server error');

            logAudit(isEdit ? 'Update Staff' : 'Add Staff', 'Staff',
                `${isEdit ? 'Updated' : 'Added'} staff member: ${name}`);
            showToast(isEdit ? 'Staff member updated.' : 'Staff member added.', 'success');
            this.closeModal();
            await this.loadStaff();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save" id="submit-icon"></i> <span id="submit-label">${this.editingId ? 'Save Changes' : 'Add Staff Member'}</span>`;
        }
    }

<<<<<<< HEAD
    // ── RESET PASSWORD ────────────────────────────────────────────────────────
    confirmResetPassword(id, name) {
        window.showConfirm({
            title:       'Reset Password?',
            message:     `A new temporary password will be generated and emailed to ${name}. They will be required to change it on next login.`,
            confirmText: 'Reset Password',
            type:        'warning',
            onConfirm:   () => this._doResetPassword(id, name),
        });
    }

    async _doResetPassword(id, name) {
        try {
            const res  = await fetch(`${API}/staff/${id}/reset-password`, { method: 'POST', headers: this._headers() });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            logAudit('Reset Staff Password', 'Staff', `Reset password for: ${name}`);
            showToast(`Password reset and emailed to ${name}.`, 'success');
        } catch (err) {
            showToast('Reset failed: ' + err.message, 'error');
        }
    }

=======
>>>>>>> ba480c3877aa6c9ada883ba61e008d131871ea95
    // ── DELETE ────────────────────────────────────────────────────────────────
    confirmDelete(id, name) {
        window.showConfirm({
            title:       'Delete Staff Member?',
            message:     `${name} will be permanently removed from the system. All their appointments will be unassigned.`,
            confirmText: 'Delete',
            type:        'danger',
            onConfirm:   () => this._doDelete(id, name),
        });
    }

    async _doDelete(id, name) {
        try {
            const res  = await fetch(`${API}/staff/${id}`, { method: 'DELETE', headers: this._headers() });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            logAudit('Delete Staff', 'Staff', `Deleted staff member: ${name}`);
            showToast('Staff member deleted.', 'success');
            await this.loadStaff();
        } catch (err) {
            showToast('Delete failed: ' + err.message, 'error');
        }
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────
    _roleMeta(role) {
        return {
            'admin':             ['bg-red-100 text-red-700',       'Admin'],
            'manager':           ['bg-purple-100 text-purple-700', 'Manager'],
            'senior_technician': ['bg-blue-100 text-blue-700',     'Sr. Technician'],
            'technician':        ['bg-green-100 text-green-700',   'Technician'],
        }[role] || ['bg-gray-100 text-gray-600', role];
    }

    _avatarColor(name) {
        const palette = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899'];
        let h = 0;
        for (const c of (name || 'A')) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
        return palette[h % palette.length];
    }

    _esc(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
let staffMgr;
document.addEventListener('DOMContentLoaded', () => {
    staffMgr = new StaffManager();

    // Form submit
    document.getElementById('staff-form').addEventListener('submit', e => {
        e.preventDefault();
        staffMgr.submitForm();
    });

    // Cert input — Enter key
    document.getElementById('cert-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); staffMgr.addCert(); }
    });

    // Modal backdrop click
    document.getElementById('staff-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) staffMgr.closeModal();
    });

    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') staffMgr.closeModal();
    });

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
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('page-greeting');
    if (el) el.textContent = g;

    // Mobile sidebar
    document.getElementById('mobileMenuBtn')?.addEventListener('click', openSidebar);
});

// Mobile sidebar helpers
function openSidebar() {
    document.getElementById('sidebar').classList.remove('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.remove('hidden');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.add('hidden');
}
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
    const icons = {
        success: 'fa-check-circle text-green-400',
        error:   'fa-exclamation-circle text-red-400',
        warning: 'fa-exclamation-triangle text-yellow-400',
        info:    'fa-info-circle text-blue-400',
    };
    inner.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white toast-${type}`;
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};
