# CompuStore HMS - Hardware & Service Management System

A complete web-based management system for a computer hardware store with staff management and service request handling.

## 📁 Project Structure

```
claude/
├── index.html                 # Main login page
├── database.sql              # Database schema (import this first!)
├── php/                      # Backend API
│   ├── login.php            # User authentication
│   ├── register.php         # User registration
│   ├── logout.php           # Session termination
│   ├── session.php          # Check login status
│   ├── products.php         # Product CRUD & listing
│   ├── orders.php           # Order management
│   ├── services.php         # Service requests
│   ├── reports.php          # Dashboard analytics
├── includes/                # Backend utilities
│   └── db.php               # Database connection
├── css/                      # Stylesheets
│   ├── style.css            # Main styles
│   └── login.css            # Login page styles
├── js/                       # Frontend logic
│   ├── utils.js             # Shared utilities
│   ├── login.js             # Login form logic
│   ├── dashboard.js         # Dashboard functionality
│   ├── inventory.js         # Product inventory
│   ├── orders.js            # Order management
│   ├── services.js          # Service management
│   ├── shop.js              # Customer shopping
│   └── request-service.js   # Service request form
├── admin/                    # Admin dashboards
│   └── dashboard.html       # Admin panel
├── staff/                    # Staff dashboards
│   └── dashboard.html       # Staff panel
└── customer/                 # Customer area
    └── dashboard.html       # Customer dashboard
```

## 🚀 Quick Start

### 1. Set Up Database

- Import `database.sql` into MySQL
- Update credentials in `includes/db.php` if needed

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');  // Your MySQL password
define('DB_NAME', 'compustore_hms');
```

### 2. Start a Local Server

**PHP Built-in Server:**
```bash
cd claude
php -S localhost:8000
```

**Apache/Xampp:**
- Copy to `htdocs` folder
- Visit `http://localhost/claude/`

### 3. Demo Credentials

After importing the database, use these to login:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password |
| Staff | staff@test.com | password |
| Customer | customer@test.com | password |

*(Update these in the database after first login)*

## 📊 Features

### Admin Dashboard
- View overall statistics (sales, products, orders)
- Manage inventory (add/edit/delete products)
- Monitor service requests
- View customer orders
- Generate reports

### Staff Dashboard
- View assigned service requests
- Update service status
- Manage repairs and maintenance
- Track completion status

### Customer Area
- Browse and purchase products
- View order history
- Request hardware services
- Track service requests

## 🔧 API Endpoints

### Authentication
- `POST /php/login.php` - User login
- `POST /php/register.php` - New user registration
- `GET /php/logout.php` - Logout
- `GET /php/session.php` - Check login status

### Products
- `GET /php/products.php` - List products
- `POST /php/products.php` - Add product (admin)
- `PUT /php/products.php` - Update product (admin)
- `DELETE /php/products.php` - Delete product (admin)

### Orders
- `GET /php/orders.php` - List orders
- `POST /php/orders.php` - Create order
- `PUT /php/orders.php` - Update order status

### Services
- `GET /php/services.php` - List service requests
- `POST /php/services.php` - Create service request
- `PUT /php/services.php` - Update service status

### Reports
- `GET /php/reports.php?type=dashboard` - Dashboard stats
- `GET /php/reports.php?type=revenue` - Revenue reports
- `GET /php/reports.php?type=low_stock` - Low stock alerts
- `GET /php/reports.php?type=categories` - Product categories
- `GET /php/reports.php?type=customers` - Customer list

## 💾 Database Tables

- **users** - Customer accounts
- **staff** - Staff/technician accounts
- **admins** - Admin accounts
- **products** - Inventory items
- **orders** - Customer orders
- **order_items** - Items in orders
- **service_requests** - Hardware service requests

## 🎨 Technologies

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** PHP 7.4+
- **Database:** MySQL 5.7+
- **No external frameworks required** - Pure vanilla stack

## 📱 Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## ⚙️ Configuration

### Environment Variables (if needed)
Create a `.env` file in the root:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=compustore_hms
```

Then update `includes/db.php` to read from `.env`

## 🔐 Security Notes

1. **Change demo passwords** after first login
2. **Enable HTTPS** in production
3. **Validate all inputs** on server side (already implemented)
4. **Use strong passwords** for database user
5. **Regular backups** of the database

## 🐛 Troubleshooting

### Database Connection Error
- Check MySQL is running
- Verify credentials in `includes/db.php`
- Ensure database name is correct

### Login Not Working
- Clear browser cookies
- Check browser console for errors (F12)
- Verify database tables were imported

### CSS/JS Not Loading
- Clear browser cache (Ctrl+Shift+Delete)
- Check file paths are correct
- Verify server can access files

### Service Request Issues
- Ensure services table exists
- Check user has proper permissions
- Verify all required fields are filled

## 📝 License

Private project - All rights reserved

## 🤝 Support

For issues or questions, check the database schema and ensure all tables are properly created.

---

**Last Updated:** May 2026
