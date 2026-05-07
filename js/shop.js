// ============================================================
// CompuStore HMS — Shopping Cart & Shop
// ============================================================

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];

// ── Load products from API ─────────────────────────────────
async function loadProducts() {
  try {
    products = await apiFetch('../php/products.php');
  } catch (err) {
    console.error('Failed to load products:', err);
    products = [];
  }
  renderProducts();
}

// ── Render product cards into #productsContainer ───────────
function renderProducts() {
  const container = document.getElementById('productsContainer');
  if (!container) return;

  if (!products.length) {
    container.innerHTML = '<div class="empty">No products available</div>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card">

      <h3>${p.product_name}</h3>
      <p class="price">${formatMoney(p.unit_price)}</p>
      <button
        onclick="addToCart(${p.product_id}, '${p.product_name.replace(/'/g, "\\'")}', ${p.unit_price})"
        class="btn btn-primary btn-sm">
        Add to Cart
      </button>
    </div>
  `).join('');
}

// ── Add item to cart ───────────────────────────────────────
function addToCart(id, name, price) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  saveCart();
  showAlert('alertBox', `"${name}" added to cart ✓`, 'success');
}

// ── Remove one item from cart ──────────────────────────────
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();           // refresh the modal
}

// ── Update quantity of a cart item ────────────────────────
function updateQuantity(id, qty) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, Number(qty));
  }
  saveCart();
  renderCart();           // refresh total
}

// ── Clear all cart items ───────────────────────────────────
function clearCart() {
  if (!cart.length) return;
  if (!confirm('Clear all items from your cart?')) return;
  cart = [];
  saveCart();
  renderCart();
}

// ── Render cart items into #cartItems (modal) ──────────────
function renderCart() {
  const container = document.getElementById('cartItems');
  const totalRow = document.getElementById('cartTotalRow');
  const totalAmt = document.getElementById('cartTotalAmt');

  if (!container) return;   // modal not present on this page

  if (!cart.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Your cart is empty.</p>
        <p>Add products from the list below.</p>
      </div>`;
    if (totalRow) totalRow.classList.add('hidden');
    return;
  }

  // Build line items
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-name">${item.name}</span>
      <span class="cart-item-price">${formatMoney(item.price)}</span>
      <input
        class="cart-item-qty"
        type="number"
        value="${item.quantity}"
        min="1"
        onchange="updateQuantity(${item.id}, this.value)">
      <button
        class="btn btn-danger btn-sm"
        onclick="removeFromCart(${item.id})">
        Remove
      </button>
    </div>
  `).join('');

  // Running total
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (totalRow) totalRow.classList.remove('hidden');
  if (totalAmt) totalAmt.textContent = formatMoney(total);
}

// ── Open cart modal ────────────────────────────────────────
function openCartModal() {
  renderCart();                         // always refresh before showing
  const overlay = document.getElementById('cartModal');
  if (overlay) overlay.classList.remove('hidden');
}

// ── Close cart modal ───────────────────────────────────────
function closeCartModal() {
  const overlay = document.getElementById('cartModal');
  if (overlay) overlay.classList.add('hidden');
}

// Close modal when clicking the dark overlay behind it
document.addEventListener('click', function (e) {
  const overlay = document.getElementById('cartModal');
  if (overlay && e.target === overlay) {
    closeCartModal();
  }
});

// ── Checkout — opens M-Pesa phone modal ───────────────────
async function checkout() {
  if (!cart.length) {
    showAlert('alertBox', 'Your cart is empty', 'error');
    return;
  }

  const user = await getSessionUser();
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  // Show the M-Pesa phone number modal
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  openMpesaModal(total);
}

// ── Open M-Pesa payment modal ──────────────────────────────
function openMpesaModal(total) {
  const existing = document.getElementById('mpesaModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'mpesaModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h3>💚 Pay with M-Pesa</h3>
        <button class="modal-close" onclick="closeMpesaModal()">✕</button>
      </div>
      <div class="modal-body">
        <div id="mpesaAlertBox" class="alert hidden"></div>
        <p style="margin-bottom:12px;color:var(--muted,#64748b);font-size:13px;">
          You will receive an STK push prompt on your phone. Enter your M-Pesa PIN to complete payment.
        </p>
        <div class="form-group">
          <label class="form-label">Amount</label>
          <input class="form-input" type="text" value="${formatMoney(total)}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">M-Pesa Phone Number <span style="color:red">*</span></label>
          <input class="form-input" type="tel" id="mpesaPhone"
            placeholder="e.g. 0712345678 or 254712345678"
            autocomplete="tel">
        </div>
        <p style="font-size:11px;color:var(--muted,#94a3b8);margin-top:4px;">
          Sandbox test number: <strong>254708374149</strong>
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeMpesaModal()">Cancel</button>
        <button class="btn btn-primary" id="mpesaPayBtn" onclick="submitMpesaPayment(${total})">
          💚 Pay ${formatMoney(total)}
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Pre-fill phone from session if available
  getSessionUser().then(u => {
    if (u && u.phone) {
      const inp = document.getElementById('mpesaPhone');
      if (inp) inp.value = u.phone;
    }
  });
}

function closeMpesaModal() {
  const m = document.getElementById('mpesaModal');
  if (m) m.remove();
}

// ── Submit M-Pesa STK push ─────────────────────────────────
async function submitMpesaPayment(total) {
  const phoneInput = document.getElementById('mpesaPhone');
  const payBtn     = document.getElementById('mpesaPayBtn');
  const phone      = (phoneInput ? phoneInput.value : '').trim();

  if (!phone) {
    showAlert('mpesaAlertBox', 'Please enter your M-Pesa phone number', 'error');
    return;
  }

  const user = await getSessionUser();
  if (!user) { window.location.href = '../index.html'; return; }

  payBtn.disabled = true;
  payBtn.textContent = 'Placing order…';

  let orderId;
  try {
    // Step 1: Create the order first
    const orderResult = await apiFetch('../php/orders.php', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        order_type: 'online',
        items: cart.map(i => ({ product_id: i.id, quantity: i.quantity }))
      })
    });
    orderId = orderResult.order_id;

    payBtn.textContent = 'Sending STK push…';

    // Step 2: Trigger M-Pesa STK push for the order
    const mpesaResult = await apiFetch('../php/mpesa.php?action=stk_push', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        amount: total,
        reference_id:   orderId,
        reference_type: 'order'
      })
    });

    // Step 3: Success — clear cart, close modals, poll for payment confirmation
    cart = [];
    saveCart();
    renderCart();
    closeMpesaModal();
    closeCartModal();

    showAlert('alertBox',
      `✅ Order #${orderId} placed! STK push sent to ${phone}. Enter your M-Pesa PIN to confirm payment.`,
      'success'
    );

    // Poll payment status every 4 s for up to 60 s
    pollPaymentStatus(mpesaResult.CheckoutRequestID, orderId);

  } catch (err) {
    showAlert('mpesaAlertBox', err.message || 'Payment initiation failed. Please try again.', 'error');
    payBtn.disabled = false;
    payBtn.textContent = `💚 Pay ${formatMoney(total)}`;
  }
}

// ── Poll payment status after STK push ────────────────────
function pollPaymentStatus(checkoutRequestId, orderId) {
  let attempts = 0;
  const maxAttempts = 15;   // 15 × 4 s = 60 s

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await apiFetch(
        `../php/mpesa.php?action=status&checkout_id=${encodeURIComponent(checkoutRequestId)}`
      );

      // ResultCode 0 = paid, 1032 = cancelled by user, 17 = user declined
      const code = res.ResultCode !== undefined ? Number(res.ResultCode) : null;

      if (code === 0) {
        clearInterval(interval);
        showAlert('alertBox',
          `✅ Payment confirmed for Order #${orderId}! M-Pesa receipt: ${res.mpesa_receipt || 'processing…'}`,
          'success'
        );
        // Reload dashboard data to reflect new payment_status
        const user = await getSessionUser();
        if (user) loadCustomerDashboard(user.id);
        return;
      }

      if (code === 1032 || code === 17) {
        clearInterval(interval);
        showAlert('alertBox',
          `⚠️ M-Pesa payment for Order #${orderId} was cancelled. You can retry from My Orders.`,
          'error'
        );
        return;
      }
    } catch (_) { /* network blip — keep polling */ }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      showAlert('alertBox',
        `⏳ Payment for Order #${orderId} is still processing. Check My Orders for the latest status.`,
        'error'
      );
    }
  }, 4000);
}

// ── Persist cart to localStorage ───────────────────────────
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

// ── Update the badge on the Cart button ───────────────────
function updateCartCount() {
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = total;
}

// ── Initialise on DOMContentLoaded ────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();

  const user = await requireAuth();
  if (!user) return;

  fillTopbar(user);
  loadProducts();
  updateCartCount();   // show correct badge count on page load
});