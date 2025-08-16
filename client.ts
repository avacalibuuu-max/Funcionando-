import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ServiceRecord = {
  id?: string
  client_name: string
  client_address: string
  client_phone: string
  client_company: string
  service_description: string
  service_value: number
  warranty_months: number
  observations: string
  service_date: string
  created_at?: string
  updated_at?: string
}
