// FIX: Removed the failing triple-slash directive and added manual type definitions for import.meta.env.
// This resolves TypeScript errors when Vite's client types are not found in the project configuration.
interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
}

// FIX: Correctly augment the global `ImportMeta` type from within a module
// by using `declare global`. The previous implementation was incorrect as it
// defined a new `ImportMeta` interface in the local module scope.
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

import { createClient } from '@supabase/supabase-js';

// These environment variables are exposed to the browser by Vite.
// They must be prefixed with VITE_ in your .env file.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided in your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
