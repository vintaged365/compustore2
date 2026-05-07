-- Active: 1778098414649@@127.0.0.1@3306@compustore_hms
-- CompuStore HMS Database Schema
-- Computer Hardware and Service Management System

CREATE DATABASE IF NOT EXISTS compustore_hms;

SHOW DATABASES;
USE compustore_hms;

-- Users table (Customers)
CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  role ENUM('customer', 'staff', 'admin') DEFAULT 'customer'
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  staff_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('staff', 'technician', 'manager') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Admin table
CREATE TABLE IF NOT EXISTS admins (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  access_level ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  product_id INT PRIMARY KEY AUTO_INCREMENT,
  product_name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity_in_stock INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_type ENUM('in_store', 'online') DEFAULT 'online',
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  staff_id INT,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Service Requests table
CREATE TABLE IF NOT EXISTS service_requests (
  service_id INT PRIMARY KEY AUTO_INCREMENT,
  service_ref VARCHAR(20) UNIQUE,
  user_id INT NOT NULL,
  device_type VARCHAR(100) NOT NULL,
  device_brand VARCHAR(100),
  device_description TEXT,
  issue_description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'intake', 'in_progress', 'awaiting_parts', 'completed', 'cancelled') DEFAULT 'pending',
  assigned_to INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (assigned_to) REFERENCES staff(staff_id)
);

-- Service History table
CREATE TABLE IF NOT EXISTS service_history (
  history_id INT PRIMARY KEY AUTO_INCREMENT,
  service_id INT NOT NULL,
  action VARCHAR(200) NOT NULL,
  notes TEXT,
  updated_by_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES service_requests(service_id),
  FOREIGN KEY (updated_by_id) REFERENCES staff(staff_id)
);

-- Inventory Log table
CREATE TABLE IF NOT EXISTS inventory_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  previous_quantity INT,
  new_quantity INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (updated_by) REFERENCES staff(staff_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_admin_email ON admins(email);
CREATE INDEX idx_product_sku ON products(sku);
CREATE INDEX idx_product_category ON products(category);
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_service_user ON service_requests(user_id);
CREATE INDEX idx_service_status ON service_requests(status);
CREATE INDEX idx_service_assigned ON service_requests(assigned_to);

-- Sample data (password: 'password')
INSERT INTO users (full_name, email, phone, password_hash, address) VALUES
('Customer User', 'customer@test.com', '+254701234567', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Nairobi'),
('Jane Muthoni', 'jane@example.com', '+254701234567', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', '123 Nairobi Street'),
('Ali Kariuki', 'ali@example.com', '+254702345678', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', '456 Mombasa Road'),
('Sam Otieno', 'sam@example.com', '+254703456789', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', '789 Kisumu Avenue');

INSERT INTO staff (full_name, email, phone, password_hash, role) VALUES
('Staff User', 'staff@test.com', '+254701111111', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'staff'),
('David Kipchoge', 'david@staff.com', '+254704567890', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('Mary Kiplagat', 'mary@staff.com', '+254705678901', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('John Mwangi', 'john@staff.com', '+254706789012', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'staff');

INSERT INTO admins (full_name, email, password_hash, access_level) VALUES
('Admin User', 'admin@test.com', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'super_admin');

-- CompuStore HMS - Sample Data for Dashboard and Services
-- Populates the database with realistic demo data for all pages

USE compustore_hms;

-- ============================================================
-- 1. PRODUCTS (with varied stock levels)
-- ============================================================
INSERT INTO products (product_name, sku, category, description, unit_price, quantity_in_stock, reorder_level) VALUES
-- Laptops
('Dell Inspiron 15 3000', 'LP-001', 'Laptops', 'Intel Core i5, 8GB RAM, 256GB SSD', 65000.00, 3, 5),
('HP Pavilion 15', 'LP-002', 'Laptops', 'Intel Core i7, 16GB RAM, 512GB SSD', 85000.00, 1, 5),
('Lenovo ThinkPad E14', 'LP-003', 'Laptops', 'Intel Core i5, 8GB RAM, 512GB SSD', 72000.00, 0, 5),
('ASUS VivoBook 15', 'LP-004', 'Laptops', 'AMD Ryzen 5, 8GB RAM, 256GB SSD', 58000.00, 4, 5),
('MacBook Air M1', 'LP-005', 'Laptops', 'Apple M1, 8GB RAM, 256GB SSD', 120000.00, 2, 3);

-- Components
INSERT INTO products (product_name, sku, category, description, unit_price, quantity_in_stock, reorder_level) VALUES
('Kingston 8GB RAM DDR4', 'CP-001', 'Components', 'DDR4 3200MHz Memory', 3800.00, 12, 5),
('Kingston 16GB RAM DDR4', 'CP-002', 'Components', 'DDR4 3200MHz Memory', 7500.00, 8, 5),
('Samsung 1TB SSD', 'CP-003', 'Components', 'SATA SSD 1TB', 9500.00, 15, 5),
('WD 1TB HDD', 'CP-004', 'Components', 'WD Blue HDD 1TB', 4500.00, 20, 5),
('Intel i5-11400', 'CP-005', 'Components', '11th Gen Intel Processor', 18000.00, 6, 5);

-- Accessories
INSERT INTO products (product_name, sku, category, description, unit_price, quantity_in_stock, reorder_level) VALUES
('HP Wireless Mouse', 'AC-001', 'Accessories', 'USB Wireless Mouse', 1200.00, 45, 10),
('Mechanical Keyboard RGB', 'AC-002', 'Accessories', 'USB Mechanical Gaming Keyboard', 4500.00, 8, 10),
('Laptop Cooling Pad', 'AC-003', 'Accessories', 'USB Powered Cooling Pad', 2500.00, 3, 10),
('USB-C Hub 7-in-1', 'AC-004', 'Accessories', 'USB-C Multiport Hub', 3200.00, 0, 10),
('Phone Charger 65W', 'AC-005', 'Accessories', 'USB-C Fast Charger', 2000.00, 25, 10);

-- Monitors
INSERT INTO products (product_name, sku, category, description, unit_price, quantity_in_stock, reorder_level) VALUES
('Dell 24" FHD', 'MN-001', 'Monitors', 'Dell 24 inch FHD Monitor', 12000.00, 5, 3),
('LG 27" 4K', 'MN-002', 'Monitors', 'LG 27 inch 4K Monitor', 35000.00, 2, 3),
('ASUS 144Hz Gaming', 'MN-003', 'Monitors', 'ASUS 24 inch 144Hz Gaming', 18000.00, 1, 3);

-- ============================================================
-- 2. USERS (Customers) - Including test account
-- ============================================================
INSERT INTO users (full_name, email, phone, password_hash, address, role) VALUES
('Test Customer', 'customer@test.com', '+254700000000', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Test Address', 'customer'),
('Peter Kimani', 'peter@example.com', '+254712345678', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Westlands, Nairobi', 'customer'),
('Aisha Mohammed', 'aisha@gmail.com', '+254723456789', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Eastleigh, Nairobi', 'customer'),
('John Wachira', 'john.w@outlook.com', '+254734567890', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'CBD, Nairobi', 'customer'),
('Grace Nyambura', 'grace.n@yahoo.com', '+254745678901', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Parklands, Nairobi', 'customer'),
('Samuel Kipchoge', 'samuel.k@gmail.com', '+254756789012', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Kilimani, Nairobi', 'customer'),
('Rose Kariuki', 'rose.k@hotmail.com', '+254767890123', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'Langata, Nairobi', 'customer');

-- ============================================================
-- 3. STAFF (Technicians & Managers) - Including test account
-- ============================================================
INSERT INTO staff (full_name, email, phone, password_hash, role) VALUES
('Test Staff', 'staff@test.com', '+254700000001', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('David Kipchoge', 'david@staff.com', '+254704567890', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('Mary Kiplagat', 'mary@staff.com', '+254705678901', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('Joseph Mutua', 'joseph@staff.com', '+254706789012', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician'),
('Sarah Mwangi', 'sarah@staff.com', '+254707890123', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'manager'),
('Daniel Ochieng', 'daniel@staff.com', '+254708901234', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'technician');

-- ============================================================
-- 4. ADMINS
-- ============================================================
INSERT INTO admins (full_name, email, password_hash, access_level) VALUES
('Admin User', 'admin@test.com', '$2y$10$TEGIe0/ihxA0efZrrjOr.uy5PzL7RyWxvKTxoOjjAUEcyLvi7hfA2', 'super_admin');

-- ============================================================
-- 5. ORDERS (This month - May 2026)
-- ============================================================
INSERT INTO orders (user_id, created_at, order_type, total_amount, status, payment_status, staff_id, notes) VALUES
-- May orders
(1, '2026-05-01 09:15:00', 'online', 68500.00, 'completed', 'paid', 1, 'Expedited delivery'),
(2, '2026-05-02 10:30:00', 'in_store', 92000.00, 'completed', 'paid', 2, NULL),
(1, '2026-05-03 14:45:00', 'online', 4500.00, 'processing', 'pending', 1, NULL),
(3, '2026-05-04 11:20:00', 'online', 156000.00, 'completed', 'paid', NULL, 'Bulk order'),
(4, '2026-05-05 15:10:00', 'in_store', 45000.00, 'completed', 'paid', 2, NULL),
(5, '2026-05-06 09:45:00', 'online', 38000.00, 'pending', 'pending', NULL, NULL),
(2, '2026-05-07 13:25:00', 'online', 72000.00, 'processing', 'paid', 1, NULL),
(6, '2026-05-08 10:15:00', 'in_store', 23500.00, 'completed', 'paid', 2, NULL),
(1, '2026-05-09 16:50:00', 'online', 85000.00, 'processing', 'paid', NULL, 'Customer waiting'),
(3, '2026-05-10 12:30:00', 'online', 112000.00, 'completed', 'paid', 1, 'Premium setup');

-- ============================================================
-- 6. ORDER ITEMS
-- ============================================================
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
-- Order 1
(1, 1, 1, 65000.00, 65000.00),
(1, 6, 1, 3800.00, 3800.00),

-- Order 2
(2, 2, 1, 85000.00, 85000.00),
(2, 7, 2, 3500.00, 7000.00),

-- Order 3
(3, 11, 2, 1200.00, 2400.00),
(3, 12, 1, 2500.00, 2500.00),

-- Order 4
(4, 3, 2, 72000.00, 144000.00),
(4, 8, 3, 4000.00, 12000.00),

-- Order 5
(5, 15, 1, 35000.00, 35000.00),
(5, 10, 1, 10500.00, 10500.00),

-- Order 6
(6, 14, 2, 18000.00, 36000.00),
(6, 11, 1, 1200.00, 1200.00),

-- Order 7
(7, 4, 1, 58000.00, 58000.00),
(7, 12, 1, 2500.00, 2500.00),
(7, 11, 3, 1200.00, 3600.00),
(7, 13, 1, 7500.00, 7500.00),

-- Order 8
(8, 17, 1, 2000.00, 2000.00),
(8, 11, 5, 1200.00, 6000.00),
(8, 13, 1, 7500.00, 7500.00),
(8, 14, 2, 3000.00, 6000.00),

-- Order 9
(9, 2, 1, 85000.00, 85000.00),

-- Order 10
(10, 4, 1, 58000.00, 58000.00),
(10, 5, 1, 25000.00, 25000.00),
(10, 16, 1, 12000.00, 12000.00),
(10, 17, 1, 2000.00, 2000.00),
(10, 12, 2, 2500.00, 5000.00);

-- ============================================================
-- 7. SERVICE REQUESTS (Multiple statuses for dashboard)
-- ============================================================
INSERT INTO service_requests (service_ref, user_id, device_type, device_brand, device_description, issue_description, priority, status, assigned_to, estimated_cost, final_cost, created_at) VALUES
-- PENDING
('SRV-2026001', 1, 'Laptop', 'Dell', 'Inspiron 15 3000', 'Screen flickering intermittently', 'medium', 'pending', NULL, 5000.00, NULL, '2026-05-10 14:30:00'),
('SRV-2026002', 4, 'Desktop', 'Custom Built', 'Gaming PC', 'No display output, fans running', 'high', 'pending', NULL, 8000.00, NULL, '2026-05-09 11:15:00'),

-- IN PROGRESS
('SRV-2026003', 2, 'Laptop', 'HP', 'Pavilion 15', 'Overheating and random shutdowns', 'high', 'in_progress', 1, 6500.00, NULL, '2026-05-08 09:45:00'),
('SRV-2026004', 5, 'Monitor', 'LG', '27 inch 4K', 'Color banding on screen', 'low', 'in_progress', 2, 3000.00, NULL, '2026-05-07 16:20:00'),
('SRV-2026005', 3, 'Keyboard', 'Mechanical RGB', 'Gaming Keyboard', 'Keys sticking, RGB not working', 'medium', 'in_progress', 3, 2500.00, NULL, '2026-05-06 13:00:00'),

-- AWAITING PARTS
('SRV-2026006', 6, 'Laptop', 'Lenovo', 'ThinkPad E14', 'Hard drive failure', 'high', 'awaiting_parts', 1, 4500.00, NULL, '2026-05-05 10:30:00'),

-- COMPLETED (Recent ones)
('SRV-2026007', 1, 'Laptop', 'ASUS', 'VivoBook 15', 'Battery not charging', 'high', 'completed', 2, 2500.00, 2500.00, '2026-05-04 15:45:00'),
('SRV-2026008', 2, 'Mouse', 'Wireless', 'HP Wireless Mouse', 'Double-clicking issue', 'low', 'completed', 1, 800.00, 800.00, '2026-05-03 12:15:00'),
('SRV-2026009', 3, 'Monitor', 'Dell', '24 inch FHD', 'Dead pixel', 'low', 'completed', 2, 1500.00, 1500.00, '2026-05-02 14:00:00'),
('SRV-2026010', 4, 'Laptop', 'MacBook', 'Air M1', 'Trackpad unresponsive', 'high', 'completed', 3, 3500.00, 3500.00, '2026-05-01 10:00:00');

-- ============================================================
-- 8. SERVICE HISTORY
-- ============================================================
INSERT INTO service_history (service_id, action, notes, updated_by_id, created_at) VALUES
-- SRV-2026001 (Pending)
(1, 'created', 'Request submitted by customer', 1, '2026-05-10 14:30:00'),
(1, 'intake', 'Device received and inspected', 1, '2026-05-10 15:00:00'),

-- SRV-2026002 (Pending)
(2, 'created', 'Request submitted by customer', 1, '2026-05-09 11:15:00'),

-- SRV-2026003 (In Progress)
(3, 'created', 'Request submitted by customer', 1, '2026-05-08 09:45:00'),
(3, 'intake', 'Device received', 1, '2026-05-08 10:00:00'),
(3, 'assigned', 'Assigned to David Kipchoge', 1, '2026-05-08 11:00:00'),
(3, 'diagnostics', 'Thermal paste replacement needed, cleaning in progress', 1, '2026-05-09 09:00:00'),

-- SRV-2026004 (In Progress)
(4, 'created', 'Request submitted by customer', 2, '2026-05-07 16:20:00'),
(4, 'intake', 'Monitor received - color calibration issue confirmed', 2, '2026-05-07 17:00:00'),
(4, 'assigned', 'Assigned to Mary Kiplagat', 2, '2026-05-08 08:00:00'),

-- SRV-2026005 (In Progress)
(5, 'created', 'Request submitted by customer', 3, '2026-05-06 13:00:00'),
(5, 'assigned', 'Assigned to Joseph Mutua', 3, '2026-05-06 14:00:00'),
(5, 'diagnostics', 'Testing switches, partial repair in progress', 3, '2026-05-07 10:00:00'),

-- SRV-2026006 (Awaiting Parts)
(6, 'created', 'Request submitted by customer', 1, '2026-05-05 10:30:00'),
(6, 'intake', 'Hard drive failure confirmed', 1, '2026-05-05 11:00:00'),
(6, 'assigned', 'Assigned to David Kipchoge', 1, '2026-05-05 12:00:00'),
(6, 'awaiting_parts', 'Ordered SSD replacement - ETA 2 days', 1, '2026-05-05 14:00:00'),

-- SRV-2026007 (Completed)
(7, 'created', 'Request submitted by customer', 2, '2026-05-04 15:45:00'),
(7, 'intake', 'Device received', 2, '2026-05-04 16:00:00'),
(7, 'assigned', 'Assigned to Mary Kiplagat', 2, '2026-05-04 16:30:00'),
(7, 'diagnostics', 'Battery replaced with new unit', 2, '2026-05-04 17:30:00'),
(7, 'completed', 'Service completed, tested and working', 2, '2026-05-04 18:00:00'),

-- SRV-2026008 (Completed)
(8, 'created', 'Request submitted by customer', 1, '2026-05-03 12:15:00'),
(8, 'intake', 'Mouse switched for replacement', 1, '2026-05-03 12:30:00'),
(8, 'assigned', 'Assigned to David Kipchoge', 1, '2026-05-03 13:00:00'),
(8, 'completed', 'Replacement mouse tested and working', 1, '2026-05-03 13:45:00'),

-- SRV-2026009 (Completed)
(9, 'created', 'Request submitted by customer', 2, '2026-05-02 14:00:00'),
(9, 'intake', 'Dead pixel confirmed on left side', 2, '2026-05-02 14:15:00'),
(9, 'assigned', 'Assigned to Mary Kiplagat', 2, '2026-05-02 15:00:00'),
(9, 'completed', 'Monitor replacement provided', 2, '2026-05-02 16:00:00'),

-- SRV-2026010 (Completed)
(10, 'created', 'Request submitted by customer', 3, '2026-05-01 10:00:00'),
(10, 'intake', 'MacBook received, trackpad issue confirmed', 3, '2026-05-01 10:30:00'),
(10, 'assigned', 'Assigned to Joseph Mutua', 3, '2026-05-01 11:00:00'),
(10, 'diagnostics', 'Trackpad driver updated and recalibrated', 3, '2026-05-01 12:00:00'),
(10, 'completed', 'Trackpad fully responsive, service complete', 3, '2026-05-01 14:00:00');

-- ============================================================
-- 9. INVENTORY LOG
-- ============================================================
INSERT INTO inventory_log (product_id, action, quantity_change, previous_quantity, new_quantity, updated_by, created_at) VALUES
(1, 'SOLD', -1, 4, 3, 1, '2026-05-01 09:30:00'),
(6, 'SOLD', -1, 13, 12, 1, '2026-05-01 09:30:00'),
(2, 'SOLD', -1, 2, 1, 2, '2026-05-02 10:45:00'),
(7, 'SOLD', -2, 10, 8, 2, '2026-05-02 10:45:00'),
(11, 'SOLD', -2, 47, 45, 1, '2026-05-03 14:50:00'),
(12, 'SOLD', -1, 9, 8, 1, '2026-05-03 14:50:00'),
(3, 'SOLD', -2, 2, 0, NULL, '2026-05-04 11:25:00'),
(8, 'SOLD', -3, 18, 15, NULL, '2026-05-04 11:25:00'),
(13, 'RESTOCK', 5, 0, 5, 2, '2026-05-04 14:00:00'),
(2, 'SOLD', -1, 1, 0, 2, '2026-05-07 13:30:00'),
(4, 'SOLD', -1, 21, 20, 1, '2026-05-08 10:20:00'),
(14, 'RESTOCK', 8, 1, 9, 2, '2026-05-08 15:00:00'),
(15, 'RESTOCK', 3, 2, 5, 2, '2026-05-09 09:00:00');

-- ============================================================
-- Sample Data Load Complete
-- ============================================================
-- Stats that should appear in dashboard:
-- Sales this month: KSh 1,070,000 (May orders completed)
-- Total products: 20
-- Pending services: 2
-- Monthly orders: 10 (May 2026)
-- Total customers: 6
-- Low stock items: 6 products
-- Out of stock: 2 products
-- ============================================================


SELECT *
FROM admins;

SHOW tables

DESCRIBE products

SELECT COUNT(*) 
FROM products

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE products;
SET FOREIGN_KEY_CHECKS = 1;

DELETE FROM users
WHERE user_id = 10

SELECT full_name
FROM users;

TRUNCATE TABLE users;

DESCRIBE orders;

DESCRIBE service_requests;

ALTER TABLE orders 
-- ADD COLUMN payment_method VARCHAR(20) DEFAULT NULL,
ADD COLUMN mpesa_receipt VARCHAR(50) DEFAULT NULL;

ALTER TABLE service_requests 
ADD COLUMN payment_status ENUM('unpaid','paid') DEFAULT 'unpaid',
ADD COLUMN mpesa_receipt VARCHAR(50) DEFAULT NULL;
-- ============================================================
-- M-Pesa pending payments tracking table
-- Maps CheckoutRequestID → order/service for reliable callback matching
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
  reference_type ENUM('order', 'service') NOT NULL,
  reference_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_checkout (checkout_request_id),
  INDEX idx_ref (reference_type, reference_id)
);

-- Add missing columns to orders if not already present
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(50) DEFAULT NULL;

-- Normalise payment_status ENUM to include 'unpaid' used by mpesa.php
-- (safe to run multiple times — IF NOT EXISTS guards the table; ALTER ignores existing cols)
