// =======================================================
// HELPGO - SERVIÇO DE PRESTADORES (tabela 'prestadores')
// Busca prestadores do banco com joins em usuarios, enderecos, prestador_servicos e servicos
// =======================================================

const PrestadoresService = (() => {

    async function garantirPerfilPrestadorAtual() {
        if (!supabaseClient) throw new Error("Conexão com o banco de dados indisponível.");

        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData.user) throw new Error("Sua sessão expirou. Faça login novamente.");

        const usuario = authData.user;
        const meta = usuario.user_metadata || {};
        if (meta.tipo !== "prestador") return null;

        const { data: existente, error: buscaError } = await supabaseClient
            .from("prestadores")
            .select("id")
            .eq("id", usuario.id)
            .maybeSingle();
        if (buscaError) throw buscaError;
        if (existente) return existente;

        const { error: usuarioError } = await supabaseClient.from("usuarios").upsert({
            id: usuario.id,
            nome: meta.nome || usuario.email,
            email: usuario.email,
            telefone: meta.telefone || null,
            cpf: meta.cpf || null,
            tipo: "prestador"
        }, { onConflict: "id" });
        if (usuarioError) throw usuarioError;

        const { data: criado, error: prestadorError } = await supabaseClient
            .from("prestadores")
            .insert({
                id: usuario.id,
                descricao: meta.descricao || null,
                avaliacao: 0,
                total_avaliacoes: 0,
                ativo: true
            })
            .select("id")
            .single();
        if (prestadorError) throw prestadorError;
        return criado;
    }

    /**
     * Busca todos os prestadores ativos do banco com dados completos.
     * Join: prestadores -> usuarios (dados pessoais) + prestador_servicos -> servicos (especialidades)
     * Opcionalmente filtra por servico_id.
     */
    async function buscarPrestadores(filtroServicoId = null) {
        if (!supabaseClient) {
            console.error("[PrestadoresService] supabaseClient não disponível.");
            throw new Error("Conexão com o banco de dados indisponível.");
        }

        try {
            // A view expõe somente campos públicos e já aplica os relacionamentos do perfil.
            let query = supabaseClient
                .from("prestadores_publicos")
                .select(`
                    id,
                    nome,
                    descricao,
                    avaliacao,
                    total_avaliacoes,
                    ativo,
                    created_at,
                    servicos
                `)
                .eq("ativo", true);

            const { data, error } = await query;

            if (error) {
                console.error("[PrestadoresService] Erro ao buscar prestadores:", error);
                throw error;
            }

            if (!data || data.length === 0) return [];

            // Transformar dados em formato amigável para a interface
            let prestadores = data.map(p => _transformarPrestador(p));

            // Filtrar por serviço se solicitado
            if (filtroServicoId) {
                prestadores = prestadores.filter(p =>
                    p.servicos.some(s => s.id === filtroServicoId)
                );
            }

            return prestadores.filter(p => p.nome);
        } catch (err) {
            console.error("[PrestadoresService] Erro inesperado:", err);
            throw err;
        }
    }

    /**
     * Busca um prestador específico por ID com dados completos.
     */
    async function buscarPrestadorPorId(id) {
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient
                .from("prestadores")
                .select(`
                    id,
                    descricao,
                    avaliacao,
                    total_avaliacoes,
                    ativo,
                    created_at,
                    usuarios (
                        id,
                        nome,
                        email,
                        telefone,
                        cpf,
                        tipo
                    ),
                    prestador_servicos (
                        servico_id,
                        experiencia,
                        servicos (
                            id,
                            nome,
                            descricao
                        )
                    )
                `)
                .eq("id", id)
                .maybeSingle();

            if (error) {
                console.error("[PrestadoresService] Erro ao buscar prestador:", error);
                return null;
            }

            return data ? _transformarPrestador(data) : null;
        } catch (err) {
            console.error("[PrestadoresService] Erro inesperado:", err);
            return null;
        }
    }

    /**
     * Busca prestadores filtrados pelo nome do serviço.
     */
    async function buscarPrestadoresPorNomeServico(nomeServico) {
        if (!nomeServico || nomeServico === "todos") {
            return await buscarPrestadores();
        }

        const todos = await buscarPrestadores();
        return todos.filter(p =>
            p.servicos.some(s =>
                s.nome.toLowerCase().includes(nomeServico.toLowerCase())
            )
        );
    }

    /**
     * Atualiza o status ativo/inativo do prestador.
     */
    async function atualizarStatus(prestadorId, ativo) {
        if (!supabaseClient) return false;

        try {
            const { error } = await supabaseClient
                .from("prestadores")
                .update({ ativo: ativo })
                .eq("id", prestadorId);

            if (error) {
                console.error("[PrestadoresService] Erro ao atualizar status:", error);
                return false;
            }
            return true;
        } catch (err) {
            console.error("[PrestadoresService] Erro inesperado:", err);
            return false;
        }
    }

    /**
     * Busca o endereço do prestador.
     */
    async function buscarEndereco(prestadorId) {
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient
                .from("enderecos")
                .select("*")
                .eq("usuario_id", prestadorId)
                .maybeSingle();

            if (error) {
                console.warn("[PrestadoresService] Aviso ao buscar endereço:", error);
                return null;
            }
            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Conta prestadores ativos (online).
     */
    async function contarPrestadoresAtivos() {
        if (!supabaseClient) return 0;

        try {
            const { count, error } = await supabaseClient
                .from("prestadores")
                .select("id", { count: "exact", head: true })
                .eq("ativo", true);

            if (error) return 0;
            return count || 0;
        } catch (err) {
            return 0;
        }
    }

    /**
     * Transforma os dados brutos do Supabase em formato amigável para a UI.
     */
    function _transformarPrestador(raw) {
        const usuario = raw.usuarios || { nome: raw.nome };
        const servicos = Array.isArray(raw.servicos)
            ? raw.servicos
            : (raw.prestador_servicos || []).map(ps => ps.servicos).filter(Boolean);

        const primeiroServico = servicos[0] || null;
        const nomeServico = primeiroServico ? primeiroServico.nome : null;

        return {
            id: raw.id,
            nome: usuario.nome || null,
            email: usuario.email || null,
            telefone: usuario.telefone || null,
            especialidade: nomeServico,
            descricao: raw.descricao || null,
            avaliacao: raw.avaliacao == null ? null : Number(raw.avaliacao),
            totalAvaliacoes: raw.total_avaliacoes == null ? null : Number(raw.total_avaliacoes),
            ativo: raw.ativo,
            createdAt: raw.created_at,
            servicos: servicos,
            icone: nomeServico ? ServicosService.obterIcone(nomeServico) : null,
            // Dados que podem não existir no banco — interface adapta-se
            online: raw.ativo === true
        };
    }

    return {
        garantirPerfilPrestadorAtual,
        buscarPrestadores,
        buscarPrestadorPorId,
        buscarPrestadoresPorNomeServico,
        atualizarStatus,
        buscarEndereco,
        contarPrestadoresAtivos
    };

})();
