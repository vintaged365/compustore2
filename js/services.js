// ============================================================
// Service Requests JS
// ============================================================
let currentView = 'kanban';
let allServices = [];
let currentUser = null;
let staffList   = [];

document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  currentUser = await requireAuth('staff');
  if (!currentUser) return;
  fillTopbar(currentUser);
  staffList = await apiFetch('../php/reports.php?type=staff').catch(() => []);
  loadServices();

  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) filterStatus.addEventListener('change', loadServices);

  const viewKanbanBtn = document.getElementById('viewKanban');
  if (viewKanbanBtn) viewKanbanBtn.addEventListener('click', () => setView('kanban'));

  const viewTableBtn = document.getElementById('viewTable');
  if (viewTableBtn) viewTableBtn.addEventListener('click', () => setView('table'));

  const closeServiceModalBtn = document.getElementById('closeServiceModalBtn');
  if (closeServiceModalBtn) {
    closeServiceModalBtn.addEventListener('click', () => closeModal('serviceModal'));
  }

  // Event delegation for Kanban cards
  document.getElementById('kanbanView').addEventListener('click', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) {
        viewService(card.dataset.id);
    }
  });

  // Event delegation for Table view buttons
  document.getElementById('servicesTbody').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-service-btn')) {
        viewService(e.target.dataset.id);
    }
  });

  // Event delegation for modal footer
  document.getElementById('serviceModalFooter').addEventListener('click', (e) => {
    if (e.target.classList.contains('update-service-btn')) {
        updateService(e.target.dataset.id);
    }
    if (e.target.classList.contains('complete-service-btn')) {
        completeService(e.target.dataset.id);
    }
    if (e.target.classList.contains('close-service-modal-btn')) {
        closeModal('serviceModal');
    }
  });
});

function setView(v) {
  currentView = v;
  document.getElementById('kanbanView').classList.toggle('hidden', v !== 'kanban');
  document.getElementById('tableView').classList.toggle('hidden', v !== 'table');
  document.getElementById('viewKanban').className = `btn ${v==='kanban'?'btn-primary':'btn-outline'}`;
  document.getElementById('viewTable').className  = `btn ${v==='table' ?'btn-primary':'btn-outline'}`;
  renderServices();
}

async function loadServices() {
  const status = document.getElementById('filterStatus')?.value || '';
  let url = '../php/services.php?';
  if (status) url += `status=${status}&`;

  try {
    allServices = await apiFetch(url);
    renderServices();
  } catch (err) {
    showAlert('alertBox', 'Failed to load services: ' + err.message);
  }
}

function renderServices() {
  if (currentView === 'kanban') renderKanban();
  else renderTable();
}

function renderKanban() {
  const cols = ['pending','in_progress','awaiting_parts','completed'];
  cols.forEach(col => {
    const items = allServices.filter(s => s.status === col);
    document.getElementById(`cnt-${col}`).textContent = items.length;
    const el = document.getElementById(`col-${col}`);
    if (!el) return;
    el.innerHTML = items.length === 0
      ? `<div class="empty p-16 fs-12">No requests</div>`
      : items.map(s => `
          <div class="kanban-card" data-id="${s.service_id}">
            <div class="kanban-card-id">${s.service_ref}</div>
            <div class="kanban-card-title">${s.device_type}${s.device_brand ? ' · ' + s.device_brand : ''}</div>
            <div class="kanban-card-meta">${s.customer_name || '—'}</div>
            <div class="kanban-card-foot">
              ${priorityBadge(s.priority)}
              <span class="fs-11 muted">${s.technician_name || 'Unassigned'}</span>
            </div>
          </div>
        `).join('');
  });
}

function renderTable() {
  const tbody = document.getElementById('servicesTbody');
  if (allServices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty"><div class="empty-icon">🔧</div>No service requests</div></td></tr>';
    return;
  }
  tbody.innerHTML = allServices.map(s => `
    <tr>
      <td>${s.service_ref}</td>
      <td>${s.customer_name || '—'}</td>
      <td>${s.device_type}</td>
      <td class="ellipsis-200">${s.issue_description}</td>
      <td>${priorityBadge(s.priority)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${s.technician_name || '<span class="muted">Unassigned</span>'}</td>
      <td>${formatDate(s.created_at)}</td>
      <td><button class="btn btn-sm btn-outline view-service-btn" data-id="${s.service_id}">View</button></td>
    </tr>
  `).join('');
}

async function viewService(id) {
  openModal('serviceModal');
  document.getElementById('serviceModalBody').innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  document.getElementById('serviceModalFooter').innerHTML = '';

  try {
    const s = await apiFetch(`../php/services.php?id=${id}`);
    document.getElementById('serviceModalTitle').textContent = `${s.service_ref} — ${s.device_type}`;

    const staffOptions = staffList.map(st =>
      `<option value="${st.staff_id}" ${s.assigned_to==st.staff_id?'selected':''}>${st.full_name} (${st.role})</option>`
    ).join('');

    const statusOptions = ['pending','in_progress','awaiting_parts','completed','cancelled'].map(v =>
      `<option value="${v}" ${s.status===v?'selected':''}>${v.replace(/_/g,' ')}</option>`
    ).join('');

    const historyRows = s.history?.length
      ? s.history.map(h => `
          <tr>
            <td>${formatDate(h.created_at)}</td>
            <td>${h.action.replace(/_/g,' ')}</td>
            <td>${h.notes || '—'}</td>
            <td>${h.by_name || 'System'}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="empty">No history yet</td></tr>';

    document.getElementById('serviceModalBody').innerHTML = `
      <div class="grid-2 mb-16">
        <div>
          <p><strong>Customer:</strong> ${s.customer_name}</p>
          <p><strong>Phone:</strong> ${s.customer_phone || '—'}</p>
          <p><strong>Device:</strong> ${s.device_type} ${s.device_brand ? '('+s.device_brand+')' : ''}</p>
          <p class="mt-8"><strong>Issue:</strong><br>${s.issue_description}</p>
        </div>
        <div>
          <p><strong>Priority:</strong> ${priorityBadge(s.priority)}</p>
          <p><strong>Status:</strong> ${statusBadge(s.status)}</p>
          <p><strong>Payment:</strong> ${statusBadge(s.payment_status)} ${s.mpesa_receipt ? `<small class="text-muted">(${s.mpesa_receipt})</small>` : ''}</p>
          <p><strong>Created:</strong> ${formatDate(s.created_at)}</p>
          <p><strong>Est. Cost:</strong> ${s.estimated_cost ? formatMoney(s.estimated_cost) : '—'}</p>
          <p><strong>Final Cost:</strong> ${s.final_cost ? formatMoney(s.final_cost) : '—'}</p>
        </div>
      </div>

      <div class="form-row mb-12">
        <div class="form-group">
          <label>Update Status</label>
          <select id="newStatus">${statusOptions}</select>
        </div>
        <div class="form-group">
          <label>Assign Technician</label>
          <select id="assignTech"><option value="">— Unassigned —</option>${staffOptions}</select>
        </div>
      </div>
      <div class="form-row mb-16">
        <div class="form-group">
          <label>Notes</label>
          <input type="text" id="svcNotes" placeholder="Optional notes…">
        </div>
        <div class="form-group">
          <label>Final Cost (KSh)</label>
          <input type="number" id="finalCost" placeholder="0.00" value="${s.final_cost || ''}">
        </div>
      </div>

      <h4 class="mb-8">Activity History</h4>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Action</th><th>Notes</th><th>By</th></tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>
    `;

    document.getElementById('serviceModalFooter').innerHTML = `
      <button class="btn btn-outline close-service-modal-btn">Close</button>
      <button class="btn btn-primary update-service-btn" data-id="${id}">Update</button>
      ${s.status !== 'completed' ? `<button class="btn btn-success complete-service-btn" data-id="${id}">Mark Complete</button>` : ''}
    `;
  } catch (err) {
    document.getElementById('serviceModalBody').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function updateService(id) {
  const status   = document.getElementById('newStatus').value;
  const assignTo = document.getElementById('assignTech').value;
  const notes    = document.getElementById('svcNotes').value;

  try {
    if (assignTo) {
      await apiFetch('../php/services.php', {
        method: 'PUT',
        body: JSON.stringify({ service_id: id, action: 'assign', assigned_to: assignTo, by_id: currentUser.id })
      });
    }
    await apiFetch('../php/services.php', {
      method: 'PUT',
      body: JSON.stringify({ service_id: id, action: 'status', status, notes, by_id: currentUser.id })
    });
    closeModal('serviceModal');
    showAlert('alertBox', 'Service request updated', 'success');
    loadServices();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}

async function completeService(id) {
  const finalCost = document.getElementById('finalCost').value;
  const notes     = document.getElementById('svcNotes').value;
  try {
    await apiFetch('../php/services.php', {
      method: 'PUT',
      body: JSON.stringify({ service_id: id, action: 'complete', final_cost: finalCost, notes, by_id: currentUser.id })
    });
    closeModal('serviceModal');
    showAlert('alertBox', 'Service marked as complete', 'success');
    loadServices();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}