# API Flow Report (Browser Execution)

Generated: 2026-05-29T17:53:27.917Z

Captured from Playwright network listeners during headed browser runs.

## ADMIN

| Method | URL | Status | Request | Response preview |
| --- | --- | --- | --- | --- |
| GET | /login | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| POST | /api/login | 200 | {"username":"admin_test","password":"TestAdmin!2026"} | {"success":true,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbl90ZXN0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgwMDc3MDcyLCJleHAiOjE3ODAwODA2NzJ9.ALTEE3F7lTRCz4ZrOckLlFfokjbQx |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":98,"user_id":null,"type":"low_stock","title":"Low stock: Fanta 1.25L","message":"12.00 cases left","entity_type":"inventory","entity_id":null,"is_read":0,"read_at":null, |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /customers | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | — |
| GET | /api/dashboard/executive | 500 | — | — |
| GET | /src/services/businessService.js | 304 | — | — |
| GET | /src/lib/products.js | 304 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 304 | — | — |
| GET | /src/lib/customers.js | 304 | — | — |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":200,"customer_id":41,"product_name":"Fanta 1.25L","quantity":1,"price_per_case":"447.00","total_amount":"447.00","amount_paid":"231.00","payment_mode":"Cash","notes":"Seed sale","date":"2026-04 |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":98,"user_id":null,"type":"low_stock","title":"Low stock: Fanta 1.25L","message":"12.00 cases left","entity_type":"inventory","entity_id":null,"is_read":0,"read_at":null, |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| POST | /api/customers | 200 | {"shop_name":"PW Shop 1780077075293","owner_name":"Playwright Owner","phone":"99 | {"success":true,"id":51} |
| GET | /api/sales | 200 | — | [{"id":200,"customer_id":41,"product_name":"Fanta 1.25L","quantity":1,"price_per_case":"447.00","total_amount":"447.00","amount_paid":"231.00","payment_mode":"Cash","notes":"Seed sale","date":"2026-04 |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":106,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer PW Shop 1780077075293 added","entity_type":"customer","entity_id":"51","is_read":0, |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":200,"customer_id":41,"product_name":"Fanta 1.25L","quantity":1,"price_per_case":"447.00","total_amount":"447.00","amount_paid":"231.00","payment_mode":"Cash","notes":"Seed sale","date":"2026-04 |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| DELETE | /api/customers/51 | 200 | — | {"success":true} |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":200,"customer_id":41,"product_name":"Fanta 1.25L","quantity":1,"price_per_case":"447.00","total_amount":"447.00","amount_paid":"231.00","payment_mode":"Cash","notes":"Seed sale","date":"2026-04 |
| GET | /inventory | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"58.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":106,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer PW Shop 1780077075293 added","entity_type":"customer","entity_id":"51","is_read":0, |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"58.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":106,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer PW Shop 1780077075293 added","entity_type":"customer","entity_id":"51","is_read":0, |
| POST | /api/products | 200 | {"Name":"PW Cola 1780077081222","quantity":0,"price":0,"sku":"","category":"Cola | {"success":true,"id":101} |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"58.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /sales | 200 | — | — |

## MANAGER

| Method | URL | Status | Request | Response preview |
| --- | --- | --- | --- | --- |
| GET | /login | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| POST | /api/login | 200 | {"username":"manager_test","password":"TestManager!2026"} | {"success":true,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJtYW5hZ2VyX3Rlc3QiLCJyb2xlIjoiZGlzdHJpYnV0b3IiLCJpYXQiOjE3ODAwNzcxMjYsImV4cCI6MTc4MDA4MDcyNn0.seBfDI8_UMsVVQ4021 |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /reports | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /admin/audit | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /admin/payments | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /dashboard | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |

## SALESPERSON

| Method | URL | Status | Request | Response preview |
| --- | --- | --- | --- | --- |
| GET | /login | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| POST | /api/login | 200 | {"username":"sales_test","password":"TestSales!2026"} | {"success":true,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJzYWxlc190ZXN0Iiwicm9sZSI6InVzZXIiLCJpYXQiOjE3ODAwNzcxNTEsImV4cCI6MTc4MDA4MDc1MX0.t7AKTSAT5x_K-boTW-mIFGHlxIngOm |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /customers | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":201,"customer_id":50,"product_name":"Fanta 300ml (1L)","quantity":2,"price_per_case":"364.00","total_amount":"728.00","amount_paid":"0.00","payment_mode":"Cash","notes":"","date":"2026-05-28T18 |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":201,"customer_id":50,"product_name":"Fanta 300ml (1L)","quantity":2,"price_per_case":"364.00","total_amount":"728.00","amount_paid":"0.00","payment_mode":"Cash","notes":"","date":"2026-05-28T18 |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":107,"user_id":null,"type":"low_stock","title":"Low stock alert","message":"PW Cola 1780077081222 is at 0.00 cases (threshold 120.00)","entity_type":"inventory","entity_i |
| POST | /api/customers | 200 | {"shop_name":"Sales PW 1780077152767","owner_name":"","phone":"","email":"","add | {"success":true,"id":52} |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":201,"customer_id":50,"product_name":"Fanta 300ml (1L)","quantity":2,"price_per_case":"364.00","total_amount":"728.00","amount_paid":"0.00","payment_mode":"Cash","notes":"","date":"2026-05-28T18 |
| GET | /inventory | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"56.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"56.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/products/search/Thums?page=1 | 200 | — | [{"id":7,"Name":"Thums Up 2L","quantity":"117.00","price":"269.00","sku":"SKU-THU-7","category":"Beverages","size":"1.25L","bpc":24,"reorder":"12.00"},{"id":10,"Name":"Thums Up 1.25L","quantity":"89.0 |
| GET | /sales | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |

## DELIVERY_AGENT

| Method | URL | Status | Request | Response preview |
| --- | --- | --- | --- | --- |
| GET | /login | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| POST | /api/login | 200 | {"username":"delivery_test","password":"TestDelivery!2026"} | {"success":true,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwidXNlcm5hbWUiOiJkZWxpdmVyeV90ZXN0Iiwicm9sZSI6InVzZXIiLCJpYXQiOjE3ODAwNzcxODIsImV4cCI6MTc4MDA4MDc4Mn0.zMWQ9lo8pHJT4V8ZNEO-lF2xKt |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/dashboard/executive | 500 | — | {"success":false,"message":"weeklySales.map is not a function"} |
| GET | /deliveries | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/deliveries | 403 | — | {"success":false,"message":"Insufficient permissions","code":"FORBIDDEN"} |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"55.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/deliveries | 403 | — | {"success":false,"message":"Insufficient permissions","code":"FORBIDDEN"} |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"55.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /sales | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
| GET | /src/lib/customers.js | 200 | — | — |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/sales | 200 | — | [{"id":202,"customer_id":50,"product_name":"Fanta 300ml (1L)","quantity":1,"price_per_case":"364.00","total_amount":"364.00","amount_paid":"0.00","payment_mode":"Cash","notes":"","date":"2026-05-28T18 |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"55.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /api/sales | 200 | — | [{"id":202,"customer_id":50,"product_name":"Fanta 300ml (1L)","quantity":1,"price_per_case":"364.00","total_amount":"364.00","amount_paid":"0.00","payment_mode":"Cash","notes":"","date":"2026-05-28T18 |
| GET | /api/notifications?unread=1 | 200 | — | {"success":true,"items":[{"id":108,"user_id":null,"type":"customer_added","title":"New customer","message":"Customer Sales PW 1780077152767 added","entity_type":"customer","entity_id":"52","is_read":0 |
| GET | /api/products?page=1 | 200 | — | [{"id":1,"Name":"Fanta 300ml","quantity":"55.00","price":"364.00","sku":"SKU-FAN-1","category":"Beverages","size":"1L","bpc":24,"reorder":"6.00"},{"id":2,"Name":"Sprite 1.25L","quantity":"0.00","price |
| GET | /api/customers | 200 | — | [{"id":50,"shop_name":"City Coca Cola Mart 50","owner_name":"Owner 50","phone":"9810000050","email":"shop50@deal.test","address":"50 Market Road","area":"North Zone","credit_limit":"39886.00","opening |
| GET | /reports | 200 | — | — |
| GET | /src/services/businessService.js | 200 | — | — |
| GET | /src/lib/products.js | 200 | — | — |
| GET | /src/components/payments/PaymentModal.jsx | 200 | — | — |
