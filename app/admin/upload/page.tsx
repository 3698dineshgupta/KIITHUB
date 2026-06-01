import { prisma } from '@/lib/prisma'
import { AdminUploadForm } from '@/components/admin/upload-form'
export default async function AdminUploadPage() {
  const [branches, semesters, subjects] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { number: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { branch: true, semester: true } }),
  ])
  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold">Upload PDF</h1><p className="text-muted-foreground">Upload study materials to Telegram storage</p></div>
      <AdminUploadForm branches={branches} semesters={semesters} subjects={subjects} />
    </div>
  )
}
