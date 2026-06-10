import { prisma } from '@/lib/prisma'
import { AdminUploadForm } from '@/components/admin/upload-form'
import { AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUploadPage() {
  let branches: any[] = []
  let semesters: any[] = []
  let subjects: any[] = []
  let dbError = false

  try {
    const [b, s, sub] = await Promise.all([
      prisma.branch.findMany({ orderBy: { name: 'asc' } }),
      prisma.semester.findMany({ orderBy: { number: 'asc' } }),
      prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { branch: true, semester: true } }),
    ])
    branches = b
    semesters = s
    subjects = sub
  } catch (err) {
    console.error('[AdminUploadPage] DB error:', err)
    dbError = true
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload PDF</h1>
        <p className="text-muted-foreground">Upload study materials to Telegram storage</p>
      </div>

      {dbError && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium mb-1">Database temporarily unreachable</p>
            <p className="text-amber-700 dark:text-amber-400 mb-3">
              Branch/Semester/Subject dropdowns couldn't be loaded. You can still type in the fields manually — the form will create them automatically on upload.
            </p>
            <Link href="/admin/upload" className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Link>
          </div>
        </div>
      )}

      <AdminUploadForm branches={branches} semesters={semesters} subjects={subjects} />
    </div>
  )
}
