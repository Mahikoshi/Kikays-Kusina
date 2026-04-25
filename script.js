const firebaseConfig = {
  apiKey: "AIzaSyA-0U2CV0IYQb736UiuY_WoDTKPh7xDKpg",
  authDomain: "kikayskusina-6052d.firebaseapp.com",
  databaseURL: "https://kikayskusina-6052d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kikayskusina-6052d",
  storageBucket: "kikayskusina-6052d.firebasestorage.app",
  messagingSenderId: "415228960392",
  appId: "1:415228960392:web:da844bf5070ec23772493d",
  measurementId: "G-9Z5KZ8E7ZP"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

        const showError = (container, msg) => {
            container.querySelector('.error-msg-text').textContent = msg;
            container.classList.remove('hidden');
        };

        // Navigation Switchers
        document.getElementById('showCreateBtn').addEventListener('click', () => showView('register'));
        document.getElementById('showLoginBtn').addEventListener('click', () => showView('login'));
        document.getElementById('forgotPassLink').addEventListener('click', (e) => {
            e.preventDefault();
            showView('forgot');
        });
        document.getElementById('backFromForgotBtn').addEventListener('click', () => showView('login'));

        // Toggle Password Visibility
        document.getElementById('toggleShowPass').addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            document.querySelectorAll('.toggle-pass').forEach(input => input.type = type);
        });

        // Numeric Validation for Phone Number
        const phoneInput = document.getElementById('regPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }

        // REGISTER LOGIC (Updated to include Phone)
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value.trim().replace(/\./g, ',');
            const phone = document.getElementById('regPhone').value.trim(); // Captured phone
            const pass = document.getElementById('regPassword').value;

            if (pass !== document.getElementById('regConfirmPassword').value) {
                return showError(alerts.regErr, "Passwords do not match!");
            }

            // Saving phone alongside password in Firebase
            database.ref('users/' + email).set({ 
                password: pass,
                phone: phone 
            }, (error) => {
                if (error) showError(alerts.regErr, "Database Error!");
                else {
                    showView('login');
                    showError(alerts.loginSuccess, "Account Created Successfully!");
                }
            });
        });

        // LOGIN LOGIC
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim().replace(/\./g, ',');
            const pass = document.getElementById('loginPassword').value;

            database.ref('users/' + email).once('value').then((snapshot) => {
                if (snapshot.exists() && snapshot.val().password === pass) {
                    window.location.href = "Home.html";
                } else {
                    showError(alerts.loginErr, "Invalid Email or Password");
                }
            });
        });

        // FORGOT PASSWORD LOGIC
        document.getElementById('forgotForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim().replace(/\./g, ',');
            const newPass = document.getElementById('newPassword').value;

            database.ref('users/' + email).once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    database.ref('users/' + email).update({ password: newPass });
                    showView('login');
                    showError(alerts.loginSuccess, "Password Updated Successfully!");
                } else {
                    showError(alerts.forgotErr, "Email not found.");
                }
            });
        });
    }

    if (document.body.classList.contains('home-page')) {
        console.log("Home Page Logic Loaded.");
    }
});