import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const subjectName = '7tduyiu'
  
  const subjects = await prisma.subject.findMany({
    where: {
      name: {
        contains: '7td',
        mode: 'insensitive'
      }
    }
  })
  
  console.log('Found subjects to delete:', subjects)
  
  for (const sub of subjects) {
    await prisma.subject.delete({
      where: { id: sub.id }
    })
    console.log(`Deleted subject: ${sub.name}`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
