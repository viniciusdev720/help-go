// =======================================================
// HELPGO - CONTROLADOR DA TELA DE LOGIN
// Redireciona automaticamente para: cliente | prestador | admin
// =======================================================

document.addEventListener("DOMContentLoaded", async function () {
    const formLogin = document.getElementById("formLogin");
    const mensagem  = document.getElementById("mensagem");
    const btnSubmit = document.getElementById("btnLogin");

    // 1. Se já estiver autenticado, redireciona automaticamente
    if (typeof Guard !== "undefined") {
        await Guard.redirectIfAuthenticated();
    }

    // 2. Verificar parâmetros de URL para exibir avisos
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("expired")) {
        exibirMensagem("Sua sessão expirou. Faça login novamente para continuar.", "erro");
    } else if (urlParams.has("logout")) {
        exibirMensagem("Você saiu da sua conta com sucesso.", "sucesso");
    } else if (urlParams.get("msg") === "unauthorized") {
        exibirMensagem("Você não tem permissão para acessar aquela página.", "erro");
    }

    if (!formLogin) return;

    // 3. Submissão do formulário de login
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

        setCarregando(true);
        exibirMensagem("Verificando credenciais...", "sucesso");

        try {
            // Faz login + identifica tipo no banco (cliente / prestador / admin)
            const usuario = await AuthService.fazerLogin(email, senha);

            // Atualizar status do prestador ao logar
            if (usuario.tipo === "prestador" && typeof PrestadoresService !== "undefined") {
                try {
                    await PrestadoresService.garantirPerfilPrestadorAtual();
                } catch (errStatus) {
                    console.warn("[Login] Aviso ao sincronizar perfil do prestador:", errStatus);
                }
            }

            exibirMensagem("Login realizado! Redirecionando...", "sucesso");

            // Redirecionamento baseado no email e tipo identificado
            setTimeout(() => {
                // Forçar redirecionamento do admin pelo email conforme solicitado
                switch (usuario.tipo) {
                    case "admin":
                        window.location.href = "./admin.html";
                        break;
                    case "prestador":
                        window.location.href = "./tela-prestador.html";
                        break;
                    default:
                        window.location.href = "./tela-cliente.html";
                }
            }, 700);

        } catch (error) {
            console.error("[Login] Erro:", error);
            setCarregando(false);

            if (error.message?.includes("Invalid login credentials")) {
                exibirMensagem("E-mail ou senha incorretos.", "erro");
            } else if (error.message?.includes("Email not confirmed")) {
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

    function setCarregando(ativo) {
        if (!btnSubmit) return;
        btnSubmit.disabled = ativo;
        btnSubmit.textContent = ativo ? "Entrando..." : "Fazer Login";
    }
});
