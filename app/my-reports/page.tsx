import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Metadata } from 'next'
import { MyBugReports } from '@/components/bugs/my-bug-reports'

export const metadata: Metadata = {
  title: 'My Reports',
  robots: { index: false, follow: false },
}

export default async function MyReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">My Bug Reports</h1>
      <p className="text-muted-foreground mb-6">Track the status of issues you&apos;ve reported.</p>
      <MyBugReports />
    </div>
  )
}
