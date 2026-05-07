document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('login-page')) {
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
            Object.values(views).forEach(v => v.classList.add('hidden'));
            Object.values(alerts).forEach(a => a.classList.add('hidden'));
            views[target].classList.remove('hidden');
        };

        const showAlert = (container, msg) => {
            container.querySelector('.error-msg-text').textContent = msg;
            container.classList.remove('hidden');
            setTimeout(() => container.classList.add('hidden'), 3000);
        };

        // UI Transitions
        document.getElementById('showCreateBtn').onclick = () => showView('register');
        document.getElementById('showLoginBtn').onclick = () => showView('login');
        document.getElementById('forgotPassLink').onclick = (e) => { e.preventDefault(); showView('forgot'); };
        document.getElementById('backFromForgotBtn').onclick = () => showView('login');

        // Registration
        document.getElementById('registerForm').onsubmit = async (e) => {
            e.preventDefault();
            if (document.getElementById('regPassword').value !== document.getElementById('regConfirmPassword').value) {
                return showAlert(alerts.regErr, "Passwords do not match!");
            }

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
            } else showAlert(alerts.regErr, data.message);
        };

        // Login
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('action', 'login');
            fd.append('email', document.getElementById('loginEmail').value);
            fd.append('password', document.getElementById('loginPassword').value);

            const res = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status === 'success') {
                sessionStorage.setItem('userRole', data.role);
                window.location.href = data.role === 'admin' ? "adminUI.html" : "home.html";
            } else showAlert(alerts.loginErr, data.message);
        };

        // Password Reset
        document.getElementById('forgotForm').onsubmit = async (e) => {
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
            } else showAlert(alerts.forgotErr, data.message);
        };
    }
});