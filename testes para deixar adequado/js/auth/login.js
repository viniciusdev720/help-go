// =======================================================
// HELPGO - CONTROLADOR DA TELA DE LOGIN (PHP + SQLite)
// =======================================================

document.addEventListener("DOMContentLoaded", async function () {
    const formLogin = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagem");

    // 1. Se o usuário já estiver autenticado, redireciona para o painel correspondente
    if (typeof Guard !== "undefined") {
        await Guard.redirectIfAuthenticated();
    }

    // 2. Verificar parâmetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("expired")) {
        exibirMensagem("Sua sessão expirou. Faça login novamente para continuar.", "erro");
    } else if (urlParams.has("logout")) {
        exibirMensagem("Você saiu da sua conta com sucesso.", "sucesso");
    } else if (urlParams.get("msg") === "unauthorized") {
        exibirMensagem("Você não tem permissão para acessar aquela página com seu perfil.", "erro");
    }

    if (!formLogin) return;

    // 3. Submissão do Formulário de Login
    formLogin.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        if (!email || !senha) {
            exibirMensagem("Por favor, preencha todos os campos.", "erro");
            return;
        }

        exibirMensagem("Autenticando...", "sucesso");

        try {
            const usuario = await AuthService.fazerLogin(email, senha);

            exibirMensagem("Login realizado com sucesso! Redirecionando...", "sucesso");

            setTimeout(() => {
                if (usuario.email && usuario.email.toLowerCase() === "testenedfor@gmail.com") {
                    window.location.href = "./admin.html";
                } else if (usuario.tipo === "prestador") {
                    window.location.href = "./tela-prestador.html";
                } else {
                    window.location.href = "./tela-cliente.html";
                }
            }, 800);

        } catch (error) {
            console.error("[Login] Erro:", error);
            exibirMensagem(error.message || "E-mail ou senha incorretos.", "erro");
        }
    });

    function exibirMensagem(texto, tipo) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + tipo;
    }
});
