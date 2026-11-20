# FS-01: Multi-Vendor E-Commerce Marketplace

Amazon-style marketplace: vendors sell, customers buy, platform splits payments and earns commission.

**Stack:** React, Node.js/Express, MongoDB, Elasticsearch, Redis, AWS S3, Razorpay (test mode)

## Run locally
```bash
docker compose up -d          # MongoDB, Redis, Elasticsearch (optional but recommended)
cd backend
cp .env.example .env          # edit JWT_SECRET at least
npm install
npm run seed                  # demo users, products, coupons
npm run dev                   # API on http://localhost:5000
npm test                      # automated tests
```
Demo logins (after seed): `admin@demo.com / Admin@123`, `vendor1@demo.com / Vendor@123`, `customer@demo.com / Customer@123`. Coupons: `WELCOME10`, `FLAT200`.

## Optional integrations (auto-detected from .env)
| Service | If configured | If blank |
|---|---|---|
| Elasticsearch | fuzzy search | MongoDB text search |
| Redis | persistent cart | in-memory cart |
| AWS S3 | images in S3 | images saved to /uploads |
| Razorpay keys | real test-mode payments + signature check | mock payment mode |

## Docs
`docs/ARCHITECTURE.md`, `docs/API.md`, `docs/test-results.txt`, `docs/PRESENTATION_OUTLINE.md`, `docs/REFLECTION.md`
