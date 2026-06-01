/**
 * Seed script — populate KIITHUB with demo data
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding KIITHUB database...')

  // 1. Create admin user only if ADMIN_EMAIL is configured
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: 'KIITHUB Admin',
        email: adminEmail,
        role: 'ADMIN',
      },
    })
    console.log(`✅ Admin user: ${admin.email}`)
  } else {
    console.log('ℹ️ Skipping admin user (set ADMIN_EMAIL env var to create one)')
  }

  // 2. Seed Branches
  console.log('Branch seeding started...')
  const cseBranch = await prisma.branch.upsert({
    where: { shortName: 'CSE' },
    update: {},
    create: { name: 'Computer Science & Engineering', shortName: 'CSE' }
  })
  const eceBranch = await prisma.branch.upsert({
    where: { shortName: 'ECE' },
    update: {},
    create: { name: 'Electronics & Communication Engineering', shortName: 'ECE' }
  })
  const itBranch = await prisma.branch.upsert({
    where: { shortName: 'IT' },
    update: {},
    create: { name: 'Information Technology', shortName: 'IT' }
  })
  console.log('✅ Branches seeded successfully')

  // 3. Seed Semesters 1 to 8
  console.log('Semester seeding started...')
  const semestersMap: Record<number, any> = {}
  for (let num = 1; num <= 8; num++) {
    const sem = await prisma.semester.upsert({
      where: { number: num },
      update: {},
      create: { number: num, label: `Semester ${num}` }
    })
    semestersMap[num] = sem
  }
  console.log('✅ Semesters 1-8 seeded successfully')

  // 4. Seed Subjects
  console.log('Subject seeding started...')
  const dsaSubject = await prisma.subject.upsert({
    where: { name_branchId_semesterId: { name: 'Data Structures', branchId: cseBranch.id, semesterId: semestersMap[3].id } },
    update: {},
    create: {
      name: 'Data Structures',
      code: 'CS2001',
      description: 'Fundamental data structures and design principles.',
      branchId: cseBranch.id,
      semesterId: semestersMap[3].id
    }
  })

  const oopSubject = await prisma.subject.upsert({
    where: { name_branchId_semesterId: { name: 'Object Oriented Programming', branchId: cseBranch.id, semesterId: semestersMap[3].id } },
    update: {},
    create: {
      name: 'Object Oriented Programming',
      code: 'CS2003',
      description: 'Java programming and OOP principles.',
      branchId: cseBranch.id,
      semesterId: semestersMap[3].id
    }
  })

  const osSubject = await prisma.subject.upsert({
    where: { name_branchId_semesterId: { name: 'Operating Systems', branchId: cseBranch.id, semesterId: semestersMap[4].id } },
    update: {},
    create: {
      name: 'Operating Systems',
      code: 'CS2002',
      description: 'Processes, CPU scheduling, memory management, and file systems.',
      branchId: cseBranch.id,
      semesterId: semestersMap[4].id
    }
  })

  const dbmsSubject = await prisma.subject.upsert({
    where: { name_branchId_semesterId: { name: 'Database Management Systems', branchId: cseBranch.id, semesterId: semestersMap[5].id } },
    update: {},
    create: {
      name: 'Database Management Systems',
      code: 'CS3001',
      description: 'Relational model, SQL, normalization, and transaction handling.',
      branchId: cseBranch.id,
      semesterId: semestersMap[5].id
    }
  })
  console.log('✅ Subjects seeded successfully')

  // 5. Seed Notes
  console.log('Note seeding started...')
  const note1 = await prisma.note.upsert({
    where: { slug: 'data-structures-and-algorithms-complete-notes' },
    update: {},
    create: {
      title: 'Data Structures and Algorithms - Complete Notes',
      slug: 'data-structures-and-algorithms-complete-notes',
      description: 'Comprehensive DSA notes covering arrays, linked lists, trees, graphs, and dynamic programming',
      contentType: 'NOTE',
      subjectId: dsaSubject.id,
      branchId: cseBranch.id,
      semesterId: semestersMap[3].id,
      academicBranch: 'CSE',
      academicSemester: '3',
      classYear: '2nd year',
      telegramFileId: 'demo_file_id_1',
      telegramMsgId: '1001',
      isPremium: false,
      fileSize: 4528190,
      totalPages: 45
    }
  })

  const note2 = await prisma.note.upsert({
    where: { slug: 'database-management-systems-premium-notes' },
    update: {},
    create: {
      title: 'Database Management Systems Premium Notes',
      slug: 'database-management-systems-premium-notes',
      description: 'In-depth DBMS notes with ER diagrams, normalization, and SQL',
      contentType: 'NOTE',
      subjectId: dbmsSubject.id,
      branchId: cseBranch.id,
      semesterId: semestersMap[5].id,
      academicBranch: 'CSE',
      academicSemester: '5',
      classYear: '3rd year',
      telegramFileId: 'demo_file_id_4',
      telegramMsgId: '1004',
      isPremium: true,
      fileSize: 5291240,
      totalPages: 32
    }
  })
  console.log('✅ Notes seeded successfully')

  // 6. Seed PYQs
  console.log('PYQ seeding started...')
  const pyq1 = await prisma.pYQ.upsert({
    where: { slug: 'data-structures-mid-semester-2024' },
    update: {},
    create: {
      title: 'Data Structures Mid Semester 2024',
      slug: 'data-structures-mid-semester-2024',
      description: 'Mid semester exam paper with solutions',
      year: 2024,
      examType: 'Mid Semester',
      subjectId: dsaSubject.id,
      branchId: cseBranch.id,
      semesterId: semestersMap[3].id,
      academicBranch: 'CSE',
      academicSemester: '3',
      classYear: '2nd year',
      telegramFileId: 'demo_file_id_2',
      telegramMsgId: '1002',
      isPremium: false,
      fileSize: 1428190
    }
  })

  const pyq2 = await prisma.pYQ.upsert({
    where: { slug: 'operating-systems-end-semester-2023' },
    update: {},
    create: {
      title: 'Operating Systems End Semester 2023',
      slug: 'operating-systems-end-semester-2023',
      description: 'Complete end semester paper with all sections',
      year: 2023,
      examType: 'End Semester',
      subjectId: osSubject.id,
      branchId: cseBranch.id,
      semesterId: semestersMap[4].id,
      academicBranch: 'CSE',
      academicSemester: '4',
      classYear: '2nd year',
      telegramFileId: 'demo_file_id_3',
      telegramMsgId: '1003',
      isPremium: true,
      fileSize: 2156420
    }
  })
  console.log('✅ PYQs seeded successfully')

  console.log('\n✨ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
