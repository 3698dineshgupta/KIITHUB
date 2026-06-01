# KIIT Hub 🎓

> Production-grade student notes platform with Telegram-based PDF storage, secure streaming, and premium subscriptions.

## ✨ Features

| Feature | Description |
|---|---|
| 📚 Notes & PYQs | Organized by semester, branch, subject |
| 🔒 Secure PDF Streaming | JWT-signed tokens, server-side Telegram fetch, watermark overlay |
| 💾 Telegram Storage | PDFs stored in private Telegram channel — never on server |
| ⚡ Redis Caching | 24-hour TTL caching for Telegram URLs and popular content |
| 👑 Premium System | Manual UPI payment verification by admin |
| 🧮 GPA Calculator | SGPA/CGPA calculator with grade reference |
| 🛡️ Admin Panel | Upload, manage users, approve payments, analytics |
| 🌙 Dark Mode | Full dark/light/system theme support |
| 📱 Mobile Responsive | Works perfectly on all screen sizes |

## 🚀 Quick Start

```bash
# 1. Clone & install
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Set up database
npx prisma db push
npm run db:seed

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Admin setup:** Run `node scripts/create-admin.mjs` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables set.

## ⚙️ Environment Variables

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:5432/kiithub"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-32-char-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Telegram Bot
TELEGRAM_BOT_TOKEN=""       # From @BotFather
TELEGRAM_CHANNEL_ID=""      # Private channel ID (e.g. -100xxxxxxxxxx)

# Redis (Upstash recommended)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""

# Admin
ADMIN_EMAIL="your-admin-email@example.com"
```

## 📁 Project Structure

```
kiithub/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── notes/                      # Notes explorer + detail viewer
│   ├── pyq/                        # PYQ explorer + detail viewer
│   ├── calculator/                 # SGPA/CGPA calculator
│   ├── premium/                    # Premium subscription page
│   ├── dashboard/                  # Student dashboard
│   ├── admin/                      # Admin panel (protected)
│   │   ├── page.tsx               # Analytics overview
│   │   ├── upload/                # Upload PDF → Telegram
│   │   ├── users/                 # User management
│   │   └── payments/              # Payment verification
│   └── api/
│       ├── auth/                  # NextAuth routes
│       ├── stream/note/[id]/      # ⭐ Secure PDF streaming
│       ├── stream/pyq/[id]/       # ⭐ Secure PYQ streaming
│       ├── upload/                # Admin PDF upload
│       ├── payment/               # Submit + approve payments
│       ├── bookmarks/             # Bookmark management
│       ├── search/                # Global instant search
│       └── admin/                 # Admin APIs
├── components/
│   ├── ui/                        # Button, Card, Badge, Input...
│   ├── layout/                    # Navbar, Footer, Providers
│   ├── home/                      # Hero, Stats, FeaturedNotes...
│   ├── notes/                     # NoteCard, NotesList, NotesFilters
│   ├── pdf/                       # PDFViewer, PremiumGate
│   ├── auth/                      # LoginForm, RegisterForm
│   ├── dashboard/                 # StudentDashboard
│   └── admin/                     # AdminSidebar, UploadForm, Tables
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── prisma.ts                  # Prisma client singleton
│   ├── telegram.ts                # ⭐ Telegram storage provider
│   ├── redis.ts                   # Redis cache utilities
│   ├── jwt.ts                     # Stream token signing/verification
│   └── utils.ts                   # Helper functions
├── types/index.ts                 # TypeScript types + GPA calculators
├── prisma/
│   ├── schema.prisma              # Full database schema
│   └── seed.ts                    # Demo data seeder
├── middleware.ts                  # Route protection
├── Dockerfile                     # Production Docker build
└── docker-compose.yml             # Full stack with Postgres + Redis
```

## 🔐 Security Architecture

```
Student clicks "View PDF"
        │
        ▼
Server checks: authenticated + has permission + premium if required
        │
        ▼
Signs JWT with: { resourceId, userId, isPremium, exp: +2h }
        │
        ▼
Browser loads: <iframe src="/api/stream/note/[id]?token=JWT">
        │
        ▼
/api/stream/note/[id]:
  1. Verifies JWT signature + expiry
  2. Checks resourceId match
  3. Re-validates user exists
  4. Checks premium requirement
  5. Fetches from Telegram (server-side only)
  6. Streams with secure headers
  7. Overlays email watermark on client
```

**Telegram URLs are NEVER exposed to the client.**

## 💎 Premium Flow

1. Student visits `/premium`
2. Scans UPI QR code, pays ₹299
3. Uploads screenshot + transaction ID
4. Admin reviews at `/admin/payments`
5. Admin clicks "Approve"
6. User instantly upgraded to PREMIUM
7. Notification sent to student

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

## 🚀 Vercel Deployment

```bash
# Deploy to Vercel
npx vercel --prod

# Add environment variables in Vercel Dashboard
# Use Neon.tech for PostgreSQL and Upstash for Redis
```

## 📊 Database

Schema includes: `User`, `Account`, `Session`, `Branch`, `Semester`, `Subject`, `Note`, `PYQ`, `Bookmark`, `Download`, `View`, `PaymentRequest`, `Notification`, `Announcement`, `Setting`, `AuditLog`

```bash
# Push schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio
```
