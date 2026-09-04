// ==========================================
// HELPGO - TELA DO PRESTADOR DE SERVIÇOS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    /* ==============================
       ELEMENTOS DA INTERFACE
    ================================= */
    const providerName = document.getElementById("providerName");
    const welcomeProviderName = document.getElementById("welcomeProviderName");
    const providerAvatar = document.getElementById("providerAvatar");
    const profileAvatarLarge = document.getElementById("profileAvatarLarge");
    const profileNameDisplay = document.getElementById("profileNameDisplay");
    const profileEmailDisplay = document.getElementById("profileEmailDisplay");
    const profileCategoryDisplay = document.getElementById("profileCategoryDisplay");
    const profileAvailabilityDisplay = document.getElementById("profileAvailabilityDisplay");

    const statusToggleBtn = document.getElementById("statusToggleBtn");
    const statusText = document.getElementById("statusText");
    const statStatusDisplay = document.getElementById("statStatusDisplay");

    const userMenuBtn = document.getElementById("userMenuBtn");
    const userMenu = document.getElementById("userMenu");
    const btnLogout = document.getElementById("btnLogout");

    const modal = document.getElementById("modalDetalhes");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modalCloseActionBtn = document.getElementById("modalCloseActionBtn");
    const modalAcceptBtn = document.getElementById("modalAcceptBtn");

    const toast = document.getElementById("toastMessage");
    const toastText = document.getElementById("toastText");

    let isOnline = true;
    let selectedRequestDetails = null;

    /* ==============================
       CARREGAR DADOS DO PRESTADOR
    ================================= */
    function preencherDadosPrestador(nome, email, categoria) {
        const primeiroNome = nome ? nome.split(" ")[0] : "Profissional";
        const inicial = primeiroNome.charAt(0).toUpperCase();

        if (providerName) providerName.textContent = primeiroNome;
        if (welcomeProviderName) welcomeProviderName.textContent = primeiroNome;
        if (profileNameDisplay) profileNameDisplay.textContent = nome || "Prestador HelpGo";
        if (providerAvatar) providerAvatar.textContent = inicial;
        if (profileAvatarLarge) profileAvatarLarge.textContent = inicial;
        if (profileEmailDisplay && email) profileEmailDisplay.textContent = email;
        if (profileCategoryDisplay && categoria) profileCategoryDisplay.textContent = categoria;
    }

    // 1. Tentar ler do localStorage
    const savedUserStr = localStorage.getItem("helpgo_user");
    if (savedUserStr) {
        try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser.nome) {
                preencherDadosPrestador(savedUser.nome, savedUser.email, savedUser.categoria);
            }
        } catch (e) {
            console.error("Erro ao ler localStorage:", e);
        }
    }

    // 2. Buscar da sessão do Supabase se disponível
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        supabaseClient.auth.getUser().then(({ data }) => {
            if (data?.user) {
                const meta = data.user.user_metadata || {};
                const nome = meta.nome || data.user.email?.split("@")[0];
                const email = data.user.email;
                const categoria = meta.categoria || "Especialista";
                preencherDadosPrestador(nome, email, categoria);
            }
        }).catch(err => console.warn("Aviso ao buscar usuário Supabase:", err));
    }

    /* ==============================
       TOGGLE DE STATUS (ONLINE/OFFLINE)
    ================================= */
    if (statusToggleBtn) {
        statusToggleBtn.addEventListener("click", () => {
            isOnline = !isOnline;

            if (isOnline) {
                statusToggleBtn.className = "status-badge online";
                statusText.textContent = "Disponível";
                if (statStatusDisplay) statStatusDisplay.textContent = "Online";
                if (profileAvailabilityDisplay) profileAvailabilityDisplay.textContent = "🟢 Online para novos pedidos";
                mostrarToast("Você está ONLINE e recebendo novos chamados!");
            } else {
                statusToggleBtn.className = "status-badge offline";
                statusText.textContent = "Indisponível";
                if (statStatusDisplay) statStatusDisplay.textContent = "Pausado";
                if (profileAvailabilityDisplay) profileAvailabilityDisplay.textContent = "⚪ Atendimento pausado temporariamente";
                mostrarToast("Seu status foi alterado para INDISPONÍVEL.");
            }
        });
    }

    /* ==============================
       MENU DO USUÁRIO
    ================================= */
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

    /* ==============================
       LOGOUT
    ================================= */
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();

            const confirmar = confirm("Deseja realmente sair da sua conta?");
            if (confirmar) {
                if (typeof supabaseClient !== "undefined" && supabaseClient) {
                    try {
                        await supabaseClient.auth.signOut();
                    } catch (err) {
                        console.warn("Erro ao deslogar:", err);
                    }
                }

                localStorage.removeItem("helpgo_user");
                window.location.href = "./login.html";
            }
        });
    }

    /* ==============================
       MODAL DE DETALHES
    ================================= */
    window.abrirDetalhes = function (servico, cliente, descricao, local, orcamento) {
        selectedRequestDetails = { servico, cliente, descricao, local, orcamento };

        document.getElementById("modalTitle").textContent = servico;
        document.getElementById("modalClientName").textContent = cliente;
        document.getElementById("modalLocation").textContent = local;
        document.getElementById("modalBudget").textContent = orcamento;
        document.getElementById("modalDescription").textContent = descricao;

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
                mostrarToast(`Chamado de ${selectedRequestDetails.servico} aceito com sucesso!`);
            }
        });
    }

    /* ==============================
       AÇÕES DE CHAMADOS
    ================================= */
    window.aceitarChamado = function (cardId, servico, cliente) {
        const card = document.getElementById(cardId);
        if (card) {
            card.style.transition = "all 0.3s ease";
            card.style.opacity = "0.5";
            card.style.transform = "scale(0.98)";

            setTimeout(() => {
                card.remove();
                atualizarContadorChamados();
                adicionarAoAndamento(servico, cliente);
                mostrarToast(`Chamado de "${servico}" aceito! Movido para "Em Andamento".`);
            }, 300);
        }
    };

    window.recusarChamado = function (cardId) {
        const confirmar = confirm("Deseja recusar este chamado?");
        if (confirmar) {
            const card = document.getElementById(cardId);
            if (card) {
                card.style.transition = "all 0.3s ease";
                card.style.opacity = "0";
                card.style.transform = "translateX(50px)";

                setTimeout(() => {
                    card.remove();
                    atualizarContadorChamados();
                    mostrarToast("Chamado recusado.");
                }, 300);
            }
        }
    };

    window.concluirServico = function (btnElement) {
        const confirmar = confirm("Confirmar a conclusão deste serviço?");
        if (confirmar) {
            const item = btnElement.closest(".active-item");
            if (item) {
                item.style.transition = "all 0.3s ease";
                item.style.opacity = "0";
                setTimeout(() => {
                    item.remove();
                    mostrarToast("Parabéns! Serviço concluído com sucesso.");
                }, 300);
            }
        }
    };

    function adicionarAoAndamento(servico, cliente) {
        const list = document.getElementById("activeServicesList");
        if (!list) return;

        const novoItem = document.createElement("div");
        novoItem.className = "active-item";
        novoItem.innerHTML = `
            <div class="active-item-icon">🛠️</div>
            <div class="active-item-info">
                <strong>${servico}</strong>
                <span>Cliente: <strong>${cliente}</strong> | Local: Na sua região</span>
            </div>
            <div class="active-status-tag em-andamento">Em Andamento</div>
            <div class="active-item-actions">
                <button class="btn-chat" onclick="alert('Abrindo contato com o cliente ${cliente}...')">💬 WhatsApp</button>
                <button class="btn-finish" onclick="concluirServico(this)">✓ Concluir</button>
            </div>
        `;

        list.prepend(novoItem);
    }

    function atualizarContadorChamados() {
        const grid = document.getElementById("requestsGrid");
        const count = grid ? grid.querySelectorAll(".request-card-item").length : 0;
        const chamadosCount = document.getElementById("chamadosCount");
        const statTotalChamados = document.getElementById("statTotalChamados");

        if (chamadosCount) chamadosCount.textContent = `${count} ${count === 1 ? "solicitação aberta" : "solicitações abertas"}`;
        if (statTotalChamados) statTotalChamados.textContent = count;

        if (count === 0 && grid) {
            grid.innerHTML = `
                <div style="background: white; border: 1px dashed #d1d5db; border-radius: 14px; padding: 40px; text-align: center; color: #6b7280;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
                    <strong>Nenhum chamado pendente no momento</strong>
                    <p style="font-size: 13px; margin-top: 4px;">Assim que um novo cliente solicitar um serviço na sua região, ele aparecerá aqui.</p>
                </div>
            `;
        }
    }

    /* ==============================
       TOAST DE NOTIFICAÇÃO
    ================================= */
    function mostrarToast(mensagem) {
        if (!toast || !toastText) return;

        toastText.textContent = mensagem;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

});
