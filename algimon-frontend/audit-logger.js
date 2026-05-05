// ── SHARED AUDIT LOGGER ───────────────────────────────────────────────────────
// Included on every admin page. POSTs to the API; falls back to localStorage
// if the request fails so no audit entry is silently dropped.

(function() {
    const API_BASE = 'http://localhost/algimon-api';

    function _token() {
        return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    }

    function _userName() {
        try {
            const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            return u.name || 'Admin User';
        } catch { return 'Admin User'; }
    }

    // ── localStorage fallback helpers ─────────────────────────────────────────
    function _fallbackWrite(entry) {
        try {
            let logs = JSON.parse(localStorage.getItem('alg_audit_logs') || '[]');
            if (!Array.isArray(logs)) logs = [];
            logs.unshift(entry);
            if (logs.length > 500) logs = logs.slice(0, 500);
            localStorage.setItem('alg_audit_logs', JSON.stringify(logs));
        } catch { /* storage full — silently skip */ }
    }

    function _buildFallbackEntry(action, entity, details) {
        const now = new Date();
        const ts  = now.toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
                  + ' '
                  + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
        return { id: 'LOG-LOCAL-' + Date.now(), timestamp: ts, user: _userName(), action, entity: entity || 'System', details: details || '' };
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.logAudit = function(action, entity, details) {
        if (!action) return;
        entity  = entity  || 'System';
        details = details || '';

        const tok = _token();
        if (!tok) {
            // Not authenticated — write locally only
            _fallbackWrite(_buildFallbackEntry(action, entity, details));
            window.dispatchEvent(new CustomEvent('audit-log-added'));
            return;
        }

        fetch(API_BASE + '/audit-logs', {
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
            body:     JSON.stringify({ action, entity, details }),
            keepalive: true
        })
        .then(r => r.json())
        .then(json => {
            if (!json.success) throw new Error(json.message);
            window.dispatchEvent(new CustomEvent('audit-log-added'));
        })
        .catch(() => {
            // API unavailable — persist locally so the entry isn't lost
            _fallbackWrite(_buildFallbackEntry(action, entity, details));
            window.dispatchEvent(new CustomEvent('audit-log-added'));
        });
    };
})();
