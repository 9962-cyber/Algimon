// ── AUDIT TRAIL PAGE ──────────────────────────────────────────────────────────
const API_BASE = 'http://localhost/algimon-api';

function _token() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function _headers() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _token() };
}

// ── DISPLAY HELPERS ───────────────────────────────────────────────────────────
function getEntityBadgeClass(entity) {
    return { Inquiry:'entity-Inquiry', Staff:'entity-Staff', Product:'entity-Product', System:'entity-System' }[entity] || 'entity-System';
}

function getActionIcon(action) {
    const map = {
        'Login':'fa-sign-in-alt', 'Update Status':'fa-exchange-alt', 'Update Inquiry':'fa-edit',
        'Delete Inquiry':'fa-trash-alt', 'Decline Inquiry':'fa-times-circle',
        'Add Staff':'fa-user-plus', 'Update Staff':'fa-user-edit', 'Delete Staff':'fa-user-minus',
        'Clock In':'fa-sign-in-alt', 'Clock Out':'fa-sign-out-alt',
        'Add Product':'fa-plus-circle', 'Update Product':'fa-box', 'Delete Product':'fa-trash-alt',
        'Add Service':'fa-concierge-bell', 'Update Service':'fa-pen', 'Delete Service':'fa-trash-alt',
        'Update Time Slots':'fa-clock', 'Block Date':'fa-calendar-times', 'Unblock Date':'fa-calendar-check',
        'Export Report':'fa-download',
    };
    return map[action] || 'fa-info-circle';
}

function getActionColor(action) {
    const map = {
        'Login':'#3b82f6',
        'Update Status':'#f59e0b', 'Update Inquiry':'#f59e0b', 'Update Staff':'#f59e0b',
        'Update Product':'#f59e0b', 'Update Service':'#f59e0b', 'Update Time Slots':'#8b5cf6',
        'Delete Inquiry':'#ef4444', 'Decline Inquiry':'#ef4444', 'Delete Staff':'#ef4444',
        'Delete Product':'#ef4444', 'Delete Service':'#ef4444', 'Block Date':'#ef4444',
        'Add Staff':'#22c55e', 'Add Product':'#22c55e', 'Add Service':'#22c55e',
        'Clock In':'#22c55e', 'Unblock Date':'#22c55e',
        'Clock Out':'#6b7280', 'Export Report':'#8b5cf6',
    };
    return map[action] || '#6b7280';
}

function formatTimestamp(raw) {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
         + ' '
         + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let allLogs    = [];
let allActions = [];
let globalStats = { total:0, today:0, this_week:0, active_users:0 };

// ── LOAD FROM API ─────────────────────────────────────────────────────────────
async function loadLogs() {
    const search = document.getElementById('search-input')?.value.trim()   || '';
    const entity = document.getElementById('entity-filter')?.value          || '';
    const action = document.getElementById('action-filter')?.value          || '';

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);

    const container = document.getElementById('activity-log');
    const noLog     = document.getElementById('no-log');
    if (container) container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl text-red-700 opacity-50 block mb-2"></i>
            Loading logs…
        </div>`;
    noLog?.classList.add('hidden');

    try {
        const res  = await fetch(`${API_BASE}/audit-logs?${params}`, { headers: _headers() });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'API error');

        allLogs     = json.data.logs;
        allActions  = json.data.actions;
        globalStats = json.data.stats;

        _populateActionDropdown();
        _renderStats();
        _renderLogs();
    } catch (err) {
        if (container) container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-plug text-2xl text-red-300 block mb-2"></i>
                Could not load audit logs: ${err.message}
            </div>`;
        console.error('Audit trail load error:', err);
    }
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function _renderStats() {
    document.getElementById('stat-total').textContent = globalStats.total;
    document.getElementById('stat-today').textContent = globalStats.today;
    document.getElementById('stat-week').textContent  = globalStats.this_week;
    document.getElementById('stat-users').textContent = globalStats.active_users;
}

function _renderLogs() {
    const container = document.getElementById('activity-log');
    const noLog     = document.getElementById('no-log');
    if (!container) return;

    if (!allLogs.length) {
        container.innerHTML = '';
        noLog?.classList.remove('hidden');
        return;
    }
    noLog?.classList.add('hidden');

    container.innerHTML = allLogs.map(log => `
        <div class="log-entry" data-log-id="${log.id}">
            <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 flex-1">
                    <div class="icon-wrap" style="background:${getActionColor(log.action)}20;">
                        <i class="fas ${getActionIcon(log.action)} text-base" style="color:${getActionColor(log.action)};"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-gray-800">${_esc(log.action)}</span>
                            <span class="entity-badge ${getEntityBadgeClass(log.entity)}">${_esc(log.entity)}</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">${_esc(log.details || '—')}</p>
                        <div class="flex items-center gap-4 text-xs text-gray-400">
                            <span><i class="fas fa-user mr-1"></i>${_esc(log.user)}</span>
                            <span><i class="far fa-calendar mr-1"></i>${formatTimestamp(log.created_at)}</span>
                            <span class="text-gray-300">ID: #${log.id}</span>
                        </div>
                    </div>
                </div>
                <button onclick="deleteLogEntry(${log.id})" title="Delete this entry"
                    class="shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all p-1.5 rounded-lg">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _populateActionDropdown() {
    const sel = document.getElementById('action-filter');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">All Actions</option>'
        + allActions.map(a => `<option value="${_esc(a)}" ${a === current ? 'selected' : ''}>${_esc(a)}</option>`).join('');
}

// ── DELETE SINGLE ENTRY ───────────────────────────────────────────────────────
window.deleteLogEntry = function(logId) {
    showConfirm({
        title:       'Delete Log Entry?',
        message:     'This audit record will be permanently removed.',
        confirmText: 'Delete Entry',
        type:        'danger',
        onConfirm:   async () => {
            try {
                const res  = await fetch(`${API_BASE}/audit-logs/${logId}`, { method:'DELETE', headers: _headers() });
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
                showToast('Log entry deleted', 'success');
                loadLogs();
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    });
};

// ── CLEAR ALL ─────────────────────────────────────────────────────────────────
function clearLog() {
    showConfirm({
        title:       'Clear All Audit Logs?',
        message:     `All ${globalStats.total} log entries will be permanently deleted. This cannot be undone.`,
        confirmText: 'Clear All Logs',
        type:        'clear',
        onConfirm:   async () => {
            try {
                const res  = await fetch(`${API_BASE}/audit-logs`, { method:'DELETE', headers: _headers() });
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
                showToast('All audit logs cleared', 'success');
                loadLogs();
            } catch (err) {
                showToast('Clear failed: ' + err.message, 'error');
            }
        }
    });
}

// ── LOGOUT MODAL ──────────────────────────────────────────────────────────────
(function() {
    const modal = document.getElementById('logoutModal');
    const show  = () => { modal?.classList.add('show'); document.body.style.overflow = 'hidden'; };
    const hide  = () => { modal?.classList.remove('show'); document.body.style.overflow = ''; };

    document.getElementById('logoutButton')?.addEventListener('click', show);
    document.getElementById('cancelLogoutBtn')?.addEventListener('click', hide);
    document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => {
        logAudit('Logout', 'System', 'Admin logged out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
    window.handleModalBackdrop = e => { if (e.target === modal) hide(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('show')) hide(); });
})();

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Filter controls — re-query the API on every change
    document.getElementById('search-input')?.addEventListener('input',  loadLogs);
    document.getElementById('entity-filter')?.addEventListener('change', loadLogs);
    document.getElementById('action-filter')?.addEventListener('change', loadLogs);

    // Refresh button
    document.getElementById('refresh-log')?.addEventListener('click', () => {
        loadLogs();
        showToast('Logs refreshed', 'success');
    });

    // Clear All button
    document.getElementById('clear-all-log')?.addEventListener('click', clearLog);

    // Re-load when another tab writes a new audit entry
    window.addEventListener('audit-log-added', loadLogs);

    // Initial load
    loadLogs();
});

// ── USER INFO ─────────────────────────────────────────────────────────────────
(function() {
    try {
        const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        if (u.name) {
            document.getElementById('user-name')?.setAttribute('textContent', u.name); // set below
            const nameEl = document.getElementById('user-name');
            const mailEl = document.getElementById('user-email');
            const avatEl = document.getElementById('user-avatar');
            if (nameEl) nameEl.textContent = u.name;
            if (mailEl) mailEl.textContent = u.email || '';
            if (avatEl) avatEl.textContent = (u.name || 'A')[0].toUpperCase();
        }
    } catch { /* ignore */ }
})();

// ── BACK TO TOP ───────────────────────────────────────────────────────────────
(function() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300), { passive:true });
})();

window.scrollToTop = function() { window.scrollTo({ top:0, behavior:'smooth' }); };

// ── GREETING ─────────────────────────────────────────────────────────────────
(function() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('page-greeting');
    if (el) el.textContent = g;
})();

// ── GLOBAL TOAST ──────────────────────────────────────────────────────────────
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
    inner.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 text-white toast-' + type;
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};
