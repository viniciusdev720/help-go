const SUPABASE_URL = "https://oqfyfnsilmmzcbmapewe.supabase.co";
const SUPABASE_KEY = "sb_publishable_mUJ1JgffI1pgtzZckF4kkw_968BuDfV";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
console.log("Supabase conectado!");