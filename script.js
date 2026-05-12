document.addEventListener('DOMContentLoaded', () => {
    // 1. SESSION PROTECTION FOR LOGIN PAGE
    const userRole = sessionStorage.getItem('userRole');
    if (document.body.classList.contains('login-page') && userRole) {
        window.location.replace(userRole === 'admin' ? "admin.html" : "home.html");
        return;
    }

    // 2. GLOBAL LOGOUT FUNCTION
    window.logoutUser = async function() {
        const fd = new FormData();
        fd.append('action', 'logout');

        try {
            // Destroy PHP session on the server
            await fetch('database.php', { method: 'POST', body: fd });
            
            // Wipe local session data
            sessionStorage.clear();
            
            // replace() deletes the current page from browser history
            window.location.replace("login.html");
        } catch (err) {
            sessionStorage.clear();
            window.location.replace("login.html");
        }
    };

    // 3. UI VIEW SWITCHING
    const views = {
        login: document.getElementById('loginSection'),
        register: document.getElementById('createSection'),
        forgot: document.getElementById('forgotSection')
    };
    
    const alerts = {
        loginErr: document.getElementById('loginError'),
        loginSuccess: document.getElementById('loginSuccess'),
        regErr: document.getElementById('registerError'),
        forgotErr: document.getElementById('forgotError')
    };

    const showView = (target) => {
        Object.values(views).forEach(v => v?.classList.add('hidden'));
        Object.values(alerts).forEach(a => a?.classList.add('hidden'));
        views[target]?.classList.remove('hidden');
    };

    const showAlert = (container, msg) => {
        if (!container) return;
        const textSpan = container.querySelector('.error-msg-text');
        if (textSpan) textSpan.textContent = msg;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 3000);
    };

    // --- VIEW NAVIGATION EVENTS ---
    document.getElementById('showCreateBtn')?.addEventListener('click', () => showView('register'));
    document.getElementById('showLoginBtn')?.addEventListener('click', () => showView('login'));
    document.getElementById('forgotPassLink')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showView('forgot'); 
    });
    document.getElementById('backFromForgotBtn')?.addEventListener('click', () => showView('login'));

    // 4. FORM SUBMISSIONS
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'login');
            fd.append('email', document.getElementById('loginEmail').value);
            fd.append('password', document.getElementById('loginPassword').value);

            const res = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            
            if (data.status === 'success') {
                sessionStorage.setItem('userRole', data.role);
                sessionStorage.setItem('firstName', data.firstName);
                window.location.replace(data.role === 'admin' ? "admin.html" : "home.html");
            } else {
                showAlert(alerts.loginErr, data.message);
            }
        };
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'register');
            fd.append('fullName', document.getElementById('regFullName').value);
            fd.append('phone', document.getElementById('regPhone').value);
            fd.append('email', document.getElementById('regEmail').value);
            fd.append('password', document.getElementById('regPassword').value);

            const res = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status === 'success') {
                showView('login');
                showAlert(alerts.loginSuccess, data.message);
            } else {
                showAlert(alerts.regErr, data.message);
            }
        };
    }

    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'reset');
            fd.append('email', document.getElementById('resetEmail').value);
            fd.append('password', document.getElementById('newPassword').value);

            const res = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status === 'success') {
                showView('login');
                showAlert(alerts.loginSuccess, "Password Updated Successfully!");
            } else {
                showAlert(alerts.forgotErr, data.message);
            }
        };
    }

window.onpopstate = function() {
    if (sessionStorage.getItem('userRole')) {
        location.reload();
    }
};
});