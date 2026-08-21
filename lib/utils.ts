import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function slugify(t: string) { return t.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim() }
export function formatBytes(b: number) { if(!b) return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${s[i]}` }
export function formatDate(d: Date|string) { return new Date(d).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'}) }
export function formatRelativeTime(d: Date|string) { const diff=(Date.now()-new Date(d).getTime())/60000; if(diff<1)return 'just now'; if(diff<60)return `${Math.floor(diff)}m ago`; if(diff<1440)return `${Math.floor(diff/60)}h ago`; if(diff<43200)return `${Math.floor(diff/1440)}d ago`; return formatDate(d) }
export function isPremiumActive(status: string, expiry?: Date|null) { return status==='PREMIUM' && !!expiry && new Date(expiry)>new Date() }
export function daysLeft(expiry?: Date|null) { if(!expiry) return 0; return Math.max(0,Math.ceil((new Date(expiry).getTime()-Date.now())/(86400000))) }
export function formatDuration(totalSec: number) { if(!totalSec||totalSec<60) return '<1m'; const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60); return h>0 ? `${h}h ${m}m` : `${m}m` }
// Matches app/api/presence/heartbeat/route.ts's 30s beat interval: 3 missed
// beats of slack for network jitter/backgrounding before reading "offline".
export function isOnline(lastActiveAt?: Date|string|null) { if(!lastActiveAt) return false; return Date.now()-new Date(lastActiveAt).getTime() < 90_000 }
