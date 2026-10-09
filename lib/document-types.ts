import { SuggestionItem } from '@/lib/recommendations'
import { SubjectDocumentGroup } from '@/lib/subject-documents'

export interface DocumentMeta {
  contentType: string
  title: string
  description?: string | null
  isPremium: boolean
  isMostExpected?: boolean
  viewCount: number
  fileSize: number | null
  totalPages?: number | null
  createdAt: string | Date
  subject: { name: string }
  branch: { shortName: string }
  semester: { number: number }
  tags?: { tag: string }[]
}

export interface DocumentDetail {
  type: 'note' | 'pyq'
  slug: string
  title: string
  isPremium: boolean
  totalPages: number | null
  streamUrl: string
  userEmail: string
  meta: DocumentMeta
  suggestions: SuggestionItem[]
  subjectDocuments: SubjectDocumentGroup[]
}

export interface DocumentGateResponse {
  premiumGate: true
  type: 'note' | 'pyq'
  slug: string
  title: string
}
