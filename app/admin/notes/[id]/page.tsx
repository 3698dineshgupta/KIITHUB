import { prisma } from '@/lib/prisma'
import { AdminEditForm } from '@/components/admin/edit-form'
import { notFound } from 'next/navigation'

export default async function AdminEditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let initialData: any = await prisma.note.findUnique({
    where: { id },
    include: {
      tags: true,
      subject: true,
    }
  })

  if (!initialData) {
    initialData = await prisma.pYQ.findUnique({
      where: { id },
      include: {
        subject: true,
      }
    })
    if (initialData) {
      initialData.contentType = 'PYQ'
    }
  }

  if (!initialData) {
    notFound()
  }

  const [branches, semesters, subjects] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { number: 'asc' } }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        branch: { select: { shortName: true } },
        semester: { select: { number: true } }
      }
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Material</h1>
        <p className="text-muted-foreground">Update the metadata for this document.</p>
      </div>
      <AdminEditForm 
        initialData={initialData}
        branches={branches} 
        semesters={semesters} 
        subjects={subjects} 
      />
    </div>
  )
}
