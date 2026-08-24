'use client'
import { useState } from 'react'
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

export function SubmissionUploadForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [academicBranch, setAcademicBranch] = useState('')
  const [academicSemester, setAcademicSemester] = useState('')
  const [classYear, setClassYear] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [contentType, setContentType] = useState('NOTE')
  const [examType, setExamType] = useState('End Semester')

  const MAX_SIZE = 50 * 1024 * 1024

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !subjectName || !academicBranch || !academicSemester || !classYear) {
      setErrorMsg('Please fill all required fields and select a PDF.')
      setStatus('error')
      return
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File is too large (max ${(MAX_SIZE / 1024 / 1024).toFixed(0)} MB).`)
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
        contentType, examType: contentType === 'PYQ' ? examType : undefined,
      }))

      const res = await fetch('/api/submissions', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setStatus('success')
      setTitle(''); setDescription(''); setSubjectName(''); setAcademicBranch(''); setAcademicSemester(''); setClassYear(''); setFile(null)
      onSubmitted?.()
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
        <CardTitle>Submit a Document</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Submitted for review! We'll notify you once an admin approves or rejects it.</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="mb-2 block">PDF File *</Label>
            <label
              className={cn(
                'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <input type="file" accept="application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
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

          <div>
            <Label htmlFor="sub-title" className="mb-2 block">Title *</Label>
            <Input id="sub-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Structures Complete Notes Sem 3" required />
          </div>

          <div>
            <Label className="mb-2 block">Description</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this material..."
              className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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
              <Label htmlFor="sub-subject" className="mb-2 block">Subject *</Label>
              <Input id="sub-subject" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Data Structures" required />
            </div>
          </div>

          <div className={cn('grid gap-4', contentType === 'PYQ' ? 'grid-cols-2' : 'grid-cols-1')}>
            <div>
              <Label className="mb-2 block">Content Type *</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
          </div>

          <p className="text-xs text-muted-foreground">
            Your document will be reviewed by an admin before it goes live. Approved uploads are always free for everyone to view.
          </p>

          <Button type="submit" disabled={uploading} className="w-full gap-2" size="lg">
            {uploading ? (<><Loader2 className="h-5 w-5 animate-spin" />Submitting...</>) : (<><Upload className="h-5 w-5" />Submit for Review</>)}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
