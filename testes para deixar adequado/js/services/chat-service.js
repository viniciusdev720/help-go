// =======================================================
// HELPGO - SERVIÇO E INTERFACE DE CHAT EM TEMPO REAL
// Permite comunicação fluida entre Cliente e Prestador
// =======================================================

const ChatService = (() => {

    let pollingInterval = null;
    let conversaAtiva = {
        solicitacaoId: null,
        destinatarioId: null,
        nome: "Conversa",
        tipo: "Usuário"
    };

    /**
     * Envia uma nova mensagem no chat
     */
    async function enviarMensagem(destinatarioId, mensagem, solicitacaoId = null) {
        try {
            const res = await ApiConfig.apiFetch("chat.php?action=enviar", {
                method: "POST",
                body: {
                    destinatario_id: destinatarioId,
                    solicitacao_id: solicitacaoId,
                    mensagem: mensagem
                }
            });
            return res && res.data;
        } catch (err) {
            console.error("[ChatService] Erro ao enviar mensagem:", err);
            throw err;
        }
    }

    /**
     * Busca o histórico de mensagens de uma conversa
     */
    async function buscarMensagens(solicitacaoId = null, outroUsuarioId = null) {
        try {
            let url = "chat.php?action=mensagens";
            if (solicitacaoId) {
                url += `&solicitacao_id=${encodeURIComponent(solicitacaoId)}`;
            } else if (outroUsuarioId) {
                url += `&usuario_id=${encodeURIComponent(outroUsuarioId)}`;
            } else {
                return [];
            }

            const res = await ApiConfig.apiFetch(url);
            return res && res.data ? res.data : [];
        } catch (err) {
            console.error("[ChatService] Erro ao buscar mensagens:", err);
            return [];
        }
    }

    /**
     * Lista todas as conversas do usuário logado
     */
    async function listarConversas() {
        try {
            const res = await ApiConfig.apiFetch("chat.php?action=conversas");
            return res && res.data ? res.data : [];
        } catch (err) {
            console.error("[ChatService] Erro ao listar conversas:", err);
            return [];
        }
    }

    /**
     * Retorna a contagem de mensagens não lidas
     */
    async function contarNaoLidas() {
        try {
            const res = await ApiConfig.apiFetch("chat.php?action=nao_lidas");
            return res ? Number(res.totalNaoLidas || 0) : 0;
        } catch (err) {
            return 0;
        }
    }

    /**
     * Inicia o polling automático para buscar novas mensagens a cada 2.5s
     */
    function iniciarPolling(solicitacaoId, outroUsuarioId, callback) {
        pararPolling();
        // Chamada imediata
        buscarMensagens(solicitacaoId, outroUsuarioId).then(msgs => {
            if (callback) callback(msgs);
        });

        pollingInterval = setInterval(async () => {
            const msgs = await buscarMensagens(solicitacaoId, outroUsuarioId);
            if (callback) callback(msgs);
        }, 2500);
    }

    function pararPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    /**
     * Abre a interface gráfica de Chat
     */
    function abrirChat({ solicitacaoId = null, destinatarioId = null, nome = "Profissional", tipo = "Prestador" }) {
        conversaAtiva = { solicitacaoId, destinatarioId, nome, tipo };
        _garantirModalChat();

        const modal = document.getElementById("helpgoChatModal");
        const title = document.getElementById("chatModalTitle");
        const subtitle = document.getElementById("chatModalSubtitle");
        const messagesList = document.getElementById("chatModalMessages");
        const inputMsg = document.getElementById("chatModalInput");

        if (title) title.textContent = nome;
        if (subtitle) subtitle.textContent = solicitacaoId ? `Solicitação #${solicitacaoId} • ${tipo}` : tipo;
        if (messagesList) messagesList.innerHTML = `<div class="chat-loading">Carregando mensagens...</div>`;

        if (modal) {
            modal.classList.add("active");
        }

        if (inputMsg) {
            inputMsg.focus();
        }

        iniciarPolling(solicitacaoId, destinatarioId, (mensagens) => {
            _renderizarMensagens(mensagens);
        });
    }

    function fecharChat() {
        pararPolling();
        const modal = document.getElementById("helpgoChatModal");
        if (modal) {
            modal.classList.remove("active");
        }
    }

    function _renderizarMensagens(mensagens) {
        const messagesList = document.getElementById("chatModalMessages");
        if (!messagesList) return;

        if (!mensagens || mensagens.length === 0) {
            messagesList.innerHTML = `
                <div class="chat-empty-state">
                    <span>💬</span>
                    <p>Nenhuma mensagem ainda.</p>
                    <small>Envie uma mensagem para iniciar a conversa!</small>
                </div>
            `;
            return;
        }

        const isScrolledNearBottom = (messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight) < 100;

        const html = mensagens.map(m => {
            const hora = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const classe = m.minha ? "chat-msg-mine" : "chat-msg-other";
            const autor = m.minha ? "Você" : (m.remetenteNome || conversaAtiva.nome);

            return `
                <div class="chat-bubble ${classe}">
                    <div class="chat-bubble-header">
                        <strong>${_escaparHtml(autor)}</strong>
                        <span>${hora}</span>
                    </div>
                    <div class="chat-bubble-body">
                        ${_escaparHtml(m.mensagem)}
                    </div>
                </div>
            `;
        }).join("");

        messagesList.innerHTML = html;

        if (isScrolledNearBottom || messagesList.dataset.firstLoad !== "true") {
            messagesList.scrollTop = messagesList.scrollHeight;
            messagesList.dataset.firstLoad = "true";
        }
    }

    async function _enviarMensagemAtual() {
        const input = document.getElementById("chatModalInput");
        if (!input) return;

        const texto = input.value.trim();
        if (!texto) return;

        input.value = "";
        input.focus();

        try {
            await enviarMensagem(conversaAtiva.destinatarioId, texto, conversaAtiva.solicitacaoId);
            // Atualizar mensagens imediatamente
            const msgs = await buscarMensagens(conversaAtiva.solicitacaoId, conversaAtiva.destinatarioId);
            _renderizarMensagens(msgs);
            const messagesList = document.getElementById("chatModalMessages");
            if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;
        } catch (err) {
            alert("Erro ao enviar mensagem: " + (err.message || "Tente novamente."));
        }
    }

    function _garantirModalChat() {
        if (document.getElementById("helpgoChatModal")) return;

        const div = document.createElement("div");
        div.id = "helpgoChatModal";
        div.className = "helpgo-chat-modal";
        div.innerHTML = `
            <div class="chat-window">
                <div class="chat-header">
                    <div class="chat-user-status">
                        <div class="chat-avatar-circle">💬</div>
                        <div>
                            <strong id="chatModalTitle">Conversa</strong>
                            <small id="chatModalSubtitle">Chat em tempo real</small>
                        </div>
                    </div>
                    <button type="button" class="chat-close-btn" id="chatModalCloseBtn" title="Fechar Chat">×</button>
                </div>

                <div class="chat-messages" id="chatModalMessages">
                    <!-- Mensagens inseridas dinamicamente -->
                </div>

                <form class="chat-footer" id="chatModalForm">
                    <input type="text" id="chatModalInput" placeholder="Digite sua mensagem aqui..." autocomplete="off" required>
                    <button type="submit" class="chat-send-btn" title="Enviar Mensagem">
                        <span>➤</span>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(div);

        document.getElementById("chatModalCloseBtn").addEventListener("click", fecharChat);
        document.getElementById("chatModalForm").addEventListener("submit", (e) => {
            e.preventDefault();
            _enviarMensagemAtual();
        });
    }

    function _escaparHtml(str) {
        if (!str) return "";
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    return {
        enviarMensagem,
        buscarMensagens,
        listarConversas,
        contarNaoLidas,
        iniciarPolling,
        pararPolling,
        abrirChat,
        fecharChat
    };

})();
