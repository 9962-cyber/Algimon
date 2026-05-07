const API_BASE_URL = 'http://localhost/algimon-api';

class InquiriesManager {
    constructor() {
        this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        this.inquiries = [];
        this.activeTab = 'inquiries';
        this.editingId   = null;
        this.quoteTargetId = null;
        this.staffList   = [];
        this.assigningId = null;
        this.init();
    }

    async init() {
        this.updateUserInfo();
        this.setupFilters();
        await Promise.all([this.loadInquiries(), this.loadStaff()]);
    }

    updateUserInfo() {
        if (this.currentUser.name) {
            const el = (id) => document.getElementById(id);
            if (el('user-name'))   el('user-name').textContent   = this.currentUser.name;
            if (el('user-email'))  el('user-email').textContent  = this.currentUser.email;
            if (el('user-avatar')) el('user-avatar').textContent = this.currentUser.avatar || 'A';
        }
    }

    setupFilters() {
        document.getElementById('search-input').addEventListener('input', () => this.render());
        document.getElementById('status-filter').addEventListener('change', () => this.render());
        document.getElementById('industry-filter').addEventListener('change', () => this.render());
    }

    async loadInquiries() {
        document.getElementById('inquiry-list').innerHTML = this.skeletonHTML();
        document.getElementById('appointment-list').innerHTML = this.skeletonHTML();

        try {
            const res = await fetch(`${API_BASE_URL}/inquiries`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await res.json();

            if (result.success) {
                this.inquiries = result.data;
                this.render();
            } else if (res.status === 401) {
                this.showToast('Session expired. Redirecting…', 'error');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                this.showError('Could not load data.');
            }
        } catch (e) {
            console.error(e);
            this.showError('Cannot connect to server.');
        }
    }

    skeletonHTML() {
        return [1, 2].map(() => `
            <div class="bg-white rounded-xl p-5 border border-gray-100 mb-4">
                <div class="skeleton skeleton-title mb-2"></div>
                <div class="skeleton skeleton-text mb-1"></div>
                <div class="skeleton skeleton-text" style="width:65%"></div>
                <div class="flex gap-2 mt-4">
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                </div>
            </div>`).join('');
    }

    showError(msg) {
        const html = `<div class="text-center py-12 text-gray-400">
            <i class="fas fa-plug text-3xl mb-2 block text-red-300"></i><p>${msg}</p></div>`;
        document.getElementById('inquiry-list').innerHTML = html;
        document.getElementById('appointment-list').innerHTML = html;
    }

    render() {
        const search   = document.getElementById('search-input').value.toLowerCase();
        const status   = document.getElementById('status-filter').value;
        const industry = document.getElementById('industry-filter').value;

        // Inquiries tab: all records filtered by search + status + industry
        const filtered = this.inquiries.filter(i => this.matches(i, search, status, industry));

        // Appointments tab: only confirmed + in-progress (upcoming)
        const upcoming = this.inquiries.filter(i =>
            (i.status === 'confirmed' || i.status === 'in-progress') &&
            this.matches(i, search, '', '')
        );

        // Badge: pending count on Inquiries, upcoming count on Appointments
        const pendingCount  = this.inquiries.filter(i => i.status === 'pending').length;
        const upcomingCount = this.inquiries.filter(i => i.status === 'confirmed' || i.status === 'in-progress').length;
        document.getElementById('badge-inquiries').textContent    = pendingCount;
        document.getElementById('badge-appointments').textContent = upcomingCount;

        // Update the "All Inquiries" label with total
        const statusSel = document.getElementById('status-filter');
        const allOpt = Array.from(statusSel.options).find(o => o.value === '');
        if (allOpt) allOpt.textContent = `All Inquiries (${this.inquiries.length})`;

        // Render inquiry list
        const inqList = document.getElementById('inquiry-list');
        const noInq   = document.getElementById('no-results-inquiries');
        if (filtered.length === 0) {
            inqList.innerHTML = '';
            noInq.classList.remove('hidden');
        } else {
            noInq.classList.add('hidden');
            inqList.innerHTML = filtered.map(i => this.buildCard(i)).join('');
        }

        // Render appointment list
        const apptList = document.getElementById('appointment-list');
        const noAppt   = document.getElementById('no-results-appointments');
        if (upcoming.length === 0) {
            apptList.innerHTML = '';
            noAppt.classList.remove('hidden');
        } else {
            noAppt.classList.add('hidden');
            apptList.innerHTML = upcoming.map(i => this.buildCard(i, true)).join('');
        }
    }

    matches(inq, search, status, industry) {
        const matchSearch = !search || [
            inq.clientName, inq.company, inq.clientEmail, inq.serviceType
        ].some(v => (v || '').toLowerCase().includes(search));

        const matchStatus = !status || inq.status === status;

        const matchIndustry = !industry ||
            (inq.company || '').toLowerCase().includes(industry);

        return matchSearch && matchStatus && matchIndustry;
    }

    buildCard(inq, isAppointmentTab = false) {
        const template = document.getElementById('inquiry-card-template');
        const clone    = template.content.cloneNode(true);

        // Status badge
        const badge = clone.querySelector('.inquiry-status-badge');
        badge.className = `inquiry-status-badge px-2.5 py-0.5 rounded-full text-xs font-semibold ${this.statusClass(inq.status)}`;
        badge.textContent = inq.status.charAt(0).toUpperCase() + inq.status.slice(1).replace('-', '-');

        // Client info
        clone.querySelector('.inquiry-name').textContent    = inq.clientName || '—';
        clone.querySelector('.inquiry-company').textContent = inq.company    || '—';
        clone.querySelector('.inquiry-address').textContent = inq.address    || '—';
        clone.querySelector('.inquiry-contact').textContent =
            `${inq.clientEmail || ''}${inq.phone ? ' • ' + inq.phone : ''}`;
        clone.querySelector('.inquiry-id').textContent   = String(inq._id).padStart(6, '0').slice(-6).toUpperCase();
        clone.querySelector('.inquiry-date').textContent = this.fmtDate(inq.createdAt);

        // Service / date / time grid
        clone.querySelector('.inquiry-serviceType').textContent    = inq.serviceType   || '—';
        clone.querySelector('.inquiry-requestedDate').textContent  = this.fmtDate(inq.requestedDate);
        clone.querySelector('.inquiry-requestedTime').textContent  = inq.requestedTime || '—';
        clone.querySelector('.inquiry-message').textContent        = inq.message       || '';

        // Show price column when there is a quote
        if (inq.price_estimate) {
            const priceCol  = clone.querySelector('.inquiry-price-col');
            const grid      = clone.querySelector('.inquiry-details-grid');
            priceCol.classList.remove('hidden');
            grid.classList.add('has-price');
            clone.querySelector('.inquiry-price').textContent =
                `₱${parseFloat(inq.price_estimate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        }

        // Assigned staff display
        if (inq.staff_name) {
            const staffRow = clone.querySelector('.inquiry-staff-row');
            staffRow.classList.remove('hidden');
            staffRow.classList.add('flex');
            clone.querySelector('.inquiry-staff-name').textContent = inq.staff_name;
        }

        // Cancel reason banner
        if (inq.status === 'cancelled' && inq.cancel_reason) {
            const banner = clone.querySelector('.inquiry-cancel-reason');
            banner.classList.remove('hidden');
            clone.querySelector('.cancel-reason-text').textContent = `Reason: ${inq.cancel_reason}`;
        }

        // Inject action buttons based on status
        clone.querySelector('.card-actions').innerHTML = this.buildActions(inq.status, isAppointmentTab);

        // Set data-id on root card
        const card = clone.querySelector('.inquiry-card');
        card.setAttribute('data-id', inq._id);

        const wrap = document.createElement('div');
        wrap.appendChild(clone);
        return wrap.innerHTML;
    }

    buildActions(status, isAppointmentTab) {
        const assignBtn = `<button type="button" onclick="assignStaff(event)"
            class="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium flex items-center gap-1.5">
            <i class="fas fa-hard-hat text-xs"></i> Assign</button>`;

        const editBtn = `<button type="button" onclick="editInquiry(event)"
            class="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1.5">
            <i class="fas fa-edit text-xs"></i> Edit</button>`;

        const deleteBtn = `<button type="button" onclick="deleteInquiry(event)"
            class="px-3 py-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-center">
            <i class="fas fa-trash text-xs"></i></button>`;

        const cancelBtn = `<button type="button" onclick="updateInquiryStatus(event,'cancelled')"
            class="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-1">
            <i class="fas fa-times text-xs"></i> Cancel</button>`;

        if (isAppointmentTab) {
            // Appointments tab: lean action set
            if (status === 'confirmed' || status === 'in-progress') {
                const nextLabel = status === 'confirmed' ? 'Mark In-Progress' : 'Mark Completed';
                const nextStatus = status === 'confirmed' ? 'in-progress' : 'completed';
                const nextIcon  = status === 'confirmed' ? 'fa-arrow-right' : 'fa-check-circle';
                return `<button type="button" onclick="updateInquiryStatus(event,'${nextStatus}')"
                    class="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                    <i class="fas ${nextIcon} text-xs"></i> ${nextLabel}</button>
                    ${cancelBtn}`;
            }
            return '';
        }

        // Inquiries tab: full lifecycle buttons
        switch (status) {
            case 'pending':
                return `${editBtn}${assignBtn}
                    <button type="button" onclick="openQuoteModal(event)"
                        class="flex-1 px-3 py-2 bg-[#2c0e0e] text-white rounded-lg hover:bg-[#4a1c1c] transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                        <i class="fas fa-tag text-xs"></i> Set Quote & Confirm</button>
                    ${cancelBtn}${deleteBtn}`;

            case 'confirmed':
                return `${editBtn}${assignBtn}
                    <button type="button" onclick="updateInquiryStatus(event,'in-progress')"
                        class="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                        <i class="fas fa-arrow-right text-xs"></i> Mark In-Progress</button>
                    ${cancelBtn}${deleteBtn}`;

            case 'in-progress':
                return `${editBtn}${assignBtn}
                    <button type="button" onclick="updateInquiryStatus(event,'completed')"
                        class="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                        <i class="fas fa-check-circle text-xs"></i> Mark Completed</button>
                    ${cancelBtn}${deleteBtn}`;

            case 'completed':
                return `${editBtn}${deleteBtn}`;

            case 'cancelled':
                return `${editBtn}
                    <button type="button" onclick="updateInquiryStatus(event,'pending')"
                        class="flex-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                        <i class="fas fa-undo text-xs"></i> Restore to Pending</button>
                    ${deleteBtn}`;

            default:
                return `${editBtn}${deleteBtn}`;
        }
    }

    statusClass(status) {
        return {
            'pending':     'bg-yellow-100 text-yellow-700',
            'confirmed':   'bg-green-100 text-green-700',
            'in-progress': 'bg-blue-100 text-blue-700',
            'completed':   'bg-emerald-100 text-emerald-700',
            'cancelled':   'bg-red-100 text-red-600',
        }[status] || 'bg-gray-100 text-gray-600';
    }

    fmtDate(str) {
        if (!str) return '—';
        return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // ── Edit modal ─────────────────────────────────────────
    openEdit(id) {
        const inq = this.inquiries.find(i => i._id == id);
        if (!inq) return;
        this.editingId = id;

        document.getElementById('modal-title').textContent = 'Edit Inquiry';
        document.getElementById('inquiry-id').value         = id;
        document.getElementById('clientName').value         = inq.clientName    || '';
        document.getElementById('company').value            = inq.company       || '';
        document.getElementById('clientEmail').value        = inq.clientEmail   || '';
        document.getElementById('phone').value              = inq.phone         || '';
        document.getElementById('address').value            = inq.address       || '';
        document.getElementById('serviceType').value        = inq.serviceType   || '';
        document.getElementById('requestedDate').value      = inq.requestedDate || '';
        const rawTime = inq.requestedTime || '';
        document.getElementById('requestedTime').value      =
            rawTime.includes('M') ? this.to24h(rawTime) : rawTime.slice(0, 5);
        document.getElementById('message').value            = inq.message       || '';
        document.getElementById('modal-status').value       = inq.status        || 'pending';

        document.getElementById('inquiry-modal').classList.remove('hidden');
    }

    to24h(time12) {
        const [time, period] = time12.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    closeEdit() {
        document.getElementById('inquiry-modal').classList.add('hidden');
        this.editingId = null;
    }

    async submitEdit() {
        const id = this.editingId;
        if (!id) return;

        const body = {
            clientName:    document.getElementById('clientName').value,
            company:       document.getElementById('company').value,
            clientEmail:   document.getElementById('clientEmail').value,
            phone:         document.getElementById('phone').value,
            address:       document.getElementById('address').value,
            serviceType:   document.getElementById('serviceType').value,
            requestedDate: document.getElementById('requestedDate').value,
            requestedTime: document.getElementById('requestedTime').value,
            message:       document.getElementById('message').value,
            status:        document.getElementById('modal-status').value,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (result.success) {
                const inq = this.inquiries.find(i => i._id == id);
                logAudit('Edit Inquiry', 'Inquiry', `Updated inquiry ${String(id).slice(-6).toUpperCase()} for ${inq ? inq.clientName : ''}`);
                this.showToast('Inquiry updated successfully.', 'success');
                this.closeEdit();
                await this.loadInquiries();
            } else {
                this.showToast('Error saving changes.', 'error');
            }
        } catch (e) {
            this.showToast('Cannot connect to server.', 'error');
        }
    }

    // ── Quote modal ────────────────────────────────────────
    openQuote(id) {
        const inq = this.inquiries.find(i => i._id == id);
        if (!inq) return;
        this.quoteTargetId = id;

        document.getElementById('qm-client').textContent   = inq.clientName;
        document.getElementById('qm-service').textContent  = inq.serviceType || '—';
        document.getElementById('qm-datetime').textContent =
            `${inq.requestedDate || '—'}  at  ${inq.requestedTime || '—'}`;
        document.getElementById('quote-price').value = inq.price_estimate || '';
        document.getElementById('quote-notes').value  = '';
        document.getElementById('quote-price-error').classList.add('hidden');
        document.getElementById('quote-modal').classList.remove('hidden');
    }

    closeQuote() {
        document.getElementById('quote-modal').classList.add('hidden');
        this.quoteTargetId = null;
    }

    // ── Staff assignment ───────────────────────────────────
    async loadStaff() {
        try {
            const res    = await fetch(`${API_BASE_URL}/staff`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await res.json();
            if (result.success) this.staffList = result.data.staff || [];
        } catch { /* silent — staff list is optional */ }
    }

    openAssign(id) {
        const inq = this.inquiries.find(i => i._id == id);
        if (!inq) return;
        this.assigningId = id;

        document.getElementById('am-client').textContent  = inq.clientName;
        document.getElementById('am-service').textContent = inq.serviceType || '—';

        const sel = document.getElementById('assign-staff-select');
        sel.innerHTML = '<option value="">— Select a staff member —</option>'
            + this.staffList.map(s =>
                `<option value="${s.id}" ${inq.staff_id == s.id ? 'selected' : ''}>${s.name} (${s.role})</option>`
              ).join('');

        document.getElementById('assign-staff-error').classList.add('hidden');
        document.getElementById('assign-modal').classList.remove('hidden');
    }

    closeAssign() {
        document.getElementById('assign-modal').classList.add('hidden');
        this.assigningId = null;
    }

    async submitAssign() {
        const id      = this.assigningId;
        const staffId = document.getElementById('assign-staff-select').value;

        if (!staffId) {
            document.getElementById('assign-staff-error').classList.remove('hidden');
            return;
        }
        document.getElementById('assign-staff-error').classList.add('hidden');

        const staff = this.staffList.find(s => s.id == staffId);
        const inq   = this.inquiries.find(i => i._id == id);

        try {
            const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body:    JSON.stringify({ staff_id: parseInt(staffId), staff_name: staff ? staff.name : '' })
            });
            const result = await res.json();
            if (result.success) {
                logAudit('Assign Staff', 'Inquiry',
                    `Assigned ${staff ? staff.name : 'staff'} to inquiry ${String(id).slice(-6).toUpperCase()} for ${inq ? inq.clientName : ''}`);
                this.showToast('Staff assigned successfully.', 'success');
                this.closeAssign();
                await this.loadInquiries();
            } else {
                this.showToast(result.message || 'Error assigning staff.', 'error');
            }
        } catch (e) {
            this.showToast('Cannot connect to server.', 'error');
        }
    }

    async submitQuote() {
        const id    = this.quoteTargetId;
        const price = parseFloat(document.getElementById('quote-price').value);
        const notes = document.getElementById('quote-notes').value.trim();

        if (!price || price <= 0) {
            document.getElementById('quote-price-error').classList.remove('hidden');
            return;
        }
        document.getElementById('quote-price-error').classList.add('hidden');

        try {
            const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({
                    status: 'confirmed',
                    price_estimate: price,
                    ...(notes && { message: notes })
                })
            });
            const result = await res.json();
            if (result.success) {
                const inq = this.inquiries.find(i => i._id == id);
                logAudit('Confirm Inquiry', 'Inquiry',
                    `Confirmed inquiry ${String(id).slice(-6).toUpperCase()} for ${inq ? inq.clientName : ''} — Quote: ₱${price.toLocaleString()}`);
                this.showToast('Appointment confirmed with quote!', 'success');
                this.closeQuote();
                await this.loadInquiries();
                window.switchTab('appointments');
            } else {
                this.showToast('Error confirming appointment.', 'error');
            }
        } catch (e) {
            this.showToast('Cannot connect to server.', 'error');
        }
    }

    showToast(msg, type = 'info') {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
    }
}

// ── Global wrappers ────────────────────────────────────────
window.switchTab = function (tab) {
    const mgr = window.inquiriesManager;
    if (mgr) mgr.activeTab = tab;
    document.getElementById('section-inquiries').classList.toggle('hidden', tab !== 'inquiries');
    document.getElementById('section-appointments').classList.toggle('hidden', tab !== 'appointments');
    document.getElementById('tab-inquiries').classList.toggle('active-tab', tab === 'inquiries');
    document.getElementById('tab-appointments').classList.toggle('active-tab', tab === 'appointments');
};

window.editInquiry = function (e) {
    e.preventDefault();
    const id = e.target.closest('.inquiry-card').getAttribute('data-id');
    window.inquiriesManager.openEdit(id);
};

window.closeInquiryModal = function () {
    window.inquiriesManager.closeEdit();
};

window.openQuoteModal = function (e) {
    e.preventDefault();
    const id = e.target.closest('.inquiry-card').getAttribute('data-id');
    window.inquiriesManager.openQuote(id);
};

window.closeQuoteModal = function () {
    window.inquiriesManager.closeQuote();
};

window.submitQuote = function () {
    window.inquiriesManager.submitQuote();
};

window.updateInquiryStatus = async function (e, newStatus) {
    e.preventDefault();
    const id  = e.target.closest('.inquiry-card').getAttribute('data-id');
    const mgr = window.inquiriesManager;
    const inq = mgr.inquiries.find(i => i._id == id);
    const name = inq ? inq.clientName : 'this client';

    async function doUpdate(body) {
        try {
            const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mgr.token}` },
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (result.success) {
                logAudit('Update Status', 'Inquiry',
                    `Set inquiry ${String(id).slice(-6).toUpperCase()} to "${body.status}" for ${inq ? inq.clientName : ''}`);
                mgr.showToast(`Status updated to ${body.status}.`, 'success');
                await mgr.loadInquiries();
            } else {
                mgr.showToast('Error updating status.', 'error');
            }
        } catch (err) {
            mgr.showToast('Cannot connect to server.', 'error');
        }
    }

    if (newStatus === 'cancelled') {
        window.showCancelWithReason({
            title: 'Cancel Appointment?',
            message: `You are about to cancel the appointment from ${name}.`,
            confirmText: 'Cancel Appointment',
            onConfirm: (reason) => doUpdate({ status: 'cancelled', cancel_reason: reason })
        });
    } else if (newStatus === 'completed') {
        window.showConfirm({
            title: 'Mark as Completed?',
            message: `Confirm that the appointment for ${name} has been completed?`,
            confirmText: 'Yes, Complete',
            type: 'success',
            onConfirm: () => doUpdate({ status: 'completed' })
        });
    } else if (newStatus === 'in-progress') {
        window.showConfirm({
            title: 'Mark as In-Progress?',
            message: `Mark the appointment for ${name} as in-progress?`,
            confirmText: 'Yes, Mark In-Progress',
            type: 'info',
            onConfirm: () => doUpdate({ status: 'in-progress' })
        });
    } else {
        // pending restore, no confirm needed
        await doUpdate({ status: newStatus });
        mgr.showToast('Inquiry restored to pending.', 'success');
    }
};

window.assignStaff = function (e) {
    e.preventDefault();
    const id = e.target.closest('.inquiry-card').getAttribute('data-id');
    window.inquiriesManager.openAssign(id);
};

window.closeAssignModal = function () {
    window.inquiriesManager.closeAssign();
};

window.submitAssign = function () {
    window.inquiriesManager.submitAssign();
};

window.deleteInquiry = function (e) {
    e.preventDefault();
    const id  = e.target.closest('.inquiry-card').getAttribute('data-id');
    const mgr = window.inquiriesManager;
    const inq = mgr.inquiries.find(i => i._id == id);

    window.showConfirm({
        title: 'Delete Inquiry?',
        message: `The inquiry from ${inq ? inq.clientName : 'this client'} will be permanently deleted.`,
        confirmText: 'Delete',
        type: 'danger',
        onConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/inquiries/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${mgr.token}` }
                });
                const result = await res.json();
                if (result.success) {
                    logAudit('Delete Inquiry', 'Inquiry', `Deleted inquiry ID: ${String(id).slice(-6).toUpperCase()}`);
                    mgr.showToast('Inquiry deleted.', 'success');
                    await mgr.loadInquiries();
                } else {
                    mgr.showToast('Error deleting inquiry.', 'error');
                }
            } catch (err) {
                mgr.showToast('Cannot connect to server.', 'error');
            }
        }
    });
};

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    window.inquiriesManager = new InquiriesManager();

    // Edit form submit
    document.getElementById('inquiry-form').addEventListener('submit', function (e) {
        e.preventDefault();
        window.inquiriesManager.submitEdit();
    });

    // Close edit modal on backdrop click
    document.getElementById('inquiry-modal').addEventListener('click', function (e) {
        if (e.target === this) window.inquiriesManager.closeEdit();
    });

    // Close quote modal on backdrop click
    document.getElementById('quote-modal').addEventListener('click', function (e) {
        if (e.target === this) window.inquiriesManager.closeQuote();
    });

    // Close assign modal on backdrop click
    document.getElementById('assign-modal').addEventListener('click', function (e) {
        if (e.target === this) window.inquiriesManager.closeAssign();
    });

    // Logout
    const logoutModal = document.getElementById('logoutModal');
    const showModal   = () => { logoutModal.classList.add('show'); document.body.style.overflow = 'hidden'; };
    const hideModal   = () => { logoutModal.classList.remove('show'); document.body.style.overflow = ''; };
    document.getElementById('logoutButton')?.addEventListener('click', showModal);
    document.getElementById('cancelLogoutBtn')?.addEventListener('click', hideModal);
    document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => {
        logAudit('Logout', 'System', 'Admin logged out');
        localStorage.removeItem('token'); localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
    window.handleModalBackdrop = (e) => { if (e.target === logoutModal) hideModal(); };

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (logoutModal?.classList.contains('show')) hideModal();
        window.inquiriesManager.closeEdit();
        window.inquiriesManager.closeQuote();
        window.inquiriesManager.closeAssign();
    });
});

// ── Back to top ───────────────────────────────────────────
(function () {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300), { passive: true });
})();
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ── Greeting ──────────────────────────────────────────────
(function () {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const emoji    = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
    const topbar   = document.querySelector('.mobile-topbar span');
    if (topbar) topbar.textContent = 'Algimon Admin';
    const el = document.getElementById('page-greeting');
    if (el) el.innerHTML = greeting + ' ' + emoji;
})();

// ── Global toast ──────────────────────────────────────────
window.showToast = function (message, type) {
    type = type || 'info';
    const inner = document.getElementById('toast-inner');
    const icon  = document.getElementById('toast-icon');
    const msg   = document.getElementById('toast-message');
    if (!inner || !icon || !msg) return;
    const icons = {
        success: 'fa-check-circle text-green-400',
        error:   'fa-exclamation-circle text-red-400',
        warning: 'fa-exclamation-triangle text-yellow-400',
        info:    'fa-info-circle text-blue-400'
    };
    inner.className = inner.className.replace(/toast-\S+/g, '').replace(/bg-\S+/g, '').trim();
    inner.classList.add('flex','items-center','gap-3','px-4','py-3','rounded-xl',
        'shadow-2xl','text-sm','font-medium','transition-all','duration-300','text-white','toast-' + type);
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};
