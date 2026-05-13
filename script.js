document.addEventListener('DOMContentLoaded', () => {

    // ── 1. SESSION PROTECTION FOR LOGIN PAGE ──────────────────
    // FIX: Each browser/tab has its own sessionStorage so admin and user
    // can be logged in simultaneously in different tabs without conflict.
    const userRole = sessionStorage.getItem('userRole');
    if (document.body.classList.contains('login-page') && userRole) {
        window.location.replace(userRole === 'admin' ? "admin.html" : "home.html");
        return;
    }

    // ── 2. GLOBAL LOGOUT FUNCTION ─────────────────────────────
    // FIX: Calls server to destroy the PHP session for THIS user only.
    // Other users' PHP sessions (and their sessionStorage) are untouched.
    window.logoutUser = async function () {
        const fd = new FormData();
        fd.append('action', 'logout');
        try {
            await fetch('database.php', { method: 'POST', body: fd });
        } catch (_) { /* network error — still clear local state */ }
        sessionStorage.clear();
        window.location.replace("login.html");
    };

    // ── 3. UI VIEW SWITCHING ──────────────────────────────────
    const views = {
        login:    document.getElementById('loginSection'),
        register: document.getElementById('createSection'),
        forgot:   document.getElementById('forgotSection')
    };

    const alerts = {
        loginErr:     document.getElementById('loginError'),
        loginSuccess: document.getElementById('loginSuccess'),
        regErr:       document.getElementById('registerError'),
        forgotErr:    document.getElementById('forgotError')
    };

    const showView = (target) => {
        Object.values(views).forEach(v => v?.classList.add('hidden'));
        Object.values(alerts).forEach(a => a?.classList.add('hidden'));
        views[target]?.classList.remove('hidden');
    };

    const showAlert = (container, msg) => {
        if (!container) return;
        const span = container.querySelector('.error-msg-text');
        if (span) span.textContent = msg;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 3500);
    };

    // Nav links between panels
    document.getElementById('showCreateBtn')?.addEventListener('click', () => showView('register'));
    document.getElementById('showLoginBtn')?.addEventListener('click',  () => showView('login'));
    document.getElementById('forgotPassLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('forgot');
    });
    document.getElementById('backFromForgotBtn')?.addEventListener('click', () => showView('login'));

    // Show password toggle on register form
    document.getElementById('toggleShowPass')?.addEventListener('change', function () {
        document.querySelectorAll('.toggle-pass').forEach(inp => {
            inp.type = this.checked ? 'text' : 'password';
        });
    });

    // ── 4. LOGIN ─────────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action',   'login');
            fd.append('email',    document.getElementById('loginEmail').value.trim());
            fd.append('password', document.getElementById('loginPassword').value);

            try {
                const res  = await fetch('database.php', { method: 'POST', body: fd });
                const data = await res.json();

                if (data.status === 'success') {
                    // FIX: sessionStorage is per-tab/per-browser — completely isolated.
                    // An admin logging in on one tab doesn't affect a user on another tab.
                    sessionStorage.setItem('userRole',   data.role);
                    sessionStorage.setItem('firstName',  data.firstName);
                    window.location.replace(data.role === 'admin' ? "admin.html" : "home.html");
                } else {
                    showAlert(alerts.loginErr, data.message);
                }
            } catch (err) {
                showAlert(alerts.loginErr, "Server error. Please try again.");
            }
        };
    }

    // ── 5. REGISTER ──────────────────────────────────────────
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();

            const pass    = document.getElementById('regPassword').value;
            const confirm = document.getElementById('regConfirmPassword').value;
            if (pass !== confirm) {
                showAlert(alerts.regErr, "Passwords do not match.");
                return;
            }

            const fd = new FormData();
            fd.append('action',   'register');
            fd.append('fullName', document.getElementById('regFullName').value.trim());
            fd.append('phone',    document.getElementById('regPhone').value.trim());
            fd.append('email',    document.getElementById('regEmail').value.trim());
            fd.append('password', pass);

            try {
                const res  = await fetch('database.php', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.status === 'success') {
                    showView('login');
                    showAlert(alerts.loginSuccess, data.message);
                } else {
                    showAlert(alerts.regErr, data.message);
                }
            } catch (err) {
                showAlert(alerts.regErr, "Server error. Please try again.");
            }
        };
    }

    // ── 6. FORGOT PASSWORD ───────────────────────────────────
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action',   'reset');
            fd.append('email',    document.getElementById('resetEmail').value.trim());
            fd.append('password', document.getElementById('newPassword').value);

            try {
                const res  = await fetch('database.php', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.status === 'success') {
                    showView('login');
                    showAlert(alerts.loginSuccess, "Password updated successfully!");
                } else {
                    showAlert(alerts.forgotErr, data.message);
                }
            } catch (err) {
                showAlert(alerts.forgotErr, "Server error. Please try again.");
            }
        };
    }

    // ── 7. BACK-BUTTON TRAP ON LOGIN PAGE ────────────────────
    if (document.body.classList.contains('login-page')) {
        history.pushState(null, null, location.href);
        window.onpopstate = () => history.go(1);
    }
});