// ========== ALGIMON SHARED CONFIRMATION MODAL ==========
(function () {
    function injectStyles() {
        if (document.getElementById('alg-confirm-styles')) return;
        const style = document.createElement('style');
        style.id = 'alg-confirm-styles';
        style.textContent = `
            #algConfirmModal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.22s ease, visibility 0.22s ease;
            }
            #algConfirmModal.alg-visible {
                opacity: 1;
                visibility: visible;
            }
            #algConfirmBackdrop {
                position: absolute;
                inset: 0;
                background: rgba(15, 5, 5, 0.55);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
            }
            #algConfirmPanel {
                position: relative;
                background: #ffffff;
                border-radius: 20px;
                width: 100%;
                max-width: 380px;
                box-shadow:
                    0 0 0 1px rgba(0,0,0,0.06),
                    0 8px 24px rgba(0,0,0,0.12),
                    0 32px 64px rgba(44,14,14,0.18);
                overflow: hidden;
                transform: scale(0.92) translateY(8px);
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            #algConfirmModal.alg-visible #algConfirmPanel {
                transform: scale(1) translateY(0);
            }
            #algConfirmStripe {
                height: 4px;
                width: 100%;
                transition: background 0.15s;
            }
            .alg-confirm-body {
                padding: 28px 28px 24px;
                text-align: center;
            }
            #algConfirmIconRing {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                transition: background 0.15s;
            }
            #algConfirmIconRing i {
                font-size: 22px;
                transition: color 0.15s;
            }
            #algConfirmTitle {
                font-family: 'Inter', sans-serif;
                font-size: 1.0625rem;
                font-weight: 700;
                color: #111827;
                margin: 0 0 6px;
                line-height: 1.3;
            }
            #algConfirmMessage {
                font-family: 'Inter', sans-serif;
                font-size: 0.8125rem;
                color: #6b7280;
                margin: 0 0 22px;
                line-height: 1.55;
            }
            .alg-confirm-btns {
                display: flex;
                gap: 10px;
            }
            .alg-confirm-btns button {
                flex: 1;
                padding: 11px 0;
                border: none;
                border-radius: 12px;
                font-family: 'Inter', sans-serif;
                font-size: 0.8125rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
                letter-spacing: 0.01em;
            }
            #algConfirmCancel {
                background: #f3f4f6;
                color: #374151;
            }
            #algConfirmCancel:hover {
                background: #e5e7eb;
                color: #1f2937;
            }
            #algConfirmOk {
                color: #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            #algConfirmOk:hover {
                box-shadow: 0 4px 14px rgba(0,0,0,0.22);
                transform: translateY(-1px);
            }
            #algConfirmOk:active {
                transform: translateY(0);
                box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            }
            @keyframes algShake {
                0%,100% { transform: scale(1) translateX(0); }
                20%      { transform: scale(1) translateX(-5px); }
                40%      { transform: scale(1) translateX(5px); }
                60%      { transform: scale(1) translateX(-3px); }
                80%      { transform: scale(1) translateX(3px); }
            }
            #algConfirmPanel.alg-shake {
                animation: algShake 0.38s ease;
            }
        `;
        document.head.appendChild(style);
    }

    function injectHTML() {
        if (document.getElementById('algConfirmModal')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = `
        <div id="algConfirmModal" role="dialog" aria-modal="true" aria-labelledby="algConfirmTitle">
            <div id="algConfirmBackdrop"></div>
            <div id="algConfirmPanel">
                <div id="algConfirmStripe"></div>
                <div class="alg-confirm-body">
                    <div id="algConfirmIconRing">
                        <i id="algConfirmIcon" class="fas fa-question-circle"></i>
                    </div>
                    <h3 id="algConfirmTitle">Are you sure?</h3>
                    <p id="algConfirmMessage">This action cannot be undone.</p>
                    <div class="alg-confirm-btns">
                        <button id="algConfirmCancel">Cancel</button>
                        <button id="algConfirmOk">Confirm</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(wrap.firstElementChild);

        document.getElementById('algConfirmBackdrop')
            .addEventListener('click', () => _hide(false));

        document.addEventListener('keydown', function (e) {
            const m = document.getElementById('algConfirmModal');
            if (e.key === 'Escape' && m && m.classList.contains('alg-visible')) {
                _hide(false);
            }
        });
    }

    const THEMES = {
        danger: {
            stripe:   '#dc2626',
            ring:     '#fee2e2',
            icon:     'fas fa-trash-alt',
            iconColor:'#dc2626',
            btn:      'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            shake:    true,
        },
        warning: {
            stripe:   '#f59e0b',
            ring:     '#fef3c7',
            icon:     'fas fa-exclamation-triangle',
            iconColor:'#d97706',
            btn:      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            shake:    false,
        },
        info: {
            stripe:   '#3b82f6',
            ring:     '#dbeafe',
            icon:     'fas fa-info-circle',
            iconColor:'#2563eb',
            btn:      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            shake:    false,
        },
        success: {
            stripe:   '#22c55e',
            ring:     '#dcfce7',
            icon:     'fas fa-check-circle',
            iconColor:'#16a34a',
            btn:      'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            shake:    false,
        },
        clear: {
            stripe:   '#2c0e0e',
            ring:     '#fee2e2',
            icon:     'fas fa-shield-alt',
            iconColor:'#2c0e0e',
            btn:      'linear-gradient(135deg, #2c0e0e 0%, #4a1c1c 100%)',
            shake:    false,
        },
        logout: {
            stripe:   '#2c0e0e',
            ring:     '#fee2e2',
            icon:     'fas fa-sign-out-alt',
            iconColor:'#b91c1c',
            btn:      'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
            shake:    false,
        },
    };

    let _currentCallback = null;
    let _cancelCallback  = null;

    function _hide(confirmed) {
        const m = document.getElementById('algConfirmModal');
        if (!m) return;
        m.classList.remove('alg-visible');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (confirmed && typeof _currentCallback === 'function') _currentCallback();
            else if (!confirmed && typeof _cancelCallback === 'function') _cancelCallback();
            _currentCallback = null;
            _cancelCallback  = null;
        }, 220);
    }

    function _show(shake) {
        const m = document.getElementById('algConfirmModal');
        const p = document.getElementById('algConfirmPanel');
        if (!m) return;
        document.body.style.overflow = 'hidden';
        m.classList.add('alg-visible');
        if (shake) {
            setTimeout(() => {
                p.classList.add('alg-shake');
                p.addEventListener('animationend', () => p.classList.remove('alg-shake'), { once: true });
            }, 260);
        }
    }

    window.showConfirm = function ({ title, message, confirmText, cancelText, type, onConfirm, onCancel }) {
        injectStyles();
        injectHTML();

        const theme = THEMES[type] || THEMES.danger;

        document.getElementById('algConfirmStripe').style.background    = theme.stripe;
        document.getElementById('algConfirmIconRing').style.background  = theme.ring;
        document.getElementById('algConfirmIcon').className              = theme.icon;
        document.getElementById('algConfirmIcon').style.color           = theme.iconColor;
        document.getElementById('algConfirmOk').style.background        = theme.btn;

        document.getElementById('algConfirmTitle').textContent   = title   || 'Are you sure?';
        document.getElementById('algConfirmMessage').textContent = message || 'This action cannot be undone.';
        document.getElementById('algConfirmOk').textContent     = confirmText || 'Confirm';
        document.getElementById('algConfirmCancel').textContent = cancelText  || 'Cancel';

        _currentCallback = onConfirm || null;
        _cancelCallback  = onCancel  || null;

        const oldOk = document.getElementById('algConfirmOk');
        const newOk = oldOk.cloneNode(true);
        newOk.style.background = theme.btn;
        oldOk.parentNode.replaceChild(newOk, oldOk);
        newOk.addEventListener('click', () => _hide(true));

        const oldCancel = document.getElementById('algConfirmCancel');
        const newCancel = oldCancel.cloneNode(true);
        oldCancel.parentNode.replaceChild(newCancel, oldCancel);
        newCancel.addEventListener('click', () => _hide(false));

        _show(theme.shake);
    };

    const _nativeConfirm = window.confirm.bind(window);
    window.confirm = function (msg) {
        try {
            return _nativeConfirm(msg);
        } catch(e) {
            return true;
        }
    };

    window.confirmDelete = function(entityName, onConfirm) {
        window.showConfirm({
            title: 'Delete ' + entityName + '?',
            message: 'This will permanently remove this entry. This action cannot be undone.',
            confirmText: 'Yes, Delete',
            type: 'danger',
            onConfirm,
        });
    };

    window.confirmLogout = function(onConfirm) {
        window.showConfirm({
            title: 'Ready to leave?',
            message: 'Are you sure you want to logout from Algimon Admin?',
            confirmText: 'Yes, Logout',
            type: 'logout',
            onConfirm,
        });
    };

    window.confirmClear = function(label, count, onConfirm) {
        window.showConfirm({
            title: 'Clear ' + label + '?',
            message: (count ? count + ' entries' : 'All records') + ' will be permanently deleted. This cannot be undone.',
            confirmText: 'Clear All',
            type: 'clear',
            onConfirm,
        });
    };

    window.confirmAction = function(title, message, onConfirm) {
        window.showConfirm({ title, message, confirmText: 'Confirm', type: 'warning', onConfirm });
    };

    window.showCancelWithReason = function({ title, message, confirmText, onConfirm, onCancel }) {
        injectStyles();
        injectHTML();

        const theme = THEMES.danger;
        const panel = document.getElementById('algConfirmPanel');

        let reasonBox = document.getElementById('algReasonBox');
        if (!reasonBox) {
            reasonBox = document.createElement('div');
            reasonBox.id = 'algReasonBox';
            reasonBox.style.cssText = 'margin: 0 0 18px; text-align:left;';
            reasonBox.innerHTML = `
                <label style="display:block;font-size:0.75rem;font-weight:600;color:#374151;margin-bottom:6px;">
                    Reason for cancellation <span style="color:#dc2626;">*</span>
                </label>
                <textarea id="algReasonInput" rows="3" placeholder="Enter reason..."
                    style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;
                           font-size:0.8125rem;font-family:Inter,sans-serif;color:#111827;resize:none;
                           outline:none;box-sizing:border-box;transition:border-color 0.15s;"
                    onfocus="this.style.borderColor='#dc2626'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
                <p id="algReasonError" style="color:#dc2626;font-size:0.75rem;margin-top:4px;display:none;">
                    Please enter a reason before cancelling.
                </p>`;

            const msgEl = document.getElementById('algConfirmMessage');
            msgEl.parentNode.insertBefore(reasonBox, msgEl.nextSibling);
        }
        reasonBox.style.display = 'block';
        document.getElementById('algReasonInput').value = '';
        document.getElementById('algReasonError').style.display = 'none';

        document.getElementById('algConfirmStripe').style.background   = theme.stripe;
        document.getElementById('algConfirmIconRing').style.background  = theme.ring;
        document.getElementById('algConfirmIcon').className             = 'fas fa-ban';
        document.getElementById('algConfirmIcon').style.color          = theme.iconColor;
        document.getElementById('algConfirmOk').style.background       = theme.btn;
        document.getElementById('algConfirmTitle').textContent   = title   || 'Cancel Appointment?';
        document.getElementById('algConfirmMessage').textContent = message || 'This action cannot be undone.';
        document.getElementById('algConfirmOk').textContent     = confirmText || 'Cancel Appointment';
        document.getElementById('algConfirmCancel').textContent = 'Go Back';

        _currentCallback = null;
        _cancelCallback  = onCancel || null;

        const oldOk = document.getElementById('algConfirmOk');
        const newOk = oldOk.cloneNode(true);
        newOk.style.background = theme.btn;
        oldOk.parentNode.replaceChild(newOk, oldOk);
        newOk.addEventListener('click', () => {
            const reason = document.getElementById('algReasonInput').value.trim();
            if (!reason) {
                document.getElementById('algReasonError').style.display = 'block';
                return;
            }
            reasonBox.style.display = 'none';
            _currentCallback = () => onConfirm && onConfirm(reason);
            _hide(true);
        });

        const oldCancel = document.getElementById('algConfirmCancel');
        const newCancel = oldCancel.cloneNode(true);
        oldCancel.parentNode.replaceChild(newCancel, oldCancel);
        newCancel.addEventListener('click', () => {
            reasonBox.style.display = 'none';
            _hide(false);
        });

        _show(theme.shake);
    };

})();


document.addEventListener('DOMContentLoaded', function () {

    // ── Logout buttons across ALL pages ─────────────────────────────────────
    const logoutConfirmBtn = document.getElementById('confirmLogoutBtn');
    if (logoutConfirmBtn) {
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            const existingModal = document.getElementById('logoutModal');
            if (!existingModal) {
                logoutBtn.addEventListener('click', function (e) {
                    e.stopImmediatePropagation();
                    window.confirmLogout(function () {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        sessionStorage.clear();
                        window.location.href = 'login.html';
                    });
                });
            }
        }
    }

    // ── Audit Trail — clear all logs ─────────────────────────────────────────
    if (document.title.includes('Audit Trail')) {
        window.clearAuditLogs = function () {
            const count = (window.auditLogs || []).length;
            window.showConfirm({
                title: 'Clear All Audit Logs?',
                message: count + ' log entr' + (count === 1 ? 'y' : 'ies') + ' will be permanently deleted. This cannot be undone.',
                confirmText: 'Clear All Logs',
                type: 'clear',
                onConfirm: function () {
                    localStorage.setItem('alg_audit_logs', '[]');
                    window.dispatchEvent(new CustomEvent('audit-logs-cleared'));
                    if (typeof window.showToast === 'function') window.showToast('All audit logs cleared', 'success');
                }
            });
        };
    }

    // ── Operation & Rules — remove blocked date ──────────────────────────────
    // (already uses showConfirm in operation-rules.js — no patch needed)

});