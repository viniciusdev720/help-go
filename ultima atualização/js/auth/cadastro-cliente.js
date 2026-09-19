// =======================================================
// HELPGO - CADASTRO DE CLIENTE
// =======================================================

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formCadastroCliente");
    const mensagem = document.getElementById("mensagem");
    const cepInput = document.getElementById("cep");

    function exibirMensagem(texto, tipo) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + (tipo || "");
    }

    // Consulta de CEP (ViaCEP)
    if (cepInput) {
        cepInput.addEventListener("blur", async function () {
            const cep = this.value.replace(/\D/g, "");

            if (cep.length !== 8) {
                if (cep.length > 0) {
                    exibirMensagem("Digite um CEP válido com 8 dígitos.", "erro");
                }
                return;
            }

            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const dados = await resposta.json();

                if (dados.erro) {
                    exibirMensagem("CEP não encontrado.", "erro");
                    document.getElementById("cidade").value = "";
                    document.getElementById("estado").value = "";
                    document.getElementById("bairro").value = "";
                    document.getElementById("rua").value = "";
                    return;
                }

                document.getElementById("cidade").value = dados.localidade || "";
                document.getElementById("estado").value = dados.uf || "";
                document.getElementById("bairro").value = dados.bairro || "";
                document.getElementById("rua").value = dados.logradouro || "";

                const numeroInput = document.getElementById("numero");
                if (numeroInput) numeroInput.focus();

            } catch (erro) {
                console.error("[CadastroCliente] Erro no ViaCEP:", erro);
                exibirMensagem("Erro ao consultar o CEP. Verifique sua conexão.", "erro");
            }
        });
    }

    // Submit do Formulário
    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const nome = document.getElementById("nome").value.trim();
            const telefone = document.getElementById("telefone").value.trim();
            const cpf = document.getElementById("cpf").value.trim();
            const cep = document.getElementById("cep").value.replace(/\D/g, "");
            const cidade = document.getElementById("cidade").value.trim();
            const estado = document.getElementById("estado").value.trim();
            const bairro = document.getElementById("bairro").value.trim();
            const rua = document.getElementById("rua").value.trim();
            const numero = document.getElementById("numero").value.trim();
            const email = document.getElementById("email").value.trim();
            const senha = document.getElementById("senha").value;
            const confirmarSenha = document.getElementById("confirmarSenha").value;

            if (!nome || !telefone || !cpf || !cep || !cidade || !estado || !bairro || !rua || !numero || !email || !senha) {
                exibirMensagem("Por favor, preencha todos os campos.", "erro");
                return;
            }

            if (senha !== confirmarSenha) {
                exibirMensagem("As senhas não coincidem.", "erro");
                return;
            }

            if (senha.length < 6) {
                exibirMensagem("A senha deve ter pelo menos 6 caracteres.", "erro");
                return;
            }

            if (!supabaseClient) {
                exibirMensagem("Erro ao conectar com o serviço de cadastro.", "erro");
                return;
            }

            exibirMensagem("Criando sua conta...", "sucesso");

            try {
                const perfisSeparados = await AuthService.perfisSeparadosAtivos();
                // 1. Cadastrar usuário no Supabase Auth
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        data: {
                            nome: nome,
                            telefone: telefone,
                            cpf: cpf,
                            tipo: "cliente",
                            cadastro_helpgo: perfisSeparados ? "2" : "1",
                            cep, cidade, estado, bairro, endereco: rua, numero
                        }
                    }
                });

                if (error) {
                    console.error("[CadastroCliente] Erro Supabase Auth:", error);
                    exibirMensagem("Erro ao criar conta: " + error.message, "erro");
                    return;
                }

                const usuario = data.user;
                if (!usuario) {
                    exibirMensagem("Não foi possível criar o usuário.", "erro");
                    return;
                }

                // Compatibilidade até a instalação da migração separar-perfis.sql.
                // Na versão 2, o banco grava perfil e endereço junto com o Auth.
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
                                tipo: "cliente"
                            });
                        if (error) throw error;
                    } catch (e) {
                        throw new Error("Não foi possível salvar seu perfil. Tente novamente.");
                    }

                    // 3. Salvar na tabela enderecos
                    try {
                        const { error } = await supabaseClient
                            .from("enderecos")
                            .insert({
                                usuario_id: usuario.id,
                                cep: cep,
                                estado: estado,
                                cidade: cidade,
                                bairro: bairro,
                                rua: rua,
                                numero: numero
                            });
                        if (error) throw error;
                    } catch (e) {
                        throw new Error("Não foi possível salvar seu endereço. Tente novamente.");
                    }

                }

                // Informar o resultado do cadastro.
                exibirMensagem(
                    data.session
                        ? "Cadastro realizado com sucesso! Redirecionando..."
                        : "Conta criada. Confirme o e-mail antes de entrar.",
                    "sucesso"
                );
                form.reset();

                setTimeout(() => {
                    window.location.href = "./login.html";
                }, 1500);

            } catch (err) {
                console.error("[CadastroCliente] Erro geral:", err);
                exibirMensagem("Ocorreu um erro ao processar o cadastro.", "erro");
            }
        });
    }
});
