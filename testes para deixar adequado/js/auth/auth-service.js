// =======================================================
// HELPGO - SERVIÇO DE AUTENTICAÇÃO E SESSÃO (PHP + SQLite)
// =======================================================

const AuthService = (() => {

    const STORAGE_KEY_USER = "helpgo_user";

    function getUsuarioLocal() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function salvarUsuarioLocal(dados) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dados));
    }

    function removerUsuarioLocal() {
        localStorage.removeItem(STORAGE_KEY_USER);
    }

    /**
     * Obtém os dados do usuário autenticado no backend PHP
     */
    async function obterUsuarioAtual() {
        try {
            const res = await ApiConfig.apiFetch("auth.php?action=me");
            if (res && res.authenticated && res.user) {
                salvarUsuarioLocal(res.user);
                return res.user;
            }
            removerUsuarioLocal();
            return null;
        } catch (err) {
            return getUsuarioLocal();
        }
    }

    /**
     * Realiza o login com email e senha
     */
    async function fazerLogin(email, senha) {
        try {
            const res = await ApiConfig.apiFetch("auth.php?action=login", {
                method: "POST",
                body: { email, senha }
            });

            if (res && res.user) {
                salvarUsuarioLocal(res.user);
                return res.user;
            }
            throw new Error(res.error || "Erro ao realizar login.");
        } catch (err) {
            console.error("[AuthService] Erro no login:", err);
            throw err;
        }
    }

    /**
     * Cadastra um novo cliente
     */
    async function fazerCadastroCliente(dados) {
        try {
            const res = await ApiConfig.apiFetch("auth.php?action=cadastro_cliente", {
                method: "POST",
                body: dados
            });

            if (res && res.user) {
                salvarUsuarioLocal(res.user);
                return res.user;
            }
            throw new Error(res.error || "Erro ao realizar cadastro de cliente.");
        } catch (err) {
            console.error("[AuthService] Erro no cadastro de cliente:", err);
            throw err;
        }
    }

    /**
     * Cadastra um novo prestador de serviço
     */
    async function fazerCadastroPrestador(dados) {
        try {
            const res = await ApiConfig.apiFetch("auth.php?action=cadastro_prestador", {
                method: "POST",
                body: dados
            });

            if (res && res.user) {
                salvarUsuarioLocal(res.user);
                return res.user;
            }
            throw new Error(res.error || "Erro ao realizar cadastro de prestador.");
        } catch (err) {
            console.error("[AuthService] Erro no cadastro de prestador:", err);
            throw err;
        }
    }

    /**
     * Encerra a sessão do usuário
     */
    async function fazerLogout() {
        try {
            await ApiConfig.apiFetch("auth.php?action=logout", { method: "POST" });
        } catch (e) {
            // Silencioso
        } finally {
            removerUsuarioLocal();
            window.location.href = "./login.html?logout=1";
        }
    }

    return {
        getUsuarioLocal,
        salvarUsuarioLocal,
        removerUsuarioLocal,
        obterUsuarioAtual,
        fazerLogin,
        fazerCadastroCliente,
        fazerCadastroPrestador,
        fazerLogout
    };

})();
