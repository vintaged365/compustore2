// ============================================================
// Admin Dashboard JS
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;
  fillTopbar(user);
  loadDashboard();
});

async function loadDashboard() {
  try {
    const data = await apiFetch('../php/reports.php?type=dashboard');

    // Stats
    document.getElementById('statSales').textContent     = formatMoney(data.totalSales);
    document.getElementById('statProducts').textContent  = data.totalProducts;
    document.getElementById('statLow').textContent       = `${data.lowStock} low, ${data.outOfStock} out of stock`;
    document.getElementById('statServices').textContent  = data.pendingServices;
    document.getElementById('statOrders').textContent    = data.monthlyOrders;
    document.getElementById('statCustomers').textContent = data.totalCustomers;

    // Recent services
    const stbody = document.getElementById('recentServicesTbody');
    if (data.recentServices.length === 0) {
      stbody.innerHTML = '<tr><td colspan="5" class="empty">No service requests yet</td></tr>';
    } else {
      stbody.innerHTML = data.recentServices.map(s => `
        <tr>
          <td><a href="services.html">${s.service_ref}</a></td>
          <td>${s.full_name || '—'}</td>
          <td>${s.device_type}</td>
          <td>${statusBadge(s.status)}</td>
          <td>${priorityBadge(s.priority)}</td>
        </tr>
      `).join('');
    }

    // Recent orders
    const otbody = document.getElementById('recentOrdersTbody');
    if (data.recentOrders.length === 0) {
      otbody.innerHTML = '<tr><td colspan="4" class="empty">No orders yet</td></tr>';
    } else {
      otbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td>#${o.order_id}</td>
          <td>${o.full_name || '—'}</td>
          <td>${formatMoney(o.total_amount)}</td>
          <td>${statusBadge(o.status)}</td>
        </tr>
      `).join('');
    }

    // Low stock
    const lstbody = document.getElementById('lowStockTbody');
    const lowData = await apiFetch('../php/reports.php?type=low_stock');
    if (lowData.length === 0) {
      lstbody.innerHTML = '<tr><td colspan="5" class="empty">All products are well stocked ✅</td></tr>';
    } else {
      lstbody.innerHTML = lowData.map(p => {
        const isOutOfStock = p.quantity_in_stock === 0;
        return `
            <tr>
              <td><strong>${p.product_name}</strong></td>
              <td>${p.sku}</td>
              <td>${p.category}</td>
              <td><strong class="${isOutOfStock ? 'text-danger' : 'text-warning'}">
                ${isOutOfStock ? 'OUT OF STOCK' : p.quantity_in_stock}
              </strong></td>
              <td>${p.reorder_level}</td>
            </tr>
        `;
      }).join('');
    }
  } catch (err) {
    showAlert('alertBox', 'Failed to load dashboard: ' + err.message);
  }
}