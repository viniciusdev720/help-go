// =======================================================
// HELPGO - TELA DO PRESTADOR DE SERVIÇOS (100% DINÂMICA)
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // 0. VALIDAÇÃO DE AUTENTICAÇÃO E PERMISSÃO DE PRESTADOR VIA GUARD
    if (typeof Guard !== "undefined") {
        const usuarioAutenticado = await Guard.requireAuth("prestador");
        if (!usuarioAutenticado) return;
    }

    /* =======================================================
       1. ELEMENTOS DA INTERFACE
    ======================================================= */
    const providerName = document.getElementById("providerName");
    const welcomeProviderName = document.getElementById("welcomeProviderName");
    const providerAvatar = document.getElementById("providerAvatar");
    const profileAvatarLarge = document.getElementById("profileAvatarLarge");
    const profileNameDisplay = document.getElementById("profileNameDisplay");
    const profileEmailDisplay = document.getElementById("profileEmailDisplay");
    const profileCategoryDisplay = document.getElementById("profileCategoryDisplay");
    const profileAvailabilityDisplay = document.getElementById("profileAvailabilityDisplay");

    // Toggle de Status
    const statusToggleBtn = document.getElementById("statusToggleBtn");
    const statusText = document.getElementById("statusText");
    const statStatusDisplay = document.getElementById("statStatusDisplay");

    // Menu e Logout
    const userMenuBtn = document.getElementById("userMenuBtn");
    const userMenu = document.getElementById("userMenu");
    const btnLogout = document.getElementById("btnLogout");

    // Notificações
    const notificationBtn = document.getElementById("notificationBtn");
    const notifBadge = document.getElementById("notifBadge");
    const notifDropdownProvider = document.getElementById("notifDropdownProvider");
    const notifListProvider = document.getElementById("notifListProvider");
    const btnMarcarLidasProvider = document.getElementById("btnMarcarLidasProvider");

    // Contadores & Listas
    const requestsGrid = document.getElementById("requestsGrid");
    const chamadosCount = document.getElementById("chamadosCount");
    const statTotalChamados = document.getElementById("statTotalChamados");
    const activeServicesList = document.getElementById("activeServicesList");

    // Modal de Detalhes
    const modal = document.getElementById("modalDetalhes");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modalCloseActionBtn = document.getElementById("modalCloseActionBtn");
    const modalAcceptBtn = document.getElementById("modalAcceptBtn");

    // Toast
    const toast = document.getElementById("toastMessage");
    const toastText = document.getElementById("toastText");

    let isOnline = true;
    let selectedRequestDetails = null;
    let pedidosPrestador = [];

    let prestadorAtual = {
        id: null,
        nome: "Profissional",
        email: "",
        categoria: "Especialista"
    };

    /* =======================================================
       2. CARREGAR DADOS DO PRESTADOR AUTENTICADO
    ======================================================= */
    async function carregarDadosPrestador() {
        const usuarioLocal = AuthService.getUsuarioLocal();
        if (usuarioLocal?.nome) {
            preencherDadosPrestador(usuarioLocal.nome, usuarioLocal.email, usuarioLocal.categoria || "Especialista");
            prestadorAtual.id = usuarioLocal.id;
        }

        try {
            const usuarioSupabase = await AuthService.obterUsuarioAtual();
            if (usuarioSupabase?.id) {
                prestadorAtual.id = usuarioSupabase.id;
                await PrestadoresService.garantirPerfilPrestadorAtual();
                
                // Buscar dados completos da tabela prestadores
                const dadosDb = await PrestadoresService.buscarPrestadorPorId(usuarioSupabase.id);
                if (dadosDb) {
                    preencherDadosPrestador(dadosDb.nome, dadosDb.email, dadosDb.especialidade);
                    if (typeof dadosDb.ativo === "boolean") {
                        isOnline = dadosDb.ativo;
                        atualizarVisualStatus(isOnline);
                    }
                } else {
                    preencherDadosPrestador(usuarioSupabase.nome, usuarioSupabase.email, "Especialista");
                }
            }
        } catch (err) {
            console.warn("[TelaPrestador] Erro ao carregar dados do prestador:", err);
        }
    }

    function preencherDadosPrestador(nome, email, categoria) {
        prestadorAtual.nome = nome || "Profissional";
        prestadorAtual.email = email || "";
        prestadorAtual.categoria = categoria || "Especialista";

        const primeiroNome = prestadorAtual.nome.split(" ")[0];
        const inicial = primeiroNome.charAt(0).toUpperCase();

        if (providerName) providerName.textContent = primeiroNome;
        if (welcomeProviderName) welcomeProviderName.textContent = primeiroNome;
        if (profileNameDisplay) profileNameDisplay.textContent = prestadorAtual.nome;
        if (providerAvatar) providerAvatar.textContent = inicial;
        if (profileAvatarLarge) profileAvatarLarge.textContent = inicial;
        if (profileEmailDisplay) profileEmailDisplay.textContent = email || "Não informado";
        if (profileCategoryDisplay) profileCategoryDisplay.textContent = categoria || "Especialista";
    }

    /* =======================================================
       3. TOGGLE DE STATUS ONLINE / INDISPONÍVEL
    ======================================================= */
    function atualizarVisualStatus(online) {
        if (!statusToggleBtn) return;

        if (online) {
            statusToggleBtn.className = "status-badge online";
            if (statusText) statusText.textContent = "Disponível";
            if (statStatusDisplay) statStatusDisplay.textContent = "Online";
            if (profileAvailabilityDisplay) profileAvailabilityDisplay.textContent = "🟢 Online para novos pedidos";
        } else {
            statusToggleBtn.className = "status-badge offline";
            if (statusText) statusText.textContent = "Indisponível";
            if (statStatusDisplay) statStatusDisplay.textContent = "Pausado";
            if (profileAvailabilityDisplay) profileAvailabilityDisplay.textContent = "⚪ Atendimento pausado temporariamente";
        }
    }

    atualizarVisualStatus(isOnline);

    if (statusToggleBtn) {
        statusToggleBtn.addEventListener("click", async () => {
            isOnline = !isOnline;
            atualizarVisualStatus(isOnline);

            // Atualiza no banco se o prestador possuir ID
            if (prestadorAtual.id) {
                await PrestadoresService.atualizarStatus(prestadorAtual.id, isOnline);
            }

            if (isOnline) {
                mostrarToast("Você está ONLINE e visível para os clientes!");
            } else {
                mostrarToast("Seu status foi alterado para INDISPONÍVEL.");
            }
        });
    }

    /* =======================================================
       4. CARREGAMENTO E SINCRONIZAÇÃO DE CHAMADOS RECEBIDOS
    ======================================================= */
    async function renderizarChamados() {
        if (!requestsGrid) return;

        requestsGrid.innerHTML = `<div class="empty-request">Carregando solicitações...</div>`;
        let todosPedidos;
        try {
            todosPedidos = await PedidosService.listarSolicitacoesPrestador();
            pedidosPrestador = todosPedidos;
        } catch (erro) {
            if (chamadosCount) chamadosCount.textContent = "0 solicitações abertas";
            if (statTotalChamados) statTotalChamados.textContent = "0";
            requestsGrid.innerHTML = `<div class="empty-request"><strong>Não foi possível carregar as solicitações.</strong><span>Tente novamente.</span></div>`;
            return;
        }
        const pedidosAbertos = todosPedidos.filter(p => p.status === "aberto");
        const count = pedidosAbertos.length;

        if (chamadosCount) {
            chamadosCount.textContent = `${count} ${count === 1 ? 'solicitação aberta' : 'solicitações abertas'}`;
        }
        if (statTotalChamados) {
            statTotalChamados.textContent = count;
        }

        if (pedidosAbertos.length === 0) {
            requestsGrid.innerHTML = `
                <div style="background: white; border: 1px dashed #d1d5db; border-radius: 14px; padding: 40px; text-align: center; color: #6b7280; grid-column: 1 / -1;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                    <strong>Nenhum chamado aberto pendente no momento</strong>
                    <p style="font-size: 13px; margin-top: 4px;">Assim que um cliente solicitar um serviço na sua região, ele aparecerá aqui instantaneamente.</p>
                </div>
            `;
            return;
        }

        requestsGrid.innerHTML = pedidosAbertos.map(p => {
            let urgencyBadge = `<span class="urgency-badge normal">🟢 Normal</span>`;
            if (p.urgencia === "urgente") urgencyBadge = `<span class="urgency-badge urgente">🟡 Urgente</span>`;
            if (p.urgencia === "emergencia") urgencyBadge = `<span class="urgency-badge emergencia">🔴 Emergência</span>`;

            let pillClass = "eletrica";
            const servLower = (p.servicoKey || p.servico || "").toLowerCase();
            if (servLower.includes("encan")) pillClass = "encanamento";
            if (servLower.includes("pint")) pillClass = "manutencao";

            return `
                <div class="request-card-item" id="req-card-${p.id}">
                    <div class="card-top">
                        <div class="service-pill ${pillClass}">
                            ${p.servico}
                        </div>
                        ${urgencyBadge}
                    </div>

                    <h3 class="request-title">${p.descricao.length > 55 ? p.descricao.substring(0, 55) + '...' : p.descricao}</h3>
                    <p class="request-desc">${p.descricao}</p>

                    <div class="request-meta">
                        <div class="meta-item">
                            <span>📍</span>
                            <strong>${p.endereco ? p.endereco.split("-")[0] : 'Na sua região'}</strong>
                        </div>
                        <div class="meta-item">
                            <span>👤</span>
                            <strong>Cliente</strong>
                        </div>
                        <div class="meta-item">
                            <span>📅</span>
                            <strong>${p.data || 'Não informado'}</strong>
                        </div>
                        <div class="meta-item">
                            <span>💰</span>
                            <strong class="budget-tag">${p.orcamento}</strong>
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="btn-action btn-accept" onclick="aceitarChamadoStore('${p.id}')">
                            ✓ Aceitar Chamado
                        </button>
                        <button class="btn-action btn-details" onclick="abrirDetalhesStore('${p.id}')">
                            Ver Detalhes
                        </button>
                        <button class="btn-action btn-decline" onclick="recusarChamadoStore('${p.id}')">
                            ✕ Recusar
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    /* =======================================================
       5. SERVIÇOS EM ANDAMENTO
    ======================================================= */
    async function renderizarEmAndamento() {
        if (!activeServicesList) return;

        let todosPedidos;
        try {
            todosPedidos = await PedidosService.listarSolicitacoesPrestador();
            pedidosPrestador = todosPedidos;
        } catch (erro) {
            activeServicesList.innerHTML = `<div class="empty-request"><strong>Não foi possível carregar os serviços.</strong><span>Tente novamente.</span></div>`;
            return;
        }
        const emAndamento = todosPedidos.filter(p => p.status === "em_andamento");

        if (emAndamento.length === 0) {
            activeServicesList.innerHTML = `
                <div style="background: white; border: 1px dashed #d1d5db; border-radius: 14px; padding: 30px; text-align: center; color: #6b7280; width: 100%;">
                    <div style="font-size: 28px; margin-bottom: 6px;">⏳</div>
                    <strong>Nenhum serviço em andamento no momento</strong>
                    <p style="font-size: 13px; margin-top: 4px;">Aceite um dos chamados acima para iniciar o atendimento.</p>
                </div>
            `;
            return;
        }

        activeServicesList.innerHTML = emAndamento.map(p => `
            <div class="active-item" id="active-req-${p.id}">
                <div class="active-item-info">
                    <strong>${p.servico} - ${p.descricao.substring(0, 45)}...</strong>
                    <span>Local: ${p.endereco || 'Não informado'}</span>
                </div>

                <div class="active-status-tag em-andamento">
                    Em Andamento
                </div>

                <div class="active-item-actions">
                    <button class="btn-finish" onclick="concluirServicoStore('${p.id}')">
                        ✓ Concluir Atendimento
                    </button>
                </div>
            </div>
        `).join("");
    }

    /* =======================================================
       6. AÇÕES DE CHAMADOS (ACEITAR, RECUSAR, CONCLUIR)
    ======================================================= */
    window.aceitarChamadoStore = async function(pedidoId) {
        const card = document.getElementById(`req-card-${pedidoId}`);
        if (card) {
            card.style.transition = "all 0.3s ease";
            card.style.opacity = "0.4";
            card.style.transform = "scale(0.98)";
        }

        try {
            const pedido = await PedidosService.aceitarPedido(pedidoId);
            await renderizarChamados();
            await renderizarEmAndamento();
            mostrarToast(`Chamado de "${pedido.servico}" aceito! Movido para "Em Andamento".`);
        } catch (erro) {
            alert(erro.message || "Não foi possível aceitar este chamado.");
            await renderizarChamados();
        }
    };

    window.recusarChamadoStore = function(pedidoId) {
        if (confirm("Deseja recusar este chamado?")) {
            mostrarToast("Recusa indisponível para esta solicitação.");
        }
    };

    window.concluirServicoStore = async function(pedidoId) {
        if (confirm("Confirmar a conclusão deste serviço? O cliente receberá a solicitação de avaliação.")) {
            await PedidosService.concluirPedido(pedidoId);
            await renderizarEmAndamento();
            await renderizarChamados();
            mostrarToast("Parabéns! Serviço concluído com sucesso.");
        }
    };

    // Modal de Detalhes
    window.abrirDetalhesStore = function(pedidoId) {
        const p = pedidosPrestador.find(item => item.id === pedidoId);
        if (!p) return;

        selectedRequestDetails = p;

        document.getElementById("modalTitle").textContent = p.servico;
        document.getElementById("modalClientName").textContent = "Não informado";
        document.getElementById("modalLocation").textContent = p.endereco;
        document.getElementById("modalBudget").textContent = p.orcamento;
        document.getElementById("modalDescription").textContent = p.descricao;

        if (modal) modal.classList.add("show");
    };

    function fecharModal() {
        if (modal) modal.classList.remove("show");
    }

    if (closeModalBtn) closeModalBtn.addEventListener("click", fecharModal);
    if (modalCloseActionBtn) modalCloseActionBtn.addEventListener("click", fecharModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) fecharModal();
        });
    }

    if (modalAcceptBtn) {
        modalAcceptBtn.addEventListener("click", () => {
            fecharModal();
            if (selectedRequestDetails) {
                window.aceitarChamadoStore(selectedRequestDetails.id);
            }
        });
    }

    /* =======================================================
       7. SISTEMA DE NOTIFICAÇÕES (DROPDOWN - PRESTADOR)
    ======================================================= */
    function atualizarNotificacoesPrestador() {
        const notifs = PedidosService.obterNotificacoesPrestador();
        const naoLidas = notifs.filter(n => !n.lida).length;

        if (notifBadge) {
            notifBadge.textContent = naoLidas;
            notifBadge.style.display = naoLidas > 0 ? "flex" : "none";
        }

        if (notifListProvider) {
            if (notifs.length === 0) {
                notifListProvider.innerHTML = `<div class="notif-empty">Nenhuma notificação no momento.</div>`;
            } else {
                notifListProvider.innerHTML = notifs.map(n => `
                    <div class="notif-item ${n.lida ? 'read' : 'unread'}">
                        <span class="notif-item-icon">${n.icone || '🔔'}</span>
                        <div class="notif-item-content">
                            <strong>${n.titulo}</strong>
                            <p>${n.mensagem}</p>
                            <small>${n.data}</small>
                        </div>
                    </div>
                `).join("");
            }
        }
    }

    if (notificationBtn && notifDropdownProvider) {
        notificationBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notifDropdownProvider.classList.toggle("show");
        });

        document.addEventListener("click", (e) => {
            if (!notifDropdownProvider.contains(e.target) && e.target !== notificationBtn) {
                notifDropdownProvider.classList.remove("show");
            }
        });
    }

    if (btnMarcarLidasProvider) {
        btnMarcarLidasProvider.addEventListener("click", () => {
            PedidosService.marcarTodasLidasPrestador();
            atualizarNotificacoesPrestador();
        });
    }

    /* =======================================================
       8. TOASTS
    ======================================================= */
    function mostrarToast(mensagem) {
        if (!toast || !toastText) return;

        toastText.textContent = mensagem;
        toast.classList.add("show");
        PedidosService.tocarSomNotificacao();

        setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }

    /* =======================================================
       9. LISTENERS EM TEMPO REAL & EVENTOS CROSS-TAB
    ======================================================= */
    window.addEventListener("pedidos_atualizados", () => {
        renderizarChamados();
        renderizarEmAndamento();
    });

    window.addEventListener("notificacoes_prestador_atualizadas", () => {
        atualizarNotificacoesPrestador();
    });

    window.addEventListener("status_prestador_alterado", (e) => {
        isOnline = e.detail;
        atualizarVisualStatus(isOnline);
    });

    /* =======================================================
       10. MENU E LOGOUT
    ======================================================= */
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userMenu.classList.toggle("show");
        });

        document.addEventListener("click", (e) => {
            if (!userMenu.contains(e.target) && e.target !== userMenuBtn) {
                userMenu.classList.remove("show");
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm("Deseja realmente sair da sua conta?")) {
                await AuthService.fazerLogout();
            }
        });
    }

    /* =======================================================
       11. INICIALIZAÇÃO
    ======================================================= */
    await carregarDadosPrestador();
    await renderizarChamados();
    await renderizarEmAndamento();
    atualizarNotificacoesPrestador();

});
