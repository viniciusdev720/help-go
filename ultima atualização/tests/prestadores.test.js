// Harness sem dependências; recebe o conteúdo de prestadores-service.js.
async function runHelpGoPrestadoresTests(source) {
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const passed = [];
    const rows = [
        { id: "ana", usuarios: { nome: "Ana Souza" }, ativo: false,
            prestador_servicos: [{ servicos: { id: 1, nome: "Eletricista" } },
                { servicos: { id: 2, nome: "Pintora" } }] },
        { id: "bruno", usuarios: { nome: "Bruno Lima" }, ativo: true, prestador_servicos: [] }
    ];
    function fixture(options = {}) {
        const calls = [];
        const client = {
            async rpc(name, args) {
                calls.push({ name, args });
                return options.error ? { error: options.error } : {
                    data: args.p_id ? rows.filter(p => p.id === args.p_id) : rows
                };
            },
            from() {
                calls.push({ legacy: true });
                return {
                    select() { return this; }, eq() { return this; },
                    then(resolve, reject) { return Promise.resolve({ data: options.legacy || [] }).then(resolve, reject); }
                };
            }
        };
        const service = new Function("supabaseClient", "console", source + "; return PrestadoresService;")(
            client, { error() {}, warn() {} }
        );
        return { service, calls };
    }
    const { service, calls } = fixture();
    const prestadores = await service.buscarPrestadores();
    assert(prestadores.length === 2 && prestadores[0].nome === "Ana Souza", "Nome real ausente");
    assert(prestadores[0].ativo === false, "Prestador indisponível removido");
    assert(prestadores[0].profissoes === "Eletricista, Pintora", "Profissões incompletas");
    assert(prestadores[1].especialidade === null, "Profissão inventada");
    passed.push("Nomes, profissões múltiplas e cadastro sem profissão");
    assert((await service.buscarPrestadores("Pintora")).length === 1, "Filtro da segunda profissão falhou");
    assert(await service.contarPrestadoresAtivos() === 1, "Contagem de disponíveis incorreta");
    passed.push("Filtro e contagem de disponíveis");
    assert((await service.buscarPrestadorPorId("ana")).nome === "Ana Souza", "Perfil incorreto");
    assert(await service.buscarPrestadorPorId("ausente") === null, "Perfil inexistente inventado");
    assert(calls.every(c => !c.legacy), "Catálogo acessou perfis privados pelo navegador");
    passed.push("Consulta individual e ausência de consultas diretas aos perfis");
    const legacy = fixture({ error: { code: "PGRST202" }, legacy: rows });
    assert((await legacy.service.buscarPrestadores()).length === 2, "Compatibilidade falhou");
    passed.push("Compatibilidade com catálogo antigo legível");
    for (const options of [
        { error: { code: "PGRST202" } },
        { error: { code: "PGRST202" }, legacy: [{ id: "oculto", usuarios: null }] }
    ]) {
        let failed = false;
        try { await fixture(options).service.buscarPrestadores(); }
        catch (error) { failed = error.message.includes("configurada"); }
        assert(failed, "Catálogo ausente/RLS oculto foi tratado como cadastro vazio");
    }
    passed.push("Configuração ausente e nome bloqueado informam falha");
    const denied = fixture({ error: { code: "42501", message: "Sem acesso" } });
    let failure;
    try { await denied.service.buscarPrestadores(); } catch (error) { failure = error; }
    assert(failure?.code === "42501" && denied.calls.length === 1, "Permissão contornada por fallback");
    passed.push("Erro de permissão preservado sem fallback");
    const disponiveis = [
        { id: "offline", ativo: false, servicos: [{ id: 2, nome: "Pintura" }] },
        { id: "outra-area", ativo: true, servicos: [{ id: 3, nome: "Elétrica" }] },
        { id: "duas-profissoes", ativo: true, servicos: [{ id: 3, nome: "Elétrica" }, { id: 2, nome: "Pintura" }] },
        { id: "antigo", ativo: true, servicos: [{ id: null, nome: "píntura" }] },
        { id: "sem-profissao", ativo: true, servicos: [] }
    ];
    const encontrados = service.filtrarDisponiveis(disponiveis, { servicoId: "2", servico: "Pintura" });
    assert(encontrados.map(p => p.id).join(",") === "duas-profissoes,antigo", "Busca incluiu indisponível ou ignorou segunda profissão");
    assert(service.filtrarDisponiveis(disponiveis, { servicoId: "4", servico: "Pintura" }).every(p => p.id === "antigo"), "Nome sobrepôs ID de serviço divergente");
    assert(service.filtrarDisponiveis(disponiveis, { servico: "" }).length === 0, "Serviço vazio correspondeu a prestadores");
    passed.push("Busca por disponibilidade, ID, múltiplas profissões e categoria antiga sem ID");
    return passed;
}
