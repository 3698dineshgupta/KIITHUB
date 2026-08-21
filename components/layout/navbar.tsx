'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, FileText, Calculator, Crown, Menu, X, Sun, Moon, LogOut, User, LayoutDashboard, ChevronDown, Shield, ShoppingBag, Bug, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, isPremiumActive } from '@/lib/utils'

const navLinks = [
  { href: '/notes', label: 'Notes', icon: BookOpen },
  { href: '/pyq', label: 'PYQs', icon: FileText },
  { href: '/calculator', label: 'Calculator', icon: Calculator },
  { href: '/merchandise', label: 'Merchandise', icon: ShoppingBag },
  { href: '/premium', label: 'Premium', icon: Crown, highlight: true },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); const h = () => setScrolled(window.scrollY > 16); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h) }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  const user = session?.user as any
  const isPremium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false
  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', scrolled ? 'bg-background/95 backdrop-blur-md border-b shadow-sm' : 'bg-background/80 backdrop-blur-sm')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-9 h-9 rounded-[0.55rem] bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
              K
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">KIIT Hub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', pathname.startsWith(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent', link.highlight && 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20')}>
                <link.icon className="h-4 w-4" />{link.label}
                {link.highlight && <Badge variant="premium" className="text-[10px] px-1.5 py-0">PRO</Badge>}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="p-2 rounded-lg hover:bg-accent transition-colors">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>}
            {status === 'loading' ? <div className="h-8 w-20 bg-muted animate-pulse rounded-lg" /> : session?.user ? (
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{user?.name?.[0]?.toUpperCase() ?? 'U'}</div>
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  {isPremium && <Badge variant="premium" className="text-[10px] px-1.5 py-0 hidden sm:flex">PRO</Badge>}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {userMenu && (<>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-52 bg-background border rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      <div className="px-3 py-2 border-b"><p className="text-sm font-medium truncate">{user?.name}</p><p className="text-xs text-muted-foreground truncate">{user?.email}</p></div>
                      {[{href:'/dashboard',label:'Dashboard',icon:LayoutDashboard},{href:'/profile',label:'Profile',icon:User},{href:'/requests',label:'Request Hub',icon:Inbox},{href:'/merchandise/my-listings',label:'My Listings',icon:ShoppingBag},{href:'/my-reports',label:'My Reports',icon:Bug},...(user?.role==='ADMIN'?[{href:'/admin',label:'Admin Panel',icon:Shield}]:[])].map(item=>(
                        <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors" onClick={() => setUserMenu(false)}><item.icon className="h-4 w-4 text-muted-foreground" />{item.label}</Link>
                      ))}
                      <button onClick={() => { signOut({ callbackUrl: '/' }); setUserMenu(false) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"><LogOut className="h-4 w-4" />Sign out</button>
                    </motion.div>
                  </>)}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link href="/register"><Button size="sm">Sign Up</Button></Link>
              </div>
            )}
            <button className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden border-t bg-background overflow-hidden">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (<Link key={link.href} href={link.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium', pathname.startsWith(link.href) ? 'bg-primary/10 text-primary' : 'hover:bg-accent')}><link.icon className="h-4 w-4" />{link.label}</Link>))}
              {!session?.user && <div className="pt-3 border-t flex flex-col gap-2"><Link href="/login"><Button variant="outline" className="w-full">Login</Button></Link><Link href="/register"><Button className="w-full">Sign Up</Button></Link></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
