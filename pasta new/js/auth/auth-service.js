// =======================================================
// HELPGO - SERVIÇO DE AUTENTICAÇÃO E SESSÃO
// Suporta três tipos de usuário: cliente, prestador, admin
// A verificação de admin é feita contra a tabela 'admins' no banco,
// não confiando somente no localStorage.
// =======================================================

const AuthService = (() => {

    const STORAGE_KEY_USER = "helpgo_user";

    /**
     * Retorna o usuário logado atualmente no localStorage ou null
     */
    function getUsuarioLocal() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Salva as informações básicas do usuário no localStorage.
     * NUNCA confie apenas neste dado para autorização — sempre valide no banco.
     */
    function salvarUsuarioLocal(dados) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dados));
    }

    /**
     * Remove o usuário do localStorage
     */
    function removerUsuarioLocal() {
        localStorage.removeItem(STORAGE_KEY_USER);
    }

    /**
     * Verifica no banco se o UID pertence a um administrador.
     * Esta é a verificação segura — não depende de localStorage.
     * Retorna true se for admin, false caso contrário.
     */
    async function _verificarSeAdmin(uid, authEmail = null) {
        if (!supabaseClient || !uid) return false;
        try {
            const { data, error } = await supabaseClient
                .from("admins")
                .select("id, email, ativo")
                .eq("id", uid)
                .maybeSingle();

            if (error) {
                console.warn("[AuthService] Aviso ao verificar tabela admins:", error.message);
                return false;
            }

            // Validar presença na tabela, email correto e status ativo
            if (data && data.ativo === true) {
                // Se o email do Auth foi passado, valida se corresponde ao esperado e ao banco
                if (authEmail && (authEmail !== "admin@helpgo.com" || data.email !== "admin@helpgo.com")) {
                    return false;
                }
                return true;
            }
            return false;
        } catch (e) {
            console.warn("[AuthService] Erro ao verificar admins:", e);
            return false;
        }
    }

    /**
     * Resolve o tipo do usuário de forma segura:
     * 1. Verifica tabela 'admins' (prioridade máxima)
     * 2. Verifica tabela 'usuarios' (tipo salvo no cadastro)
     * 3. Verifica tabela 'prestadores'
     * 4. Fallback: 'cliente'
     */
    async function _resolverTipo(uid, metaTipo, authEmail = null) {
        // Verificação absoluta pelo e-mail exigida
        if (authEmail && authEmail.toLowerCase() === "admin@helpgo.com") {
            return "admin";
        }

        // 1. Verificação segura de admin via banco
        const isAdmin = await _verificarSeAdmin(uid, authEmail);
        if (isAdmin) return "admin";

        // 2. Tipo salvo nos metadados do Supabase Auth
        if (metaTipo && metaTipo !== "admin") return metaTipo;

        // 3. Consultar tabela usuarios
        try {
            const { data: dbUser } = await supabaseClient
                .from("usuarios")
                .select("tipo, nome")
                .eq("id", uid)
                .maybeSingle();
            if (dbUser?.tipo && dbUser.tipo !== "admin") return dbUser.tipo;
        } catch (e) {
            console.warn("[AuthService] Aviso ao buscar tabela usuarios:", e);
        }

        // 4. Verificar se é prestador pela tabela prestadores
        try {
            const { data: dbPrest } = await supabaseClient
                .from("prestadores")
                .select("id")
                .eq("id", uid)
                .maybeSingle();
            if (dbPrest) return "prestador";
        } catch (e) {
            console.warn("[AuthService] Aviso ao buscar prestadores:", e);
        }

        return "cliente";
    }

    /**
     * Obtém o usuário autenticado diretamente da sessão ativa do Supabase.
     * Sempre valida o tipo no banco — nunca confia apenas no localStorage.
     */
    async function obterUsuarioAtual() {
        if (!supabaseClient) return getUsuarioLocal();

        try {
            const { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession();
            if (sessionErr || !session || !session.user) {
                return getUsuarioLocal();
            }

            const authUser = session.user;
            const meta = authUser.user_metadata || {};
            const metaTipo = meta.tipo || null;
            let nome = meta.nome || authUser.email?.split("@")[0] || "Usuário";

            // Resolver tipo de forma segura consultando o banco
            const tipo = await _resolverTipo(authUser.id, metaTipo, authUser.email);

            let telefone = meta.telefone || "";
            let cpf = meta.cpf || "";

            // Buscar dados reais do banco
            try {
                const { data: dbUser } = await supabaseClient
                    .from("usuarios")
                    .select("nome, telefone, cpf")
                    .eq("id", authUser.id)
                    .maybeSingle();
                
                if (dbUser) {
                    if (dbUser.nome) nome = dbUser.nome;
                    if (dbUser.telefone) telefone = dbUser.telefone;
                    if (dbUser.cpf) cpf = dbUser.cpf;
                }
            } catch (e) { /* silencioso */ }

            const info = {
                id: authUser.id,
                email: authUser.email,
                nome: nome,
                tipo: tipo,
                telefone: telefone,
                cpf: cpf
            };

            salvarUsuarioLocal(info);
            return info;
        } catch (err) {
            console.error("[AuthService] Erro ao obter usuário atual:", err);
            return getUsuarioLocal();
        }
    }

    /**
     * Realiza o login com email e senha.
     * Identifica automaticamente o tipo de usuário consultando o banco.
     */
    async function fazerLogin(email, senha) {
        if (!supabaseClient) {
            throw new Error("Conexão com o servidor não estabelecida.");
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        const user = data.user;
        const meta = user.user_metadata || {};
        const metaTipo = meta.tipo || null;
        let nome = meta.nome || user.email?.split("@")[0] || "Usuário";

        // Resolver tipo consultando banco (inclui verificação de admin)
        const tipo = await _resolverTipo(user.id, metaTipo, user.email);

        let telefone = meta.telefone || "";
        let cpf = meta.cpf || "";

        // Buscar dados reais
        try {
            const { data: dbUser } = await supabaseClient
                .from("usuarios")
                .select("nome, telefone, cpf")
                .eq("id", user.id)
                .maybeSingle();
            
            if (dbUser) {
                if (dbUser.nome) nome = dbUser.nome;
                if (dbUser.telefone) telefone = dbUser.telefone;
                if (dbUser.cpf) cpf = dbUser.cpf;
            } else if (tipo === "admin") {
                nome = "Administrador HelpGo";
            }
        } catch (e) { /* silencioso */ }

        const usuarioInfo = {
            id: user.id,
            email: user.email,
            nome: nome,
            tipo: tipo,
            telefone: telefone,
            cpf: cpf
        };

        salvarUsuarioLocal(usuarioInfo);
        return usuarioInfo;
    }

    /**
     * Encerra a sessão atual no Supabase e limpa o localStorage
     */
    async function fazerLogout() {
        const usuario = getUsuarioLocal();

        // Marcar prestador como offline ao sair
        if (usuario && usuario.tipo === "prestador" && supabaseClient && usuario.id) {
            try {
                await supabaseClient
                    .from("prestadores")
                    .update({ ativo: false, status: "offline" })
                    .eq("id", usuario.id);
            } catch (e) {
                console.warn("[AuthService] Aviso ao marcar prestador offline no logout:", e);
            }
        }

        if (supabaseClient) {
            try {
                await supabaseClient.auth.signOut();
            } catch (err) {
                console.warn("[AuthService] Erro ao deslogar do Supabase:", err);
            }
        }

        removerUsuarioLocal();
        // Redirecionar para login.html independentemente do diretório atual
        const isInPages = window.location.pathname.includes("/pages/");
        window.location.href = isInPages ? "./login.html?logout=1" : "./pages/login.html?logout=1";
    }

    return {
        getUsuarioLocal,
        salvarUsuarioLocal,
        removerUsuarioLocal,
        obterUsuarioAtual,
        fazerLogin,
        fazerLogout,
        verificarSeAdmin: _verificarSeAdmin
    };

})();
