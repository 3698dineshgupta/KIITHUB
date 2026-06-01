import { prisma } from '@/lib/prisma'
import { AdminUsersTable } from '@/components/admin/users-table'
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page ?? '1')
  const search = resolvedSearchParams.search ?? ''
  const LIMIT = 20
  const where: any = {}
  if (search) where.OR = [{ name:{ contains:search,mode:'insensitive' } },{ email:{ contains:search,mode:'insensitive' } }]
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy:{ createdAt:'desc' }, skip:(page-1)*LIMIT, take:LIMIT, select:{ id:true,name:true,email:true,role:true,membershipStatus:true,membershipExpiry:true,createdAt:true,_count:{ select:{ downloads:true } } } }),
    prisma.user.count({ where }),
  ])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Users</h1><p className="text-muted-foreground">{total} registered students</p></div>
      <AdminUsersTable users={users} total={total} page={page} />
    </div>
  )
}
