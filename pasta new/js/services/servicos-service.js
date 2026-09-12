// =======================================================
// HELPGO - SERVIÇO DE SERVIÇOS (tabela 'servicos')
// =======================================================

const ServicosService = (() => {

    // Ícones padrão por nome de serviço
    const ICONES_SERVICO = {
        "eletricista": "⚡",
        "encanador": "🔧",
        "pintor": "🎨",
        "ar-condicionado": "❄️",
        "chaveiro": "🔑",
        "limpeza": "🧹",
        "marceneiro": "🪚",
        "pedreiro": "🧱",
        "jardineiro": "🌱",
        "técnico de informática": "💻",
        "manutenção": "🔧",
        "encanamento": "🔧",
        "pintura": "🎨",
        "montagem": "🪚",
        "outros": "➕"
    };

    const CORES_SERVICO = {
        "eletricista": "green",
        "encanador": "blue",
        "pintor": "orange",
        "ar-condicionado": "cyan",
        "chaveiro": "purple",
        "limpeza": "yellow",
        "marceneiro": "brown",
        "pedreiro": "gray",
        "jardineiro": "green",
        "técnico de informática": "blue",
        "manutenção": "blue",
        "encanamento": "blue",
        "pintura": "orange",
        "montagem": "brown",
        "outros": "gray"
    };

    // Serviços padrão para seed caso a tabela esteja vazia
    const SERVICOS_PADRAO = [
        { nome: "Eletricista", descricao: "Instalações elétricas, reparos de quadros, tomadas, chuveiros e iluminação." },
        { nome: "Encanador", descricao: "Reparos hidráulicos, vazamentos, desentupimentos, torneiras e caixas d'água." },
        { nome: "Pintor", descricao: "Pintura residencial, comercial, texturas, massa corrida e restaurações." },
        { nome: "Ar-condicionado", descricao: "Instalação, limpeza, higienização e manutenção de ar-condicionado." },
        { nome: "Chaveiro", descricao: "Abertura de portas, cópias de chaves, troca de fechaduras e travas." },
        { nome: "Limpeza", descricao: "Limpeza residencial, comercial, pós-obra e diaristas qualificadas." },
        { nome: "Marceneiro", descricao: "Montagem de móveis, reparos em armários, portas e peças de madeira." },
        { nome: "Pedreiro", descricao: "Pequenas reformas, alvenaria, pisos, azulejos e acabamentos." },
        { nome: "Jardineiro", descricao: "Poda, manutenção de jardins, corte de grama e paisagismo." },
        { nome: "Técnico de Informática", descricao: "Manutenção de computadores, redes, formatação e suporte." }
    ];

    let _cacheServicos = null;

    /**
     * Busca todos os serviços cadastrados no banco.
     * Se a tabela estiver vazia, tenta inserir os serviços padrão (seed).
     */
    async function buscarServicos() {
        if (_cacheServicos) return _cacheServicos;

        if (!supabaseClient) {
            console.error("[ServicosService] supabaseClient não disponível.");
            return [];
        }

        try {
            const { data, error } = await supabaseClient
                .from("servicos")
                .select("*")
                .order("nome", { ascending: true });

            if (error) {
                console.error("[ServicosService] Erro ao buscar serviços:", error);
                return [];
            }

            // Se não houver serviços, tentar seed
            if (!data || data.length === 0) {
                console.log("[ServicosService] Tabela vazia. Tentando inserir serviços padrão...");
                return await _seedServicos();
            }

            _cacheServicos = data;
            return data;
        } catch (err) {
            console.error("[ServicosService] Erro inesperado:", err);
            return [];
        }
    }

    /**
     * Tenta inserir os serviços padrão no banco.
     * Requer que o usuário esteja autenticado (RLS).
     */
    async function _seedServicos() {
        try {
            const { data, error } = await supabaseClient
                .from("servicos")
                .insert(SERVICOS_PADRAO)
                .select();

            if (error) {
                console.warn("[ServicosService] Não foi possível fazer seed (RLS pode estar ativo):", error.message);
                // Retornar lista local como fallback
                return SERVICOS_PADRAO.map((s, i) => ({
                    id: i + 1,
                    nome: s.nome,
                    descricao: s.descricao,
                    created_at: new Date().toISOString()
                }));
            }

            _cacheServicos = data;
            return data;
        } catch (err) {
            console.warn("[ServicosService] Erro ao fazer seed:", err);
            return SERVICOS_PADRAO.map((s, i) => ({
                id: i + 1,
                nome: s.nome,
                descricao: s.descricao,
                created_at: new Date().toISOString()
            }));
        }
    }

    /**
     * Busca um serviço pelo ID.
     */
    async function buscarServicoPorId(id) {
        const servicos = await buscarServicos();
        return servicos.find(s => s.id === id) || null;
    }

    /**
     * Busca um serviço pelo nome (case-insensitive).
     */
    async function buscarServicoPorNome(nome) {
        const servicos = await buscarServicos();
        return servicos.find(s => s.nome.toLowerCase() === nome.toLowerCase()) || null;
    }

    /**
     * Retorna o ícone emoji correspondente ao nome do serviço.
     */
    function obterIcone(nomeServico) {
        if (!nomeServico) return "⚡";
        const k = nomeServico.toLowerCase();
        for (const [key, icon] of Object.entries(ICONES_SERVICO)) {
            if (k.includes(key)) return icon;
        }
        return "🔧";
    }

    /**
     * Retorna a classe de cor correspondente ao nome do serviço.
     */
    function obterCor(nomeServico) {
        if (!nomeServico) return "green";
        const k = nomeServico.toLowerCase();
        for (const [key, cor] of Object.entries(CORES_SERVICO)) {
            if (k.includes(key)) return cor;
        }
        return "green";
    }

    /**
     * Limpa o cache para forçar nova consulta.
     */
    function limparCache() {
        _cacheServicos = null;
    }

    return {
        buscarServicos,
        buscarServicoPorId,
        buscarServicoPorNome,
        obterIcone,
        obterCor,
        limparCache
    };

})();
