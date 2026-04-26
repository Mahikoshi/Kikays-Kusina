/* GROUP 3 - KIKAY'S KUSINA PROJECT
    CORE SCRIPT: Firebase Initialization, Authentication, and Hardcoded Admin Routing
*/

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

// Initialize Firebase App and Database connection
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    

    //start of register logic
    // Only run this logic if we are on the Login/Register page
    if (document.body.classList.contains('login-page')) {
        
        // --- UI ELEMENT REFERENCES ---
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

        // --- UI HELPER FUNCTIONS ---
        
        // Switches between Login, Create User, and Forgot Password views
        const showView = (target) => {
            Object.values(views).forEach(v => v.classList.add('hidden'));
            Object.values(alerts).forEach(a => a.classList.add('hidden'));
            views[target].classList.remove('hidden');
        };

        // Displays error messages and hides them automatically after 3 seconds
        const showError = (container, msg) => {
            container.querySelector('.error-msg-text').textContent = msg;
            container.classList.remove('hidden');
            setTimeout(() => container.classList.add('hidden'), 3000);
        };

        // Displays success messages and hides them automatically after 3 seconds
        const showSuccess = (container, msg) => {
            container.querySelector('.error-msg-text').textContent = msg;
            container.classList.remove('hidden');
            setTimeout(() => container.classList.add('hidden'), 3000);
        };

        // --- NAVIGATION HANDLERS ---
        document.getElementById('showCreateBtn').addEventListener('click', () => showView('register'));
        document.getElementById('showLoginBtn').addEventListener('click', () => showView('login'));
        document.getElementById('forgotPassLink').addEventListener('click', (e) => {
            e.preventDefault(); // Prevents page refresh
            showView('forgot');
        });
        document.getElementById('backFromForgotBtn').addEventListener('click', () => showView('login'));

        // Toggle Password Visibility (Checkbox logic)
        document.getElementById('toggleShowPass').addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            document.querySelectorAll('.toggle-pass').forEach(input => input.type = type);
        });

        // Numeric Validation: Prevents users from typing letters in the Phone field
        const phoneInput = document.getElementById('regPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }

        // --- DATABASE LOGIC: REGISTER ---
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            // Firebase paths cannot contain dots (.), so we replace dots in emails with commas (,)
            const email = document.getElementById('regEmail').value.trim().replace(/\./g, ',');
            const phone = document.getElementById('regPhone').value.trim();
            const pass = document.getElementById('regPassword').value;

            // Simple validation check
            if (pass !== document.getElementById('regConfirmPassword').value) {
                return showError(alerts.regErr, "Passwords do not match!");
            }

            // Saving data to Firebase. Regular users do not get a 'role' field here.
            database.ref('users/' + email).set({ 
                password: pass,
                phone: phone 
            }, (error) => {
                if (error) showError(alerts.regErr, "Database Error!");
                else {
                    showView('login');
                    showSuccess(alerts.loginSuccess, "Account Created Successfully!");
                }
            });
        });

        // --- DATABASE LOGIC: LOGIN & HARDCODED ROLE DETECTION ---
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get raw email for admin comparison and converted email for DB lookup
            const rawEmail = document.getElementById('loginEmail').value.trim().toLowerCase();
            const emailForDB = rawEmail.replace(/\./g, ',');
            const pass = document.getElementById('loginPassword').value;

            // List of authorized admin emails (Hardcoded for security and ease of use)
            const adminEmails = ["admin@gmail.com", "kikay@email.com"];

            // Fetch user data from Firebase
            database.ref('users/' + emailForDB).once('value').then((snapshot) => {
                if (snapshot.exists() && snapshot.val().password === pass) {
                    
                    // ROLE CHECK: If the email is in the admin list, go to Admin UI.
                    // Otherwise, send to the regular Home page.
                    if (adminEmails.includes(rawEmail)) {
                        sessionStorage.setItem('userRole', 'admin');
                        window.location.href = "adminUI.html";
                    } else {
                        sessionStorage.setItem('userRole', 'user');
                        window.location.href = "Home.html";
                    }
                } else {
                    showError(alerts.loginErr, "Invalid Email or Password");
                }
            });
        });

        // --- DATABASE LOGIC: PASSWORD RESET ---
        document.getElementById('forgotForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim().replace(/\./g, ',');
            const newPass = document.getElementById('newPassword').value;

            database.ref('users/' + email).once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    // Updates existing data node with the new password
                    database.ref('users/' + email).update({ password: newPass });
                    showView('login');
                    showSuccess(alerts.loginSuccess, "Password Updated Successfully!");
                } else {
                    showError(alerts.forgotErr, "Email not found.");
                }
            });
        });
    }

    //end of login/register logic

    // Console confirmation for the Home Page
    if (document.body.classList.contains('home-page')) {
        console.log("Home Page Logic Loaded.");
    }
});