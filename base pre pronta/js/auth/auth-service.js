// =======================================================
// HELPGO - SERVIÇO DE AUTENTICAÇÃO E SESSÃO
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
     * Salva as informações básicas do usuário no localStorage
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
     * Obtém o usuário autenticado diretamente da sessão ativa do Supabase
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

            let tipo = meta.tipo || null;
            let nome = meta.nome || authUser.email?.split("@")[0] || "Usuário";

            // Se não encontrar no metadata, consulta na tabela usuarios
            if (!tipo && authUser.id) {
                try {
                    const { data: dbUser } = await supabaseClient
                        .from("usuarios")
                        .select("tipo, nome")
                        .eq("id", authUser.id)
                        .maybeSingle();

                    if (dbUser) {
                        if (dbUser.tipo) tipo = dbUser.tipo;
                        if (dbUser.nome) nome = dbUser.nome;
                    }
                } catch (e) {
                    console.warn("[AuthService] Aviso ao buscar tabela usuarios:", e);
                }
            }

            // Se ainda não souber o tipo, verifica na tabela prestadores
            if (!tipo && authUser.id) {
                try {
                    const { data: dbPrest } = await supabaseClient
                        .from("prestadores")
                        .select("id")
                        .eq("id", authUser.id)
                        .maybeSingle();

                    if (dbPrest) tipo = "prestador";
                } catch (e) {
                    console.warn("[AuthService] Aviso ao buscar prestadores:", e);
                }
            }

            const info = {
                id: authUser.id,
                email: authUser.email,
                nome: nome,
                tipo: tipo || "cliente",
                telefone: meta.telefone || "",
                cpf: meta.cpf || ""
            };

            salvarUsuarioLocal(info);
            return info;
        } catch (err) {
            console.error("[AuthService] Erro ao obter usuário atual:", err);
            return getUsuarioLocal();
        }
    }

    /**
     * Realiza o login com email e senha e retorna as informações do usuário
     */
    async function fazerLogin(email, senha) {
        if (!supabaseClient) {
            throw new Error("Conexão com o servidor não estabelecida.");
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            throw error;
        }

        const user = data.user;
        const meta = user.user_metadata || {};
        let tipo = meta.tipo || null;
        let nome = meta.nome || user.email?.split("@")[0] || "Usuário";

        if (!tipo && user.id) {
            try {
                const { data: dbUser } = await supabaseClient
                    .from("usuarios")
                    .select("tipo, nome")
                    .eq("id", user.id)
                    .maybeSingle();

                if (dbUser) {
                    if (dbUser.tipo) tipo = dbUser.tipo;
                    if (dbUser.nome) nome = dbUser.nome;
                }
            } catch (e) {
                console.warn("[AuthService] Aviso ao verificar usuarios:", e);
            }
        }

        if (!tipo && user.id) {
            try {
                const { data: dbPrest } = await supabaseClient
                    .from("prestadores")
                    .select("id")
                    .eq("id", user.id)
                    .maybeSingle();

                if (dbPrest) tipo = "prestador";
            } catch (e) {
                console.warn("[AuthService] Aviso ao verificar prestadores:", e);
            }
        }

        if (!tipo) tipo = "cliente";

        const usuarioInfo = {
            id: user.id,
            email: user.email,
            nome: nome,
            tipo: tipo
        };

        salvarUsuarioLocal(usuarioInfo);
        return usuarioInfo;
    }

    /**
     * Encerra a sessão atual no Supabase e limpa o localStorage
     */
    async function fazerLogout() {
        if (supabaseClient) {
            try {
                await supabaseClient.auth.signOut();
            } catch (err) {
                console.warn("[AuthService] Erro ao deslogar do Supabase:", err);
            }
        }
        removerUsuarioLocal();
        window.location.href = "./login.html?logout=1";
    }

    return {
        getUsuarioLocal,
        salvarUsuarioLocal,
        removerUsuarioLocal,
        obterUsuarioAtual,
        fazerLogin,
        fazerLogout
    };

})();
