document.addEventListener('DOMContentLoaded', () => {
    let menuData = [];
    let cart = [];
    let currentFulfillment = 'delivery'; 

    // --- DOM ELEMENTS ---
    const menuGrid       = document.getElementById('menu-grid');
    const categoryBtns   = document.querySelectorAll('.cat-btn');
    const searchInput    = document.getElementById('search-input');
    const cartContainer  = document.getElementById('cart-items');
    const subtotalEl     = document.getElementById('subtotal');
    const totalEl        = document.getElementById('total');

    // --- ADDRESS ELEMENTS ---
    const addressModal    = document.getElementById('address-modal');
    const addAddressBtn   = document.getElementById('add-address-btn');
    const saveAddressBtn  = document.getElementById('save-address-btn');
    const addressInput    = document.getElementById('address-input');
    const addressDisplay  = document.getElementById('address-display');
    const addressText     = document.getElementById('address-text');
    const editAddressBtn  = document.getElementById('edit-address-btn');
    const removeAddressBtn= document.getElementById('remove-address-btn');

    // --- CHECKOUT ELEMENTS ---
    const checkoutModal    = document.getElementById('checkout-modal');
    const checkoutItemsList= document.getElementById('checkout-items-list');
    const checkoutTotal    = document.getElementById('checkout-total');
    const paymentMethodBtns = document.querySelectorAll('#gcash-btn, #cod-btn');
    const uploadSection     = document.getElementById('gcash-upload-section');

    // --- 1. FETCH MENU DATA ---
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
        while (menuGrid.firstChild) {
            menuGrid.removeChild(menuGrid.firstChild);
        }
        const noResults = document.getElementById('no-results');
        const filtered = menuData.filter(item => {
            const matchesCat = category === 'all' || item.category.toLowerCase() === category.toLowerCase();
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            if (noResults) noResults.classList.remove('hidden');
            return;
        } else {
            if (noResults) noResults.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';
            card.innerHTML = `
                <div class="menu-card-img-wrap">
                    <img src="${item.image_url}" class="menu-card-img" alt="${item.name}" onerror="this.src='https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'">
                </div>
                <div class="menu-card-body">
                    <h3 class="menu-card-name">${item.name}</h3>
                    <p class="menu-card-desc">${item.description}</p>
                    <p class="menu-card-price">₱${parseFloat(item.price || 0).toFixed(2)}</p>
                    <button class="modal-add-cart-btn add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
                </div>
            `;
            fragment.appendChild(card);
        });
        menuGrid.appendChild(fragment);

        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                addToCart(btn.getAttribute('data-id'));
            };
        });
    }

    // --- 3. CART LOGIC ---
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
        if (cart.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty</p>';
        }
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
        totalEl.innerText    = formatted;
        if (checkoutTotal) checkoutTotal.innerText = formatted;
    }

    window.updateQty = (id, change) => {
        const item = cart.find(c => c.id == id);
        if (item) {
            item.qty += change;
            if (item.qty <= 0) cart = cart.filter(c => c.id != id);
            updateCartUI();
            if (!checkoutModal.classList.contains('hidden')) syncCheckoutList();
        }
    };

    // --- 4. ADDRESS LOGIC (UPDATED WITH EDIT/DELETE) ---
    addAddressBtn.onclick = () => {
        addressInput.value = '';
        addressModal.classList.remove('hidden');
    };

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

    // --- 5. CHECKOUT & DATABASE SUBMISSION ---
    function syncCheckoutList() {
        checkoutItemsList.innerHTML = '';
        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'checkout-item-row';
            row.innerHTML = `<span>${item.qty}x ${item.name}</span><span>₱${(item.price * item.qty).toFixed(2)}</span>`;
            checkoutItemsList.appendChild(row);
        });
        if (checkoutTotal) checkoutTotal.innerText = totalEl.innerText;
    }

    document.getElementById('checkout-btn').onclick = () => {
        if (cart.length === 0) return alert("Your cart is empty!");
        syncCheckoutList();
        checkoutModal.classList.remove('hidden');
    };

    paymentMethodBtns.forEach(btn => {
        btn.onclick = () => {
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            uploadSection.classList.toggle('hidden', btn.dataset.method !== 'gcash');
        };
    });

    const proofInput   = document.getElementById('gcash-proof-input');
    const proofPreview = document.getElementById('proof-preview');
    const uploadLabel  = document.getElementById('upload-label-text');

    proofInput.addEventListener('change', () => {
        const file = proofInput.files[0];
        if (file) {
            uploadLabel.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                proofPreview.src = e.target.result;
                proofPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('place-order-btn').onclick = async () => {
        const activePayment  = document.querySelector('#gcash-btn.active, #cod-btn.active');
        const fulfillmentTime = document.getElementById('fulfillment-time').value;
        const currentAddress = addressText.innerText.trim();

        if (!fulfillmentTime) return alert("Please select a date and time!");
        if (currentFulfillment === 'delivery' && currentAddress === '') {
            return alert("Please add a delivery address!");
        }
        if (!activePayment) return alert("Please select a payment method!");

        const fd = new FormData();
        fd.append('action', 'place_order');
        fd.append('total', totalEl.innerText.replace('₱', '').replace(/,/g, ''));
        fd.append('method', activePayment.dataset.method);
        fd.append('fulfillment_type', currentFulfillment);
        fd.append('fulfillment_time', fulfillmentTime);
        // Include Address in form data
        fd.append('address', currentFulfillment === 'delivery' ? currentAddress : 'Pickup Order');

        const itemsString = cart.map(i => `${i.qty}x ${i.name}`).join(', ');
        fd.append('items', itemsString);

        const proofFile = proofInput.files[0];
        if (activePayment.dataset.method === 'gcash' && proofFile) {
            fd.append('proof', proofFile);
        }

        try {
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.status === 'success') {
                checkoutModal.classList.add('hidden');
                document.getElementById('success-modal').classList.remove('hidden');
                cart = [];
                updateCartUI();
                proofInput.value = '';
                proofPreview.classList.add('hidden');
                uploadLabel.textContent = 'Click to upload screenshot';
            } else {
                alert("Error: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Order Error:", err);
            alert("Something went wrong placing your order.");
        }
    };

    document.getElementById('checkout-modal-close').onclick = () => checkoutModal.classList.add('hidden');
    document.getElementById('success-close-btn').onclick   = () => document.getElementById('success-modal').classList.add('hidden');

    document.getElementById('order-received-btn').onclick = () => {
        document.getElementById('order-status-badge').className = 'status-badge received';
        document.getElementById('order-status-badge').textContent = 'Received';
        document.getElementById('order-received-btn').disabled = true;
    };

// --- 6. NAV & SEARCH (FIXED INITIALIZATION) ---
    const getActiveCat = () => {
        const activeBtn = document.querySelector('.cat-btn.active');
        return activeBtn ? activeBtn.dataset.cat : 'all';
    };

    searchInput.addEventListener('input', (e) => {
        renderMenu(getActiveCat(), e.target.value);
    });

    categoryBtns.forEach(btn => {
        btn.onclick = () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const categoryTitle = document.getElementById('category-title');
            if (categoryTitle) {
                // Strips emojis for the title
                categoryTitle.textContent = btn.textContent.trim().replace(/[^\x00-\x7F]/g, '').trim();
            }
            
            renderMenu(btn.dataset.cat, searchInput.value);
        };
    });

    // --- 7. DYNAMIC GREETING ---
    const firstName = sessionStorage.getItem('firstName') || "User";
    document.getElementById('user-name').textContent = firstName;

    // --- 8. FULFILLMENT TOGGLE ---
    window.toggleFulfillment = (method) => {
        currentFulfillment = method;
        const addrSection = document.querySelector('.address-section');
        const label       = document.getElementById('schedule-label');
        document.getElementById('delivery-btn').classList.toggle('active', method === 'delivery');
        document.getElementById('pickup-btn').classList.toggle('active',  method === 'pickup');

        if (method === 'pickup') {
            addrSection.classList.add('hidden');
            label.textContent = "Pickup Date & Time";
        } else {
            addrSection.classList.remove('hidden');
            label.textContent = "Delivery Date & Time";
        }
    };
});