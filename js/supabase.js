const SUPABASE_URL = "https://oqfyfnsilmmzcbmapewe.supabase.co";

const SUPABASE_KEY = "sb_publishable_mUJ1JgffI1pgtzZckF4kkw_968BuDfV";

// Inicializa o cliente Supabase utilizando a CDN
const supabaseClient = window.supabase ? window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
) : null;
