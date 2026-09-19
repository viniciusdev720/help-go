// Harness sem dependências. Recebe o conteúdo dos arquivos para execução em JS.
async function runHelpGoProfileTests(sources) {
    const passed = [];
    const assert = (value, message) => { if (!value) throw new Error(message); };
    const silentConsole = { warn() {}, error() {} };

    function authFixture(options = {}) {
        const storage = new Map();
        const calls = [];
        const user = { id: "conta-1", email: options.email || "teste@example.com", user_metadata: { tipo: "admin" } };
        let signouts = 0;
        const client = {
            rpc: async () => options.rpcError
                ? { error: options.rpcError } : { data: 2 },
            auth: {
                getUser: async () => ({ data: { user: options.noSession ? null : user } }),
                signInWithPassword: async () => ({ data: { user } }),
                signOut: async () => { signouts++; return {}; }
            },
            from(table) {
                calls.push(table);
                return {
                    select() { return this; }, eq() { return this; },
                    async maybeSingle() {
                        if (options.errorTable === table) return { error: { code: "42501", message: "negado" } };
                        return { data: options[table] || null };
                    }
                };
            }
        };
        const api = new Function("supabaseClient", "localStorage", "window", "console",
            sources["js/auth/auth-service.js"] + "\nreturn AuthService;")(
            client,
            { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
            { location: { pathname: "/pages/login.html" } }, silentConsole
        );
        return { api, calls, signouts: () => signouts };
    }

    for (const [table, type] of [["clientes", "cliente"], ["prestador", "prestador"]]) {
        const f = authFixture({ [table]: { nome: "Nome do banco", cpf: "123" } });
        const profile = await f.api.fazerLogin("teste@example.com", "senha");
        assert(profile.tipo === type && profile.nome === "Nome do banco", "Perfil incorreto: " + type);
        assert(!f.calls.includes("usuarios"), "Login novo consultou usuarios");
        passed.push("Login " + type + " usa perfil separado e ignora tipo dos metadados");
    }

    for (const options of [{}, { clientes: {}, prestador: {} }, { clientes: {}, errorTable: "prestador" }]) {
        const f = authFixture(options);
        let rejected = false;
        try { await f.api.fazerLogin("teste@example.com", "senha"); } catch { rejected = true; }
        assert(rejected && f.signouts() === 1 && f.api.getUsuarioLocal() === null, "Perfil inválido autorizou acesso");
    }
    passed.push("Perfis ausentes, duplicados e erro de permissão encerram o login");

    const old = authFixture({ rpcError: { code: "PGRST202" }, usuarios: { tipo: "prestador", nome: "Antigo" } });
    assert((await old.api.fazerLogin("teste@example.com", "senha")).tipo === "prestador", "Compatibilidade antiga falhou");
    passed.push("Banco sem migração mantém login antigo");

    const offline = authFixture({ rpcError: { code: "NETWORK" }, usuarios: { tipo: "cliente" } });
    let rejected = false;
    try { await offline.api.fazerLogin("teste@example.com", "senha"); } catch { rejected = true; }
    assert(rejected && !offline.calls.includes("usuarios"), "Erro de rede ativou fallback");
    passed.push("Erro de rede não ativa compatibilidade");

    const expired = authFixture({ noSession: true });
    expired.api.salvarUsuarioLocal({ tipo: "admin", id: "falso" });
    assert(await expired.api.obterUsuarioAtual() === null && expired.api.getUsuarioLocal() === null, "Cache autorizou sessão expirada");
    passed.push("Sessão ausente limpa perfil local");

    const admin = authFixture({ email: "admin@helpgo.com", admins: { ativo: true, email: "admin@helpgo.com" } });
    assert((await admin.api.fazerLogin("admin@helpgo.com", "senha")).tipo === "admin", "Admin perdeu acesso");
    assert(!admin.calls.includes("clientes") && !admin.calls.includes("prestador"), "Admin tratado como conta comum");
    passed.push("Admin ativo mantém acesso separado");

    for (const tipo of ["cliente", "prestador"]) {
        for (const session of [null, { user: { id: "nova-conta" } }]) {
            const handlers = {};
            const fields = {};
            let signup;
            const values = {
                nome: "Teste", telefone: "11999999999", cpf: "12345678900", cep: "01001000",
                cidade: "São Paulo", estado: "SP", bairro: "Centro", rua: "Rua A", endereco: "Rua A",
                numero: "1", email: "teste@example.com", senha: "123456", confirmarSenha: "123456",
                Csenha: "123456", cat_serv: "Eletricista", descricao: "Reparos"
            };
            const document = {
                addEventListener(event, callback) { callback(); },
                getElementById(id) {
                    return fields[id] ||= {
                        value: values[id] || "", textContent: "", className: "",
                        addEventListener(event, callback) { handlers[id + ":" + event] = callback; },
                        reset() {}, focus() {}
                    };
                }
            };
            const client = {
                auth: { signUp: async data => { signup = data; return { data: { user: { id: "nova-conta" }, session } }; } },
                from() { throw new Error("Cadastro novo tentou gravar tabelas pelo navegador"); }
            };
            new Function("document", "supabaseClient", "AuthService", "setTimeout", "console",
                sources["js/auth/cadastro-" + tipo + ".js"])(
                document, client, { perfisSeparadosAtivos: async () => true }, () => {}, silentConsole
            );
            const form = tipo === "cliente" ? "formCadastroCliente" : "formCadastroPrestador";
            await handlers[form + ":submit"]({ preventDefault() {} });
            const meta = signup?.options.data;
            assert(meta?.tipo === tipo && meta.cadastro_helpgo === "2" && meta.endereco === "Rua A", "Metadados incompletos");
            assert(!("senha" in meta) && !("password" in meta), "Senha nos metadados");
            assert(fields.mensagem.textContent.includes(session ? "sucesso" : "Confirme"), "Cadastro não concluído");
        }
        passed.push("Cadastro " + tipo + " envia dados ao trigger com e sem sessão");
    }
    return passed;
}
