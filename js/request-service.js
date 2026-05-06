// ============================================================
// CompuStore HMS - Service Request Form
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  bindLogout();
  const user = await requireAuth();
  if (!user) return;

  fillTopbar(user);
  document.getElementById('serviceForm').addEventListener('submit', event => submitServiceRequest(event, user));
});

async function submitServiceRequest(event, user) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    user_id: user.id,
    device_type: formData.get('device_type'),
    device_brand: formData.get('device_brand'),
    issue_description: formData.get('issue_description'),
    priority: formData.get('priority'),
    estimated_cost: formData.get('estimated_cost') || null,
  };

  try {
    const result = await apiFetch('../php/services.php', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    showAlert('alertBox', `Service request ${result.service_ref} submitted`, 'success');
    event.target.reset();
  } catch (err) {
    showAlert('alertBox', err.message);
  }
}
