// =======================================================
// HELPGO - GUARDIÃO DE ROTAS E AUTORIZAÇÃO (Guard)
// Suporta: cliente, prestador, admin
// A validação de tipo SEMPRE consulta o banco via AuthService.
// =======================================================

const Guard = (() => {

    // Mapeamento de tipo → página de redirecionamento (relativo a /pages/)
    const PAGINA_POR_TIPO = {
        cliente:   "./tela-cliente.html",
        prestador: "./tela-prestador.html",
        admin:     "./admin.html"
    };

    /**
     * Exige que o usuário esteja autenticado e possua o tipo correto.
     * - Sem sessão válida → redireciona para login.html
     * - Tipo incompatível → redireciona para a página correta do usuário
     * @param {string} tipoEsperado - 'cliente' | 'prestador' | 'admin'
     */
    async function requireAuth(tipoEsperado) {
        if (!supabaseClient) {
            console.warn("[Guard] SupabaseClient não disponível.");
            _redirecionarLogin("error");
            return null;
        }

        try {
            // 1. Verificar sessão ativa no Supabase
            const { data: { session }, error } = await supabaseClient.auth.getSession();

            if (error || !session || !session.user) {
                console.warn("[Guard] Sessão ausente ou expirada.");
                _redirecionarLogin("expired");
                return null;
            }

            // 2. Renovar token se estiver próximo do vencimento
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            if (expiresAt && (expiresAt - now) < 60) {
                try {
                    await supabaseClient.auth.refreshSession();
                } catch (e) {
                    console.warn("[Guard] Erro ao renovar sessão:", e);
                }
            }

            // 3. Obter dados validados do usuário (consulta o banco para o tipo)
            const usuario = await AuthService.obterUsuarioAtual();

            if (!usuario || !usuario.id) {
                _redirecionarLogin("expired");
                return null;
            }

            // 4. Verificar se o tipo bate com o esperado para esta página
            if (tipoEsperado) {
                const tipoUsuario = (usuario.tipo || "cliente").toLowerCase();
                const tipoReq = tipoEsperado.toLowerCase();

                if (tipoUsuario !== tipoReq) {
                    console.warn(`[Guard] Acesso negado: '${tipoUsuario}' tentou acessar área de '${tipoReq}'.`);
                    const destino = PAGINA_POR_TIPO[tipoUsuario] || "./tela-cliente.html";
                    window.location.href = destino + "?msg=unauthorized";
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
     * Se o usuário já possuir sessão ativa, redireciona para seu painel.
     */
    async function redirectIfAuthenticated() {
        if (!supabaseClient) return;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const usuario = await AuthService.obterUsuarioAtual();
                if (usuario) {
                    const destino = PAGINA_POR_TIPO[usuario.tipo] || "./tela-cliente.html";
                    window.location.href = destino;
                }
            }
        } catch (e) {
            // Silencioso — usuário não está logado
        }
    }

    /**
     * Redireciona para login.html com o parâmetro de motivo
     */
    function _redirecionarLogin(motivo) {
        AuthService.removerUsuarioLocal();
        let param = "";
        if (motivo === "expired") param = "?expired=1";
        else if (motivo === "unauthorized") param = "?msg=unauthorized";
        else if (motivo === "error") param = "?expired=1";
        window.location.href = "./login.html" + param;
    }

    /**
     * Invalida a exibição ao navegar pelo histórico (botão Voltar do navegador).
     * Re-verifica a sessão para todas as páginas protegidas.
     */
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            const pathname = window.location.pathname;
            if (pathname.includes("tela-cliente.html")) {
                requireAuth("cliente");
            } else if (pathname.includes("tela-prestador.html")) {
                requireAuth("prestador");
            } else if (pathname.includes("admin.html")) {
                requireAuth("admin");
            }
        }
    });

    /**
     * Ouve mudanças globais de estado de autenticação.
     * Se o usuário for deslogado, redireciona automaticamente.
     */
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                const pathname = window.location.pathname;
                const paginasProtegidas = ["tela-cliente.html", "tela-prestador.html", "admin.html"];
                if (paginasProtegidas.some(p => pathname.includes(p))) {
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
