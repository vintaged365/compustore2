// ============================================================
// CompuStore HMS — Shared Utilities
// ============================================================

// Format currency (KES)
function formatMoney(n) {
  return 'KSh ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

// Format date
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Status badge HTML
function statusBadge(status) {
  const map = {
    pending:        'warning',
    processing:     'info',
    completed:      'success',
    cancelled:      'danger',
    in_progress:    'info',
    awaiting_parts: 'muted',
    paid:           'success',
    refunded:       'danger',
    online:         'info',
    in_store:       'muted',
  };
  const cls  = map[status] || 'muted';
  const label = status ? status.replace(/_/g, ' ') : '—';
  return `<span class="badge badge-${cls}">${label}</span>`;
}

// Priority badge
function priorityBadge(p) {
  const cls = p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'success';
  return `<span class="badge badge-${cls}">${p || '—'}</span>`;
}

// Show / hide modal
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Show alert inside a container
function showAlert(containerId, msg, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Generic fetch wrapper
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Confirm dialog wrapper
function confirmAction(msg, onConfirm) {
  if (window.confirm(msg)) onConfirm();
}

// Set active nav link
function setActiveNav(page) {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
}

// Get session user from PHP session endpoint
async function getSessionUser() {
  try {
    const data = await apiFetch('../php/session.php');
    if (data.loggedIn) return data.user;
    
    // Check for guest mode
    const isGuest = sessionStorage.getItem('isGuest') === 'true' || 
                    new URLSearchParams(window.location.search).get('guest') === 'true';
    if (isGuest) {
      sessionStorage.setItem('isGuest', 'true');
      return { id: 0, name: 'Guest', role: 'guest' };
    }
    return null;
  } catch {
    return null;
  }
}

// Check auth and redirect if not logged in
async function requireAuth(allowedRoles = null) {
  const user = await getSessionUser();
  if (!user) { 
    // If not logged in at all, go to login
    window.location.href = '../index.html'; 
    return null; 
  }
  
  // If no specific roles required, just return user
  if (!allowedRoles) return user;

  // Convert single role to array
  if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];

  // Admin is always allowed
  if (user.role === 'admin') return user;

  // Check if user role is in allowed list
  if (allowedRoles.includes(user.role)) return user;

  // Special case: 'staff' allowedRoles includes manager and technician
  if (allowedRoles.includes('staff') && ['manager', 'technician'].includes(user.role)) {
    return user;
  }

  // If not authorized, redirect based on current role
  if (user.role === 'guest') {
    window.location.href = 'shop.html';
  } else {
    window.location.href = '../index.html';
  }
  return null;
}

// Handle UI for guests
function handleGuestUI(user) {
  if (user && user.role === 'guest') {
    // Hide private pages for guests in sidebar
    const restrictedPages = [
      'dashboard.html', 
      'my-orders.html', 
      'request-service.html'
    ];
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const href = link.getAttribute('href');
      if (restrictedPages.includes(href)) {
        link.classList.add('hidden');
      }
    });

    // Add a guest badge to the topbar
    const nameEl = document.getElementById('topbarName');
    if (nameEl && !nameEl.innerHTML.includes('badge-guest')) {
      nameEl.innerHTML = `${user.name} <span class="badge badge-info badge-guest fs-11" style="margin-left: 8px;">Guest Mode</span>`;
    }

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.innerHTML = '<span class="icon">LO</span> Exit Guest';
      // Re-bind click to handle guest session clearing
      const newBtn = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('isGuest');
        window.location.href = '../index.html';
      });
    }
  }
}

// Fill user info in topbar
function fillTopbar(user) {
  const nameEl = document.getElementById('topbarName');
  const avEl   = document.getElementById('topbarAvatar');
  if (nameEl) nameEl.textContent = user.name;
  if (avEl)   avEl.textContent   = user.name.substring(0, 2).toUpperCase();
  handleGuestUI(user);
}

// Logout button
function bindLogout() {
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '../php/logout.php';
    });
  });
}

// Debounce helper
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}