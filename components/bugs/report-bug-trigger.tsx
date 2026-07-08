'use client'
import { Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBugReportStore } from '@/store'
import type { ButtonProps } from '@/components/ui/button'

interface ReportBugTriggerProps {
  pageUrl?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  label?: string
}

export function ReportBugTrigger({ pageUrl, variant = 'ghost', size = 'sm', className, label = 'Report a Bug' }: ReportBugTriggerProps) {
  const open = useBugReportStore(s => s.open)
  return (
    <Button type="button" variant={variant} size={size} className={className ? `gap-1.5 ${className}` : 'gap-1.5'} onClick={() => open(pageUrl)}>
      <Bug className="h-4 w-4" />{label}
    </Button>
  )
}
