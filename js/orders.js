// ============================================================
// Orders JS
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;
  fillTopbar(user);
  loadOrders();

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) statusFilter.addEventListener('change', loadOrders);

  const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
  if (closeOrderModalBtn) {
    closeOrderModalBtn.addEventListener('click', () => closeModal('orderModal'));
  }

  // Event delegation for "Details" buttons
  document.getElementById('ordersTbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-order-btn')) {
        viewOrder(e.target.dataset.id);
    }
  });

  // Event delegation for modal footer buttons (Update Status)
  document.getElementById('orderModalFooter').addEventListener('click', (e) => {
    if (e.target.classList.contains('update-order-status-btn')) {
        updateOrderStatus(e.target.dataset.id);
    }
  });
});

async function loadOrders() {
  const statusFilter = document.getElementById('statusFilter');
  const status = statusFilter ? statusFilter.value : '';
  let url = '../php/orders.php?';
  if (status) url += `status=${status}`;
  const tbody = document.getElementById('ordersTbody');
  tbody.innerHTML = '<tr><td colspan="8"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';
  try {
    const orders = await apiFetch(url);
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="empty-icon">🛒</div>No orders found</div></td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${o.order_id}</strong></td>
        <td>${o.full_name || '—'}</td>
        <td>${statusBadge(o.order_type)}</td>
        <td><strong>${formatMoney(o.total_amount)}</strong></td>
        <td>${statusBadge(o.status)}</td>
        <td>${statusBadge(o.payment_status)}</td>
        <td>${formatDate(o.created_at)}</td>
        <td><button class="btn btn-sm btn-outline view-order-btn" data-id="${o.order_id}">Details</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">Error: ${err.message}</td></tr>`;
  }
}

async function viewOrder(id) {
  openModal('orderModal');
  document.getElementById('orderModalBody').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  document.getElementById('orderModalFooter').innerHTML = '';
  try {
    const o = await apiFetch(`../php/orders.php?id=${id}`);
    document.getElementById('orderModalTitle').textContent = `Order #${o.order_id}`;

    const itemRows = (o.items || []).map(i => `
      <tr>
        <td>${i.product_name}</td>
        <td>${i.quantity}</td>
        <td>${formatMoney(i.unit_price)}</td>
        <td><strong>${formatMoney(i.subtotal)}</strong></td>
      </tr>
    `).join('');

    const statusOptions = ['pending','processing','completed','cancelled'].map(v =>
      `<option value="${v}" ${o.status===v?'selected':''}>${v}</option>`
    ).join('');

    document.getElementById('orderModalBody').innerHTML = `
      <div class="grid-2 mb-16">
        <div>
          <p><strong>Customer:</strong> ${o.full_name || '—'}</p>
          <p><strong>Email:</strong> ${o.email || '—'}</p>
          <p><strong>Type:</strong> ${statusBadge(o.order_type)}</p>
          <p><strong>Date:</strong> ${formatDate(o.created_at)}</p>
        </div>
        <div>
          <p><strong>Status:</strong> ${statusBadge(o.status)}</p>
          <p><strong>Payment:</strong> ${statusBadge(o.payment_status)}</p>
          <p><strong>Total:</strong> <span class="text-primary-lg">${formatMoney(o.total_amount)}</span></p>
        </div>
      </div>
      <h4 class="mb-8">Items Ordered</h4>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Update Status</label>
          <select id="newOrderStatus">${statusOptions}</select>
        </div>
      </div>
    `;

    document.getElementById('orderModalFooter').innerHTML = `
      <button class="btn btn-outline" id="closeOrderModalBtn2">Close</button>
      <button class="btn btn-primary update-order-status-btn" data-id="${id}">Update Status</button>
    `;

    document.getElementById('closeOrderModalBtn2').addEventListener('click', () => closeModal('orderModal'));
  } catch (err) {
    document.getElementById('orderModalBody').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function updateOrderStatus(id) {
  const status = document.getElementById('newOrderStatus').value;
  try {
    await apiFetch('../php/orders.php', {
      method: 'PUT',
      body: JSON.stringify({ order_id: id, status })
    });
    closeModal('orderModal');
    showAlert('alertBox', 'Order status updated', 'success');
    loadOrders();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}