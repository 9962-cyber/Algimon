// ── AUTH GUARD ──
(function() {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    const adminRoles = ['admin', 'manager'];
    if (!adminRoles.includes(user.type)) {
        window.location.href = 'dash.html';
    }
})();

// ---------- POLYFILL: Canvas roundRect ----------
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}

// ---------- GLOBALS for charts ----------
let hoveredSlice = -1;
let selectedSlice = -1;
let pieAnimProgress = 0;
let pieAnimFrame;
let pieSegs = [];
let pieTotal = 0;

let currentPeriod = 'month';
let barAnimProgress = 0;
let barAnimFrame;
let hoveredBar = -1;
let barRects = [];

const tooltip = document.getElementById('chart-tooltip');

function showTooltip(html, x, y) {
    tooltip.innerHTML = html;
    tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = (y - tooltip.offsetHeight - 12) + 'px';
    tooltip.classList.add('visible');
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

// ---------- PIE LOGIC ----------
function buildSegments(pieData) {
    let start = -Math.PI / 2;
    return pieData.map(d => {
        const sweep = (d.value / pieTotal) * 2 * Math.PI;
        const seg = { ...d, startAngle: start, endAngle: start + sweep, sweep };
        start += sweep;
        return seg;
    });
}

function drawPie(manager, progress = 1) {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 100, cy = 100, r = 80, hole = 36;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieTotal = manager.pieData.reduce((s, d) => s + d.value, 0);
    if (pieTotal === 0) pieTotal = 1;
    pieSegs = buildSegments(manager.pieData);

    pieSegs.forEach((seg, i) => {
        const isHov = hoveredSlice === i;
        const isSel = selectedSlice === i;
        const dim = selectedSlice !== -1 && selectedSlice !== i;
        const pop = (isHov || isSel) ? 8 : 0;
        const midA = (seg.startAngle + seg.endAngle) / 2;
        const ox = Math.cos(midA) * pop;
        const oy = Math.sin(midA) * pop;
        const sweepNow = seg.sweep * progress;
        const endNow = seg.startAngle + sweepNow;
        ctx.save();
        ctx.globalAlpha = dim ? 0.3 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy + oy);
        ctx.arc(cx + ox, cy + oy, r, seg.startAngle, endNow);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        if (isHov || isSel) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    if (selectedSlice !== -1) {
        const seg = pieSegs[selectedSlice];
        const pct = Math.round((seg.value / pieTotal) * 100);
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seg.value, cx, cy - 9);
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = seg.color;
        ctx.fillText(pct + '%', cx, cy + 7);
    } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText(pieTotal, cx, cy - 8);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('total', cx, cy + 9);
    }
}

function animatePie() {
    const manager = window.commandCenterManager;
    if (!manager) return;
    pieAnimProgress = 0;
    cancelAnimationFrame(pieAnimFrame);
    function step() {
        pieAnimProgress = Math.min(pieAnimProgress + 0.04, 1);
        const eased = 1 - Math.pow(1 - pieAnimProgress, 3);
        drawPie(manager, eased);
        if (pieAnimProgress < 1) pieAnimFrame = requestAnimationFrame(step);
    }
    step();
}

function getSliceAt(canvas, mx, my) {
    const rect = canvas.getBoundingClientRect();
    const x = mx - rect.left - 100;
    const y = my - rect.top - 100;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < 36 || dist > 80) return -1;
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    for (let i = 0; i < pieSegs.length; i++) {
        let s = pieSegs[i].startAngle, e = pieSegs[i].endAngle;
        if (s < -Math.PI / 2) {
            s += Math.PI * 2;
            e += Math.PI * 2;
        }
        if (angle >= s && angle < e) return i;
    }
    return -1;
}

window.togglePieSlice = function(i) {
    selectedSlice = selectedSlice === i ? -1 : i;
    document.querySelectorAll('.legend-item').forEach((el, idx) => {
        el.classList.toggle('dimmed', selectedSlice !== -1 && selectedSlice !== idx);
    });
    const manager = window.commandCenterManager;
    if (manager) drawPie(manager);
};

// ---------- BAR CHART ----------
function drawBar(manager, progress = 1) {
    const canvas = document.getElementById('barChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 400;
    canvas.width = W;
    canvas.height = 180;
    const { labels, values, max } = manager.barPeriods[currentPeriod];
    const barW = Math.min(48, Math.floor((canvas.width - 16) / labels.length - 8));
    const padL = 8, padB = 30, padT = 14;
    const chartH = canvas.height - padB - padT;
    const chartW = canvas.width - padL - 16;
    const gap = (chartW - labels.length * barW) / (labels.length + 1);
    barRects = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const val = (max / steps) * i;
        const y = padT + chartH - (val / max) * chartH;
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
    }
    labels.forEach((cat, i) => {
        const x = padL + gap + i * (barW + gap);
        const full = (values[i] / max) * chartH;
        const barH = full * progress;
        const y = padT + chartH - barH;
        const isH = hoveredBar === i;
        barRects.push({ x, y: padT, w: barW, h: chartH, index: i });
        if (isH) {
            ctx.fillStyle = 'rgba(44,14,14,0.06)';
            ctx.beginPath();
            ctx.roundRect(x - 4, padT, barW + 8, chartH, [6, 6, 0, 0]);
            ctx.fill();
        }
        ctx.fillStyle = isH ? '#4a1c1c' : '#2c0e0e';
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();
        if (progress > 0.85) {
            ctx.globalAlpha = (progress - 0.85) / 0.15;
            ctx.fillStyle = isH ? '#2c0e0e' : '#9ca3af';
            ctx.font = isH ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(values[i], x + barW / 2, y - 3);
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(cat, x + barW / 2, padT + chartH + 8);
    });
}

function animateBar() {
    const manager = window.commandCenterManager;
    if (!manager) return;
    barAnimProgress = 0;
    cancelAnimationFrame(barAnimFrame);
    function step() {
        barAnimProgress = Math.min(barAnimProgress + 0.05, 1);
        const eased = 1 - Math.pow(1 - barAnimProgress, 3);
        drawBar(manager, eased);
        if (barAnimProgress < 1) barAnimFrame = requestAnimationFrame(step);
    }
    step();
}

window.setBarPeriod = function(period) {
    currentPeriod = period;
    document.querySelectorAll('.bar-period-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.period === period);
    });
    animateBar();
};

// ---------- MAIN MANAGER ----------
const API_BASE_URL = 'http://localhost/algimon-api';

class CommandCenterManager {
    constructor() {
        this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        this.inquiries = [];
        this.pieData = [
            { label: 'Pending', value: 0, color: '#fb923c' },
            { label: 'Confirmed', value: 0, color: '#3b82f6' },
            { label: 'Completed', value: 0, color: '#22c55e' },
            { label: 'Cancelled', value: 0, color: '#f87171' }
        ];
        this.barPeriods = {
            month:   { labels: ['Commercial', 'Industrial', 'Residential', 'Institutional'], values: [0, 0, 0, 0], max: 5 },
            quarter: { labels: ['Commercial', 'Industrial', 'Residential', 'Institutional'], values: [0, 0, 0, 0], max: 15 },
            year:    { labels: ['Commercial', 'Industrial', 'Residential', 'Institutional'], values: [0, 0, 0, 0], max: 50 },
        };
        this.init();
    }

    updateUserInfo() {
        if (this.currentUser.name) {
            document.getElementById('user-name').textContent = this.currentUser.name;
            document.getElementById('user-email').textContent = this.currentUser.email;
            document.getElementById('user-avatar').textContent = this.currentUser.avatar || 'A';
        }
    }

    async loadInquiries() {
        const apptList = document.getElementById('appointments-list');
        const inqList = document.getElementById('inquiries-list');
const skeletonCards = `
    <div class="space-y-4">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
    </div>
`;
        if (apptList) apptList.innerHTML = skeletonCards;
        if (inqList) inqList.innerHTML = skeletonCards;
        try {
            const response = await fetch(`${API_BASE_URL}/inquiries`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await response.json();
            if (result.success) {
                this.inquiries = result.data;
                this.updateStats();
                this.updateCharts();
                this.renderLists();
            } else {
                if (apptList) apptList.innerHTML = `<p class="text-xs text-gray-400 py-4 text-center">Could not load data.</p>`;
                if (inqList) inqList.innerHTML = `<p class="text-xs text-gray-400 py-4 text-center">Could not load data.</p>`;
            }
        } catch (error) {
            console.error('Error loading inquiries:', error);
            if (apptList) apptList.innerHTML = `<p class="text-xs text-gray-400 py-4 text-center">Cannot connect to server.</p>`;
            if (inqList) inqList.innerHTML = `<p class="text-xs text-gray-400 py-4 text-center">Cannot connect to server.</p>`;
        }
    }

    updateStats() {
        const pending    = this.inquiries.filter(i => i.status === 'pending').length;
        const confirmed  = this.inquiries.filter(i => i.status === 'confirmed').length;
        const inProgress = this.inquiries.filter(i => i.status === 'in-progress').length;
        const completed  = this.inquiries.filter(i => i.status === 'completed').length;
        const cancelled  = this.inquiries.filter(i => i.status === 'cancelled').length;

        document.querySelector('[data-stat="pending"]').textContent    = pending;
        document.querySelector('[data-stat="confirmed"]').textContent  = confirmed;
        document.querySelector('[data-stat="in-progress"]').textContent = inProgress;
        document.querySelector('[data-stat="cancelled"]').textContent  = cancelled;

        this.pieData = [
            { label: 'Pending',     value: pending,    color: '#fb923c' },
            { label: 'Confirmed',   value: confirmed,  color: '#22c55e' },
            { label: 'In-Progress', value: inProgress, color: '#3b82f6' },
            { label: 'Completed',   value: completed,  color: '#10b981' },
            { label: 'Cancelled',   value: cancelled,  color: '#f87171' },
        ];
        document.querySelectorAll('[data-legend-count]').forEach((el, i) => {
            el.textContent = this.pieData[i] ? this.pieData[i].value : 0;
        });

        document.getElementById('blocked-dates-text').textContent  = `0 dates unavailable`;
        document.getElementById('clients-served-text').textContent = `${confirmed + completed} this month`;
    }

    updateCharts() {
        const countByType = (list, type) =>
            list.filter(i => (i.propertyType || '').toLowerCase() === type.toLowerCase()).length;

        const byPeriod = (list, months) => {
            const now   = new Date();
            const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
            return list.filter(i => i.requestedDate && new Date(i.requestedDate) >= cutoff);
        };

        const periodMap = { month: 1, quarter: 3, year: 12 };
        ['month', 'quarter', 'year'].forEach(p => {
            const slice = byPeriod(this.inquiries, periodMap[p]);
            const commercial   = countByType(slice, 'commercial');
            const industrial   = countByType(slice, 'industrial');
            const residential  = countByType(slice, 'residential');
            const institutional = countByType(slice, 'institutional');
            const vals = [commercial, industrial, residential, institutional];
            const maxVal = Math.max(...vals, 1);
            this.barPeriods[p].values = vals;
            this.barPeriods[p].max    = maxVal;
        });

        animatePie();
        animateBar();
    }

    renderLists() {
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const upcoming = this.inquiries
            .filter(i => (i.status === 'confirmed' || i.status === 'in-progress') &&
                         i.requestedDate && new Date(i.requestedDate) >= today)
            .sort((a, b) => new Date(a.requestedDate) - new Date(b.requestedDate))
            .slice(0, 5);

        const recentInquiries = this.inquiries
            .filter(i => i.status === 'pending')
            .slice(0, 5);

        this.renderAppointments(upcoming);
        this.renderInquiries(recentInquiries);
    }

    renderAppointments(items) {
        const container = document.getElementById('appointments-list');
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = `<div class="text-center py-8">
                <i class="fas fa-calendar-check text-3xl text-gray-200 mb-2 block"></i>
                <p class="text-sm text-gray-400">No upcoming appointments</p>
            </div>`;
            return;
        }
        const badgeClass = s => s === 'in-progress'
            ? 'badge-inprogress'
            : 'badge-confirmed';
        const badgeLabel = s => s === 'in-progress' ? 'In-Progress' : 'Confirmed';
        container.innerHTML = items.map(item => `
            <div class="list-item py-3 px-1">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <p class="font-semibold text-gray-800 text-sm truncate">${this.escapeHtml(item.clientName)}</p>
                        <p class="text-xs text-gray-400 mb-1.5 truncate">${this.escapeHtml(item.company || '—')}</p>
                        <div class="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span><i class="fas fa-calendar-alt mr-1 text-gray-300"></i>${this.formatDate(item.requestedDate)}</span>
                            <span><i class="far fa-clock mr-1 text-gray-300"></i>${item.requestedTime || '—'}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1 truncate">${this.escapeHtml(item.serviceType || '—')}</p>
                    </div>
                    <span class="${badgeClass(item.status)} shrink-0">${badgeLabel(item.status)}</span>
                </div>
            </div>
        `).join('');
    }

    renderInquiries(items) {
        const container = document.getElementById('inquiries-list');
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML = `<div class="text-center py-8">
                <i class="fas fa-inbox text-3xl text-gray-200 mb-2 block"></i>
                <p class="text-sm text-gray-400">No pending inquiries</p>
            </div>`;
            return;
        }
        container.innerHTML = items.map(item => `
            <div class="list-item py-3 px-1">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <p class="font-semibold text-gray-800 text-sm truncate">${this.escapeHtml(item.clientName)}</p>
                        <p class="text-xs text-gray-400 mb-1.5 truncate">${this.escapeHtml(item.company || '—')}</p>
                        <div class="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span><i class="fas fa-calendar-alt mr-1 text-gray-300"></i>${this.formatDate(item.requestedDate)}</span>
                            <span><i class="far fa-clock mr-1 text-gray-300"></i>${item.requestedTime || '—'}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1 truncate">${this.escapeHtml(item.serviceType || '—')}</p>
                    </div>
                    <span class="badge-pending shrink-0">Pending</span>
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    async init() {
        this.updateUserInfo();
        await this.loadInquiries();
    }
}

// ---------- BOOTSTRAP ----------
window.addEventListener('load', () => {
    window.commandCenterManager = new CommandCenterManager();
    const pieCanvas = document.getElementById('pieChart');
    const barCanvas = document.getElementById('barChart');
    const manager = window.commandCenterManager;

    if (pieCanvas) {
        pieCanvas.addEventListener('mousemove', e => {
            const idx = getSliceAt(pieCanvas, e.clientX, e.clientY);
            if (idx !== hoveredSlice) {
                hoveredSlice = idx;
                drawPie(manager);
            }
            if (idx !== -1 && pieSegs[idx]) {
                const seg = pieSegs[idx];
                const pct = Math.round((seg.value / pieTotal) * 100);
                showTooltip(`<span style="color:${seg.color}">●</span> ${seg.label}: <b>${seg.value}</b> <span style="opacity:.7">(${pct}%)</span>`, e.clientX, e.clientY);
                pieCanvas.style.cursor = 'pointer';
            } else {
                hideTooltip();
                pieCanvas.style.cursor = 'default';
            }
        });
        pieCanvas.addEventListener('mouseleave', () => {
            hoveredSlice = -1;
            drawPie(manager);
            hideTooltip();
        });
    }

    if (barCanvas) {
        barCanvas.addEventListener('mousemove', e => {
            const rect = barCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            let found = -1;
            for (const br of barRects) {
                if (mx >= br.x && mx <= br.x + br.w && my >= br.y && my <= br.y + br.h) {
                    found = br.index;
                    break;
                }
            }
            if (found !== hoveredBar) {
                hoveredBar = found;
                drawBar(manager);
            }
            if (found !== -1) {
                const { labels, values } = manager.barPeriods[currentPeriod];
                const periodLabel = currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1);
                showTooltip(`<b>${labels[found]}</b>: ${values[found]} clients <span style="opacity:.6">(${periodLabel})</span>`, e.clientX, e.clientY);
                barCanvas.style.cursor = 'pointer';
            } else {
                hideTooltip();
                barCanvas.style.cursor = 'default';
            }
        });
        barCanvas.addEventListener('mouseleave', () => {
            hoveredBar = -1;
            drawBar(manager);
            hideTooltip();
        });
    }

    window.addEventListener('resize', () => {
        if (manager) drawBar(manager);
    });

    // Mobile sidebar handled by inline script in HTML

    // Logout modal logic
    const logoutBtn = document.getElementById('logoutButton');
    const logoutModal = document.getElementById('logoutModal');
    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');

    function showModal() {
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        logoutModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    if (logoutBtn) logoutBtn.addEventListener('click', showModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            logAudit('Logout', 'System', 'Admin logged out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    window.handleModalBackdrop = function(event) {
        if (event.target === logoutModal) hideModal();
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutModal?.classList.contains('show')) hideModal();
    });
});

// ── STAFF DROPDOWN TOGGLE ──
function toggleStaffDropdown() {
    const submenu = document.getElementById('staff-submenu');
    const chevron = document.getElementById('staff-chevron');
    submenu.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
}

// Auto‑expand & highlight if on a Staff sub‑page
(function() {
    const path = window.location.pathname.toLowerCase();
    const isStaffPage = path.includes('staffmanagement') || path.includes('staffattendance');
    const btn = document.getElementById('staff-dropdown-btn');
    const submenu = document.getElementById('staff-submenu');
    const chevron = document.getElementById('staff-chevron');

    if (isStaffPage && btn && submenu && chevron) {
        btn.classList.remove('text-white/70');
        btn.classList.add('text-white', 'bg-white/20', 'shadow-inner', 'font-semibold');
        submenu.classList.remove('hidden');
        chevron.classList.add('rotate-180');
    }
})();

// ── BACK TO TOP ──
(function() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });
})();

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── TIME-AWARE GREETING ──
(function() {
    var h = new Date().getHours();
    var greeting, emoji;
    if (h < 12)      { greeting = 'Good morning';   emoji = '☀️'; }
    else if (h < 17) { greeting = 'Good afternoon';  emoji = '👋'; }
    else             { greeting = 'Good evening';    emoji = '🌙'; }

    // Mobile topbar – static "Algimon Admin"
    var topbar = document.querySelector('.mobile-topbar span');
    if (topbar) topbar.textContent = 'Algimon Admin';

    // Desktop page greeting – dynamic
    var el = document.getElementById('page-greeting');
    if (el) el.innerHTML = greeting + ' ' + emoji;

    // Mobile greeting (dynamic, coloured brand red)
    var mobileGreetingEl = document.getElementById('mobile-greeting');
    if (mobileGreetingEl) mobileGreetingEl.textContent = greeting + ' ' + emoji;
})();

// ── GLOBAL TOAST ──
window.showToast = function(message, type) {
    type = type || 'info';
    var inner = document.getElementById('toast-inner');
    var icon  = document.getElementById('toast-icon');
    var msg   = document.getElementById('toast-message');
    if (!inner || !icon || !msg) return;

    var icons = {
        success: 'fa-check-circle text-green-400',
        error:   'fa-exclamation-circle text-red-400',
        warning: 'fa-exclamation-triangle text-yellow-400',
        info:    'fa-info-circle text-blue-400'
    };

    // Reset classes
    inner.className = inner.className
        .replace(/toast-\S+/g, '')
        .replace(/bg-\S+/g, '')
        .trim();
    inner.classList.add('flex','items-center','gap-3','px-4','py-3','rounded-xl',
                        'shadow-2xl','text-sm','font-medium','transition-all',
                        'duration-300','text-white', 'toast-' + type);

    icon.className = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msg.textContent = message;

    // Show
    inner.classList.add('show');

    // Auto hide after 3s
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function() {
        inner.classList.remove('show');
    }, 3000);

    
};