# CompuStore HMS - Development Guide

This document outlines the architecture, coding standards, and workflows for the CompuStore Hardware & Service Management System.

## 🏗️ Architecture

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript. No external frameworks.
- **Backend**: PHP 7.4+ (Procedural/Functional API).
- **Database**: MySQL 5.7+.
- **Separation of Concerns**: Strictly maintain separation between structure (HTML), presentation (CSS), and behavior (JS).

## 🎨 Coding Standards

### HTML
- **No Inline CSS**: Never use the `style` attribute. Use utility classes defined in `css/style.css`.
- **No Inline JavaScript**: Never use `onclick`, `onsubmit`, etc. Attach event listeners in dedicated `.js` files.
- **Semantic Markup**: Use appropriate HTML5 tags (e.g., `<nav>`, `<main>`, `<section>`).

### CSS
- **Global Styles**: Defined in `css/style.css`.
- **Utility First**: Prefer using existing utility classes (e.g., `.mt-20`, `.flex-wrap-gap`, `.text-danger`) for layout and spacing.
- **Variables**: Use CSS variables defined in `:root` for colors, spacing, and shadows to maintain consistency.

### JavaScript
- **Event Delegation**: Use event delegation for dynamic elements (e.g., items in tables, product cards) to avoid memory leaks and ensure functionality for newly added items.
- **Utility Helpers**: Shared logic (API fetching, formatting, auth checks) should live in `js/utils.js`.
- **Module Pattern**: Organize page-specific logic in dedicated files within the `js/` directory.
- **DOM Content Loaded**: Always wrap initialization logic in `document.addEventListener('DOMContentLoaded', ... )`.

## 🛠️ Workflows

### API Requests
Always use the `apiFetch` helper from `js/utils.js` for backend communication. It handles error reporting and JSON parsing consistently.

```javascript
try {
  const data = await apiFetch('../php/endpoint.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  // Handle success
} catch (err) {
  showAlert('alertBox', err.message);
}
```

### Authentication
- Use `requireAuth()` at the start of page-specific JS to ensure the user is logged in.
- Use `bindLogout()` to attach logout functionality to `.logout-btn` elements.

### Adding New Features
1. **Database**: Update `database.sql` and apply changes to your local DB.
2. **Backend**: Create a new PHP script in `php/`.
3. **Frontend**: 
    - Add HTML structure to the appropriate dashboard folder.
    - Add logic to a new or existing JS file in `js/`.
    - Ensure all interactive elements have IDs or data attributes for event listeners.

## 📁 Directory Structure

- `css/`: Global and component-specific stylesheets.
- `customer/`: HTML templates for the customer portal.
- `includes/`: Backend utilities (DB connection, session helpers).
- `js/`: All frontend logic.
- `php/`: Backend API endpoints.
- `staff/`: HTML templates for the staff/admin portal.
