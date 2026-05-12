import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kmwxafpjsitubyzaqtun.supabase.co";

const supabaseAnonKey = "sb_publishable_Zg9tf9UFA6fRpGzUj1Lbfw_LKbD9gl3";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);