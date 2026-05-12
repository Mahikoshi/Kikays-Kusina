document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('ordersTableBody');
    const searchInput = document.getElementById('searchOrders');
    const filterStatus = document.getElementById('filterStatus');
    
    let allOrders = []; // Store orders globally for filtering

    // --- 1. FETCH & RENDER ORDERS ---
    async function loadOrders() {
        const fd = new FormData();
        fd.append('action', 'get_admin_orders');

        try {
            const res = await fetch('database.php', { method: 'POST', body: fd });
            allOrders = await res.json();
            renderTable(allOrders);
            updateStats(allOrders);
        } catch (err) {
            console.error("Load Error:", err);
        }
    }

    function renderTable(orders) {
        tableBody.innerHTML = '';
        
        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No orders found.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            // UPDATED: Displays address under the customer name
            tr.innerHTML = `
                <td>#${order.id}</td>
                <td>
                    <strong>${order.customer_name}</strong><br>
                    <small style="color: #666;">${order.address || 'No Address'}</small>
                </td>
                <td>${order.items}</td>
                <td>₱${parseFloat(order.total).toFixed(2)}</td>
                <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
                <td>${order.fulfillment_type}</td>
                <td>${order.fulfillment_time}</td>
                <td>
                    <button class="action-btn done" onclick="updateStatus(${order.id}, 'Completed')">Done</button>
                    <button class="action-btn cancel" onclick="updateStatus(${order.id}, 'Cancelled')">Cancel</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // --- 2. UPDATE STATUS ---
    window.updateStatus = async (id, status) => {
        const fd = new FormData();
        fd.append('action', 'update_order_status');
        fd.append('order_id', id);
        fd.append('status', status);

        try {
            const res = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status === 'success') {
                loadOrders(); // Refresh table and stats automatically
            }
        } catch (err) {
            console.error("Update Error:", err);
        }
    };

    // --- 3. DASHBOARD STATS ---
    function updateStats(orders) {
        const totalOrders = orders.length;
        const pendingCount = orders.filter(o => o.status === 'Pending').length;
        const revenue = orders
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('pendingOrders').textContent = pendingCount;
        document.getElementById('totalRevenue').textContent = `₱${revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }

    // --- 4. SEARCH & FILTER LOGIC ---
    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = filterStatus.value;

        const filtered = allOrders.filter(order => {
            const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm) || 
                                 order.items.toLowerCase().includes(searchTerm) ||
                                 (order.address && order.address.toLowerCase().includes(searchTerm));
            const matchesStatus = statusValue === 'all' || order.status.toLowerCase() === statusValue;
            return matchesSearch && matchesStatus;
        });

        renderTable(filtered);
    };

    searchInput.addEventListener('input', applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    // --- 5. LOGOUT HANDLER ---
    window.handleLogout = async () => {
        const fd = new FormData();
        fd.append('action', 'logout');
        
        // Server-side session destruction
        await fetch('database.php', { method: 'POST', body: fd });
        
        // Client-side cleanup
        sessionStorage.clear();
        window.location.replace('login.html'); 
    };

    // Initial load
    loadOrders();
});