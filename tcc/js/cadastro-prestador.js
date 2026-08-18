// ==========================================
// CADASTRO DE PRESTADOR DE SERVIÇO - HELPGo
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formCadastroPrestador");
    const mensagem = document.getElementById("mensagem");
    const cepInput = document.getElementById("cep");

    function exibirMensagem(texto, tipo) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + (tipo || "");
    }

    // ==========================================
    // BUSCAR ENDEREÇO PELO CEP (ViaCEP)
    // ==========================================
    if (cepInput) {
        cepInput.addEventListener("blur", async function () {
            const cep = this.value.replace(/\D/g, "");

            if (cep.length !== 8) {
                if (cep.length > 0) {
                    alert("Digite um CEP válido com 8 dígitos.");
                }
                return;
            }

            try {
                const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const dados = await resposta.json();

                if (dados.erro) {
                    alert("CEP não encontrado.");
                    document.getElementById("cidade").value = "";
                    document.getElementById("estado").value = "";
                    document.getElementById("endereco").value = "";
                    return;
                }

                document.getElementById("cidade").value = dados.localidade || "";
                document.getElementById("estado").value = dados.uf || "";
                document.getElementById("endereco").value = dados.logradouro ? `${dados.logradouro}, ${dados.bairro || ""}` : "";

                const numeroInput = document.getElementById("numero");
                if (numeroInput) numeroInput.focus();

            } catch (erro) {
                console.error("Erro no ViaCEP:", erro);
                alert("Erro ao consultar o CEP. Verifique sua conexão.");
            }
        });
    }

    // ==========================================
    // SUBMIT DO FORMULÁRIO
    // ==========================================
    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            exibirMensagem("Realizando cadastro...", "sucesso");

            const nome = document.getElementById("nome").value.trim();
            const telefone = document.getElementById("telefone").value.trim();
            const cpf = document.getElementById("cpf").value.trim();
            const cep = document.getElementById("cep").value.replace(/\D/g, "");
            const cidade = document.getElementById("cidade").value.trim();
            const estado = document.getElementById("estado").value;
            const endereco = document.getElementById("endereco").value.trim();
            const numero = document.getElementById("numero").value.trim();
            const categoria = document.getElementById("cat_serv").value;
            const descricao = document.getElementById("descricao").value.trim();
            const email = document.getElementById("email").value.trim();
            const senha = document.getElementById("senha").value;
            const confirmarSenha = document.getElementById("Csenha").value;

            // Validações
            if (!nome || !telefone || !cpf || !cep || !cidade || !estado || !endereco || !numero || !categoria || !email || !senha) {
                exibirMensagem("Por favor, preencha todos os campos obrigatórios.", "erro");
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

            exibirMensagem("Criando sua conta de prestador...", "sucesso");

            try {
                // Criar usuário no Supabase Auth com dados do prestador
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        data: {
                            nome: nome,
                            telefone: telefone,
                            cpf: cpf,
                            categoria_servico: categoria,
                            descricao: descricao,
                            tipo: "prestador"
                        }
                    }
                });

                if (error) {
                    console.error("Erro Supabase:", error);
                    exibirMensagem("Erro ao criar conta: " + error.message, "erro");
                    return;
                }

                const usuario = data.user;
                if (!usuario) {
                    exibirMensagem("Não foi possível criar o usuário.", "erro");
                    return;
                }

                // Salvar endereço na tabela enderecos
                exibirMensagem("Salvando endereço e dados...", "sucesso");

                const { error: erroEndereco } = await supabaseClient
                    .from("enderecos")
                    .insert({
                        usuario_id: usuario.id,
                        cep: cep,
                        estado: estado,
                        cidade: cidade,
                        rua: endereco,
                        numero: numero
                    });

                if (erroEndereco) {
                    console.warn("Aviso ao salvar endereço:", erroEndereco);
                }

                exibirMensagem("Cadastro de prestador realizado com sucesso! Redirecionando...", "sucesso");
                form.reset();

                setTimeout(() => {
                    window.location.href = "./login.html";
                }, 2000);

            } catch (err) {
                console.error("Erro geral no cadastro:", err);
                exibirMensagem("Ocorreu um erro ao processar o cadastro.", "erro");
            }
        });
    }
});
