// ==========================================
// LOGIN.JS
// ==========================================

const API_BASE_URL = 'http://localhost/algimon-api';

// ==========================================
// UTILITIES
// ==========================================
function switchTab(tabName) {
    const loginForm  = document.getElementById('form-login');
    const signupForm = document.getElementById('form-signup');
    const title      = document.getElementById('form-title');
    const subtitle   = document.getElementById('form-subtitle');

    // Clear messages
    ['login-message', 'signup-message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (tabName === 'login') {
        loginForm.classList.add('active-form');
        signupForm.classList.remove('active-form');
        title.textContent    = 'WELCOME BACK';
        subtitle.textContent = 'Manage your fire safety appointments';
    } else {
        loginForm.classList.remove('active-form');
        signupForm.classList.add('active-form');
        title.textContent    = 'CREATE ACCOUNT';
        subtitle.textContent = 'Register for client portal access';
    }
}

function openModal(modalId)  { document.getElementById(modalId)?.classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const btn = input.nextElementSibling; // the Show/Hide button
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = 'Hide';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = 'Show';
    }
}

function showMessage(elementId, text, type) {
    const msgDiv = document.getElementById(elementId);
    if (!msgDiv) return;
    msgDiv.textContent  = text;
    msgDiv.className    = `form-message ${type}`;
    msgDiv.style.display = 'block';
    clearTimeout(msgDiv._timer);
    msgDiv._timer = setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
}

// ==========================================
// PHONE NORMALIZER (shared with dashboard.js approach)
// ==========================================
function normalizePhone(raw) {
    let digits = raw.replace(/[\s\-\.]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    // 639XXXXXXXXX (12 digits) → 09XXXXXXXXX
    if (digits.startsWith('639') && digits.length === 12) {
        digits = '0' + digits.slice(2);
    }
    return digits;
}

// ==========================================
// EMAIL VALIDATION
// ==========================================
const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Password policy: min 8 chars, ≥1 uppercase, ≥1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

function validateEmailInput(e) {
    const el      = e.target;
    const errSpan = document.getElementById(`${el.id}-error`);
    if (el.value.length > 0 && !emailRegex.test(el.value)) {
        el.classList.add('invalid');
        el.classList.remove('valid');
        if (errSpan) errSpan.textContent = 'Invalid email format';
    } else {
        el.classList.remove('invalid');
        if (errSpan) errSpan.textContent = '';
        if (el.value.length > 0) el.classList.add('valid');
    }
}

const loginEmail  = document.getElementById('login-email');
const signupEmail = document.getElementById('signup-email');
if (loginEmail)  loginEmail.addEventListener('input', validateEmailInput);
if (signupEmail) signupEmail.addEventListener('input', validateEmailInput);

// ==========================================
// MOBILE NUMBER FORMATTING (signup)
// ==========================================
const mobileInput = document.getElementById('signup-mobile');
if (mobileInput) {
    mobileInput.addEventListener('input', function (e) {
        const rawVal    = e.target.value;
        const normalized = normalizePhone(rawVal);
        const errSpan   = document.getElementById('signup-mobile-error');

        const isValid    = normalized.length === 11 && normalized.startsWith('09');
        const hasEnough  = normalized.length >= 3;

        if (hasEnough && !normalized.startsWith('09')) {
            if (errSpan) errSpan.textContent = 'Must start with 09 or +63 9';
            e.target.classList.add('invalid');
        } else {
            if (errSpan) errSpan.textContent = '';
            e.target.classList.remove('invalid');
        }

        // Auto-format as local while typing (only if not typing +63)
        const isTypingIntl = rawVal.trim().startsWith('+');
        if (!isTypingIntl) {
            let fmt = normalized;
            if (fmt.length > 7)      fmt = fmt.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3');
            else if (fmt.length > 4) fmt = fmt.replace(/(\d{4})(\d+)/, '$1 $2');
            e.target.value = fmt;
        }

        e.target.classList.toggle('valid', isValid);
    });
}

// ==========================================
// PASSWORD STRENGTH METER
// ==========================================
function evaluateStrength(password) {
    if (!password) return { width: '0%', color: '#e1e3e6', label: 'Very weak' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const scoreMap = {
        0: { width: '10%', color: '#e1e3e6', label: 'Very weak' },
        1: { width: '25%', color: '#f87171', label: 'Weak' },
        2: { width: '45%', color: '#f97316', label: 'Fair' },
        3: { width: '65%', color: '#eab308', label: 'Good' },
        4: { width: '85%', color: '#22c55e', label: 'Strong' },
        5: { width: '100%', color: '#15803d', label: 'Very strong' }
    };
    let idx = Math.min(score, 5);
    if (password.length === 0) idx = 0;
    else if (score === 0 && password.length > 0) idx = 1;
    return scoreMap[idx];
}

const signupPasswordInput = document.getElementById('signup-password');
const strengthFill = document.getElementById('signup-strength-fill');
const strengthText = document.getElementById('signup-strength-text');

if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', () => {
        const pwd = signupPasswordInput.value;
        const strength = evaluateStrength(pwd);
        strengthFill.style.width = strength.width;
        strengthFill.style.backgroundColor = strength.color;

        const hasLength  = pwd.length >= 8;
        const hasUpper   = /[A-Z]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

        const reqEl = document.getElementById('signup-password-reqs');
        if (reqEl) {
            const missing = [];
            if (!hasLength)  missing.push(`${8 - pwd.length} more char${8 - pwd.length !== 1 ? 's' : ''}`);
            if (!hasUpper)   missing.push('1 uppercase letter');
            if (!hasSpecial) missing.push('1 special character');

            if (pwd.length === 0) {
                reqEl.textContent = '';
                reqEl.className = 'password-reqs-hint';
            } else if (missing.length > 0) {
                reqEl.textContent = `Still needs: ${missing.join(', ')}`;
                reqEl.className = 'password-reqs-hint warn';
            } else {
                reqEl.textContent = '✓ Password meets all requirements';
                reqEl.className = 'password-reqs-hint ok';
            }
        }

        if (pwd.length === 0) {
            strengthText.textContent = 'Min 8 chars · 1 uppercase · 1 special character';
        } else if (pwd.length < 8) {
            strengthText.textContent = `Strength: ${strength.label} · needs ${8 - pwd.length} more char${8 - pwd.length !== 1 ? 's' : ''}`;
        } else {
            strengthText.textContent = `Strength: ${strength.label}`;
        }
    });
}

// ==========================================
// LOGIN FORM
// ==========================================
document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('btn-login');

    if (!email) {
        showMessage('login-message', 'Please enter your email address.', 'error');
        return;
    }
    if (!emailRegex.test(email)) {
        showMessage('login-message', 'Please enter a valid email address.', 'error');
        return;
    }
    if (!password) {
        showMessage('login-message', 'Please enter your password.', 'error');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'VERIFYING…';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (result.success === true) {
            const rememberMe = document.getElementById('login-remember-me')?.checked;
            const store = rememberMe ? localStorage : sessionStorage;
            store.setItem('token', result.data.token);
            store.setItem('user',  JSON.stringify(result.data.user));

            const type = result.data.user.type;

            // Log admin login to audit trail
            if (type !== 'client') {
                fetch(`${API_BASE_URL}/audit-logs`, {
                    method:    'POST',
                    headers:   { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + result.data.token },
                    body:      JSON.stringify({ action: 'Login', entity: 'System', details: `${result.data.user.name} logged into the admin panel` }),
                    keepalive: true,
                }).catch(() => {});
            }

            showMessage('login-message', 'Login successful! Redirecting…', 'success');

            setTimeout(() => {
                window.location.href = (type === 'client') ? 'dashboard.html' : 'commandcenter.html';
            }, 1000);
        } else {
            showMessage('login-message', result.message || 'Invalid email or password.', 'error');
            btn.disabled    = false;
            btn.textContent = 'LOGIN';
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('login-message', 'Cannot connect to server. Please try again.', 'error');
        btn.disabled    = false;
        btn.textContent = 'LOGIN';
    }
});

// ==========================================
// SIGNUP FORM
// ==========================================
document.getElementById('form-signup').addEventListener('submit', async function (e) {
    e.preventDefault();

    const firstName = document.getElementById('signup-fname').value.trim();
    const lastName  = document.getElementById('signup-lname').value.trim();
    const email     = document.getElementById('signup-email').value.trim();
    const mobileRaw = document.getElementById('signup-mobile').value;
    const password  = document.getElementById('signup-password').value;
    const terms     = document.getElementById('signup-terms').checked;
    const btn       = document.getElementById('btn-signup');

    // ── Validation ────────────────────────────────────────────────────────────
    if (!firstName || !lastName) {
        showMessage('signup-message', 'Please enter your first and last name.', 'error');
        return;
    }
    if (!emailRegex.test(email)) {
        showMessage('signup-message', 'Please enter a valid email address.', 'error');
        return;
    }

    const cleanPhone = normalizePhone(mobileRaw);
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
        showMessage('signup-message', 'Enter a valid PH mobile number — local (09XX XXX XXXX) or international (+63 9XX XXX XXXX).', 'error');
        return;
    }

    if (!passwordRegex.test(password)) {
        let hint = 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(password))       hint += ', include at least 1 uppercase letter';
        if (!/[^A-Za-z0-9]/.test(password)) hint += ', include at least 1 special character';
        hint += '.';
        showMessage('signup-message', hint, 'error');
        return;
    }
    if (!terms) {
        showMessage('signup-message', 'You must agree to the Terms and Privacy Policy.', 'error');
        return;
    }

    btn.disabled    = true;
    btn.textContent = 'CREATING ACCOUNT…';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                name:     `${firstName} ${lastName}`,
                email:    email,
                password: password,
                phone:    cleanPhone,
            }),
        });

        const result = await response.json();

        if (result.success === true) {
            if (result.data?.token) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user',  JSON.stringify(result.data.user));
            }
            showMessage('signup-message', 'Account created! Redirecting to your dashboard…', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        } else {
            showMessage('signup-message', result.message || 'Registration failed. Please try again.', 'error');
            btn.disabled    = false;
            btn.textContent = 'CREATE ACCOUNT';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('signup-message', 'Cannot connect to server. Please try again.', 'error');
        btn.disabled    = false;
        btn.textContent = 'CREATE ACCOUNT';
    }
});

// ==========================================
// FORGOT PASSWORD
// ==========================================
window.handleForgotSubmit = async function (e) {
    e.preventDefault();

    const emailEl = document.getElementById('forgot-email');
    const btn     = document.getElementById('btn-forgot');
    const email   = emailEl?.value.trim();

    if (!email || !emailRegex.test(email)) {
        showMessage('forgot-message', 'Please enter a valid email address.', 'error');
        // Create inline message element if it doesn't exist
        let msgEl = document.getElementById('forgot-message');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id        = 'forgot-message';
            msgEl.className = 'form-message error';
            msgEl.style.display = 'block';
            msgEl.textContent = 'Please enter a valid email address.';
            emailEl?.parentNode.parentNode.insertBefore(msgEl, emailEl.parentNode);
        }
        return;
    }

    btn.classList.add('loading');
    btn.disabled    = true;
    btn.textContent = 'SENDING…';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email }),
        });

        const result = await response.json();
        btn.classList.remove('loading');

        if (result.success) {
            btn.textContent = '✓ LINK SENT!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                closeModal('forgot-password-modal');
                btn.disabled    = false;
                btn.textContent = 'SEND RESET LINK';
                btn.style.background = '';
                document.getElementById('form-forgot').reset();
                // Show persistent confirmation banner on the login form
                showMessage('login-message', '📧 Reset link sent! Please check your email inbox (and spam folder).', 'success');
            }, 2500);
        } else {
            btn.disabled    = false;
            btn.textContent = 'SEND RESET LINK';
            // Show inline error in modal
            let msgEl = document.getElementById('forgot-message');
            if (!msgEl) {
                msgEl = document.createElement('div');
                msgEl.id = 'forgot-message';
                const forgotGroup = document.querySelector('.forgot-form-group');
                if (forgotGroup) forgotGroup.before(msgEl);
            }
            msgEl.className    = 'form-message error';
            msgEl.textContent  = result.message || 'Error sending reset link. Please try again.';
            msgEl.style.display = 'block';
        }
    } catch (error) {
        btn.classList.remove('loading');
        btn.disabled    = false;
        btn.textContent = 'SEND RESET LINK';
        let msgEl = document.getElementById('forgot-message');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'forgot-message';
            const forgotGroup = document.querySelector('.forgot-form-group');
            if (forgotGroup) forgotGroup.before(msgEl);
        }
        msgEl.className    = 'form-message error';
        msgEl.textContent  = 'Cannot connect to server. Please try again.';
        msgEl.style.display = 'block';
    }
};

// ==========================================
// CLOSE MODALS ON OUTSIDE CLICK
// ==========================================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('active');
    });
});

// ==========================================
// SIGNUP: update mobile input hint
// ==========================================
const signupMobileEl = document.getElementById('signup-mobile');
if (signupMobileEl) {
    signupMobileEl.setAttribute('placeholder', '09XX XXX XXXX  or  +639XX XXX XXXX');
    signupMobileEl.setAttribute('maxlength', '16');
}

// Update the +63 prefix on the signup phone to match dashboard style
const signupPrefix = document.querySelector('#form-signup .phone-prefix');
if (signupPrefix) {
    signupPrefix.textContent = '🇵🇭 +63';
    signupPrefix.title = 'Philippine country code';
}
