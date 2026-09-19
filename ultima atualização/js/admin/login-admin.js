// =======================================================
// HELPGO - LOGIN ADMINISTRATIVO
// Usa AuthService para autenticar e verificar tipo admin.
// =======================================================

document.addEventListener("DOMContentLoaded", async function () {
    const form = document.getElementById("formLoginAdmin");
    const mensagem = document.getElementById("mensagem");
    const btnSubmit = document.getElementById("btnLoginAdmin");

    // Se já estiver logado como admin, redireciona direto
    if (typeof Guard !== "undefined") {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const usuario = await AuthService.obterUsuarioAtual();
                if (usuario && usuario.tipo === "admin") {
                    window.location.href = "./admin.html";
                    return;
                }
            }
        } catch (e) {
            // Silencioso — usuário não está logado
        }
    }

    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        if (!email || !senha) {
            exibirMensagem("Preencha todos os campos.", "erro");
            return;
        }

        if (typeof supabaseClient === "undefined" || !supabaseClient) {
            exibirMensagem("Erro de conexão com o banco de dados.", "erro");
            return;
        }

        setCarregando(true);
        exibirMensagem("Verificando credenciais...", "sucesso");

        try {
            // Usa AuthService que já verifica o tipo via banco (tabela admins)
            const usuario = await AuthService.fazerLogin(email, senha);

            if (usuario.tipo !== "admin") {
                // Não é admin — encerra sessão e avisa
                await supabaseClient.auth.signOut();
                AuthService.removerUsuarioLocal();
                setCarregando(false);
                exibirMensagem("Esta conta não possui acesso administrativo.", "erro");
                return;
            }

            exibirMensagem("Acesso autorizado! Redirecionando...", "sucesso");

            setTimeout(() => {
                window.location.href = "./admin.html";
            }, 700);

        } catch (error) {
            console.error("[LoginAdmin] Erro:", error);
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
        btnSubmit.textContent = ativo ? "Entrando..." : "Entrar";
    }
});