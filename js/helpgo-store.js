// =======================================================
// HELPGO - DATA STORE & SINCRONIZAÇÃO EM TEMPO REAL
// =======================================================

const HelpGoStore = (() => {
    // Chaves no LocalStorage
    const STORAGE_KEY_PEDIDOS = "helpgo_pedidos_db";
    const STORAGE_KEY_PRESTADORES = "helpgo_prestadores_db";
    const STORAGE_KEY_NOTIFS_CLIENTE = "helpgo_notifs_cliente";
    const STORAGE_KEY_NOTIFS_PRESTADOR = "helpgo_notifs_prestador";
    const STORAGE_KEY_STATUS_PRESTADOR = "helpgo_prestador_online_status";

    // Base inicial de Prestadores Cadastrados com Notas Reais
    const PRESTADORES_INICIAIS = [
        {
            id: "prest-1",
            nome: "Carlos Eduardo Silva",
            apelido: "Carlos Silva",
            especialidade: "Eletricista Residencial e Industrial",
            categoria: "eletricista",
            icone: "⚡",
            avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#10b981",
            nota: 4.9,
            totalAvaliacoes: 42,
            servicosConcluidos: 68,
            distancia: "1.4 km",
            tempoResposta: "~10 min",
            online: true,
            verificado: true,
            telefone: "(11) 98765-4321",
            precoMedio: "A partir de R$ 90",
            bio: "Eletricista credenciado pelo SENAI com mais de 8 anos de experiência em instalações elétricas residenciais, reparo de quadros de disjuntores, chuveiros e iluminação LED.",
            tags: ["Pontual", "Preço Justo", "Excelente Atendimento", "Garantia de 90 dias"],
            avaliacoes: [
                {
                    cliente: "Mariana Souza",
                    data: "Ontem às 16:40",
                    nota: 5,
                    comentario: "Excelente profissional! Chegou no horário combinado, identificou o curto no disjuntor em poucos minutos e resolveu tudo com muita segurança.",
                    tag: "Super Pontual"
                },
                {
                    cliente: "Ricardo Alcantara",
                    data: "Há 3 dias",
                    nota: 5,
                    comentario: "Instalação impecável dos lustres da sala e fiação do ar. Muito limpo e cuidadoso com os móveis. Recomendo de olhos fechados!",
                    tag: "Trabalho Impecável"
                },
                {
                    cliente: "Fernanda Lima",
                    data: "Há 1 semana",
                    nota: 4.8,
                    comentario: "Preço super justo e serviço muito rápido. Explicou tudo que precisava ser trocado de forma transparente.",
                    tag: "Preço Justo"
                }
            ]
        },
        {
            id: "prest-2",
            nome: "Roberto Mendes Ferreira",
            apelido: "Roberto Ferreira",
            especialidade: "Encanador e Reparos Hidráulicos",
            categoria: "encanador",
            icone: "🔧",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#3b82f6",
            nota: 4.8,
            totalAvaliacoes: 35,
            servicosConcluidos: 53,
            distancia: "2.1 km",
            tempoResposta: "~15 min",
            online: true,
            verificado: true,
            telefone: "(11) 97654-3210",
            precoMedio: "A partir de R$ 80",
            bio: "Especialista em detecção de vazamentos não destrutiva, desentupimentos em geral, troca de válvulas Hydra, torneiras e instalação de caixas d'água.",
            tags: ["Rápido", "Equipamento Próprio", "Solução sem Quebra-Quebra"],
            avaliacoes: [
                {
                    cliente: "Patrícia Gomes",
                    data: "Hoje às 11:20",
                    nota: 5,
                    comentario: "Estava com um vazamento na pia da cozinha há dias. O Roberto veio rapidamente e trocou a tubulação em 30 minutos.",
                    tag: "Emergência Atendida"
                },
                {
                    cliente: "Gabriel Costa",
                    data: "Há 4 dias",
                    nota: 4.6,
                    comentario: "Resolveu o problema da válvula do banheiro que não parava de vazar. Muito educado e pontual.",
                    tag: "Excelente Atendimento"
                }
            ]
        },
        {
            id: "prest-3",
            nome: "Marcos Vinicius Santos",
            apelido: "Marcos Pinturas",
            especialidade: "Pintor Residencial e Comercial",
            categoria: "pintor",
            icone: "🎨",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#f97316",
            nota: 5.0,
            totalAvaliacoes: 29,
            servicosConcluidos: 41,
            distancia: "3.5 km",
            tempoResposta: "~20 min",
            online: true,
            verificado: true,
            telefone: "(11) 96543-2109",
            precoMedio: "Orçamento por m²",
            bio: "Mais de 10 anos transformando ambientes com pintura lisa, textura projetada, cimento queimado, emassamento e restauração de paredes e tetos.",
            tags: ["Caprichoso", "Ambiente Limpo", "Acabamento Premium"],
            avaliacoes: [
                {
                    cliente: "Juliana Peixoto",
                    data: "Há 2 dias",
                    nota: 5,
                    comentario: "O Marcos é um artista! Fez um efeito cimento queimado na minha sala que ficou perfeito. Cobriu todos os móveis e não deixou uma gota de sujeira.",
                    tag: "Acabamento Perfeito"
                },
                {
                    cliente: "Lucas Nogueira",
                    data: "Há 1 semana",
                    nota: 5,
                    comentario: "Pintou meu apartamento inteiro no prazo combinado. Super profissional e de confiança!",
                    tag: "Super Confiável"
                }
            ]
        },
        {
            id: "prest-4",
            nome: "Juliana Andrade",
            apelido: "Juliana Climatização",
            especialidade: "Instalação e Higienização de Ar-Condicionado",
            categoria: "ar-condicionado",
            icone: "❄️",
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#06b6d4",
            nota: 4.9,
            totalAvaliacoes: 38,
            servicosConcluidos: 62,
            distancia: "2.8 km",
            tempoResposta: "~12 min",
            online: true,
            verificado: true,
            telefone: "(11) 95432-1098",
            precoMedio: "A partir de R$ 150",
            bio: "Técnica certificada para instalação de aparelhos Split, Inverter e Multi-split. Higienização antibacteriana profunda com laudo técnico.",
            tags: ["Certificada", "Higienização Profunda", "Garantia 1 Ano"],
            avaliacoes: [
                {
                    cliente: "Beatriz Ramos",
                    data: "Ontem às 14:15",
                    nota: 5,
                    comentario: "A Juliana fez a limpeza completa de dois aparelhos de ar. Estão gelando muito mais e sem cheiro nenhum!",
                    tag: "Ótima Qualidade"
                }
            ]
        },
        {
            id: "prest-5",
            nome: "André Luís Chaves",
            apelido: "André Chaveiro 24h",
            especialidade: "Chaveiro e Fechaduras Digitais",
            categoria: "chaveiro",
            icone: "🔑",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#8b5cf6",
            nota: 4.7,
            totalAvaliacoes: 51,
            servicosConcluidos: 89,
            distancia: "1.1 km",
            tempoResposta: "~8 min",
            online: true,
            verificado: true,
            telefone: "(11) 94321-0987",
            precoMedio: "A partir de R$ 70",
            bio: "Atendimento de emergência 24 horas. Abertura técnica de portas, confecção de cópias de chaves codificadas e instalação de fechaduras eletrônicas / biométricas.",
            tags: ["Emergência 24h", "Atendimento em 10min", "Fechaduras Digitais"],
            avaliacoes: [
                {
                    cliente: "Claudio Martins",
                    data: "Ontem às 22:30",
                    nota: 5,
                    comentario: "Fiquei trancado para fora à noite e o André chegou em 10 minutos. Abriu sem danificar a porta. Salvou meu dia!",
                    tag: "Super Rápido"
                }
            ]
        },
        {
            id: "prest-6",
            nome: "Ana Paula Silva",
            apelido: "Ana Limpeza & Organização",
            especialidade: "Limpeza Residencial e Pós-Obra",
            categoria: "limpeza",
            icone: "🧹",
            avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            fotoBg: "#eab308",
            nota: 4.9,
            totalAvaliacoes: 44,
            servicosConcluidos: 76,
            distancia: "1.9 km",
            tempoResposta: "~15 min",
            online: true,
            verificado: true,
            telefone: "(11) 93210-9876",
            precoMedio: "A partir de R$ 120",
            bio: "Diarista e especialista em higienização detalhada, organização de armários e limpeza pós-reforma. Produtos profissionais e máximo zelo pelo seu lar.",
            tags: ["Confiança Total", "Muito Caprichosa", "Pontualidade Britânica"],
            avaliacoes: [
                {
                    cliente: "Camila Duarte",
                    data: "Há 2 dias",
                    nota: 5,
                    comentario: "A Ana é maravilhosa! Deixou meu apartamento brilhando e tudo impecavelmente cheiroso e organizado.",
                    tag: "Muito Caprichosa"
                }
            ]
        }
    ];

    // Pedidos Iniciais Padrão para Demonstração Rica
    const PEDIDOS_INICIAIS = [
        {
            id: "req-101",
            clienteNome: "Mariana Souza",
            clienteEmail: "mariana@exemplo.com",
            servico: "⚡ Eletricista",
            servicoKey: "eletricista",
            descricao: "Troca de disjuntor que está desarmando frequentemente e revisão no quadro de força da residência.",
            cep: "01310-100",
            endereco: "Av. Paulista, Bela Vista - São Paulo/SP",
            urgencia: "urgente",
            orcamento: "R$ 150 - R$ 300",
            data: "Para hoje",
            dataCriacao: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            status: "aberto", // 'aberto', 'aceito', 'em_andamento', 'concluido', 'avaliado'
            prestadorId: null,
            prestadorNome: null
        },
        {
            id: "req-102",
            clienteNome: "Roberto Ferreira",
            clienteEmail: "roberto@exemplo.com",
            servico: "🔧 Encanador",
            servicoKey: "encanador",
            descricao: "Vazamento forte na tubulação da pia da cozinha que está escorrendo para dentro do armário.",
            cep: "04012-000",
            endereco: "Rua Domingos de Morais, Vila Mariana - São Paulo/SP",
            urgencia: "emergencia",
            orcamento: "R$ 120 - R$ 250",
            data: "Imediato",
            dataCriacao: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
            status: "aberto",
            prestadorId: null,
            prestadorNome: null
        },
        {
            id: "req-103",
            clienteNome: "Lucas Mendes",
            clienteEmail: "lucas@exemplo.com",
            servico: "⚡ Eletricista",
            servicoKey: "eletricista",
            descricao: "Troca de fiação antiga e novas tomadas na sala e quartos.",
            cep: "01311-000",
            endereco: "Bela Vista - São Paulo/SP",
            urgencia: "normal",
            orcamento: "R$ 250 - R$ 500",
            data: "Nesta semana",
            dataCriacao: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
            status: "em_andamento",
            prestadorId: "prest-1",
            prestadorNome: "Carlos Silva"
        }
    ];

    // ==========================================
    // INICIALIZAÇÃO DE DADOS
    // ==========================================
    function inicializar() {
        if (!localStorage.getItem(STORAGE_KEY_PRESTADORES)) {
            localStorage.setItem(STORAGE_KEY_PRESTADORES, JSON.stringify(PRESTADORES_INICIAIS));
        }
        if (!localStorage.getItem(STORAGE_KEY_PEDIDOS)) {
            localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(PEDIDOS_INICIAIS));
        }
        if (!localStorage.getItem(STORAGE_KEY_NOTIFS_CLIENTE)) {
            localStorage.setItem(STORAGE_KEY_NOTIFS_CLIENTE, JSON.stringify([
                {
                    id: "notif-c1",
                    titulo: "Bem-vindo ao HelpGo!",
                    mensagem: "Encontre os melhores profissionais avaliados da sua região agora mesmo.",
                    data: "Hoje",
                    lida: false,
                    icone: "🎉"
                }
            ]));
        }
        if (!localStorage.getItem(STORAGE_KEY_NOTIFS_PRESTADOR)) {
            localStorage.setItem(STORAGE_KEY_NOTIFS_PRESTADOR, JSON.stringify([
                {
                    id: "notif-p1",
                    titulo: "Novo chamado na sua área!",
                    mensagem: "Mariana S. solicitou um serviço de Troca de Disjuntor no Centro.",
                    data: "Há 35 min",
                    lida: false,
                    icone: "📬"
                }
            ]));
        }
    }

    inicializar();

    // ==========================================
    // MÉTODOS DE PRESTADORES
    // ==========================================
    function obterPrestadores() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_PRESTADORES);
            return data ? JSON.parse(data) : PRESTADORES_INICIAIS;
        } catch (e) {
            return PRESTADORES_INICIAIS;
        }
    }

    function obterPrestadorPorId(id) {
        const prestadores = obterPrestadores();
        return prestadores.find(p => p.id === id) || null;
    }

    function obterPrestadoresPorCategoria(categoria) {
        const prestadores = obterPrestadores();
        if (!categoria || categoria === "todos") return prestadores;
        return prestadores.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase());
    }

    // ==========================================
    // MÉTODOS DE PEDIDOS / SOLICITAÇÕES
    // ==========================================
    function obterPedidos() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_PEDIDOS);
            return data ? JSON.parse(data) : PEDIDOS_INICIAIS;
        } catch (e) {
            return PEDIDOS_INICIAIS;
        }
    }

    function salvarPedidos(pedidos) {
        localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(pedidos));
        dispararEvento("pedidos_atualizados", pedidos);
    }

    function criarPedido(dadosPedido) {
        const pedidos = obterPedidos();
        const novoPedido = {
            id: "req-" + Date.now(),
            clienteNome: dadosPedido.clienteNome || "Cliente HelpGo",
            clienteEmail: dadosPedido.clienteEmail || "cliente@helpgo.com",
            servico: dadosPedido.servico,
            servicoKey: dadosPedido.servicoKey || "outro",
            descricao: dadosPedido.descricao,
            cep: dadosPedido.cep,
            endereco: dadosPedido.endereco || "Endereço não informado",
            urgencia: dadosPedido.urgencia || "normal",
            orcamento: dadosPedido.orcamento || "A combinar",
            data: dadosPedido.data || "A combinar",
            dataCriacao: new Date().toISOString(),
            status: "aberto",
            prestadorId: dadosPedido.prestadorId || null,
            prestadorNome: dadosPedido.prestadorNome || null
        };

        pedidos.unshift(novoPedido);
        salvarPedidos(pedidos);

        // Notificar o prestador
        adicionarNotificacaoPrestador({
            titulo: `Novo chamado: ${novoPedido.servico}`,
            mensagem: `${novoPedido.clienteNome} solicitou um serviço em ${novoPedido.endereco.split("-")[0] || "sua região"}.`,
            icone: "🔔"
        });

        // Notificar o cliente
        adicionarNotificacaoCliente({
            titulo: "Solicitação Enviada com Sucesso!",
            mensagem: `Seu pedido de ${novoPedido.servico} foi enviado aos profissionais online da região.`,
            icone: "✅"
        });

        return novoPedido;
    }

    function aceitarPedido(pedidoId, prestadorInfo) {
        const pedidos = obterPedidos();
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) return null;

        pedido.status = "em_andamento";
        pedido.prestadorId = prestadorInfo.id || "prest-1";
        pedido.prestadorNome = prestadorInfo.nome || "Prestador HelpGo";
        pedido.dataAceite = new Date().toISOString();

        salvarPedidos(pedidos);

        // Notifica o cliente
        adicionarNotificacaoCliente({
            titulo: "Prestador a Caminho! 🚗",
            mensagem: `${pedido.prestadorNome} aceitou sua solicitação de "${pedido.servico}" e está iniciando o atendimento.`,
            icone: "🚀"
        });

        return pedido;
    }

    function recusarPedido(pedidoId) {
        const pedidos = obterPedidos();
        const index = pedidos.findIndex(p => p.id === pedidoId);
        if (index !== -1) {
            pedidos.splice(index, 1);
            salvarPedidos(pedidos);
        }
    }

    function concluirPedido(pedidoId) {
        const pedidos = obterPedidos();
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) return null;

        pedido.status = "concluido";
        pedido.dataConclusao = new Date().toISOString();

        salvarPedidos(pedidos);

        // Notifica o cliente para avaliar
        adicionarNotificacaoCliente({
            titulo: "Serviço Concluído! ⭐",
            mensagem: `O serviço de "${pedido.servico}" foi finalizado. Por favor, avalie o atendimento de ${pedido.prestadorNome || "seu profissional"}.`,
            icone: "⭐"
        });

        return pedido;
    }

    // ==========================================
    // SISTEMA DE NOTAS E AVALIAÇÕES
    // ==========================================
    function avaliarPrestador(pedidoId, prestadorId, { nota, comentario, tag, clienteNome }) {
        const pedidos = obterPedidos();
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
            pedido.status = "avaliado";
            pedido.avaliacao = {
                nota: Number(nota),
                comentario,
                tag,
                data: new Date().toISOString()
            };
            salvarPedidos(pedidos);
        }

        const prestadores = obterPrestadores();
        const prestador = prestadores.find(p => p.id === prestadorId) || prestadores[0];

        if (prestador) {
            if (!prestador.avaliacoes) prestador.avaliacoes = [];

            prestador.avaliacoes.unshift({
                cliente: clienteNome || (pedido ? pedido.clienteNome : "Cliente HelpGo"),
                data: "Agora mesmo",
                nota: Number(nota),
                comentario: comentario || "Excelente serviço, muito profissional!",
                tag: tag || "Recomendado"
            });

            prestador.totalAvaliacoes = (prestador.totalAvaliacoes || 0) + 1;
            prestador.servicosConcluidos = (prestador.servicosConcluidos || 0) + 1;

            // Recalcular média
            const soma = prestador.avaliacoes.reduce((acc, curr) => acc + (Number(curr.nota) || 5), 0);
            prestador.nota = Number((soma / prestador.avaliacoes.length).toFixed(1));

            localStorage.setItem(STORAGE_KEY_PRESTADORES, JSON.stringify(prestadores));
            dispararEvento("prestadores_atualizados", prestadores);

            // Notificar prestador
            adicionarNotificacaoPrestador({
                titulo: "Nova Avaliação Recebida! ⭐",
                mensagem: `${clienteNome || "Cliente"} avaliou seu atendimento com nota ${nota}/5.0: "${comentario ? comentario.substring(0, 45) + '...' : 'Ótimo atendimento!'}"`,
                icone: "⭐"
            });
        }

        return prestador;
    }

    // ==========================================
    // SISTEMA DE NOTIFICAÇÕES
    // ==========================================
    function obterNotificacoesCliente() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_NOTIFS_CLIENTE);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function adicionarNotificacaoCliente(notif) {
        const notifs = obterNotificacoesCliente();
        const nova = {
            id: "notif-" + Date.now(),
            titulo: notif.titulo,
            mensagem: notif.mensagem,
            data: "Agora mesmo",
            lida: false,
            icone: notif.icone || "🔔"
        };
        notifs.unshift(nova);
        localStorage.setItem(STORAGE_KEY_NOTIFS_CLIENTE, JSON.stringify(notifs));
        dispararEvento("notificacoes_cliente_atualizadas", notifs);
        tocarSomNotificacao();
    }

    function marcarTodasLidasCliente() {
        const notifs = obterNotificacoesCliente();
        notifs.forEach(n => n.lida = true);
        localStorage.setItem(STORAGE_KEY_NOTIFS_CLIENTE, JSON.stringify(notifs));
        dispararEvento("notificacoes_cliente_atualizadas", notifs);
    }

    function obterNotificacoesPrestador() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_NOTIFS_PRESTADOR);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function adicionarNotificacaoPrestador(notif) {
        const notifs = obterNotificacoesPrestador();
        const nova = {
            id: "notif-p-" + Date.now(),
            titulo: notif.titulo,
            mensagem: notif.mensagem,
            data: "Agora mesmo",
            lida: false,
            icone: notif.icone || "🔔"
        };
        notifs.unshift(nova);
        localStorage.setItem(STORAGE_KEY_NOTIFS_PRESTADOR, JSON.stringify(notifs));
        dispararEvento("notificacoes_prestador_atualizadas", notifs);
        tocarSomNotificacao();
    }

    function marcarTodasLidasPrestador() {
        const notifs = obterNotificacoesPrestador();
        notifs.forEach(n => n.lida = true);
        localStorage.setItem(STORAGE_KEY_NOTIFS_PRESTADOR, JSON.stringify(notifs));
        dispararEvento("notificacoes_prestador_atualizadas", notifs);
    }

    // ==========================================
    // STATUS ONLINE / PESSOAS ONLINE
    // ==========================================
    function setPrestadorStatusOnline(isOnline) {
        localStorage.setItem(STORAGE_KEY_STATUS_PRESTADOR, JSON.stringify(isOnline));
        dispararEvento("status_prestador_alterado", isOnline);
    }

    function getPrestadorStatusOnline() {
        const val = localStorage.getItem(STORAGE_KEY_STATUS_PRESTADOR);
        return val === null ? true : JSON.parse(val);
    }

    function getContagemOnline() {
        const prestadores = obterPrestadores();
        const onlineCount = prestadores.filter(p => p.online).length;
        return {
            prestadoresOnline: Math.max(onlineCount, 8),
            clientesAtivos: 24,
            chamadosHoje: 42
        };
    }

    // ==========================================
    // SONS & EVENTOS CROSS-TAB
    // ==========================================
    function tocarSomNotificacao() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {
            // Áudio opcional / silencioso se bloqueado
        }
    }

    function dispararEvento(nome, dados) {
        window.dispatchEvent(new CustomEvent(nome, { detail: dados }));
    }

    // Escutar eventos do LocalStorage (outras abas/janelas)
    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY_PEDIDOS) {
            try {
                dispararEvento("pedidos_atualizados", JSON.parse(event.newValue));
            } catch (e) {}
        }
        if (event.key === STORAGE_KEY_NOTIFS_CLIENTE) {
            try {
                dispararEvento("notificacoes_cliente_atualizadas", JSON.parse(event.newValue));
            } catch (e) {}
        }
        if (event.key === STORAGE_KEY_NOTIFS_PRESTADOR) {
            try {
                dispararEvento("notificacoes_prestador_atualizadas", JSON.parse(event.newValue));
            } catch (e) {}
        }
        if (event.key === STORAGE_KEY_PRESTADORES) {
            try {
                dispararEvento("prestadores_atualizados", JSON.parse(event.newValue));
            } catch (e) {}
        }
        if (event.key === STORAGE_KEY_STATUS_PRESTADOR) {
            try {
                dispararEvento("status_prestador_alterado", JSON.parse(event.newValue));
            } catch (e) {}
        }
    });

    // API Pública
    return {
        obterPrestadores,
        obterPrestadorPorId,
        obterPrestadoresPorCategoria,
        obterPedidos,
        criarPedido,
        aceitarPedido,
        recusarPedido,
        concluirPedido,
        avaliarPrestador,
        obterNotificacoesCliente,
        adicionarNotificacaoCliente,
        marcarTodasLidasCliente,
        obterNotificacoesPrestador,
        adicionarNotificacaoPrestador,
        marcarTodasLidasPrestador,
        setPrestadorStatusOnline,
        getPrestadorStatusOnline,
        getContagemOnline,
        tocarSomNotificacao
    };
})();
