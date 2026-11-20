# 10-minute presentation outline (FS-01)
1. **Problem (1 min)**: small vendors need one place to sell; platform needs payments split + commission.
2. **Design (2 min)**: show ARCHITECTURE.md diagram, 3 roles, why Redis (cart), Elasticsearch (search), S3 (images).
3. **Live demo (4 min)**: vendor registers, admin approves, vendor adds product with image; customer searches, adds to cart, applies coupon, pays; vendor ships item; customer downloads invoice; admin analytics.
4. **Challenges (1 min)**: split payments + discount allocation, keeping search index in sync, graceful fallbacks.
5. **Results (1 min)**: 13 automated tests passing (docs/test-results.txt), API response times, features delivered.
6. **Next steps (1 min)**: Razorpay Route live payouts, email notifications, deploy front end and back end separately.
