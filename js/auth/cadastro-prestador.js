// =======================================================
// HELPGO - CADASTRO DE PRESTADOR DE SERVIÇOS
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formCadastroPrestador");
    const mensagem = document.getElementById("mensagem");
    const cepInput = document.getElementById("cep");

    function exibirMensagem(texto, tipo = "") {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + tipo;
    }

    // Consulta de CEP (ViaCEP)
    if (cepInput) {
        cepInput.addEventListener("blur", async () => {
            const cep = cepInput.value.replace(/\D/g, "");

            if (cep.length !== 8) {
                if (cep.length > 0) {
                    exibirMensagem("Digite um CEP válido com 8 números.", "erro");
                }
                return;
            }

            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!resposta.ok) throw new Error("Erro ao consultar ViaCEP.");
                const dados = await resposta.json();

                if (dados.erro) {
                    exibirMensagem("CEP não encontrado.", "erro");
                    document.getElementById("endereco").value = "";
                    document.getElementById("cidade").value = "";
                    document.getElementById("estado").value = "";
                    return;
                }

                document.getElementById("endereco").value = dados.logradouro || "";
                document.getElementById("cidade").value = dados.localidade || "";
                document.getElementById("estado").value = dados.uf || "";
                document.getElementById("numero").focus();

            } catch (erro) {
                console.error("[CadastroPrestador] Erro no ViaCEP:", erro);
                exibirMensagem("Não foi possível consultar o CEP.", "erro");
            }
        });
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const cpf = document.getElementById("cpf").value.trim();
        const cep = document.getElementById("cep").value.replace(/\D/g, "");
        const endereco = document.getElementById("endereco").value.trim();
        const numero = document.getElementById("numero").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const estado = document.getElementById("estado").value;
        const categoria = document.getElementById("cat_serv").value;
        const descricao = document.getElementById("descricao").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("Csenha").value;

        if (!nome || !telefone || !cpf || !cep || !endereco || !numero || !cidade || !estado || !categoria || !email || !senha || !confirmarSenha) {
            exibirMensagem("Preencha todos os campos obrigatórios.", "erro");
            return;
        }

        if (cep.length !== 8) {
            exibirMensagem("Digite um CEP válido.", "erro");
            return;
        }

        if (senha !== confirmarSenha) {
            exibirMensagem("As senhas não coincidem.", "erro");
            return;
        }

        if (senha.length < 6) {
            exibirMensagem("A senha precisa ter pelo menos 6 caracteres.", "erro");
            return;
        }

        if (typeof supabaseClient === "undefined" || !supabaseClient) {
            exibirMensagem("Erro: conexão com o banco de dados não encontrada.", "erro");
            return;
        }

        try {
            exibirMensagem("Criando sua conta de prestador...", "sucesso");
            const perfisSeparados = await AuthService.perfisSeparadosAtivos();

            // 1. Criar conta no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome: nome,
                        telefone: telefone,
                        cpf: cpf,
                        tipo: "prestador",
                        cadastro_helpgo: perfisSeparados ? "2" : "1",
                        categoria: categoria,
                        descricao: descricao,
                        cep: cep,
                        endereco: endereco,
                        numero: numero,
                        cidade: cidade,
                        estado: estado
                    }
                }
            });

            if (authError) {
                console.error("[CadastroPrestador] Erro no Auth:", authError);
                exibirMensagem("Erro ao criar conta: " + authError.message, "erro");
                return;
            }

            const usuario = authData.user;
            if (!usuario) {
                exibirMensagem("Não foi possível criar o usuário.", "erro");
                return;
            }

            // A versão 2 grava perfil, endereço e serviço na transação do Auth.
            // Compatibilidade até a instalação de separar-perfis.sql.
            if (!perfisSeparados) {
                // 2. Salvar na tabela usuarios
                try {
                    const { error } = await supabaseClient
                        .from("usuarios")
                        .insert({
                            id: usuario.id,
                            nome: nome,
                            email: email,
                            telefone: telefone,
                            cpf: cpf,
                            tipo: "prestador"
                        });
                    if (error) throw error;
                } catch (e) {
                    console.warn("[CadastroPrestador] Aviso ao salvar usuarios:", e);
                    throw e;
                }

                // 3. Salvar na tabela prestadores
                try {
                    const { error } = await supabaseClient
                        .from("prestadores")
                        .insert({
                            id: usuario.id,
                            bio: descricao || null,
                            descricao: descricao || null,
                            ativo: true
                        });
                    if (error) throw error;
                } catch (e) {
                    console.warn("[CadastroPrestador] Aviso ao salvar prestadores:", e);
                    throw e;
                }

                // 4. Salvar na tabela enderecos
                try {
                    const { error } = await supabaseClient
                        .from("enderecos")
                        .insert({
                            usuario_id: usuario.id,
                            cep: cep,
                            estado: estado,
                            cidade: cidade,
                            rua: endereco,
                            numero: numero
                        });
                    if (error) throw error;
                } catch (e) {
                    console.warn("[CadastroPrestador] Aviso ao salvar enderecos:", e);
                    throw e;
                }

                // 5. Vincular serviço na tabela prestador_servicos
                try {
                    // Tenta encontrar o serviço cadastrado no banco
                    const { data: servico } = await supabaseClient
                        .from("servicos")
                        .select("id")
                        .ilike("nome", `%${categoria}%`)
                        .maybeSingle();

                    if (!servico?.id) {
                        throw new Error("A categoria escolhida ainda não está disponível. Escolha outra categoria.");
                    }

                    const { error } = await supabaseClient
                        .from("prestador_servicos")
                        .insert({
                            prestador_id: usuario.id,
                            servico_id: servico.id
                        });
                    if (error) throw error;
                } catch (e) {
                    console.warn("[CadastroPrestador] Aviso ao vincular servico:", e);
                    throw e;
                }

            }

            // Informar o resultado do cadastro.
            exibirMensagem(
                authData.session
                    ? "Cadastro realizado com sucesso! Redirecionando..."
                    : "Conta criada. Confirme o e-mail antes de entrar.",
                "sucesso"
            );
            form.reset();

            setTimeout(() => {
                window.location.href = "./login.html";
            }, 1500);

        } catch (erro) {
            console.error("[CadastroPrestador] Erro inesperado:", erro);
            exibirMensagem("Ocorreu um erro: " + erro.message, "erro");
        }
    });
});
