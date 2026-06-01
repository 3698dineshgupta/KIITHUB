// create-admin.mjs  — run with: node scripts/create-admin.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@kiithub.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123'
const ADMIN_NAME     = 'KIITHUB Admin'

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

  console.log(`✅ Admin user ready:`)
  console.log(`   Email   : ${admin.email}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`   Role    : ${admin.role}`)
  console.log(`\n👉 Go to http://localhost:3000/login and sign in.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
