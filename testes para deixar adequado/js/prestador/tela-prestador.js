// =======================================================
// HELPGO - TELA DO PRESTADOR DE SERVIÇOS (PHP + SQLITE)
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
            const usuarioDb = await AuthService.obterUsuarioAtual();
            if (usuarioDb?.id) {
                prestadorAtual.id = usuarioDb.id;
                preencherDadosPrestador(usuarioDb.nome, usuarioDb.email, usuarioDb.categoria || "Especialista");
                if (typeof usuarioDb.ativo === "boolean" || typeof usuarioDb.ativo === "number") {
                    isOnline = Boolean(usuarioDb.ativo);
                    atualizarVisualStatus(isOnline);
                }
            }
        } catch (err) {
            console.warn("[TelaPrestador] Erro ao carregar dados do prestador:", err);
        }

        // Se for o admin mestre testenedfor@gmail.com, exibir botão ADM
        if (prestadorAtual.email && prestadorAtual.email.toLowerCase() === "testenedfor@gmail.com") {
            adicionarBotaoAdm();
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

    function adicionarBotaoAdm() {
        const menuNav = document.querySelector(".menu");
        if (menuNav && !document.getElementById("btnAdmMenuNavProv")) {
            const admLink = document.createElement("a");
            admLink.id = "btnAdmMenuNavProv";
            admLink.href = "./admin.html";
            admLink.className = "nav-link-adm";
            admLink.innerHTML = "👑 Painel ADM";
            admLink.style.marginLeft = "12px";
            menuNav.appendChild(admLink);
        }

        if (userMenu && !document.getElementById("btnAdmDropdownProv")) {
            const admItem = document.createElement("a");
            admItem.id = "btnAdmDropdownProv";
            admItem.href = "./admin.html";
            admItem.style.color = "#10b981";
            admItem.style.fontWeight = "700";
            admItem.innerHTML = "👑 Painel ADM Master";
            userMenu.insertBefore(admItem, userMenu.firstChild);
        }
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

            if (prestadorAtual.id) {
                await PrestadoresService.atualizarStatus(prestadorAtual.id, isOnline);
            }

            if (isOnline) {
                mostrarToast("Você está ONLINE e visível no banco para os clientes!");
            } else {
                mostrarToast("Seu status foi alterado para INDISPONÍVEL.");
            }
        });
    }

    /* =======================================================
       4. CARREGAMENTO DE CHAMADOS RECEBIDOS
    ======================================================= */
    async function renderizarChamados() {
        if (!requestsGrid) return;

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

            return `
                <div class="request-card-item" id="req-card-${p.id}">
                    <div class="card-top">
                        <div class="service-pill eletrica">
                            ${_escape(p.servico)}
                        </div>
                        ${urgencyBadge}
                    </div>

                    <h3 class="request-title">${_escape(p.descricao).length > 55 ? _escape(p.descricao).substring(0, 55) + '...' : _escape(p.descricao)}</h3>
                    <p class="request-desc">${_escape(p.descricao)}</p>

                    <div class="request-meta">
                        <div class="meta-item">
                            <span>📍</span>
                            <strong>${p.endereco ? _escape(p.endereco.split("-")[0]) : 'Na sua região'}</strong>
                        </div>
                        <div class="meta-item">
                            <span>👤</span>
                            <strong>${_escape(p.clienteNome || 'Cliente')}</strong>
                        </div>
                        <div class="meta-item">
                            <span>📅</span>
                            <strong>${_escape(p.data || 'Não informado')}</strong>
                        </div>
                        <div class="meta-item">
                            <span>💰</span>
                            <strong class="budget-tag">${_escape(p.orcamento || 'A combinar')}</strong>
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="btn-action btn-accept" onclick="aceitarChamadoStore('${p.id}')">
                            ✓ Aceitar Chamado
                        </button>
                        <button class="btn-action btn-details" onclick="abrirDetalhesStore('${p.id}')">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    /* =======================================================
       5. SERVIÇOS EM ANDAMENTO COM CHAT
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
                    <strong>${_escape(p.servico)} - ${_escape(p.descricao).substring(0, 45)}...</strong>
                    <span>Cliente: ${_escape(p.clienteNome || 'Cliente')} • Local: ${_escape(p.endereco || 'Informado')}</span>
                </div>

                <div class="active-status-tag em-andamento">
                    Em Andamento
                </div>

                <div class="active-item-actions" style="display:flex; gap:8px;">
                    <button class="btn-action btn-chat-action" onclick="ChatService.abrirChat({ solicitacaoId: ${p.id}, destinatarioId: ${p.clienteId}, nome: '${_escape(p.clienteNome || 'Cliente')}', tipo: 'Cliente' })">
                        💬 Chat com Cliente
                    </button>
                    <button class="btn-finish" onclick="concluirServicoStore('${p.id}')">
                        ✓ Concluir Atendimento
                    </button>
                </div>
            </div>
        `).join("");
    }

    /* =======================================================
       6. AÇÕES DE CHAMADOS (ACEITAR, CONCLUIR)
    ======================================================= */
    window.aceitarChamadoStore = async function(pedidoId) {
        const card = document.getElementById(`req-card-${pedidoId}`);
        if (card) {
            card.style.transition = "all 0.3s ease";
            card.style.opacity = "0.4";
            card.style.transform = "scale(0.98)";
        }

        try {
            await PedidosService.aceitarPedido(pedidoId);
            await renderizarChamados();
            await renderizarEmAndamento();
            mostrarToast("Chamado aceito com sucesso! Movido para 'Em Andamento'.");
        } catch (erro) {
            alert(erro.message || "Não foi possível aceitar este chamado.");
            await renderizarChamados();
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
        const p = pedidosPrestador.find(item => Number(item.id) === Number(pedidoId));
        if (!p) return;

        selectedRequestDetails = p;

        document.getElementById("modalTitle").textContent = p.servico;
        document.getElementById("modalClientName").textContent = p.clienteNome || "Cliente";
        document.getElementById("modalLocation").textContent = p.endereco;
        document.getElementById("modalBudget").textContent = p.orcamento;
        document.getElementById("modalDescription").textContent = p.descricao;

        if (modal) modal.classList.add("show");
    };

    function fecharModalDetalhes() {
        if (modal) modal.classList.remove("show");
    }

    if (closeModalBtn) closeModalBtn.addEventListener("click", fecharModalDetalhes);
    if (modalCloseActionBtn) modalCloseActionBtn.addEventListener("click", fecharModalDetalhes);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) fecharModalDetalhes();
        });
    }

    if (modalAcceptBtn) {
        modalAcceptBtn.addEventListener("click", () => {
            if (selectedRequestDetails) {
                fecharModalDetalhes();
                aceitarChamadoStore(selectedRequestDetails.id);
            }
        });
    }

    function mostrarToast(texto) {
        if (!toast) return;
        if (toastText) toastText.textContent = texto;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }

    function _escape(str) {
        if (!str) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /* =======================================================
       7. POLLING DE NOVOS CHAMADOS & MENU LOGOUT
    ======================================================= */
    // Polling a cada 5 segundos para receber novos chamados de clientes em tempo real
    setInterval(async () => {
        const novosPedidos = await PedidosService.listarSolicitacoesPrestador();
        if (novosPedidos.length > 0) {
            pedidosPrestador = novosPedidos;
            await renderizarChamados();
            await renderizarEmAndamento();
        }
    }, 5000);

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
            if (confirm("Deseja realmente sair?")) {
                await AuthService.fazerLogout();
            }
        });
    }

    /* =======================================================
       8. INICIALIZAÇÃO
    ======================================================= */
    await carregarDadosPrestador();
    await renderizarChamados();
    await renderizarEmAndamento();

});
