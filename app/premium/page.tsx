import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PremiumContent, type PremiumSettings } from '@/components/premium/premium-content'

export const dynamic = 'force-dynamic'

async function getSettings(): Promise<PremiumSettings> {
  const rows = await prisma.setting.findMany().catch(() => [])
  const map = Object.fromEntries(rows.map(s => [s.key, s.value]))

  const premiumFeatures = map.premium_features
    ? map.premium_features.split('\n').map(x => x.trim()).filter(Boolean)
    : []

  return {
    bankQrCode: map.bankQrCode ?? null,
    premiumPrice: map.premium_price ?? null,
    currencySymbol: map.currency_symbol ?? '₹',
    currencyCode: map.currency_code ?? 'INR',
    premiumDays: map.premium_days ?? null,
    upiId: map.upi_id ?? 'pay@kiithub',
    paymentInstructions: map.payment_instructions ?? 'Scan the QR code and pay the amount. Enter transaction ID and upload screenshot.',
    premiumFeatures,
    msgPending: map.message_pending ?? 'Your payment is being verified. Activation within 24 hours.',
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const priceLine = settings.premiumPrice
    ? `Just ${settings.currencySymbol}${settings.premiumPrice} for ${settings.premiumDays ?? 365} days of unlimited access.`
    : 'Unlock unlimited access to premium notes, PYQs, lab manuals and assignments.'
  const description = `Upgrade to KIIT Hub Premium. ${priceLine} Ad-free experience with priority support.`

  return {
    title: 'Premium Membership',
    description,
    alternates: { canonical: '/premium' },
    openGraph: {
      title: 'KIIT Hub Premium — Unlock All Study Materials',
      description,
      url: '/premium',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'KIIT Hub Premium — Unlock All Study Materials',
      description,
    },
  }
}

export default async function PremiumPage() {
  const settings = await getSettings()
  return <PremiumContent settings={settings} />
}
