const API_BASE = 'http://localhost/algimon-api';

function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };
}

async function apiGet(path) {
    const res  = await fetch(API_BASE + path, { headers: getAuthHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'API error');
    return json.data;
}

// ── PERFORMANCE MANAGER ────────────────────────────────────────────────────────
class PerformanceManager {
    constructor() {
        this.currentUser  = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        this.selectedMonth = this._thisMonth();   // "YYYY-MM"
        this.charts       = {};
        this.reportData   = null;
        this.init();
    }

    _thisMonth() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    _monthLabel(yyyyMM) {
        const [y, m] = yyyyMM.split('-');
        const names  = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        return `${names[parseInt(m) - 1]} ${y}`;
    }

    populateMonthDropdown() {
        const sel    = document.getElementById('month-select');
        if (!sel) return;
        const names  = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const now    = new Date();
        sel.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const opt = document.createElement('option');
            opt.value       = val;
            opt.textContent = `${names[d.getMonth()]} ${d.getFullYear()}`;
            if (val === this.selectedMonth) opt.selected = true;
            sel.appendChild(opt);
        }
    }

    async init() {
        this._updateUserInfo();
        this.populateMonthDropdown();
        this._setupEventListeners();
        this._showLoading();
        await this.loadReport();
    }

    _updateUserInfo() {
        const u = this.currentUser;
        if (u.name) {
            document.getElementById('user-name').textContent  = u.name;
            document.getElementById('user-email').textContent = u.email || '';
            document.getElementById('user-avatar').textContent = (u.name || 'A')[0].toUpperCase();
        }
    }

    _showLoading() {
        const tbody = document.getElementById('appointment-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl text-red-700 opacity-50 block mb-2"></i>Loading data…</td></tr>`;
        document.getElementById('no-appointments')?.classList.add('hidden');
    }

    async loadReport() {
        try {
            this.reportData = await apiGet(`/reports/performance?month=${this.selectedMonth}`);
            this._updateStats();
            this._updateCharts();
            this._updateTable();
        } catch (err) {
            showToast('Failed to load report: ' + err.message, 'error');
            const tbody = document.getElementById('appointment-table-body');
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-400">
                <i class="fas fa-plug text-2xl text-red-300 block mb-2"></i>Cannot connect to server.</td></tr>`;
        }
    }

    _setupEventListeners() {
        document.getElementById('month-select')?.addEventListener('change', e => {
            this.selectedMonth = e.target.value;
            this._showLoading();
            this.loadReport();
        });

        const modal    = document.getElementById('logoutModal');
        const show     = () => { modal.classList.add('show'); document.body.style.overflow = 'hidden'; };
        const hide     = () => { modal.classList.remove('show'); document.body.style.overflow = ''; };
        document.getElementById('logoutButton')?.addEventListener('click', show);
        document.getElementById('cancelLogoutBtn')?.addEventListener('click', hide);
        document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => {
            if (typeof logAudit === 'function') logAudit('Logout', 'System', 'Admin logged out');
            localStorage.clear(); sessionStorage.clear();
            window.location.href = 'login.html';
        });
        window.handleModalBackdrop = e => { if (e.target === modal) hide(); };
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) hide(); });
    }

    _updateStats() {
        const m = this.reportData.metrics;

        document.getElementById('stat-total').textContent             = m.total;
        document.getElementById('stat-revenue').textContent           = `₱${Number(m.revenue).toLocaleString()}`;
        document.getElementById('stat-completed').textContent         = m.completed;
        document.getElementById('stat-declined').textContent          = m.declined;
        document.getElementById('stat-pending-confirmed').textContent = m.pending + m.confirmed + m.in_progress;
        document.getElementById('stat-completed-revenue').textContent = `₱${Number(m.revenue).toLocaleString()} from completed`;
        document.getElementById('stat-pending-details').textContent   = `${m.pending} pending, ${m.confirmed} confirmed, ${m.in_progress} in-progress`;

        const cmpEl = document.getElementById('stat-completion-rate');
        cmpEl.innerHTML   = `<i class="fas fa-arrow-${m.completion_rate > 0 ? 'up' : 'down'} mr-1"></i> ${m.completion_rate}% completion rate`;
        cmpEl.className   = `stat-change ${m.completion_rate > 0 ? 'positive' : 'negative'}`;

        const canEl = document.getElementById('stat-cancellation-rate');
        canEl.innerHTML   = `<i class="fas fa-arrow-${m.cancellation_rate > 0 ? 'up' : 'down'} mr-1"></i> ${m.cancellation_rate}% cancellation rate`;
        canEl.className   = `stat-change ${m.cancellation_rate > 0 ? 'negative' : 'positive'}`;
    }

    _updateCharts() {
        Object.values(this.charts).forEach(c => c?.destroy());
        this.charts = {};

        const m    = this.reportData.metrics;
        const svcs = this.reportData.top_services;
        const trend = this.reportData.trend;

        // Doughnut — status distribution
        document.getElementById('legend-confirmed').textContent = m.confirmed;
        document.getElementById('legend-completed').textContent = m.completed;
        document.getElementById('legend-pending').textContent   = m.pending;

        this.charts.status = new Chart(
            document.getElementById('statusChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Confirmed', 'Completed', 'Pending'],
                datasets: [{ data: [m.confirmed, m.completed, m.pending],
                             backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // Bar — top services
        this.charts.services = new Chart(
            document.getElementById('servicesChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: svcs.map(s => s.service),
                datasets: [{ label: 'Appointments', data: svcs.map(s => s.count),
                             backgroundColor: '#3b82f6', borderRadius: 6 }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        // Bar — 6-month trend
        this.charts.trend = new Chart(
            document.getElementById('trendChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: trend.map(t => t.month),
                datasets: [
                    { label: 'Completed', data: trend.map(t => t.completed), backgroundColor: '#22c55e', borderRadius: 6 },
                    { label: 'Cancelled', data: trend.map(t => t.cancelled), backgroundColor: '#ef4444', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } } }
            }
        });
    }

    _updateTable() {
        const apts  = this.reportData.appointments;
        const tbody = document.getElementById('appointment-table-body');
        const noEl  = document.getElementById('no-appointments');

        if (!apts.length) {
            tbody.innerHTML = '';
            noEl.classList.remove('hidden');
            return;
        }
        noEl.classList.add('hidden');

        const badge = {
            pending: 'badge-pending', confirmed: 'badge-confirmed', approved: 'badge-confirmed',
            completed: 'badge-completed', cancelled: 'badge-cancelled', declined: 'badge-cancelled',
            'in-progress': 'badge-pending'
        };

        tbody.innerHTML = apts.map(a => {
            const date   = new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-GB');
            const cls    = badge[a.status] || 'badge-pending';
            return `<tr>
                <td><span class="font-semibold">#${String(a.id).padStart(4,'0')}</span></td>
                <td><div class="client-info">${a.client_name || '—'}</div></td>
                <td>${a.service_type || 'N/A'}</td>
                <td>${date}</td>
                <td><span class="price-positive">₱${Number(a.amount).toLocaleString()}</span></td>
                <td><span class="badge ${cls}">${a.status}</span></td>
            </tr>`;
        }).join('');
    }
}

// ── GLOBALS ────────────────────────────────────────────────────────────────────
window.performanceManager = null;

window.exportReport = function() {
    const pm = window.performanceManager;
    if (!pm || !pm.reportData) return;

    const label = pm._monthLabel(pm.selectedMonth);
    const m     = pm.reportData.metrics;
    const apts  = pm.reportData.appointments;

    const rows = [
        ['Performance Report', label], [],
        ['Key Metrics'],
        ['Total Appointments', m.total],
        ['Completed',          m.completed],
        ['Confirmed',          m.confirmed],
        ['In Progress',        m.in_progress],
        ['Pending',            m.pending],
        ['Declined',           m.declined],
        ['Total Revenue',      `₱${Number(m.revenue).toLocaleString()}`],
        ['Completion Rate',    `${m.completion_rate}%`],
        ['Cancellation Rate',  `${m.cancellation_rate}%`],
        [],
        ['Appointment Details'],
        ['ID', 'Client', 'Service', 'Date', 'Amount (₱)', 'Status']
    ];

    apts.forEach(a => {
        const date = new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-GB');
        rows.push([
            `#${String(a.id).padStart(4,'0')}`,
            a.client_name || '—',
            a.service_type || 'N/A',
            date,
            Number(a.amount).toLocaleString(),
            a.status
        ]);
    });

    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `performance-report-${pm.selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    setTimeout(() => {
        if (typeof logAudit === 'function') logAudit('Export Report', 'System', `Exported performance report for ${label} (${apts.length} records)`);
        showToast('Report exported successfully', 'success');
    }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    window.performanceManager = new PerformanceManager();
});

// ── BACK TO TOP ────────────────────────────────────────────────────────────────
(function() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
})();

window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };

// ── TIME-AWARE GREETING ────────────────────────────────────────────────────────
(function() {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('page-greeting');
    if (el) el.textContent = greeting;
})();

// ── GLOBAL TOAST ───────────────────────────────────────────────────────────────
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
        info:    'fa-info-circle text-blue-400'
    };
    inner.style.opacity   = '';
    inner.style.transform = '';
    inner.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 text-white toast-' + type;
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        inner.style.opacity   = '0';
        inner.style.transform = 'translateY(8px)';
    }, 3000);
};
