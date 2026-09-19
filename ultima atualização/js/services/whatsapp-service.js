const WhatsAppService = (() => {
    function normalizarTelefone(valor) {
        const texto = String(valor || "").trim();
        if (!texto || /[^\d+\s().-]/.test(texto)) return null;
        let numero = texto.replace(/\D/g, "");
        if (texto.startsWith("+")) {
            if (!/^\+[\d\s().-]+$/.test(texto)) return null;
            if (!numero.startsWith("55")) return /^[1-9]\d{7,14}$/.test(numero) ? numero : null;
        } else if (numero.length === 10 || numero.length === 11) {
            numero = "55" + numero;
        }
        return /^55[1-9]{2}[2-9]\d{7,8}$/.test(numero) ? numero : null;
    }

    function criarLink(prestador, pedido, nomeCliente) {
        const numero = normalizarTelefone(prestador?.telefone);
        if (!numero) throw new Error("Este prestador não possui um telefone válido para contato pelo WhatsApp.");
        const mensagem = [
            `Olá, ${prestador.nome}! Meu nome é ${nomeCliente || "Cliente"}. Encontrei seu perfil no HelpGo e gostaria de solicitar um atendimento.`,
            "",
            `Serviço: ${pedido.servico}`,
            ...(pedido.descricao?.trim() ? [`Descrição: ${pedido.descricao.trim()}`] : []),
            `Dia e horário desejados: ${PedidosService.formatarAgendamento(pedido.data, pedido.horario)}`,
            `Endereço: ${pedido.endereco}`,
            `CEP: ${pedido.cep}`,
            `Urgência: ${pedido.urgencia}`,
            `Orçamento: ${pedido.orcamento}`,
            "",
            "Você tem disponibilidade? Podemos confirmar o horário e o valor do atendimento?"
        ].join("\n");
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    }

    function criarLinkContato(prestador, nomeCliente) {
        const numero = normalizarTelefone(prestador?.telefone);
        if (!numero) throw new Error("Este prestador não possui um telefone válido para contato pelo WhatsApp.");
        const profissao = prestador.profissoes || prestador.especialidade;
        const mensagem = [
            `Olá, ${prestador.nome}! Meu nome é ${nomeCliente || "Cliente"}. Encontrei seu perfil no HelpGo e gostaria de solicitar um atendimento.`,
            ...(profissao ? [`Tenho interesse nos seus serviços de ${profissao}.`] : []),
            "Você tem disponibilidade? Gostaria de combinar os detalhes e receber um orçamento."
        ].join("\n\n");
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    }

    return { normalizarTelefone, criarLink, criarLinkContato };
})();
