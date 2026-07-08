'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Upload, Users, CreditCard,
  Settings, BookOpen, ChevronRight, Shield, ShoppingBag, Gift, Bug,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/notes', label: 'Notes & PYQs', icon: BookOpen },
  { href: '/admin/upload', label: 'Upload PDF', icon: Upload },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/merchandise', label: 'Merchandise', icon: ShoppingBag },
  { href: '/admin/referrals', label: 'Referrals', icon: Gift },
  { href: '/admin/bugs', label: 'Bug Reports', icon: Bug },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">K</div>
          <div>
            <div className="font-semibold text-sm">KIIT Hub Admin</div>
            <div className="text-xs text-slate-400 truncate max-w-[140px]">{userName}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {active && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <Shield className="h-4 w-4" />Back to Site
        </Link>
      </div>
    </aside>
  )
}
