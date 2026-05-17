document.addEventListener('DOMContentLoaded', () => {
    let menuData           = [];
    let cart               = [];
    let currentFulfillment = 'delivery';
    let currentCategory    = 'pork';
    let savedAddressId     = null;   // address row id from the addresses table

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
    async function loadMenu() {
        try {
            const fd = new FormData();
            fd.append('action', 'get_menu');
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            menuData = Array.isArray(data) && data.length > 0 ? data : [];
            renderMenu(currentCategory);
        } catch (err) {
            console.error("Menu fetch error:", err);
            menuGrid.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0;">Could not load menu. Please refresh.</p>';
        }
    }

    loadMenu();

    // ── 2. LOAD SAVED ADDRESS from addresses table ────────────
    async function loadSavedAddress() {
        try {
            const fd = new FormData();
            fd.append('action', 'get_address');
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.status === 'success') {
                savedAddressId = data.address_id;
                addressText.textContent = data.full_address;
                addressDisplay.classList.remove('hidden');
                addAddressBtn.classList.add('hidden');
            }
        } catch (err) {
            console.error("Address load error:", err);
        }
    }

    loadSavedAddress();

    // ── 3. RENDER MENU ────────────────────────────────────────
    function renderMenu(category, searchTerm = '') {
        menuGrid.innerHTML = '';
        noResults.classList.add('hidden');

        const term = (searchTerm || '').trim().toLowerCase();
        const cat  = (category  || 'pork').trim().toLowerCase();

        const filtered = menuData.filter(item => {
            const itemCat  = (item.category    || '').trim().toLowerCase();
            const itemName = (item.name         || '').toLowerCase();
            const itemDesc = (item.description  || '').toLowerCase();

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

            card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(item.id);
            });

            frag.appendChild(card);
        });

        menuGrid.appendChild(frag);
    }

    // ── 4. CATEGORY BUTTONS ───────────────────────────────────
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            renderMenu(currentCategory, searchInput.value);
        });
    });

    // ── 5. SEARCH ─────────────────────────────────────────────
    searchInput.addEventListener('input', (e) => {
        renderMenu(currentCategory, e.target.value);
    });

    // ── 6. CART LOGIC ─────────────────────────────────────────
    function addToCart(id) {
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

    // ── 7. ADDRESS ────────────────────────────────────────────
    // "Add Address" opens modal
    addAddressBtn.addEventListener('click', () => {
        addressInput.value = '';
        addressModal.classList.remove('hidden');
    });

    // Save address → persist to addresses table, get back address_id
    saveAddressBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const val = addressInput.value.trim();
        if (!val) { alert("Please enter a delivery address."); return; }

        try {
            const fd = new FormData();
            fd.append('action',       'save_address');
            fd.append('full_address', val);
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.status === 'success') {
                savedAddressId = data.address_id;
                addressText.textContent = val;
                addressDisplay.classList.remove('hidden');
                addAddressBtn.classList.add('hidden');
                addressModal.classList.add('hidden');
            } else {
                alert("Could not save address: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Address save error:", err);
            alert("Network error saving address.");
        }
    });

    editAddressBtn.addEventListener('click', () => {
        addressInput.value = addressText.textContent;
        addressModal.classList.remove('hidden');
    });

    removeAddressBtn.addEventListener('click', () => {
        savedAddressId          = null;
        addressText.textContent = '';
        addressDisplay.classList.add('hidden');
        addAddressBtn.classList.remove('hidden');
        addressInput.value = '';
    });

    document.getElementById('address-modal-close').addEventListener('click', () => {
        addressModal.classList.add('hidden');
    });

    // ── 8. CHECKOUT MODAL ─────────────────────────────────────
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

    // ── 9. FULFILLMENT TOGGLE ─────────────────────────────────
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

    // ── 10. PLACE ORDER ───────────────────────────────────────
    document.getElementById('place-order-btn').addEventListener('click', async () => {
        const activePayment   = document.querySelector('#gcash-btn.active, #cod-btn.active');
        const fulfillmentTime = document.getElementById('fulfillment-time').value;
        const currentAddress  = addressText.textContent.trim();

        if (!fulfillmentTime) {
            alert("Please select a date and time!"); return;
        }
        if (currentFulfillment === 'delivery' && !currentAddress) {
            alert("Please add a delivery address!"); return;
        }
        if (!activePayment) {
            alert("Please select a payment method!"); return;
        }
        if (activePayment.dataset.method === 'gcash' && !proofInput.files[0]) {
            alert("Please upload your GCash proof of payment!"); return;
        }

        // Build items_json: [{menu_id, quantity, line_price}, ...]
        const itemsJson = JSON.stringify(
            cart.map(i => ({
                menu_id:    i.id,
                quantity:   i.qty,
                line_price: parseFloat((i.price * i.qty).toFixed(2))
            }))
        );

        // Raw total (strip ₱ and commas)
        const rawTotal = totalEl.textContent.replace('₱', '').replace(/,/g, '');

        const fd = new FormData();
        fd.append('action',           'place_order');
        fd.append('items_json',       itemsJson);
        fd.append('total',            rawTotal);
        fd.append('method',           activePayment.dataset.method);
        fd.append('fulfillment_type', currentFulfillment);
        fd.append('fulfillment_time', fulfillmentTime);

        // For delivery: send the persisted address_id (or address text as fallback)
        if (currentFulfillment === 'delivery') {
            if (savedAddressId) {
                fd.append('address_id', savedAddressId);
            } else {
                // Address was typed but not yet saved — save it first
                const saveFd = new FormData();
                saveFd.append('action',       'save_address');
                saveFd.append('full_address', currentAddress);
                const saveRes  = await fetch('database.php', { method: 'POST', body: saveFd });
                const saveData = await saveRes.json();
                if (saveData.status === 'success') {
                    savedAddressId = saveData.address_id;
                    fd.append('address_id', savedAddressId);
                }
            }
        }

        if (activePayment.dataset.method === 'gcash') {
            fd.append('proof', proofInput.files[0]);
        }

        const placeBtn = document.getElementById('place-order-btn');
        placeBtn.disabled    = true;
        placeBtn.textContent = 'Placing order…';

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
                loadUserOrders();
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

    // ── 11. ACTIVE ORDERS PANEL ───────────────────────────────
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
                card.className       = 'order-card';
                card.dataset.orderId = order.id;

                // items comes as a GROUP_CONCAT string: "2x Adobo, 1x Lechon"
                const itemChips = (order.items || '').split(',')
                    .map(i => `<span class="order-item-chip">${escapeHtml(i.trim())}</span>`)
                    .join('');

                const receivedBtnHtml = order.status === 'Completed'
                    ? `<button class="order-received-pill-btn" data-id="${order.id}">✓ Order Received</button>`
                    : '';

                // Use total_amount aliased as total in the query
                const displayTotal = parseFloat(order.total || 0).toFixed(2);

                card.innerHTML = `
                    <div class="order-card-header">
                        <span class="order-card-id">Order #${order.id}</span>
                        <span class="order-card-status ${sl.cls}">${sl.icon} ${sl.text}</span>
                    </div>
                    <div class="order-card-items">${itemChips}</div>
                    <div class="order-card-meta">
                        <span class="order-card-type">${order.fulfillment_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}</span>
                        <span class="order-card-total">₱${displayTotal}</span>
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

    // Poll every 15 seconds to catch admin status changes
    setInterval(loadUserOrders, 15000);
    loadUserOrders();

    // ── User greeting ─────────────────────────────────────────
    const nameEl = document.getElementById('user-name');
    if (nameEl) {
        const storedName = sessionStorage.getItem('firstName');
        nameEl.textContent = (storedName && storedName !== 'undefined' && storedName !== 'null')
            ? storedName
            : 'Foodie';
    }

    // ── HELPER ────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
});