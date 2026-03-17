# 🔥 GasQueue v2 — LPG SaaS Web Platform

Full-stack LPG gas queue management platform with a **spectacular public website**, unified authentication, blog system, and three-role dashboard — all in one web app.

---

## ✨ What's New in v2

| Feature | Details |
|---------|---------|
| 🌐 Public Website | Stunning landing page, supplier browser, and blog — no login required |
| ✍️ Blog System | Super admin writes and publishes posts; visible to all visitors |
| 🔐 Unified Auth | Single `/auth` page handles all three roles |
| 👤 Customer Portal | Self-registration → instant access → book gas from browser |
| 🏪 Supplier Creation | Admin-only supplier account creation with full business setup |
| 🎨 New Design | Playfair Display + DM Sans, flame-amber palette, animated hero |

---

## 🏗️ Architecture

```
Public Website (no login)
  /              → Landing page + stats + featured suppliers + blog
  /suppliers     → Browse all approved suppliers
  /suppliers/:id → Detail + stock + queue view + BOOK NOW
  /blog          → Blog listing with category filters
  /blog/:slug    → Full blog post reader
  /auth          → Unified login/register (all 3 roles)

Authenticated (role-based redirect after login)
  SUPER_ADMIN → /admin/dashboard
  SUPPLIER    → /supplier/dashboard
  CUSTOMER    → /customer/dashboard
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Edit if needed

# Init database schema (run once)
node database/init.js

# Seed sample data
npm run seed

# Start server
npm run dev
```

✅ API: http://localhost:5000  
✅ Health: http://localhost:5000/health

### 2. Web Frontend

```bash
cd web
npm install
npm start
```

✅ Site: http://localhost:3000

---

## 🔑 Login Credentials

| Role | Email | Password | Goes To |
|------|-------|----------|---------|
| Super Admin | admin@gasqueue.com | Admin@1234 | /admin/dashboard |
| Supplier 1 | himalayan@gasqueue.com | Supplier@1234 | /supplier/dashboard |
| Supplier 2 | valley@gasqueue.com | Supplier@1234 | /supplier/dashboard |
| Customer | ram@example.com | Customer@1234 | /customer/dashboard |

**New customers** can self-register at `/auth` — they are automatically assigned `CUSTOMER` role.

---

## 👥 Role System

| Role | Who Creates | Access |
|------|-------------|--------|
| `SUPER_ADMIN` | Seeded (one exists) | Full admin panel + blog |
| `SUPPLIER` | Created by SUPER_ADMIN only | Supplier dashboard |
| `CUSTOMER` | Self-registration | Customer dashboard + public site |

---

## 📝 Blog API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/blogs` | Public | List published posts |
| GET | `/api/v1/blogs/categories` | Public | Category counts |
| GET | `/api/v1/blogs/:slug` | Public | Single post (increments views) |
| GET | `/api/v1/blogs/admin/all` | SUPER_ADMIN | All posts incl. drafts |
| POST | `/api/v1/blogs` | SUPER_ADMIN | Create post |
| PUT | `/api/v1/blogs/:id` | SUPER_ADMIN | Update post |
| DELETE | `/api/v1/blogs/:id` | SUPER_ADMIN | Delete post |
| PATCH | `/api/v1/blogs/:id/toggle-publish` | SUPER_ADMIN | Publish/unpublish |

---

## 🏪 Supplier Creation API

```
POST /api/v1/auth/create-supplier
Authorization: Bearer <SUPER_ADMIN_TOKEN>

Body:
{
  "name": "Owner Name",
  "email": "supplier@email.com",
  "password": "SecurePass@123",
  "phone": "+977-9811000000",
  "business_name": "My Gas Agency",
  "city": "Kathmandu",
  "address": "Thamel, Kathmandu",
  "latitude": 27.7172,
  "longitude": 85.3240
}
```

---

## 🗄️ New Database Table

```sql
CREATE TABLE blog_posts (
  id           VARCHAR(36) PRIMARY KEY,
  author_id    VARCHAR(36) NOT NULL,   -- SUPER_ADMIN user
  title        VARCHAR(300) NOT NULL,
  slug         VARCHAR(320) UNIQUE,     -- auto-generated from title
  excerpt      TEXT,
  content      LONGTEXT NOT NULL,       -- HTML content
  cover_image  VARCHAR(500),
  category     VARCHAR(80),
  tags         VARCHAR(500),
  is_published TINYINT(1) DEFAULT 0,
  views        INT DEFAULT 0,
  created_at, updated_at
);
```

---

## 📦 Dependencies Added (Backend)

```
slugify  ^1.6.6   — Auto-generates URL slugs from post titles
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--flame` | #f97316 | Primary accent (buttons, badges, links) |
| `--flame-3` | #fbbf24 | Secondary flame (stars, gradients) |
| `--ink` | #0e0d0b | Page background |
| `--ink-2` | #1a1815 | Card/sidebar background |
| `--font-display` | Playfair Display | Headings, titles |
| `--font-body` | DM Sans | All body text |
| `--font-mono` | DM Mono | Booking numbers, code |

---

## 📁 File Changes from v1

### Backend (new/changed)
- `services/authService.js` — Added `createSupplierAccount()`
- `services/blogService.js` — **NEW** full blog CRUD
- `controllers/authController.js` — Added `createSupplier`
- `controllers/blogController.js` — **NEW**
- `routes/auth.js` — Added `/create-supplier`
- `routes/blogs.js` — **NEW**
- `server.js` — Added blog routes
- `seed/seeder.js` — Added 3 sample blog posts
- `database/schema.sql` — Added `blog_posts` table
- `package.json` — Added `slugify`

### Web (new/changed)
- `src/index.css` — Complete redesign (Playfair + DM Sans, flame palette)
- `src/App.js` — New routes for public + customer pages
- `src/api/index.js` — Added `blogAPI`, `adminAPI`
- `src/components/PublicNav.js` — **NEW** transparent scrolling navbar
- `src/components/Footer.js` — **NEW** multi-column footer
- `src/components/Sidebar.js` — Updated with Blogs nav + Site link
- `src/pages/public/LandingPage.js` — **NEW** spectacular homepage
- `src/pages/public/AuthPage.js` — **NEW** unified login/register
- `src/pages/public/SuppliersPage.js` — **NEW** public supplier browser
- `src/pages/public/SupplierDetail.js` — **NEW** supplier detail + booking
- `src/pages/public/BlogPage.js` — **NEW** blog listing
- `src/pages/public/BlogPost.js` — **NEW** blog reader
- `src/pages/admin/Blogs.js` — **NEW** admin blog editor
- `src/pages/admin/Suppliers.js` — Added "Create Supplier" modal
- `src/pages/customer/Dashboard.js` — **NEW** customer home
- `src/pages/customer/Bookings.js` — **NEW** customer booking history
