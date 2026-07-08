import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { SellForm } from '@/components/merchandise/sell-form'

export const metadata: Metadata = {
  title: 'Sell an Item',
  robots: { index: false, follow: false },
}

export default async function SellPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/merchandise/sell')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Sell an Item</h1>
        <p className="text-muted-foreground text-sm">Fill in the details below. Your listing will be reviewed before it goes live.</p>
      </div>
      <SellForm mode="create" />
    </div>
  )
}
