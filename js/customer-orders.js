document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;
  fillTopbar(user);
  try {
    const orders = await apiFetch(`../php/orders.php?user_id=${user.id}`);
    document.getElementById('ordersTbody').innerHTML = orders.length
      ? orders.map(o => `<tr><td>#${o.order_id}</td><td>${formatMoney(o.total_amount)}</td><td>${statusBadge(o.status)}</td><td>${statusBadge(o.payment_status)}</td><td>${formatDate(o.created_at)}</td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">No orders yet</td></tr>';
  } catch (err) {
    showAlert('alertBox', err.message);
  }
});
