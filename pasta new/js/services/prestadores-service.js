// =======================================================
// HELPGO - SERVIÇO DE PRESTADORES (tabela 'prestadores')
// Busca prestadores reais do banco de dados (Supabase)
// Respeita regras de disponibilidade, status, avaliações e verificação
// =======================================================

const PrestadoresService = (() => {

    // Status considerados indisponíveis no sistema (conforme Caso 3 da tarefa.md)
    const STATUS_INDISPONIVEIS = ["offline", "indisponivel", "ocupado", "suspenso", "inativo"];

    /**
     * Garante a consistência da conta de um prestador já cadastrado.
     * Conforme a regra: NÃO cria prestadores desnecessários no login;
     * apenas valida a conta existente e atualiza a disponibilidade.
     */
    async function garantirPerfilPrestadorAtual() {
        if (!supabaseClient) throw new Error("Conexão com o banco de dados indisponível.");

        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData.user) throw new Error("Sua sessão expirou. Faça login novamente.");

        const usuario = authData.user;
        const meta = usuario.user_metadata || {};
        if (meta.tipo !== "prestador") return null;

        // 1. Verifica se o prestador já existe no banco
        const { data: existente, error: buscaError } = await supabaseClient
            .from("prestadores")
            .select("id, ativo, status")
            .eq("id", usuario.id)
            .maybeSingle();
        if (buscaError) throw buscaError;

        // Se já existe, apenas garante que está disponível (Caso 2)
        if (existente) {
            await atualizarStatus(usuario.id, true, "disponivel");
            return existente;
        }

        // Se realmente não existe registro na tabela (ex.: primeiro acesso após cadastro inicial)
        const { error: usuarioError } = await supabaseClient.from("usuarios").upsert({
            id: usuario.id,
            nome: meta.nome || usuario.email?.split("@")[0] || "Profissional",
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
                ativo: true,
                status: "disponivel",
                verificado: false
            })
            .select("id")
            .single();
        if (prestadorError) throw prestadorError;
        return criado;
    }

    /**
     * Busca todos os prestadores ativos e disponíveis do banco de dados.
     * Tenta primeiro a view 'prestadores_publicos' e faz fallback resiliente
     * para a tabela 'prestadores' com joins em 'usuarios', 'prestador_servicos' e 'enderecos'.
     */
    async function buscarPrestadores(filtroServicoId = null) {
        if (!supabaseClient) {
            console.error("[PrestadoresService] supabaseClient não disponível.");
            throw new Error("Conexão com o banco de dados indisponível.");
        }

        let dadosBrutos = null;

        // 1. Tentar consultar através da view prestadores_publicos
        try {
            const { data: viewData, error: viewError } = await supabaseClient
                .from("prestadores_publicos")
                .select("*")
                .eq("ativo", true);

            if (!viewError && Array.isArray(viewData)) {
                dadosBrutos = viewData;
            }
        } catch (e) {
            console.info("[PrestadoresService] View prestadores_publicos indisponível, usando consulta direta às tabelas.");
        }

        // 2. Fallback: consulta direta à tabela 'prestadores' com joins
        if (!dadosBrutos) {
            try {
                const { data: tableData, error: tableError } = await supabaseClient
                    .from("prestadores")
                    .select(`
                        id,
                        descricao,
                        avaliacao,
                        total_avaliacoes,
                        ativo,
                        status,
                        verificado,
                        valor_minimo,
                        servicos_realizados,
                        foto_url,
                        created_at,
                        usuarios (
                            id,
                            nome,
                            email,
                            telefone,
                            tipo,
                            foto_url
                        ),
                        prestador_servicos (
                            servico_id,
                            experiencia,
                            servicos (
                                id,
                                nome,
                                descricao
                            )
                        ),
                        enderecos (
                            cidade,
                            estado,
                            cep
                        )
                    `)
                    .eq("ativo", true);

                if (tableError) {
                    console.error("[PrestadoresService] Erro ao buscar prestadores:", tableError);
                    return [];
                }
                dadosBrutos = tableData || [];
            } catch (err) {
                console.error("[PrestadoresService] Erro inesperado na busca:", err);
                return [];
            }
        }

        if (!dadosBrutos || dadosBrutos.length === 0) {
            return [];
        }

        // 3. Transformar e aplicar regras de elegibilidade e disponibilidade (Casos 1 e 3)
        let prestadores = dadosBrutos
            .map(p => _transformarPrestador(p))
            .filter(p => {
                if (!p || !p.nome) return false;
                // Deve estar ativo
                if (p.ativo !== true) return false;
                // Não pode estar em status de indisponibilidade
                const statusNormalizado = (p.status || "").toLowerCase().trim();
                if (STATUS_INDISPONIVEIS.includes(statusNormalizado)) return false;
                return true;
            });

        // 4. Filtrar por serviço se solicitado
        if (filtroServicoId && filtroServicoId !== "todos") {
            const filtroLower = String(filtroServicoId).toLowerCase();
            prestadores = prestadores.filter(p =>
                (p.especialidade && p.especialidade.toLowerCase().includes(filtroLower)) ||
                (p.servicos || []).some(s =>
                    String(s.id).toLowerCase() === filtroLower ||
                    (s.nome && s.nome.toLowerCase().includes(filtroLower))
                )
            );
        }

        return prestadores;
    }

    /**
     * Busca um prestador específico por ID com dados completos.
     */
    async function buscarPrestadorPorId(id) {
        if (!supabaseClient || !id) return null;

        // 1. Tentar via view
        try {
            const { data: viewData, error: viewError } = await supabaseClient
                .from("prestadores_publicos")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (!viewError && viewData) {
                return _transformarPrestador(viewData);
            }
        } catch (e) {
            // Segue para fallback
        }

        // 2. Fallback via tabelas
        try {
            const { data, error } = await supabaseClient
                .from("prestadores")
                .select(`
                    id,
                    descricao,
                    avaliacao,
                    total_avaliacoes,
                    ativo,
                    status,
                    verificado,
                    valor_minimo,
                    servicos_realizados,
                    foto_url,
                    created_at,
                    usuarios (
                        id,
                        nome,
                        email,
                        telefone,
                        tipo,
                        foto_url
                    ),
                    prestador_servicos (
                        servico_id,
                        experiencia,
                        servicos (
                            id,
                            nome,
                            descricao
                        )
                    ),
                    enderecos (
                        cidade,
                        estado,
                        cep
                    )
                `)
                .eq("id", id)
                .maybeSingle();

            if (error) {
                console.error("[PrestadoresService] Erro ao buscar prestador por ID:", error);
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
        return await buscarPrestadores(nomeServico);
    }

    /**
     * Atualiza o status de disponibilidade do prestador no banco de dados.
     * Atualiza tanto 'ativo' (boolean) quanto 'status' (string).
     */
    async function atualizarStatus(prestadorId, ativo, statusTexto = null) {
        if (!supabaseClient || !prestadorId) return false;

        try {
            const statusFinal = statusTexto || (ativo ? "disponivel" : "indisponivel");
            const updatePayload = {
                ativo: Boolean(ativo),
                status: statusFinal
            };

            let { error } = await supabaseClient
                .from("prestadores")
                .update(updatePayload)
                .eq("id", prestadorId);

            // Fallback caso a coluna status ainda não tenha sido criada no banco
            if (error && error.message && error.message.includes("status")) {
                const retry = await supabaseClient
                    .from("prestadores")
                    .update({ ativo: Boolean(ativo) })
                    .eq("id", prestadorId);
                error = retry.error;
            }

            if (error) {
                console.error("[PrestadoresService] Erro ao atualizar status:", error);
                return false;
            }
            return true;
        } catch (err) {
            console.error("[PrestadoresService] Erro inesperado ao atualizar status:", err);
            return false;
        }
    }

    /**
     * Busca o endereço do prestador.
     */
    async function buscarEndereco(prestadorId) {
        if (!supabaseClient || !prestadorId) return null;

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
     * Conta prestadores ativos e disponíveis.
     */
    async function contarPrestadoresAtivos() {
        const prestadores = await buscarPrestadores();
        return prestadores.length;
    }

    /**
     * Transforma os dados brutos do Supabase no formato padronizado exigido pela interface.
     * Extrai com precisão todos os campos da tarefa.md:
     * Foto de perfil, Nome, Bio/descrição, Serviço oferecido, Valor cobrado,
     * Média de avaliações, Total de avaliações, Serviços realizados, Localização,
     * Status de disponibilidade e Status de verificação.
     */
    function _transformarPrestador(raw) {
        const usuario = raw.usuarios || {
            nome: raw.nome,
            email: raw.email,
            telefone: raw.telefone,
            foto_url: raw.foto_url
        };

        const servicos = Array.isArray(raw.servicos)
            ? raw.servicos
            : (raw.prestador_servicos || []).map(ps => {
                if (ps.servicos) {
                    return {
                        id: ps.servicos.id,
                        nome: ps.servicos.nome,
                        descricao: ps.servicos.descricao,
                        experiencia: ps.experiencia
                    };
                }
                return null;
            }).filter(Boolean);

        const primeiroServico = servicos[0] || null;
        const nomeServico = primeiroServico ? primeiroServico.nome : (raw.especialidade || null);

        // Foto de perfil
        const fotoUrl = raw.foto_url || usuario.foto_url || null;

        // Valor cobrado (prioriza valor_minimo ou valor)
        let valorCobrado = null;
        if (raw.valor != null) valorCobrado = Number(raw.valor);
        else if (raw.valor_minimo != null) valorCobrado = Number(raw.valor_minimo);

        // Localização
        const enderecoObj = Array.isArray(raw.enderecos) ? raw.enderecos[0] : raw.enderecos;
        const cidade = (enderecoObj && enderecoObj.cidade) || raw.cidade || null;
        const estado = (enderecoObj && enderecoObj.estado) || raw.estado || null;
        const localizacaoFormatada = cidade && estado ? `${cidade}, ${estado}` : (cidade || estado || null);

        // Status de verificação
        const verificado = raw.verificado === true || raw.is_verified === true;

        // Status textual e booleano
        const ativo = raw.ativo === true;
        const statusTexto = raw.status || (ativo ? "disponivel" : "offline");
        const isOnline = ativo && !STATUS_INDISPONIVEIS.includes(statusTexto.toLowerCase().trim());

        // Quantidade de serviços realizados
        const servicosRealizados = raw.servicos_realizados != null
            ? Number(raw.servicos_realizados)
            : (raw.total_servicos != null ? Number(raw.total_servicos) : 0);

        return {
            id: raw.id,
            nome: usuario.nome || raw.nome || "Profissional",
            email: usuario.email || null,
            telefone: usuario.telefone || null,
            fotoUrl: fotoUrl,
            especialidade: nomeServico,
            descricao: raw.descricao || null,
            valor: valorCobrado,
            avaliacao: raw.avaliacao == null ? null : Number(raw.avaliacao),
            totalAvaliacoes: raw.total_avaliacoes == null ? 0 : Number(raw.total_avaliacoes),
            servicosRealizados: servicosRealizados,
            cidade: cidade,
            estado: estado,
            localizacao: localizacaoFormatada,
            verificado: verificado,
            ativo: ativo,
            status: statusTexto,
            online: isOnline,
            createdAt: raw.created_at,
            servicos: servicos,
            icone: nomeServico ? (typeof ServicosService !== "undefined" ? ServicosService.obterIcone(nomeServico) : "⚡") : "⚡"
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
