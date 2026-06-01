// create-admin.mjs  — run with: ADMIN_EMAIL=you@domain.com ADMIN_PASSWORD=YourPass node scripts/create-admin.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_NAME     = process.env.ADMIN_NAME || 'KIITHUB Admin'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.')
  console.error('Usage: ADMIN_EMAIL=you@domain.com ADMIN_PASSWORD=YourSecurePass node scripts/create-admin.mjs')
  process.exit(1)
}

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const admin = await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: { password: hashedPassword, role: 'ADMIN', name: ADMIN_NAME },
    create: {
      email:    ADMIN_EMAIL,
      name:     ADMIN_NAME,
      password: hashedPassword,
      role:     'ADMIN',
    },
  })

  console.log('Admin user ready:')
  console.log(`   Email : ${admin.email}`)
  console.log(`   Role  : ${admin.role}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
