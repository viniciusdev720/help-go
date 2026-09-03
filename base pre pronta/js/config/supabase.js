// =======================================================
// HELPGO - CONFIGURAÇÃO CENTRAL DO SUPABASE
// =======================================================

const SUPABASE_URL = "https://oqfyfnsilmmzcbmapewe.supabase.co";
const SUPABASE_KEY = "sb_publishable_mUJ1JgffI1pgtzZckF4kkw_968BuDfV";

// Inicializa o cliente Supabase utilizando a CDN com suporte nativo a persistência de sessão e auto-refresh de tokens
const supabaseClient = window.supabase ? window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'supabase.auth.token',
            storage: window.localStorage
        }
    }
) : null;

if (!supabaseClient) {
    console.warn("[HelpGo] Supabase CDN não carregado. Verifique se o script da CDN foi incluído antes deste arquivo.");
}
