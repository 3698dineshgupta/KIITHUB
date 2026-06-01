'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Calculator, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GRADE_POINTS, calculateSGPA, calculateCGPA, type SGPASubject } from '@/types'
import { cn } from '@/lib/utils'

const emptySubject = (): SGPASubject => ({ name: '', credits: 3, grade: 'O' })

function GradeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GRADE_POINTS.map(g => (
        <button
          key={g.grade}
          type="button"
          onClick={() => onChange(g.grade)}
          className={cn(
            'w-9 h-9 rounded-lg text-sm font-bold border transition-all',
            value === g.grade
              ? g.points >= 8 ? 'bg-emerald-600 text-white border-emerald-600'
                : g.points >= 6 ? 'bg-amber-500 text-white border-amber-500'
                : g.points > 0 ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-red-600 text-white border-red-600'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          {g.grade}
        </button>
      ))}
    </div>
  )
}

function SGPACalculator() {
  const [subjects, setSubjects] = useState<SGPASubject[]>([emptySubject(), emptySubject(), emptySubject()])
  const sgpa = calculateSGPA(subjects.filter(s => s.name && s.credits > 0))

  const update = (i: number, field: keyof SGPASubject, value: any) => {
    setSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  const add = () => setSubjects(prev => [...prev, emptySubject()])
  const remove = (i: number) => setSubjects(prev => prev.filter((_, idx) => idx !== i))
  const reset = () => setSubjects([emptySubject(), emptySubject(), emptySubject()])

  const gradeMap = Object.fromEntries(GRADE_POINTS.map(g => [g.grade, g.points]))
  const totalCredits = subjects.filter(s => s.name).reduce((a, s) => a + s.credits, 0)

  return (
    <div className="space-y-6">
      {/* Result */}
      <Card className={cn('border-2 text-center p-8', sgpa >= 8 ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : sgpa >= 6 ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'border-border')}>
        <div className={cn('text-6xl font-black mb-2 tabular-nums', sgpa >= 8 ? 'text-emerald-600' : sgpa >= 6 ? 'text-amber-600' : sgpa > 0 ? 'text-orange-600' : 'text-muted-foreground')}>
          {sgpa > 0 ? sgpa.toFixed(2) : '—'}
        </div>
        <div className="text-xl font-semibold mb-1">SGPA</div>
        <div className="text-sm text-muted-foreground">{totalCredits} total credits · {subjects.filter(s => s.name).length} subjects</div>
        {sgpa >= 9 && <Badge className="mt-3 bg-emerald-600">Outstanding!</Badge>}
        {sgpa >= 8 && sgpa < 9 && <Badge className="mt-3 bg-blue-600">Excellent</Badge>}
        {sgpa >= 7 && sgpa < 8 && <Badge className="mt-3 bg-amber-600">Good</Badge>}
        {sgpa >= 6 && sgpa < 7 && <Badge variant="warning" className="mt-3">Average</Badge>}
        {sgpa > 0 && sgpa < 6 && <Badge variant="destructive" className="mt-3">Below Average</Badge>}
      </Card>

      {/* Subjects */}
      <div className="space-y-3">
        <AnimatePresence>
          {subjects.map((sub, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2">{i + 1}</span>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-3">
                      <Input
                        placeholder={`Subject ${i + 1} name`}
                        value={sub.name}
                        onChange={e => update(i, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground flex-shrink-0">Credits:</span>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={sub.credits}
                          onChange={e => update(i, 'credits', parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <GradeSelector value={sub.grade} onChange={v => update(i, 'grade', v)} />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Points: <strong>{gradeMap[sub.grade] ?? 0}</strong>
                          {sub.name && <> · Weighted: <strong>{((gradeMap[sub.grade] ?? 0) * sub.credits).toFixed(0)}</strong></>}
                        </span>
                      </div>
                    </div>
                  </div>
                  {subjects.length > 1 && (
                    <button onClick={() => remove(i)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={add} className="gap-2"><Plus className="h-4 w-4" />Add Subject</Button>
        <Button variant="ghost" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" />Reset</Button>
      </div>
    </div>
  )
}

interface CGPASem { id: number; sgpa: number; credits: number }

function CGPACalculator() {
  const [sems, setSems] = useState<CGPASem[]>([
    { id: 1, sgpa: 0, credits: 25 },
    { id: 2, sgpa: 0, credits: 25 },
  ])
  const validSems = sems.filter(s => s.sgpa > 0 && s.credits > 0)
  const cgpa = calculateCGPA(validSems)

  const update = (id: number, field: 'sgpa' | 'credits', v: number) =>
    setSems(prev => prev.map(s => s.id === id ? { ...s, [field]: v } : s))
  const add = () => setSems(prev => [...prev, { id: Date.now(), sgpa: 0, credits: 25 }])
  const remove = (id: number) => setSems(prev => prev.filter(s => s.id !== id))

  return (
    <div className="space-y-6">
      <Card className={cn('border-2 text-center p-8', cgpa >= 8 ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border')}>
        <div className={cn('text-6xl font-black mb-2 tabular-nums', cgpa >= 8 ? 'text-emerald-600' : cgpa >= 6 ? 'text-amber-600' : cgpa > 0 ? 'text-orange-600' : 'text-muted-foreground')}>
          {cgpa > 0 ? cgpa.toFixed(2) : '—'}
        </div>
        <div className="text-xl font-semibold">CGPA</div>
        <div className="text-sm text-muted-foreground mt-1">{validSems.length} semester{validSems.length !== 1 ? 's' : ''} · {validSems.reduce((a, s) => a + s.credits, 0)} total credits</div>
      </Card>

      <div className="space-y-3">
        {sems.map((sem, i) => (
          <Card key={sem.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-sm w-20 flex-shrink-0">Sem {i + 1}</div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm text-muted-foreground flex-shrink-0">SGPA:</label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.01}
                  placeholder="0.00"
                  value={sem.sgpa || ''}
                  onChange={e => update(sem.id, 'sgpa', parseFloat(e.target.value) || 0)}
                  className="w-24 text-center"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground flex-shrink-0">Credits:</label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={sem.credits}
                  onChange={e => update(sem.id, 'credits', parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
              </div>
              {sems.length > 1 && (
                <button onClick={() => remove(sem.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={add} className="gap-2"><Plus className="h-4 w-4" />Add Semester</Button>
    </div>
  )
}

export default function CalculatorPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <Calculator className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">GPA Calculator</h1>
        <p className="text-muted-foreground">Calculate your SGPA and CGPA using the KIIT grading system</p>
      </div>

      <Tabs defaultValue="sgpa">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="sgpa" className="flex-1">SGPA (per semester)</TabsTrigger>
          <TabsTrigger value="cgpa" className="flex-1">CGPA (overall)</TabsTrigger>
        </TabsList>
        <TabsContent value="sgpa"><SGPACalculator /></TabsContent>
        <TabsContent value="cgpa"><CGPACalculator /></TabsContent>
      </Tabs>

      {/* Grade reference */}
      <Card className="mt-8 p-5">
        <h3 className="font-semibold mb-3 text-sm">KIIT Grade Point Reference</h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {GRADE_POINTS.map(g => (
            <div key={g.grade} className="text-center p-2 rounded-lg bg-muted/50">
              <div className="font-bold text-lg">{g.grade}</div>
              <div className="text-xs text-muted-foreground">{g.points} pts</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
