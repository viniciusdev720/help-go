// Autenticação pelo Supabase Auth; perfis privados em clientes e prestador.
const AuthService = (() => {
    const STORAGE_KEY_USER = "helpgo_user";
    let versaoPerfis;

    function getUsuarioLocal() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || "null"); }
        catch { return null; }
    }

    function salvarUsuarioLocal(dados) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dados));
    }

    function removerUsuarioLocal() {
        localStorage.removeItem(STORAGE_KEY_USER);
    }

    // Compatibilidade temporária enquanto separar-perfis.sql não foi aplicado.
    // Erros de rede/permissão nunca são interpretados como esquema antigo.
    async function perfisSeparadosAtivos() {
        if (!supabaseClient) throw new Error("Conexão com o servidor não estabelecida.");
        if (versaoPerfis !== undefined) return versaoPerfis;
        const { data, error } = await supabaseClient.rpc("helpgo_versao_perfis");
        if (error) {
            if (error.code === "PGRST202") return (versaoPerfis = false);
            throw error;
        }
        return (versaoPerfis = data === 2);
    }

    async function _verificarSeAdmin(uid, authEmail = null) {
        if (!supabaseClient || !uid) return false;
        let resultado = await supabaseClient.from("admins")
            .select("usuario_id, email, ativo").eq("usuario_id", uid).maybeSingle();
        if (["42703", "PGRST204"].includes(resultado.error?.code)) {
            resultado = await supabaseClient.from("admins")
                .select("id, email, ativo").eq("id", uid).maybeSingle();
        }
        if (resultado.error) throw resultado.error;
        const admin = resultado.data;
        return Boolean(admin?.ativo && (!authEmail ||
            (authEmail === "admin@helpgo.com" && admin.email === authEmail)));
    }

    async function _montarUsuario(authUser) {
        const isAdmin = await _verificarSeAdmin(authUser.id, authUser.email);
        let tipo;
        let perfil;
        if (isAdmin) {
            tipo = "admin";
            perfil = { nome: "Administrador HelpGo" };
        } else if (await perfisSeparadosAtivos()) {
            const resultados = await Promise.all([
                supabaseClient.from("clientes").select("nome, email, telefone, cpf")
                    .eq("id", authUser.id).maybeSingle(),
                supabaseClient.from("prestador").select("nome, email, telefone, cpf")
                    .eq("id", authUser.id).maybeSingle()
            ]);
            for (const resultado of resultados) {
                if (resultado.error) throw resultado.error;
            }
            const [cliente, prestador] = resultados.map(r => r.data);
            if (Boolean(cliente) === Boolean(prestador)) {
                throw new Error("Seu perfil de acesso não foi encontrado ou está inconsistente. Contate o suporte.");
            }
            tipo = cliente ? "cliente" : "prestador";
            perfil = cliente || prestador;
        } else {
            const { data, error } = await supabaseClient.from("usuarios")
                .select("tipo, nome, telefone, cpf").eq("id", authUser.id).maybeSingle();
            if (error) throw error;
            if (!data || !["cliente", "prestador"].includes(data.tipo)) {
                throw new Error("Seu perfil de acesso não foi encontrado. Contate o suporte.");
            }
            tipo = data.tipo;
            perfil = data;
        }
        const usuario = {
            id: authUser.id,
            email: authUser.email,
            nome: perfil.nome || "Usuário",
            tipo,
            telefone: perfil.telefone || "",
            cpf: perfil.cpf || ""
        };
        salvarUsuarioLocal(usuario);
        return usuario;
    }

    async function obterUsuarioAtual() {
        if (!supabaseClient) {
            removerUsuarioLocal();
            return null;
        }
        try {
            const { data, error } = await supabaseClient.auth.getUser();
            if (error || !data.user) {
                removerUsuarioLocal();
                return null;
            }
            return await _montarUsuario(data.user);
        } catch (error) {
            removerUsuarioLocal();
            console.error("[AuthService] Erro ao consultar perfil:", error);
            return null;
        }
    }

    async function fazerLogin(email, senha) {
        if (!supabaseClient) throw new Error("Conexão com o servidor não estabelecida.");
        removerUsuarioLocal();
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email, password: senha
        });
        if (error) throw error;
        try {
            return await _montarUsuario(data.user);
        } catch (error) {
            await supabaseClient.auth.signOut();
            removerUsuarioLocal();
            throw error;
        }
    }

    async function fazerLogout() {
        const usuario = getUsuarioLocal();
        if (usuario?.tipo === "prestador" && supabaseClient && usuario.id) {
            try {
                await supabaseClient.from("prestadores")
                    .update({ ativo: false, atualizado_em: new Date().toISOString() })
                    .eq("id", usuario.id);
            } catch (error) {
                console.warn("[AuthService] Erro ao marcar prestador offline:", error);
            }
        }
        if (supabaseClient) {
            try { await supabaseClient.auth.signOut(); }
            catch (error) { console.warn("[AuthService] Erro ao sair:", error); }
        }
        removerUsuarioLocal();
        window.location.href = window.location.pathname.includes("/pages/")
            ? "./login.html?logout=1" : "./pages/login.html?logout=1";
    }

    return {
        getUsuarioLocal, salvarUsuarioLocal, removerUsuarioLocal,
        obterUsuarioAtual, fazerLogin, fazerLogout, perfisSeparadosAtivos,
        verificarSeAdmin: _verificarSeAdmin
    };
})();