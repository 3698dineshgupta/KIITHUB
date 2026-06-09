'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'NOTE', label: 'Study Note' },
  { value: 'PYQ', label: 'Previous Year Question' },
  { value: 'SYLLABUS', label: 'Syllabus' },
  { value: 'LAB_MANUAL', label: 'Lab Manual' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
]

interface Props {
  initialData: any
  branches: { id: string; name: string; shortName: string }[]
  semesters: { id: string; number: number; label: string }[]
  subjects: { id: string; name: string; branchId: string; semesterId: string; branch: { shortName: string }; semester: { number: number } }[]
}

export function AdminEditForm({ initialData, branches, semesters, subjects }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [title, setTitle] = useState(initialData.title || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [academicBranch, setAcademicBranch] = useState(initialData.academicBranch || '')
  const [academicSemester, setAcademicSemester] = useState(initialData.academicSemester || '')
  const [classYear, setClassYear] = useState(initialData.classYear || '')
  const [subjectName, setSubjectName] = useState(initialData.subject?.name || '')
  const [contentType, setContentType] = useState(initialData.contentType || 'NOTE')
  const [examType, setExamType] = useState(initialData.examType || 'End Semester')
  const [isPremium, setIsPremium] = useState(initialData.isPremium || false)
  const [tags, setTags] = useState(initialData.tags ? initialData.tags.map((t: any) => t.tag).join(', ') : '')

  const isPyq = initialData.contentType === 'PYQ'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !subjectName || !academicBranch || !academicSemester || !classYear) {
      setErrorMsg('Please fill all required fields.')
      setStatus('error')
      return
    }

    setSaving(true)
    setStatus('idle')

    try {
      const payload = {
        title, 
        description, 
        subjectName, 
        academicBranch, 
        academicSemester, 
        classYear,
        contentType, 
        examType: contentType === 'PYQ' ? examType : undefined, 
        isPremium,
        tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      }

      const res = await fetch(`/api/admin/notes/${initialData.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      })
      
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Update failed')

      setStatus('success')
      setTimeout(() => router.push('/admin/notes'), 1500)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Details</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Changes saved successfully! Redirecting...</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="mb-2 block">Title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Structures Complete Notes Sem 3" required />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-2 block">Description</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this material..."
              className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Row: Branch + Semester */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Branch *</Label>
              <Select value={academicBranch} onValueChange={setAcademicBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {['CSE', 'IT', 'ECE', 'ME', 'CE'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Semester *</Label>
              <Select value={academicSemester} onValueChange={setAcademicSemester}>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Class/Year + Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Class/Year *</Label>
              <Select value={classYear} onValueChange={setClassYear}>
                <SelectTrigger><SelectValue placeholder="Select class/year" /></SelectTrigger>
                <SelectContent>
                  {['1st year', '2nd year', '3rd year', '4th year'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject" className="mb-2 block">Subject *</Label>
              <Input id="subject" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Data Structures" required />
            </div>
          </div>

          {/* Row: Content Type + Premium */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Content Type *</Label>
              <Select 
                value={contentType} 
                onValueChange={setContentType}
                disabled={isPyq} // Don't allow changing PYQ to NOTE or vice versa
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {isPyq && <p className="text-xs text-muted-foreground mt-1">Cannot change base type of PYQs.</p>}
            </div>
            <div>
              <Label className="mb-2 block">Access Level</Label>
              <div className="flex rounded-lg border overflow-hidden h-10">
                <button type="button" onClick={() => setIsPremium(false)} className={cn('flex-1 text-sm font-medium transition-colors', !isPremium ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>Free</button>
                <button type="button" onClick={() => setIsPremium(true)} className={cn('flex-1 text-sm font-medium transition-colors', isPremium ? 'bg-amber-500 text-white' : 'hover:bg-muted')}>Premium</button>
              </div>
            </div>
          </div>

          {contentType === 'PYQ' && (
            <div>
              <Label className="mb-2 block">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mid Semester">Mid Semester</SelectItem>
                  <SelectItem value="End Semester">End Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          {!isPyq && (
            <div>
              <Label className="mb-2 block">Tags (comma separated)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. algorithms, sorting, graphs" />
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/admin/notes')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
