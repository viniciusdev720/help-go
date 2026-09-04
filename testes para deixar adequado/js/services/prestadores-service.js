// =======================================================
// HELPGO - SERVIÇO DE PRESTADORES DE SERVIÇOS (PHP + SQLite)
// Apenas prestadores reais vindos do banco de dados
// =======================================================

const PrestadoresService = (() => {

    /**
     * Busca todos os prestadores ativos cadastrados no banco de dados.
     * Opcionalmente filtra por nome da categoria/serviço.
     */
    async function buscarPrestadores(filtroCategoria = null) {
        try {
            let url = "prestadores.php?action=listar";
            if (filtroCategoria && filtroCategoria !== "todos") {
                url += `&categoria=${encodeURIComponent(filtroCategoria)}`;
            }

            const res = await ApiConfig.apiFetch(url);
            if (res && res.data) {
                return res.data.map(p => ({
                    ...p,
                    icone: ServicosService.obterIcone(p.especialidade)
                }));
            }
            return [];
        } catch (err) {
            console.error("[PrestadoresService] Erro ao buscar prestadores:", err);
            return [];
        }
    }

    /**
     * Busca os detalhes completos de um prestador por ID.
     */
    async function buscarPrestadorPorId(id) {
        try {
            const res = await ApiConfig.apiFetch(`prestadores.php?action=detalhes&id=${encodeURIComponent(id)}`);
            if (res && res.data) {
                return {
                    ...res.data,
                    icone: ServicosService.obterIcone(res.data.especialidade)
                };
            }
            return null;
        } catch (err) {
            console.error("[PrestadoresService] Erro ao buscar prestador por ID:", err);
            return null;
        }
    }

    /**
     * Busca prestadores filtrados pelo nome do serviço/categoria.
     */
    async function buscarPrestadoresPorNomeServico(nomeServico) {
        return await buscarPrestadores(nomeServico);
    }

    /**
     * Atualiza o status online/offline do prestador no banco de dados.
     */
    async function atualizarStatus(prestadorId, ativo) {
        try {
            const res = await ApiConfig.apiFetch("prestadores.php?action=atualizar_status", {
                method: "POST",
                body: { prestador_id: prestadorId, ativo: ativo ? 1 : 0 }
            });
            return res && res.success;
        } catch (err) {
            console.error("[PrestadoresService] Erro ao atualizar status:", err);
            return false;
        }
    }

    /**
     * Conta a quantidade de prestadores online no momento.
     */
    async function contarPrestadoresAtivos() {
        try {
            const res = await ApiConfig.apiFetch("prestadores.php?action=contar_ativos");
            return res ? Number(res.total || 0) : 0;
        } catch (err) {
            return 0;
        }
    }

    async function garantirPerfilPrestadorAtual() {
        // No PHP o perfil já é garantido na tabela prestadores durante o cadastro
        return true;
    }

    return {
        buscarPrestadores,
        buscarPrestadorPorId,
        buscarPrestadoresPorNomeServico,
        atualizarStatus,
        contarPrestadoresAtivos,
        garantirPerfilPrestadorAtual
    };

})();
