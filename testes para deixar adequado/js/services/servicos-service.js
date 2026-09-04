// =======================================================
// HELPGO - SERVIÇO DE CATEGORIAS DE SERVIÇOS (PHP + SQLite)
// =======================================================

const ServicosService = (() => {

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

    let _cacheServicos = null;

    /**
     * Busca os serviços cadastrados no banco de dados via API PHP
     */
    async function buscarServicos() {
        if (_cacheServicos) return _cacheServicos;

        try {
            const res = await ApiConfig.apiFetch("servicos.php?action=listar");
            if (res && res.data) {
                _cacheServicos = res.data;
                return res.data;
            }
            return [];
        } catch (err) {
            console.error("[ServicosService] Erro ao buscar serviços:", err);
            return [];
        }
    }

    async function buscarServicoPorId(id) {
        const servicos = await buscarServicos();
        return servicos.find(s => s.id === Number(id)) || null;
    }

    async function buscarServicoPorNome(nome) {
        const servicos = await buscarServicos();
        return servicos.find(s => s.nome.toLowerCase() === String(nome).toLowerCase()) || null;
    }

    function obterIcone(nomeServico) {
        if (!nomeServico) return "⚡";
        const k = nomeServico.toLowerCase();
        for (const [key, icon] of Object.entries(ICONES_SERVICO)) {
            if (k.includes(key)) return icon;
        }
        return "🔧";
    }

    function obterCor(nomeServico) {
        if (!nomeServico) return "green";
        const k = nomeServico.toLowerCase();
        for (const [key, cor] of Object.entries(CORES_SERVICO)) {
            if (k.includes(key)) return cor;
        }
        return "green";
    }

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
