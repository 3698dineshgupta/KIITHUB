'use client'
import Link from 'next/link'
import { Crown, BookmarkCheck, Download, Bell, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NoteCard } from '@/components/notes/note-card'
import { formatDate, isPremiumActive, daysLeft } from '@/lib/utils'

export function StudentDashboard({ user }: { user: any }) {
  const premium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
  const bookmarkedNotes = user.bookmarks.filter((b: any) => b.note).map((b: any) => b.note)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Your study dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          {premium ? (
            <Badge variant="premium" className="gap-1.5 text-sm px-3 py-1.5"><Crown className="h-4 w-4"/>Premium · {daysLeft(user.membershipExpiry)}d left</Badge>
          ) : user.membershipStatus === 'PENDING' ? (
            <Badge variant="warning" className="gap-1.5 text-sm px-3 py-1.5"><Clock className="h-4 w-4"/>Payment Pending</Badge>
          ) : (
            <Link href="/premium"><Button variant="premium" size="sm" className="gap-2"><Crown className="h-4 w-4"/>Upgrade to Premium</Button></Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bookmarks', value: user.bookmarks.length, icon: BookmarkCheck, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Downloads', value: user.downloads.length, icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Notifications', value: user.notifications.length, icon: Bell, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'Member Since', value: new Date(user.createdAt).getFullYear().toString(), icon: Crown, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`}/></div>
              <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      {user.notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {user.notifications.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"/>
                <div><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-muted-foreground">{n.message}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bookmarks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Saved Notes</h2>
          <Link href="/notes"><Button variant="ghost" size="sm" className="gap-1">Browse all<ArrowRight className="h-4 w-4"/></Button></Link>
        </div>
        {bookmarkedNotes.length === 0 ? (
          <Card className="p-8 text-center"><BookmarkCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3"/><p className="text-muted-foreground">No saved notes yet</p><Link href="/notes" className="mt-3 inline-block"><Button size="sm" variant="outline">Browse Notes</Button></Link></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarkedNotes.map((note: any) => <NoteCard key={note.id} note={{ ...note, isBookmarked: true }} showBookmark />)}
          </div>
        )}
      </div>
    </div>
  )
}
