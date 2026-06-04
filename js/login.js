
let selectedRole = 'customer';

function selectRole(role, button) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');

  // If guest is selected, redirect immediately to the public shop view
  if (role === 'guest') {
    showAlert('Entering as guest...', 'success');
    setTimeout(() => {
      window.location.href = 'customer/shop.html?guest=true';
    }, 800);
  }
}

function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.classList.remove('hidden');
  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 3000);
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert('Please enter email and password', 'error');
    return;
  }

  try {
    const res = await fetch('php/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: selectedRole })
    });
    const data = await res.json();

    if (data.success) {
      showAlert('Login successful!', 'success');
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect || data.redirect;
      }, 1000);
    } else {
      showAlert(data.error || data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showAlert('Network error: ' + err.message, 'error');
  }
}

function showRegister() {
    document.getElementById('registerModal').classList.remove('hidden');
    document.getElementById('registerMessage').textContent = ''; // Clear previous messages
    document.getElementById('registerForm').reset(); // Reset form fields
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.add('hidden');
    document.getElementById('registerForm').reset();
}

// Close modal when clicking outside the content
window.onclick = function(event) {
    const modal = document.getElementById('registerModal');
    if (event.target === modal) {
        closeRegisterModal();
    }
};

// Handle registration form submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const messageEl = document.getElementById('registerMessage');
    messageEl.className = 'text-info';
    messageEl.textContent = 'Creating your account...';

    // Get values from registration form with correct IDs
    const data = {
        fullName: document.getElementById('regFullName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value.trim(),
        phone: document.getElementById('regPhone').value.trim(),
        address: document.getElementById('regAddress').value.trim()
    };

    // Validate required fields
    if (!data.fullName || !data.email || !data.password) {
        messageEl.className = 'text-danger';
        messageEl.textContent = 'Please fill in all required fields';
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        messageEl.className = 'text-danger';
        messageEl.textContent = 'Please enter a valid email address';
        return;
    }

    // Validate password length
    if (data.password.length < 6) {
        messageEl.className = 'text-danger';
        messageEl.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const response = await fetch('php/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const text = await response.text();

        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            messageEl.className = 'text-danger';
            messageEl.textContent = 'Server error: Invalid response format';
            return;
        }

        if (result.success) {
            messageEl.className = 'text-success';
            messageEl.textContent = result.message || 'Account created successfully! You can now log in.';
            
            // Clear and close modal after 2 seconds
            setTimeout(() => {
                closeRegisterModal();
                showAlert('Account created! Please log in.', 'success');
            }, 2000);
        } else {
            messageEl.className = 'text-danger';
            messageEl.textContent = result.error || 'Registration failed. Please try again.';
        }
    } catch (err) {
        messageEl.className = 'text-danger';
        messageEl.textContent = `Error: ${err.message}`;
    }
});

function dashboardForRole(role) {
  if (role === 'admin') return 'admin/dashboard.html';
  if (['staff', 'manager', 'technician'].includes(role)) return 'staff/dashboard.html';
  return 'customer/dashboard.html';
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => selectRole(btn.dataset.role, btn));
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const showRegisterBtn = document.getElementById('showRegisterBtn');
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showRegister();
    });
  }

  const closeRegisterBtn = document.getElementById('closeRegisterBtn');
  if (closeRegisterBtn) {
    closeRegisterBtn.addEventListener('click', closeRegisterModal);
  }

  fetch('php/session.php')
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) {
        window.location.href = dashboardForRole(data.user.role);
      }
    })
    .catch(err => {
      // Session check failed, user stays on login page
    });
});