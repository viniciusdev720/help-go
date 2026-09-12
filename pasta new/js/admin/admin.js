// =======================================================
// HELPGO - PAINEL ADMINISTRATIVO (admin.js)
// Autenticação via Guard (requireAuth 'admin')
// Todos os dados são carregados diretamente do Supabase.
// Nenhuma lista fixa — tudo dinâmico.
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // 1. PROTEÇÃO DE ROTA — Apenas admins chegam aqui
    let adminUser = null;
    if (typeof Guard !== "undefined") {
        adminUser = await Guard.requireAuth("admin");
        if (!adminUser) return; // Guard já redirecionou
    }

    /* =======================================================
       2. ATUALIZAR INTERFACE COM DADOS DO ADMIN
    ======================================================= */
    const primeiroNome = (adminUser?.nome || "Admin").split(" ")[0];
    const inicial = primeiroNome.charAt(0).toUpperCase();

    const els = {
        welcomeName:      document.getElementById("welcomeAdminName"),
        sidebarName:      document.getElementById("sidebarAdminName"),
        sidebarAvatar:    document.getElementById("sidebarAdminAvatar"),
        topAvatar:        document.getElementById("topAdminAvatar"),
        topbarTitle:      document.getElementById("topbarTitle"),
        topbarBreadcrumb: document.getElementById("topbarBreadcrumb"),
        pageContent:      document.getElementById("pageContent"),
        btnLogout:        document.getElementById("btnLogoutAdmin"),
    };

    if (els.welcomeName)   els.welcomeName.textContent = primeiroNome;
    if (els.sidebarName)   els.sidebarName.textContent = adminUser?.nome || "Administrador";
    if (els.sidebarAvatar) els.sidebarAvatar.textContent = inicial;
    if (els.topAvatar)     els.topAvatar.textContent = inicial;

    /* =======================================================
       3. NAVEGAÇÃO ENTRE SEÇÕES
    ======================================================= */
    const SECTIONS = ["dashboard", "clientes", "prestadores", "solicitacoes", "servicos"];

    function ativarSecao(nome) {
        // Esconder todas as seções
        SECTIONS.forEach(s => {
            const el = document.getElementById(`section${capitalize(s)}`);
            if (el) el.style.display = "none";
        });

        // Mostrar a seção ativa
        const secEl = document.getElementById(`section${capitalize(nome)}`);
        if (secEl) secEl.style.display = "";

        // Atualizar nav
        document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
        const navBtn = document.getElementById(`nav${capitalize(nome)}`);
        if (navBtn) navBtn.classList.add("active");

        // Atualizar topbar
        const labels = {
            dashboard:    ["Dashboard", "Visão Geral"],
            clientes:     ["Clientes", "Gerenciar Clientes"],
            prestadores:  ["Prestadores", "Gerenciar Prestadores"],
            solicitacoes: ["Solicitações", "Gerenciar Solicitações"],
            servicos:     ["Serviços", "Categorias de Serviços"]
        };
        const [titulo, breadcrumb] = labels[nome] || ["Dashboard", "Visão Geral"];
        if (els.topbarTitle)      els.topbarTitle.textContent = titulo;
        if (els.topbarBreadcrumb) els.topbarBreadcrumb.textContent = breadcrumb;

        // Carregar dados da seção
        carregarSecao(nome);
    }

    // Eventos de clique na nav
    document.querySelectorAll(".nav-item[data-section]").forEach(btn => {
        btn.addEventListener("click", () => ativarSecao(btn.dataset.section));
    });

    // Botões "Ver todos" nos cards do dashboard
    document.querySelectorAll(".btn-card-action[data-section]").forEach(btn => {
        btn.addEventListener("click", () => ativarSecao(btn.dataset.section));
    });

    /* =======================================================
       4. CARREGAR DADOS DO BANCO
    ======================================================= */
    async function carregarSecao(nome) {
        switch (nome) {
            case "dashboard":     await carregarDashboard(); break;
            case "clientes":      await carregarClientes(true); break;
            case "prestadores":   await carregarPrestadores(true); break;
            case "solicitacoes":  await carregarSolicitacoes(true); break;
            case "servicos":      await carregarServicos(); break;
        }
    }

    // ---- DASHBOARD ----
    async function carregarDashboard() {
        await Promise.all([
            carregarClientes(false),
            carregarPrestadores(false),
            carregarSolicitacoes(false),
            carregarServicos(),
        ]);
    }

    // ---- CLIENTES ----
    async function carregarClientes(completo = false) {
        const containerRapido   = document.getElementById("listaClientesRapida");
        const containerCompleto = document.getElementById("listaClientesCompleta");
        const statEl            = document.getElementById("statClientes");
        const badgeEl           = document.getElementById("badgeClientes");
        const totalLabel        = document.getElementById("totalClientesLabel");

        try {
            const { data, error } = await supabaseClient
                .from("usuarios")
                .select("id, nome, email, created_at")
                .eq("tipo", "cliente")
                .order("created_at", { ascending: false });

            if (error) throw error;
            const clientes = data || [];

            if (statEl)   statEl.textContent = clientes.length;
            if (badgeEl)  badgeEl.textContent = clientes.length;
            if (totalLabel) totalLabel.textContent = `${clientes.length} clientes`;

            const htmlItens = clientes.length === 0
                ? `<div class="empty-admin-msg"><div class="empty-icon">👥</div>Nenhum cliente cadastrado.</div>`
                : clientes.slice(0, completo ? 999 : 5).map(c => `
                    <div class="user-list-item">
                        <div class="user-list-avatar">${c.nome?.charAt(0).toUpperCase() || "C"}</div>
                        <div class="user-list-info">
                            <div class="user-list-name">${c.nome || "—"}</div>
                            <div class="user-list-email">${c.email || "—"}</div>
                        </div>
                        <span class="user-list-status ativo">Cliente</span>
                    </div>
                `).join("");

            if (containerRapido)   containerRapido.innerHTML   = htmlItens;
            if (completo && containerCompleto) containerCompleto.innerHTML = htmlItens;

        } catch (err) {
            console.error("[Admin] Erro ao carregar clientes:", err);
            const msg = `<div class="empty-admin-msg">⚠️ Erro ao carregar clientes.</div>`;
            if (containerRapido)   containerRapido.innerHTML   = msg;
            if (containerCompleto) containerCompleto.innerHTML = msg;
        }
    }

    // ---- PRESTADORES ----
    async function carregarPrestadores(completo = false) {
        const containerRapido   = document.getElementById("listaPrestadoresRapida");
        const containerCompleto = document.getElementById("listaPrestadoresCompleta");
        const statEl            = document.getElementById("statPrestadores");
        const badgeEl           = document.getElementById("badgePrestadores");
        const totalLabel        = document.getElementById("totalPrestadoresLabel");

        try {
            const { data, error } = await supabaseClient
                .from("prestadores")
                .select(`
                    id, ativo, status, avaliacao, verificado,
                    usuarios ( nome, email )
                `)
                .order("usuarios(nome)", { ascending: true });

            if (error) throw error;
            const prestadores = data || [];

            if (statEl)    statEl.textContent = prestadores.length;
            if (badgeEl)   badgeEl.textContent = prestadores.length;
            if (totalLabel) totalLabel.textContent = `${prestadores.length} prestadores`;

            const htmlItens = prestadores.length === 0
                ? `<div class="empty-admin-msg"><div class="empty-icon">🔧</div>Nenhum prestador cadastrado.</div>`
                : prestadores.slice(0, completo ? 999 : 5).map(p => {
                    const nome   = p.usuarios?.nome  || "Prestador";
                    const email  = p.usuarios?.email || "—";
                    const status = p.ativo ? "ativo" : "inativo";
                    const nota   = p.avaliacao != null ? `⭐ ${Number(p.avaliacao).toFixed(1)}` : "Sem avaliação";
                    return `
                        <div class="user-list-item">
                            <div class="user-list-avatar prestador">${nome.charAt(0).toUpperCase()}</div>
                            <div class="user-list-info">
                                <div class="user-list-name">${nome} ${p.verificado ? "✓" : ""}</div>
                                <div class="user-list-email">${email} · ${nota}</div>
                            </div>
                            <span class="user-list-status ${status}">${p.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                    `;
                }).join("");

            if (containerRapido)   containerRapido.innerHTML   = htmlItens;
            if (completo && containerCompleto) containerCompleto.innerHTML = htmlItens;

        } catch (err) {
            console.error("[Admin] Erro ao carregar prestadores:", err);
            const msg = `<div class="empty-admin-msg">⚠️ Erro ao carregar prestadores.</div>`;
            if (containerRapido)   containerRapido.innerHTML   = msg;
            if (containerCompleto) containerCompleto.innerHTML = msg;
        }
    }

    // ---- SOLICITAÇÕES ----
    async function carregarSolicitacoes(completo = false) {
        const containerRapido   = document.getElementById("listaSolicitacoesRapida");
        const containerCompleto = document.getElementById("listaSolicitacoesCompleta");
        const statEl            = document.getElementById("statSolicitacoes");
        const badgeEl           = document.getElementById("badgeSolicitacoes");
        const totalLabel        = document.getElementById("totalSolicitacoesLabel");

        try {
            const { data, error } = await supabaseClient
                .from("solicitacoes")
                .select("id, servico, descricao, status, urgencia, created_at")
                .order("created_at", { ascending: false });

            if (error) throw error;
            const solicitacoes = data || [];

            if (statEl)    statEl.textContent = solicitacoes.length;
            if (badgeEl)   badgeEl.textContent = solicitacoes.length;
            if (totalLabel) totalLabel.textContent = `${solicitacoes.length} solicitações`;

            const statusMap = {
                aberto:      ["aberto",    "Aberto"],
                em_andamento:["andamento", "Em andamento"],
                concluido:   ["concluido", "Concluído"],
                avaliado:    ["concluido", "Avaliado"],
                cancelado:   ["inativo",   "Cancelado"]
            };

            const htmlItens = solicitacoes.length === 0
                ? `<div class="empty-admin-msg"><div class="empty-icon">📋</div>Nenhuma solicitação registrada.</div>`
                : solicitacoes.slice(0, completo ? 999 : 5).map(s => {
                    const [cls, label] = statusMap[s.status] || ["aberto", s.status];
                    const urgIcn = s.urgencia === "emergencia" ? "🔴" : s.urgencia === "urgente" ? "🟡" : "🟢";
                    return `
                        <div class="request-list-item">
                            <div class="request-icon">${urgIcn}</div>
                            <div class="request-info">
                                <div class="request-title">${s.servico}</div>
                                <div class="request-meta">${s.descricao?.substring(0, 55) || "—"}...</div>
                            </div>
                            <span class="request-status ${cls}">${label}</span>
                        </div>
                    `;
                }).join("");

            if (containerRapido)   containerRapido.innerHTML   = htmlItens;
            if (completo && containerCompleto) containerCompleto.innerHTML = htmlItens;

        } catch (err) {
            console.error("[Admin] Erro ao carregar solicitações:", err);
            // Fallback: verificar se a tabela tem outro nome
            const msg = `<div class="empty-admin-msg">⚠️ Erro ao carregar solicitações. Verifique as políticas RLS.</div>`;
            if (containerRapido)   containerRapido.innerHTML   = msg;
            if (containerCompleto) containerCompleto.innerHTML = msg;
        }
    }

    // ---- SERVIÇOS ----
    async function carregarServicos() {
        const statEl        = document.getElementById("statServicos");
        const listaCompleta = document.getElementById("listaServicosCompleta");
        const totalLabel    = document.getElementById("totalServicosLabel");

        try {
            const { data, error } = await supabaseClient
                .from("servicos")
                .select("id, nome, descricao")
                .order("nome");

            if (error) throw error;
            const servicos = data || [];

            if (statEl)    statEl.textContent = servicos.length;
            if (totalLabel) totalLabel.textContent = `${servicos.length} categorias`;

            if (listaCompleta) {
                listaCompleta.innerHTML = servicos.length === 0
                    ? `<div class="empty-admin-msg"><div class="empty-icon">🛠️</div>Nenhum serviço cadastrado.</div>`
                    : servicos.map(s => `
                        <div class="user-list-item">
                            <div class="user-list-avatar" style="background:linear-gradient(135deg,#f59e0b,#d97706)">🛠</div>
                            <div class="user-list-info">
                                <div class="user-list-name">${s.nome}</div>
                                <div class="user-list-email">${s.descricao?.substring(0, 60) || "—"}</div>
                            </div>
                            <span class="user-list-status ativo">Ativo</span>
                        </div>
                    `).join("");
            }

        } catch (err) {
            console.error("[Admin] Erro ao carregar serviços:", err);
        }
    }

    /* =======================================================
       5. LOGOUT
    ======================================================= */
    if (els.btnLogout) {
        els.btnLogout.addEventListener("click", async () => {
            if (confirm("Deseja realmente sair do painel administrativo?")) {
                await AuthService.fazerLogout();
            }
        });
    }

    /* =======================================================
       6. TOAST
    ======================================================= */
    function mostrarToast(msg) {
        const el = document.getElementById("toastAdmin");
        if (!el) return;
        el.textContent = msg;
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 3500);
    }

    /* =======================================================
       7. UTILS
    ======================================================= */
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /* =======================================================
       8. INICIALIZAÇÃO
    ======================================================= */
    ativarSecao("dashboard");

});
