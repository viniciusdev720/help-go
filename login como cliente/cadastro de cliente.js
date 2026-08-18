// ============================================
// FORMULÁRIO
// ============================================

const form = document.getElementById("formCadastroCliente");

const mensagem = document.getElementById("mensagem");


// ============================================
// BUSCAR ENDEREÇO PELO CEP
// ============================================

document.getElementById("cep").addEventListener("blur", async function () {

    const cep = this.value.replace(/\D/g, "");

    // Verifica se possui 8 números
    if (cep.length !== 8) {

        alert("Digite um CEP válido.");

        return;
    }

    try {

        const resposta = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        const dados = await resposta.json();


        // CEP não encontrado

        if (dados.erro) {

            alert("CEP não encontrado.");

            document.getElementById("cidade").value = "";
            document.getElementById("estado").value = "";
            document.getElementById("bairro").value = "";
            document.getElementById("rua").value = "";

            return;
        }


        // Preencher endereço

        document.getElementById("cidade").value =
            dados.localidade || "";

        document.getElementById("estado").value =
            dados.uf || "";

        document.getElementById("bairro").value =
            dados.bairro || "";

        document.getElementById("rua").value =
            dados.logradouro || "";


    } catch (erro) {

        console.error(erro);

        alert("Erro ao consultar o CEP.");

    }

});


// ============================================
// CADASTRO DO CLIENTE
// ============================================

form.addEventListener("submit", async function (event) {

    // Impede o HTML de enviar para PHP
    event.preventDefault();


    mensagem.textContent = "Realizando cadastro...";


    // ========================================
    // PEGAR DADOS DO FORMULÁRIO
    // ========================================

    const nome =
        document.getElementById("nome").value.trim();

    const telefone =
        document.getElementById("telefone").value.trim();

    const cpf =
        document.getElementById("cpf").value.trim();

    const cep =
        document.getElementById("cep").value.trim();

    const cidade =
        document.getElementById("cidade").value.trim();

    const estado =
        document.getElementById("estado").value.trim();

    const bairro =
        document.getElementById("bairro").value.trim();

    const rua =
        document.getElementById("rua").value.trim();

    const numero =
        document.getElementById("numero").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("senha").value;

    const confirmarSenha =
        document.getElementById("confirmarSenha").value;


    // ========================================
    // VERIFICAR SENHAS
    // ========================================

    if (senha !== confirmarSenha) {

        mensagem.textContent =
            "As senhas não são iguais.";

        return;
    }


    // ========================================
    // CADASTRAR NO SUPABASE AUTH
    // ========================================

    const { data, error } =
        await supabaseClient.auth.signUp({

            email: email,

            password: senha,

            options: {

                data: {

                    nome: nome,

                    telefone: telefone,

                    cpf: cpf,

                    tipo: "cliente"

                }

            }

        });


    // ========================================
    // VERIFICAR ERRO NO AUTH
    // ========================================

    if (error) {

        console.error(error);

        mensagem.textContent =
            "Erro ao realizar cadastro: " +
            error.message;

        return;
    }


    // ========================================
    // VERIFICAR USUÁRIO
    // ========================================

    const usuario = data.user;


    if (!usuario) {

        mensagem.textContent =
            "Não foi possível criar o usuário.";

        return;
    }


    // ========================================
    // CADASTRAR ENDEREÇO
    // ========================================

    const { error: erroEndereco } =
        await supabaseClient
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


    // ========================================
    // VERIFICAR ERRO NO ENDEREÇO
    // ========================================

    if (erroEndereco) {

        console.error(erroEndereco);

        mensagem.textContent =
            "O usuário foi criado, mas ocorreu um erro ao salvar o endereço.";

        return;
    }


    // ========================================
    // CADASTRO CONCLUÍDO
    // ========================================

    mensagem.textContent =
        "Cadastro realizado com sucesso!";


    // Limpar formulário

    form.reset();

});
const SUPABASE_URL = "https://oqfyfnsilmmzcbmapewe.supabase.co";

const SUPABASE_KEY = "sb_publishable_mUJ1JgffI1pgtzZckF4kkw_968BuDfV";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);