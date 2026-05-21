document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;
  fillTopbar(user);
  try {
    const services = await apiFetch(`../php/services.php?user_id=${user.id}`);
    document.getElementById('servicesTbody').innerHTML = services.length
      ? services.map(s => `<tr><td>${s.service_ref}</td><td>${s.device_type}</td><td>${s.issue_description}</td><td>${priorityBadge(s.priority)}</td><td>${statusBadge(s.status)}</td><td>${formatDate(s.created_at)}</td></tr>`).join('')
      : '<tr><td colspan="6" class="empty">No service requests yet</td></tr>';
  } catch (err) {
    showAlert('alertBox', err.message);
  }
});
