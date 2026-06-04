// ============================================================
// Customer Dashboard JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth('customer');
  if (!user) return;

  fillTopbar(user);
  loadCustomerDashboard(user.id);
});

async function loadCustomerDashboard(userId) {
  try {
    const [orders, services] = await Promise.all([
      apiFetch(`../php/orders.php?user_id=${encodeURIComponent(userId)}`),
      apiFetch(`../php/services.php?user_id=${encodeURIComponent(userId)}`)
    ]);

    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statServices').textContent = services.filter(s => !['completed', 'cancelled'].includes(s.status)).length;

    const ordersTbody = document.getElementById('recentOrdersTbody');
    ordersTbody.innerHTML = orders.length
      ? orders.slice(0, 5).map(o => `
          <tr>
            <td>#${o.order_id}</td>
            <td>${formatMoney(o.total_amount)}</td>
            <td>${statusBadge(o.status)}</td>
            <td>${formatDate(o.created_at)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" class="empty">No orders yet</td></tr>';

    const servicesTbody = document.getElementById('recentServicesTbody');
    servicesTbody.innerHTML = services.length
      ? services.slice(0, 5).map(s => `
          <tr>
            <td>${s.service_ref}</td>
            <td>${s.device_type}</td>
            <td>${statusBadge(s.status)}</td>
            <td>${formatDate(s.created_at)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" class="empty">No service requests yet</td></tr>';
  } catch (err) {
    showAlert('alertBox', 'Failed to load account dashboard: ' + err.message);
  }
}
