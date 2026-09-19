// =======================================================
// HELPGO - TELA DO CLIENTE (100% DINÂMICA)
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {
    const escaparHtml = (valor) => String(valor ?? "").replace(/[&<>'"]/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[caractere]);

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
    const timeInput = document.getElementById("time");

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

    // Resultado da busca no próprio formulário
    const resultadosBusca = document.getElementById("professionalSearchResults");
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

    // Variáveis de Estado
    let selectedRatingVal = 5;
    let selectedTagVal = "Super Pontual";
    let pendingOrderToEvaluate = null;
    let tempOrderData = null;
    let versaoBusca = 0;
    let assinaturaBusca = "";
    let envioEmAndamento = false;
    let prestadorWhatsApp = null;
    let selectedProfilePro = null;
    let loggedUser = { nome: "Cliente", email: "" };
    let servicosCarregados = [];
    let prestadoresCarregados = [];
    let filtroAtual = "todos";
    let pedidosCliente = [];
    let canalPrestadores = null;
    let canalSolicitacoes = null;

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

    function atualizarLimitesAgendamento() {
        const agora = new Date();
        const doisDigitos = valor => String(valor).padStart(2, "0");
        const hoje = `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
        if (dateInput) dateInput.min = hoje;
        if (timeInput) {
            timeInput.min = dateInput?.value === hoje
                ? `${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}` : "";
        }
    }
    atualizarLimitesAgendamento();
    dateInput?.addEventListener("change", atualizarLimitesAgendamento);
    timeInput?.addEventListener("focus", atualizarLimitesAgendamento);

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
                    const opt = document.createElement("option");
                    opt.value = s.nome.toLowerCase();
                    opt.dataset.id = s.id;
                    opt.textContent = s.nome;
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
                        return `
                            <button class="service-card" data-service="${s.nome.toLowerCase()}">
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
                    
                    <p>${escaparHtml(err.message || "Não foi possível carregar os profissionais no momento.")}</p>
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
            .on("postgres_changes", { event: "*", schema: "public", table: "prestador_servicos" }, async () => {
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

        // A listagem inclui profissionais cadastrados, mesmo quando indisponíveis.
        // Nunca criar profissionais fictícios para preencher espaço na tela.
        if (prestadores.length === 0) {
            prestadoresGrid.innerHTML = `
                <div class="empty-pros-msg" style="grid-column: 1 / -1;">
                    
                    <p style="font-size: 15px; font-weight: 700; color: #374151; margin: 0 0 4px 0;">Nenhum profissional encontrado.</p>
                    <small style="color: #6b7280;">${categoria !== 'todos' ? 'Nenhum profissional cadastrado nesta categoria.' : 'Os prestadores cadastrados aparecerão aqui com seus nomes e profissões.'}</small>
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
            const avatarFallback = `<div class="avatar-fallback" style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">${escaparHtml(inicial)}</div>`;
            const avatarHtml = p.fotoUrl
                ? `<img src="${escaparHtml(p.fotoUrl)}" alt="${escaparHtml(p.nome)}" class="pro-avatar-img">`
                : avatarFallback;

            // Meta tags (Serviços realizados e Localização)
            const metaTags = [];
            if (p.servicosRealizados && p.servicosRealizados > 0) {
                metaTags.push(`<span class="pro-meta-tag"> ${p.servicosRealizados} serviços</span>`);
            }
            if (p.localizacao) {
                metaTags.push(`<span class="pro-meta-tag"> ${p.localizacao}</span>`);
            }

            const card = document.createElement("div");
            card.className = "pro-card";
            card.innerHTML = `
                <div class="pro-card-header">
                    <div class="pro-avatar-wrapper">
                        ${avatarHtml}
                        
                    </div>

                    <div class="pro-main-info">
                        <div class="pro-name-row">
                            <strong>${escaparHtml(p.nome)}</strong>
                            ${p.verificado ? '<span class="verified-pill" title="Profissional Verificado"> Verificado</span>' : ''}
                        </div>
                        <span class="pro-specialty">${escaparHtml(p.profissoes || p.especialidade || "Profissão não informada")}</span>
                        <small>${isOnline ? 'Disponível' : 'Indisponível no momento'}</small>

                        <div class="pro-rating-row">
                            ${notaFormatada === null
                                ? '<small class="rating-count">Sem avaliações</small>'
                                : `<span class="stars-gold">${gerarEstrelasHtml(p.avaliacao)}</span><strong class="rating-num">${notaFormatada}</strong>`}
                            <small class="rating-count">(${totalAval} avaliações)</small>
                        </div>
                    </div>
                </div>

                ${p.descricao ? `<p class="pro-short-bio">${escaparHtml(p.descricao.substring(0, 110))}${p.descricao.length > 110 ? '...' : ''}</p>` : ''}

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
                    <button type="button" class="btn-pro-hire" data-id="${p.id}" title="Solicitar atendimento pelo WhatsApp">
                        Solicitar
                    </button>
                </div>
            `;

            card.querySelector(".pro-avatar-img")?.addEventListener("error", event => {
                event.target.outerHTML = avatarFallback;
            }, { once: true });
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
                const p = prestadoresCarregados.find(item => item.id === btn.dataset.id);
                solicitarPeloWhatsApp(p);
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
                ? `<img src="${escaparHtml(p.fotoUrl)}" alt="${escaparHtml(p.nome)}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">`
                : `<div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">${inicial}</div>`;

            headerEl.innerHTML = `
                <div class="pro-modal-avatar-box">
                    ${avatarModalHtml}
                    <span class="pro-modal-status ${p.ativo === true ? 'online' : 'offline'}">${p.ativo === true ? ' Disponível' : ' Indisponível'}</span>
                </div>
                <div class="pro-modal-title-box">
                    <div class="pro-modal-name-row" style="display: flex; align-items: center; gap: 8px;">
                        <h3 style="margin: 0;">${escaparHtml(p.nome)}</h3>
                        ${p.verificado ? '<span class="verified-pill"> Verificado</span>' : ''}
                    </div>
                    <span class="pro-modal-category">${escaparHtml(p.profissoes || p.especialidade || "Profissão não informada")}</span>
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
            if (p.verificado) badges.push('<span class="pro-badge green"> Identidade Verificada</span>');
            if (p.servicosRealizados > 0) badges.push(`<span class="pro-badge blue"> ${p.servicosRealizados} serviços realizados</span>`);
            if (p.localizacao) badges.push(`<span class="pro-badge gray"> Atende em ${p.localizacao}</span>`);
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

    function solicitarPeloWhatsApp(prestador) {
        if (!prestador) return;
        try {
            window.location.assign(WhatsAppService.criarLinkContato(prestador, loggedUser.nome));
        } catch (erro) {
            mostrarToast("Contato indisponível", erro.message);
        }
    }

    if (btnHirePro) {
        btnHirePro.addEventListener("click", () => {
            solicitarPeloWhatsApp(selectedProfilePro);
        });
    }

    /* =======================================================
       7. SUBMISSÃO DO FORMULÁRIO & MODAL DE BUSCA/CONFIRMAÇÃO
    ======================================================= */
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            if (envioEmAndamento) return;

            if (!serviceSelect.value) {
                alert("Selecione o tipo de serviço que precisa.");
                serviceSelect.focus();
                return;
            }

            const cleanCep = cepInput.value.replace(/\D/g, "");
            if (cleanCep.length !== 8) {
                alert("Informe um CEP válido com 8 dígitos.");
                cepInput.focus();
                return;
            }

            try {
                atualizarLimitesAgendamento();
                PedidosService.validarAgendamento(dateInput?.value, timeInput?.value);
            } catch (erro) {
                alert(erro.message);
                dateInput?.focus();
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
                servicoId: serviceSelect.selectedOptions[0]?.dataset.id || null,
                descricao: descriptionInput.value.trim(),
                cep: cepInput.value,
                endereco: endText,
                urgencia: urgencySelect ? urgencySelect.value : "normal",
                orcamento: budgetSelect ? budgetSelect.value : "A combinar",
                data: dateInput.value,
                horario: timeInput.value
            };

            exibirResultadosBusca(tempOrderData);
        });
    }

    function assinaturaFormulario() {
        return JSON.stringify([serviceSelect, descriptionInput, cepInput, urgencySelect,
            budgetSelect, dateInput, timeInput].map(campo => campo?.value || ""));
    }

    async function exibirResultadosBusca(dados) {
        if (!resultadosBusca || envioEmAndamento) return;
        const versao = ++versaoBusca;
        prestadorWhatsApp = null;
        assinaturaBusca = assinaturaFormulario();
        resultadosBusca.hidden = false;
        resultadosBusca.setAttribute("aria-busy", "true");
        btnConfirmOrder.disabled = true;
        matchingProsContainer.innerHTML = "";
        const titulo = document.getElementById("searchResultsTitle");
        const subtitulo = document.getElementById("searchResultsSubtitle");
        titulo.textContent = `Profissionais disponíveis para ${dados.servico}`;
        subtitulo.textContent = "Consultando profissionais disponíveis...";
        document.getElementById("searchRequestSummary").innerHTML = `
            <p><strong>Serviço:</strong> ${escaparHtml(dados.servico)}</p>
            <p><strong>Descrição:</strong> ${escaparHtml(dados.descricao || "Não informada")}</p>
            <p><strong>Quando:</strong> ${escaparHtml(PedidosService.formatarAgendamento(dados.data, dados.horario))}</p>
            <p><strong>Local:</strong> ${escaparHtml(dados.endereco)} — CEP ${escaparHtml(dados.cep)}</p>
            <p><strong>Urgência:</strong> ${escaparHtml(dados.urgencia)} · <strong>Orçamento:</strong> ${escaparHtml(dados.orcamento)}</p>
            <p>Dia, horário, atendimento no endereço e valor sujeitos à confirmação do prestador.</p>`;
        resultadosBusca.focus({ preventScroll: true });
        resultadosBusca.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
            const prestadores = await PrestadoresService.buscarPrestadores();
            if (versao !== versaoBusca) return;
            if (assinaturaBusca !== assinaturaFormulario()) { limparResultadosBusca(); return; }
            const encontrados = PrestadoresService.filtrarDisponiveis(prestadores, dados);
            subtitulo.textContent = encontrados.length
                ? `${encontrados.length} profissional(is) disponível(is). Escolha um prestador para continuar pelo WhatsApp.`
                : "Nenhum prestador disponível para este serviço no momento. Tente novamente mais tarde ou altere o serviço.";
            matchingProsContainer.innerHTML = encontrados.map(p => `
                <article class="matching-pro-item">
                    <div class="matching-info">
                        <strong>${escaparHtml(p.nome)}</strong>
                        <span>${escaparHtml(p.profissoes || p.especialidade || "Profissão não informada")}</span>
                        <small>${WhatsAppService.normalizarTelefone(p.telefone) ? 'Disponível para receber solicitações' : 'Telefone de contato indisponível'}</small>
                        <label class="whatsapp-provider-choice">
                            <input type="radio" name="prestadorWhatsApp" value="${escaparHtml(p.id)}"
                                ${WhatsAppService.normalizarTelefone(p.telefone) ? '' : 'disabled'}>
                            Escolher ${escaparHtml(p.nome)}
                        </label>
                    </div>
                    <button type="button" class="btn-pro-profile" data-id="${escaparHtml(p.id)}">Ver perfil</button>
                </article>`).join("");
            matchingProsContainer.querySelectorAll(".btn-pro-profile").forEach(botao => {
                botao.addEventListener("click", () => abrirPerfilPrestador(botao.dataset.id));
            });
            prestadoresCarregados = prestadores;
            matchingProsContainer.querySelectorAll('input[name="prestadorWhatsApp"]').forEach(radio => {
                radio.addEventListener("change", () => {
                    prestadorWhatsApp = encontrados.find(p => p.id === radio.value) || null;
                    btnConfirmOrder.disabled = !WhatsAppService.normalizarTelefone(prestadorWhatsApp?.telefone);
                });
            });
            btnConfirmOrder.disabled = true;
        } catch (erro) {
            if (versao !== versaoBusca) return;
            console.error("[TelaCliente] Erro na busca de disponíveis:", erro);
            subtitulo.textContent = "Não foi possível consultar os profissionais. Clique em Encontrar profissionais disponíveis para tentar novamente.";
        } finally {
            if (versao === versaoBusca) resultadosBusca.setAttribute("aria-busy", "false");
        }
    }

    function limparResultadosBusca() {
        versaoBusca++;
        tempOrderData = null;
        prestadorWhatsApp = null;
        if (resultadosBusca) {
            resultadosBusca.hidden = true;
            resultadosBusca.setAttribute("aria-busy", "false");
        }
        if (btnConfirmOrder) btnConfirmOrder.disabled = true;
    }

    form?.addEventListener("input", limparResultadosBusca);
    form?.addEventListener("change", limparResultadosBusca);
    btnCancelOrder?.addEventListener("click", () => {
        limparResultadosBusca();
        serviceSelect?.focus();
        form?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (btnConfirmOrder) {
        btnConfirmOrder.addEventListener("click", () => {
            if (!tempOrderData || !prestadorWhatsApp || btnConfirmOrder.disabled || envioEmAndamento) return;
            if (assinaturaBusca !== assinaturaFormulario()) {
                limparResultadosBusca();
                mostrarToast("Formulário alterado", "Busque os profissionais novamente antes de confirmar.");
                return;
            }

            envioEmAndamento = true;
            btnConfirmOrder.disabled = true;
            btnConfirmOrder.textContent = "Abrindo WhatsApp...";

            try {
                PedidosService.validarAgendamento(tempOrderData.data, tempOrderData.horario);
                const link = WhatsAppService.criarLink(prestadorWhatsApp, tempOrderData, loggedUser.nome);
                window.location.assign(link);
            } catch (erro) {
                alert(erro.message || "Não foi possível abrir o WhatsApp. Tente novamente.");
            } finally {
                envioEmAndamento = false;
                btnConfirmOrder.disabled = !tempOrderData || !prestadorWhatsApp;
                btnConfirmOrder.textContent = "Finalizar solicitação no WhatsApp";
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
                statusText = ` ${p.prestadorNome || 'Prestador'} a caminho`;
                actionBtn = `
                    <button class="details btn-view-order-details" data-id="${p.id}">Detalhes</button>
                `;
            } else if (p.status === "concluido") {
                statusClass = "completed";
                statusText = " Concluído";
                actionBtn = `
                    <button class="btn-rate-service" data-id="${p.id}" data-prestador-id="${p.prestadorId || ''}" data-prestador-name="${p.prestadorNome || 'Profissional'}">
                         Avaliar Serviço
                    </button>
                `;
            } else if (p.status === "avaliado") {
                statusClass = "evaluated";
                statusText = ` Avaliado (${p.avaliacao ? p.avaliacao.nota.toFixed(1) : '5.0'})`;
                actionBtn = `
                    <button class="details btn-view-order-details" data-id="${p.id}">Ver Avaliação</button>
                `;
            }

            return `
                <div class="request-item" id="client-req-${p.id}">
                    <div class="request-info">
                        <strong>${p.servico}</strong>
                        <span>${p.descricao.substring(0, 65)}...</span>
                        ${p.agendamento ? `<small>Atendimento solicitado: ${escaparHtml(p.agendamento)}</small>` : ''}
                        <small> ${p.endereco} • Orçamento: ${p.orcamento}</small>
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
                    let msg = ` Detalhes do Pedido:\n\nServiço: ${pedido.servico}\nDescrição: ${pedido.descricao}\nLocal: ${pedido.endereco}\nOrçamento: ${pedido.orcamento}\nStatus: ${pedido.status.toUpperCase()}`;
                    if (pedido.agendamento) msg += `\nDia e horário solicitados: ${pedido.agendamento}`;
                    if (pedido.avaliacao) {
                        msg += `\n\n Sua Avaliação: Nota ${pedido.avaliacao.nota}/5.0\n"${pedido.avaliacao.comentario}"`;
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
            1: "1.0 - Precisa melhorar muito ",
            2: "2.0 - Regular / Abaixo do esperado ",
            3: "3.0 - Bom atendimento ",
            4: "4.0 - Muito bom, recomendo! ",
            5: "5.0 - Excelente trabalho! Perfeito "
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

            mostrarToast("Avaliação Registrada!", "Obrigado pelo seu feedback! Sua nota ajuda toda a comunidade HelpGo.");
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

    function mostrarToast(titulo, texto) {
        if (!toastClient) return;

        if (toastTitleClient) toastTitleClient.textContent = titulo;
        if (toastTextClient) toastTextClient.textContent = texto;

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

    function assinarAtualizacoesSolicitacoes() {
        if (!clientRequestsList || !supabaseClient || canalSolicitacoes || typeof supabaseClient.channel !== "function") return;
        canalSolicitacoes = supabaseClient
            .channel("solicitacoes-cliente-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "solicitacoes" }, () => renderizarMinhasSolicitacoes())
            .subscribe();
    }

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
            await AuthService.fazerLogout();
        });
    }

    /* =======================================================
       14. INICIALIZAÇÃO GERAL
    ======================================================= */
    await carregarUsuario();
    await carregarServicosDoBanco();
    await carregarPrestadoresDoBanco();
    renderizarMinhasSolicitacoes();
    assinarAtualizacoesSolicitacoes();
    atualizarNotificacoesCliente();

});
