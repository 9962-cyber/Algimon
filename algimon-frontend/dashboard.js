// ==========================================
//   CONFIG — change API_BASE_URL to match
//   your backend.  All fetch() calls below
//   read from this single constant.
// ==========================================
const API_BASE_URL = 'http://localhost/algimon-api';

// ==========================================
//   AUTH GUARD
//   Reads the JWT stored by login.js.
//   If no token exists, bounces to login.
//   Attach the returned header object to
//   every fetch() call as `headers: authHeaders()`.
// ==========================================
function getToken() {
    // Check both storages — localStorage for Remember Me, sessionStorage for session-only
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

// ==========================================
//   AUTH GUARD
//   Immediately bounces unauthenticated users
//   back to login before any rendering happens.
// ==========================================
(function authGuard() {
    if (!getToken()) window.location.replace('login.html');
})();

function authHeaders(extra = {}) {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra,
    };
}

// ==========================================
//   SESSION HELPERS
//   login.js should store:
//     localStorage.setItem('token', jwt)
//     localStorage.setItem('user', JSON.stringify({ name, email, phone, avatar }))
//   These helpers read that data safely.
// ==========================================
function getSession() {
    try {
        return JSON.parse(
            localStorage.getItem('user') || sessionStorage.getItem('user') || '{}'
        );
    } catch {
        return {};
    }
}

function hydrateUserUI() {
    const user      = getSession();
    const firstName = user.firstName || '';
    const lastName  = user.lastName  || '';
    const name      = (firstName + ' ' + lastName).trim() || user.name || 'Client';
    const email     = user.email || '';
    const phone     = user.phone || '';

    // Personalize the browser tab title
    if (firstName) document.title = `Dashboard — ${firstName} | Algimon`;

    const els = {
        'display-username':   name,
        'mobile-username':    name,
        'display-prof-email': email,
        'display-prof-phone': phone,
    };
    Object.entries(els).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Pre-fill profile form — split stored name into first/last if needed
    const storedFirst = user.firstName || (user.name ? user.name.split(' ')[0] : '');
    const storedLast  = user.lastName  || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
    const pFirst = document.getElementById('profile-firstname');
    const pLast  = document.getElementById('profile-lastname');
    const pEmail = document.getElementById('profile-email');
    const pPhone = document.getElementById('profile-phone');
    if (pFirst) pFirst.value = storedFirst;
    if (pLast)  pLast.value  = storedLast;
    if (pEmail) pEmail.value = email;
    if (pPhone) pPhone.value = phone;
}

// ==========================================
//   UTILITY: XSS SANITIZATION
// ==========================================
function sanitize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
//   API LAYER
//   Every function that talks to the server
//   lives here. To change an endpoint, edit
//   only this section.
// ==========================================

// ==========================================
//   CENTRALIZED FETCH — handles 401 globally
// ==========================================
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        // Token expired or invalid — clear session and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('algimon_bookings');
        window.location.replace('login.html');
        throw new Error('Session expired');
    }
    return res;
}

async function apiFetchBookings() {
    const res = await apiFetch(`${API_BASE_URL}/bookings`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return (data.data || []).map(b => {
        try { return normaliseBooking(b); }
        catch(e) { console.warn('Bad booking record:', b, e); return null; }
    }).filter(Boolean);
}

async function apiFetchProperties() {
    const res = await apiFetch(`${API_BASE_URL}/properties`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return (data.data || []).map(p => ({
        id:      p.id,
        name:    p.NAME || p.name || p.property_name || '',  // ← handles uppercase NAME
        address: p.address || p.property_address || '',
        type:    p.property_type || p.type || '',
        icon:    typeIcons[p.property_type || p.type] || 'fa-building'
    }));
}

async function apiFetchEquipment() {
    const res = await apiFetch(`${API_BASE_URL}/equipment`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return (data.data || []).map(e => ({
        id: e.id,
        name: e.name,
        propertyId: e.property_id,
        propertyName: e.property_name,
        serviceType: e.service_type,
        lastServiced: e.last_serviced,
        nextRenewal: e.next_renewal,
        installDate: e.last_serviced,
        status: e.status
    }));
}

async function apiFetchBlockedDates() {
    try {
        const res  = await fetch(`${API_BASE_URL}/blocked-dates`);
        const data = await res.json();
        if (!data.success) return new Set();
        return new Set((data.data || []).map(d => d.date)); // Set of 'YYYY-MM-DD'
    } catch { return new Set(); }
}

async function apiFetchServices() {
    try {
        const res  = await fetch(`${API_BASE_URL}/services`);
        const data = await res.json();
        if (!data.success) return [];
        return data.data || [];
    } catch { return []; }
}

async function apiFetchTimeSlots() {
    try {
        const res  = await fetch(`${API_BASE_URL}/time-slots`);
        const data = await res.json();
        if (!data.success) return {};
        return data.data || {};
    } catch { return {}; }
}


async function apiCreateBooking(payload) {
    const res = await apiFetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            serviceType: payload.serviceType,
            requestedDate: payload.requestedDate,
            requestedTime: payload.requestedTime,
            property_id: propertiesList.find(p => p.name === payload.company)?.id || payload.property_id,
            notes: payload.notes || ''
        })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    // Return a normalised object for immediate UI update
    return {
        id: data.data.id,
        serviceName: payload.serviceType,
        property: payload.company,
        date: payload.requestedDate,
        time: payload.requestedTime,
        status: 'PENDING',
        final_price: null,
        technician_name: null,
        equipment_id: null,
        cancel_reason: null,
        updatedAt: null
    };
}

async function apiCancelBooking(id, reason) {
    const res = await apiFetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const b = bookingsDB.find(x => String(x.id) === String(id));
    return { ...b, status: 'CANCELLED', cancel_reason: reason, updatedAt: new Date().toISOString() };
}


async function apiRescheduleBooking(id, newDate, newTime, reason = '') {
    const res = await apiFetch(`${API_BASE_URL}/bookings/${id}/reschedule`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ newDate, newTime, reason })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const b = bookingsDB.find(x => String(x.id) === String(id));
    return { ...b, date: newDate, time: newTime, status: 'PENDING' };
}

async function apiSaveProperty(prop) {
    const payload = { 
        name:    prop.name, 
        address: prop.address, 
        type:    prop.type      // ← must be 'type' to match properties.php
    };
    const isEdit = !!prop.id;
    const res = await fetch(
        isEdit ? `${API_BASE_URL}/properties/${prop.id}` : `${API_BASE_URL}/properties`,
        { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    // Return full object with icon so UI updates immediately
    return { 
        id:      prop.id || data.data.id, 
        name:    prop.name,
        address: prop.address,
        type:    prop.type,
        icon:    typeIcons[prop.type] || 'fa-building'
    };
}

async function apiDeleteProperty(id) {
    const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
        method: 'DELETE', headers: authHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
}

// ==========================================
// REAL API FUNCTIONS - Add to dashboard.js
// ==========================================

async function apiUpdateProfile(payload) {
    const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            phone: payload.phone
        })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result;
}
async function apiChangePassword(currentPassword, newPassword) {
    const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result;
}

// ==========================================
//   FIELD NORMALISER
//   Admin API uses snake_case fields that
//   differ slightly from the frontend model.
//   Map them here so the rest of the code
//   doesn't need to know which name the
//   backend uses.
// ==========================================
function normaliseBooking(b) {
    return {
        id:               b.id             || b._id,
        serviceName:      b.service_type   || b.serviceName  || b.serviceType || '',
        property:         b.property_name  || b.property     || b.address     || '',
        date:             (b.appointment_date || b.date || '').split('T')[0],
        time:             b.time
                          ? b.time
                          : b.appointment_time
                            ? (function(t) {
                                // Convert raw HH:MM:SS from DB to 12h display (e.g. "14:30:00" → "02:30 PM")
                                const [h, m] = t.split(':').map(Number);
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const h12  = h % 12 || 12;
                                return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
                              })(b.appointment_time)
                            : '',
        status:           (b.status || 'PENDING').toUpperCase(),
        final_price:      b.actual_amount  || b.price_estimate || b.final_price || b.price || null,
        technician_name:  b.staff_name     || b.technician_name              || null,
        equipment_id:     b.equipment_id                                      || null,
        cancel_reason:    b.cancel_reason                                     || null,
        updatedAt:        b.updated_at     || b.updatedAt                     || null,
        clientName:       b.client_name    || b.clientName                    || '',
        property_id:      b.property_id                                       || null,
    };
}

// ==========================================
//   IN-MEMORY STATE
//   Populated from the API on load.
//   No localStorage writes for data — only
//   the JWT token and user object (written
//   by login.js) live in localStorage.
// ==========================================
let bookingsDB     = [];
let propertiesList = [];
let equipmentDB    = [];
let blockedDatesSet = new Set();
let servicesList    = [];
let timeSlotsConfig = {}; // keyed by day name: { monday: { active, start, end }, ... }

const typeIcons = {
    'Commercial': 'fa-building', 'Industrial': 'fa-industry',
    'Residential': 'fa-house', 'Institutional': 'fa-school',
};

// ==========================================
//   EQUIPMENT HELPERS
// ==========================================
function computeEquipmentStatus(equipment) {
    if (!equipment.nextRenewal) return 'no-expiry';
    const today   = new Date(); today.setHours(0, 0, 0, 0);
    const renewal = new Date(equipment.nextRenewal + 'T00:00:00');
    const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0)  return 'expired';
    if (diffDays <= 60) return 'expiring';
    return 'ok';
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ==========================================
//   EQUIPMENT TAB
// ==========================================
function renderEquipmentTab() {
    const container = document.getElementById('equipment-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (equipmentDB.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-fire-extinguisher empty-state-icon"></i>
                <h3 class="empty-state-title">No Equipment Tracked</h3>
                <p class="empty-state-desc">You don't have any fire protection equipment on record yet. Equipment linked to completed service appointments will appear here.</p>
                <button class="btn-solid-red ripple-btn hover-lift mt-3" onclick="openScheduleModal()">
                    <i class="fa-solid fa-plus"></i> BOOK A SERVICE
                </button>
            </div>`;
        initRipples();
        return;
    }

    equipmentDB.forEach(eq => {
        if (eq.nextRenewal) eq.status = computeEquipmentStatus(eq);
        container.insertAdjacentHTML('beforeend', generateEquipmentCard(eq));
    });
    initRipples();
}

function generateEquipmentCard(eq) {
    const pendingBooking = bookingsDB.find(b =>
        b.equipment_id === eq.id &&
        b.status !== 'COMPLETED' &&
        b.status !== 'CANCELLED'
    );

    let badgeHTML = '', cardStyle = '';
    if (eq.status === 'expired') {
        badgeHTML = `<span class="badge" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;"><i class="fa-solid fa-triangle-exclamation"></i> Expired</span>`;
        cardStyle = 'border-left-color:#b91c1c;';
    } else if (eq.status === 'expiring') {
        badgeHTML = `<span class="badge" style="background:#ffedd5;color:#c2410c;"><i class="fa-solid fa-clock"></i> Expiring Soon</span>`;
        cardStyle = 'border-left-color:#f97316;';
    } else if (eq.status === 'ok') {
        badgeHTML = `<span class="badge badge-success"><i class="fa-solid fa-shield-check"></i> Compliant</span>`;
        cardStyle = 'border-left-color:#10b981;';
    } else {
        badgeHTML = `<span class="badge" style="background:#e0e7ff;color:#4338ca;"><i class="fa-solid fa-check-double"></i> Operational</span>`;
        cardStyle = 'border-left-color:#4338ca;';
    }

    let dateDetailsHTML = '';
    if (eq.status === 'no-expiry') {
        dateDetailsHTML = `
            <div class="detail-item">
                <i class="fa-solid fa-screwdriver-wrench" style="font-size:1.5rem;color:#888;"></i>
                <div><strong>Installed: ${formatDateDisplay(eq.installDate)}</strong><span>System Status</span></div>
            </div>
            <div class="detail-item">
                <i class="fa-solid fa-circle-info" style="font-size:1.5rem;color:#4338ca;"></i>
                <div><strong>No Annual Expiry</strong><span>Maintain as needed</span></div>
            </div>`;
    } else {
        const lastServicedLabel = eq.lastServiced ? formatDateDisplay(eq.lastServiced) : 'Not yet serviced';
        const nextRenewalLabel  = eq.nextRenewal  ? formatDateDisplay(eq.nextRenewal)  : 'N/A';
        const renewalIcon = eq.status === 'expired'  ? 'fa-triangle-exclamation" style="color:#b91c1c'
                          : eq.status === 'expiring' ? 'fa-triangle-exclamation" style="color:#DD523C'
                          : 'fa-shield" style="color:#10b981';
        dateDetailsHTML = `
            <div class="detail-item">
                <i class="fa-regular fa-calendar-check" style="font-size:1.5rem;color:#888;"></i>
                <div><strong>${lastServicedLabel}</strong><span>Last Inspected / Serviced</span></div>
            </div>
            <div class="detail-item">
                <i class="fa-solid ${renewalIcon};" style="font-size:1.5rem;"></i>
                <div><strong>${nextRenewalLabel}</strong><span>Mandatory Renewal Date</span></div>
            </div>`;
    }

    let actionHTML = '';
    if (eq.status !== 'no-expiry') {
        if (pendingBooking) {
            const statusLabel = pendingBooking.status === 'IN_PROGRESS' ? 'IN PROGRESS' : pendingBooking.status;
            actionHTML = `
                <div class="card-actions" style="margin-top:15px;">
                    <div class="payment-notice" style="background:#e0f2fe;border-color:#bae6fd;color:#0369a1;margin-top:0;padding:10px 15px;">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <div>
                            <strong>Renewal Booking Active</strong>
                            <p style="margin:0;font-size:0.85rem;">Appointment #${sanitize(String(pendingBooking.id))} is currently <strong>${statusLabel}</strong>. Date: ${formatDateDisplay(pendingBooking.date)}</p>
                        </div>
                    </div>
                </div>`;
        } else {
            const btnLabel = eq.status === 'ok' ? 'BOOK RENEWAL' : eq.status === 'expired' ? 'BOOK URGENT RENEWAL' : 'BOOK REFILL / RENEWAL';
            const btnStyle = eq.status === 'expired' ? 'background:#b91c1c;border-color:#b91c1c;' : '';
            actionHTML = `
                <div class="card-actions" style="margin-top:15px;">
                    <button class="btn-solid-red ripple-btn hover-lift" style="padding:8px 15px;font-size:0.85rem;${btnStyle}"
                        onclick="openScheduleModal('${sanitize(eq.serviceType)}','${sanitize(String(eq.propertyId))}','${sanitize(eq.id)}')">
                        <i class="fa-solid fa-rotate"></i> ${btnLabel}
                    </button>
                </div>`;
        }
    }

    let countdownPill = '';
    if (eq.nextRenewal) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const renewal = new Date(eq.nextRenewal + 'T00:00:00');
        const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
            const pillColor = diffDays <= 30 ? '#fee2e2' : diffDays <= 60 ? '#ffedd5' : '#dcfce7';
            const textColor = diffDays <= 30 ? '#b91c1c' : diffDays <= 60 ? '#c2410c' : '#166534';
            countdownPill = `<span style="background:${pillColor};color:${textColor};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:0.5px;margin-left:8px;">${diffDays} days left</span>`;
        } else {
            countdownPill = `<span style="background:#fee2e2;color:#b91c1c;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-family:'Oswald',sans-serif;font-weight:600;margin-left:8px;">EXPIRED</span>`;
        }
    }

    return `
        <div class="appointment-card upcoming-card animate-card" id="equip-${sanitize(String(eq.id))}" style="${cardStyle}">
            <div class="card-top">
                <div class="card-title-row">
                    <h3>${sanitize(eq.name)} ${countdownPill}</h3>
                    ${badgeHTML}
                </div>
                <div class="property-name" style="color:#555;">
                    <i class="fa-regular fa-building"></i> ${sanitize(eq.propertyName)}
                    <span style="margin-left:12px;color:#999;font-size:0.8rem;font-family:'Oswald',sans-serif;">ID: ${sanitize(String(eq.id))}</span>
                </div>
            </div>
            <div class="card-details" style="display:flex;flex-direction:row;gap:30px;flex-wrap:wrap;margin-top:12px;">
                ${dateDetailsHTML}
            </div>
            ${actionHTML}
        </div>`;
}

// ==========================================
//   INIT — DOMContentLoaded
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    hydrateUserUI();
    initRipples();
    initBackToTop();
    initMobileMenu();

    if (document.getElementById('calendar-days-schedule')) {
        populateCalendarDropdowns('schedule');
        renderCalendar('schedule');
    }
    if (document.getElementById('calendar-days-reschedule')) {
        populateCalendarDropdowns('reschedule');
        renderCalendar('reschedule');
    }

    // Load all data in parallel
    await loadAllData();

    document.getElementById('btn-execute-action')?.addEventListener('click', handleExecuteAction);

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === this) {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            }
        });
    });

    document.addEventListener('click', handleNotifClick);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.getElementById('notif-dropdown')?.classList.remove('show');
    });

    document.getElementById('profile-phone')?.addEventListener('input', handlePhoneInput);

    // Show initial unread count badge
    updateNotifBadge();
});

// ==========================================
//   SESSION STORAGE SYNC
//   Persists bookingsDB across page refreshes.
//   Properties & equipment come from the API
//   (or mock) on every load so they don't need
//   sessionStorage — only user-created bookings do.
// ==========================================
const SS_BOOKINGS_KEY = 'algimon_bookings';

function saveBookingsToSession() {
    try {
        sessionStorage.setItem(SS_BOOKINGS_KEY, JSON.stringify(bookingsDB));
    } catch (e) {
        console.warn('[Algimon] Could not save bookings to sessionStorage:', e.message);
    }
}

function loadBookingsFromSession() {
    try {
        const raw = sessionStorage.getItem(SS_BOOKINGS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

async function loadAllData() {
    showStatSkeletons();
    try {
        const [props, equip, blocked, services, slots] = await Promise.all([
            apiFetchProperties().catch(()  => []),
            apiFetchEquipment().catch(()   => []),
            apiFetchBlockedDates().catch(() => new Set()),
            apiFetchServices().catch(()   => []),
            apiFetchTimeSlots().catch(()  => {}),
        ]);
        propertiesList  = props;
        equipmentDB     = equip;
        blockedDatesSet = blocked;
        servicesList    = services;
        timeSlotsConfig = slots;
        updatePropertyDropdowns();
        renderEquipmentTab();
        populateServiceDropdown();
    } catch (err) {
        console.warn('[Algimon] Could not load properties/equipment:', err.message);
    }

    // Always fetch from API — never use sessionStorage cache
    await renderBookingsUI();
    saveBookingsToSession();

    checkUpcomingAppointments();

    // Load real notifications from backend
    try {
        const notifData = await apiFetchNotifications();
        renderNotifications(notifData);
    } catch (err) {
        console.warn('[Algimon] Could not load notifications:', err.message);
        // Hide loading spinner gracefully
        const loading = document.getElementById('notif-loading');
        if (loading) loading.innerHTML = '<span style="font-size:0.82rem;color:#aaa;font-family:\'Open Sans\',sans-serif;">Could not load notifications.</span>';
    }

    // Silently refresh badge count every 60 seconds
    setInterval(async () => {
        try {
            const notifData = await apiFetchNotifications();
            // Only re-render if unread count changed, to avoid disrupting an open dropdown
            if ((notifData?.unread_count ?? 0) !== unreadNotifCount) {
                renderNotifications(notifData);
            }
        } catch (_) { /* silent */ }
    }, 60000);
}

// ==========================================
//   NOTIFICATIONS — API
// ==========================================
let unreadNotifCount = 0;

async function apiFetchNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data; // { notifications: [...], unread_count: N }
}

async function apiMarkNotificationsRead() {
    try {
        const res = await fetch(`${API_BASE_URL}/notifications/read`, {
            method: 'PUT',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
    } catch (err) {
        console.warn('[Algimon] Could not mark notifications read:', err.message);
    }
}

// ==========================================
//   NOTIFICATIONS — RENDER
// ==========================================
const NOTIF_ICONS = {
    appointment_pending:     { icon: 'fa-clock',               color: '#f59e0b' },
    appointment_approved:    { icon: 'fa-circle-check',        color: '#10b981' },
    appointment_cancelled:   { icon: 'fa-circle-xmark',        color: '#b91c1c' },
    appointment_completed:   { icon: 'fa-box-archive',         color: '#4338ca' },
    appointment_in_progress: { icon: 'fa-screwdriver-wrench',  color: '#0369a1' },
    equipment_expired:       { icon: 'fa-triangle-exclamation',color: '#b91c1c' },
    equipment_expiring:      { icon: 'fa-clock',               color: '#f97316' },
    appointment_created:     { icon: 'fa-calendar-check',      color: '#10b981' },
    appointment_rescheduled: { icon: 'fa-clock-rotate-left',   color: '#3b82f6' },
    default:                 { icon: 'fa-bell',                color: '#DD523C' },
};

function _relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const d = Math.floor(diff / 86400);
    return d === 1 ? 'Yesterday' : `${d} days ago`;
}

function renderNotifications(notifData) {
    const content = document.getElementById('notif-content');
    if (!content) return;
    content.innerHTML = '';

    const notifications = notifData?.notifications ?? [];
    unreadNotifCount    = notifData?.unread_count  ?? 0;
    updateNotifBadge();

    if (notifications.length === 0) {
        content.innerHTML = `
            <div class="notif-empty">
                <i class="fa-regular fa-bell-slash" style="font-size:2rem;color:#ccc;margin-bottom:8px;"></i>
                <p style="color:#888;font-size:0.85rem;font-family:'Open Sans',sans-serif;margin:0;">You're all caught up!</p>
                <span style="color:#bbb;font-size:0.78rem;font-family:'Open Sans',sans-serif;">No notifications yet.</span>
            </div>`;
        return;
    }

    notifications.forEach(n => {
        const { icon, color } = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
        const item = document.createElement('div');
        item.className = 'notif-item' + (n.is_read ? '' : ' unread');
        item.dataset.id = n.id;
        item.innerHTML = `
            <i class="fa-solid ${sanitize(icon)}" style="color:${sanitize(color)};"></i>
            <div>
                <p>${sanitize(n.title)}</p>
                <span>${sanitize(n.message)}</span>
                <time style="font-size:0.72rem;color:#aaa;font-family:'Open Sans',sans-serif;display:block;margin-top:3px;">
                    ${sanitize(_relativeTime(n.created_at))}
                </time>
            </div>`;
        content.appendChild(item);
    });
}

// ==========================================
//   NOTIFICATIONS DROPDOWN — CLICK HANDLER
// ==========================================
function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (unreadNotifCount > 0) {
        badge.textContent = unreadNotifCount > 99 ? '99+' : unreadNotifCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function handleNotifClick(e) {
    const notifDropdown = document.getElementById('notif-dropdown');
    if (!notifDropdown) return;

    if (e.target.closest('#notif-close-btn')) { notifDropdown.classList.remove('show'); return; }
    if (e.target.closest('#notif-dropdown'))  return;

    if (e.target.closest('.nav-notification')) {
        notifDropdown.classList.toggle('show');
        if (notifDropdown.classList.contains('show') && unreadNotifCount > 0) {
            // Mark all as read in the DB and clear the badge
            apiMarkNotificationsRead();
            unreadNotifCount = 0;
            updateNotifBadge();
            document.querySelectorAll('.notif-item.unread').forEach(item => item.classList.remove('unread'));
        }
        return;
    }
    if (notifDropdown.classList.contains('show')) notifDropdown.classList.remove('show');
}

function scrollToTop() {
    document.getElementById('notif-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
//   RIPPLES & BACK TO TOP
// ==========================================
function initRipples() {
    document.querySelectorAll('.ripple-btn').forEach(btn => {
        if (btn.dataset.rippleReady) return;
        btn.dataset.rippleReady = '1';
        btn.addEventListener('click', function (e) {
            const rect   = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top  = `${e.clientY - rect.top}px`;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

function initBackToTop() {
    const backToTop = document.getElementById('back-to-top');
    if (!backToTop) return;
    backToTop.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.pageYOffset > 300));
}

// ==========================================
//   STATS UI
// ==========================================
function updateStatsUI() {
    const completedCount = bookingsDB.filter(b => b.status === 'COMPLETED').length;
    const cancelledCount = bookingsDB.filter(b => b.status === 'CANCELLED').length;
    const upcomingCount  = bookingsDB.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length;
    const historyCount   = completedCount + cancelledCount;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('stat-properties', propertiesList.length);
    set('stat-upcoming',   upcomingCount);
    set('stat-completed',  completedCount);
    set('tab-btn-upcoming', `Upcoming (${upcomingCount})`);
    set('tab-btn-history',  `History (${historyCount})`);
}

function showStatSkeletons() {
    ['stat-properties', 'stat-upcoming', 'stat-completed'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span style="display:inline-block;width:28px;height:28px;background:#e8e8e8;border-radius:6px;animation:pulse 1.5s infinite;"></span>';
    });
}

function checkEmptyStates() {
    const upcomingList  = document.getElementById('upcoming-appointments-list');
    const emptyUpcoming = document.getElementById('empty-upcoming');
    if (upcomingList && emptyUpcoming) {
        const visible = [...upcomingList.querySelectorAll('.appointment-card')]
            .filter(c => c.style.display !== 'none').length;
        emptyUpcoming.style.display = visible === 0 ? 'flex' : 'none';
    }
}

// ==========================================
//   TABS & SEARCH
// ==========================================
function switchDashTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
    const map = { upcoming: 0, history: 1, equipment: 2 };
    document.querySelectorAll('.tab-btn')[map[tabName]]?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('active-content');
    if (tabName === 'equipment') renderEquipmentTab();
}

function filterAppointments(tabType) {
    const query = document.getElementById(`search-${tabType}`)?.value.toLowerCase();
    if (query === undefined) return;
    const container = document.getElementById(tabType === 'upcoming' ? 'upcoming-appointments-list' : 'history-appointments-list');
    if (!container) return;
    container.querySelectorAll('.appointment-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? 'block' : 'none';
    });
    checkEmptyStates();
}

// ==========================================
//   MOBILE MENU
// ==========================================
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu   = document.getElementById('mobile-menu');
    if (!mobileToggle || !mobileMenu) return;
    let isOpen = false;
    mobileToggle.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            mobileMenu.classList.add('is-open');
            mobileToggle.querySelector('i')?.classList.replace('ph-list', 'ph-x');
        } else {
            closeMobileMenu();
        }
    });
}

function closeMobileMenu() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu   = document.getElementById('mobile-menu');
    if (mobileMenu)   mobileMenu.classList.remove('is-open');
    if (mobileToggle) mobileToggle.querySelector('i')?.classList.replace('ph-x', 'ph-list');
}

// ==========================================
//   PROFILE MODAL
// ==========================================
function openProfileModal()  { document.getElementById('modal-profile')?.classList.add('active'); }
function closeProfileModal() {
    document.getElementById('modal-profile')?.classList.remove('active');
    const toggle = document.getElementById('toggle-change-password');
    if (toggle && toggle.checked) { toggle.checked = false; togglePasswordSection(); }
    // Clear any lingering error banner
    document.getElementById('profile-error-banner')?.remove();
}

// Converts any PH phone input to the canonical 11-digit local format (09XXXXXXXXX)
// Accepts: 09171234567 | 0917 123 4567 | +639171234567 | 639171234567
function normalizePhilippinePhone(raw) {
    // Strip spaces, dashes, dots
    let digits = raw.replace(/[\s\-\.]/g, '');
    // Remove leading + sign
    if (digits.startsWith('+')) digits = digits.slice(1);
    // +639... or 639... (12 digits) → 09...
    if (digits.startsWith('639') && digits.length === 12) {
        digits = '0' + digits.slice(2); // 639171234567 → 09171234567
    }
    return digits; // already 09... or garbage (validation will catch it)
}

function handlePhoneInput(e) {
    const rawVal = e.target.value;
    const errEl  = document.getElementById('profile-phone-error');

    // Normalize to 11-digit local number
    const normalized = normalizePhilippinePhone(rawVal);

    // Validate
    const isValid = normalized.length === 11 && normalized.startsWith('09');
    const hasEnough = normalized.length >= 3;
    if (hasEnough && !normalized.startsWith('09')) {
        if (errEl) errEl.textContent = 'Must start with 09 or +63 9';
        e.target.classList.add('invalid');
    } else {
        if (errEl) errEl.textContent = '';
        e.target.classList.remove('invalid');
    }

    // Auto-format as local number (0917 123 4567) while user types
    let fmt = normalized;
    if (fmt.length > 7)      fmt = fmt.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3');
    else if (fmt.length > 4) fmt = fmt.replace(/(\d{4})(\d+)/, '$1 $2');

    // Only rewrite the value if user was typing local format (don't disrupt +63 typing)
    const isTypingIntl = rawVal.trim().startsWith('+');
    if (!isTypingIntl) e.target.value = fmt;

    e.target.classList.toggle('valid', isValid);
}

function formatPhoneNumber(raw) {
    const normalized = normalizePhilippinePhone(raw);
    if (normalized.length > 7) return normalized.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3');
    if (normalized.length > 4) return normalized.replace(/(\d{4})(\d+)/, '$1 $2');
    return normalized;
}

// ==========================================
//   PASSWORD SECTION HELPERS
// ==========================================
function togglePasswordSection() {
    const toggle  = document.getElementById('toggle-change-password');
    const section = document.getElementById('password-change-section');
    if (!section) return;
    if (toggle.checked) {
        section.style.display = 'block';
        section.style.animation = 'fadeInUp 0.3s ease forwards';
    } else {
        section.style.display = 'none';
        // Clear fields and errors when hidden
        ['profile-current-password','profile-new-password','profile-confirm-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['profile-current-pw-error','profile-confirm-pw-error'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
        const bar = document.getElementById('pw-strength-bar');
        if (bar) bar.style.display = 'none';
        const reqs = document.getElementById('profile-pw-reqs');
        if (reqs) { reqs.textContent = ''; reqs.className = 'password-reqs-hint'; }
        const policyBox = document.getElementById('profile-pw-policy-box');
        if (policyBox) policyBox.style.display = 'none';
    }
}

function togglePwVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
}

function checkPasswordStrength(value) {
    const bar       = document.getElementById('pw-strength-bar');
    const fill      = document.getElementById('pw-strength-fill');
    const label     = document.getElementById('pw-strength-label');
    const reqs      = document.getElementById('profile-pw-reqs');
    const policyBox = document.getElementById('profile-pw-policy-box');
    if (!bar || !fill || !label) return;

    if (!value) {
        bar.style.display = 'none';
        if (policyBox) policyBox.style.display = 'none';
        if (reqs) { reqs.textContent = ''; reqs.className = 'password-reqs-hint'; }
        return;
    }
    bar.style.display = 'block';
    if (policyBox) policyBox.style.display = 'flex';

    let score = 0;
    if (value.length >= 8)           score++;
    if (value.length >= 12)          score++;
    if (/[A-Z]/.test(value))         score++;
    if (/[0-9]/.test(value))         score++;
    if (/[^A-Za-z0-9]/.test(value))  score++;

    const levels = [
        { width: '20%',  color: '#b91c1c', text: 'Very Weak' },
        { width: '40%',  color: '#f97316', text: 'Weak' },
        { width: '60%',  color: '#eab308', text: 'Fair' },
        { width: '80%',  color: '#22c55e', text: 'Strong' },
        { width: '100%', color: '#15803d', text: 'Very Strong' },
    ];
    const lvl = levels[Math.min(score, 4)];
    fill.style.width      = lvl.width;
    fill.style.background = lvl.color;
    label.textContent     = lvl.text;
    label.style.color     = lvl.color;

    // Live requirements hint
    if (reqs) {
        const hasLength  = value.length >= 8;
        const hasUpper   = /[A-Z]/.test(value);
        const hasSpecial = /[^A-Za-z0-9]/.test(value);
        const missing = [];
        if (!hasLength)  missing.push(`${8 - value.length} more char${8 - value.length !== 1 ? 's' : ''}`);
        if (!hasUpper)   missing.push('1 uppercase letter');
        if (!hasSpecial) missing.push('1 special character');
        if (missing.length > 0) {
            reqs.textContent = `Still needs: ${missing.join(', ')}`;
            reqs.className = 'password-reqs-hint warn';
        } else {
            reqs.textContent = '✓ Password meets all requirements';
            reqs.className = 'password-reqs-hint ok';
        }
    }
}

async function submitProfile(event) {
    event.preventDefault();

    const submitBtn  = event.target.querySelector('.btn-modal-submit');
    const firstName  = document.getElementById('profile-firstname').value.trim();
    const lastName   = document.getElementById('profile-lastname').value.trim();
    const newEmail   = document.getElementById('profile-email').value.trim();
    const newPhone   = document.getElementById('profile-phone').value;
    const changePw   = document.getElementById('toggle-change-password')?.checked;

    // ── Helper to show/clear inline errors ──────────────────────────────────
    const setErr = (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
    };
    // Clear all errors first
    ['profile-current-pw-error', 'profile-confirm-pw-error'].forEach(id => setErr(id, ''));

    // ── Frontend validation ──────────────────────────────────────────────────
    if (!firstName || !lastName) {
        showProfileBanner('error', 'Please enter your first and last name.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showProfileBanner('error', 'Please enter a valid email address.');
        return;
    }
    const cleanPhone = normalizePhilippinePhone(newPhone);
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
        showProfileBanner('error', 'Enter a valid PH mobile number — local (09XX XXX XXXX) or international (+63 9XX XXX XXXX).');
        return;
    }

    // ── Password field validation (if section is open) ───────────────────────
    if (changePw) {
        const currentPw  = document.getElementById('profile-current-password').value;
        const newPw      = document.getElementById('profile-new-password').value;
        const confirmPw  = document.getElementById('profile-confirm-password').value;
        if (!currentPw) { setErr('profile-current-pw-error', 'Please enter your current password.'); return; }
        // Full password policy: min 8 chars, 1 uppercase, 1 special character
        if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(newPw)) {
            let hint = 'New password must be at least 8 characters';
            if (!/[A-Z]/.test(newPw))        hint += ', include at least 1 uppercase letter';
            if (!/[^A-Za-z0-9]/.test(newPw)) hint += ', include at least 1 special character';
            setErr('profile-confirm-pw-error', hint + '.');
            return;
        }
        if (newPw !== confirmPw) { setErr('profile-confirm-pw-error', 'Passwords do not match.'); return; }
    }

    // ── Submit ───────────────────────────────────────────────────────────────
    submitBtn.disabled    = true;
    submitBtn.textContent = 'SAVING…';

    try {
        // 1. Update name / email / phone
        const fullName = `${firstName} ${lastName}`;
        const result   = await apiUpdateProfile({ name: fullName, email: newEmail, phone: cleanPhone });

        // Sync localStorage
        const user = getSession();
        const updatedUser   = result.data || {};
        user.name           = updatedUser.name  || fullName;
        user.firstName      = firstName;
        user.lastName       = lastName;
        user.email          = updatedUser.email || newEmail;
        user.phone          = updatedUser.phone || cleanPhone;
        localStorage.setItem('user', JSON.stringify(user));

        // 2. Change password if toggled
        if (changePw) {
            const currentPw = document.getElementById('profile-current-password').value;
            const newPw     = document.getElementById('profile-new-password').value;
            try {
                await apiChangePassword(currentPw, newPw);
            } catch (pwErr) {
                // Password failed — profile was still saved, show specific error
                setErr('profile-current-pw-error', pwErr.message || 'Password change failed.');
                showProfileBanner('warning', 'Profile saved, but password change failed: ' + (pwErr.message || 'Unknown error.'));
                hydrateUserUI();
                return;
            }
        }

        // 3. All good
        hydrateUserUI();
        closeProfileModal();
        showToast('Profile updated successfully!', 'success');

    } catch (err) {
        console.error('Profile update error:', err);
        showProfileBanner('error', err.message || 'Failed to update profile. Please try again.');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'SAVE CHANGES';
    }
}

// Shows a transient banner inside the profile modal (replaces alerts)
function showProfileBanner(type, message) {
    let banner = document.getElementById('profile-error-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'profile-error-banner';
        // Insert just above the modal buttons
        const btns = document.querySelector('#form-profile .modal-buttons');
        if (btns) btns.parentNode.insertBefore(banner, btns);
    }
    const colors = {
        error:   { bg: '#fff0f0', border: '#fca5a5', color: '#b91c1c', icon: 'fa-circle-exclamation' },
        warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'fa-triangle-exclamation' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: 'fa-circle-check' },
    };
    const c = colors[type] || colors.error;
    banner.style.cssText = `
        display:flex;align-items:center;gap:10px;
        background:${c.bg};border:1px solid ${c.border};color:${c.color};
        border-radius:8px;padding:12px 15px;margin-bottom:16px;
        font-family:'Open Sans',sans-serif;font-size:0.88rem;line-height:1.4;
        animation:fadeIn 0.3s ease;
    `;
    banner.innerHTML = `<i class="fa-solid ${c.icon}" style="flex-shrink:0;"></i><span>${sanitize(message)}</span>`;
    // Auto-dismiss after 5 s
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => banner.remove(), 5000);
}

// ==========================================
//   PROPERTIES MANAGER
// ==========================================
function openPropertiesManager()  { renderPropertyList(); document.getElementById('modal-properties-manager')?.classList.add('active'); }
function closePropertiesManager() { document.getElementById('modal-properties-manager')?.classList.remove('active'); }

function renderPropertyList() {
    const query     = document.getElementById('search-properties')?.value.toLowerCase() ?? '';
    const container = document.getElementById('property-list-container');
    if (!container) return;
    container.innerHTML = '';
    const filtered = propertiesList.filter(p =>
        p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
    );
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin:10px 0;">
                <i class="fa-regular fa-building empty-state-icon"></i>
                <h3 class="empty-state-title">No Properties</h3>
                <p class="empty-state-desc">No properties match this search.</p>
            </div>`;
        return;
    }
    filtered.forEach(prop => {
        const item = document.createElement('div');
        item.className = 'property-list-item';
        item.innerHTML = `
            <div class="property-list-info">
                <div class="prop-icon-wrapper"><i class="fa-solid ${sanitize(prop.icon)}"></i></div>
                <div class="prop-details">
                    <h4>${sanitize(prop.name)}</h4>
                    <p>${sanitize(prop.address)}</p>
                    <span class="prop-type" style="font-family:'Oswald',sans-serif;font-size:0.8rem;text-transform:uppercase;color:#888;letter-spacing:0.5px;">${sanitize(prop.type)}</span>
                </div>
            </div>
            <div class="property-list-actions">
                <button class="action-btn ripple-btn hover-lift" onclick="openPropertyForm('${sanitize(String(prop.id))}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete-btn ripple-btn hover-lift" onclick="promptDeleteProperty('${sanitize(String(prop.id))}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        container.appendChild(item);
    });
    initRipples();
}

function updatePropertyDropdowns() {
    const select = document.getElementById('select-saved-property');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select a property</option>';
    propertiesList.forEach(p => select.add(new Option(p.name, p.id)));
}

function openPropertyForm(editId = null) {
    closePropertiesManager();
    const modal = document.getElementById('modal-property-form');
    if (!modal) return;
    if (editId) {
        const prop = propertiesList.find(p => String(p.id) === String(editId));
        if (!prop) return;
        document.getElementById('prop-form-title').innerText = 'Edit Property';
        document.getElementById('prop-id').value             = prop.id;
        document.getElementById('prop-name').value           = prop.name;
        document.getElementById('prop-address').value        = prop.address;
        document.getElementById('prop-type').value           = prop.type;
    } else {
        document.getElementById('form-manage-property').reset();
        document.getElementById('prop-form-title').innerText = 'Add New Property';
        document.getElementById('prop-id').value             = '';
    }
    modal.classList.add('active');
}

function closePropertyForm() {
    document.getElementById('modal-property-form')?.classList.remove('active');
    document.getElementById('form-manage-property')?.reset();
    openPropertiesManager();
}

async function submitPropertyForm(event) {
    event.preventDefault();
    const idVal      = document.getElementById('prop-id')?.value;
    const nameVal    = document.getElementById('prop-name')?.value.trim();
    const addressVal = document.getElementById('prop-address')?.value.trim();
    const typeVal    = document.getElementById('prop-type')?.value;
    const submitBtn  = event.target.querySelector('[type="submit"]');

    if (!nameVal || nameVal.length < 3) { showModalError('prop-form-error', 'Property name must be at least 3 characters.'); return; }
    const addrError = validateAddress(addressVal);
    if (addrError) { showModalError('prop-form-error', addrError); return; }
    if (!typeVal)  { showModalError('prop-form-error', 'Please select a property type.'); return; }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    try {
        const saved = await apiSaveProperty({
            id:      idVal || undefined,
            name:    nameVal,
            address: addressVal,
            type:    typeVal,
            icon:    typeIcons[typeVal] || 'fa-building',
        });
        if (idVal) {
            propertiesList = propertiesList.map(p => String(p.id) === String(idVal) ? saved : p);
            showToast('Property updated successfully!', 'success');
        } else {
            propertiesList.push(saved);
            showToast('Property added successfully!', 'success');
        }
        updateStatsUI();
        updatePropertyDropdowns();
        document.getElementById('modal-property-form')?.classList.remove('active');
    } catch (err) {
        showModalError('prop-form-error', 'Could not save property: ' + err.message);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Property'; }
    }
}

// ==========================================
//   SHARED INLINE ERROR HELPER FOR MODALS
// ==========================================
function showModalError(containerId, message) {
    let el = document.getElementById(containerId);
    if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        // Insert before the modal-buttons div of the nearest form
        const form = document.querySelector(`#${containerId.replace('-error','').replace('prop-form','form-manage-property').replace('schedule-form','form-schedule').replace('reschedule-form','form-reschedule')}`);
        const btns = document.querySelector(`[id="${containerId.split('-')[0]}-${containerId.split('-')[1]}"]`)?.closest('form')?.querySelector('.modal-buttons');
        if (btns) btns.parentNode.insertBefore(el, btns);
    }
    el.style.cssText = 'display:flex;align-items:center;gap:10px;background:#fff0f0;border:1px solid #fca5a5;color:#b91c1c;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-family:"Open Sans",sans-serif;font-size:0.86rem;animation:fadeIn 0.3s ease;';
    el.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="flex-shrink:0;"></i><span>${sanitize(message)}</span>`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ==========================================
//   FORM VALIDATION HELPERS
// ==========================================
function hasDuplicateBooking(serviceName, propertyId, dateStr) {
    const propName = propertiesList.find(p => String(p.id) === String(propertyId))?.name ?? '';
    return bookingsDB.some(b =>
        b.status !== 'CANCELLED' &&
        b.status !== 'COMPLETED' &&
        b.serviceName === serviceName &&
        b.property    === propName &&
        b.date        === dateStr
    );
}

function checkDuplicateInline() {
    const warning     = document.getElementById('duplicate-booking-warning');
    const warningText = document.getElementById('duplicate-warning-text');
    const submitBtn   = document.querySelector('#form-schedule .btn-modal-submit');
    if (!warning || !warningText) return;

    const serviceSelect = document.getElementById('schedule-service');
    const propSelect    = document.getElementById('select-saved-property');
    const dateInput     = document.getElementById('selected-schedule-date')?.value;

    const svcName  = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';
    const propId   = propSelect?.value || '';

    // Only check when all three fields have values
    if (!svcName || svcName === 'Select a service' || !propId || !dateInput) {
        warning.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    const isDuplicate = hasDuplicateBooking(svcName, propId, dateInput);
    if (isDuplicate) {
        const propName = propertiesList.find(p => String(p.id) === String(propId))?.name || 'this property';
        warningText.innerHTML = `You already have an active <strong>${sanitize(svcName)}</strong> booking at <strong>${sanitize(propName)}</strong> on <strong>${formatDateDisplay(dateInput)}</strong>. Please choose a different date, service, or property — or cancel the existing appointment first.`;
        warning.style.display = 'block';
        if (submitBtn) submitBtn.disabled = true;
    } else {
        warning.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

const ADDRESS_MIN_LENGTH = 10;
function validateAddress(address) {
    const trimmed = (address || '').trim();
    if (trimmed.length < ADDRESS_MIN_LENGTH) return 'Address is too short. Please enter a complete street address.';
    if (!/\d/.test(trimmed))                 return 'Address should include a street number (e.g. "123 Main Street").';
    return null;
}

// ==========================================
//   POPULATE SERVICE DROPDOWN FROM API
// ==========================================
function populateServiceDropdown() {
    const select = document.getElementById('schedule-service');
    if (!select || servicesList.length === 0) return;

    // Save current value to re-select if possible
    const prev = select.value;

    // Rebuild options
    select.innerHTML = '<option value="" disabled selected>Select a service</option>';
    servicesList.forEach(svc => {
        const opt = document.createElement('option');
        opt.value = svc.name;
        opt.textContent = svc.name;
        select.appendChild(opt);
    });

    // Rebuild serviceDataInfo from live data
    servicesList.forEach(svc => {
        const priceStr = svc.minPrice && svc.maxPrice
            ? `\u20B1${svc.minPrice.toLocaleString('en-PH')} \u2013 \u20B1${svc.maxPrice.toLocaleString('en-PH')}`
            : svc.minPrice
                ? `from \u20B1${svc.minPrice.toLocaleString('en-PH')}`
                : 'Price on request';
        serviceDataInfo[svc.name] = {
            price: priceStr,
            type:  svc.unit || 'Per Service',
            renewable: svc.renewable,
            note:  svc.renewable
                ? `This service requires renewal every ${svc.renewalValue || 12} ${svc.renewalUnit || 'months'} for compliance.`
                : 'One-time service. Final cost confirmed upon inspection.',
        };
    });

    // Restore previous selection
    if (prev) select.value = prev;
}

// ==========================================
//   SERVICE PRICING INFO
// ==========================================
const serviceDataInfo = {
    "CCTV Surveillance":        { price: "₱15,000 - ₱35,000",    type: "Per Package",    renewable: false, note: "Usually sold as a package. A standard 8-camera setup runs around ₱23,000." },
    "Detectors & Pull Stations":{ price: "₱2,500 - ₱5,000",      type: "Per Unit",       renewable: false, note: "Billed per addressable device/node." },
    "FDAS Design & Install":    { price: "₱150,000 - ₱450,000+", type: "Per Project",    renewable: false, note: "Large-scale project cost; scales heavily with building size." },
    "Fire Alarm Installation":  { price: "₱50,000 - ₱100,000",   type: "Per System",     renewable: false, note: "For smaller, standalone panel setups." },
    "Fire Drill Training":      { price: "₱5,000 - ₱15,000",     type: "Per Session",    renewable: true,  note: "Professional fee per session. Establishments track this annually for compliance." },
    "Fire Extinguisher Check":  { price: "₱900 - ₱1,500",        type: "Per Unit",       renewable: true,  note: "Standard 10lb dry chemical extinguishers legally require annual inspection and refilling." },
    "Fire Safety Inspection":   { price: "₱5,000 - ₱20,000",     type: "Per Inspection", renewable: true,  note: "A private consultancy fee to prep a building for their annual BFP FSIC renewal." },
    "Nurse Call Systems":       { price: "₱50,000 - ₱150,000",   type: "Per Package",    renewable: false, note: "Base price for a standard hospital ward setup." },
    "Safety Inspections":       { price: "₱5,000 - ₱15,000",     type: "Per Inspection", renewable: true,  note: "General hazard and compliance assessments, typically reviewed yearly." },
    "System Troubleshooting":   { price: "₱1,500 - ₱3,500",      type: "Per Visit",      renewable: false, note: "A one-off call-out or service fee for immediate repairs." },
};

function showServiceDetails() {
    const select = document.getElementById('schedule-service');
    const box    = document.getElementById('service-price-info');
    if (!select || !box) return;
    const data = serviceDataInfo[select.value];
    if (data) {
        document.getElementById('s-price-val').textContent = data.price;
        const badge = data.renewable
            ? `<span class="renewable-badge"><i class="fa-solid fa-arrows-rotate"></i> Requires Annual Renewal</span>`
            : '';
        document.getElementById('s-price-desc').innerHTML =
            `<strong>Billing Type:</strong> ${sanitize(data.type)} ${badge}<br>
             <p style="margin:8px 0 0;color:#444;font-style:italic;">"${sanitize(data.note)}"</p>
             <span style="font-size:0.75rem;opacity:0.8;display:block;margin-top:8px;">* Final cost will be formally assessed upon confirmation.</span>`;
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
}

// ==========================================
//   SCHEDULE NEW APPOINTMENT
// ==========================================
function openScheduleModal(prefillService = null, prefillPropertyId = null, prefillEquipmentId = null) {
    // Always reset to earliest valid month (today + 3 days)
    const minDate = new Date(); minDate.setHours(0, 0, 0, 0); minDate.setDate(minDate.getDate() + 3);
    currentMonthObj['schedule'] = minDate.getMonth();
    currentYearObj['schedule']  = minDate.getFullYear();
    selectedDateObj['schedule'] = null;
    document.getElementById('selected-schedule-date').value = '';

    document.getElementById('modal-schedule')?.classList.add('active');
    renderCalendar('schedule');
    const serviceSelect = document.getElementById('schedule-service');
    const propSelect    = document.getElementById('select-saved-property');
    const eqInput       = document.getElementById('schedule-equipment-id');
    if (serviceSelect && prefillService)    { serviceSelect.value = prefillService; showServiceDetails(); }
    if (propSelect    && prefillPropertyId) propSelect.value = prefillPropertyId;
    if (eqInput)                            eqInput.value = prefillEquipmentId || '';
}

function closeScheduleModal() {
    document.getElementById('modal-schedule')?.classList.remove('active');
    const priceBox = document.getElementById('service-price-info');
    if (priceBox) priceBox.style.display = 'none';
    document.getElementById('form-schedule')?.reset();
    const timeDisp = document.getElementById('display-selected-time');
    if (timeDisp) { timeDisp.textContent = 'Select time'; timeDisp.style.color = '#888'; }
    const dateField = document.getElementById('selected-schedule-date');
    if (dateField) dateField.value = '';
    const timeField = document.getElementById('selected-schedule-time');
    if (timeField) timeField.value = '';
    selectedDateObj['schedule'] = null;
    // Reset duplicate warning
    const warning   = document.getElementById('duplicate-booking-warning');
    const submitBtn = document.querySelector('#form-schedule .btn-modal-submit');
    if (warning)   warning.style.display = 'none';
    if (submitBtn) submitBtn.disabled    = false;
}

async function submitSchedule(event) {
    event.preventDefault();
    const submitBtn  = event.target.querySelector('.btn-modal-submit');
    const origText   = submitBtn.textContent;
    const dateInput  = document.getElementById('selected-schedule-date').value;
    const timeInput  = document.getElementById('selected-schedule-time').value;
    const propSelect = document.getElementById('select-saved-property');
    const serviceSelect = document.getElementById('schedule-service');

    if (!dateInput)       { showModalError('schedule-form-error', 'Please select a date from the calendar.'); return; }
    if (!timeInput)       { showModalError('schedule-form-error', 'Please select a time.'); return; }
    if (!propSelect.value){ showModalError('schedule-form-error', 'Please select a property.'); return; }

    const svcName = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';
    if (hasDuplicateBooking(svcName, propSelect.value, dateInput)) {
        showModalError('schedule-form-error', `You already have an active "${svcName}" booking at that property on ${formatDateDisplay(dateInput)}. Please choose a different date or cancel the existing appointment first.`);
        return;
    }

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    const displayTime  = document.getElementById('display-selected-time')?.textContent || timeInput;
    const equipmentId  = document.getElementById('schedule-equipment-id')?.value || null;
    const selectedProp = propertiesList.find(p => String(p.id) === String(propSelect.value));

    try {
        const newBooking = await apiCreateBooking({
            serviceType:   svcName,
            requestedDate: dateInput,
            requestedTime: displayTime,
            property_id:   propSelect.value,
            company:       selectedProp?.name || '',
            address:       selectedProp?.address || '',
            notes:         document.getElementById('schedule-notes')?.value || '',
            clientName:    getSession().name  || '',
            clientEmail:   getSession().email || '',
        });

        bookingsDB.unshift(newBooking);
        saveBookingsToSession();
        await renderBookingsUI(true);
        renderEquipmentTab();
        closeScheduleModal();
        showToast('Appointment submitted successfully! Awaiting admin review.', 'success');
        notifyAppointmentCreated({ service: svcName, date: dateInput });
    } catch (err) {
        showModalError('schedule-form-error', 'Could not submit appointment: ' + err.message);
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
    }
}

// ==========================================
//   RESCHEDULE
// ==========================================
let rescheduleTargetId = null;
let rescheduleOldDate  = null;

function openRescheduleModal(cardId, aptDate) {
    // U_R10 — block rescheduling less than 3 days away
    if (aptDate) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const apt   = new Date(aptDate + 'T00:00:00');
        const diff  = Math.ceil((apt - today) / (1000 * 60 * 60 * 24));
        if (diff <= 3) {
            const icon       = document.getElementById('confirm-icon');
            const cancelBtn  = document.querySelector('#modal-confirm-action .btn-modal-cancel');
            const proceedBtn = document.getElementById('btn-execute-action');
            icon.className   = 'fa-solid fa-phone success-icon';
            icon.style.color = '#3e1f1c';
            document.getElementById('confirm-title').innerText   = 'RESCHEDULE BLOCKED';
            document.getElementById('confirm-message').innerHTML =
                `This appointment is <strong>${diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `${diff} days away`}</strong>.<br><br>
                 Appointments within 3 days cannot be rescheduled online.<br>
                 Please call our office directly:<br>
                 <strong style="color:#DD523C;font-size:1.1rem;">(02) 852-23027</strong>`;
            document.getElementById('cancel-reason-container').style.display = 'none';
            if (cancelBtn)  cancelBtn.style.display = 'none';
            if (proceedBtn) { proceedBtn.innerText = 'OK, GOT IT'; proceedBtn.onclick = closeConfirmAction; }
            document.getElementById('modal-confirm-action')?.classList.add('active');
            return;
        }
    }

    rescheduleTargetId = cardId;
    rescheduleOldDate  = aptDate || null;
    const dbId = cardId.split('-')[1];
    document.getElementById('reschedule-apt-id').value = dbId;
    const card = document.getElementById(cardId);
    if (card) {
        document.getElementById('reschedule-display-service').innerText  = card.querySelector('h3').innerText;
        document.getElementById('reschedule-display-property').innerText = card.querySelector('.property-name').innerText;
    }

    // Always reset the reschedule calendar to the earliest valid month (today + 3 days)
    const minDate = new Date(); minDate.setHours(0, 0, 0, 0); minDate.setDate(minDate.getDate() + 3);
    currentMonthObj['reschedule'] = minDate.getMonth();
    currentYearObj['reschedule']  = minDate.getFullYear();
    selectedDateObj['reschedule'] = null;
    document.getElementById('reschedule-date').value = '';

    document.getElementById('modal-reschedule')?.classList.add('active');
    renderCalendar('reschedule');
}

function closeRescheduleModal() {
    document.getElementById('modal-reschedule')?.classList.remove('active');
    document.getElementById('form-reschedule')?.reset();
    const timeDisp = document.getElementById('display-reschedule-time');
    if (timeDisp) { timeDisp.textContent = 'Select time'; timeDisp.style.color = '#888'; }
    rescheduleTargetId = null;
    rescheduleOldDate  = null;
}

async function submitReschedule(event) {
    event.preventDefault();
    const newDate     = document.getElementById('reschedule-date')?.value;
    const newTime     = document.getElementById('reschedule-time')?.value;
    const displayTime = document.getElementById('display-reschedule-time').innerText;

    if (!newDate) { showModalError('reschedule-form-error', 'Please select a new date from the calendar.'); return; }
    if (!newTime) { showModalError('reschedule-form-error', 'Please select a new time.'); return; }

    const capturedOldDate  = rescheduleOldDate;
    const capturedTargetId = rescheduleTargetId;
    const dbId = capturedTargetId?.split('-')[1];

    const submitBtn = document.querySelector('#form-reschedule .btn-modal-submit');
    const origText  = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    try {
        const reason   = document.getElementById('reschedule-reason')?.value || '';
        const updated  = await apiRescheduleBooking(dbId, newDate, displayTime, reason);
        bookingsDB = bookingsDB.map(b => String(b.id) === String(dbId) ? updated : b);
        saveBookingsToSession();
        closeRescheduleModal();
        await renderBookingsUI(true);
        showToast('Appointment rescheduled successfully!', 'success');
        notifyAppointmentRescheduled(capturedOldDate || 'original date', `${newDate} at ${displayTime}`);
    } catch (err) {
        showModalError('reschedule-form-error', 'Could not reschedule: ' + err.message);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
    }
}

// ==========================================
//   CANCELLATION & CONFIRMATION FLOW
// ==========================================
let pendingAction = null;
let pendingId     = null;

function promptCancelApt(cardId, aptDate) {
    // U_R4 — block cancellations less than 3 days away
    if (aptDate) {
        const today  = new Date(); today.setHours(0, 0, 0, 0);
        const apt    = new Date(aptDate + 'T00:00:00');
        const diff   = Math.ceil((apt - today) / (1000 * 60 * 60 * 24));
        if (diff <= 3) {
            // Show blocked state in confirm modal instead of normal cancel flow
            const icon     = document.getElementById('confirm-icon');
            const cancelBtn = document.querySelector('#modal-confirm-action .btn-modal-cancel');
            const proceedBtn = document.getElementById('btn-execute-action');
            icon.className   = 'fa-solid fa-phone success-icon';
            icon.style.color = '#3e1f1c';
            document.getElementById('confirm-title').innerText   = 'CANCELLATION BLOCKED';
            document.getElementById('confirm-message').innerHTML =
                `This appointment is <strong>${diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `${diff} days away`}</strong>.<br><br>
                 Appointments within 3 days cannot be cancelled online.<br>
                 Please call our office directly:<br>
                 <strong style="color:#DD523C;font-size:1.1rem;">(02) 852-23027</strong>`;
            document.getElementById('cancel-reason-container').style.display = 'none';
            if (cancelBtn)  cancelBtn.style.display = 'none';
            if (proceedBtn) { proceedBtn.innerText = 'OK, GOT IT'; proceedBtn.onclick = closeConfirmAction; }
            document.getElementById('modal-confirm-action')?.classList.add('active');
            return;
        }
    }

    pendingAction = 'cancel-apt';
    pendingId     = cardId;
    // Restore the execute button to its normal handler in case it was overridden
    const proceedBtn = document.getElementById('btn-execute-action');
    if (proceedBtn) { proceedBtn.onclick = null; proceedBtn.innerText = 'YES, PROCEED'; }
    const cancelBtn  = document.querySelector('#modal-confirm-action .btn-modal-cancel');
    const icon       = document.getElementById('confirm-icon');
    if (cancelBtn)  cancelBtn.style.display = 'block';
    icon.className   = 'fa-solid fa-triangle-exclamation success-icon';
    icon.style.color = '#DD523C';
    document.getElementById('confirm-title').innerText   = 'CANCEL APPOINTMENT?';
    document.getElementById('confirm-message').innerHTML = 'Please provide a reason. This action cannot be undone.';
    document.getElementById('cancel-reason-container').style.display = 'block';
    document.getElementById('cancel-reason-select').selectedIndex    = 0;
    document.getElementById('modal-confirm-action')?.classList.add('active');
}

function promptDeleteProperty(propId) {
    closePropertiesManager();
    pendingAction = 'delete-prop';
    pendingId     = propId;
    const cancelBtn  = document.querySelector('#modal-confirm-action .btn-modal-cancel');
    const proceedBtn = document.getElementById('btn-execute-action');
    if (cancelBtn)  cancelBtn.style.display = 'block';
    if (proceedBtn) proceedBtn.innerText     = 'YES, PROCEED';
    document.getElementById('confirm-title').innerText   = 'DELETE PROPERTY?';
    document.getElementById('confirm-message').innerHTML = 'Are you sure you want to remove this property?<br>This action cannot be undone.';
    document.getElementById('confirm-icon').className    = 'fa-solid fa-trash success-icon';
    document.getElementById('confirm-icon').style.color  = '#3e1f1c';
    document.getElementById('cancel-reason-container').style.display = 'none';
    document.getElementById('modal-confirm-action')?.classList.add('active');
}

function promptLogout() {
    pendingAction = 'logout';
    const modal      = document.getElementById('modal-confirm-action');
    if (!modal) return;
    const cancelBtn  = modal.querySelector('.btn-modal-cancel');
    const proceedBtn = document.getElementById('btn-execute-action');
    const icon       = document.getElementById('confirm-icon');
    icon.className   = 'fa-solid fa-arrow-right-from-bracket success-icon';
    icon.style.color = '#3e1f1c';
    document.getElementById('confirm-title').innerText   = 'LOGOUT?';
    document.getElementById('confirm-message').innerHTML = 'Are you sure you want to securely log out?';
    if (cancelBtn)  cancelBtn.style.display = 'block';
    if (proceedBtn) proceedBtn.innerText     = 'YES, LOGOUT';
    document.getElementById('cancel-reason-container').style.display = 'none';
    modal.classList.add('active');
}

function closeConfirmAction() {
    document.getElementById('modal-confirm-action')?.classList.remove('active');
    if (pendingAction === 'delete-prop') openPropertiesManager();
    pendingAction = null;
    pendingId     = null;
    // Reset proceed button in case it was overridden by a blocked-action modal
    const proceedBtn = document.getElementById('btn-execute-action');
    if (proceedBtn) { proceedBtn.onclick = null; proceedBtn.disabled = false; proceedBtn.textContent = 'YES, PROCEED'; }
    const cancelBtn = document.querySelector('#modal-confirm-action .btn-modal-cancel');
    if (cancelBtn) cancelBtn.style.display = 'block';
}

async function handleExecuteAction() {
    if (pendingAction === 'cancel-apt') {
        const reason = document.getElementById('cancel-reason-select')?.value;
        if (!reason) {
            const sel = document.getElementById('cancel-reason-select');
            if (sel) { sel.style.outline = '2px solid #ef4444'; setTimeout(() => sel.style.outline = '', 2000); }
            return;
        }
        const dbId      = pendingId.split('-')[1];
        const booking   = bookingsDB.find(b => String(b.id) === String(dbId));
        const origDate  = booking?.date;

        const proceedBtn = document.getElementById('btn-execute-action');
        if (proceedBtn) { proceedBtn.disabled = true; proceedBtn.textContent = 'Cancelling...'; }

        try {
            const updated = await apiCancelBooking(dbId, reason);
            bookingsDB = bookingsDB.map(b => String(b.id) === String(dbId) ? updated : b);
            saveBookingsToSession();
            closeConfirmAction();
            await renderBookingsUI(true);
            renderEquipmentTab();
            setTimeout(() => showToast('Appointment cancelled successfully.', 'info'), 300);
            notifyAppointmentCancelled(origDate, `apt-${dbId}`);
        } catch (err) {
            showToast('Could not cancel appointment. Please try again.', 'error');
            if (proceedBtn) { proceedBtn.disabled = false; proceedBtn.textContent = 'YES, PROCEED'; }
            closeConfirmAction();
        }
    }
    else if (pendingAction === 'delete-prop') {
        const proceedBtn = document.getElementById('btn-execute-action');
        if (proceedBtn) { proceedBtn.disabled = true; proceedBtn.textContent = 'Deleting...'; }
        try {
            await apiDeleteProperty(pendingId);
            propertiesList = propertiesList.filter(p => String(p.id) !== String(pendingId));
            updateStatsUI();
            updatePropertyDropdowns();
            closeConfirmAction();
            showToast('Property deleted successfully.', 'success');
        } catch (err) {
            showToast('Could not delete property. Please try again.', 'error');
            if (proceedBtn) { proceedBtn.disabled = false; proceedBtn.textContent = 'YES, PROCEED'; }
        }
    }
    else if (pendingAction === 'logout') {
        const proceedBtn = document.getElementById('btn-execute-action');
        if (proceedBtn) { proceedBtn.classList.add('btn-loading'); proceedBtn.disabled = true; }
        // Clear both storage types (Remember Me uses localStorage, session-only uses sessionStorage)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('algimon_bookings');
        setTimeout(() => { window.location.href = 'login.html'; }, 600);
    }
}

// ==========================================
//   DAILY REMINDER NOTIFICATIONS
// ==========================================
function checkUpcomingAppointments() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    bookingsDB.forEach(booking => {
        if (booking.status !== 'APPROVED' && booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return;
        const aptDate  = new Date(booking.date + 'T00:00:00'); aptDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((aptDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            addNotificationToBell({
                icon: 'fa-clock', color: '#f59e0b',
                title: 'Reminder: Service Tomorrow',
                message: `Your ${booking.serviceName} at ${booking.property} is scheduled for tomorrow at ${booking.time}.`,
            });
        }
    });
}

// ==========================================
//   MAIN RENDERING ENGINE
//   Pass skipFetch=true after local mutations
//   (create, cancel, reschedule) so the
//   in-memory bookingsDB is not overwritten.
// ==========================================
async function renderBookingsUI(skipFetch = false) {
    const upcomingList = document.getElementById('upcoming-appointments-list');
    const historyList  = document.getElementById('history-appointments-list');
    if (!upcomingList || !historyList) return;

    if (!skipFetch) {
        // Show skeleton only on initial load
        const skeleton = `<div style="padding:24px 0;"><div style="height:16px;background:#f0f0f0;border-radius:8px;width:60%;margin-bottom:12px;animation:pulse 1.5s infinite;"></div><div style="height:12px;background:#f0f0f0;border-radius:8px;width:40%;animation:pulse 1.5s infinite;"></div></div>`.repeat(3);
        upcomingList.innerHTML = skeleton;
        historyList.innerHTML  = skeleton;

        try {
            bookingsDB = await apiFetchBookings();
        } catch (err) {
            console.error('[Algimon] Could not load bookings:', err.message);
            upcomingList.innerHTML = `<p style="color:#b91c1c;padding:16px;">Could not load appointments. Please refresh.</p>`;
            historyList.innerHTML  = '';
            return;
        }
    }

    upcomingList.innerHTML = '';
    historyList.innerHTML  = '';

    const upcoming = bookingsDB
        .filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const history = bookingsDB
        .filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED')
        .sort((a, b) => {
            const tA = a.updatedAt ? new Date(a.updatedAt) : new Date(a.date);
            const tB = b.updatedAt ? new Date(b.updatedAt) : new Date(b.date);
            return tB - tA;
        });

    upcoming.forEach(booking => upcomingList.insertAdjacentHTML('beforeend', generateUserBookingCard(booking)));
    history.forEach( booking => historyList.insertAdjacentHTML('beforeend',  generateUserBookingCard(booking)));

    updateStatsUI();
    checkEmptyStates();
    initRipples();
}

// ==========================================
//   CARD GENERATOR (XSS-safe)
// ==========================================
function generateUserBookingCard(booking) {
    let badgeClass = '', badgeIcon = '', badgeText = booking.status;
    let paymentUI = '', actionButtons = '', staffUI = '';

    if (booking.technician_name && (booking.status === 'APPROVED' || booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS' || booking.status === 'IN-PROGRESS')) {
        staffUI = `
            <div class="assigned-staff-box" style="margin-top:15px;">
                <div class="staff-icon"><i class="fa-solid fa-id-badge"></i></div>
                <div class="staff-details">
                    <strong>${sanitize(booking.technician_name)}</strong>
                    <span>Assigned Technician (Clear for Entry)</span>
                </div>
            </div>`;
    }

    const priceStr = booking.final_price ? Number(booking.final_price).toLocaleString() : null;

    // Countdown pill for upcoming appointments
    const cardToday = new Date(); cardToday.setHours(0,0,0,0);
    const cardAptDate = new Date(booking.date + 'T00:00:00');
    const daysAway = Math.ceil((cardAptDate - cardToday) / (1000 * 60 * 60 * 24));
    let countdownPill = '';
    if (booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED') {
        if (daysAway === 0)
            countdownPill = `<span style="display:inline-block;background:#dc2626;color:#fff;font-size:0.68rem;font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:0.5px;padding:2px 9px;border-radius:20px;margin-left:6px;vertical-align:middle;">TODAY</span>`;
        else if (daysAway === 1)
            countdownPill = `<span style="display:inline-block;background:#f97316;color:#fff;font-size:0.68rem;font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:0.5px;padding:2px 9px;border-radius:20px;margin-left:6px;vertical-align:middle;">TOMORROW</span>`;
        else if (daysAway > 1 && daysAway <= 7)
            countdownPill = `<span style="display:inline-block;background:#d97706;color:#fff;font-size:0.68rem;font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:0.5px;padding:2px 9px;border-radius:20px;margin-left:6px;vertical-align:middle;">${daysAway} DAYS</span>`;
    }

    if (booking.status === 'CANCELLED') {
        const eqInfo = booking.equipment_id
            ? `<div class="detail-item"><i class="fa-solid fa-fire-extinguisher" style="color:#b91c1c;"></i><div><strong style="color:#7f1d1d;">Equipment ID: ${sanitize(String(booking.equipment_id))}</strong><span style="color:#991b1b;">Linked Equipment</span></div></div>`
            : '';
        return `
            <div class="appointment-card history-card animate-card" id="apt-${sanitize(String(booking.id))}" data-date="${sanitize(booking.date)}" style="border-color:#fca5a5;background-color:#fef2f2;">
                <div class="card-top">
                    <div class="card-title-row">
                        <h3 style="color:#7f1d1d;text-decoration:line-through;">${sanitize(booking.serviceName)}</h3>
                        <span class="badge" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;"><i class="fa-solid fa-ban"></i> CANCELLED</span>
                    </div>
                    <div class="property-name" style="color:#7f1d1d;"><i class="fa-regular fa-building"></i> ${sanitize(booking.property)}</div>
                    <div class="appointment-id">Appointment ID: #${sanitize(String(booking.id))}</div>
                </div>
                <div class="card-details">
                    <div class="detail-item"><i class="fa-regular fa-calendar" style="color:#b91c1c;"></i><div><strong style="color:#7f1d1d;">${formatDateDisplay(booking.date)}</strong><span style="color:#991b1b;">Original Schedule</span></div></div>
                    ${booking.cancel_reason ? `<div class="detail-item"><i class="fa-solid fa-circle-info" style="color:#b91c1c;"></i><div><strong style="color:#7f1d1d;">${sanitize(booking.cancel_reason)}</strong><span style="color:#991b1b;">Reason Logged</span></div></div>` : ''}
                    ${eqInfo}
                </div>
            </div>`;
    }

    if (booking.status === 'PENDING') {
        badgeClass = 'badge-pending'; badgeIcon = 'fa-clock';
        actionButtons = `
            <button class="btn-card-outline ripple-btn hover-lift" onclick="openRescheduleModal('apt-${sanitize(String(booking.id))}','${sanitize(booking.date)}')"><i class="fa-regular fa-calendar-plus"></i> RESCHEDULE</button>
            <button class="btn-card-outline ripple-btn hover-lift" onclick="promptCancelApt('apt-${sanitize(String(booking.id))}','${sanitize(booking.date)}')"><i class="fa-solid fa-xmark"></i> CANCEL</button>`;
        paymentUI = `
            <div class="payment-notice" style="margin-top:12px;background:#fffbeb;border-color:#fde68a;color:#92400e;">
                <i class="fa-solid fa-hourglass-half" style="color:#d97706;"></i>
                <div>
                    <strong>Awaiting Admin Review</strong>
                    <p style="margin:4px 0 0;font-size:0.82rem;color:#a16207;">Our team will assess your request and set a quoted price. You'll receive an email once approved.</p>
                </div>
            </div>`;
    } else if (booking.status === 'APPROVED' || booking.status === 'CONFIRMED') {
        badgeClass = 'badge-approved'; badgeIcon = 'fa-thumbs-up';
        badgeText  = 'CONFIRMED';
        const priceDisplay = priceStr ? `₱${priceStr}` : 'To be confirmed';
        const priceNote   = priceStr
            ? 'Please prepare the exact amount for on-site payment upon service completion.'
            : 'Our team will confirm the final amount before the service date.';
        actionButtons = `
            <button class="btn-card-outline ripple-btn hover-lift" onclick="openRescheduleModal('apt-${sanitize(String(booking.id))}','${sanitize(booking.date)}')"><i class="fa-regular fa-calendar-plus"></i> RESCHEDULE</button>
            <button class="btn-card-outline ripple-btn hover-lift" onclick="promptCancelApt('apt-${sanitize(String(booking.id))}','${sanitize(booking.date)}')"><i class="fa-solid fa-xmark"></i> CANCEL</button>`;
        paymentUI  = `
            <div class="payment-notice" style="margin-top:15px;">
                <i class="fa-solid fa-wallet"></i>
                <div>
                    <strong>Quoted Price: <span class="final-price-display">${priceDisplay}</span></strong>
                    <p style="margin:0;font-size:0.85rem;color:#555;">${priceNote}</p>
                </div>
            </div>`;
    } else if (booking.status === 'IN_PROGRESS' || booking.status === 'IN-PROGRESS') {
        badgeClass = 'badge-in-progress'; badgeIcon = 'fa-person-digging'; badgeText = 'IN-PROGRESS';
        paymentUI  = `
            <div class="payment-notice" style="background:#e0f2fe;border-color:#bae6fd;color:#0369a1;margin-top:15px;">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <div>
                    <strong>Service Ongoing</strong>
                    <p style="margin:0;font-size:0.85rem;">${priceStr ? `Payment of ₱${priceStr} will be collected shortly.` : 'Our technician is on-site. Payment will be collected upon completion.'}</p>
                </div>
            </div>`;
    } else if (booking.status === 'COMPLETED') {
        badgeClass = 'badge-completed'; badgeIcon = 'fa-check-circle';
        paymentUI  = `
            <div class="payment-notice" style="background:#dcfce7;border-color:#bbf7d0;color:#166534;margin-top:15px;">
                <i class="fa-solid fa-receipt"></i>
                <div>
                    <strong>Paid &amp; Completed</strong>
                    <p style="margin:0;font-size:0.85rem;">Amount Collected: ${priceStr ? '&#8369;' + priceStr : 'N/A'}</p>
                </div>
            </div>`;
    }

    let equipmentLinkBadge = '';
    if (booking.equipment_id && booking.status === 'COMPLETED') {
        equipmentLinkBadge = `
            <div class="detail-item" style="margin-top:5px;">
                <i class="fa-solid fa-fire-extinguisher" style="color:#10b981;font-size:1.1rem;"></i>
                <div><strong style="color:#065f46;">Equipment Updated</strong><span>ID: ${sanitize(String(booking.equipment_id))} — Renewal date recalculated</span></div>
            </div>`;
    }

    const isHistory = booking.status === 'COMPLETED' ? 'history-card' : 'upcoming-card';
    const iconStyle = booking.status === 'COMPLETED' ? 'style="color:#10b981;border-color:#10b981;"' : '';

    return `
        <div class="appointment-card ${isHistory} animate-card" id="apt-${sanitize(String(booking.id))}" data-date="${sanitize(booking.date)}">
            <div class="card-top">
                <div class="card-title-row">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <h3>${sanitize(booking.serviceName)}</h3>
                        ${countdownPill}
                    </div>
                    <span class="badge ${badgeClass}"><i class="fa-solid ${badgeIcon}"></i> ${badgeText.replace(/_/g, ' ')}</span>
                </div>
                <div class="property-name"><i class="fa-regular fa-building"></i> ${sanitize(booking.property)}</div>
                <div class="appointment-id">Appointment ID: #${sanitize(String(booking.id))}</div>
            </div>
            <div class="card-details">
                <div class="detail-item"><i class="fa-regular fa-calendar red-icon" ${iconStyle}></i><div><strong>${formatDateDisplay(booking.date)}</strong><span>Date</span></div></div>
                <div class="detail-item"><i class="fa-regular fa-clock red-icon" ${iconStyle}></i><div><strong>${sanitize(booking.time)}</strong><span>Time</span></div></div>
                ${equipmentLinkBadge}
            </div>
            ${staffUI}
            ${paymentUI}
            ${actionButtons ? `<div class="card-actions" style="margin-top:15px;">${actionButtons}</div>` : ''}
        </div>`;
}

// ==========================================
//   SERVER PUSH HANDLER (WebSocket-ready)
//   Call this when your backend pushes a
//   status update via WebSocket or SSE.
//   Example: socket.on('booking-update', handleServerPush)
// ==========================================
function handleServerPush(payload) {
    const idx = bookingsDB.findIndex(b => String(b.id) === String(payload.appointmentId));
    if (idx === -1) return;

    bookingsDB[idx].status = payload.newStatus;
    if (payload.price)    bookingsDB[idx].final_price     = payload.price;
    if (payload.techName) bookingsDB[idx].technician_name = payload.techName;
    if (payload.newStatus === 'COMPLETED' || payload.newStatus === 'CANCELLED') {
        bookingsDB[idx].updatedAt = new Date().toISOString();
    }

    if (payload.newStatus === 'COMPLETED' && bookingsDB[idx].equipment_id) {
        // Locally update the equipment renewal date instead of re-fetching mock API
        const eqIdx = equipmentDB.findIndex(e => String(e.id) === String(bookingsDB[idx].equipment_id));
        if (eqIdx !== -1) {
            const today        = new Date();
            const completedDate = today.toISOString().split('T')[0];
            // Calculate next renewal: 1 year from today
            const nextYear = new Date(today);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            const nextRenewal = nextYear.toISOString().split('T')[0];

            equipmentDB[eqIdx].lastServiced = completedDate;
            equipmentDB[eqIdx].nextRenewal  = nextRenewal;
            equipmentDB[eqIdx].status       = computeEquipmentStatus(equipmentDB[eqIdx]);
        }
        renderEquipmentTab();
        addNotificationToBell({ icon: 'fa-rotate', color: '#10b981', title: 'Equipment Record Updated', message: `Equipment ${bookingsDB[idx].equipment_id} renewal date recalculated to next year.` });
    }
    if (payload.newStatus === 'APPROVED') {
        addNotificationToBell({ icon: 'fa-thumbs-up', color: '#4338ca', title: 'Appointment Approved', message: `Your ${bookingsDB[idx].serviceName} is approved. Quoted price: ₱${payload.price?.toLocaleString()}.` });
    } else if (payload.newStatus === 'IN_PROGRESS') {
        addNotificationToBell({ icon: 'fa-truck-fast', color: '#0369a1', title: 'Staff En Route', message: `Technician ${payload.techName} is on the way for your ${bookingsDB[idx].serviceName}.` });
    } else if (payload.newStatus === 'COMPLETED') {
        addNotificationToBell({ icon: 'fa-circle-check', color: '#10b981', title: 'Service Completed!', message: `Your ${bookingsDB[idx].serviceName} at ${bookingsDB[idx].property} has been completed successfully.` });
    }

    renderBookingsUI(true);
    saveBookingsToSession();
}
const moNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
let currentMonthObj = { schedule: new Date().getMonth(), reschedule: new Date().getMonth() };
let currentYearObj  = { schedule: new Date().getFullYear(), reschedule: new Date().getFullYear() };
let selectedDateObj = { schedule: null, reschedule: null };

function populateCalendarDropdowns(target) {
    const mSelect = document.getElementById(`cal-month-${target}`);
    const ySelect = document.getElementById(`cal-year-${target}`);
    if (!mSelect || !ySelect) return;
    const today   = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 3);
    const curY  = today.getFullYear();
    ySelect.innerHTML = '';
    for (let i = 0; i <= 5; i++) ySelect.add(new Option(curY + i, curY + i));
    ySelect.value = currentYearObj[target];
    mSelect.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const opt = new Option(moNames[i], i);
        // Disable months entirely before the minimum selectable month
        if (currentYearObj[target] === minDate.getFullYear() && i < minDate.getMonth()) opt.disabled = true;
        mSelect.add(opt);
    }
    mSelect.value = currentMonthObj[target];
}

function changeCalMonthYear(target) {
    const mVal  = parseInt(document.getElementById(`cal-month-${target}`).value);
    const yVal  = parseInt(document.getElementById(`cal-year-${target}`).value);
    const today = new Date();
    currentMonthObj[target] = (yVal === today.getFullYear() && mVal < today.getMonth()) ? today.getMonth() : mVal;
    currentYearObj[target]  = yVal;
    renderCalendar(target);
}

function renderCalendar(target) {
    populateCalendarDropdowns(target);
    const daysContainer = document.getElementById(`calendar-days-${target}`);
    if (!daysContainer) return;
    const cm = currentMonthObj[target];
    const cy = currentYearObj[target];
    daysContainer.innerHTML = '';
    const firstDay    = new Date(cy, cm, 1).getDay();
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const today       = new Date(); today.setHours(0, 0, 0, 0);

    // Both scheduling and rescheduling require at least 3 days in advance
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 3);

    // Update hint text with the actual first available date
    const hintEl = document.getElementById(`cal-hint-${target}`);
    if (hintEl) {
        const firstAvail = minDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        hintEl.innerHTML = `<i class="fa-solid fa-circle-info"></i> Earliest available: <strong>${firstAvail}</strong>`;
    }

    for (let i = 0; i < firstDay; i++) {
        daysContainer.appendChild(Object.assign(document.createElement('div'), { className: 'cal-day empty' }));
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv  = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.textContent = i;
        const thisDate = new Date(cy, cm, i);
        const isToday  = thisDate.getTime() === today.getTime();
        if (thisDate < minDate) {
            dayDiv.classList.add('disabled-date');
            dayDiv.title = 'Requires at least 3 days advance notice';
            if (isToday) {
                // Mark today even though it's disabled
                dayDiv.style.position = 'relative';
                dayDiv.innerHTML = `${i}<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:5px;height:5px;background:#df5345;border-radius:50%;display:block;"></span>`;
                dayDiv.title = 'Today (not available — 3 days advance required)';
            }
        } else {
            // Check if this date is blocked by admin
            const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (blockedDatesSet.has(dateStr)) {
                dayDiv.classList.add('disabled-date', 'blocked-date');
                dayDiv.title = 'This date is unavailable (blocked by admin)';
                dayDiv.style.position = 'relative';
                dayDiv.innerHTML = `${i}<span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);font-size:0.55rem;color:#b91c1c;font-weight:700;">✕</span>`;
            } else {
                const sel = selectedDateObj[target];
                if (sel && sel.getDate() === i && sel.getMonth() === cm && sel.getFullYear() === cy) {
                    dayDiv.classList.add('selected');
                }
                dayDiv.onclick = function () {
                    daysContainer.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
                    dayDiv.classList.add('selected');
                    selectedDateObj[target] = new Date(cy, cm, i);
                    const valId = target === 'schedule' ? 'selected-schedule-date' : 'reschedule-date';
                    document.getElementById(valId).value = dateStr;
                    if (target === 'schedule') checkDuplicateInline();
                };
            }
        }
        daysContainer.appendChild(dayDiv);
    }
}

function prevMonth(target) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 3);
    if (currentYearObj[target] === minDate.getFullYear() && currentMonthObj[target] <= minDate.getMonth()) return;
    currentMonthObj[target]--;
    if (currentMonthObj[target] < 0) { currentMonthObj[target] = 11; currentYearObj[target]--; }
    renderCalendar(target);
}

function nextMonth(target) {
    currentMonthObj[target]++;
    if (currentMonthObj[target] > 11) { currentMonthObj[target] = 0; currentYearObj[target]++; }
    renderCalendar(target);
}

// ==========================================
//   TIME PICKER
// ==========================================
let tp_hour = 7, tp_minute = 0, tp_isAM = true, tp_view = 'hour', tp_target = 'schedule', tp_mode = 'clock';

// Returns the admin time-slot config for a given JS Date object (or today if null)
function getTimeSlotsForDate(dateObj) {
    if (!dateObj || Object.keys(timeSlotsConfig).length === 0) return null;
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey   = dayNames[dateObj.getDay()];
    const cfg      = timeSlotsConfig[dayKey];
    if (!cfg || !cfg.active) return null; // day is inactive
    return cfg; // { active, start: 'HH:MM', end: 'HH:MM', maxSlots }
}

// Shows a hint banner on the time picker with allowed hours for the selected date
function showTimeSlotHint(target) {
    const dateStr  = target === 'schedule'
        ? document.getElementById('selected-schedule-date')?.value
        : document.getElementById('reschedule-date')?.value;
    const hintEl   = document.getElementById('tp-slot-hint');
    if (!hintEl) return;

    if (!dateStr) { hintEl.style.display = 'none'; return; }

    const dateObj  = new Date(dateStr + 'T00:00:00');
    const cfg      = getTimeSlotsForDate(dateObj);

    if (!cfg) {
        hintEl.style.display = 'none';
        return;
    }

    // Convert 24h to 12h for display
    const fmt = t => {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12  = h % 12 || 12;
        return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
    };
    hintEl.textContent = `⏰ Available: ${fmt(cfg.start)} – ${fmt(cfg.end)}`;
    hintEl.style.display = 'block';
}

function openTimePicker(target = 'schedule') {
    tp_target = target;
    document.getElementById('modal-time-picker')?.classList.add('active');
    updateTimeDisplay();
    switchTimeView('hour');
    showTimeSlotHint(target);
}
function closeTimePicker() { document.getElementById('modal-time-picker')?.classList.remove('active'); }

function confirmTimePicker() {
    if (tp_mode === 'keyboard') {
        tp_hour   = Math.min(12, Math.max(1, parseInt(document.getElementById('tp-key-hr')?.value)  || 12));
        tp_minute = Math.min(59, Math.max(0, parseInt(document.getElementById('tp-key-min')?.value) || 0));
    }

    // ── Validate against admin time-slot config ──────────────────────────────
    const dateStr = tp_target === 'schedule'
        ? document.getElementById('selected-schedule-date')?.value
        : document.getElementById('reschedule-date')?.value;

    if (dateStr) {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const cfg     = getTimeSlotsForDate(dateObj);

        if (cfg) {
            // Convert selected 12h time → 24h minutes-since-midnight
            let h24 = tp_hour;
            if (!tp_isAM && h24 !== 12) h24 += 12;
            if  (tp_isAM && h24 === 12) h24  = 0;
            const selectedMins = h24 * 60 + tp_minute;

            const [startH, startM] = cfg.start.split(':').map(Number);
            const [endH,   endM  ] = cfg.end.split(':').map(Number);
            const startMins = startH * 60 + startM;
            const endMins   = endH   * 60 + endM;

            const fmt = t => {
                const [h, m] = t.split(':').map(Number);
                const ampm = h >= 12 ? 'PM' : 'AM';
                return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
            };

            if (selectedMins < startMins || selectedMins > endMins) {
                showModalError(
                    tp_target === 'schedule' ? 'schedule-form-error' : 'reschedule-form-error',
                    `⏰ Please choose a time between ${fmt(cfg.start)} and ${fmt(cfg.end)} for this day.`
                );
                return; // don't close picker — let user correct
            }
        }
    }
    // ────────────────────────────────────────────────────────────────────────

    const hStr    = String(tp_hour).padStart(2, '0');
    const mStr    = String(tp_minute).padStart(2, '0');
    const ampmStr = tp_isAM ? 'AM' : 'PM';
    const displayString = `${hStr}:${mStr} ${ampmStr}`;
    let h24 = tp_hour;
    if (!tp_isAM && h24 !== 12) h24 += 12;
    if  (tp_isAM && h24 === 12) h24 = 0;
    const valueString = `${String(h24).padStart(2, '0')}:${mStr}`;

    const dispId = tp_target === 'schedule' ? 'display-selected-time' : 'display-reschedule-time';
    const valId  = tp_target === 'schedule' ? 'selected-schedule-time' : 'reschedule-time';
    const dispEl = document.getElementById(dispId);
    if (dispEl) { dispEl.textContent = displayString; dispEl.style.color = '#000'; }
    const valEl = document.getElementById(valId);
    if (valEl) valEl.value = valueString;
    closeTimePicker();
}

function updateTimeDisplay() {
    const get = id => document.getElementById(id);
    if (get('tp-hour-display'))   get('tp-hour-display').textContent   = String(tp_hour).padStart(2, '0');
    if (get('tp-minute-display')) get('tp-minute-display').textContent = String(tp_minute).padStart(2, '0');
    if (get('tp-am-btn'))         get('tp-am-btn').className           = tp_isAM  ? 'tp-active' : '';
    if (get('tp-pm-btn'))         get('tp-pm-btn').className           = !tp_isAM ? 'tp-active' : '';
    if (get('tp-key-hr'))         get('tp-key-hr').value               = String(tp_hour).padStart(2, '0');
    if (get('tp-key-min'))        get('tp-key-min').value              = String(tp_minute).padStart(2, '0');
}

function setAMPM(val) { tp_isAM = (val === 'AM'); updateTimeDisplay(); }

function switchTimeView(view) {
    tp_view = view;
    const hd = document.getElementById('tp-hour-display');
    const md = document.getElementById('tp-minute-display');
    if (hd) hd.className = view === 'hour'   ? 'tp-active' : '';
    if (md) md.className = view === 'minute' ? 'tp-active' : '';
    renderClockFace();
}

function renderClockFace() {
    const container = document.getElementById('tp-numbers-container');
    if (!container) return;
    container.innerHTML = '';
    const radius = 95, center = 120;
    const items = tp_view === 'hour'
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : Array.from({ length: 12 }, (_, i) => i * 5);
    items.forEach(val => {
        const el = document.createElement('div');
        el.className = 'tp-clock-num';
        el.textContent = tp_view === 'minute' ? String(val).padStart(2, '0') : val;
        const angle = (val / (tp_view === 'hour' ? 12 : 60)) * 360 - 90;
        el.style.left = (center + radius * Math.cos(angle * Math.PI / 180)) + 'px';
        el.style.top  = (center + radius * Math.sin(angle * Math.PI / 180)) + 'px';
        el.onclick = () => {
            if (tp_view === 'hour') {
                tp_hour = val; updateTimeDisplay(); setHandAngle((tp_hour / 12) * 360);
                setTimeout(() => switchTimeView('minute'), 300);
            } else {
                tp_minute = val; updateTimeDisplay(); setHandAngle((tp_minute / 60) * 360);
            }
        };
        container.appendChild(el);
    });
    setHandAngle(tp_view === 'hour' ? (tp_hour / 12) * 360 : (tp_minute / 60) * 360);
}

function setHandAngle(degrees) {
    const hand = document.getElementById('tp-hand');
    if (hand) { hand.style.transform = `translate(-50%, 0) rotate(${degrees}deg)`; hand.style.height = '85px'; }
}

function toggleTimeInputMode() {
    const clockCont = document.getElementById('tp-clock-container');
    const keyCont   = document.getElementById('tp-keyboard-container');
    const icon      = document.getElementById('tp-mode-icon');
    if (!clockCont || !keyCont || !icon) return;
    if (tp_mode === 'clock') {
        tp_mode = 'keyboard';
        clockCont.style.display = 'none';
        keyCont.style.display   = 'flex';
        icon.className = 'fa-regular fa-clock';
    } else {
        tp_mode = 'clock';
        tp_hour   = Math.min(12, Math.max(1, parseInt(document.getElementById('tp-key-hr')?.value)  || 12));
        tp_minute = Math.min(59, Math.max(0, parseInt(document.getElementById('tp-key-min')?.value) || 0));
        updateTimeDisplay();
        switchTimeView('hour');
        clockCont.style.display = 'block';
        keyCont.style.display   = 'none';
        icon.className = 'fa-solid fa-keyboard';
    }
}

function formatKeyboardInput() {
    const hrInput  = document.getElementById('tp-key-hr');
    const minInput = document.getElementById('tp-key-min');
    if (hrInput  && hrInput.value.length  > 2) hrInput.value  = hrInput.value.slice(0, 2);
    if (minInput && minInput.value.length > 2) minInput.value = minInput.value.slice(0, 2);
}

// ==========================================
//   BELL NOTIFICATIONS — LOCAL PUSH
//   Used for immediate in-session feedback.
//   These are also persisted on next poll
//   since the backend generates them from
//   real appointment data automatically.
// ==========================================
function addNotificationToBell({ icon, color, title, message }) {
    const notifContent = document.getElementById('notif-content');
    if (!notifContent) return;
    // Remove "empty" state if present
    const empty = notifContent.querySelector('.notif-empty');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'notif-item unread';
    item.innerHTML = `
        <i class="fa-solid ${sanitize(icon)}" style="color:${sanitize(color)};"></i>
        <div>
            <p>${sanitize(title)}</p>
            <span>${sanitize(message)}</span>
            <time style="font-size:0.72rem;color:#aaa;font-family:'Open Sans',sans-serif;display:block;margin-top:3px;">Just now</time>
        </div>`;
    notifContent.insertBefore(item, notifContent.firstChild);
    unreadNotifCount++;
    updateNotifBadge();
    setTimeout(() => item.classList.remove('unread'), 5000);
}

function notifyAppointmentCreated({ service, date }) {
    addNotificationToBell({ icon: 'fa-calendar-check', color: '#10b981', title: 'Appointment Submitted', message: `Your ${service} appointment for ${date} has been submitted for review.` });
}

function notifyAppointmentRescheduled(oldDate, newDate) {
    addNotificationToBell({ icon: 'fa-clock-rotate-left', color: '#3b82f6', title: 'Reschedule Request Sent', message: `Rescheduled from ${oldDate} to ${newDate}. Awaiting confirmation.` });
}

function notifyAppointmentCancelled(date) {
    addNotificationToBell({ icon: 'fa-calendar-xmark', color: '#d00000', title: 'Appointment Cancelled', message: `Your appointment scheduled for ${date} has been cancelled and logged.` });
}

// ==========================================
//   TOAST NOTIFICATIONS
// ==========================================
function showToast(actionType) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const map = {
        'schedule':         { title: 'APPOINTMENT CONFIRMED',  message: 'Your appointment has been scheduled successfully.',   icon: 'fa-calendar-check',        type: 'success' },
        'reschedule':       { title: 'RESCHEDULE CONFIRMED',   message: 'Your appointment has been successfully updated.',     icon: 'fa-calendar-check',        type: 'success' },
        'cancel':           { title: 'CANCELLATION CONFIRMED', message: 'Appointment cancelled. This action was recorded.',    icon: 'fa-calendar-xmark',        type: 'error'   },
        'property-added':   { title: 'PROPERTY ADDED',         message: 'New location added to your managed properties.',      icon: 'fa-building-circle-check', type: 'success' },
        'property-updated': { title: 'PROPERTY UPDATED',       message: 'Location details have been successfully saved.',      icon: 'fa-pen-to-square',         type: 'success' },
        'property-deleted': { title: 'PROPERTY REMOVED',       message: 'The property has been permanently deleted.',          icon: 'fa-trash-can',             type: 'error'   },
        'profile':          { title: 'PROFILE UPDATED',        message: 'Your account settings have been saved.',              icon: 'fa-user-check',            type: 'success' },
        'equipment-updated':{ title: 'EQUIPMENT UPDATED',      message: 'Equipment renewal dates have been recalculated.',     icon: 'fa-rotate',                type: 'success' },
        'cancel-error':     { title: 'ACTION FAILED',          message: 'Could not cancel appointment. Please try again.',     icon: 'fa-circle-exclamation',    type: 'error'   },
        'delete-error':     { title: 'DELETE FAILED',          message: 'Could not delete property. Please try again.',        icon: 'fa-circle-exclamation',    type: 'error'   },
    };
    const cfg = map[actionType];
    if (!cfg) return;
    const toast = document.createElement('div');
    toast.className = `toast ${cfg.type}`;
    toast.innerHTML = `
        <i class="fa-solid ${cfg.icon} toast-icon"></i>
        <div class="toast-content">
            <h4 class="toast-title">${cfg.title}</h4>
            <p class="toast-message">${cfg.message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}