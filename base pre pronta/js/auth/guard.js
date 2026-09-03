// =======================================================
// HELPGO - GUARDIÃO DE ROTAS E AUTORIZAÇÃO (Guard)
// Proteção de páginas privadas e validação de sessão em tempo real
// =======================================================

const Guard = (() => {

    /**
     * Exige que o usuário esteja autenticado e possua o tipo de perfil correto ('cliente' ou 'prestador').
     * Se não autenticado ou expirado -> redireciona para login.html.
     * Se perfil incompatível -> redireciona para a página apropriada.
     */
    async function requireAuth(tipoEsperado) {
        if (!supabaseClient) {
            console.warn("[Guard] SupabaseClient não disponível.");
            _redirecionarLogin("error");
            return null;
        }

        try {
            // 1. Obter sessão atual do Supabase
            const { data: { session }, error } = await supabaseClient.auth.getSession();

            if (error || !session || !session.user) {
                console.warn("[Guard] Sessão ausente ou expirada.");
                _redirecionarLogin("expired");
                return null;
            }

            // 2. Tentar renovação se o token estiver próximo de expirar
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            if (expiresAt && (expiresAt - now) < 60) {
                try {
                    await supabaseClient.auth.refreshSession();
                } catch (e) {
                    console.warn("[Guard] Erro ao renovar sessão:", e);
                }
            }

            // 3. Obter dados validados do usuário
            const usuario = await AuthService.obterUsuarioAtual();

            if (!usuario || !usuario.id) {
                _redirecionarLogin("expired");
                return null;
            }

            // 4. Verificar autorização de tipo (Cliente x Prestador)
            if (tipoEsperado) {
                const tipoUsuario = (usuario.tipo || "cliente").toLowerCase();
                const tipoReq = tipoEsperado.toLowerCase();

                if (tipoUsuario !== tipoReq) {
                    console.warn(`[Guard] Acesso negado: Usuário '${tipoUsuario}' tentou acessar área de '${tipoReq}'.`);
                    if (tipoUsuario === "prestador") {
                        window.location.href = "./tela-prestador.html?msg=unauthorized";
                    } else {
                        window.location.href = "./tela-cliente.html?msg=unauthorized";
                    }
                    return null;
                }
            }

            return usuario;

        } catch (err) {
            console.error("[Guard] Erro na verificação de autenticação:", err);
            _redirecionarLogin("expired");
            return null;
        }
    }

    /**
     * Utilizado em páginas públicas/auth (login.html, cadastro, etc).
     * Se o usuário já possuir sessão ativa, redireciona diretamente para seu painel.
     */
    async function redirectIfAuthenticated() {
        if (!supabaseClient) return;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const usuario = await AuthService.obterUsuarioAtual();
                if (usuario) {
                    if (usuario.tipo === "prestador") {
                        window.location.href = "./tela-prestador.html";
                    } else {
                        window.location.href = "./tela-cliente.html";
                    }
                }
            }
        } catch (e) {
            // Silencioso se não estiver logado
        }
    }

    /**
     * Redireciona para login.html com o parâmetro apropriado
     */
    function _redirecionarLogin(motivo) {
        AuthService.removerUsuarioLocal();
        const param = motivo === "expired" ? "?expired=1" : "";
        window.location.href = "./login.html" + param;
    }

    /**
     * Invalida visualização ao navegar pelo histórico (botão Voltar do navegador)
     */
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            // Se a página foi carregada do cache do navegador, re-verificar sessão
            const pathname = window.location.pathname;
            if (pathname.includes("tela-cliente.html")) {
                requireAuth("cliente");
            } else if (pathname.includes("tela-prestador.html")) {
                requireAuth("prestador");
            }
        }
    });

    /**
     * Ouve mudanças globais de estado de autenticação
     */
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                const pathname = window.location.pathname;
                if (pathname.includes("tela-cliente.html") || pathname.includes("tela-prestador.html")) {
                    window.location.href = "./login.html?logout=1";
                }
            }
        });
    }

    return {
        requireAuth,
        redirectIfAuthenticated
    };

})();
