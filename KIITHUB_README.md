# KIITHUB 🎓

> Netflix-style premium educational platform for KIIT students — secure PDF streaming, PYQs, notes, and premium study materials.

![KIITHUB](https://img.shields.io/badge/KIITHUB-Educational%20Platform-emerald)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF)

---

## ✨ Highlights

| Feature | Description |
|---|---|
| 🔒 Secure PDF Streaming | PDFs served server-side via signed JWT tokens — Telegram URLs never exposed |
| 📺 Netflix-style UI | Glassmorphism, Framer Motion animations, dark mode, fully responsive |
| 💎 Premium System | QR payment → screenshot upload → admin verify → auto-activate |
| 📱 Telegram Storage | All PDFs stored in a private Telegram channel via Bot API |
| 🛡️ Watermarking | Dynamic email watermark overlay on every viewed PDF |
| 🔐 Role-based Access | USER / ADMIN roles with protected routes and middleware |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Fill in .env (see below)

# 4. Push database schema
npx prisma db push

# 5. Start dev server
npm run dev
```

---

## ⚙️ Environment Variables

Create a `.env` file:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:pass@localhost:5432/kiithub"

# Clerk (https://clerk.com → create app)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Telegram Bot (https://t.me/BotFather → /newbot)
TELEGRAM_BOT_TOKEN=123456789:ABC-xxx
TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx   # use @userinfobot to find

# Security
JWT_SECRET=replace-with-random-64-char-string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@yourdomain.com

# Premium settings
PREMIUM_PRICE=299
PREMIUM_DURATION_DAYS=365
```

---

## 📁 Project Structure

```
kiithub/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout with Clerk
│   ├── globals.css
│   ├── api/
│   │   ├── pdf/
│   │   │   ├── route.ts          # List / search PDFs
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts      # Single PDF details
│   │   │   │   └── access/       # Generate stream token
│   │   │   └── stream/[id]/      # ⭐ Secure streaming endpoint
│   │   ├── bookmarks/            # Add / remove / list
│   │   ├── payment/request/      # Submit payment
│   │   ├── user/
│   │   │   ├── profile/          # Upsert user from Clerk
│   │   │   └── recent/           # View history
│   │   └── admin/
│   │       ├── analytics/        # Platform stats
│   │       ├── pdf/upload/       # Upload → Telegram
│   │       ├── payments/         # Approve / reject
│   │       └── users/            # Grant / revoke premium
│   ├── auth/
│   │   ├── sign-in/[[...sign-in]]/
│   │   └── sign-up/[[...sign-up]]/
│   ├── pdf/
│   │   ├── page.tsx              # Explorer with filters
│   │   └── [id]/page.tsx         # ⭐ Secure PDF viewer
│   ├── premium/page.tsx          # Subscription + payment
│   ├── dashboard/page.tsx        # User dashboard
│   └── admin/
│       ├── layout.tsx            # Admin sidebar
│       ├── page.tsx              # Analytics overview
│       ├── upload/page.tsx       # Upload PDF
│       ├── payments/page.tsx     # Approve payments
│       └── users/page.tsx        # User management
├── components/
│   ├── ui/                       # Button, Card, Badge, Input
│   ├── layout/                   # Navbar, Footer
│   └── pdf/pdf-card.tsx          # PDF card with premium styles
├── lib/
│   ├── utils.ts
│   ├── prisma.ts
│   ├── telegram.ts               # Telegram Bot API integration
│   └── auth/jwt.ts               # Signed PDF access tokens
├── types/index.ts
├── store/index.ts                # Zustand stores
├── middleware.ts                 # Clerk route protection
└── prisma/schema.prisma
```

---

## 🔐 Security Architecture

```
User clicks "View PDF"
        │
        ▼
POST /api/pdf/[id]/access
  • Authenticate via Clerk
  • Check premium if required
  • Increment view count
  • Log to ViewHistory
  • Issue signed JWT (1h TTL)
        │
        ▼
Frontend renders <iframe>
  src="/api/pdf/stream/[id]?token=JWT"
        │
        ▼
GET /api/pdf/stream/[id]
  • Re-verify Clerk session
  • Decode + validate JWT
  • Check pdfId match
  • Check premium match
  • Fetch PDF from Telegram (server-side)
  • Stream with secure headers
  • Watermark applied via overlay
```

**Never exposed:** Telegram Bot token, Telegram file URLs, raw file IDs.

---

## 💎 Premium Flow

```
1. User visits /premium
2. Scans QR code & pays ₹299 via UPI
3. Uploads screenshot + transaction ID
4. Admin sees pending request in /admin/payments
5. Admin clicks "Approve"
6. User.premiumStatus = true, premiumExpiry = now + 365 days
7. User can now access all locked PDFs
```

---

## 🗄️ Database Schema (Prisma)

| Model | Key Fields |
|---|---|
| User | clerkId, role, premiumStatus, premiumExpiry |
| PDF | telegramFileId, isPremium, previewPages, views |
| Bookmark | userId ↔ pdfId |
| ViewHistory | userId, pdfId, viewedAt |
| PaymentRequest | screenshot, transactionId, status |
| SystemSettings | key/value store |

---

## 📦 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all `.env` variables to Vercel → Settings → Environment Variables.

**Database:** Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) for hosted PostgreSQL.

---

## 🛣️ Roadmap

- [ ] Automated UPI payment verification (Razorpay)
- [ ] AI-powered content search
- [ ] PDF annotations & highlights
- [ ] Study groups & forums
- [ ] Mobile app (React Native / Expo)
- [ ] Push notifications for new uploads
- [ ] Bulk admin PDF upload

---

Made with ❤️ for KIIT students | [MIT License](LICENSE)
