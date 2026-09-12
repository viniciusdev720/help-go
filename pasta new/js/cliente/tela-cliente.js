// =======================================================
// HELPGO - TELA DO CLIENTE (100% DINÂMICA)
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // 0. VALIDAÇÃO DE AUTENTICAÇÃO E PERMISSÃO DE CLIENTE VIA GUARD
    if (typeof Guard !== "undefined") {
        const usuarioAutenticado = await Guard.requireAuth("cliente");
        if (!usuarioAutenticado) return;
    }

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

    // Seção de Serviços Populares
    const servicesGrid = document.querySelector(".services-grid");

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
    let loggedUser = { nome: "Cliente", email: "" };
    let servicosCarregados = [];
    let prestadoresCarregados = [];
    let filtroAtual = "todos";
    let pedidosCliente = [];
    let canalPrestadores = null;

    /* =======================================================
       2. CARREGAR DADOS DO USUÁRIO
    ======================================================= */
    async function carregarUsuario() {
        const local = AuthService.getUsuarioLocal();
        if (local?.nome) {
            atualizarVisualUsuario(local.nome);
            loggedUser = local;
        }

        try {
            const atual = await AuthService.obterUsuarioAtual();
            if (atual?.nome) {
                atualizarVisualUsuario(atual.nome);
                loggedUser = atual;
            }
        } catch (e) {
            console.warn("[TelaCliente] Aviso ao carregar usuário:", e);
        }
    }

    function atualizarVisualUsuario(nomeCompleto) {
        const primeiroNome = nomeCompleto.split(" ")[0];
        if (userName) userName.textContent = primeiroNome;
        if (userAvatar) userAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
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

            const formatted = `${data.logradouro || ''}, ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''}`;
            addressText.textContent = formatted.trim().replace(/^,\s*/, '');
        } catch (err) {
            addressText.textContent = "Não foi possível consultar o CEP automaticamente.";
            console.error("[TelaCliente] Erro CEP:", err);
        }
    }

    /* =======================================================
       4. CARREGAMENTO DINÂMICO DE SERVIÇOS DO BANCO
    ======================================================= */
    async function carregarServicosDoBanco() {
        try {
            servicosCarregados = await ServicosService.buscarServicos();

            // 1. Preencher Select do Formulário
            if (serviceSelect) {
                serviceSelect.innerHTML = `<option value="">Selecione um serviço</option>`;
                servicosCarregados.forEach(s => {
                    const icone = ServicosService.obterIcone(s.nome);
                    const opt = document.createElement("option");
                    opt.value = s.nome.toLowerCase();
                    opt.dataset.id = s.id;
                    opt.textContent = `${icone} ${s.nome}`;
                    serviceSelect.appendChild(opt);
                });
            }

            // 2. Preencher Grid de Serviços Populares
            if (servicesGrid) {
                if (servicosCarregados.length === 0) {
                    servicesGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #6b7280;">
                            Nenhum serviço cadastrado no momento.
                        </div>
                    `;
                } else {
                    servicesGrid.innerHTML = servicosCarregados.slice(0, 6).map(s => {
                        const icone = ServicosService.obterIcone(s.nome);
                        const cor = ServicosService.obterCor(s.nome);
                        return `
                            <button class="service-card" data-service="${s.nome.toLowerCase()}">
                                <div class="service-icon ${cor}">${icone}</div>
                                <strong>${s.nome}</strong>
                                ${s.descricao ? `<span>${s.descricao.substring(0, 32)}${s.descricao.length > 32 ? '...' : ''}</span>` : ''}
                            </button>
                        `;
                    }).join("");

                    // Eventos de clique nos cards de serviços
                    servicesGrid.querySelectorAll(".service-card").forEach(card => {
                        card.addEventListener("click", () => {
                            const serv = card.dataset.service;
                            if (serviceSelect && serv) {
                                serviceSelect.value = serv;
                                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                                serviceSelect.focus();
                            }
                        });
                    });
                }
            }

            // 3. Preencher Filtros por Categoria Dinamicamente
            if (prestadoresFilter) {
                prestadoresFilter.innerHTML = `<button class="pill-btn active" data-category="todos">Todos</button>`;
                servicosCarregados.forEach(s => {
                    const btn = document.createElement("button");
                    btn.className = "pill-btn";
                    btn.dataset.category = s.nome.toLowerCase();
                    btn.dataset.id = s.id;
                    btn.textContent = s.nome;
                    prestadoresFilter.appendChild(btn);
                });

                // Ativar listeners dos filtros
                prestadoresFilter.querySelectorAll(".pill-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        prestadoresFilter.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                        filtroAtual = btn.dataset.category;
                        renderizarPrestadores(filtroAtual);
                    });
                });
            }

        } catch (err) {
            console.error("[TelaCliente] Erro ao carregar serviços:", err);
        }
    }

    /* =======================================================
       5. RENDERIZAÇÃO DINÂMICA DE PRESTADORES DO BANCO
    ======================================================= */
    async function carregarPrestadoresDoBanco() {
        if (!prestadoresGrid) return;

        // Estado de carregamento
        prestadoresGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 28px; margin-bottom: 8px;">⏳</div>
                <strong>Carregando profissionais do banco de dados...</strong>
            </div>
        `;

        try {
            prestadoresCarregados = await PrestadoresService.buscarPrestadores();
            renderizarPrestadores(filtroAtual);
            atualizarOnlineStatus();
            assinarAtualizacoesPrestadores();
        } catch (err) {
            console.error("[TelaCliente] Erro ao buscar prestadores:", err);
            prestadoresGrid.innerHTML = `
                <div class="empty-pros-msg" style="grid-column: 1 / -1;">
                    <span>⚠️</span>
                    <p>Não foi possível carregar os profissionais no momento.</p>
                </div>
            `;
        }
    }

    function assinarAtualizacoesPrestadores() {
        if (!supabaseClient || canalPrestadores || typeof supabaseClient.channel !== "function") return;
        canalPrestadores = supabaseClient
            .channel("prestadores-disponiveis-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "prestadores" }, async () => {
                console.log("[TelaCliente] Atualização de prestadores detectada no banco. Sincronizando...");
                await carregarPrestadoresDoBanco();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, async () => {
                await carregarPrestadoresDoBanco();
            })
            .subscribe();
    }

    function renderizarPrestadores(categoria = "todos") {
        if (!prestadoresGrid) return;

        let prestadores = prestadoresCarregados || [];
        if (categoria && categoria !== "todos") {
            prestadores = prestadores.filter(p => {
                const catLower = categoria.toLowerCase();
                const espLower = (p.especialidade || "").toLowerCase();
                const hasServ = (p.servicos || []).some(s => (s.nome || "").toLowerCase().includes(catLower));
                return espLower.includes(catLower) || hasServ;
            });
        }

        prestadoresGrid.innerHTML = "";

        // Regra da tarefa.md: Se existirem 0 prestadores disponíveis -> "Nenhum profissional disponível no momento."
        // Nunca criar profissionais fictícios para preencher espaço na tela.
        if (prestadores.length === 0) {
            prestadoresGrid.innerHTML = `
                <div class="empty-pros-msg" style="grid-column: 1 / -1;">
                    <span style="font-size: 34px; display: block; margin-bottom: 8px;">👷</span>
                    <p style="font-size: 15px; font-weight: 700; color: #374151; margin: 0 0 4px 0;">Nenhum profissional disponível no momento.</p>
                    <small style="color: #6b7280;">${categoria !== 'todos' ? 'Nenhum profissional disponível nesta categoria.' : 'Assim que novos prestadores forem cadastrados ou ficarem disponíveis, eles aparecerão automaticamente.'}</small>
                </div>
            `;
            return;
        }

        prestadores.forEach(p => {
            const isOnline = p.online === true || p.ativo === true;
            const notaFormatada = p.avaliacao == null ? null : p.avaliacao.toFixed(1).replace(".", ",");
            const totalAval = p.totalAvaliacoes == null ? 0 : p.totalAvaliacoes;
            const inicial = (p.nome || "P").charAt(0).toUpperCase();

            // Foto de perfil com fallback limpo
            const avatarHtml = p.fotoUrl
                ? `<img src="${p.fotoUrl}" alt="${p.nome}" class="pro-avatar-img" onerror="this.outerHTML='<div class=\\'avatar-fallback\\' style=\\'width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;\\'>${inicial}</div>'">`
                : `<div class="avatar-fallback" style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">${inicial}</div>`;

            // Meta tags (Serviços realizados e Localização)
            const metaTags = [];
            if (p.servicosRealizados && p.servicosRealizados > 0) {
                metaTags.push(`<span class="pro-meta-tag">🛠️ ${p.servicosRealizados} serviços</span>`);
            }
            if (p.localizacao) {
                metaTags.push(`<span class="pro-meta-tag">📍 ${p.localizacao}</span>`);
            }

            const card = document.createElement("div");
            card.className = "pro-card";
            card.innerHTML = `
                <div class="pro-card-header">
                    <div class="pro-avatar-wrapper">
                        ${avatarHtml}
                        <span class="pro-online-badge ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Disponível' : 'Indisponível'}"></span>
                    </div>

                    <div class="pro-main-info">
                        <div class="pro-name-row">
                            <strong>${p.nome}</strong>
                            ${p.verificado ? '<span class="verified-pill" title="Profissional Verificado">✓ Verificado</span>' : ''}
                        </div>
                        ${p.especialidade ? `<span class="pro-specialty">${p.especialidade}</span>` : ''}

                        <div class="pro-rating-row">
                            ${notaFormatada === null
                                ? '<small class="rating-count">Sem avaliações</small>'
                                : `<span class="stars-gold">${gerarEstrelasHtml(p.avaliacao)}</span><strong class="rating-num">${notaFormatada}</strong>`}
                            <small class="rating-count">(${totalAval} avaliações)</small>
                        </div>
                    </div>
                </div>

                ${p.descricao ? `<p class="pro-short-bio">${p.descricao.substring(0, 110)}${p.descricao.length > 110 ? '...' : ''}</p>` : ''}

                ${metaTags.length > 0 ? `<div class="pro-card-meta">${metaTags.join("")}</div>` : ''}

                ${p.valor != null ? `
                    <div class="pro-price-tag">
                        <span>A partir de</span>
                        <strong>R$ ${Number(p.valor).toFixed(0)}</strong>
                    </div>
                ` : ''}

                <div class="pro-card-actions">
                    <button class="btn-pro-profile" data-id="${p.id}">
                        Ver Perfil
                    </button>
                    <button class="btn-pro-hire" data-id="${p.id}" data-category="${(p.especialidade || '').toLowerCase()}">
                        Solicitar
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
                const p = prestadoresCarregados.find(item => item.id === btn.dataset.id);
                if (serviceSelect && cat) {
                    for (let i = 0; i < serviceSelect.options.length; i++) {
                        if (serviceSelect.options[i].text.toLowerCase().includes(cat) || cat.includes(serviceSelect.options[i].value)) {
                            serviceSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                mostrarToast("Profissional Selecionado!", `Preencha os detalhes para solicitar um atendimento com ${p ? p.nome : 'o profissional'}.`, "⚡");
            });
        });
    }

    function gerarEstrelasHtml(nota) {
        const arredondada = Math.round(Number(nota) || 0);
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
        const p = prestadoresCarregados.find(item => item.id === prestadorId);
        if (!p) return;

        selectedProfilePro = p;

        const headerEl = document.getElementById("profileModalHeader");
        const bioEl = document.getElementById("profileModalBio");
        const badgesEl = document.getElementById("profileModalBadges");
        const overviewEl = document.getElementById("profileRatingsOverview");
        const reviewsEl = document.getElementById("profileReviewsList");
        const inicial = (p.nome || "P").charAt(0).toUpperCase();
        const notaFormatada = p.avaliacao == null ? null : p.avaliacao.toFixed(1).replace(".", ",");

        if (headerEl) {
            const avatarModalHtml = p.fotoUrl
                ? `<img src="${p.fotoUrl}" alt="${p.nome}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">`
                : `<div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${inicial}</div>`;

            headerEl.innerHTML = `
                <div class="pro-modal-avatar-box">
                    ${avatarModalHtml}
                    <span class="pro-modal-status ${p.ativo === true ? 'online' : 'offline'}">${p.ativo === true ? '🟢 Disponível' : '⚪ Indisponível'}</span>
                </div>
                <div class="pro-modal-title-box">
                    <div class="pro-modal-name-row" style="display: flex; align-items: center; gap: 8px;">
                        <h3 style="margin: 0;">${p.nome}</h3>
                        ${p.verificado ? '<span class="verified-pill">✓ Verificado</span>' : ''}
                    </div>
                    ${p.especialidade ? `<span class="pro-modal-category">${p.especialidade}</span>` : ''}
                    <div class="pro-modal-stars-row">
                        ${notaFormatada === null ? '<span>Sem avaliações</span>' : `<span class="stars-gold">${gerarEstrelasHtml(p.avaliacao)}</span><strong>${notaFormatada}</strong><span>(${p.totalAvaliacoes || 0} avaliações)</span>`}
                    </div>
                    ${p.valor != null ? `<div style="margin-top: 6px; font-size: 13px; color: #10b981; font-weight: 700;">A partir de R$ ${Number(p.valor).toFixed(0)}</div>` : ''}
                </div>
            `;
        }

        if (bioEl) bioEl.textContent = p.descricao || "Descrição não informada pelo profissional.";

        if (badgesEl) {
            const badges = [];
            if (p.verificado) badges.push('<span class="pro-badge green">✓ Identidade Verificada</span>');
            if (p.servicosRealizados > 0) badges.push(`<span class="pro-badge blue">🛠️ ${p.servicosRealizados} serviços realizados</span>`);
            if (p.localizacao) badges.push(`<span class="pro-badge gray">📍 Atende em ${p.localizacao}</span>`);
            badgesEl.innerHTML = badges.join("");
        }

        if (overviewEl) {
            overviewEl.innerHTML = notaFormatada === null
                ? '<p>Este profissional ainda não possui avaliações.</p>'
                : `<div class="score-card-big"><span class="big-number">${notaFormatada}</span><div class="stars-gold">${gerarEstrelasHtml(p.avaliacao)}</div><small>${p.totalAvaliacoes || 0} avaliações registradas</small></div>`;
        }

        if (reviewsEl) reviewsEl.innerHTML = '<p>Nenhum comentário de avaliação disponível.</p>';

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
                const spec = selectedProfilePro.especialidade.toLowerCase();
                for (let i = 0; i < serviceSelect.options.length; i++) {
                    if (serviceSelect.options[i].text.toLowerCase().includes(spec) || spec.includes(serviceSelect.options[i].value)) {
                        serviceSelect.selectedIndex = i;
                        break;
                    }
                }
                document.getElementById("solicitar").scrollIntoView({ behavior: "smooth" });
                mostrarToast("Profissional selecionado!", `Solicitando serviço para ${selectedProfilePro.nome}. Preencha os detalhes e confirme.`, "⚡");
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

            const servText = serviceSelect.options[serviceSelect.selectedIndex].text;
            const endText = addressText.textContent.includes("Informe seu CEP")
                ? "Endereço via CEP " + cepInput.value
                : addressText.textContent;

            tempOrderData = {
                clienteId: loggedUser.id || null,
                clienteEmail: loggedUser.email || "",
                servico: servText,
                servicoKey: serviceSelect.value,
                descricao: descriptionInput.value.trim(),
                cep: cepInput.value,
                endereco: endText,
                urgencia: urgencySelect ? urgencySelect.value : "normal",
                orcamento: budgetSelect ? budgetSelect.value : "A combinar",
                data: (dateInput && dateInput.value) ? dateInput.value : "O quanto antes"
            };

            abrirModalBusca(tempOrderData);
        });
    }

    function abrirModalBusca(dados) {
        if (!modalBusca) return;

        const matchingPros = prestadoresCarregados.filter(p => {
            const espLower = (p.especialidade || "").toLowerCase();
            const skLower = (dados.servicoKey || "").toLowerCase();
            return espLower.includes(skLower) || skLower.includes(espLower);
        });

        const titleEl = document.getElementById("modalSearchTitle");
        const subTitleEl = document.getElementById("modalSearchSubtitle");

        if (titleEl) titleEl.textContent = `Profissionais disponíveis para ${dados.servico}`;
        if (subTitleEl) {
            subTitleEl.textContent = matchingPros.length > 0
                ? `Encontramos ${matchingPros.length} profissional(is) qualificado(s) prontos para atender seu chamado.`
                : `Seu chamado será enviado aos prestadores cadastrados na sua região.`;
        }

        if (matchingProsContainer) {
            if (matchingPros.length > 0) {
                matchingProsContainer.innerHTML = matchingPros.slice(0, 3).map(p => {
                    const inicial = p.nome.charAt(0).toUpperCase();
                    return `
                        <div class="matching-pro-item">
                            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;">
                                ${inicial}
                            </div>
                            <div class="matching-info">
                                <strong>${p.nome}</strong>
                                <div class="matching-stars">
                                    ${p.avaliacao == null ? '<span>Sem avaliações</span>' : `<span class="stars-gold">${gerarEstrelasHtml(p.avaliacao)}</span><strong>${p.avaliacao.toFixed(1)}</strong>`}
                                </div>
                                <small>🟢 Disponível para receber</small>
                            </div>
                        </div>
                    `;
                }).join("");
            } else {
                matchingProsContainer.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: #4b5563;">
                        Seu pedido será registrado e exibido imediatamente para os profissionais disponíveis.
                    </div>
                `;
            }
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

    if (btnConfirmOrder) {
        btnConfirmOrder.addEventListener("click", async () => {
            if (!tempOrderData) return;

            btnConfirmOrder.disabled = true;
            btnConfirmOrder.innerHTML = `⏳ Enviando pedido...`;

            try {
                await PedidosService.criarPedido(tempOrderData);

                btnConfirmOrder.disabled = false;
                btnConfirmOrder.innerHTML = `🚀 Confirmar e Enviar Pedido para Prestadores`;
                fecharModalBusca();

                form.reset();
                if (counter) counter.textContent = "0";
                addressText.textContent = "Informe seu CEP para localizar o endereço.";

                await renderizarMinhasSolicitacoes();

                const secSol = document.getElementById("solicitacoes");
                if (secSol) secSol.scrollIntoView({ behavior: "smooth" });

                mostrarToast("Pedido Enviado com Sucesso! 🚀", "Os prestadores da sua região foram notificados e responderão em instantes.", "🎉");
            } catch (erro) {
                alert(erro.message || "Não foi possível enviar sua solicitação. Tente novamente.");
            } finally {
                btnConfirmOrder.disabled = false;
                btnConfirmOrder.innerHTML = "Confirmar e Enviar Pedido para Prestadores";
            }
        });
    }

    /* =======================================================
       8. MINHAS SOLICITAÇÕES
    ======================================================= */
    async function renderizarMinhasSolicitacoes() {
        if (!clientRequestsList) return;

        clientRequestsList.innerHTML = `<div class="empty-request"><strong>Carregando solicitações...</strong></div>`;
        let pedidos;
        try {
            pedidos = await PedidosService.listarSolicitacoesCliente();
            pedidosCliente = pedidos;
        } catch (erro) {
            if (clientRequestsCount) clientRequestsCount.textContent = "0 solicitações";
            clientRequestsList.innerHTML = `<div class="empty-request"><strong>Não foi possível carregar suas solicitações.</strong><span>Tente novamente.</span></div>`;
            return;
        }
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
                    <button class="details btn-view-order-details" data-id="${p.id}">Detalhes</button>
                `;
            } else if (p.status === "concluido") {
                statusClass = "completed";
                statusText = "✅ Concluído";
                actionBtn = `
                    <button class="btn-rate-service" data-id="${p.id}" data-prestador-id="${p.prestadorId || ''}" data-prestador-name="${p.prestadorNome || 'Profissional'}">
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

            const icone = ServicosService.obterIcone(p.servicoKey || p.servico);

            return `
                <div class="request-item" id="client-req-${p.id}">
                    <div class="request-service-icon">
                        ${icone}
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
                const pedido = pedidosCliente.find(item => item.id === btn.dataset.id);
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

    /* =======================================================
       9. SISTEMA DE AVALIAÇÃO
    ======================================================= */
    function abrirModalAvaliacao(pedidoId, prestadorId, prestadorNome) {
        pendingOrderToEvaluate = { pedidoId, prestadorId, prestadorNome };

        if (reviewPrestadorName) {
            reviewPrestadorName.textContent = `Como foi o serviço realizado por ${prestadorNome || 'seu profissional'}?`;
        }

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

    if (tagsOptions) {
        tagsOptions.querySelectorAll(".tag-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                btn.classList.toggle("active");
                selectedTagVal = btn.dataset.tag;
            });
        });
    }

    if (formAvaliacao) {
        formAvaliacao.addEventListener("submit", async (e) => {
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
            };

            await PedidosService.avaliarPedido(
                pendingOrderToEvaluate.pedidoId,
                payload
            );

            fecharModalAvaliacao();
            renderizarMinhasSolicitacoes();

            mostrarToast("Avaliação Registrada! ⭐", "Obrigado pelo seu feedback! Sua nota ajuda toda a comunidade HelpGo.", "🎉");
        });
    }

    /* =======================================================
       10. SISTEMA DE NOTIFICAÇÕES (DROPDOWN & TOASTS)
    ======================================================= */
    function atualizarNotificacoesCliente() {
        const notifs = PedidosService.obterNotificacoesCliente();
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
            PedidosService.marcarTodasLidasCliente();
            atualizarNotificacoesCliente();
        });
    }

    function mostrarToast(titulo, texto, icone = "🔔") {
        if (!toastClient) return;

        if (toastTitleClient) toastTitleClient.textContent = titulo;
        if (toastTextClient) toastTextClient.textContent = texto;
        if (toastIconClient) toastIconClient.textContent = icone;

        toastClient.classList.add("show");
        PedidosService.tocarSomNotificacao();

        setTimeout(() => {
            toastClient.classList.remove("show");
        }, 4500);
    }

    /* =======================================================
       11. ATUALIZAR STATUS DE PROFISSIONAIS ONLINE
    ======================================================= */
    async function atualizarOnlineStatus() {
        const total = prestadoresCarregados.filter(p => p.ativo !== false).length;
        if (liveOnlineCount) {
            liveOnlineCount.textContent = total > 0
                ? `${total} Profissional(is) Cadastrado(s) na Sua Região`
                : `Nenhum profissional disponível no momento`;
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
                await AuthService.fazerLogout();
            }
        });
    }

    /* =======================================================
       14. INICIALIZAÇÃO GERAL
    ======================================================= */
    await carregarUsuario();
    await carregarServicosDoBanco();
    await carregarPrestadoresDoBanco();
    renderizarMinhasSolicitacoes();
    atualizarNotificacoesCliente();

});
