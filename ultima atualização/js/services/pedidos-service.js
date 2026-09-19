// Solicitações alinhadas à tabela public.solicitacoes atual.
const PedidosService = (() => {
    const TABELA = "solicitacoes";
    const dispararEvento = (nome, dados) => window.dispatchEvent(new CustomEvent(nome, { detail: dados }));

    async function usuarioAutenticado() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data.user) throw new Error("Sua sessão expirou. Faça login novamente.");
        return data.user;
    }

    function normalizar(registro) {
        return {
            id: registro.id, clienteId: registro.cliente_id, prestadorId: registro.prestador_id,
            servico: registro.servicos?.nome || "Serviço", servicoKey: registro.servico_id,
            descricao: registro.descricao || "", orcamento: registro.valor == null ? null : `R$ ${Number(registro.valor).toFixed(2)}`,
            data: registro.criado_em, dataCriacao: registro.criado_em, status: registro.status,
            dataAgendada: registro.data_agendada || null,
            horarioAgendado: registro.horario_agendado?.slice(0, 5) || null,
            agendamento: formatarAgendamento(registro.data_agendada, registro.horario_agendado),
            endereco: null, cep: null, urgencia: "normal", avaliacao: null
        };
    }

    function formatarAgendamento(data, horario) {
        if (!data) return "";
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}${horario ? ` às ${horario.slice(0, 5)}` : ""}`;
    }

    function validarAgendamento(data, horario, agora = new Date()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario || "")) {
            throw new Error("Escolha o dia e o horário do atendimento.");
        }
        const [ano, mes, dia] = data.split("-").map(Number);
        const [hora, minuto] = horario.split(":").map(Number);
        const agendamento = new Date(ano, mes - 1, dia, hora, minuto);
        if (agendamento.getFullYear() !== ano || agendamento.getMonth() !== mes - 1 || agendamento.getDate() !== dia || agendamento <= agora) {
            throw new Error("Escolha um dia e horário futuros para o atendimento.");
        }
    }

    const selecao = "*, servicos(nome)";
    async function listarSolicitacoesCliente() {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from(TABELA).select(selecao)
            .eq("cliente_id", usuario.id).order("criado_em", { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizar);
    }

    async function listarSolicitacoesPrestador() {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from(TABELA).select(selecao)
            .or(`status.eq.aberto,prestador_id.eq.${usuario.id}`).order("criado_em", { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizar);
    }

    async function criarPedido(dados) {
        validarAgendamento(dados.data, dados.horario);
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from(TABELA).insert({
            cliente_id: usuario.id, servico_id: dados.servicoId || Number(dados.servicoKey || dados.servico),
            descricao: String(dados.descricao || "").trim() || "Descrição não informada.",
            valor: dados.valor || null, status: "aberto",
            data_agendada: dados.data, horario_agendado: dados.horario
        }).select(selecao).single();
        if (error) {
            if (["PGRST204", "42703"].includes(error.code)) {
                console.error("[PedidosService] Verifique a instalação de supabase/agendamento-solicitacoes.sql", error);
                throw new Error("Não foi possível salvar o agendamento. A configuração do banco precisa ser atualizada.");
            }
            throw error;
        }
        const pedido = normalizar(data); dispararEvento("pedidos_atualizados", pedido); return pedido;
    }

    async function aceitarPedido(pedidoId) {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from(TABELA).update({
            prestador_id: usuario.id, status: "em_andamento", atualizado_em: new Date().toISOString()
        }).eq("id", pedidoId).eq("status", "aberto").select(selecao).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Este chamado não está mais disponível.");
        const pedido = normalizar(data); dispararEvento("pedidos_atualizados", pedido); return pedido;
    }

    async function concluirPedido(pedidoId) {
        const usuario = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from(TABELA).update({
            status: "concluido", atualizado_em: new Date().toISOString()
        }).eq("id", pedidoId).eq("prestador_id", usuario.id).select(selecao).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Você não tem permissão para concluir esta solicitação.");
        const pedido = normalizar(data); dispararEvento("pedidos_atualizados", pedido); return pedido;
    }

    async function avaliarPedido(pedidoId, avaliacao) {
        const usuario = await usuarioAutenticado();
        const { data: pedido, error: pedidoErro } = await supabaseClient.from(TABELA)
            .select("id, cliente_id, prestador_id, status").eq("id", pedidoId).eq("cliente_id", usuario.id)
            .eq("status", "concluido").maybeSingle();
        if (pedidoErro) throw pedidoErro;
        if (!pedido?.prestador_id) throw new Error("Esta solicitação não pode ser avaliada.");
        const { error } = await supabaseClient.from("avaliacoes").insert({
            solicitacao_id: pedido.id, cliente_id: usuario.id, prestador_id: pedido.prestador_id,
            nota: Number(avaliacao.nota), comentario: avaliacao.comentario || null
        });
        if (error) throw error;
        dispararEvento("pedidos_atualizados", pedido);
        return pedido;
    }

    function tocarSomNotificacao() {}
    const obterNotificacoesCliente = () => [];
    const obterNotificacoesPrestador = () => [];
    const marcarTodasLidasCliente = () => {};
    const marcarTodasLidasPrestador = () => {};
    return { listarSolicitacoesCliente, listarSolicitacoesPrestador, criarPedido, aceitarPedido, concluirPedido, avaliarPedido, validarAgendamento, formatarAgendamento,
        obterNotificacoesCliente, obterNotificacoesPrestador, marcarTodasLidasCliente, marcarTodasLidasPrestador, tocarSomNotificacao };
})();
