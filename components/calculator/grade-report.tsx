'use client'
import { Fragment, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Download, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { GRADE_POINTS, type SGPASubject } from '@/types'
import { formatDate } from '@/lib/utils'

interface GradeReportProps {
  subjects: SGPASubject[]
  sgpa: number
  totalCredits: number
  defaultBranch: string
  defaultSemester: string
  onClose: () => void
}

export function GradeReport({ subjects, sgpa, totalCredits, defaultBranch, defaultSemester, onClose }: GradeReportProps) {
  const { data: session } = useSession()
  const [studentName, setStudentName] = useState(session?.user?.name ?? '')
  const [rollNumber, setRollNumber] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [branch, setBranch] = useState(defaultBranch)
  const [semester, setSemester] = useState(defaultSemester)
  const [academicSession, setAcademicSession] = useState('')

  const gradeMap = Object.fromEntries(GRADE_POINTS.map(g => [g.grade, g.points]))
  const generatedOn = formatDate(new Date())

  return (
    <Fragment>
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
      <Card className="w-full max-w-2xl my-6">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Semester Grade Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>

        {/* Editable details — not printed */}
        <div className="p-5 space-y-4 border-b bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block text-xs">Full Name</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Your name" /></div>
            <div><Label className="mb-1.5 block text-xs">Roll Number</Label><Input value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 22051234" /></div>
            <div><Label className="mb-1.5 block text-xs">Registration Number</Label><Input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="e.g. 2205123" /></div>
            <div><Label className="mb-1.5 block text-xs">Branch</Label><Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. CSE" /></div>
            <div><Label className="mb-1.5 block text-xs">Semester</Label><Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 5th Semester" /></div>
            <div><Label className="mb-1.5 block text-xs">Academic Session</Label><Input value={academicSession} onChange={e => setAcademicSession(e.target.value)} placeholder="e.g. Autumn 2026" /></div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background rounded-lg p-3 border">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            This report is generated from grades you entered yourself and is for personal reference only — it is not an official KIIT University document.
          </div>
        </div>

        <div className="p-5">
          <Button onClick={() => window.print()} className="w-full gap-2"><Download className="h-4 w-4" />Download / Print PDF</Button>
        </div>
      </Card>
    </div>

      {/* Printable report — hidden on screen, shown only via @media print (see app/globals.css).
          Deliberately kept OUTSIDE the .no-print modal wrapper above: display:none on an
          ancestor removes descendants from the render tree entirely, so nesting this inside
          .no-print would hide it during printing too, no matter what display it sets on itself. */}
      <div id="grade-report-printable" className="hidden">
        <div className="p-10 font-sans text-black bg-white">
          <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg">K</div>
              <div>
                <div className="font-bold text-lg leading-tight">KIIT Hub</div>
                <div className="text-xs text-gray-500">Student Self-Service Portal</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl">Semester Grade Report</div>
              <div className="text-xs text-gray-500">Generated on {generatedOn}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm mb-6 border border-gray-300 rounded-lg p-4">
            <div><span className="text-gray-500">Student Name:</span> <strong>{studentName || '—'}</strong></div>
            <div><span className="text-gray-500">Roll Number:</span> <strong>{rollNumber || '—'}</strong></div>
            <div><span className="text-gray-500">Registration No.:</span> <strong>{registrationNumber || '—'}</strong></div>
            <div><span className="text-gray-500">Branch:</span> <strong>{branch || '—'}</strong></div>
            <div><span className="text-gray-500">Semester:</span> <strong>{semester || '—'}</strong></div>
            <div><span className="text-gray-500">Academic Session:</span> <strong>{academicSession || '—'}</strong></div>
          </div>

          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-2 pr-2 w-10">#</th>
                <th className="py-2 pr-2">Subject</th>
                <th className="py-2 pr-2 text-center w-20">Credits</th>
                <th className="py-2 pr-2 text-center w-20">Grade</th>
                <th className="py-2 pr-2 text-center w-24">Grade Points</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2 pr-2">{i + 1}</td>
                  <td className="py-2 pr-2">{s.name || `Subject ${i + 1}`}</td>
                  <td className="py-2 pr-2 text-center">{s.credits}</td>
                  <td className="py-2 pr-2 text-center font-semibold">{s.grade}</td>
                  <td className="py-2 pr-2 text-center">{gradeMap[s.grade] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-2 border-black rounded-lg p-4 mb-8">
            <div className="text-sm">
              <div><span className="text-gray-500">Total Subjects:</span> <strong>{subjects.length}</strong></div>
              <div><span className="text-gray-500">Total Credits:</span> <strong>{totalCredits}</strong></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wide">SGPA</div>
              <div className="text-4xl font-black tabular-nums">{sgpa.toFixed(2)}</div>
            </div>
          </div>

          <div className="text-xs text-gray-500 border-t pt-4">
            This is an unofficial, self-generated summary produced from grades manually entered by the student on KIIT Hub&apos;s SGPA calculator.
            It is intended for personal reference only and is not a substitute for, and carries no validity as, an official transcript or grade
            report issued by KIIT University.
          </div>
        </div>
      </div>
    </Fragment>
  )
}
