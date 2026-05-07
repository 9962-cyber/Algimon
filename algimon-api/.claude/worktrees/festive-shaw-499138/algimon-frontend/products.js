// ── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost/algimon-api";

// ── STATE ─────────────────────────────────────────────────────────────────────
let products = [];
let services = [];

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
const apiPost   = (path, body) => apiRequest('POST',   path, body);
const apiPut    = (path, body) => apiRequest('PUT',    path, body);
const apiDelete = (path)       => apiRequest('DELETE', path);

// ── LOAD DATA ─────────────────────────────────────────────────────────────────
async function loadData() {
    try {
        [products, services] = await Promise.all([
            apiGet('/products'),
            apiGet('/services')
        ]);
    } catch (err) {
        products = [];
        services = [];
        showToast('Failed to load data: ' + err.message, 'error');
    }
    renderInventory();
    renderPricing();
}

// ── EXPIRY HELPERS ────────────────────────────────────────────────────────────
function getExpiryStatus(expiryDateStr) {
    if (!expiryDateStr) return { text: 'No date', class: 'bg-gray-100 text-gray-600' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0)   return { text: 'Expired',             class: 'bg-red-100 text-red-700' };
    if (diffDays <= 30) return { text: `Expires in ${diffDays}d`, class: 'bg-orange-100 text-orange-700' };
    if (diffDays <= 90) return { text: `Expires in ${diffDays}d`, class: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Valid', class: 'bg-green-100 text-green-700' };
}

// ── RENDER: PRODUCT INVENTORY ─────────────────────────────────────────────────
function renderInventory() {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">No products added. Click "Add New Product".</td></tr>`;
    } else {
        tbody.innerHTML = products.map(p => {
            const status = getExpiryStatus(p.expiry);
            return `<tr class="border-b hover:bg-gray-50">
                <td class="py-3 px-2 font-medium">${escapeHtml(p.name)}</td>
                <td class="py-3 px-2">${escapeHtml(p.category)}</td>
                <td class="py-3 px-2">${escapeHtml(p.location)}</td>
                <td class="py-3 px-2">${p.quantity}</td>
                <td class="py-3 px-2 text-sm">${p.expiry || '—'}</td>
                <td class="py-3 px-2">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${status.class}">${status.text}</span>
                </td>
                <td class="py-3 px-2">
                    <button onclick="editProduct(${p.id})" class="text-blue-600 hover:bg-blue-50 p-1 rounded"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProductById(${p.id})" class="text-red-500 ml-2 hover:bg-red-50 p-1 rounded"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    // Stats cards
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const total   = products.length;
    const expired = products.filter(p => p.expiry && new Date(p.expiry) < today).length;
    const soon    = products.filter(p => {
        if (!p.expiry) return false;
        const d = Math.ceil((new Date(p.expiry) - today) / (1000 * 60 * 60 * 24));
        return d >= 0 && d <= 30;
    }).length;
    const warning = products.filter(p => {
        if (!p.expiry) return false;
        const d = Math.ceil((new Date(p.expiry) - today) / (1000 * 60 * 60 * 24));
        return d > 30 && d <= 90;
    }).length;

    document.getElementById('stat-total').innerText   = total;
    document.getElementById('stat-expired').innerText  = expired;
    document.getElementById('stat-soon').innerText     = soon;
    document.getElementById('stat-warning').innerText  = warning;
}

// ── RENDER: SERVICE PRICING ───────────────────────────────────────────────────
function renderPricing() {
    const tbody = document.getElementById('pricing-table-body');
    if (!tbody) return;

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-400">No service pricing added. Add a service plan.</td></tr>`;
        return;
    }
    tbody.innerHTML = services.map(s => {
        let renewalHtml = `<span class="text-gray-400 text-xs">Not renewable</span>`;
        if (s.renewable) {
            const unitLabel = s.renewalUnit === 'months' ? 'month(s)' : 'year(s)';
            renewalHtml = `<span class="renewal-badge"><i class="fas fa-sync-alt text-xs"></i> Every ${s.renewalValue} ${unitLabel}</span>`;
        }
        return `<tr class="border-b hover:bg-gray-50">
            <td class="py-3 px-2 font-medium">${escapeHtml(s.name)}</td>
            <td class="py-3 px-2 text-right font-mono">₱${formatNumber(s.minPrice)} - ₱${formatNumber(s.maxPrice)}</td>
            <td class="py-3 px-2">${s.unit ? escapeHtml(s.unit) : '—'}</td>
            <td class="py-3 px-2">${renewalHtml}</td>
            <td class="py-3 px-2 text-right">
                <button onclick="editService(${s.id})" class="text-blue-600 hover:bg-blue-50 p-1 rounded mx-1"><i class="fas fa-edit"></i></button>
                <button onclick="deleteServiceById(${s.id})" class="text-red-500 hover:bg-red-50 p-1 rounded"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function formatNumber(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

// ── PRODUCT CRUD ──────────────────────────────────────────────────────────────
window.editProduct = (id) => {
    const prod = products.find(p => p.id == id);
    if (!prod) return;
    document.getElementById('editProductId').value          = prod.id;
    document.getElementById('prodName').value               = prod.name;
    document.getElementById('prodCategory').value           = prod.category;
    document.getElementById('prodLocation').value           = prod.location;
    document.getElementById('prodQty').value                = prod.quantity;
    document.getElementById('prodExpiry').value             = prod.expiry || '';
    document.getElementById('productModalTitle').innerText  = 'Edit Product';
    document.getElementById('deleteProductBtn').classList.remove('hidden');
    document.getElementById('productModal').classList.remove('hidden');
};

window.deleteProductById = (id) => {
    const prod = products.find(p => p.id == id);
    showConfirm({
        title:       'Delete Product?',
        message:     `"${prod?.name || 'This product'}" will be permanently removed from inventory.`,
        confirmText: 'Delete Product',
        type:        'danger',
        onConfirm:   async () => {
            try {
                await apiDelete(`/products/${id}`);
                products = products.filter(p => p.id != id);
                renderInventory();
                logAudit('Delete Product', 'Product', `Deleted product: ${prod?.name || id}`);
                showToast('Product deleted', 'success');
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    });
};

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
    document.getElementById('deleteProductBtn').classList.add('hidden');
    document.getElementById('editProductId').value = '';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const id       = document.getElementById('editProductId').value;
    const name     = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const location = document.getElementById('prodLocation').value.trim();
    const quantity = parseInt(document.getElementById('prodQty').value) || 0;
    const expiry   = document.getElementById('prodExpiry').value || null;

    if (!name || !category || !location) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const payload = { name, category, location, quantity, expiry };

    try {
        if (id) {
            await apiPut(`/products/${id}`, payload);
            const idx = products.findIndex(p => p.id == id);
            if (idx !== -1) products[idx] = { ...products[idx], ...payload };
            logAudit('Update Product', 'Product', `Updated product: ${name} (${category})`);
            showToast('Product updated', 'success');
        } else {
            const result = await apiPost('/products', payload);
            products.push({ id: result.id, ...payload, created_at: new Date().toISOString() });
            logAudit('Add Product', 'Product', `Added product: ${name} (${category})`);
            showToast('Product added', 'success');
        }
        renderInventory();
        closeProductModal();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    }
}

// ── SERVICE CRUD ──────────────────────────────────────────────────────────────
window.editService = (id) => {
    const svc = services.find(s => s.id == id);
    if (!svc) return;
    document.getElementById('editServiceId').value         = svc.id;
    document.getElementById('svcName').value               = svc.name;
    document.getElementById('svcMin').value                = svc.minPrice;
    document.getElementById('svcMax').value                = svc.maxPrice;
    document.getElementById('svcUnit').value               = svc.unit || '';
    document.getElementById('svcRenewable').checked        = !!svc.renewable;
    const renewalGroup = document.getElementById('renewalPeriodGroup');
    if (svc.renewable) renewalGroup.classList.remove('hidden');
    else               renewalGroup.classList.add('hidden');
    document.getElementById('renewalValue').value = svc.renewalValue ?? 12;
    document.getElementById('renewalUnit').value  = svc.renewalUnit  || 'months';
    document.getElementById('serviceModalTitle').innerText = 'Edit Service';
    document.getElementById('deleteServiceBtn').classList.remove('hidden');
    document.getElementById('serviceModal').classList.remove('hidden');
};

window.deleteServiceById = (id) => {
    const svc = services.find(s => s.id == id);
    showConfirm({
        title:       'Delete Service?',
        message:     `"${svc?.name || 'This service'}" will be removed. Related contracts may be affected.`,
        confirmText: 'Delete Service',
        type:        'warning',
        onConfirm:   async () => {
            try {
                await apiDelete(`/services/${id}`);
                services = services.filter(s => s.id != id);
                renderPricing();
                logAudit('Delete Service', 'Product', `Deleted service: ${svc?.name || id}`);
                showToast('Service removed', 'success');
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    });
};

function closeServiceModal() {
    document.getElementById('serviceModal').classList.add('hidden');
    document.getElementById('deleteServiceBtn').classList.add('hidden');
    document.getElementById('editServiceId').value = '';
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const id        = document.getElementById('editServiceId').value;
    const name      = document.getElementById('svcName').value.trim();
    const minPrice  = parseFloat(document.getElementById('svcMin').value);
    const maxPrice  = parseFloat(document.getElementById('svcMax').value);
    const unit      = document.getElementById('svcUnit').value.trim();
    const renewable = document.getElementById('svcRenewable').checked;
    let   renewalValue = null;
    let   renewalUnit  = 'months';

    if (renewable) {
        renewalValue = parseInt(document.getElementById('renewalValue').value);
        renewalUnit  = document.getElementById('renewalUnit').value;
        if (isNaN(renewalValue) || renewalValue < 1) {
            showToast('Please enter a valid renewal period (≥ 1)', 'error');
            return;
        }
    }
    if (!name || isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
        showToast('Valid name and price range are required', 'error');
        return;
    }
    if (minPrice > maxPrice) {
        showToast('Min price cannot exceed max price', 'error');
        return;
    }

    const payload = {
        name, minPrice, maxPrice, unit, renewable,
        renewalValue: renewable ? renewalValue : null,
        renewalUnit:  renewable ? renewalUnit  : 'months'
    };

    try {
        if (id) {
            await apiPut(`/services/${id}`, payload);
            const idx = services.findIndex(s => s.id == id);
            if (idx !== -1) services[idx] = { ...services[idx], ...payload };
            logAudit('Update Service', 'Product', `Updated service: ${name}`);
            showToast('Service updated', 'success');
        } else {
            const result = await apiPost('/services', payload);
            services.push({ id: result.id, ...payload, created_at: new Date().toISOString() });
            logAudit('Add Service', 'Product', `Added service: ${name}`);
            showToast('Service added', 'success');
        }
        renderPricing();
        closeServiceModal();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    }
}

function toggleRenewalGroup() {
    const cb    = document.getElementById('svcRenewable');
    const group = document.getElementById('renewalPeriodGroup');
    cb.checked ? group.classList.remove('hidden') : group.classList.add('hidden');
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(tab) {
    const invTab   = document.getElementById('inventoryTab');
    const priceTab = document.getElementById('pricingTab');
    const invBtn   = document.getElementById('tabInventory');
    const priceBtn = document.getElementById('tabPricing');
    const addBtn   = document.getElementById('addBtn');

    if (tab === 'inventory') {
        invTab.classList.remove('hidden');
        priceTab.classList.add('hidden');
        invBtn.classList.add('active');
        priceBtn.classList.remove('active');
        document.getElementById('addBtnLabel').innerText = 'Add New Product';
        addBtn.onclick = openAddProductModal;
    } else {
        invTab.classList.add('hidden');
        priceTab.classList.remove('hidden');
        invBtn.classList.remove('active');
        priceBtn.classList.add('active');
        document.getElementById('addBtnLabel').innerText = 'Add New Service';
        addBtn.onclick = openAddServiceModal;
    }
}

function openAddProductModal() {
    document.getElementById('productModalTitle').innerText = 'Add New Product';
    document.getElementById('deleteProductBtn').classList.add('hidden');
    document.getElementById('editProductId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').classList.remove('hidden');
}

function openAddServiceModal() {
    document.getElementById('serviceModalTitle').innerText = 'Add New Service';
    document.getElementById('deleteServiceBtn').classList.add('hidden');
    document.getElementById('editServiceId').value = '';
    document.getElementById('serviceForm').reset();
    document.getElementById('svcRenewable').checked = false;
    document.getElementById('renewalPeriodGroup').classList.add('hidden');
    document.getElementById('renewalValue').value = 12;
    document.getElementById('serviceModal').classList.remove('hidden');
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.getElementById('closeProductModal')?.addEventListener('click', closeProductModal);
document.getElementById('closeServiceModal')?.addEventListener('click', closeServiceModal);
document.getElementById('productModalOverlay')?.addEventListener('click', closeProductModal);
document.getElementById('serviceModalOverlay')?.addEventListener('click', closeServiceModal);
document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);
document.getElementById('serviceForm')?.addEventListener('submit', handleServiceSubmit);
document.getElementById('svcRenewable')?.addEventListener('change', toggleRenewalGroup);

document.getElementById('deleteProductBtn')?.addEventListener('click', () => {
    const id   = document.getElementById('editProductId').value;
    const prod = products.find(p => p.id == id);
    if (!id) return;
    showConfirm({
        title: 'Delete Product?',
        message: `"${prod?.name || 'This product'}" will be permanently removed from inventory.`,
        confirmText: 'Delete Product',
        type: 'danger',
        onConfirm: async () => {
            try {
                await apiDelete(`/products/${id}`);
                products = products.filter(p => p.id != id);
                renderInventory();
                closeProductModal();
                logAudit('Delete Product', 'Product', `Deleted product: ${prod?.name || id}`);
                showToast('Product deleted', 'success');
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    });
});

document.getElementById('deleteServiceBtn')?.addEventListener('click', () => {
    const id  = document.getElementById('editServiceId').value;
    const svc = services.find(s => s.id == id);
    if (!id) return;
    showConfirm({
        title: 'Delete Service?',
        message: `"${svc?.name || 'This service'}" will be removed. Related contracts may be affected.`,
        confirmText: 'Delete Service',
        type: 'warning',
        onConfirm: async () => {
            try {
                await apiDelete(`/services/${id}`);
                services = services.filter(s => s.id != id);
                renderPricing();
                closeServiceModal();
                logAudit('Delete Service', 'Product', `Deleted service: ${svc?.name || id}`);
                showToast('Service deleted', 'success');
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    });
});

window.switchTab = switchTab;

// ── LOGOUT ────────────────────────────────────────────────────────────────────
const logoutBtn    = document.getElementById('logoutButton');
const logoutModal  = document.getElementById('logoutModal');
const cancelBtn    = document.getElementById('cancelLogoutBtn');
const confirmBtn   = document.getElementById('confirmLogoutBtn');

const showModal = () => { logoutModal.classList.add('show');    document.body.style.overflow = 'hidden'; };
const hideModal = () => { logoutModal.classList.remove('show'); document.body.style.overflow = ''; };

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
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal?.classList.contains('show')) hideModal();
});

// ── TOAST ─────────────────────────────────────────────────────────────────────
window.showToast = function(message, type) {
    type = type || 'info';
    const icons  = { success: 'fa-check-circle text-green-400', error: 'fa-exclamation-circle text-red-400', warning: 'fa-exclamation-triangle text-yellow-400', info: 'fa-info-circle text-blue-400' };
    const inner  = document.getElementById('toast-inner');
    const icon   = document.getElementById('toast-icon');
    const msgEl  = document.getElementById('toast-message');
    if (!inner || !icon || !msgEl) return;
    inner.className = inner.className.replace(/toast-\S+/g, '').replace(/bg-\S+/g, '').trim();
    inner.classList.add('flex','items-center','gap-3','px-4','py-3','rounded-xl','shadow-2xl','text-sm','font-medium','transition-all','duration-300','text-white','toast-' + type);
    icon.className  = 'fas ' + (icons[type] || icons.info) + ' shrink-0';
    msgEl.textContent = message;
    inner.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => inner.classList.remove('show'), 3000);
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function closeSidebar() {
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay')?.classList.add('hidden');
}
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const isHidden = sidebar.classList.contains('-translate-x-full');
    if (isHidden) { sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }
    else           { sidebar.classList.add('-translate-x-full');    overlay.classList.add('hidden');    }
});

// ── BACK TO TOP ───────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ── GREETING ──────────────────────────────────────────────────────────────────
(function () {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('page-greeting');
    if (el) el.textContent = greeting;
})();

// ── STAFF DROPDOWN ────────────────────────────────────────────────────────────
function toggleStaffDropdown() {
    document.getElementById('staff-submenu')?.classList.toggle('hidden');
    document.getElementById('staff-chevron')?.classList.toggle('rotate-180');
}
window.toggleStaffDropdown = toggleStaffDropdown;

// ── INIT ──────────────────────────────────────────────────────────────────────
// Default "Add" button targets the active inventory tab
document.getElementById('addBtn').onclick = openAddProductModal;

loadData();
