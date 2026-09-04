// =======================================================
// HELPGO - CADASTRO DE PRESTADOR DE SERVIÇOS (PHP + SQLite)
// Salva prestador real no banco de dados
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

        exibirMensagem("Criando sua conta de prestador no banco de dados...", "sucesso");

        try {
            const usuario = await AuthService.fazerCadastroPrestador({
                nome,
                telefone,
                cpf,
                cep,
                endereco,
                numero,
                cidade,
                estado,
                categoria,
                descricao,
                email,
                senha
            });

            exibirMensagem("Conta criada com sucesso! Redirecionando para seu painel...", "sucesso");

            setTimeout(() => {
                if (usuario.email && usuario.email.toLowerCase() === "testenedfor@gmail.com") {
                    window.location.href = "./admin.html";
                } else {
                    window.location.href = "./tela-prestador.html";
                }
            }, 1000);

        } catch (err) {
            console.error("[CadastroPrestador] Erro:", err);
            exibirMensagem(err.message || "Erro ao criar conta de prestador.", "erro");
        }
    });
});
