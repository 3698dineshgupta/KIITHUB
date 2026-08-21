'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useTransition } from 'react'
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedParam } from '@/hooks/use-debounced-param'

const CONTENT_TYPES = [
  { value: 'NOTE', label: 'Notes' },
  { value: 'PYQ', label: 'PYQs' },
  { value: 'SYLLABUS', label: 'Syllabus' },
  { value: 'LAB_MANUAL', label: 'Lab Manual' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
]

interface Props {
  branches: { id: string; name: string; shortName: string }[]
  semesters: { id: string; number: number; label: string }[]
  subjects: { id: string; name: string; branchId: string; semesterId: string }[]
}

export function NotesFilters({ branches, semesters, subjects }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, sp]
  )

  const search = useDebouncedParam(sp.get('search') ?? '', v => updateParam('search', v || null))

  const clearAll = () => {
    search.reset('')
    startTransition(() => {
      router.push(pathname)
    })
  }
  const hasFilters = sp.size > 0

  const branchId = sp.get('branch') ?? ''
  const semesterId = sp.get('semester') ?? ''

  // Subjects belonging to the currently selected branch AND semester —
  // purely client-side over data already fetched once server-side, so this
  // is effectively instant and never triggers a new request.
  const uniqueSubjects = useMemo(() => {
    const filtered = subjects.filter(s =>
      (!branchId || s.branchId === branchId) &&
      (!semesterId || s.semesterId === semesterId)
    )
    // Dedupe by name, case/whitespace-insensitively — the same subject can
    // legitimately exist under multiple branches, but inconsistently-typed
    // duplicates (e.g. "Physics" vs "physics") shouldn't show as two options.
    const seen = new Set<string>()
    return filtered.filter(s => {
      const key = s.name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [subjects, branchId, semesterId])

  // Branch/semester changes can invalidate the current subject selection —
  // drop it if the selected subject no longer belongs to the new combo,
  // matching the semester/branch dropdowns actually filtering the subject
  // list instead of just cosmetically narrowing it.
  const updateBranchOrSemester = useCallback(
    (key: 'branch' | 'semester', value: string | null) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')

      const nextBranchId = key === 'branch' ? (value ?? '') : (sp.get('branch') ?? '')
      const nextSemesterId = key === 'semester' ? (value ?? '') : (sp.get('semester') ?? '')
      const currentSubjectName = sp.get('subject')
      if (currentSubjectName) {
        const stillValid = subjects.some(s =>
          s.name === currentSubjectName &&
          (!nextBranchId || s.branchId === nextBranchId) &&
          (!nextSemesterId || s.semesterId === nextSemesterId)
        )
        if (!stillValid) params.delete('subject')
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, sp, subjects]
  )

  return (
    <div className="space-y-4 mb-6 relative">
      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, subject, keywords..."
          value={search.value}
          onChange={e => search.onChange(e.target.value)}
          className="pl-9 pr-10"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />

        <Select value={sp.get('branch') ?? ''} onValueChange={v => updateBranchOrSemester('branch', v === 'all' ? null : v)} disabled={isPending}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.shortName}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sp.get('semester') ?? ''} onValueChange={v => updateBranchOrSemester('semester', v === 'all' ? null : v)} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sems</SelectItem>
            {semesters.map(s => <SelectItem key={s.id} value={s.id}>Sem {s.number}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sp.get('subject') ?? ''} onValueChange={v => updateParam('subject', v === 'all' ? null : v)} disabled={isPending || uniqueSubjects.length === 0}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={uniqueSubjects.length === 0 ? 'No subjects available' : 'Subject'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {uniqueSubjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {pathname.includes('/pyq') ? (
          <Select value={sp.get('examType') ?? ''} onValueChange={v => updateParam('examType', v === 'all' ? null : v)} disabled={isPending}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Exam Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              <SelectItem value="Mid Semester">Mid Semester</SelectItem>
              <SelectItem value="End Semester">End Semester</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select value={sp.get('type') ?? ''} onValueChange={v => updateParam('type', v === 'all' ? null : v)} disabled={isPending}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={sp.get('sort') ?? 'latest'} onValueChange={v => updateParam('sort', v)} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="popular">Most Viewed</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground" disabled={isPending}>
            <X className="h-4 w-4" />Clear
          </Button>
        )}
      </div>
    </div>
  )
}
