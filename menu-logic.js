(() => {
  // ── State ──────────────────────────────────────
  const cart = [];
  let activeCategory = 'Pork';
  let searchQuery = '';

  // ── DOM refs ───────────────────────────────────
  const navItems       = document.querySelectorAll('.nav-item');
  const searchInput    = document.getElementById('search-input');
  const menuGrid       = document.getElementById('menu-grid');
  const categoryTitle  = document.getElementById('category-title');
  const cartItemsList  = document.getElementById('cart-items');
  const subtotalEl     = document.getElementById('cart-subtotal');
  const deliveryEl     = document.getElementById('cart-delivery');
  const totalEl        = document.getElementById('cart-total');
  const checkoutBtn    = document.getElementById('checkout-btn');
  const addressBlock   = document.getElementById('address-block');
  const addAddressBtn  = document.getElementById('add-address-btn');

  // ── Menu data (injected from PHP via window.MENU_DATA) ──
  const menuData = window.MENU_DATA || {};

  // ── Seed initial cart from PHP ─────────────────
  if (window.INITIAL_CART && Array.isArray(window.INITIAL_CART)) {
    window.INITIAL_CART.forEach(item => cart.push({ ...item }));
  }

  // ── Category navigation ────────────────────────
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      activeCategory = item.dataset.category;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      renderMenu();
    });
  });

  // ── Search ─────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderMenu();
    });
  }

  // ── Render menu grid ───────────────────────────
  function renderMenu() {
    if (!menuGrid) return;

    let items = menuData[activeCategory] || [];

    if (searchQuery) {
      const all = Object.values(menuData).flat();
      items = all.filter(i =>
        i.name.toLowerCase().includes(searchQuery) ||
        i.desc.toLowerCase().includes(searchQuery)
      );
    }

    if (categoryTitle) {
      categoryTitle.textContent = searchQuery ? 'Search Results' : activeCategory;
    }

    if (items.length === 0) {
      menuGrid.innerHTML = '<p class="no-results">No items found.</p>';
      return;
    }

    menuGrid.innerHTML = items.map(item => `
      <div class="menu-card" data-id="${item.id}" data-category="${item.category}" role="button" tabindex="0" aria-label="Add ${item.name} to cart">
        <img class="menu-card-img" src="${item.img}" alt="${item.name}" loading="lazy" />
        <div class="menu-card-body">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-desc">${item.desc}</div>
          <div class="menu-card-price">₱${item.price.toFixed(2)}</div>
        </div>
      </div>
    `).join('');

    menuGrid.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => addToCart(card.dataset.id, card.dataset.category));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') addToCart(card.dataset.id, card.dataset.category);
      });
    });
  }

  // ── Cart logic ─────────────────────────────────
  function findMenuItem(id, category) {
    const cats = category ? [category] : Object.keys(menuData);
    for (const cat of cats) {
      const found = (menuData[cat] || []).find(i => i.id === id);
      if (found) return found;
    }
    return null;
  }

  function addToCart(id, category) {
    const item = findMenuItem(id, category);
    if (!item) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    renderCart();
    animateCartAdd();
  }

  function removeFromCart(id) {
    const idx = cart.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (cart[idx].qty > 1) {
      cart[idx].qty--;
    } else {
      cart.splice(idx, 1);
    }
    renderCart();
  }

  function renderCart() {
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      updateTotals(0);
      return;
    }

    cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <img class="cart-item-img" src="${item.img}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-qty">
            <button class="qty-btn qty-minus" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn qty-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-item-price">₱${(item.price * item.qty).toFixed(2)}</div>
      </div>
    `).join('');

    cartItemsList.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
    cartItemsList.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id, null));
    });

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    updateTotals(subtotal);
  }

  function updateTotals(subtotal) {
    const delivery = subtotal > 0 ? 67 : 0;
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.textContent = `$${delivery.toFixed(2)}`;
    if (totalEl)    totalEl.textContent    = `$${(subtotal + delivery).toFixed(2)}`;
  }

  function animateCartAdd() {
    if (!checkoutBtn) return;
    checkoutBtn.classList.add('pulse');
    setTimeout(() => checkoutBtn.classList.remove('pulse'), 400);
  }

  // ── Address ────────────────────────────────────
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => {
      const addr = prompt('Enter your delivery address:');
      if (addr && addr.trim()) {
        if (addressBlock) {
          addressBlock.innerHTML = `
            <div class="cart-address-label">Delivery Address</div>
            <div class="cart-address-text">${addr.trim()}</div>
          `;
        }
      }
    });
  }

  // ── View All button ────────────────────────────
  const viewAllBtn = document.getElementById('view-all-btn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      // Already showing category — scroll to top of grid
      menuGrid && menuGrid.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ── Checkout ───────────────────────────────────
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Your cart is empty. Add some items first!');
        return;
      }
      alert(`Order placed! Total: $${(cart.reduce((s,i) => s + i.price*i.qty, 0) + 67).toFixed(2)}\nThank you for ordering from Kikay\'s Kusina!`);
    });
  }

  // ── Init ───────────────────────────────────────
  renderMenu();
  renderCart();
})();
