document.addEventListener('DOMContentLoaded', () => {
    let menuData = [];
    let cart = [];
    let currentFulfillment = 'delivery'; // FIX: moved to top of scope so all functions can access it

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
    // FIX: correctly references the checkout-modal wrapper that now exists in menu.html
    const checkoutModal    = document.getElementById('checkout-modal');
    const checkoutItemsList= document.getElementById('checkout-items-list');
    const checkoutTotal    = document.getElementById('checkout-total');

    // FIX: only target payment method buttons (gcash/cod), not fulfillment buttons
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
        const noResults = document.getElementById('no-results');
        const filtered = menuData.filter(item => {
            const matchesCat    = category === 'all' || item.category.toLowerCase() === category.toLowerCase();
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }

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
            menuGrid.appendChild(card);
        });

        // FIX: use a distinct class so we don't accidentally rebind modal buttons
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

    // FIX: payment method toggle (gcash / cod only)
    paymentMethodBtns.forEach(btn => {
        btn.onclick = () => {
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            uploadSection.classList.toggle('hidden', btn.dataset.method !== 'gcash');
        };
    });

    // FIX: GCash proof image preview
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

    // PLACE ORDER
    document.getElementById('place-order-btn').onclick = async () => {
        const activePayment  = document.querySelector('#gcash-btn.active, #cod-btn.active');
        const fulfillmentTime = document.getElementById('fulfillment-time').value;

        if (!fulfillmentTime) return alert("Please select a date and time!");
        if (currentFulfillment === 'delivery' && addressText.innerText.trim() === '') {
            return alert("Please add a delivery address!");
        }
        if (!activePayment) return alert("Please select a payment method!");

        const fd = new FormData();
        fd.append('action', 'place_order');
        fd.append('total', totalEl.innerText.replace('₱', '').replace(/,/g, ''));
        fd.append('method', activePayment.dataset.method);
        fd.append('fulfillment_type', currentFulfillment);
        fd.append('fulfillment_time', fulfillmentTime);

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
                // Reset proof input
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

    // FIX: correctly references checkout-modal-close which now exists in menu.html
    document.getElementById('checkout-modal-close').onclick = () => checkoutModal.classList.add('hidden');
    document.getElementById('success-close-btn').onclick   = () => document.getElementById('success-modal').classList.add('hidden');

    document.getElementById('order-received-btn').onclick = () => {
        document.getElementById('order-status-badge').className = 'status-badge received';
        document.getElementById('order-status-badge').textContent = 'Received';
        document.getElementById('order-received-btn').disabled = true;
    };

    // --- 6. NAV & SEARCH ---
    searchInput.addEventListener('input', (e) => {
        const activeBtn = document.querySelector('.cat-btn.active');
        renderMenu(activeBtn ? activeBtn.dataset.cat : 'pork', e.target.value);
    });

    categoryBtns.forEach(btn => {
        btn.onclick = () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('category-title').textContent =
                btn.textContent.trim().replace(/^\S+\s*/, ''); // strip emoji
            renderMenu(btn.dataset.cat, searchInput.value);
        };
    });

    // --- 7. DYNAMIC GREETING ---
    const firstName = sessionStorage.getItem('firstName') || "User";
    document.getElementById('user-name').textContent = firstName;

    // --- 8. FULFILLMENT TOGGLE ---
    // FIX: uses module-level currentFulfillment variable
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