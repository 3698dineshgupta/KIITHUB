'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertCircle, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORY_OPTIONS, CONDITION_OPTIONS } from './merch-constants'

const MAX_IMAGES = 6

interface Props {
  mode?: 'create' | 'edit'
  listingId?: string
  initialData?: {
    title: string
    category: string
    price: number
    condition: string
    description: string
    whatsapp: string
    location: string | null
    isNegotiable: boolean
    images: { url: string }[]
  }
}

export function SellForm({ mode = 'create', listingId, initialData }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [price, setPrice] = useState(initialData ? String(initialData.price) : '')
  const [condition, setCondition] = useState(initialData?.condition ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [isNegotiable, setIsNegotiable] = useState(initialData?.isNegotiable ?? false)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(initialData?.images.map(i => i.url) ?? [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, MAX_IMAGES - images.length)
    setImages(prev => [...prev, ...newFiles].slice(0, MAX_IMAGES))
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))].slice(0, MAX_IMAGES))
  }

  const removeImage = (i: number) => {
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title || !category || !price || !condition || !description || !whatsapp) {
      setError('Please fill in all required fields.')
      return
    }
    if (mode === 'create' && images.length === 0) {
      setError('Please add at least one product image.')
      return
    }

    setLoading(true)
    try {
      const form = new FormData()
      form.append('meta', JSON.stringify({
        title, category, price: Number(price), condition, description, whatsapp,
        location: location || undefined, isNegotiable,
      }))
      images.forEach(f => form.append('images', f))

      const url = mode === 'edit' && listingId ? `/api/merchandise/${listingId}` : '/api/merchandise'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, body: form })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/merchandise/my-listings'), 1200)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium mb-1">{mode === 'edit' ? 'Listing updated!' : 'Listing submitted!'}</p>
        <p className="text-sm text-muted-foreground">It&apos;s pending admin review. Redirecting to your listings…</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm mb-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Seller Name</Label>
          <Input value={session?.user?.name ?? ''} disabled />
        </div>

        <div>
          <Label className="mb-1.5 block">Product Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Study Table with Chair" required maxLength={150} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Price (₹) *</Label>
            <Input type="number" min={1} value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 1500" required />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
              Price is negotiable
            </label>
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Description *</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the item's condition, age, and any other details..."
            required
            maxLength={2000}
            rows={5}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-y"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">WhatsApp Number *</Label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="e.g. 9876543210" required />
          </div>
          <div>
            <Label className="mb-1.5 block">Hostel / Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. KP-7" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Product Images {mode === 'create' && '*'}</Label>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {previews.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="h-6 w-6" />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
          <p className="text-xs text-muted-foreground mt-1.5">Up to {MAX_IMAGES} images, 5 MB each.</p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {mode === 'edit' ? 'Save Changes' : 'Submit for Approval'}
        </Button>
      </form>
    </Card>
  )
}
