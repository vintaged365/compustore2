document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth(['customer', 'guest']);
  if (!user) return;
  fillTopbar(user);

  if (user.role === 'guest') {
    // Show pricing list for guests instead of empty history
    document.querySelector('.card-header h3').textContent = 'Available Services & Pricing';
    const newReqBtn = document.querySelector('.card-header .btn');
    if (newReqBtn) newReqBtn.classList.add('hidden');

    document.getElementById('servicesTbody').innerHTML = `
      <tr><td>SVC-001</td><td>Software Installation</td><td>OS, Office, Drivers, etc.</td><td>Normal</td><td><strong>KSh 1,500</strong></td><td>Fixed</td></tr>
      <tr><td>SVC-002</td><td>Hardware Repair</td><td>Screen, Keyboard, Port replacement</td><td>High</td><td><strong>KSh 3,000+</strong></td><td>Varies</td></tr>
      <tr><td>SVC-003</td><td>Maintenance</td><td>Cleaning, Thermal paste, Optimization</td><td>Normal</td><td><strong>KSh 2,000</strong></td><td>Fixed</td></tr>
      <tr><td>SVC-004</td><td>Data Recovery</td><td>Recovering deleted or lost files</td><td>High</td><td><strong>KSh 5,000+</strong></td><td>Varies</td></tr>
      <tr><td>SVC-005</td><td>Troubleshooting</td><td>Diagnostic fee (waived if repaired)</td><td>Any</td><td><strong>KSh 1,000</strong></td><td>Fixed</td></tr>
    `;
    return;
  }

  try {
    const services = await apiFetch(`../php/services.php?user_id=${user.id}`);
    document.getElementById('servicesTbody').innerHTML = services.length
      ? services.map(s => `
        <tr>
          <td>${s.service_ref}</td>
          <td>${s.device_type}</td>
          <td>${s.issue_description}</td>
          <td>${priorityBadge(s.priority)}</td>
          <td>${statusBadge(s.status)} <br><small class="text-muted">Payment: ${s.payment_status} ${s.mpesa_receipt ? `(${s.mpesa_receipt})` : ''}</small></td>
          <td>${formatDate(s.created_at)}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="empty">No service requests yet</td></tr>';
  } catch (err) {
    showAlert('alertBox', err.message);
  }
});
