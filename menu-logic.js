let currentCart = [];
let menuData = [
    { id: 1, name: "Kinilaw", price: 400, desc: "Fresh fish marinated in vinegar.", cat: "Pork" },
    { id: 2, name: "Lechon Kawali", price: 450, desc: "Crispy fried pork belly.", cat: "Pork" }
    // Add more items here matching your DB
];

document.addEventListener('DOMContentLoaded', () => {
    renderItems("Pork");

    // Category Switching
    document.querySelectorAll('.cat-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.cat-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.category;
            document.getElementById('currentCategoryTitle').innerText = cat;
            renderItems(cat);
        };
    });

    // Live Search
    document.getElementById('menuSearch').oninput = (e) => {
        const activeCat = document.querySelector('.cat-item.active').dataset.category;
        renderItems(activeCat, e.target.value);
    };

    // Checkout Trigger
    document.getElementById('mainCheckoutBtn').onclick = () => {
        if(currentCart.length === 0) return alert("Cart is empty!");
        document.getElementById('checkoutModal').classList.remove('hidden');
    };
});

function renderItems(category, search = "") {
    const grid = document.getElementById('itemGrid');
    const filtered = menuData.filter(i => 
        i.cat === category && i.name.toLowerCase().includes(search.toLowerCase())
    );
    
    grid.innerHTML = filtered.map(i => `
        <div class="food-card" onclick="openItemModal(${i.id})">
            <img src="Pics/item${i.id}.png" onerror="this.src='Pics/banner.png'">
            <h4>${i.name}</h4>
            <p style="font-size:0.8rem; color:gray;">${i.desc}</p>
            <p><strong>₱${i.price}.00</strong></p>
        </div>
    `).join('');
}

function openItemModal(id) {
    const item = menuData.find(i => i.id === id);
    document.getElementById('itemModalContent').innerHTML = `
        <img src="Pics/item${item.id}.png" style="width:100%; border-radius:20px;">
        <h2>${item.name}</h2>
        <p>${item.desc}</p>
        <h3>₱${item.price}.00</h3>
        <button onclick="addToCart(${item.id})" class="big-checkout-btn" style="background:#FDE68A">Add to Cart</button>
    `;
    document.getElementById('itemModal').classList.remove('hidden');
}

function addToCart(id) {
    const item = menuData.find(i => i.id === id);
    currentCart.push(item);
    updateCartUI();
    closeModals();
}

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    list.innerHTML = currentCart.map((i, index) => `
        <div class="cart-item">
            <span>${i.name}</span>
            <span>₱${i.price} <button onclick="removeFromCart(${index})" style="border:none; background:none; color:red; cursor:pointer;">&times;</button></span>
        </div>
    `).join('');
    
    const total = currentCart.reduce((sum, i) => sum + i.price, 0);
    document.getElementById('subTotalDisplay').innerText = `₱${total}.00`;
    document.getElementById('grandTotalDisplay').innerText = `₱${total}.00`;
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    updateCartUI();
}

function closeModals() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
}

function setPaymentMethod(method) {
    window.selectedPaymentMethod = method;
    document.getElementById('gcashSection').className = (method === 'GCash') ? '' : 'hidden';
}

async function processFinalOrder() {
    const fd = new FormData();
    fd.append('action', 'place_order');
    fd.append('items', JSON.stringify(currentCart));
    fd.append('method', window.selectedPaymentMethod);
    if(window.selectedPaymentMethod === 'GCash') {
        fd.append('proof', document.getElementById('gcashProof').files[0]);
    }

    const res = await fetch('database.php', { method: 'POST', body: fd });
    const data = await res.json();
    if(data.status === 'success') {
        alert("Order Placed!");
        location.reload();
    }
}