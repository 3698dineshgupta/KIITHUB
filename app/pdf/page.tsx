'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PDFCard } from '@/components/pdf/pdf-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  X,
  Loader2,
} from 'lucide-react'
import { 
  SCHOOLS, 
  BRANCHES, 
  SEMESTERS, 
  YEARS, 
  EXAM_TYPES,
  EXAM_TYPE_LABELS,
  type PDFMetadata,
  type ExamType,
} from '@/types'

export default function PDFExplorerPage() {
  const searchParams = useSearchParams()
  const [pdfs, setPdfs] = useState<PDFMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filters
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedSemester, setSelectedSemester] = useState<number | ''>('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedExamType, setSelectedExamType] = useState<ExamType | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  // Load PDFs
  useEffect(() => {
    fetchPDFs()
  }, [searchQuery, selectedSchool, selectedBranch, selectedSemester, selectedYear, selectedExamType])

  const fetchPDFs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('search', searchQuery)
      if (selectedSchool) params.append('school', selectedSchool)
      if (selectedBranch) params.append('branch', selectedBranch)
      if (selectedSemester) params.append('semester', selectedSemester.toString())
      if (selectedYear) params.append('year', selectedYear.toString())
      if (selectedExamType) params.append('examType', selectedExamType)
      
      const res = await fetch(`/api/pdf?${params.toString()}`)
      const data = await res.json()
      
      if (data.success) {
        setPdfs(data.pdfs)
      }
    } catch (error) {
      console.error('Failed to fetch PDFs:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setSelectedSchool('')
    setSelectedBranch('')
    setSelectedSemester('')
    setSelectedSubject('')
    setSelectedYear('')
    setSelectedExamType('')
    setSearchQuery('')
  }

  const availableBranches = selectedSchool && BRANCHES[selectedSchool as keyof typeof BRANCHES]
    ? BRANCHES[selectedSchool as keyof typeof BRANCHES]
    : []

  return (
    <div className="min-h-screen pt-16 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Explore Study Materials
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Find notes, PYQs, assignments, and more
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by subject, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </Card>

        {/* Filters */}
        {showFilters && (
          <Card className="p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Filters</h3>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>

            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">School</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value)
                    setSelectedBranch('')
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="">All Schools</option>
                  {SCHOOLS.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={!selectedSchool}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
                >
                  <option value="">All Branches</option>
                  {availableBranches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="">All Semesters</option>
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="">All Years</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Exam Type</label>
                <select
                  value={selectedExamType}
                  onChange={(e) => setSelectedExamType(e.target.value as ExamType | '')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="">All Types</option>
                  {EXAM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EXAM_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : pdfs.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No study materials found. Try adjusting your filters.
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Found {pdfs.length} result{pdfs.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pdfs.map((pdf) => (
                <PDFCard key={pdf.id} pdf={pdf} onBookmark={fetchPDFs} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
