
import { createClient } from '@supabase/supabase-js';

// The Supabase URL and public anonymous key are required to connect to your project.
// It's standard practice to load these from environment variables.
// FIX: Export supabaseUrl to be used for manual fetch calls to Edge Functions.
export const supabaseUrl = "https://ptupseovoscitkogmras.supabase.co";
const supabaseAnonKey = "BmcpCPkQqRwc";

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);