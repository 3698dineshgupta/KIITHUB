import { Suspense } from 'react'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
export default function AdminPage() {
  return <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-28 rounded-xl"/>)}</div>}>
    <AdminDashboard />
  </Suspense>
}
