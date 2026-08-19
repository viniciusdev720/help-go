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

            // Identificação do Tipo de Usuário (Cliente ou Prestador)
            const user = data.user;
            let tipoUsuario = user?.user_metadata?.tipo || null;
            let nomeUsuario = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

            // 1. Caso não esteja no user_metadata, busca na tabela 'usuarios'
            if (!tipoUsuario && user?.id) {
                try {
                    const { data: usuarioDb } = await supabaseClient
                        .from("usuarios")
                        .select("tipo, nome")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (usuarioDb) {
                        if (usuarioDb.tipo) tipoUsuario = usuarioDb.tipo;
                        if (usuarioDb.nome) nomeUsuario = usuarioDb.nome;
                    }
                } catch (e) {
                    console.warn("Aviso ao buscar tabela usuarios:", e);
                }
            }

            // 2. Se ainda não identificado, verifica se existe na tabela 'prestadores'
            if (!tipoUsuario && user?.id) {
                try {
                    const { data: prestadorDb } = await supabaseClient
                        .from("prestadores")
                        .select("id")
                        .eq("id", user.id)
                        .maybeSingle();

                    if (prestadorDb) {
                        tipoUsuario = "prestador";
                    }
                } catch (e) {
                    console.warn("Aviso ao buscar tabela prestadores:", e);
                }
            }

            // Padrão: caso não encontre nenhuma marcação, assume 'cliente'
            if (!tipoUsuario) {
                tipoUsuario = "cliente";
            }

            // Salva dados no localStorage para facilitar exibição nas telas
            localStorage.setItem("helpgo_user", JSON.stringify({
                id: user.id,
                email: user.email,
                nome: nomeUsuario,
                tipo: tipoUsuario
            }));

            exibirMensagem("Login realizado com sucesso! Redirecionando...", "sucesso");

            // Redirecionamento condicional com IF
            setTimeout(() => {
                if (tipoUsuario === "prestador") {
                    window.location.href = "./tela-prestador.html";
                } else {
                    window.location.href = "./tela-cliente.html";
                }
            }, 1200);

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
