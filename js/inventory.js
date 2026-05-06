// ============================================================
// Inventory JS
// ============================================================
let allProducts = [], page = 1, perPage = 15;

document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;
  fillTopbar(user);
  loadCategories();
  loadProducts();

  const search = document.getElementById('searchInput');
  search.addEventListener('input', debounce(loadProducts, 300));
  document.getElementById('categoryFilter').addEventListener('change', loadProducts);
  document.getElementById('statusFilter').addEventListener('change', loadProducts);
});

async function loadCategories() {
  try {
    const cats = await apiFetch('../php/reports.php?type=categories');
    const sel = document.getElementById('categoryFilter');
    cats.forEach(c => sel.insertAdjacentHTML('beforeend', `<option>${c}</option>`));
  } catch { }
}

async function loadProducts() {
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;

  let url = `../php/products.php?`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (status) url += `status=${status}`;

  const tbody = document.getElementById('productsTbody');
  tbody.innerHTML = '<tr><td colspan="7"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>';

  try {
    allProducts = await apiFetch(url);
    renderPage();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Error: ${err.message}</td></tr>`;
  }
}

function renderPage() {
  const start = (page - 1) * perPage;
  const slice = allProducts.slice(start, start + perPage);
  const tbody = document.getElementById('productsTbody');

  if (slice.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">📦</div>No products found</div></td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = slice.map(p => {
    const stock = parseInt(p.quantity_in_stock) || 0;
    const reorder = parseInt(p.reorder_level) || 0;

    let statusClass = 'success';
    let statusLabel = 'In Stock';

    if (stock === 0) {
      statusClass = 'danger';
      statusLabel = 'Out of Stock';
    } else if (stock <= reorder) {
      statusClass = 'warning';
      statusLabel = 'Low Stock';
    }

    const price = Number(p.unit_price || 0).toLocaleString();

    return `
        <tr>
            <td><strong>${escapeHtml(p.product_name)}</strong></td>
            <td><code>${escapeHtml(p.sku)}</code></td>
            <td>${escapeHtml(p.category)}</td>
            <td>
                <strong style="color: var(--${statusClass})">${stock}</strong>
            </td>
            <td>${price}</td>
            <td>
                <span class="badge badge-${statusClass}">${statusLabel}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editProduct(${p.product_id})">Edit</button>
                <button class="btn btn-sm btn-danger" 
                        onclick="deleteProduct(${p.product_id}, '${escapeHtml(p.product_name.replace(/'/g, "\\'"))}')">
                    Delete
                </button>
            </td>
        </tr>
    `;
  }).join('');

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // Pagination
  const pages = Math.ceil(allProducts.length / perPage);
  let pag = `<span style="color:var(--muted);font-size:12px">${allProducts.length} products</span>`;
  for (let i = 1; i <= pages; i++) {
    pag += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline'}" onclick="goPage(${i})">${i}</button>`;
  }
  document.getElementById('pagination').innerHTML = pag;
}

function goPage(n) { page = n; renderPage(); }

function resetForm() {
  document.getElementById('modalTitle').textContent = 'Add Product';
  document.getElementById('saveProductBtn').textContent = 'Save Product';
  ['productId', 'productName', 'productSku', 'productPrice', 'productQty', 'productReorder', 'productDesc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('productCategory').value = '';
  document.getElementById('productSku').disabled = false;
  document.getElementById('modalAlert').classList.add('hidden');
}

function editProduct(id) {
  const p = allProducts.find(x => x.product_id == id);
  if (!p) return;
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('saveProductBtn').textContent = 'Update Product';
  document.getElementById('productId').value = p.product_id;
  document.getElementById('productName').value = p.product_name;
  document.getElementById('productSku').value = p.sku;
  document.getElementById('productSku').disabled = true;
  document.getElementById('productCategory').value = p.category;
  document.getElementById('productPrice').value = p.unit_price;
  document.getElementById('productQty').value = p.quantity_in_stock;
  document.getElementById('productReorder').value = p.reorder_level;
  document.getElementById('productDesc').value = p.description || '';
  document.getElementById('modalAlert').classList.add('hidden');
  openModal('productModal');
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const body = {
    product_id: id,
    product_name: document.getElementById('productName').value.trim(),
    sku: document.getElementById('productSku').value.trim(),
    category: document.getElementById('productCategory').value,
    unit_price: document.getElementById('productPrice').value,
    quantity_in_stock: document.getElementById('productQty').value || 0,
    reorder_level: document.getElementById('productReorder').value || 5,
    description: document.getElementById('productDesc').value.trim(),
  };

  if (!body.product_name || !body.sku || !body.category || !body.unit_price) {
    return showAlert('modalAlert', 'Please fill in all required fields');
  }

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;

  try {
    const method = id ? 'PUT' : 'POST';
    await apiFetch('../php/products.php', { method, body: JSON.stringify(body) });
    closeModal('productModal');
    showAlert('alertBox', id ? 'Product updated successfully' : 'Product added successfully', 'success');
    loadProducts();
  } catch (err) {
    showAlert('modalAlert', err.message);
  } finally {
    btn.disabled = false;
  }
}

function deleteProduct(id, name) {
  confirmAction(`Delete "${name}"? This cannot be undone.`, async () => {
    try {
      await apiFetch(`../php/products.php?id=${id}`, { method: 'DELETE' });
      showAlert('alertBox', 'Product deleted', 'success');
      loadProducts();
    } catch (err) {
      showAlert('alertBox', err.message);
    }
  });
}