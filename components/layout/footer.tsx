import Link from 'next/link'
import { BookOpen, Github, Twitter, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background/95 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">K</div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">KIIT Hub</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">Free & premium study materials for KIIT students. Notes, PYQs, and more.</p>
          </div>
          {[
            { title: 'Resources', links: [{ href:'/notes', label:'Notes' },{ href:'/pyq', label:'PYQs' },{ href:'/calculator', label:'SGPA/CGPA' },{ href:'/premium', label:'Premium' }] },
            { title: 'Platform', links: [{ href:'/dashboard', label:'Dashboard' },{ href:'/register', label:'Sign Up' },{ href:'/login', label:'Login' }] },
            { title: 'Legal', links: [{ href:'/privacy', label:'Privacy Policy' },{ href:'/terms', label:'Terms of Service' }] },
          ].map(col => (
            <div key={col.title}>
              <h3 className="font-semibold text-sm mb-3">{col.title}</h3>
              <ul className="space-y-2">{col.links.map(l => <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} KIIT Hub. Made for students.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="mailto:support@kiithub.com" className="text-muted-foreground hover:text-foreground"><Mail className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
