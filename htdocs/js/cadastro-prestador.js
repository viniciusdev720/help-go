// ==========================================
// HELPGo
// CADASTRO DE PRESTADOR DE SERVIÇO
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formCadastroPrestador");
    const mensagem = document.getElementById("mensagem");
    const cepInput = document.getElementById("cep");


    // ==========================================
    // MOSTRAR MENSAGEM
    // ==========================================

    function exibirMensagem(texto, tipo = "") {

        if (!mensagem) return;

        mensagem.textContent = texto;
        mensagem.className = "mensagem " + tipo;
    }


    // ==========================================
    // BUSCAR CEP
    // ==========================================

    if (cepInput) {

        cepInput.addEventListener("blur", async () => {

            const cep = cepInput.value.replace(/\D/g, "");

            if (cep.length !== 8) {

                if (cep.length > 0) {
                    exibirMensagem(
                        "Digite um CEP válido com 8 números.",
                        "erro"
                    );
                }

                return;
            }

            try {

                const resposta = await fetch(
                    `https://viacep.com.br/ws/${cep}/json/`
                );

                if (!resposta.ok) {
                    throw new Error("Erro ao consultar o ViaCEP.");
                }

                const dados = await resposta.json();

                if (dados.erro) {

                    exibirMensagem(
                        "CEP não encontrado.",
                        "erro"
                    );

                    document.getElementById("endereco").value = "";
                    document.getElementById("cidade").value = "";
                    document.getElementById("estado").value = "";

                    return;
                }


                // Preencher endereço

                document.getElementById("endereco").value =
                    dados.logradouro || "";

                document.getElementById("cidade").value =
                    dados.localidade || "";

                document.getElementById("estado").value =
                    dados.uf || "";


                // Ir para número

                document.getElementById("numero").focus();


            } catch (erro) {

                console.error("Erro no ViaCEP:", erro);

                exibirMensagem(
                    "Não foi possível consultar o CEP.",
                    "erro"
                );
            }
        });
    }


    // ==========================================
    // CADASTRO
    // ==========================================

    if (!form) {

        console.error(
            "Formulário #formCadastroPrestador não encontrado."
        );

        return;
    }


    form.addEventListener("submit", async (event) => {

        event.preventDefault();


        // ==========================================
        // PEGAR DADOS DO FORMULÁRIO
        // ==========================================

        const nome =
            document.getElementById("nome").value.trim();

        const telefone =
            document.getElementById("telefone").value.trim();

        const cpf =
            document.getElementById("cpf").value.trim();

        const cep =
            document.getElementById("cep").value
                .replace(/\D/g, "");

        const endereco =
            document.getElementById("endereco").value.trim();

        const numero =
            document.getElementById("numero").value.trim();

        const cidade =
            document.getElementById("cidade").value.trim();

        const estado =
            document.getElementById("estado").value;

        const categoria =
            document.getElementById("cat_serv").value;

        const descricao =
            document.getElementById("descricao").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const senha =
            document.getElementById("senha").value;

        const confirmarSenha =
            document.getElementById("Csenha").value;


        // ==========================================
        // VALIDAÇÕES
        // ==========================================

        if (
            !nome ||
            !telefone ||
            !cpf ||
            !cep ||
            !endereco ||
            !numero ||
            !cidade ||
            !estado ||
            !categoria ||
            !email ||
            !senha ||
            !confirmarSenha
        ) {

            exibirMensagem(
                "Preencha todos os campos obrigatórios.",
                "erro"
            );

            return;
        }


        if (cep.length !== 8) {

            exibirMensagem(
                "Digite um CEP válido.",
                "erro"
            );

            return;
        }


        if (senha !== confirmarSenha) {

            exibirMensagem(
                "As senhas não coincidem.",
                "erro"
            );

            return;
        }


        if (senha.length < 6) {

            exibirMensagem(
                "A senha precisa ter pelo menos 6 caracteres.",
                "erro"
            );

            return;
        }


        // ==========================================
        // VERIFICAR SUPABASE
        // ==========================================

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            exibirMensagem(
                "Erro: conexão com o Supabase não encontrada.",
                "erro"
            );

            console.error(
                "supabaseClient não existe."
            );

            return;
        }


        try {

            // ==========================================
            // 1. CRIAR CONTA NO SUPABASE AUTH
            // ==========================================

            exibirMensagem(
                "Criando sua conta...",
                "sucesso"
            );


            const {
                data: authData,
                error: authError
            } = await supabaseClient.auth.signUp({

                email: email,

                password: senha
            });


            if (authError) {

                console.error(
                    "Erro no Supabase Auth:",
                    authError
                );

                exibirMensagem(
                    "Erro ao criar conta: " +
                    authError.message,
                    "erro"
                );

                return;
            }


            const usuario = authData.user;


            if (!usuario) {

                exibirMensagem(
                    "Não foi possível criar o usuário.",
                    "erro"
                );

                return;
            }


            console.log(
                "Usuário Auth criado:",
                usuario.id
            );


            // ==========================================
            // 2. SALVAR NA TABELA usuarios
            // ==========================================

            exibirMensagem(
                "Salvando seus dados...",
                "sucesso"
            );


            const {
                error: erroUsuario
            } = await supabaseClient
                .from("usuarios")
                .insert({

                    id: usuario.id,

                    nome: nome,

                    email: email,

                    telefone: telefone,

                    cpf: cpf,

                    tipo: "prestador"
                });


            if (erroUsuario) {

                console.error(
                    "Erro na tabela usuarios:",
                    erroUsuario
                );

                exibirMensagem(
                    "Erro ao salvar usuário: " +
                    erroUsuario.message,
                    "erro"
                );

                return;
            }


            console.log(
                "Usuário salvo em usuarios."
            );


            // ==========================================
            // 3. SALVAR NA TABELA prestadores
            // ==========================================

            exibirMensagem(
                "Criando seu perfil de prestador...",
                "sucesso"
            );


            const {
                error: erroPrestador
            } = await supabaseClient
                .from("prestadores")
                .insert({

                    id: usuario.id,

                    descricao: descricao,

                    avaliacao: 0,

                    total_avaliacoes: 0,

                    ativo: true
                });


            if (erroPrestador) {

                console.error(
                    "Erro na tabela prestadores:",
                    erroPrestador
                );

                exibirMensagem(
                    "Erro ao salvar prestador: " +
                    erroPrestador.message,
                    "erro"
                );

                return;
            }


            console.log(
                "Prestador salvo em prestadores."
            );


            // ==========================================
            // 4. SALVAR ENDEREÇO
            // ==========================================

            exibirMensagem(
                "Salvando seu endereço...",
                "sucesso"
            );


            const {
                error: erroEndereco
            } = await supabaseClient
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

                console.error(
                    "Erro na tabela enderecos:",
                    erroEndereco
                );

                exibirMensagem(
                    "Erro ao salvar endereço: " +
                    erroEndereco.message,
                    "erro"
                );

                return;
            }


            console.log(
                "Endereço salvo em enderecos."
            );


            // ==========================================
            // 5. PROCURAR O SERVIÇO PELO NOME
            // ==========================================

            exibirMensagem(
                "Registrando seu serviço...",
                "sucesso"
            );


            const {
                data: servico,
                error: erroBuscaServico
            } = await supabaseClient
                .from("servicos")
                .select("id")
                .eq("nome", categoria)
                .maybeSingle();


            if (erroBuscaServico) {

                console.error(
                    "Erro ao procurar serviço:",
                    erroBuscaServico
                );

                exibirMensagem(
                    "Erro ao encontrar categoria de serviço: " +
                    erroBuscaServico.message,
                    "erro"
                );

                return;
            }


            if (!servico) {

                console.error(
                    "Serviço não encontrado:",
                    categoria
                );

                exibirMensagem(
                    "A categoria '" +
                    categoria +
                    "' não existe na tabela serviços.",
                    "erro"
                );

                return;
            }


            console.log(
                "Serviço encontrado:",
                servico
            );


            // ==========================================
            // 6. RELACIONAR PRESTADOR + SERVIÇO
            // ==========================================

            const {
                error: erroPrestadorServico
            } = await supabaseClient
                .from("prestador_servicos")
                .insert({

                    prestador_id: usuario.id,

                    servico_id: servico.id,

                    experiencia: descricao
                });


            if (erroPrestadorServico) {

                console.error(
                    "Erro em prestador_servicos:",
                    erroPrestadorServico
                );

                exibirMensagem(
                    "Erro ao registrar serviço: " +
                    erroPrestadorServico.message,
                    "erro"
                );

                return;
            }


            console.log(
                "Prestador relacionado ao serviço."
            );


            // ==========================================
            // CADASTRO FINALIZADO
            // ==========================================

            exibirMensagem(
                "Cadastro realizado com sucesso!",
                "sucesso"
            );


            console.log(
                "================================="
            );

            console.log(
                "CADASTRO COMPLETO!"
            );

            console.log(
                "ID:",
                usuario.id
            );

            console.log(
                "Categoria:",
                categoria
            );

            console.log(
                "================================="
            );


            form.reset();


            // ==========================================
            // REDIRECIONAR
            // ==========================================

            setTimeout(() => {

                window.location.href =
                    "./login.html";

            }, 2000);


        } catch (erro) {

            console.error(
                "ERRO GERAL:",
                erro
            );

            exibirMensagem(
                "Ocorreu um erro inesperado: " +
                erro.message,
                "erro"
            );
        }

    });

});