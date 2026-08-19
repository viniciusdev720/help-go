// =======================================================
// HELPGO - TELA DO CLIENTE
// =======================================================

document.addEventListener("DOMContentLoaded", () => {

    /* =======================================================
       1. ELEMENTOS DO DOM
    ======================================================= */
    const form = document.getElementById("serviceForm");
    const serviceSelect = document.getElementById("service");
    const descriptionInput = document.getElementById("description");
    const counter = document.getElementById("counter");
    const cepInput = document.getElementById("cep");
    const searchCepBtn = document.getElementById("searchCep");
    const addressText = document.getElementById("addressText");
    const urgencySelect = document.getElementById("urgency");
    const budgetSelect = document.getElementById("budget");
    const dateInput = document.getElementById("date");

    // Menu do Usuário
    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");
    const userMenuBtn = document.getElementById("userMenuBtn");
    const userMenu = document.getElementById("userMenu");
    const logoutBtn = document.getElementById("logout");

    // Notificações
    const notifBtnClient = document.getElementById("notifBtnClient");
    const notifBadgeClient = document.getElementById("notifBadgeClient");
    const notifDropdownClient = document.getElementById("notifDropdownClient");
    const notifListClient = document.getElementById("notifListClient");
    const btnMarcarLidasClient = document.getElementById("btnMarcarLidasClient");

    // Seção de Prestadores e Filtros
    const prestadoresGrid = document.getElementById("prestadoresGrid");
    const prestadoresFilter = document.getElementById("prestadoresFilter");
    const liveOnlineCount = document.getElementById("liveOnlineCount");

    // Seção de Minhas Solicitações
    const clientRequestsList = document.getElementById("clientRequestsList");
    const clientRequestsCount = document.getElementById("clientRequestsCount");

    // Modais
    const modalBusca = document.getElementById("modal");
    const closeModalBusca = document.getElementById("closeModal");
    const matchingProsContainer = document.getElementById("matchingProsContainer");
    const btnConfirmOrder = document.getElementById("btnConfirmOrder");
    const btnCancelOrder = document.getElementById("btnCancelOrder");

    const modalPerfil = document.getElementById("modalPerfilPrestador");
    const closeModalPerfil = document.getElementById("closeModalPerfil");
    const btnClosePro = document.getElementById("btnClosePro");
    const btnHirePro = document.getElementById("btnHirePro");

    const modalAvaliacao = document.getElementById("modalAvaliacao");
    const closeModalAvaliacao = document.getElementById("closeModalAvaliacao");
    const formAvaliacao = document.getElementById("formAvaliacao");
    const starRatingInteractive = document.getElementById("starRatingInteractive");
    const ratingTextFeedback = document.getElementById("ratingTextFeedback");
    const tagsOptions = document.getElementById("tagsOptions");
    const reviewComment = document.getElementById("reviewComment");
    const reviewPrestadorName = document.getElementById("reviewPrestadorName");

    // Toasts
    const toastClient = document.getElementById("toastMessageClient");
    const toastTitleClient = document.getElementById("toastTitleClient");
    const toastTextClient = document.getElementById("toastTextClient");
    const toastIconClient = document.getElementById("toastIconClient");

    // Variáveis de Estado
    let selectedRatingVal = 5;
    let selectedTagVal = "Super Pontual";
    let pendingOrderToEvaluate = null;
    let tempOrderData = null;
    let selectedProfilePro = null;

    /* =======================================================
       2. CARREGAR DADOS DO USUÁRIO
    ======================================================= */
    let loggedUser = { nome: "Cliente", email: "" };
    const savedUserStr = localStorage.getItem("helpgo_user");
    if (savedUserStr) {
        try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed.nome) {
                loggedUser = parsed;
                const primeiroNome = parsed.nome.split(" ")[0];
                if (userName) userName.textContent = primeiroNome;
                if (userAvatar) userAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        } catch (e) {
            console.error("Erro ao ler usuário:", e);
        }
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        supabaseClient.auth.getUser().then(({ data }) => {
            if (data?.user) {
                const nome = data.user.user_metadata?.nome || data.user.email?.split("@")[0];
                if (nome) {
                    loggedUser.nome = nome;
                    loggedUser.email = data.user.email;
                    const primeiroNome = nome.split(" ")[0];
                    if (userName) userName.textContent = primeiroNome;
                    if (userAvatar) userAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
                }
            }
        }).catch(err => console.warn("Aviso usuário Supabase:", err));
    }

    /* =======================================================
       3. CONTADOR DE CARACTERES & DATA MÍNIMA & CEP
    ======================================================= */
    if (descriptionInput && counter) {
        descriptionInput.addEventListener("input", () => {
            counter.textContent = descriptionInput.value.length;
        });
    }

    if (dateInput) {
        dateInput.min = new Date().toISOString().split("T")[0];
    }

    if (cepInput) {
        cepInput.addEventListener("input", () => {
            let value = cepInput.value.replace(/\D/g, "");
            if (value.length > 5) {
                value = value.substring(0, 5) + "-" + value.substring(5, 8);
            }
            cepInput.value = value;
        });
    }

    if (searchCepBtn && cepInput) {
        searchCepBtn.addEventListener("click", buscarCep);
    }

    async function buscarCep() {
        const cleanCep = cepInput.value.replace(/\D/g, "");
        if (cleanCep.length !== 8) {
            addressText.textContent = "Digite um CEP válido com 8 dígitos.";
            return;
        }

        addressText.textContent = "Buscando endereço...";

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();

            if (data.erro) {
                addressText.textContent = "CEP não encontrado. Digite novamente.";
                return;
            }

            const formatted = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
            addressText.textContent = formatted;
        } catch (err) {
            addressText.textContent = "Não foi possível consultar o CEP automaticamente.";
            console.error(err);
        }
    }

    /* =======================================================
       4. CARDS DE SERVIÇOS POPULARES
    ======================================================= */
    const serviceCards = document.querySelectorAll(".service-card");
    serviceCards.forEach(card => {
        card.addEventListener("click", () => {
            const serv = card.dataset.service;
            if (serviceSelect && serv) {
                serviceSelect.value = serv;
                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                serviceSelect.focus();
            }
        });
    });

    /* =======================================================
       5. RENDERIZAÇÃO DE PROFISSIONAIS COM NOTAS E STATUS ON
    ======================================================= */
    function renderizarPrestadores(categoria = "todos") {
        if (!prestadoresGrid) return;

        const prestadores = HelpGoStore.obterPrestadoresPorCategoria(categoria);
        prestadoresGrid.innerHTML = "";

        if (prestadores.length === 0) {
            prestadoresGrid.innerHTML = `
                <div class="empty-pros-msg">
                    <span>🔍</span>
                    <p>Nenhum profissional encontrado nesta categoria no momento.</p>
                </div>
            `;
            return;
        }

        prestadores.forEach(p => {
            const isOnline = p.online;
            const card = document.createElement("div");
            card.className = "pro-card";
            card.innerHTML = `
                <div class="pro-card-header">
                    <div class="pro-avatar-wrapper">
                        <img src="${p.avatar}" alt="${p.nome}" class="pro-avatar-img" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                        <span class="pro-online-badge ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online agora' : 'Offline'}"></span>
                    </div>

                    <div class="pro-main-info">
                        <div class="pro-name-row">
                            <strong>${p.apelido || p.nome}</strong>
                            ${p.verificado ? '<span class="verified-pill" title="Profissional Verificado HelpGo">🛡️ Verificado</span>' : ''}
                        </div>
                        <span class="pro-specialty">${p.especialidade}</span>

                        <div class="pro-rating-row">
                            <span class="stars-gold">${gerarEstrelasHtml(p.nota)}</span>
                            <strong class="rating-num">${p.nota.toFixed(1)}</strong>
                            <small class="rating-count">(${p.totalAvaliacoes} avaliações)</small>
                        </div>
                    </div>
                </div>

                <div class="pro-card-meta">
                    <div class="pro-meta-tag">
                        <span>📍</span> ${p.distancia}
                    </div>
                    <div class="pro-meta-tag">
                        <span>⚡</span> ${p.tempoResposta}
                    </div>
                    <div class="pro-meta-tag">
                        <span>💼</span> ${p.servicosConcluidos} serviços
                    </div>
                    <div class="pro-meta-tag highlight">
                        <span>💰</span> ${p.precoMedio}
                    </div>
                </div>

                <p class="pro-short-bio">${p.bio ? p.bio.substring(0, 95) + '...' : ''}</p>

                <div class="pro-card-actions">
                    <button class="btn-pro-profile" data-id="${p.id}">
                        ⭐ Ver Perfil e Notas
                    </button>
                    <button class="btn-pro-hire" data-id="${p.id}" data-category="${p.categoria}">
                        ⚡ Solicitar
                    </button>
                </div>
            `;

            prestadoresGrid.appendChild(card);
        });

        // Eventos nos botões dos cards
        prestadoresGrid.querySelectorAll(".btn-pro-profile").forEach(btn => {
            btn.addEventListener("click", () => {
                abrirPerfilPrestador(btn.dataset.id);
            });
        });

        prestadoresGrid.querySelectorAll(".btn-pro-hire").forEach(btn => {
            btn.addEventListener("click", () => {
                const cat = btn.dataset.category;
                const p = HelpGoStore.obterPrestadorPorId(btn.dataset.id);
                if (serviceSelect && cat) {
                    serviceSelect.value = cat;
                }
                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                mostrarToast("Profissional selecionado!", `Preencha os dados da sua solicitação para ${p ? p.apelido : 'o profissional'}.`, "⚡");
            });
        });
    }

    // Filtros de Categoria
    if (prestadoresFilter) {
        const filterBtns = prestadoresFilter.querySelectorAll(".pill-btn");
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                renderizarPrestadores(btn.dataset.category);
            });
        });
    }

    function gerarEstrelasHtml(nota) {
        const arredondada = Math.round(nota);
        let estrelas = "";
        for (let i = 1; i <= 5; i++) {
            estrelas += i <= arredondada ? "★" : "☆";
        }
        return estrelas;
    }

    /* =======================================================
       6. MODAL DE PERFIL COMPLETO DO PRESTADOR
    ======================================================= */
    function abrirPerfilPrestador(prestadorId) {
        const p = HelpGoStore.obterPrestadorPorId(prestadorId);
        if (!p) return;

        selectedProfilePro = p;

        const headerEl = document.getElementById("profileModalHeader");
        const bioEl = document.getElementById("profileModalBio");
        const badgesEl = document.getElementById("profileModalBadges");
        const overviewEl = document.getElementById("profileRatingsOverview");
        const reviewsEl = document.getElementById("profileReviewsList");

        if (headerEl) {
            headerEl.innerHTML = `
                <div class="pro-modal-avatar-box">
                    <img src="${p.avatar}" alt="${p.nome}" class="pro-modal-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                    <span class="pro-modal-status ${p.online ? 'online' : 'offline'}">${p.online ? '🟢 Online Agora' : '⚪ Indisponível'}</span>
                </div>
                <div class="pro-modal-title-box">
                    <div class="pro-modal-name-row">
                        <h3>${p.nome}</h3>
                        ${p.verificado ? '<span class="verified-pill">🛡️ Verificado HelpGo</span>' : ''}
                    </div>
                    <span class="pro-modal-category">${p.especialidade}</span>
                    <div class="pro-modal-stars-row">
                        <span class="stars-gold">${gerarEstrelasHtml(p.nota)}</span>
                        <strong>${p.nota.toFixed(1)}</strong>
                        <span>(${p.totalAvaliacoes} avaliações reais de clientes)</span>
                    </div>
                    <div class="pro-modal-quick-stats">
                        <span>📍 ${p.distancia} de você</span>
                        <span>⏱ Resposta em ${p.tempoResposta}</span>
                        <span>✅ ${p.servicosConcluidos} serviços concluídos</span>
                    </div>
                </div>
            `;
        }

        if (bioEl) bioEl.textContent = p.bio || "Profissional especializado pronto para atender suas necessidades.";

        if (badgesEl && p.tags) {
            badgesEl.innerHTML = p.tags.map(t => `<span class="pro-tag-badge">✓ ${t}</span>`).join("");
        }

        if (overviewEl) {
            overviewEl.innerHTML = `
                <div class="score-card-big">
                    <span class="big-number">${p.nota.toFixed(1)}</span>
                    <div class="stars-gold">${gerarEstrelasHtml(p.nota)}</div>
                    <small>Média com base em ${p.totalAvaliacoes} clientes</small>
                </div>

                <div class="score-bars">
                    <div class="score-bar-row">
                        <span>5 estrelas</span>
                        <div class="bar-track"><div class="bar-fill" style="width: 88%"></div></div>
                        <span>88%</span>
                    </div>
                    <div class="score-bar-row">
                        <span>4 estrelas</span>
                        <div class="bar-track"><div class="bar-fill" style="width: 10%"></div></div>
                        <span>10%</span>
                    </div>
                    <div class="score-bar-row">
                        <span>3 estrelas</span>
                        <div class="bar-track"><div class="bar-fill" style="width: 2%"></div></div>
                        <span>2%</span>
                    </div>
                </div>
            `;
        }

        if (reviewsEl) {
            if (!p.avaliacoes || p.avaliacoes.length === 0) {
                reviewsEl.innerHTML = `<p class="no-reviews">Este profissional ainda não recebeu avaliações escritas.</p>`;
            } else {
                reviewsEl.innerHTML = p.avaliacoes.map(rev => `
                    <div class="review-item-card">
                        <div class="review-item-header">
                            <div>
                                <strong>👤 ${rev.cliente}</strong>
                                <span class="review-date">${rev.data}</span>
                            </div>
                            <div class="stars-gold">
                                ${gerarEstrelasHtml(rev.nota)} <strong>${rev.nota.toFixed(1)}</strong>
                            </div>
                        </div>
                        ${rev.tag ? `<span class="review-tag-pill">✨ ${rev.tag}</span>` : ''}
                        <p class="review-comment-text">"${rev.comentario}"</p>
                    </div>
                `).join("");
            }
        }

        if (modalPerfil) modalPerfil.classList.add("show");
    }

    function fecharPerfilPrestador() {
        if (modalPerfil) modalPerfil.classList.remove("show");
    }

    if (closeModalPerfil) closeModalPerfil.addEventListener("click", fecharPerfilPrestador);
    if (btnClosePro) btnClosePro.addEventListener("click", fecharPerfilPrestador);
    if (modalPerfil) {
        modalPerfil.addEventListener("click", (e) => {
            if (e.target === modalPerfil) fecharPerfilPrestador();
        });
    }

    if (btnHirePro) {
        btnHirePro.addEventListener("click", () => {
            fecharPerfilPrestador();
            if (selectedProfilePro && serviceSelect) {
                serviceSelect.value = selectedProfilePro.categoria;
                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                mostrarToast("Profissional selecionado!", `Solicitando serviço para ${selectedProfilePro.apelido}. Preencha os detalhes e confirme.`, "⚡");
            }
        });
    }

    /* =======================================================
       7. SUBMISSÃO DO FORMULÁRIO & MODAL DE BUSCA/CONFIRMAÇÃO
    ======================================================= */
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            if (!serviceSelect.value) {
                alert("Selecione o tipo de serviço que precisa.");
                serviceSelect.focus();
                return;
            }

            if (!descriptionInput.value.trim()) {
                alert("Descreva o que você precisa.");
                descriptionInput.focus();
                return;
            }

            const cleanCep = cepInput.value.replace(/\D/g, "");
            if (cleanCep.length !== 8) {
                alert("Informe um CEP válido com 8 dígitos.");
                cepInput.focus();
                return;
            }

            // Preparar dados temporários
            const servText = serviceSelect.options[serviceSelect.selectedIndex].text;
            const endText = addressText.textContent.includes("Informe seu CEP")
                ? "Endereço via CEP " + cepInput.value
                : addressText.textContent;

            tempOrderData = {
                clienteNome: loggedUser.nome || "Cliente HelpGo",
                clienteEmail: loggedUser.email || "cliente@helpgo.com",
                servico: servText,
                servicoKey: serviceSelect.value,
                descricao: descriptionInput.value.trim(),
                cep: cepInput.value,
                endereco: endText,
                urgencia: urgencySelect.value,
                orcamento: budgetSelect.value,
                data: dateInput.value || "O quanto antes"
            };

            // Abrir Modal com Radar e Prestadores Correspondentes
            abrirModalBusca(tempOrderData);
        });
    }

    function abrirModalBusca(dados) {
        if (!modalBusca) return;

        const matchingPros = HelpGoStore.obterPrestadoresPorCategoria(dados.servicoKey);
        const titleEl = document.getElementById("modalSearchTitle");
        const subTitleEl = document.getElementById("modalSearchSubtitle");

        if (titleEl) titleEl.textContent = `Profissionais disponíveis para ${dados.servico}`;
        if (subTitleEl) subTitleEl.textContent = `Encontramos ${matchingPros.length || 3} profissionais qualificados com avaliação média de 4.9 prontos para atender seu chamado.`;

        if (matchingProsContainer) {
            matchingProsContainer.innerHTML = matchingPros.slice(0, 2).map(p => `
                <div class="matching-pro-item">
                    <img src="${p.avatar}" alt="${p.nome}" class="matching-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                    <div class="matching-info">
                        <strong>${p.nome}</strong>
                        <div class="matching-stars">
                            <span class="stars-gold">${gerarEstrelasHtml(p.nota)}</span>
                            <strong>${p.nota.toFixed(1)}</strong> • <span>${p.distancia}</span>
                        </div>
                        <small>🟢 Online agora e pronto para receber</small>
                    </div>
                </div>
            `).join("");
        }

        modalBusca.classList.add("show");
    }

    function fecharModalBusca() {
        if (modalBusca) modalBusca.classList.remove("show");
    }

    if (closeModalBusca) closeModalBusca.addEventListener("click", fecharModalBusca);
    if (btnCancelOrder) btnCancelOrder.addEventListener("click", fecharModalBusca);
    if (modalBusca) {
        modalBusca.addEventListener("click", (e) => {
            if (e.target === modalBusca) fecharModalBusca();
        });
    }

    // CONFIRMAR PEDIDO E DISPARAR PARA O PRESTADOR
    if (btnConfirmOrder) {
        btnConfirmOrder.addEventListener("click", () => {
            if (!tempOrderData) return;

            btnConfirmOrder.disabled = true;
            btnConfirmOrder.innerHTML = `⏳ Enviando aos prestadores...`;

            setTimeout(() => {
                const novoPedido = HelpGoStore.criarPedido(tempOrderData);

                btnConfirmOrder.disabled = false;
                btnConfirmOrder.innerHTML = `🚀 Confirmar e Enviar Pedido para Prestadores`;
                fecharModalBusca();

                // Limpar formulário
                form.reset();
                if (counter) counter.textContent = "0";
                addressText.textContent = "Informe seu CEP para localizar o endereço.";

                // Atualizar lista de solicitações
                renderizarMinhasSolicitacoes();

                // Scroll para as solicitações
                const secSol = document.getElementById("solicitacoes");
                if (secSol) secSol.scrollIntoView({ behavior: "smooth" });

                mostrarToast("Pedido Enviado com Sucesso! 🚀", "Os prestadores da sua região foram notificados e responderão em instantes.", "🎉");
            }, 800);
        });
    }

    /* =======================================================
       8. MINHAS SOLICITAÇÕES (INTERLIGADAS EM TEMPO REAL)
    ======================================================= */
    function renderizarMinhasSolicitacoes() {
        if (!clientRequestsList) return;

        const pedidos = HelpGoStore.obterPedidos();
        const total = pedidos.length;

        if (clientRequestsCount) {
            clientRequestsCount.textContent = `${total} ${total === 1 ? 'solicitação' : 'solicitações'}`;
        }

        if (pedidos.length === 0) {
            clientRequestsList.innerHTML = `
                <div class="empty-request">
                    <div>📋</div>
                    <strong>Você não possui solicitações ativas</strong>
                    <span>Quando solicitar um novo serviço, ele aparecerá aqui com o status em tempo real.</span>
                </div>
            `;
            return;
        }

        clientRequestsList.innerHTML = pedidos.map(p => {
            let statusClass = "pending";
            let statusText = "Aguardando profissional";
            let actionBtn = `<button class="details btn-view-order-details" data-id="${p.id}">Ver detalhes</button>`;

            if (p.status === "em_andamento") {
                statusClass = "in-progress";
                statusText = `🚗 ${p.prestadorNome || 'Prestador'} a caminho`;
                actionBtn = `
                    <button class="btn-chat-client" onclick="alert('Iniciando conversa no WhatsApp com o prestador ${p.prestadorNome}...')">
                        💬 WhatsApp
                    </button>
                    <button class="details btn-view-order-details" data-id="${p.id}">Detalhes</button>
                `;
            } else if (p.status === "concluido") {
                statusClass = "completed";
                statusText = "✅ Concluído";
                actionBtn = `
                    <button class="btn-rate-service" data-id="${p.id}" data-prestador-id="${p.prestadorId || 'prest-1'}" data-prestador-name="${p.prestadorNome || 'Carlos Silva'}">
                        ⭐ Avaliar Serviço
                    </button>
                `;
            } else if (p.status === "avaliado") {
                statusClass = "evaluated";
                statusText = `⭐ Avaliado (${p.avaliacao ? p.avaliacao.nota.toFixed(1) : '5.0'})`;
                actionBtn = `
                    <button class="details btn-view-order-details" data-id="${p.id}">Ver Avaliação</button>
                `;
            }

            return `
                <div class="request-item" id="client-req-${p.id}">
                    <div class="request-service-icon">
                        ${obterIconeServico(p.servicoKey || p.servico)}
                    </div>

                    <div class="request-info">
                        <strong>${p.servico}</strong>
                        <span>${p.descricao.substring(0, 65)}...</span>
                        <small>📍 ${p.endereco} • Orçamento: ${p.orcamento}</small>
                    </div>

                    <div class="status ${statusClass}">
                        ${statusText}
                    </div>

                    <div class="request-actions-col">
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join("");

        // Eventos dos botões de avaliar
        clientRequestsList.querySelectorAll(".btn-rate-service").forEach(btn => {
            btn.addEventListener("click", () => {
                abrirModalAvaliacao(btn.dataset.id, btn.dataset.prestadorId, btn.dataset.prestadorName);
            });
        });

        // Eventos dos botões de detalhes
        clientRequestsList.querySelectorAll(".btn-view-order-details").forEach(btn => {
            btn.addEventListener("click", () => {
                const pedido = pedidos.find(item => item.id === btn.dataset.id);
                if (pedido) {
                    let msg = `📋 Detalhes do Pedido:\n\nServiço: ${pedido.servico}\nDescrição: ${pedido.descricao}\nLocal: ${pedido.endereco}\nOrçamento: ${pedido.orcamento}\nStatus: ${pedido.status.toUpperCase()}`;
                    if (pedido.avaliacao) {
                        msg += `\n\n⭐ Sua Avaliação: Nota ${pedido.avaliacao.nota}/5.0\n"${pedido.avaliacao.comentario}"`;
                    }
                    alert(msg);
                }
            });
        });
    }

    function obterIconeServico(key) {
        if (!key) return "⚡";
        const k = key.toLowerCase();
        if (k.includes("eletric")) return "⚡";
        if (k.includes("encan")) return "🔧";
        if (k.includes("pint")) return "🎨";
        if (k.includes("ar") || k.includes("clima")) return "❄️";
        if (k.includes("chave")) return "🔑";
        if (k.includes("limp")) return "🧹";
        if (k.includes("marcen")) return "🪚";
        if (k.includes("pedreir")) return "🧱";
        return "🛠️";
    }

    /* =======================================================
       9. SISTEMA DE AVALIAÇÃO COM ESTRELAS INTERATIVAS
    ======================================================= */
    function abrirModalAvaliacao(pedidoId, prestadorId, prestadorNome) {
        pendingOrderToEvaluate = { pedidoId, prestadorId, prestadorNome };

        if (reviewPrestadorName) {
            reviewPrestadorName.textContent = `Como foi o serviço realizado por ${prestadorNome || 'seu profissional'}?`;
        }

        // Resetar para 5 estrelas
        setStarRating(5);
        if (reviewComment) reviewComment.value = "";

        if (modalAvaliacao) modalAvaliacao.classList.add("show");
    }

    function fecharModalAvaliacao() {
        if (modalAvaliacao) modalAvaliacao.classList.remove("show");
        pendingOrderToEvaluate = null;
    }

    if (closeModalAvaliacao) closeModalAvaliacao.addEventListener("click", fecharModalAvaliacao);
    if (modalAvaliacao) {
        modalAvaliacao.addEventListener("click", (e) => {
            if (e.target === modalAvaliacao) fecharModalAvaliacao();
        });
    }

    // Controle interativo das estrelas
    if (starRatingInteractive) {
        const stars = starRatingInteractive.querySelectorAll(".star");

        stars.forEach(star => {
            star.addEventListener("click", () => {
                const val = parseInt(star.dataset.val, 10);
                setStarRating(val);
            });

            star.addEventListener("mouseenter", () => {
                const val = parseInt(star.dataset.val, 10);
                highlightStars(val);
            });
        });

        starRatingInteractive.addEventListener("mouseleave", () => {
            highlightStars(selectedRatingVal);
        });
    }

    function highlightStars(val) {
        if (!starRatingInteractive) return;
        const stars = starRatingInteractive.querySelectorAll(".star");
        stars.forEach(s => {
            const starVal = parseInt(s.dataset.val, 10);
            if (starVal <= val) {
                s.classList.add("active");
            } else {
                s.classList.remove("active");
            }
        });
    }

    function setStarRating(val) {
        selectedRatingVal = val;
        highlightStars(val);

        const feedbackMap = {
            1: "1.0 - Precisa melhorar muito 😞",
            2: "2.0 - Regular / Abaixo do esperado 😐",
            3: "3.0 - Bom atendimento 👍",
            4: "4.0 - Muito bom, recomendo! ⭐⭐⭐⭐",
            5: "5.0 - Excelente trabalho! Perfeito ⭐⭐⭐⭐⭐"
        };

        if (ratingTextFeedback) {
            ratingTextFeedback.textContent = feedbackMap[val] || `${val}.0`;
        }
    }

    // Tags de elogio rápido
    if (tagsOptions) {
        tagsOptions.querySelectorAll(".tag-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                btn.classList.toggle("active");
                selectedTagVal = btn.dataset.tag;
            });
        });
    }

    // Submissão da Avaliação
    if (formAvaliacao) {
        formAvaliacao.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!pendingOrderToEvaluate) return;

            const activeTags = [];
            if (tagsOptions) {
                tagsOptions.querySelectorAll(".tag-opt.active").forEach(b => activeTags.push(b.dataset.tag));
            }

            const payload = {
                nota: selectedRatingVal,
                comentario: reviewComment ? reviewComment.value.trim() : "Excelente serviço!",
                tag: activeTags.join(" • ") || "Super Recomendado",
                clienteNome: loggedUser.nome || "Cliente HelpGo"
            };

            HelpGoStore.avaliarPrestador(
                pendingOrderToEvaluate.pedidoId,
                pendingOrderToEvaluate.prestadorId,
                payload
            );

            fecharModalAvaliacao();
            renderizarMinhasSolicitacoes();
            renderizarPrestadores();

            mostrarToast("Avaliação Registrada! ⭐", "Obrigado pelo seu feedback! Sua nota ajuda toda a comunidade HelpGo.", "🎉");
        });
    }

    /* =======================================================
       10. SISTEMA DE NOTIFICAÇÕES (DROPDOWN & TOASTS)
    ======================================================= */
    function atualizarNotificacoesCliente() {
        const notifs = HelpGoStore.obterNotificacoesCliente();
        const naoLidas = notifs.filter(n => !n.lida).length;

        if (notifBadgeClient) {
            notifBadgeClient.textContent = naoLidas;
            notifBadgeClient.style.display = naoLidas > 0 ? "flex" : "none";
        }

        if (notifListClient) {
            if (notifs.length === 0) {
                notifListClient.innerHTML = `<div class="notif-empty">Nenhuma notificação no momento.</div>`;
            } else {
                notifListClient.innerHTML = notifs.map(n => `
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

    if (notifBtnClient && notifDropdownClient) {
        notifBtnClient.addEventListener("click", (e) => {
            e.stopPropagation();
            notifDropdownClient.classList.toggle("show");
        });

        document.addEventListener("click", (e) => {
            if (!notifDropdownClient.contains(e.target) && e.target !== notifBtnClient) {
                notifDropdownClient.classList.remove("show");
            }
        });
    }

    if (btnMarcarLidasClient) {
        btnMarcarLidasClient.addEventListener("click", () => {
            HelpGoStore.marcarTodasLidasCliente();
            atualizarNotificacoesCliente();
        });
    }

    function mostrarToast(titulo, texto, icone = "🔔") {
        if (!toastClient) return;

        if (toastTitleClient) toastTitleClient.textContent = titulo;
        if (toastTextClient) toastTextClient.textContent = texto;
        if (toastIconClient) toastIconClient.textContent = icone;

        toastClient.classList.add("show");
        HelpGoStore.tocarSomNotificacao();

        setTimeout(() => {
            toastClient.classList.remove("show");
        }, 4500);
    }

    /* =======================================================
       11. ATUALIZAR STATUS DE PESSOAS ONLINE
    ======================================================= */
    function atualizarOnlineStatus() {
        const stats = HelpGoStore.getContagemOnline();
        if (liveOnlineCount) {
            liveOnlineCount.textContent = `${stats.prestadoresOnline} Profissionais Online Agora na Sua Região`;
        }
    }

    /* =======================================================
       12. LISTENERS EM TEMPO REAL & EVENTOS CROSS-TAB
    ======================================================= */
    window.addEventListener("pedidos_atualizados", () => {
        renderizarMinhasSolicitacoes();
    });

    window.addEventListener("notificacoes_cliente_atualizadas", () => {
        atualizarNotificacoesCliente();
    });

    window.addEventListener("prestadores_atualizados", () => {
        renderizarPrestadores();
    });

    window.addEventListener("status_prestador_alterado", (e) => {
        renderizarPrestadores();
        atualizarOnlineStatus();
    });

    /* =======================================================
       13. MENU E LOGOUT
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

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm("Deseja realmente sair?")) {
                if (typeof supabaseClient !== "undefined" && supabaseClient) {
                    try { await supabaseClient.auth.signOut(); } catch (err) {}
                }
                localStorage.removeItem("helpgo_user");
                window.location.href = "./login.html";
            }
        });
    }

    /* =======================================================
       14. INICIALIZAÇÃO GERAL
    ======================================================= */
    renderizarPrestadores();
    renderizarMinhasSolicitacoes();
    atualizarNotificacoesCliente();
    atualizarOnlineStatus();

});