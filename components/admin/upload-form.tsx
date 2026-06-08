'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Loader2, CheckCircle, AlertCircle, File } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: 'NOTE', label: 'Study Note' },
  { value: 'PYQ', label: 'Previous Year Question' },
  { value: 'SYLLABUS', label: 'Syllabus' },
  { value: 'LAB_MANUAL', label: 'Lab Manual' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
]

interface Props {
  branches: { id: string; name: string; shortName: string }[]
  semesters: { id: string; number: number; label: string }[]
  subjects: { id: string; name: string; branchId: string; semesterId: string; branch: { shortName: string }; semester: { number: number } }[]
}

export function AdminUploadForm({ branches, semesters, subjects }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [academicBranch, setAcademicBranch] = useState('')
  const [academicSemester, setAcademicSemester] = useState('')
  const [classYear, setClassYear] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [contentType, setContentType] = useState('NOTE')
  const [examType, setExamType] = useState('End Semester')
  const [isPremium, setIsPremium] = useState(false)
  const [tags, setTags] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !subjectName || !academicBranch || !academicSemester || !classYear) {
      setErrorMsg('Please fill all required fields and select a PDF.')
      setStatus('error')
      return
    }

    setUploading(true)
    setStatus('idle')

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('meta', JSON.stringify({
        title, description, subjectName, academicBranch, academicSemester, classYear,
        contentType, examType: contentType === 'PYQ' ? examType : undefined, isPremium,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }))

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setStatus('success')
      setTitle(''); setDescription(''); setSubjectName(''); setAcademicBranch(''); setAcademicSemester(''); setClassYear(''); setTags(''); setFile(null)
      setTimeout(() => router.push('/admin/notes'), 2000)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Details</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">PDF uploaded to Telegram successfully! Redirecting...</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Drop Zone */}
          <div>
            <Label className="mb-2 block">PDF File *</Label>
            <label
              className={cn(
                'flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <File className="h-8 w-8" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Click to select PDF (max 50 MB)</span>
                </div>
              )}
            </label>
          </div>

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
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
          <div>
            <Label className="mb-2 block">Tags (comma separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. algorithms, sorting, graphs" />
          </div>

          <Button type="submit" disabled={uploading} className="w-full gap-2" size="lg">
            {uploading ? <><Loader2 className="h-5 w-5 animate-spin" />Uploading to Telegram...</> : <><Upload className="h-5 w-5" />Upload PDF</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
