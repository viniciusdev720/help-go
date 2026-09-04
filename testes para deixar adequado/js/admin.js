// =======================================================
// HELPGO - CONTROLADOR DO PAINEL ADMINISTRATIVO MASTER
// Acesso Restrito Exclusivo: testenedfor@gmail.com
// =======================================================

document.addEventListener("DOMContentLoaded", async () => {

    // 1. Validação de Acesso Restrito de Administrador
    if (typeof Guard !== "undefined") {
        const adminUser = await Guard.requireAdmin();
        if (!adminUser) return;
    }

    /* =======================================================
       2. ELEMENTOS DO DOM
    ======================================================= */
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const btnAdminLogout = document.getElementById("btnAdminLogout");

    // Métricas
    const statPrestadores = document.getElementById("statPrestadores");
    const statClientes = document.getElementById("statClientes");
    const statSolicitacoes = document.getElementById("statSolicitacoes");
    const statMensagens = document.getElementById("statMensagens");
    const countTabPrestadores = document.getElementById("countTabPrestadores");
    const countTabClientes = document.getElementById("countTabClientes");
    const countTabSolicitacoes = document.getElementById("countTabSolicitacoes");

    // Tabelas
    const tbodyRecentUsers = document.getElementById("tbodyRecentUsers");
    const tbodyRecentOrders = document.getElementById("tbodyRecentOrders");
    const tbodyPrestadores = document.getElementById("tbodyPrestadores");
    const tbodyClientes = document.getElementById("tbodyClientes");
    const tbodySolicitacoes = document.getElementById("tbodySolicitacoes");
    const tbodyChatLogs = document.getElementById("tbodyChatLogs");

    // Buscas
    const searchPrestadores = document.getElementById("searchPrestadores");
    const searchClientes = document.getElementById("searchClientes");
    const searchSolicitacoes = document.getElementById("searchSolicitacoes");

    let listaPrestadoresCache = [];
    let listaClientesCache = [];
    let listaSolicitacoesCache = [];

    /* =======================================================
       3. NAVEGAÇÃO ENTRE ABAS
    ======================================================= */
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetContent = document.getElementById(targetTab);
            if (targetContent) targetContent.classList.add("active");

            // Recarregar dados específicos ao abrir aba
            if (targetTab === "tab-prestadores") carregarPrestadores();
            if (targetTab === "tab-clientes") carregarClientes();
            if (targetTab === "tab-solicitacoes") carregarSolicitacoes();
            if (targetTab === "tab-chat") carregarChatLogs();
        });
    });

    if (btnAdminLogout) {
        btnAdminLogout.addEventListener("click", () => {
            AuthService.fazerLogout();
        });
    }

    /* =======================================================
       4. CARREGAR DASHBOARD PRINCIPAL
    ======================================================= */
    async function carregarDashboard() {
        try {
            const res = await ApiConfig.apiFetch("admin.php?action=dashboard");
            if (!res || !res.success) return;

            const m = res.metricas;
            if (statPrestadores) statPrestadores.textContent = m.totalPrestadores;
            if (statClientes) statClientes.textContent = m.totalClientes;
            if (statSolicitacoes) statSolicitacoes.textContent = m.totalSolicitacoes;
            if (statMensagens) statMensagens.textContent = m.totalMensagens;

            if (countTabPrestadores) countTabPrestadores.textContent = m.totalPrestadores;
            if (countTabClientes) countTabClientes.textContent = m.totalClientes;
            if (countTabSolicitacoes) countTabSolicitacoes.textContent = m.totalSolicitacoes;

            // Renderizar Usuários Recentes
            if (tbodyRecentUsers && res.ultimosUsuarios) {
                if (res.ultimosUsuarios.length === 0) {
                    tbodyRecentUsers.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Nenhum usuário registrado ainda.</td></tr>`;
                } else {
                    tbodyRecentUsers.innerHTML = res.ultimosUsuarios.map(u => `
                        <tr>
                            <td><strong>${_escape(u.nome)}</strong></td>
                            <td><span class="status-pill status-${u.tipo}">${u.tipo}</span></td>
                            <td>${_escape(u.email)}</td>
                            <td>${_formatarData(u.created_at)}</td>
                        </tr>
                    `).join("");
                }
            }

            // Renderizar Chamados Recentes
            if (tbodyRecentOrders && res.ultimasSolicitacoes) {
                if (res.ultimasSolicitacoes.length === 0) {
                    tbodyRecentOrders.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Nenhum chamado criado ainda.</td></tr>`;
                } else {
                    tbodyRecentOrders.innerHTML = res.ultimasSolicitacoes.map(s => `
                        <tr>
                            <td><strong>${_escape(s.servico)}</strong></td>
                            <td>${_escape(s.cliente_nome)}</td>
                            <td><span class="status-pill status-${s.status}">${s.status}</span></td>
                        </tr>
                    `).join("");
                }
            }

        } catch (err) {
            console.error("[Admin] Erro ao carregar dashboard:", err);
        }
    }

    /* =======================================================
       5. GERENCIAR PRESTADORES
    ======================================================= */
    async function carregarPrestadores() {
        try {
            const res = await ApiConfig.apiFetch("admin.php?action=usuarios&tipo=prestador");
            if (res && res.data) {
                listaPrestadoresCache = res.data;
                renderizarPrestadores(listaPrestadoresCache);
            }
        } catch (err) {
            console.error("[Admin] Erro ao carregar prestadores:", err);
        }
    }

    function renderizarPrestadores(lista) {
        if (!tbodyPrestadores) return;

        if (lista.length === 0) {
            tbodyPrestadores.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Nenhum prestador cadastrado no momento.</td></tr>`;
            return;
        }

        tbodyPrestadores.innerHTML = lista.map(p => {
            const isBloqueado = p.status === "bloqueado";
            const btnStatusText = isBloqueado ? "Ativar" : "Bloquear";
            const btnStatusClass = isBloqueado ? "btn-toggle-activate" : "btn-toggle-block";
            const novoStatus = isBloqueado ? "ativo" : "bloqueado";

            return `
                <tr>
                    <td>#${p.id}</td>
                    <td><strong>${_escape(p.nome)}</strong><br><small style="color:#94a3b8;">${_escape(p.email)}</small></td>
                    <td><span class="status-pill status-em_andamento">${_escape(p.categoria || 'Geral')}</span></td>
                    <td>${_escape(p.telefone || '-')}</td>
                    <td>${_escape(p.cidade || '-')}/${_escape(p.estado || '')}</td>
                    <td>⭐ ${Number(p.avaliacao || 5.0).toFixed(1)} (${p.total_avaliacoes || 0})</td>
                    <td><span class="status-pill status-${p.status}">${p.status}</span></td>
                    <td>
                        <button type="button" class="btn-action-small ${btnStatusClass}" onclick="AdminController.alterarStatusUsuario(${p.id}, '${novoStatus}')">${btnStatusText}</button>
                        <button type="button" class="btn-action-small btn-delete-user" onclick="AdminController.excluirUsuario(${p.id}, '${_escape(p.nome)}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    if (searchPrestadores) {
        searchPrestadores.addEventListener("input", (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = listaPrestadoresCache.filter(p => 
                p.nome.toLowerCase().includes(termo) ||
                p.email.toLowerCase().includes(termo) ||
                (p.categoria && p.categoria.toLowerCase().includes(termo))
            );
            renderizarPrestadores(filtrados);
        });
    }

    /* =======================================================
       6. GERENCIAR CLIENTES
    ======================================================= */
    async function carregarClientes() {
        try {
            const res = await ApiConfig.apiFetch("admin.php?action=usuarios&tipo=cliente");
            if (res && res.data) {
                listaClientesCache = res.data;
                renderizarClientes(listaClientesCache);
            }
        } catch (err) {
            console.error("[Admin] Erro ao carregar clientes:", err);
        }
    }

    function renderizarClientes(lista) {
        if (!tbodyClientes) return;

        if (lista.length === 0) {
            tbodyClientes.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Nenhum cliente cadastrado no momento.</td></tr>`;
            return;
        }

        tbodyClientes.innerHTML = lista.map(c => {
            const isBloqueado = c.status === "bloqueado";
            const btnStatusText = isBloqueado ? "Ativar" : "Bloquear";
            const btnStatusClass = isBloqueado ? "btn-toggle-activate" : "btn-toggle-block";
            const novoStatus = isBloqueado ? "ativo" : "bloqueado";

            return `
                <tr>
                    <td>#${c.id}</td>
                    <td><strong>${_escape(c.nome)}</strong></td>
                    <td>${_escape(c.email)}</td>
                    <td>${_escape(c.telefone || '-')}</td>
                    <td>${_escape(c.cidade || '-')}/${_escape(c.estado || '')}</td>
                    <td>${_formatarData(c.created_at)}</td>
                    <td><span class="status-pill status-${c.status}">${c.status}</span></td>
                    <td>
                        <button type="button" class="btn-action-small ${btnStatusClass}" onclick="AdminController.alterarStatusUsuario(${c.id}, '${novoStatus}')">${btnStatusText}</button>
                        <button type="button" class="btn-action-small btn-delete-user" onclick="AdminController.excluirUsuario(${c.id}, '${_escape(c.nome)}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    if (searchClientes) {
        searchClientes.addEventListener("input", (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = listaClientesCache.filter(c => 
                c.nome.toLowerCase().includes(termo) ||
                c.email.toLowerCase().includes(termo)
            );
            renderizarClientes(filtrados);
        });
    }

    /* =======================================================
       7. GERENCIAR TODAS AS SOLICITAÇÕES
    ======================================================= */
    async function carregarSolicitacoes() {
        try {
            const res = await ApiConfig.apiFetch("admin.php?action=todas_solicitacoes");
            if (res && res.data) {
                listaSolicitacoesCache = res.data;
                renderizarSolicitacoes(listaSolicitacoesCache);
            }
        } catch (err) {
            console.error("[Admin] Erro ao carregar solicitações:", err);
        }
    }

    function renderizarSolicitacoes(lista) {
        if (!tbodySolicitacoes) return;

        if (lista.length === 0) {
            tbodySolicitacoes.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">Nenhuma solicitação criada ainda.</td></tr>`;
            return;
        }

        tbodySolicitacoes.innerHTML = lista.map(s => `
            <tr>
                <td>#${s.id}</td>
                <td><strong>${_escape(s.servico)}</strong><br><small style="color:#94a3b8;">${_escape(s.descricao).substring(0, 40)}...</small></td>
                <td>${_escape(s.cliente_nome)}</td>
                <td>${s.prestador_nome ? `<strong>${_escape(s.prestador_nome)}</strong>` : '<span style="color:#94a3b8;">Aguardando prestador</span>'}</td>
                <td><span class="status-pill status-${s.urgencia}">${s.urgencia}</span></td>
                <td>${_escape(s.orcamento || 'A combinar')}</td>
                <td><span class="status-pill status-${s.status}">${s.status}</span></td>
                <td>${_formatarData(s.created_at)}</td>
            </tr>
        `).join("");
    }

    if (searchSolicitacoes) {
        searchSolicitacoes.addEventListener("input", (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = listaSolicitacoesCache.filter(s => 
                s.servico.toLowerCase().includes(termo) ||
                s.cliente_nome.toLowerCase().includes(termo) ||
                (s.prestador_nome && s.prestador_nome.toLowerCase().includes(termo)) ||
                s.status.toLowerCase().includes(termo)
            );
            renderizarSolicitacoes(filtrados);
        });
    }

    /* =======================================================
       8. AUDITORIA DE CHAT
    ======================================================= */
    async function carregarChatLogs() {
        try {
            const res = await ApiConfig.apiFetch("admin.php?action=logs_chat");
            if (res && res.data) {
                renderizarChatLogs(res.data);
            }
        } catch (err) {
            console.error("[Admin] Erro ao carregar logs de chat:", err);
        }
    }

    function renderizarChatLogs(logs) {
        if (!tbodyChatLogs) return;

        if (logs.length === 0) {
            tbodyChatLogs.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">Nenhuma mensagem de chat registrada ainda.</td></tr>`;
            return;
        }

        tbodyChatLogs.innerHTML = logs.map(l => `
            <tr>
                <td>${_formatarData(l.created_at)}</td>
                <td><strong>${_escape(l.remetente_nome)}</strong> (${l.remetente_tipo})</td>
                <td><strong>${_escape(l.destinatario_nome)}</strong> (${l.destinatario_tipo})</td>
                <td>${l.solicitacao_servico ? `Chamado #${l.solicitacao_id} (${_escape(l.solicitacao_servico)})` : 'Chat Direto'}</td>
                <td>${_escape(l.mensagem)}</td>
            </tr>
        `).join("");
    }

    /* =======================================================
       9. HELPERS E MÉTODOS GLOBAIS
    ======================================================= */
    window.AdminController = {
        async alterarStatusUsuario(usuarioId, novoStatus) {
            if (!confirm(`Deseja alterar o status deste usuário para "${novoStatus}"?`)) return;

            try {
                const res = await ApiConfig.apiFetch("admin.php?action=toggle_status_usuario", {
                    method: "POST",
                    body: { usuario_id: usuarioId, status: novoStatus }
                });
                alert(res.message || "Status alterado com sucesso.");
                carregarDashboard();
                carregarPrestadores();
                carregarClientes();
            } catch (err) {
                alert("Erro ao alterar status: " + (err.message || "Tente novamente."));
            }
        },

        async excluirUsuario(usuarioId, nome) {
            if (!confirm(`Tem certeza absoluta que deseja excluir o usuário "${nome}"? Esta ação é irreversível!`)) return;

            try {
                const res = await ApiConfig.apiFetch("admin.php?action=excluir_usuario", {
                    method: "POST",
                    body: { usuario_id: usuarioId }
                });
                alert(res.message || "Usuário excluído com sucesso.");
                carregarDashboard();
                carregarPrestadores();
                carregarClientes();
            } catch (err) {
                alert("Erro ao excluir: " + (err.message || "Tente novamente."));
            }
        }
    };

    function _formatarData(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function _escape(str) {
        if (!str) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // Inicialização
    carregarDashboard();
    carregarPrestadores();
});
