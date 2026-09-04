// =======================================================
// HELPGO - SERVIÇO DE SOLICITAÇÕES / PEDIDOS (PHP + SQLite)
// =======================================================

const PedidosService = (() => {

    function dispararEvento(nome, dados) {
        window.dispatchEvent(new CustomEvent(nome, { detail: dados }));
    }

    async function listarSolicitacoesCliente() {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=minhas_solicitacoes");
            return res && res.data ? res.data : [];
        } catch (err) {
            console.error("[PedidosService] Erro ao listar solicitações do cliente:", err);
            return [];
        }
    }

    async function listarSolicitacoesPrestador() {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=chamados_prestador");
            return res && res.data ? res.data : [];
        } catch (err) {
            console.error("[PedidosService] Erro ao listar chamados do prestador:", err);
            return [];
        }
    }

    async function criarPedido(dados) {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=criar", {
                method: "POST",
                body: {
                    servico: dados.servico,
                    servico_id: dados.servicoKey || null,
                    descricao: dados.descricao,
                    cep: dados.cep || null,
                    endereco: dados.endereco || null,
                    urgencia: dados.urgencia || "normal",
                    orcamento: dados.orcamento || null,
                    data: dados.data || null,
                    prestador_id: dados.prestador_id || null
                }
            });

            if (res && res.pedido) {
                dispararEvento("pedidos_atualizados", res.pedido);
                return res.pedido;
            }
            throw new Error(res.error || "Erro ao criar pedido.");
        } catch (err) {
            console.error("[PedidosService] Erro ao criar pedido:", err);
            throw err;
        }
    }

    async function aceitarPedido(pedidoId) {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=aceitar", {
                method: "POST",
                body: { pedido_id: pedidoId }
            });
            dispararEvento("pedidos_atualizados", { id: pedidoId, status: "em_andamento" });
            return res;
        } catch (err) {
            console.error("[PedidosService] Erro ao aceitar pedido:", err);
            throw err;
        }
    }

    async function concluirPedido(pedidoId) {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=concluir", {
                method: "POST",
                body: { pedido_id: pedidoId }
            });
            dispararEvento("pedidos_atualizados", { id: pedidoId, status: "concluido" });
            return res;
        } catch (err) {
            console.error("[PedidosService] Erro ao concluir pedido:", err);
            throw err;
        }
    }

    async function avaliarPedido(pedidoId, avaliacao) {
        try {
            const res = await ApiConfig.apiFetch("solicitacoes.php?action=avaliar", {
                method: "POST",
                body: {
                    pedido_id: pedidoId,
                    nota: Number(avaliacao.nota),
                    comentario: avaliacao.comentario || "",
                    tag: avaliacao.tag || ""
                }
            });
            dispararEvento("pedidos_atualizados", { id: pedidoId, status: "avaliado" });
            return res;
        } catch (err) {
            console.error("[PedidosService] Erro ao avaliar pedido:", err);
            throw err;
        }
    }

    function tocarSomNotificacao() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } catch (_) {}
    }

    return {
        listarSolicitacoesCliente,
        listarSolicitacoesPrestador,
        criarPedido,
        aceitarPedido,
        concluirPedido,
        avaliarPedido,
        tocarSomNotificacao
    };

})();
