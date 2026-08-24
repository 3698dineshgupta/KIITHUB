import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UploadEarnHub } from '@/components/submissions/upload-earn-hub'

export const metadata: Metadata = {
  title: 'Upload & Earn Premium',
  description: 'Contribute notes and PYQs to KIIT Hub and earn temporary premium access.',
  alternates: { canonical: '/upload-earn' },
  robots: { index: false, follow: false },
}

export default async function UploadEarnPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/upload-earn')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload & Earn Premium</h1>
        <p className="text-muted-foreground">Contribute notes and PYQs — every approved upload counts toward free premium access.</p>
      </div>
      <UploadEarnHub />
    </div>
  )
}
