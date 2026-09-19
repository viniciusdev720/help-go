// =======================================================
// HELPGO - CONFIGURAÇÃO CENTRAL DO SUPABASE
// =======================================================

const SUPABASE_URL = "https://pewymcmmgzjgjrplxkzt.supabase.co";
const SUPABASE_KEY = "sb_publishable_iSnWdlR3D_tUA_6Y7VhSTA_3_udCP5V";

// Inicializa o cliente Supabase utilizando a CDN com suporte nativo a persistência de sessão e auto-refresh de tokens
const supabaseClient = window.supabase ? window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'helpgo.auth.token_v2',
            storage: window.localStorage
        }
    }
) : null;

if (!supabaseClient) {
    console.warn("[HelpGo] Supabase CDN não carregado. Verifique se o script da CDN foi incluído antes deste arquivo.");
}
