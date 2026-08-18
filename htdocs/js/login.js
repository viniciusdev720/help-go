// ==========================================
// LOGIN - HELPGo
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const formLogin = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagem");

    if (!formLogin) return;

    formLogin.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        if (!email || !senha) {
            exibirMensagem("Por favor, preencha todos os campos.", "erro");
            return;
        }

        if (!supabaseClient) {
            exibirMensagem("Erro ao conectar com o servidor.", "erro");
            return;
        }

        exibirMensagem("Entrando...", "sucesso");

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha,
            });

            if (error) {
                console.error("Erro no login:", error);
                if (error.message.includes("Invalid login credentials")) {
                    exibirMensagem("E-mail ou senha incorretos.", "erro");
                } else if (error.message.includes("Email not confirmed")) {
                    exibirMensagem("Por favor, confirme seu e-mail antes de entrar.", "erro");
                } else {
                    exibirMensagem("Erro ao fazer login: " + error.message, "erro");
                }
                return;
            }

            exibirMensagem("Login realizado com sucesso! Redirecionando...", "sucesso");

            setTimeout(() => {
                window.location.href = "../index.html";
            }, 1500);

        } catch (err) {
            console.error("Erro inesperado:", err);
            exibirMensagem("Ocorreu um erro ao processar seu login.", "erro");
        }
    });

    function exibirMensagem(texto, tipo) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + tipo;
    }
});
