import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://yelicgqkqerpmmifhewn.supabase.co';
const supabaseKey = 'sb_publishable_8brgEBU1zPSCdl6oVXu6Bg_IHMHwShi';
export const supabase = createClient(supabaseUrl, supabaseKey); 
