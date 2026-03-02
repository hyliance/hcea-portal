import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://yelicgqkqerpmmmifhewn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbGljZ3FrcWVycG1taWZoZXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTcxMzQsImV4cCI6MjA4Nzc5MzEzNH0.nlb0kirN0wnZTxfFCYW1Jz7db0ggA6rRBW1L0LZglQ0';
export const supabase = createClient(supabaseUrl, supabaseKey);