-- Active: 1778178145943@@127.0.0.1@3306@compustore_hms
USE compustore_hms;

SHOW TABLES;

SELECT *
FROM pending_payments
WHERE created_at LIKE '2026-05-07%';

DESCRIBE order_items;

