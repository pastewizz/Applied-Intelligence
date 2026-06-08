import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null;

export const getSupabase = async () => {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    // Attempt to get from API (for production/Docker)
    const res = await fetch('/api/config');
    if (!res.ok) {
        // If API fails, check if we have environment variables (for local dev)
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (url && key && !url.includes('your-project-id')) {
            console.log("Using local VITE environment variables for Supabase");
            supabaseInstance = createClient(url, key);
            return supabaseInstance;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const config = await res.json();
    if (!config.supabase_url || !config.supabase_anon_key) {
        throw new Error("API returned incomplete Supabase configuration");
    }
    
    console.log("Supabase initialized via backend config");
    supabaseInstance = createClient(config.supabase_url, config.supabase_anon_key);
    return supabaseInstance;
  } catch (err) {
    console.error("Supabase initialization failed:", err.message);
    // Final fallback: try env vars even if fetch didn't throw but returned bad data
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key && !url.includes('your-project-id')) {
        supabaseInstance = createClient(url, key);
        return supabaseInstance;
    }
    return null;
  }
};
