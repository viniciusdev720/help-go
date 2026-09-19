// Usa somente usuarios e Supabase Auth já existentes no projeto.
const PerfilService = (() => {
    async function usuarioAutenticado() {
        if (!supabaseClient) throw new Error("Conexão indisponível. Tente novamente.");
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data?.user) throw new Error("Sua sessão expirou. Entre novamente.");
        return data.user;
    }

    async function carregar() {
        const user = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from("usuarios")
            .select("id, nome, telefone, foto_url").eq("id", user.id).maybeSingle();
        if (error) throw new Error("Não foi possível carregar seu perfil. Tente novamente.");
        if (!data) throw new Error("Seu cadastro não foi encontrado. Entre em contato com o suporte.");
        return { ...data, email: user.email };
    }

    async function salvar({ nome, telefone, foto }) {
        nome = String(nome || "").trim().replace(/\s+/g, " ");
        telefone = String(telefone || "").trim();
        if (nome.length < 2 || nome.length > 100) throw new Error("Informe um nome entre 2 e 100 caracteres.");
        const digitos = telefone.replace(/\D/g, "");
        if (telefone && (!/^[+\d\s().-]+$/.test(telefone) || digitos.length < 10 || digitos.length > 15)) {
            throw new Error("Informe um telefone válido com DDD.");
        }
        const alteracoes = { nome, telefone };
        if (foto !== undefined) {
            if (foto !== "" && (typeof foto !== "string" || foto.length > 100000 ||
                !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(foto))) {
                throw new Error("Selecione uma foto válida usando o botão Alterar foto.");
            }
            alteracoes.foto_url = foto;
        }
        const user = await usuarioAutenticado();
        const { data, error } = await supabaseClient.from("usuarios")
            .update(alteracoes).eq("id", user.id)
            .select("id, nome, telefone, foto_url").maybeSingle();
        if (error || !data) throw new Error("Não foi possível salvar seu perfil. Verifique sua conexão e tente novamente.");

        const local = AuthService.getUsuarioLocal();
        if (local?.id === user.id) {
            AuthService.salvarUsuarioLocal({ ...local, nome: data.nome, telefone: data.telefone, fotoUrl: data.foto_url || "" });
        }
        return { ...data, email: user.email };
    }

    async function alterarSenha(senhaAtual, novaSenha, confirmacao) {
        if (!senhaAtual) throw new Error("Informe sua senha atual.");
        if (novaSenha.length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
        if (novaSenha !== confirmacao) throw new Error("A confirmação da nova senha não confere.");
        if (novaSenha === senhaAtual) throw new Error("Escolha uma senha diferente da atual.");
        const user = await usuarioAutenticado();
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: user.email, password: senhaAtual });
        if (error || data?.user?.id !== user.id) throw new Error("Não foi possível confirmar sua senha atual.");
        const resultado = await supabaseClient.auth.updateUser({ password: novaSenha });
        if (resultado.error) {
            if (resultado.error.code === "weak_password") throw new Error("Escolha uma senha mais forte, com letras, números e símbolos.");
            throw new Error("Não foi possível alterar a senha. Tente novamente.");
        }
    }

    // Recorte central e redução no navegador, sem enviar o arquivo original.
    async function prepararFoto(arquivo) {
        if (!arquivo || !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
            throw new Error("Selecione uma imagem JPG, PNG ou WebP.");
        }
        if (arquivo.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
        const url = URL.createObjectURL(arquivo);
        try {
            const imagem = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Não foi possível abrir esta imagem. Escolha outra foto."));
                img.src = url;
            });
            if (!imagem.naturalWidth || !imagem.naturalHeight || imagem.naturalWidth * imagem.naturalHeight > 25000000) {
                throw new Error("Esta imagem é muito grande. Escolha uma versão menor.");
            }
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 256;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Seu navegador não conseguiu processar a foto.");
            const lado = Math.min(imagem.naturalWidth, imagem.naturalHeight);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 256, 256);
            ctx.drawImage(imagem, (imagem.naturalWidth - lado) / 2, (imagem.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
            const foto = canvas.toDataURL("image/jpeg", 0.8);
            if (foto.length > 100000) throw new Error("Não foi possível reduzir a foto. Escolha outra imagem.");
            return foto;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    return { carregar, salvar, alterarSenha, prepararFoto };
})();
