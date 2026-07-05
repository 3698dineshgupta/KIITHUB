import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WhatsAppButton({ whatsapp, title }: { whatsapp: string; title: string }) {
  const digits = whatsapp.replace(/[^0-9]/g, '')
  const message = encodeURIComponent(`Hi! I'm interested in your "${title}" listing on KIIT Hub Merchandise.`)
  const href = `https://wa.me/${digits}?text=${message}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Button size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
        <MessageCircle className="h-5 w-5" />Contact on WhatsApp
      </Button>
    </a>
  )
}
