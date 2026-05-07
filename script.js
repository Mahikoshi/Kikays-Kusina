document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('login-page')) return;

    const views = {
        login: document.getElementById('loginSection'),
        register: document.getElementById('createSection')
    };
    const alerts = {
        loginErr: document.getElementById('loginError'),
        loginSuccess: document.getElementById('loginSuccess'),
        regErr: document.getElementById('registerError')
    };

    // --- INITIALIZE REMEMBER ME ---
    const loginEmailInput = document.getElementById('loginEmail');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
        loginEmailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }

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

    // --- SHOW PASSWORD LOGIC ---
    document.getElementById('toggleShowPass').addEventListener('change', function() {
        const type = this.checked ? 'text' : 'password';
        document.querySelectorAll('.toggle-pass').forEach(input => input.type = type);
    });

    // Navigation
    document.getElementById('showCreateBtn').onclick = () => showView('register');
    document.getElementById('showLoginBtn').onclick = () => showView('login');

    // --- LOGIN FORM ---
    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const pass = document.getElementById('loginPassword').value;

        // Remember Me Persistence
        if (rememberMeCheckbox.checked) localStorage.setItem('rememberedEmail', email);
        else localStorage.removeItem('rememberedEmail');

        const fd = new FormData();
        fd.append('action', 'login');
        fd.append('email', email);
        fd.append('password', pass);

        const res = await fetch('database.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.status === 'success') {
            sessionStorage.setItem('userRole', data.role);
            window.location.href = data.role === 'admin' ? "adminUI.html" : "Home.html";
        } else showAlert(alerts.loginErr, data.message);
    };

    // --- REGISTER FORM ---
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
});