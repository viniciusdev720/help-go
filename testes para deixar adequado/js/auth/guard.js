// =======================================================
// HELPGO - GUARDIÃO DE ROTAS E AUTORIZAÇÃO (PHP)
// Proteção de páginas privadas e validação de sessão
// =======================================================

const Guard = (() => {

    /**
     * Exige que o usuário esteja autenticado e possua o tipo de perfil correto ('cliente' ou 'prestador').
     * Administrador (testenedfor@gmail.com) tem acesso livre a todas as páginas.
     */
    async function requireAuth(tipoEsperado) {
        try {
            const usuario = await AuthService.obterUsuarioAtual();

            if (!usuario || !usuario.id) {
                _redirecionarLogin("expired");
                return null;
            }

            // Administrador tem acesso global
            if (usuario.is_admin || (usuario.email && usuario.email.toLowerCase() === "testenedfor@gmail.com")) {
                return usuario;
            }

            // Verificar autorização de tipo (Cliente x Prestador)
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
     * Exige acesso exclusivo de Administrador (apenas testenedfor@gmail.com).
     */
    async function requireAdmin() {
        try {
            const usuario = await AuthService.obterUsuarioAtual();

            if (!usuario || !usuario.id) {
                _redirecionarLogin("expired");
                return null;
            }

            const email = (usuario.email || "").toLowerCase().trim();
            if (email !== "testenedfor@gmail.com" && !usuario.is_admin) {
                alert("Acesso Restrito: Apenas a conta de administrador (testenedfor@gmail.com) pode acessar o Painel ADM.");
                if (usuario.tipo === "prestador") {
                    window.location.href = "./tela-prestador.html";
                } else {
                    window.location.href = "./tela-cliente.html";
                }
                return null;
            }

            return usuario;
        } catch (err) {
            console.error("[Guard] Erro na verificação de admin:", err);
            _redirecionarLogin("expired");
            return null;
        }
    }

    /**
     * Utilizado em páginas de login/cadastro para redirecionar se já logado
     */
    async function redirectIfAuthenticated() {
        try {
            const usuario = await AuthService.obterUsuarioAtual();
            if (usuario && usuario.id) {
                if (usuario.email && usuario.email.toLowerCase() === "testenedfor@gmail.com") {
                    window.location.href = "./admin.html";
                } else if (usuario.tipo === "prestador") {
                    window.location.href = "./tela-prestador.html";
                } else {
                    window.location.href = "./tela-cliente.html";
                }
            }
        } catch (e) {
            // Silencioso se não estiver logado
        }
    }

    function _redirecionarLogin(motivo) {
        AuthService.removerUsuarioLocal();
        const param = motivo === "expired" ? "?expired=1" : "";
        window.location.href = "./login.html" + param;
    }

    return {
        requireAuth,
        requireAdmin,
        redirectIfAuthenticated
    };

})();
