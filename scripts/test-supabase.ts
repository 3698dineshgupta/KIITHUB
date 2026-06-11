import { supabaseUpload, supabaseStream, supabaseDelete } from '../lib/supabase'

console.log("-----------------------------------------")
console.log("Supabase storage client imports resolved successfully!")
console.log("URL:", process.env.SUPABASE_URL)
console.log("Service Key configured:", !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key")
console.log("Bucket:", process.env.SUPABASE_BUCKET)
console.log("-----------------------------------------")
