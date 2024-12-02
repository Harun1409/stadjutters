import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://knjzfxzobmujjzmtdwnf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuanpmeHpvYm11amp6bXRkd25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4MjI2NDMsImV4cCI6MjA0ODM5ODY0M30.qEgOA0DsY3cHZzRyOFNWdMS-NWQPN57BeOJt_6TMp3A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})