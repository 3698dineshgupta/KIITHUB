export const CATEGORY_LABELS: Record<string, string> = {
  ELECTRONICS: 'Electronics',
  BOOKS_NOTES: 'Books & Notes',
  COOKING_APPLIANCES: 'Cooking Appliances',
  CYCLES: 'Cycles',
  FURNITURE: 'Furniture',
  CLOTHING: 'Clothing',
  SPORTS_FITNESS: 'Sports & Fitness',
  STATIONERY: 'Stationery',
  OTHER: 'Other',
}

export const CATEGORY_COLORS: Record<string, string> = {
  ELECTRONICS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BOOKS_NOTES: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COOKING_APPLIANCES: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CYCLES: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FURNITURE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CLOTHING: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  SPORTS_FITNESS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  STATIONERY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  OTHER: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
export const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))

export interface MerchImageSummary { id: string; url: string }

export interface MerchListingSummary {
  id: string
  slug: string
  title: string
  price: number
  isNegotiable: boolean
  category: string
  condition: string
  status: string
  location: string | null
  rejectionReason: string | null
  createdAt: Date | string
  images: MerchImageSummary[]
  seller?: { name: string } | null
}
