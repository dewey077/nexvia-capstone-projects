# FS-01 API Reference
Base URL: `http://localhost:5000/api` . Auth header: `Authorization: Bearer <token>`

| Method | Path | Role | Description |
|---|---|---|---|
| POST | /auth/register | public | `{name,email,password,role: customer\|vendor,shopName?}` |
| POST | /auth/login | public | returns `{token,user}` |
| GET | /auth/me | any | current user |
| GET | /products | public | `?q&category&minPrice&maxPrice&sort=price_asc\|price_desc\|rating\|newest&page&limit` |
| GET | /products/categories | public | distinct categories |
| GET | /products/:id | public | product detail |
| GET | /products/mine | vendor | own products |
| POST | /products | vendor/admin | multipart form: name, category, price, stock, description, brand, images[] |
| PUT | /products/:id | owner/admin | update (+ add images) |
| DELETE | /products/:id | owner/admin | delete |
| POST | /products/reindex | admin | rebuild Elasticsearch index |
| GET/POST | /products/:id/reviews | public / customer | list / add review (verified buyers only) |
| GET | /cart | customer | view cart |
| POST | /cart | customer | `{productId, qty}` (qty may be negative to reduce) |
| DELETE | /cart/:productId | customer | remove item |
| POST | /coupons/validate | any | `{code, subtotal}` |
| POST | /orders/checkout | customer | `{address:{name,phone,line1,city,state,pincode}, couponCode?}` |
| POST | /orders/:id/verify | customer | `{razorpay_payment_id, razorpay_signature}` (any value in mock mode) |
| GET | /orders/mine | customer | my orders |
| GET | /orders/vendor | vendor | paid orders with own items + earnings |
| PATCH | /orders/:id/items/:itemId/status | vendor/admin | `{status}` next step only |
| GET | /orders/:id | owner/admin/vendor | order detail |
| GET | /orders/:id/invoice | customer/admin | PDF invoice |
| GET | /admin/vendors | admin | list vendors |
| PATCH | /admin/vendors/:id | admin | `{status: approved\|rejected, razorpayAccountId?}` |
| GET/POST/DELETE | /admin/coupons | admin | coupon management |
| GET | /admin/analytics | admin | revenue, commission, orders by day/status, top products/vendors |
