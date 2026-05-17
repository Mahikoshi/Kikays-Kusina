document.addEventListener('DOMContentLoaded', () => {
    const tableBody    = document.getElementById('ordersTableBody');
    const searchInput  = document.getElementById('searchOrders');
    const filterStatus = document.getElementById('filterStatus');

    let allOrders = [];

    // ── FORMAT HELPERS ────────────────────────────────────────
    function fmtDate(raw) {
        if (!raw) return '<span class="td-muted">—</span>';
        const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    }

    function fmtMethod(m) {
        if (!m) return '—';
        return m.toLowerCase() === 'gcash'
            ? '<span class="pay-badge gcash">📱 GCash</span>'
            : '<span class="pay-badge cod">💵 COD</span>';
    }

    function fmtType(t) {
        if (!t) return '—';
        return t.toLowerCase() === 'delivery'
            ? '<span class="type-badge delivery">🛵 Delivery</span>'
            : '<span class="type-badge pickup">🏪 Pickup</span>';
    }

    // ── 1. LOAD ORDERS ────────────────────────────────────────
    async function loadOrders() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-row">
                    <div class="spinner"></div> Loading orders…
                </td>
            </tr>`;

        const fd = new FormData();
        fd.append('action', 'get_admin_orders');

        try {
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (_) {
                tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">⚠️ Server returned unexpected data. Check PHP logs.</td></tr>`;
                return;
            }

            if (!Array.isArray(json)) {
                tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">⚠️ ${json.message || 'Failed to load orders.'}</td></tr>`;
                return;
            }

            allOrders = json;
            renderTable(allOrders);
            updateStats(allOrders);
        } catch (err) {
            console.error("Load Error:", err);
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">⚠️ Could not reach server.</td></tr>`;
        }
    }

    // ── 2. RENDER TABLE ───────────────────────────────────────
    function renderTable(orders) {
        tableBody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">No orders found.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const statusClass = (order.status || 'pending').toLowerCase();

            // address comes from addresses.full_address aliased as "address" in the JOIN
            const addressHtml = order.address
                ? `<div class="td-address">📍 ${escapeHtml(order.address)}</div>`
                : `<div class="td-address td-muted">No address / Pickup</div>`;

            // items comes as GROUP_CONCAT: "2x Lechon Kawali, 1x Halo-Halo"
            const itemChips = (order.items || '—').split(',')
                .map(i => `<span class="item-chip">${escapeHtml(i.trim())}</span>`)
                .join('');

            // total is aliased from total_amount in the PHP query
            const displayTotal = parseFloat(order.total || 0).toFixed(2);

            const tr = document.createElement('tr');
            tr.className  = `order-row ${statusClass}`;
            tr.dataset.id = order.id;

            tr.innerHTML = `
                <td class="td-id">#${order.id}</td>

                <td class="td-customer">
                    <div class="customer-name">${escapeHtml(order.customer_name || 'Unknown')}</div>
                    <div class="td-sub">${escapeHtml(order.customer_email || '')}</div>
                    <div class="td-sub">${escapeHtml(order.customer_phone || '')}</div>
                    ${addressHtml}
                </td>

                <td class="td-items">
                    <div class="items-chips">${itemChips}</div>
                </td>

                <td class="td-total">
                    <span class="total-amount">₱${displayTotal}</span>
                    <div>${fmtMethod(order.method)}</div>
                </td>

                <td class="td-status-cell">
                    <span class="status-badge ${statusClass}">${escapeHtml(order.status)}</span>
                </td>

                <td>${fmtType(order.fulfillment_type)}</td>

                <td class="td-schedule">
                    <div class="schedule-time">${fmtDate(order.fulfillment_time)}</div>
                    <div class="td-sub ordered-label">Placed: ${fmtDate(order.created_at)}</div>
                </td>

                <td class="td-actions">
                    ${buildActionHtml(statusClass, order.id)}
                </td>
            `;

            const doneBtn   = tr.querySelector('.action-btn.done');
            const cancelBtn = tr.querySelector('.action-btn.cancel');
            if (doneBtn)   doneBtn.addEventListener('click',   () => updateStatusInline(tr, order.id, 'Completed'));
            if (cancelBtn) cancelBtn.addEventListener('click', () => updateStatusInline(tr, order.id, 'Cancelled'));

            tableBody.appendChild(tr);
        });
    }

    function buildActionHtml(statusClass, id) {
        if (statusClass === 'pending') {
            return `
                <button class="action-btn done">✓ Done</button>
                <button class="action-btn cancel">✕ Cancel</button>
            `;
        }
        const labels = {
            completed: '✅ Completed',
            cancelled: '❌ Cancelled',
            received:  '🎉 Received'
        };
        return `<span class="final-status-label ${statusClass}">${labels[statusClass] || statusClass}</span>`;
    }

    // ── 3. INLINE STATUS UPDATE ───────────────────────────────
    async function updateStatusInline(tr, orderId, newStatus) {
        const actionsCell = tr.querySelector('.td-actions');
        const statusCell  = tr.querySelector('.td-status-cell');

        actionsCell.innerHTML = '<span class="saving-label">Saving…</span>';

        const fd = new FormData();
        fd.append('action',   'update_order_status');
        fd.append('order_id', orderId);
        fd.append('status',   newStatus);

        try {
            const res  = await fetch('database.php', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.status === 'success') {
                const newClass = newStatus.toLowerCase();
                tr.className = `order-row ${newClass}`;

                if (statusCell) {
                    statusCell.innerHTML = `<span class="status-badge ${newClass}">${newStatus}</span>`;
                }
                actionsCell.innerHTML = buildActionHtml(newClass, orderId);

                const idx = allOrders.findIndex(o => o.id == orderId);
                if (idx > -1) allOrders[idx].status = newStatus;

                updateStats(allOrders);
            } else {
                alert("Error: " + (data.message || "Unknown error"));
                actionsCell.innerHTML = buildActionHtml('pending', orderId);
                rebindActionButtons(tr, orderId);
            }
        } catch (err) {
            console.error("Update Error:", err);
            actionsCell.innerHTML = '<span class="saving-label error-label">⚠️ Failed</span>';
            setTimeout(() => {
                actionsCell.innerHTML = buildActionHtml('pending', orderId);
                rebindActionButtons(tr, orderId);
            }, 2000);
        }
    }

    function rebindActionButtons(tr, orderId) {
        const doneBtn   = tr.querySelector('.action-btn.done');
        const cancelBtn = tr.querySelector('.action-btn.cancel');
        if (doneBtn)   doneBtn.addEventListener('click',   () => updateStatusInline(tr, orderId, 'Completed'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => updateStatusInline(tr, orderId, 'Cancelled'));
    }

    // ── 4. STATS ──────────────────────────────────────────────
    function updateStats(orders) {
        const total     = orders.length;
        const pending   = orders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
        const completed = orders.filter(o => (o.status || '').toLowerCase() === 'completed').length;
        const cancelled = orders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length;

        // Revenue = sum of total_amount for completed orders (aliased as "total" in the query)
        const revenue = orders
            .filter(o => (o.status || '').toLowerCase() === 'completed')
            .reduce((s, o) => s + parseFloat(o.total || 0), 0);

        document.getElementById('totalOrders').textContent     = total;
        document.getElementById('pendingOrders').textContent   = pending;
        document.getElementById('completedOrders').textContent = completed;
        document.getElementById('cancelledOrders').textContent = cancelled;
        document.getElementById('totalRevenue').textContent    =
            `₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // ── 5. SEARCH & FILTER ────────────────────────────────────
    const applyFilters = () => {
        const term        = searchInput.value.toLowerCase();
        const statusValue = filterStatus.value;

        const filtered = allOrders.filter(o => {
            const haystack = [
                o.customer_name, o.customer_email, o.customer_phone,
                o.items, o.address, String(o.id)
            ].join(' ').toLowerCase();
            const matchSearch = !term || haystack.includes(term);
            const matchStatus = statusValue === 'all' || (o.status || '').toLowerCase() === statusValue;
            return matchSearch && matchStatus;
        });
        renderTable(filtered);
    };

    searchInput.addEventListener('input',   applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    // ── 6. AUTO-REFRESH every 30 s ───────────────────────────
    setInterval(loadOrders, 30000);

    // ── 7. LOGOUT ─────────────────────────────────────────────
    window.handleLogout = async () => {
        const fd = new FormData();
        fd.append('action', 'logout');
        try {
            await fetch('database.php', { method: 'POST', body: fd });
        } catch (_) { /* still clear local state */ }
        sessionStorage.clear();
        window.location.replace('login.html');
    };

    // ── HELPER ────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    loadOrders();
});