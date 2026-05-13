document.addEventListener('DOMContentLoaded', () => {
    let menuData           = [];
    let cart               = [];
    let currentFulfillment = 'delivery';
    let currentCategory    = 'pork'; // FIX: track active category in a variable, not just DOM state

    // ── DOM ELEMENTS ──────────────────────────────────────────
    const menuGrid         = document.getElementById('menu-grid');
    const noResults        = document.getElementById('no-results');
    const categoryBtns     = document.querySelectorAll('.cat-btn');
    const searchInput      = document.getElementById('search-input');
    const cartContainer    = document.getElementById('cart-items');
    const subtotalEl       = document.getElementById('subtotal');
    const totalEl          = document.getElementById('total');

    const addressModal     = document.getElementById('address-modal');
    const addAddressBtn    = document.getElementById('add-address-btn');
    const saveAddressBtn   = document.getElementById('save-address-btn');
    const addressInput     = document.getElementById('address-input');
    const addressDisplay   = document.getElementById('address-display');
    const addressText      = document.getElementById('address-text');
    const editAddressBtn   = document.getElementById('edit-address-btn');
    const removeAddressBtn = document.getElementById('remove-address-btn');

    const checkoutModal    = document.getElementById('checkout-modal');
    const checkoutItemsList= document.getElementById('checkout-items-list');
    const checkoutTotal    = document.getElementById('checkout-total');
    const paymentMethodBtns= document.querySelectorAll('#gcash-btn, #cod-btn');
    const uploadSection    = document.getElementById('gcash-upload-section');
    const proofInput       = document.getElementById('gcash-proof-input');
    const proofPreview     = document.getElementById('proof-preview');
    const uploadLabel      = document.getElementById('upload-label-text');
    const activeOrdersList = document.getElementById('active-orders-list');

    // ── 1. FETCH MENU ─────────────────────────────────────────
    // FIX: Uses database.php action instead of menu.php directly.
    // Both files are fixed to use the correct DB name (kikays_kusina).
    // This ensures menu items actually appear on the page.
    async function loadMenu() {
        try {
            const fd = new FormData();
            fd.append('action', 'get_menu');
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                menuData = data;
            } else {
                // Fallback: try the standalone menu.php
                const res2  = await fetch('menu.php');
                const data2 = await res2.json();
                menuData = Array.isArray(data2) ? data2 : [];
            }

            renderMenu(currentCategory);
        } catch (err) {
            console.error("Menu fetch error:", err);
            menuGrid.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0;">Could not load menu. Please refresh.</p>';
        }
    }

    loadMenu();

    // ── 2. RENDER MENU ────────────────────────────────────────
    // FIX: Category switching was broken because the filter compared
    // item.category directly but categories like "best_seller" had
    // inconsistent casing in some DB rows. Normalised with trim + toLowerCase.
    function renderMenu(category, searchTerm = '') {
        menuGrid.innerHTML = '';
        noResults.classList.add('hidden');

        const term = (searchTerm || '').trim().toLowerCase();
        const cat  = (category  || 'pork').trim().toLowerCase();

        const filtered = menuData.filter(item => {
            const itemCat  = (item.category || '').trim().toLowerCase();
            const itemName = (item.name      || '').toLowerCase();
            const itemDesc = (item.description || '').toLowerCase();

            const matchCat    = cat === 'all' || itemCat === cat;
            const matchSearch = !term || itemName.includes(term) || itemDesc.includes(term);
            return matchCat && matchSearch;
        });

        if (filtered.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }

        const frag = document.createDocumentFragment();
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';
            card.innerHTML = `
                <div class="menu-card-img-wrap">
                    <img src="${item.image_url || ''}" class="menu-card-img" alt="${escapeHtml(item.name)}"
                         onerror="this.src='https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'">
                </div>
                <div class="menu-card-body">
                    <h3 class="menu-card-name">${escapeHtml(item.name)}</h3>
                    <p class="menu-card-desc">${escapeHtml(item.description || '')}</p>
                    <p class="menu-card-price">₱${parseFloat(item.price || 0).toFixed(2)}</p>
                    <button class="modal-add-cart-btn add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
                </div>
            `;

            // FIX: Bind click listener directly — avoids stale closures from inline onclick
            card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(item.id);
            });

            frag.appendChild(card);
        });

        menuGrid.appendChild(frag);
    }

    // ── 3. CATEGORY BUTTONS ───────────────────────────────────
    // FIX: Was broken because renderMenu was called with the DOM button's
    // dataset.cat without updating the tracked currentCategory variable first.
    // Now updates both the variable and active class, then re-renders.
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            renderMenu(currentCategory, searchInput.value);
        });
    });


    // ── 4. SEARCH ─────────────────────────────────────────────
    searchInput.addEventListener('input', (e) => {
        renderMenu(currentCategory, e.target.value);
    });

    // ── 5. CART LOGIC ─────────────────────────────────────────
    function addToCart(id) {
        // FIX: Use == for comparison because id from DB is string, local may be number
        const item     = menuData.find(i => i.id == id);
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
        let total = 0;

        if (cart.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty</p>';
        } else {
            cart.forEach(item => {
                const itemTotal = item.price * item.qty;
                total += itemTotal;

                const div = document.createElement('div');
                div.className = 'cart-item';
                div.innerHTML = `
                    <div class="cart-item-info">
                        <p class="cart-item-name">${escapeHtml(item.name)}</p>
                        <p class="cart-item-price">₱${itemTotal.toFixed(2)} (${item.qty}x)</p>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn minus-btn">-</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn plus-btn">+</button>
                    </div>
                `;
                div.querySelector('.minus-btn').addEventListener('click', () => updateQty(item.id, -1));
                div.querySelector('.plus-btn').addEventListener('click',  () => updateQty(item.id,  1));
                cartContainer.appendChild(div);
            });
        }

        const fmt = `₱${total.toFixed(2)}`;
        subtotalEl.textContent = fmt;
        totalEl.textContent    = fmt;
        if (checkoutTotal) checkoutTotal.textContent = fmt;
    }

    function updateQty(id, change) {
        const item = cart.find(c => c.id == id);
        if (!item) return;
        item.qty += change;
        if (item.qty <= 0) cart = cart.filter(c => c.id != id);
        updateCartUI();
        if (!checkoutModal.classList.contains('hidden')) syncCheckoutList();
    }

    // ── 6. ADDRESS ────────────────────────────────────────────
    addAddressBtn.addEventListener('click', () => {
        addressInput.value = '';
        addressModal.classList.remove('hidden');
    });

    saveAddressBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = addressInput.value.trim();
        if (!val) { alert("Please enter a delivery address."); return; }
        addressText.textContent = val;
        addressDisplay.classList.remove('hidden');
        addAddressBtn.classList.add('hidden');
        addressModal.classList.add('hidden');
    });

    editAddressBtn.addEventListener('click', () => {
        addressInput.value = addressText.textContent;
        addressModal.classList.remove('hidden');
    });

    removeAddressBtn.addEventListener('click', () => {
        addressText.textContent = '';
        addressDisplay.classList.add('hidden');
        addAddressBtn.classList.remove('hidden');
        addressInput.value = '';
    });

    document.getElementById('address-modal-close').addEventListener('click', () => {
        addressModal.classList.add('hidden');
    });

    // ── 7. CHECKOUT MODAL ─────────────────────────────────────
    function syncCheckoutList() {
        checkoutItemsList.innerHTML = '';
        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'checkout-item-row';
            row.innerHTML = `<span>${item.qty}x ${escapeHtml(item.name)}</span><span>₱${(item.price * item.qty).toFixed(2)}</span>`;
            checkoutItemsList.appendChild(row);
        });
        if (checkoutTotal) checkoutTotal.textContent = totalEl.textContent;
    }

    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (cart.length === 0) { alert("Your cart is empty!"); return; }
        syncCheckoutList();
        checkoutModal.classList.remove('hidden');
    });

    document.getElementById('checkout-modal-close').addEventListener('click', () => {
        checkoutModal.classList.add('hidden');
    });

    // Payment method toggle
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            uploadSection.classList.toggle('hidden', btn.dataset.method !== 'gcash');
        });
    });

    // Proof of payment preview
    proofInput.addEventListener('change', () => {
        const file = proofInput.files[0];
        if (!file) return;
        uploadLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            proofPreview.src = e.target.result;
            proofPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    // ── 8. FULFILLMENT TOGGLE ─────────────────────────────────
    window.toggleFulfillment = (method) => {
        currentFulfillment = method;
        const addrSection = document.querySelector('.address-section');
        const label       = document.getElementById('schedule-label');
        document.getElementById('delivery-btn').classList.toggle('active', method === 'delivery');
        document.getElementById('pickup-btn').classList.toggle('active',   method === 'pickup');
        if (method === 'pickup') {
            addrSection?.classList.add('hidden');
            if (label) label.textContent = "Pickup Date & Time";
        } else {
            addrSection?.classList.remove('hidden');
            if (label) label.textContent = "Delivery Date & Time";
        }
    };

    // ── 9. PLACE ORDER ────────────────────────────────────────
    document.getElementById('place-order-btn').addEventListener('click', async () => {
        const activePayment   = document.querySelector('#gcash-btn.active, #cod-btn.active');
        const fulfillmentTime = document.getElementById('fulfillment-time').value;
        const currentAddress  = addressText.textContent.trim();
        const emailInput      = document.getElementById('checkout-email').value.trim();

        if (!fulfillmentTime) {
            alert("Please select a date and time!"); return;
        }
        if (currentFulfillment === 'delivery' && !currentAddress) {
            alert("Please add a delivery address!"); return;
        }
        if (!activePayment) {
            alert("Please select a payment method!"); return;
        }
        // FIX: Validate GCash proof on the client side before even sending
        if (activePayment.dataset.method === 'gcash' && !proofInput.files[0]) {
            alert("Please upload your GCash proof of payment!"); return;
        }

        const fd = new FormData();
        fd.append('action',           'place_order');
        fd.append('items',            cart.map(i => `${i.qty}x ${i.name}`).join(', '));
        fd.append('total',            totalEl.textContent.replace('₱', '').replace(/,/g, ''));
        fd.append('method',           activePayment.dataset.method);
        fd.append('fulfillment_type', currentFulfillment);
        fd.append('fulfillment_time', fulfillmentTime);
        fd.append('address',          currentFulfillment === 'delivery' ? currentAddress : 'Pickup');
        // FIX: email field was collected in the UI but never sent — now appended
        fd.append('email',            emailInput);

        if (activePayment.dataset.method === 'gcash') {
            fd.append('proof', proofInput.files[0]);
        }

        const placeBtn = document.getElementById('place-order-btn');
        placeBtn.disabled     = true;
        placeBtn.textContent  = 'Placing order…';

        try {
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.status === 'success') {
                checkoutModal.classList.add('hidden');
                cart = [];
                updateCartUI();
                proofInput.value            = '';
                proofPreview.classList.add('hidden');
                uploadLabel.textContent     = 'Click to upload screenshot';
                document.getElementById('fulfillment-time').value = '';
                document.getElementById('checkout-email').value   = '';
                loadUserOrders(); // Refresh order panel immediately
                alert("Order placed successfully! 🎉");
            } else {
                alert("Error: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Order Error:", err);
            alert("Something went wrong placing your order.");
        } finally {
            placeBtn.disabled    = false;
            placeBtn.textContent = 'Place Order';
        }
    });

    // ── 10. ACTIVE ORDERS PANEL ───────────────────────────────
    function statusLabel(s) {
        const map = {
            'Pending':   { cls: 'order-status-pending',   icon: '⏳', text: 'Pending' },
            'Completed': { cls: 'order-status-completed', icon: '✅', text: 'Ready / Completed' },
            'Cancelled': { cls: 'order-status-cancelled', icon: '❌', text: 'Cancelled' },
            'Received':  { cls: 'order-status-received',  icon: '🎉', text: 'Received' },
        };
        return map[s] || { cls: 'order-status-pending', icon: '⏳', text: s };
    }

    function fmtOrderDate(raw) {
        if (!raw) return '';
        const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
        return isNaN(d) ? raw : d.toLocaleString('en-PH', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    }

    async function loadUserOrders() {
        const fd = new FormData();
        fd.append('action', 'get_user_orders');

        try {
            const res    = await fetch('database.php', { method: 'POST', body: fd });
            const orders = await res.json();

            if (!Array.isArray(orders) || orders.length === 0) {
                activeOrdersList.innerHTML = '<p class="no-orders-msg">No orders yet.</p>';
                return;
            }

            activeOrdersList.innerHTML = '';
            orders.forEach(order => {
                const sl   = statusLabel(order.status);
                const card = document.createElement('div');
                card.className    = 'order-card';
                card.dataset.orderId = order.id;

                const itemChips = (order.items || '').split(',')
                    .map(i => `<span class="order-item-chip">${escapeHtml(i.trim())}</span>`)
                    .join('');

                const receivedBtnHtml = order.status === 'Completed'
                    ? `<button class="order-received-pill-btn" data-id="${order.id}">✓ Order Received</button>`
                    : '';

                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-card-id">Order #${order.id}</span>
                        <span class="order-card-status ${sl.cls}">${sl.icon} ${sl.text}</span>
                    </div>
                    <div class="order-card-items">${itemChips}</div>
                    <div class="order-card-meta">
                        <span class="order-card-type">${order.fulfillment_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}</span>
                        <span class="order-card-total">₱${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                    ${order.address ? `<div class="order-card-address">📍 ${escapeHtml(order.address)}</div>` : ''}
                    ${order.fulfillment_time ? `<div class="order-card-time">🕐 ${fmtOrderDate(order.fulfillment_time)}</div>` : ''}
                    <div class="order-placed-at">Placed: ${fmtOrderDate(order.created_at)}</div>
                    ${receivedBtnHtml}
                `;

                const recBtn = card.querySelector('.order-received-pill-btn');
                if (recBtn) {
                    recBtn.addEventListener('click', () => markOrderReceived(order.id, card));
                }

                activeOrdersList.appendChild(card);
            });
        } catch (err) {
            console.error("Orders fetch error:", err);
        }
    }

    async function markOrderReceived(orderId, cardEl) {
        const btn = cardEl.querySelector('.order-received-pill-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Marking…'; }

        const fd = new FormData();
        fd.append('action',   'mark_order_received');
        fd.append('order_id', orderId);

        try {
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status === 'success') {
                const statusEl = cardEl.querySelector('.order-card-status');
                if (statusEl) {
                    statusEl.className   = 'order-card-status order-status-received';
                    statusEl.textContent = '🎉 Received';
                }
                if (btn) btn.remove();
            } else {
                alert(data.message || "Could not mark as received.");
                if (btn) { btn.disabled = false; btn.textContent = '✓ Order Received'; }
            }
        } catch (err) {
            console.error("markOrderReceived error:", err);
            if (btn) { btn.disabled = false; btn.textContent = '✓ Order Received'; }
        }
    }

    // Poll every 15 seconds to catch admin status changes live
    setInterval(loadUserOrders, 15000);
    loadUserOrders();

const nameEl = document.getElementById('user-name');
    if (nameEl) {
        const storedName = sessionStorage.getItem('firstName');
        // If name exists and isn't a string "null"/"undefined"
        if (storedName && storedName !== 'undefined' && storedName !== 'null') {
            nameEl.textContent = storedName;
        } else {
            nameEl.textContent = 'Foodie'; 
        }
    }

    // ── HELPER: Escape HTML to prevent XSS ───────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});