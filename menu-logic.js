document.addEventListener('DOMContentLoaded', () => {
    let menuData = [];
    let cart = [];

    // --- DOM ELEMENTS ---
    const menuGrid = document.getElementById('menu-grid');
    const categoryBtns = document.querySelectorAll('.cat-btn');
    const navLinks = document.querySelectorAll('.nav-link');
    const searchInput = document.getElementById('search-input');
    const cartContainer = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    // --- ADDRESS ELEMENTS ---
    const addressModal = document.getElementById('address-modal');
    const addAddressBtn = document.getElementById('add-address-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const addressInput = document.getElementById('address-input');
    const addressDisplay = document.getElementById('address-display');
    const addressText = document.getElementById('address-text');
    const editAddressBtn = document.getElementById('edit-address-btn');
    const removeAddressBtn = document.getElementById('remove-address-btn');

    // --- CHECKOUT ELEMENTS ---
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutItemsList = document.getElementById('checkout-items-list');
    const checkoutTotal = document.getElementById('checkout-total');
    const paymentBtns = document.querySelectorAll('.payment-option-btn');
    const uploadSection = document.getElementById('gcash-upload-section');

    // --- 1. FETCH DATA ---
    fetch('menu.php')
        .then(res => res.json())
        .then(data => {
            menuData = data;
            renderMenu('pork'); 
        })
        .catch(err => console.error("Fetch Error:", err));

    // --- 2. RENDER MENU ---
    function renderMenu(category, searchTerm = '') {
        menuGrid.innerHTML = '';
        const filtered = menuData.filter(item => {
            const matchesCat = category === 'all' || item.category.toLowerCase() === category.toLowerCase();
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';
            card.innerHTML = `
                <div class="menu-card-img-wrap">
                    <img src="${item.image_url}" class="menu-card-img" alt="${item.name}">
                </div>
                <div class="menu-card-body">
                    <h3 class="menu-card-name">${item.name}</h3>
                    <p class="menu-card-desc">${item.description}</p>
                    <p class="menu-card-price">₱${parseFloat(item.price || 0).toFixed(2)}</p>
                    <button class="modal-add-cart-btn" data-id="${item.id}">Add to Cart</button>
                </div>
            `;
            menuGrid.appendChild(card);
        });

        document.querySelectorAll('.modal-add-cart-btn').forEach(btn => {
            btn.onclick = () => addToCart(btn.getAttribute('data-id'));
        });
    }

    // --- 3. CART LOGIC (FIXED NaN) ---
    function addToCart(id) {
        const item = menuData.find(i => i.id == id);
        if (!item) return;

        const existing = cart.find(c => c.id == id);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ ...item, qty: 1, price: parseFloat(item.price) || 0 });
        }
        updateCartUI();
    }

    function updateCartUI() {
        cartContainer.innerHTML = '';
        let currentTotal = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            currentTotal += itemTotal;
            
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.name}</p>
                    <p class="cart-item-price">₱${itemTotal.toFixed(2)} (${item.qty}x)</p>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="window.updateQty(${item.id}, -1)">-</button>
                    <span class="qty-num">${item.qty}</span>
                    <button class="qty-btn" onclick="window.updateQty(${item.id}, 1)">+</button>
                </div>
            `;
            cartContainer.appendChild(div);
        });

        const formatted = `₱${currentTotal.toFixed(2)}`;
        subtotalEl.innerText = formatted;
        totalEl.innerText = formatted;
        if(checkoutTotal) checkoutTotal.innerText = formatted;
    }

    window.updateQty = (id, change) => {
        const item = cart.find(c => c.id == id);
        if (item) {
            item.qty += change;
            if (item.qty <= 0) cart = cart.filter(c => c.id != id);
            updateCartUI();
            // Refresh checkout list if modal is open
            if (!checkoutModal.classList.contains('hidden')) syncCheckoutList();
        }
    };

    // --- 4. ADDRESS LOGIC ---
    addAddressBtn.onclick = () => addressModal.classList.remove('hidden');

    saveAddressBtn.onclick = (e) => {
        e.preventDefault();
        const val = addressInput.value.trim();
        if (val) {
            addressText.innerText = val;
            addressDisplay.classList.remove('hidden');
            addAddressBtn.classList.add('hidden');
            addressModal.classList.add('hidden');
        }
    };

    editAddressBtn.onclick = () => {
        addressInput.value = addressText.innerText;
        addressModal.classList.remove('hidden');
    };

    removeAddressBtn.onclick = () => {
        addressText.innerText = '';
        addressDisplay.classList.add('hidden');
        addAddressBtn.classList.remove('hidden');
        addressInput.value = '';
    };

    document.getElementById('address-modal-close').onclick = () => addressModal.classList.add('hidden');

    // --- 5. CHECKOUT LOGIC ---
    function syncCheckoutList() {
        checkoutItemsList.innerHTML = '';
        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'checkout-item-row';
            row.innerHTML = `<span>${item.qty}x ${item.name}</span><span>₱${(item.price * item.qty).toFixed(2)}</span>`;
            checkoutItemsList.appendChild(row);
        });
        checkoutTotal.innerText = totalEl.innerText;
    }

    document.getElementById('checkout-btn').onclick = () => {
        if (cart.length === 0) return alert("Cart is empty!");
        syncCheckoutList();
        checkoutModal.classList.remove('hidden');
    };

    paymentBtns.forEach(btn => {
        btn.onclick = () => {
            paymentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            uploadSection.classList.toggle('hidden', btn.dataset.method !== 'gcash');
        };
    });

    document.getElementById('checkout-modal-close').onclick = () => checkoutModal.classList.add('hidden');
    document.getElementById('success-close-btn').onclick = () => document.getElementById('success-modal').classList.add('hidden');

    // --- 6. NAV & SEARCH ---
    searchInput.addEventListener('input', (e) => {
        const activeBtn = document.querySelector('.cat-btn.active');
        renderMenu(activeBtn ? activeBtn.dataset.cat : 'pork', e.target.value);
    });

    categoryBtns.forEach(btn => {
        btn.onclick = () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(btn.dataset.cat, searchInput.value);
        };
    });

    // Dynamic Greeting
    const firstName = sessionStorage.getItem('firstName') || "User";
    document.getElementById('user-name').textContent = firstName;

    // Fulfillment Toggle Logic
    let currentFulfillment = 'delivery';
    window.toggleFulfillment = (method) => {
        currentFulfillment = method;
        const addrSection = document.querySelector('.address-section');
        const label = document.getElementById('schedule-label');
        
        document.getElementById('delivery-btn').classList.toggle('active', method === 'delivery');
        document.getElementById('pickup-btn').classList.toggle('active', method === 'pickup');

        if(method === 'pickup') {
            addrSection.classList.add('hidden');
            label.textContent = "Pickup Date & Time";
        } else {
            addrSection.classList.remove('hidden');
            label.textContent = "Delivery Date & Time";
        }
    };
    
});