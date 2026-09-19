// Consultas de prestadores alinhadas ao esquema atual do Supabase.
const PrestadoresService = (() => {
    async function garantirPerfilPrestadorAtual() {
        if (!supabaseClient) throw new Error("Conexão com o banco indisponível.");
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData.user) throw new Error("Sua sessão expirou.");
        const { data, error } = await supabaseClient.from("prestadores").select("id")
            .eq("id", authData.user.id).maybeSingle();
        if (error) throw error;
        if (data) return data;

        // Corrige contas antigas que já existem em usuarios como prestador,
        // mas ficaram sem a linha correspondente em prestadores.
        const { data: usuario, error: usuarioErro } = await supabaseClient.from("usuarios")
            .select("id, tipo").eq("id", authData.user.id).maybeSingle();
        if (usuarioErro) throw usuarioErro;
        if (!usuario || usuario.tipo !== "prestador") return null;

        const { data: criado, error: criarErro } = await supabaseClient.from("prestadores")
            .insert({ id: usuario.id, ativo: true }).select("id").single();
        if (criarErro) throw criarErro;
        return criado;
    }

    function consultaBase(id = null) {
        let consulta = supabaseClient.from("prestadores").select(`
            id, bio, descricao, preco, foto_url, ativo,
            usuarios!prestadores_id_fkey (nome, email, telefone, foto_url),
            prestador_servicos (servico_id, servicos (id, nome, descricao))
        `);
        if (id) consulta = consulta.eq("id", id);
        return consulta;
    }

    async function consultarCatalogo(id = null) {
        // O catálogo expõe apenas dados profissionais de contas reais. Os perfis
        // privados e auth.users não podem ser consultados diretamente pelo cliente.
        const { data, error } = await supabaseClient.rpc("helpgo_listar_prestadores", { p_id: id });
        if (!error) return data || [];
        if (error.code !== "PGRST202") throw error;

        // Compatibilidade durante a instalação do catálogo no banco.
        const legado = await consultaBase(id);
        if (legado.error) throw legado.error;
        if (!legado.data?.length || legado.data.some(p => !p.usuarios?.nome)) {
            console.error("[PrestadoresService] Aplicar supabase/catalogo-prestadores.sql no projeto Supabase.");
            throw new Error("A listagem de prestadores ainda precisa ser configurada. Entre em contato com o suporte.");
        }
        return legado.data;
    }

    async function buscarPrestadores(filtro = null) {
        if (!supabaseClient) throw new Error("Conexão com o banco indisponível.");
        const data = await consultarCatalogo();
        let resultado = data.map(transformar);
        if (filtro && filtro !== "todos") {
            const texto = String(filtro).toLowerCase();
            resultado = resultado.filter(p => p.servicos.some(s => String(s.id) === texto || s.nome.toLowerCase().includes(texto)));
        }
        return resultado;
    }

    async function buscarPrestadorPorId(id) {
        if (!supabaseClient || !id) return null;
        const data = await consultarCatalogo(id);
        return data.length ? transformar(data[0]) : null;
    }

    async function atualizarStatus(id, ativo) {
        const { error } = await supabaseClient.from("prestadores")
            .update({ ativo: Boolean(ativo), atualizado_em: new Date().toISOString() }).eq("id", id);
        return !error;
    }

    async function buscarEndereco(id) {
        const { data, error } = await supabaseClient.from("enderecos").select("cidade, estado")
            .eq("usuario_id", id).maybeSingle();
        return error ? null : data;
    }

    async function contarPrestadoresAtivos() { return (await buscarPrestadores()).filter(p => p.ativo).length; }
    async function buscarPrestadoresPorNomeServico(nome) { return buscarPrestadores(nome); }

    function filtrarDisponiveis(prestadores, pedido) {
        const normalizarNome = valor => String(valor || "").normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        const nome = normalizarNome(pedido.servico);
        return prestadores.filter(prestador => prestador.ativo === true &&
            (prestador.servicos || []).some(servico => {
                if (servico.id != null && pedido.servicoId != null) {
                    return String(servico.id) === String(pedido.servicoId);
                }
                return nome !== "" && normalizarNome(servico.nome) === nome;
            }));
    }

    function transformar(raw) {
        const usuario = raw.usuarios || {};
        const servicos = (raw.prestador_servicos || []).map(item => item.servicos).filter(Boolean);
        return {
            id: raw.id, nome: usuario.nome || "Profissional", email: usuario.email || null,
            telefone: raw.telefone || usuario.telefone || null, fotoUrl: raw.foto_url || usuario.foto_url || null,
            especialidade: servicos[0]?.nome || null,
            profissoes: [...new Set(servicos.map(servico => servico.nome).filter(Boolean))].join(", "),
            descricao: raw.bio || raw.descricao || null,
            valor: raw.preco == null ? null : Number(raw.preco), avaliacao: null, totalAvaliacoes: 0,
            servicosRealizados: 0, cidade: null, estado: null, localizacao: null, verificado: false,
            ativo: raw.ativo === true, status: raw.ativo ? "disponivel" : "offline",
            online: raw.ativo === true, servicos
        };
    }

    return { garantirPerfilPrestadorAtual, buscarPrestadores, buscarPrestadorPorId,
        buscarPrestadoresPorNomeServico, atualizarStatus, buscarEndereco, contarPrestadoresAtivos, filtrarDisponiveis };
})();
