/**
 * Seed script — populate KIITHUB with demo PDFs
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient, ExamType } from '@prisma/client'

const prisma = new PrismaClient()

const demoPDFs = [
  {
    title: 'Data Structures and Algorithms - Complete Notes',
    description: 'Comprehensive DSA notes covering arrays, linked lists, trees, graphs, and dynamic programming',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 3,
    subject: 'Data Structures',
    year: 2024,
    examType: 'NOTES' as ExamType,
    telegramFileId: 'demo_file_id_1',
    telegramMessageId: '1001',
    isPremium: false,
    previewPages: 5,
    views: 1243,
  },
  {
    title: 'Data Structures Mid Semester 2024',
    description: 'Mid semester exam paper with solutions',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 3,
    subject: 'Data Structures',
    year: 2024,
    examType: 'MIDSEM' as ExamType,
    telegramFileId: 'demo_file_id_2',
    telegramMessageId: '1002',
    isPremium: false,
    previewPages: 3,
    views: 890,
  },
  {
    title: 'Operating Systems End Semester 2023',
    description: 'Complete end semester paper with all sections',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 4,
    subject: 'Operating Systems',
    year: 2023,
    examType: 'ENDSEM' as ExamType,
    telegramFileId: 'demo_file_id_3',
    telegramMessageId: '1003',
    isPremium: true,
    previewPages: 2,
    views: 2156,
  },
  {
    title: 'Database Management Systems Premium Notes',
    description: 'In-depth DBMS notes with ER diagrams, normalization, and SQL',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 5,
    subject: 'DBMS',
    year: 2024,
    examType: 'NOTES' as ExamType,
    telegramFileId: 'demo_file_id_4',
    telegramMessageId: '1004',
    isPremium: true,
    previewPages: 3,
    views: 3421,
  },
  {
    title: 'Computer Networks Lab Manual',
    description: 'Complete lab manual with all practical experiments',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 5,
    subject: 'Computer Networks',
    year: 2024,
    examType: 'LAB_MANUAL' as ExamType,
    telegramFileId: 'demo_file_id_5',
    telegramMessageId: '1005',
    isPremium: false,
    previewPages: 5,
    views: 567,
  },
  {
    title: 'Machine Learning Mid Semester 2024',
    description: 'ML mid semester exam paper with answer key',
    school: 'School of Computer Engineering',
    branch: 'CSE',
    semester: 7,
    subject: 'Machine Learning',
    year: 2024,
    examType: 'MIDSEM' as ExamType,
    telegramFileId: 'demo_file_id_6',
    telegramMessageId: '1006',
    isPremium: true,
    previewPages: 2,
    views: 1876,
  },
]

async function main() {
  console.log('🌱 Seeding KIITHUB database...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@kiithub.com' },
    update: {},
    create: {
      name: 'KIITHUB Admin',
      email: process.env.ADMIN_EMAIL || 'admin@kiithub.com',
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin user: ${admin.email}`)

  // Create demo PDFs
  for (const pdf of demoPDFs) {
    const created = await prisma.pDF.upsert({
      where: { id: pdf.telegramFileId },
      update: {},
      create: pdf,
    }).catch(async () => {
      // If unique constraint fails just create
      return prisma.pDF.create({ data: pdf })
    })
    console.log(`✅ PDF: ${created.title}`)
  }

  console.log('\n✨ Seeding complete!')
  console.log(`📊 ${demoPDFs.length} demo PDFs created`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
