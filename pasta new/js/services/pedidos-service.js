// =======================================================
// HELPGO - SERVIÇO DE SOLICITAÇÕES (Supabase)
// A fonte de verdade é sempre a tabela solicitacoes.
// =======================================================

const PedidosService = (() => {
    const TABELA = "solicitacoes";

    function dispararEvento(nome, dados) {
        window.dispatchEvent(new CustomEvent(nome, { detail: dados }));
    }

    async function usuarioAutenticado() {
        if (!supabaseClient) throw new Error("Não foi possível conectar ao banco de dados.");
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data.user) throw new Error("Sua sessão expirou. Faça login novamente.");
        return data.user;
    }

    function normalizar(registro) {
        return {
            id: registro.id,
            clienteId: registro.cliente_id,
            prestadorId: registro.prestador_id,
            servico: registro.servico,
            servicoKey: registro.servico_id || registro.servico,
            descricao: registro.descricao,
            cep: registro.cep,
            endereco: registro.endereco,
            urgencia: registro.urgencia,
            orcamento: registro.orcamento,
            data: registro.data_agendada,
            dataCriacao: registro.created_at,
            status: registro.status,
            avaliacao: registro.avaliacao_nota == null ? null : {
                nota: Number(registro.avaliacao_nota),
                comentario: registro.avaliacao_comentario || "",
                tag: registro.avaliacao_tag || ""
            }
        };
    }

    async function listarSolicitacoesCliente() {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient
            .from(TABELA)
            .select("*")
            .eq("cliente_id", usuario.id)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizar);
    }

    async function listarSolicitacoesPrestador() {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient
            .from(TABELA)
            .select("*")
            .or(`status.eq.aberto,prestador_id.eq.${usuario.id}`)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizar);
    }

    async function criarPedido(dados) {
        const usuario = await usuarioAutenticado();
        const novoRegistro = {
            cliente_id: usuario.id,
            servico: dados.servico,
            servico_id: dados.servicoKey || null,
            descricao: dados.descricao,
            cep: dados.cep || null,
            endereco: dados.endereco || null,
            urgencia: dados.urgencia || "normal",
            orcamento: dados.orcamento || null,
            data_agendada: dados.data || null,
            status: "aberto"
        };
        const { data, error } = await supabaseClient.from(TABELA).insert(novoRegistro).select().single();
        if (error) throw error;
        const pedido = normalizar(data);
        dispararEvento("pedidos_atualizados", pedido);
        return pedido;
    }

    async function aceitarPedido(pedidoId) {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient
            .from(TABELA)
            .update({ prestador_id: usuario.id, status: "em_andamento", updated_at: new Date().toISOString() })
            .eq("id", pedidoId)
            .eq("status", "aberto")
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Este chamado não está mais disponível.");
        const pedido = normalizar(data);
        dispararEvento("pedidos_atualizados", pedido);
        return pedido;
    }

    async function concluirPedido(pedidoId) {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient
            .from(TABELA)
            .update({ status: "concluido", updated_at: new Date().toISOString() })
            .eq("id", pedidoId)
            .eq("prestador_id", usuario.id)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Você não tem permissão para concluir esta solicitação.");
        const pedido = normalizar(data);
        dispararEvento("pedidos_atualizados", pedido);
        return pedido;
    }

    async function avaliarPedido(pedidoId, avaliacao) {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient
            .from(TABELA)
            .update({
                status: "avaliado",
                avaliacao_nota: Number(avaliacao.nota),
                avaliacao_comentario: avaliacao.comentario || null,
                avaliacao_tag: avaliacao.tag || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", pedidoId)
            .eq("cliente_id", usuario.id)
            .eq("status", "concluido")
            .select()
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Esta solicitação não pode ser avaliada.");
        const pedido = normalizar(data);
        dispararEvento("pedidos_atualizados", pedido);
        return pedido;
    }

    // Notificações locais são apenas de interface; nunca armazenam solicitações.
    function tocarSomNotificacao() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
        } catch (_) { /* áudio é opcional */ }
    }

    // Mantidos como compatibilidade visual enquanto não há tabela de notificações.
    const obterNotificacoesCliente = () => [];
    const obterNotificacoesPrestador = () => [];
    const marcarTodasLidasCliente = () => {};
    const marcarTodasLidasPrestador = () => {};
    return {
        listarSolicitacoesCliente, listarSolicitacoesPrestador, criarPedido, aceitarPedido, concluirPedido, avaliarPedido,
        obterNotificacoesCliente, obterNotificacoesPrestador, marcarTodasLidasCliente, marcarTodasLidasPrestador,
        tocarSomNotificacao
    };
})();
