// =======================================================
// HELPGO - CONTROLADOR DA TELA DE LOGIN
// =======================================================

document.addEventListener("DOMContentLoaded", async function () {
    const formLogin = document.getElementById("formLogin");
    const mensagem = document.getElementById("mensagem");

    // 1. Se o usuário já estiver autenticado, redireciona automaticamente para o dashboard
    if (typeof Guard !== "undefined") {
        await Guard.redirectIfAuthenticated();
    }

    // 2. Verificar parâmetros de URL para exibir avisos de sessão expirada / logout
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

        if (typeof supabaseClient === "undefined" || !supabaseClient) {
            exibirMensagem("Erro de conexão com o banco de dados.", "erro");
            return;
        }

        exibirMensagem("Entrando...", "sucesso");

        try {
            const usuario = await AuthService.fazerLogin(email, senha);

            exibirMensagem("Login realizado com sucesso! Redirecionando...", "sucesso");

            setTimeout(() => {
                if (usuario.tipo === "prestador") {
                    window.location.href = "./tela-prestador.html";
                } else {
                    window.location.href = "./tela-cliente.html";
                }
            }, 800);

        } catch (error) {
            console.error("[Login] Erro:", error);
            if (error.message && error.message.includes("Invalid login credentials")) {
                exibirMensagem("E-mail ou senha incorretos.", "erro");
            } else if (error.message && error.message.includes("Email not confirmed")) {
                exibirMensagem("Por favor, confirme seu e-mail antes de entrar.", "erro");
            } else {
                exibirMensagem("Erro ao fazer login: " + (error.message || "Tente novamente."), "erro");
            }
        }
    });

    function exibirMensagem(texto, tipo) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.className = "mensagem " + tipo;
    }
});
